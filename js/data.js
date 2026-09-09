// ==========================================
// FUNCIONES DE PERSISTENCIA (Supabase)
// ==========================================
// Reemplaza el viejo esquema de localStorage. Los datos "planos" de
// paciente/turno/config viven en columnas normales; los anidados
// (tratamientos, pagos, odontograma, dias, bloqueados) viven en
// columnas jsonb (ver migracion_paso7.sql).
//
// Convención: en la app (JS) los campos van en camelCase
// (obraSocial, pacId, esSugerido). En Supabase (Postgres) van en
// snake_case (obra_social, paciente_id, es_sugerido). Las funciones
// mapXxxDesdeDB / mapXxxHaciaDB hacen esa traducción en un solo lugar.

// 'HH:MM:SS' -> 'HH:MM'. Si una columna es tipo `time`, Postgres
// devuelve los segundos; si es `text`, ya viene en 'HH:MM' y esto no
// hace nada. Defensivo en los dos casos.
function normalizarHora(h) {
  return typeof h === 'string' ? h.slice(0, 5) : h;
}

function userIdActual() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return user ? user.id : null;
}

// ------------------------------------------
// Mapeo pacientes
// ------------------------------------------

function mapPacienteDesdeDB(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    dni: row.dni || '',
    tel: row.tel,
    nac: row.nac || '',
    obraSocial: row.obra_social || '',
    obs: row.obs || '',
    ausencias: row.ausencias || 0,
    tratamientos: row.tratamientos || [],
    pagos: row.pagos || [],
    odontograma: row.odontograma || {}
  };
}

// incluirId=false cuando todavía no existe en la base (insert nuevo,
// que Supabase le asigne el id).
function mapPacienteHaciaDB(p, incluirId = true) {
  const fila = {
    user_id: userIdActual(),
    nombre: p.nombre,
    dni: p.dni || null,
    tel: p.tel,
    nac: p.nac || null,
    obra_social: p.obraSocial || null,
    obs: p.obs || null,
    ausencias: p.ausencias || 0,
    tratamientos: p.tratamientos || [],
    pagos: p.pagos || [],
    odontograma: p.odontograma || {}
  };
  if (incluirId) fila.id = p.id;
  return fila;
}

// ------------------------------------------
// Mapeo turnos
// ------------------------------------------

function mapTurnoDesdeDB(row) {
  return {
    id: row.id,
      pacId: row.paciente_id,
    tel: row.tel,
    fecha: row.fecha,
    hora: normalizarHora(row.hora),
    motivo: row.motivo || '',
    confirmado: !!row.confirmado,
    estado: row.estado,
    recurrente: row.recurrente || null,
    esSugerido: !!row.es_sugerido
  };
}

function mapTurnoHaciaDB(t, incluirId = true) {
  const fila = {
    user_id: userIdActual(),
      paciente_id: t.pacId,
    tel: t.tel,
    fecha: t.fecha,
    hora: t.hora,
    motivo: t.motivo || null,
    confirmado: !!t.confirmado,
    estado: t.estado,
    recurrente: t.recurrente || null,
    es_sugerido: !!t.esSugerido
  };
  if (incluirId) fila.id = t.id;
  return fila;
}

// ------------------------------------------
// Mapeo config (una fila por usuario, ya creada por el trigger
// on_auth_user_created)
// ------------------------------------------

function mapConfigDesdeDB(row) {
  return {
    dra: row.dra,
    dias: row.dias || [1, 2, 3, 4, 5],
    desde: normalizarHora(row.desde),
    hasta: normalizarHora(row.hasta),
    bloqueados: row.bloqueados || []
  };
}

function mapConfigHaciaDB(c) {
  return {
    user_id: userIdActual(),
    dra: c.dra,
    dias: c.dias,
    desde: c.desde,
    hasta: c.hasta,
    bloqueados: c.bloqueados
  };
}

// ==========================================
// VARIABLES GLOBALES
// ==========================================
// Arrancan vacías / con defaults. Se llenan de verdad recién después
// de cargarDatosDesdeSupabase(), que se llama una vez que hay sesión
// (ver login.js -> arrancarApp() -> initApp() en main.js).

