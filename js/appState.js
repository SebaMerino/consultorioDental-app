const AppState = (() => {
  function ensureId(value) {
    return Number(value) || 0;
  }

  function normalizePhone(value) {
    return typeof normalizarTelefono === 'function' ? normalizarTelefono(value) : String(value || '').trim();
  }

  return {
    getPacienteById(id) {
      return pacientes.find((p) => p.id === ensureId(id));
    },

    getPacienteByTel(tel) {
      const value = normalizePhone(tel);
      return pacientes.find((p) => normalizePhone(p.tel) === value);
    },

    // Inserta el paciente en Supabase y espera a que la base le
    // asigne el id (columna identity). Devuelve el paciente ya
    // guardado (con su id real) o lanza un error si falla.
    async agregarPaciente(nuevo) {
      const fila = mapPacienteHaciaDB(nuevo, false);
      delete fila.user_id;
      const { data, error } = await supabaseClient
        .from('pacientes')
        .insert(fila)
        .select()
        .single();

      if (error) {
        console.error('Error creando paciente:', error.message);
        throw error;
      }

      const pacienteGuardado = mapPacienteDesdeDB(data);
      pacientes.push(pacienteGuardado);
      return pacienteGuardado;
    },

    // Mismo criterio que agregarPaciente: inserta y usa el id real
    // que devuelve Supabase.
    async agregarTurno(turno) {
      const fila = mapTurnoHaciaDB(turno, false);
      delete fila.user_id;
      const { data, error } = await supabaseClient
        .from('turnos')
        .insert(fila)
        .select()
        .single();

      if (error) {
        console.error('Error creando turno:', error.message);
        throw error;
      }

      const turnoGuardado = mapTurnoDesdeDB(data);
      turnos.push(turnoGuardado);
      return turnoGuardado;
    },

    // Borra el paciente (y sus turnos) en Supabase y recién después
    // los saca del array en memoria.
    async eliminarPaciente(id) {
      const { error: turnosError } = await supabaseClient.from('turnos').delete().eq('paciente_id', id);
      if (turnosError) {
        console.error('Error eliminando los turnos del paciente:', turnosError.message);
        throw turnosError;
      }

      const { error: pacienteError } = await supabaseClient.from('pacientes').delete().eq('id', id);
      if (pacienteError) {
        console.error('Error eliminando paciente:', pacienteError.message);
        throw pacienteError;
      }

      pacientes = pacientes.filter((x) => x.id !== id);
      turnos = turnos.filter((t) => t.pacId !== id);
    },

    // Mismo criterio para turnos.
    async eliminarTurno(id) {
      const { error } = await supabaseClient.from('turnos').delete().eq('id', id);
      if (error) {
        console.error('Error eliminando turno:', error.message);
        throw error;
      }
      turnos = turnos.filter((t) => t.id !== id);
    },

    // Sincroniza todo el estado en memoria contra Supabase (ver
    // save() en data.js). Devuelve una Promise<boolean>; los call
    // sites existentes que no la esperan (fire-and-forget) siguen
    // funcionando igual que antes.
    guardar() {
      if (typeof save === 'function') {
        return save();
      }
      return Promise.resolve(false);
    },

    refrescar() {
      if (typeof renderAll === 'function') {
        renderAll();
      }
    },

    getTurnosActivos() {
      return turnos.filter((t) => t.estado === 'activo');
    },

    getTurnosDelPaciente(pid) {
      return turnos.filter((t) => t.pacId === ensureId(pid));
    }
  };
})();

window.AppState = AppState;
