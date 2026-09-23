// ==========================================
// GESTIÓN Y LISTADO DE PACIENTES
// ==========================================

function renderPacientes() {
    const q = document.getElementById('buscar').value.toLowerCase();
    const lista = pacientes.filter(p => !q || p.nombre.toLowerCase().includes(q) || p.tel.includes(q) || (p.dni || '').includes(q));
    
    document.getElementById('lista-pacientes').innerHTML = lista.length ? 
      lista.map(p => {
        const deuda = calcDeuda(p);
        const ul = turnos.filter(t => t.pacId === p.id && t.estado !== 'cancelado' && t.estado !== 'ausente').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const ausTag = (p.ausencias || 0) >= 2 ? '<span class="ausencia-badge">⚠ ' + p.ausencias + ' ausencias</span>' : '';
        
        return '<div class="card" onclick="abrirDetalle(' + p.id + ')" style="cursor:pointer">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<div class="avatar">' + initials(p.nombre) + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:15px;font-weight:500">' + escapeHtml(p.nombre) + '</div>' +
              '<div style="font-size:12px;color:var(--text2)">' + escapeHtml(p.tel) + '</div>' +
              (p.dni ? '<div style="font-size:12px;color:var(--text2)">DNI: ' + escapeHtml(p.dni) + '</div>' : '') +
              (p.obraSocial ? '<span class="badge b-info" style="font-size:10px;margin-top:3px;display:inline-block">🏥 ' + escapeHtml(p.obraSocial) + '</span>' : '') +
              (ausTag ? '<div style="margin-top:3px">' + ausTag + '</div>' : '') +
              (ul ? '<div style="font-size:11px;color:var(--text3);margin-top:2px">Próximo turno: ' + fmtFecha(ul.fecha) + '</div>' : '<div style="font-size:11px;color:var(--text3);margin-top:2px">Sin próximos turnos</div>') +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0">' +
              (deuda > 0 ? '<span class="badge b-red">' + fmtMonto(deuda) + '</span>' : deuda < 0 ? '<span class="badge b-ok">a favor</span>' : '<span class="badge b-ok">Al día</span>') +
              '<div style="font-size:11px;color:var(--text3);margin-top:4px">' + p.tratamientos.length + ' trat.</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') : 
      '<div class="empty">Sin resultados</div>';
  }
  
  function calcDeuda(p) {
    return p.pagos.reduce((acc, pg) => acc + (pg.tipo === 'deuda' ? pg.monto : -pg.monto), 0);
  }
  
  async function guardarPaciente() {
    const nombre = normalizarTexto(document.getElementById('np-nombre').value);
    const dni = normalizarDni(document.getElementById('np-dni').value);
    const tel = normalizarTelefono(document.getElementById('np-tel').value);
    
    if (!nombre) {
      mostrarError('Ingresá el nombre del paciente.');
      marcarCampoInvalido('np-nombre');
      return;
    }

    if (dni && !validarDni(dni)) {
      mostrarError('Si ingresás un DNI, debe tener 7 u 8 dígitos.');
      marcarCampoInvalido('np-dni');
      return;
    }

    if (!validarTelefono(tel)) {
      mostrarError('Ingresá un teléfono válido para WhatsApp.');
      marcarCampoInvalido('np-tel');
      return;
    }

    const pacienteDuplicado = pacientes.find(p => normalizarTelefono(p.tel) === tel);
    if (pacienteDuplicado) {
      mostrarError(`Ya existe ${pacienteDuplicado.nombre} con ese teléfono. Revisá el registro antes de crear otro.`);
      marcarCampoInvalido('np-tel');
      return;
    }
    
    setBtnLoading('btn-guardar-paciente');

    try {
      // El id lo asigna Supabase (columna identity): no se manda id acá.
      await AppState.agregarPaciente({
        nombre,
        dni,
        tel,
        nac: document.getElementById('np-nac').value,
        obraSocial: normalizarObraSocial(document.getElementById('np-os').value),
        obs: normalizarTexto(document.getElementById('np-obs').value),
        odontograma: {},
        ausencias: 0,
        tratamientos: [],
        pagos: []
      });

      AppState.refrescar();
      mostrarMensaje(`Paciente ${nombre} creado correctamente.`, 'success');
      cerrarModal('m-paciente');
      ['np-nombre', 'np-dni', 'np-tel', 'np-nac', 'np-os', 'np-obs'].forEach(id => document.getElementById(id).value = '');
    } catch (e) {
      mostrarError('No se pudo guardar el paciente. Revisá tu conexión e intentá de nuevo.');
    } finally {
      quitarBtnLoading('btn-guardar-paciente');
    }
  }