// ==========================================
// CONSTANTES Y CONFIGURACIÓN DE FECHAS
// ==========================================

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

const hoyStr = fechaStr(hoy);

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIASC = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const waIcon = '💬';
let toastTimer = null;

// ==========================================
// FUNCIONES UTILERAS (Utils)
// ==========================================

function mostrarMensaje(msg, tipo = 'success', timeout = 2500) {
  const container = document.getElementById('app-toast');
  if (!container) return;

  container.textContent = msg;
  container.className = `toast show ${tipo}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    container.className = 'toast';
  }, timeout);
}

function mostrarError(msg) {
  mostrarMensaje(msg, 'error', 3500);
}

function normalizarTexto(valor) {
  return String(valor || '').trim().replace(/\s+/g, ' ');
}

function normalizarTelefono(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 10);
}

function normalizarDni(valor) {
  return String(valor || '').replace(/\D/g, '').slice(0, 8);
}

function normalizarObraSocial(valor) {
  return normalizarTexto(valor).toUpperCase();
}

function nombreProfesionalActual() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const nombreRegistrado = user && user.user_metadata ? normalizarTexto(user.user_metadata.full_name) : '';
  if (nombreRegistrado) return nombreRegistrado;

  const nombreConfigurado = typeof config !== 'undefined' ? normalizarTexto(config.dra) : '';
  return nombreConfigurado || (user ? user.email : 'Consultorio Dental');
}

function validarTelefono(valor) {
  const v = normalizarTelefono(valor);
  return v.length === 10;
}

function limpiarErroEnCampo(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('input-error');
}

function limpiarErroEnFormulario(ids) {
  ids.forEach(limpiarErroEnCampo);
}

function marcarCampoInvalido(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('input-error');
    el.focus();
  }
}

function setBtnLoading(id, label = 'Guardando...') {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.dataset.originalText = btn.textContent;
  btn.textContent = label;
  btn.disabled = true;
  btn.classList.add('is-loading');
}

function quitarBtnLoading(id) {
  const btn = document.getElementById(id);
  if (!btn) return;

  btn.textContent = btn.dataset.originalText || btn.textContent;
  btn.disabled = false;
  btn.classList.remove('is-loading');
}

function fechaStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diffD(s) {
  return Math.round((parseDate(s) - hoy) / 86400000);
}

function initials(n) {
  return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtFecha(s) {
  return parseDate(s).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function fmtMonto(n) {
  return '$' + Number(n).toLocaleString('es-AR');
}

function formatearMontoInput(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  return digitos ? Number(digitos).toLocaleString('es-AR') : '';
}

function parseMonto(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  return digitos ? Number(digitos) : NaN;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function esBloqueado(ds) {
  return config.bloqueados.some(b => b.fecha === ds);
}

function esHabilidado(ds) {
  const d = parseDate(ds);
  return config.dias.includes(d.getDay()) && !esBloqueado(ds);
}

function validarDni(valor) {
  const v = normalizarDni(valor);
  return v.length >= 7 && v.length <= 8;
}

function textoRecordatorioTurno(t, paciente) {
  const nombre = paciente ? paciente.nombre : 'Paciente';
  const fechaLinda = parseDate(t.fecha).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(', ', ' ');

  return '¡Hola, ' + nombre + '! Te recordamos tu turno con ' + nombreProfesionalActual() + ', el ' + fechaLinda + ' a las ' + t.hora + ' hs. Por favor, respondé SI para confirmar tu turno o NO para cancelarlo. ¡Gracias!';
}

function linkWhatsAppTurno(t, tipo = 'recordatorio') {
  const paciente = pacientes.find(p => p.id === t.pacId);
  const texto = tipo === 'confirmar'
    ? '¡Hola, ' + (paciente ? paciente.nombre : 'Paciente') + '! Confirmá tu turno con ' + nombreProfesionalActual() + ' para el ' + parseDate(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(', ', ' ') + ' a las ' + t.hora + ' hs. Respondé SI para confirmar. ¡Gracias!'
    : textoRecordatorioTurno(t, paciente);

  return 'https://wa.me/' + (t.tel || '5490000000000') + '?text=' + encodeURIComponent(texto);
}