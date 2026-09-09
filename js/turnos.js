// ==========================================
// GESTIÓN DEL MODAL NUEVO TURNO
// ==========================================

function actualizarSelectPac() {
    const sel = document.getElementById('f-pac');
    sel.innerHTML = '<option value="">— Seleccionar —</option><option value="nuevo">➕ Nuevo paciente</option>' + 
      pacientes.map(p => '<option value="' + p.id + '">' + escapeHtml(p.nombre) + '</option>').join('');
  }
  
  function autoTel() {
    const pid = parseInt(document.getElementById('f-pac').value);
    const p = pacientes.find(x => x.id === pid);
    if (p) document.getElementById('f-tel').value = p.tel;
  }
  
  function onPacChange() {
    const v = document.getElementById('f-pac').value;
    if (v === 'nuevo') {
      document.getElementById('turno-pac-existente').style.display = 'none';
      document.getElementById('turno-pac-nuevo').style.display = 'block';
      document.getElementById('f-tel').value = '';
    } else {
      document.getElementById('turno-pac-existente').style.display = 'block';
      document.getElementById('turno-pac-nuevo').style.display = 'none';
      autoTel();
    }
  }
  
  function resetTurnoForm() {
    document.getElementById('f-pac').value = '';
    document.getElementById('f-tel').value = '';
    document.getElementById('f-motivo').value = '';
    document.getElementById('f-recurrente').value = '';
    document.getElementById('tn-nombre').value = '';
    document.getElementById('tn-dni').value = '';
    document.getElementById('tn-tel').value = '';
    document.getElementById('tn-nac').value = '';
    document.getElementById('tn-os').value = '';
    document.getElementById('tn-obs').value = '';
    document.getElementById('turno-pac-existente').style.display = 'block';
    document.getElementById('turno-pac-nuevo').style.display = 'none';
    limpiarErroEnFormulario(['f-pac', 'f-tel', 'f-fecha', 'f-hora', 'f-motivo', 'tn-nombre', 'tn-dni', 'tn-tel', 'tn-nac', 'tn-os', 'tn-obs']);
    
    const fi = document.getElementById('f-fecha');
    fi.value = hoyStr;
    fi.min = hoyStr;
  }
  
  async function guardarTurno() {
    const pv = document.getElementById('f-pac').value;
    const fecha = document.getElementById('f-fecha').value;
    const hora = document.getElementById('f-hora').value;
    const motivo = normalizarTexto(document.getElementById('f-motivo').value);
    const recurrente = document.getElementById('f-recurrente').value;
    
    if (!pv) {
      mostrarError('Seleccioná un paciente o creá uno nuevo para seguir.');
      marcarCampoInvalido('f-pac');
      return;
    }
    
    if (!fecha) {
      mostrarError('Completá la fecha del turno.');
      marcarCampoInvalido('f-fecha');
      return;
    }

    if (!hora) {
      mostrarError('Completá la hora del turno.');
      marcarCampoInvalido('f-hora');
      return;
    }

    if (fecha < hoyStr) {
      mostrarError('La fecha del turno debe ser hoy o una fecha futura.');
      marcarCampoInvalido('f-fecha');
      return;
    }

    let pid, tel, nombrePaciente;
    
    if (pv === 'nuevo') {
      const nombre = normalizarTexto(document.getElementById('tn-nombre').value);
      const dni = normalizarDni(document.getElementById('tn-dni').value);
      const telInput = normalizarTelefono(document.getElementById('tn-tel').value);
      
      if (!nombre) {
        mostrarError('Ingresá el nombre del paciente nuevo.');
        marcarCampoInvalido('tn-nombre');
        return;
      }

      if (!validarDni(dni)) {
        mostrarError('Ingresá un DNI válido de 7 u 8 dígitos.');
        marcarCampoInvalido('tn-dni');
        return;
      }

      if (!validarTelefono(telInput)) {
        mostrarError('Ingresá un teléfono válido para WhatsApp.');
        marcarCampoInvalido('tn-tel');
        return;
      }

      const pacienteExistente = AppState.getPacienteByTel(telInput);
      if (pacienteExistente) {
        mostrarError(`Ya existe el paciente ${pacienteExistente.nombre}. Se usará ese registro.`);
        pid = pacienteExistente.id;
        tel = normalizarTelefono(pacienteExistente.tel);
        nombrePaciente = pacienteExistente.nombre;
      } else {
        try {
          // El id lo asigna Supabase; recién lo sabemos después del insert.
          const nuevo = await AppState.agregarPaciente({
            nombre,
            dni,
            tel: telInput,
            nac: document.getElementById('tn-nac').value,
            obraSocial: normalizarObraSocial(document.getElementById('tn-os').value),
            obs: normalizarTexto(document.getElementById('tn-obs').value),
            odontograma: {},
            ausencias: 0,
            tratamientos: [],
            pagos: []
          });
          pid = nuevo.id;
          tel = telInput;
          nombrePaciente = nombre;
        } catch (e) {
          mostrarError('No se pudo crear el paciente. Revisá tu conexión e intentá de nuevo.');
          return;
        }
      }
    } else {
      pid = parseInt(pv, 10);
      const pacienteSeleccionado = pacientes.find(x => x.id === pid);
      tel = normalizarTelefono(document.getElementById('f-tel').value || (pacienteSeleccionado ? pacienteSeleccionado.tel : ''));
      nombrePaciente = pacienteSeleccionado ? pacienteSeleccionado.nombre : 'Paciente';

      if (!validarTelefono(tel)) {
        mostrarError('El paciente seleccionado necesita un teléfono válido.');
        marcarCampoInvalido('f-tel');
        return;
      }
    }

    const turnoDuplicado = turnos.some(t => t.pacId === pid && t.fecha === fecha && t.hora === hora && t.estado === 'activo');
    if (turnoDuplicado) {
      mostrarError('Ya existe un turno activo para este paciente en esa fecha y hora.');
      return;
    }
    
    if (!esHabilidado(fecha) && !confirm('Este día no es laborable o está bloqueado. ¿Agendarlo igual?')) {
        return;
    }

    setBtnLoading('btn-guardar-turno');

    try {
      await AppState.agregarTurno({
        pacId: pid,
        tel,
        fecha,
        hora,
        motivo,
        confirmado: false,
        estado: 'activo',
        recurrente: recurrente || null
      });

      if (recurrente) {
        const d = parseDate(fecha);
        const sig = new Date(d);

        if (recurrente === '1m') sig.setMonth(sig.getMonth() + 1);
        else if (recurrente === '3m') sig.setMonth(sig.getMonth() + 3);
        else if (recurrente === '6m') sig.setMonth(sig.getMonth() + 6);
        else if (recurrente === '1a') sig.setFullYear(sig.getFullYear() + 1);

        await AppState.agregarTurno({
          pacId: pid,
          tel,
          fecha: fechaStr(sig),
          hora,
          motivo,
          confirmado: false,
          estado: 'activo',
          recurrente,
          esSugerido: true
        });
      }

      AppState.refrescar();
      mostrarMensaje(`Turno guardado para ${nombrePaciente}.`, 'success');
      cerrarModal('m-turno');
      resetTurnoForm();
    } catch (e) {
      mostrarError('No se pudo guardar el turno. Revisá tu conexión e intentá de nuevo.');
    } finally {
      quitarBtnLoading('btn-guardar-turno');
    }
  }