let config = {
  dra: 'PERALTA PILAR',
  dias: [1, 2, 3, 4, 5],
  desde: '09:00',
  hasta: '18:00',
  bloqueados: []
};

let pacientes = [];
let turnos = [];
let detPacId = null;

// ==========================================
// CARGA INICIAL DESDE SUPABASE
// ==========================================
// Gracias a RLS ("user_id = auth.uid()"), estos SELECT ya devuelven
// solo los datos del usuario logueado: no hace falta filtrar por
// user_id acá.

async function cargarDatosDesdeSupabase() {
  const [pacRes, turRes, cfgRes] = await Promise.all([
    supabaseClient.from('pacientes').select('*').order('id', { ascending: true }),
    supabaseClient.from('turnos').select('*').order('id', { ascending: true }),
    supabaseClient.from('config').select('*').maybeSingle()
  ]);

  if (pacRes.error) console.error('Error cargando pacientes:', pacRes.error.message);
  if (turRes.error) console.error('Error cargando turnos:', turRes.error.message);
  if (cfgRes.error) console.error('Error cargando config:', cfgRes.error.message);

  pacientes = (pacRes.data || []).map(mapPacienteDesdeDB);
  turnos = (turRes.data || []).map(mapTurnoDesdeDB);
  if (cfgRes.data) config = mapConfigDesdeDB(cfgRes.data);

  const huboError = pacRes.error || turRes.error || cfgRes.error;
  if (huboError && typeof mostrarError === 'function') {
    mostrarError('No se pudieron cargar tus datos. Revisá tu conexión y recargá la página.');
  }
  return !huboError;
}

// ==========================================
// GUARDADO
// ==========================================
// save() sincroniza TODO lo que hay en memoria (pacientes, turnos,
// config) contra Supabase mediante updates. Es la estrategia de
// transición: permite que el resto de la app (agenda.js,
// detallePaciente.js, odontograma.js, alertas.js, config.js), que hoy
// mutan el objeto en memoria y después llaman a save(), sigan
// funcionando SIN cambios.
//
// Funciona bien para actualizaciones de filas que ya existen en la
// base (ya tienen id real). Para ALTA de pacientes/turnos nuevos no
// se usa esto: se usa AppState.agregarPaciente()/agregarTurno(), que
// insertan una sola fila y dejan que Supabase genere el id (ver
// appState.js) — así se evita el riesgo de ids duplicados si el
// usuario tiene la app abierta en más de un dispositivo.
//
// Limitación conocida (a mejorar más adelante): actualiza todas las
// filas en cada guardado, no solo la que cambió. Para la escala de un
// consultorio (decenas/cientos de pacientes) no es un problema de
// rendimiento hoy, pero conviene optimizarlo cuando se toquen
// agenda.js/detallePaciente.js/odontograma.js.
let saveQueue = Promise.resolve();

function save() {
  const operacion = saveQueue.then(() => guardarEstadoActual(), () => guardarEstadoActual());
  saveQueue = operacion.catch(() => undefined);
  return operacion;
}

async function guardarEstadoActual() {
  const userId = userIdActual();
  if (!userId) {
    console.warn('save(): no hay usuario logueado, no se guarda nada.');
    return false;
  }

  const tareas = [];

  pacientes.forEach((p) => {
    const { id, ...fila } = mapPacienteHaciaDB(p, true);
    tareas.push(supabaseClient.from('pacientes').update(fila).eq('id', id));
  });

  turnos.forEach((t) => {
    const { id, ...fila } = mapTurnoHaciaDB(t, true);
    tareas.push(supabaseClient.from('turnos').update(fila).eq('id', id));
  });

  tareas.push(
    supabaseClient.from('config').update(mapConfigHaciaDB(config)).eq('user_id', userId)
  );

  const resultados = await Promise.all(tareas);
  const conError = resultados.find((r) => r.error);

  if (conError) {
    console.error('Error guardando en Supabase:', conError.error.message);
    if (typeof mostrarError === 'function') {
      mostrarError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.');
    }
    return false;
  }
  return true;
}
