// ==========================================
// GESTIÓN DE AGENDA Y TURNOS
// ==========================================
/*
function renderAgenda() {
    const proxFin = new Date(hoy);
    proxFin.setDate(proxFin.getDate() + 7);
 
    const th = turnos.filter(t => t.fecha === hoyStr && t.estado === 'activo').sort((a, b) => a.hora.localeCompare(b.hora));
    const tp = turnos.filter(t => t.fecha > hoyStr && parseDate(t.fecha) <= proxFin && t.estado === 'activo').sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
 
    document.getElementById('s-hoy').textContent = th.length;
    document.getElementById('s-sem').textContent = turnos.filter(t => t.fecha >= hoyStr && parseDate(t.fecha) <= proxFin && t.estado === 'activo').length;
 
    const conA = pacientes.filter(p => (p.ausencias || 0) >= 2);
    document.getElementById('ausencias-alerta').innerHTML = conA.length ?
      '<div class="card" style="background:var(--orange-light);border-color:#F59E0B;margin-bottom:10px"><div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:4px">⚠️ Pacientes con ausencias reiteradas</div>' + conA.map(p => '<div style="font-size:12px;color:#92400E">' + escapeHtml(p.nombre) + ' — ' + p.ausencias + ' ausencias</div>').join('') + '</div>' :
      '';
 
    document.getElementById('lista-hoy').innerHTML = th.length ? th.map(t => cardTurno(t, true)).join('') : '<div class="empty">Sin turnos hoy 🎉</div>';
    document.getElementById('lista-prox').innerHTML = tp.length ? tp.map(t => cardTurno(t, false)).join('') : '<div class="empty">Sin próximos turnos</div>';
  }
 
function cardTurno(t, esHoy) {
    const pac = pacientes.find(p => p.id === t.pacId);
    const nombre = pac ? escapeHtml(pac.nombre) : 'Paciente';
    const diff = diffD(t.fecha);
    const needsConfirm = diff === 2 && !t.confirmado && t.estado === 'activo';
    const cancelado = t.estado === 'cancelado';
    const ausente = t.estado === 'ausente';
    const finalizado = cancelado || ausente;
 
    const badge = cancelado ? '<span class="badge b-cancel">Cancelado</span>' :
      ausente ? '<span class="badge b-red">No asistió</span>' :
      t.confirmado ? '<span class="badge b-ok">✓ Confirmado</span>' :
      (needsConfirm ? '<span class="badge b-pend">⚠ Confirmar</span>' : (esHoy ? '<span class="badge b-info">Hoy</span>' : ''));
    const fechaLine = esHoy ? '' : ' · <span style="color:var(--text2)">' + parseDate(t.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + '</span>';
    const fechaLinda = parseDate(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
 
    const msgR = encodeURIComponent('\u00A1Hola, ' + (pac ? pac.nombre : 'Paciente') + '! Te recordamos tu turno con ' + nombreProfesionalActual() + ', el ' + fechaLinda.replace(', ', ' ') + ' a las ' + t.hora + ' hs. \u00A1Te esperamos!');
 
    const msgC = encodeURIComponent('\u00A1Hola, ' + (pac ? pac.nombre : 'Paciente') + '! Te recordamos tu turno con ' + nombreProfesionalActual() + ', el ' + fechaLinda.replace(', ', ' ') + ' a las ' + t.hora + ' hs. Por favor, responde SI para confirmar tu turno o NO para cancelarlo. \u00A1Gracias!');
    const recTag = t.recurrente ? '<span class="badge b-purple" style="font-size:10px">🔁 ' + t.recurrente + '</span> ' : '';
 
    return '<div class="card' + (finalizado ? ' card-cancelado' : '') + '"><div class="card-row" style="margin-bottom:6px"><span style="font-size:14px;font-weight:600">' + t.hora + 'hs' + fechaLine + '</span><div style="display:flex;gap:4px;align-items:center">' + recTag + badge + '</div></div><div style="font-size:15px;font-weight:500">' + nombre + '</div><div style="font-size:13px;color:var(--text2);margin-bottom:2px">' + (t.motivo || 'Sin motivo') + '</div>' +
      (!finalizado ?
        '<div class="turno-actions"><a class="btn-wa" href="https://wa.me/' + t.tel + '?text=' + msgR + '" target="_blank">' + waIcon + ' Recordatorio</a>' + (needsConfirm ? '<a class="btn-wa btn-wa-orange" href="https://wa.me/' + t.tel + '?text=' + msgC + '" target="_blank">' + waIcon + ' Confirmar</a>' : '') + (!t.confirmado ? '<button class="btn" style="font-size:12px;padding:6px 10px;background:var(--green-light);color:var(--green-dark);border-color:var(--green)" onclick="marcarConfirmado(' + t.id + ')">✓ Confirmó</button>' : '') + ' <button class="btn" style="font-size:12px;padding:6px 10px" onclick="marcarCancelado(' + t.id + ')">✕ Canceló</button>' + ' <button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="marcarAusente(' + t.id + ')">🚫 No asistió</button>' + (pac ? '<button class="btn" style="font-size:12px;padding:6px 10px" onclick="abrirDetalle(' + pac.id + ')">📋</button>' : '') + '</div>' :
        '<div class="turno-actions"><button class="btn btn-del" style="font-size:12px;padding:6px 10px" onclick="eliminarTurno(' + t.id + ')">Eliminar</button></div>'
      ) + '</div>';
  }
 
  async function marcarConfirmado(id) {
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.confirmado = true;
      await save();
      renderAll();
    }
  }
 
  async function marcarCancelado(id) {
    if (!confirm('¿Marcar como cancelado? No se registrará como ausencia.')) return;
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.estado = 'cancelado';
      await save();
      renderAll();
    }
  }
 
  async function marcarAusente(id) {
    if (!confirm('¿El paciente no se presentó sin avisar? Se sumará una ausencia a su historial.')) return;
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.estado = 'ausente';
      const pac = pacientes.find(p => p.id === t.pacId);
      if (pac) pac.ausencias = (pac.ausencias || 0) + 1;
      await save();
      renderAll();
    }
  }
 
  function eliminarTurno(id) {
    if (!confirm('¿Eliminar turno?')) return;
    turnos = turnos.filter(t => t.id !== id);
    save();
    renderAll();
  }

*/

// ==========================================
// GESTIÓN DE AGENDA Y TURNOS
// ==========================================
 
function renderAgenda() {
    const proxFin = new Date(hoy);
    proxFin.setDate(proxFin.getDate() + 7);
 
    const th = turnos.filter(t => t.fecha === hoyStr && t.estado === 'activo').sort((a, b) => a.hora.localeCompare(b.hora));
    const tp = turnos.filter(t => t.fecha > hoyStr && parseDate(t.fecha) <= proxFin && t.estado === 'activo').sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
 
    document.getElementById('s-hoy').textContent = th.length;
    document.getElementById('s-sem').textContent = turnos.filter(t => t.fecha >= hoyStr && parseDate(t.fecha) <= proxFin && t.estado === 'activo').length;
 
    const conA = pacientes.filter(p => (p.ausencias || 0) >= 2);
    document.getElementById('ausencias-alerta').innerHTML = conA.length ?
      '<div class="card" style="background:var(--orange-light);border-color:#F59E0B;margin-bottom:10px"><div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:4px">⚠️ Pacientes con ausencias reiteradas</div>' + conA.map(p => '<div style="font-size:12px;color:#92400E">' + escapeHtml(p.nombre) + ' — ' + p.ausencias + ' ausencias</div>').join('') + '</div>' :
      '';
 
    document.getElementById('lista-hoy').innerHTML = th.length ? th.map(t => cardTurno(t, true)).join('') : '<div class="empty">Sin turnos hoy 🎉</div>';
    document.getElementById('lista-prox').innerHTML = tp.length ? tp.map(t => cardTurno(t, false)).join('') : '<div class="empty">Sin próximos turnos</div>';
  }
 
function cardTurno(t, esHoy) {
    const pac = pacientes.find(p => p.id === t.pacId);
    const nombre = pac ? pac.nombre : 'Paciente';
    const diff = diffD(t.fecha);
    const needsConfirm = diff === 2 && !t.confirmado && t.estado === 'activo';
    const cancelado = t.estado === 'cancelado';
    const ausente = t.estado === 'ausente';
    const finalizado = cancelado || ausente;
    const confirmado = !!t.confirmado && t.estado === 'activo';
    const linkRecordatorio = linkWhatsAppTurno(t, 'recordatorio');
    const linkConfirmar = linkWhatsAppTurno(t, 'confirmar');
 
    const badge = cancelado ? '<span class="badge b-cancel">Cancelado</span>' :
      ausente ? '<span class="badge b-red">No asistió</span>' :
      t.confirmado ? '<span class="badge b-ok">✓ Confirmado</span>' :
      (needsConfirm ? '<span class="badge b-pend">⚠ Confirmar</span>' : (esHoy ? '<span class="badge b-info">Hoy</span>' : ''));
    const fechaLine = esHoy ? '' : ' · <span style="color:var(--text2)">' + parseDate(t.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + '</span>';
    const recTag = t.recurrente ? '<span class="badge b-purple" style="font-size:10px">🔁 ' + t.recurrente + '</span> ' : '';
 
    return '<div class="card' + (finalizado ? ' card-cancelado' : '') + (confirmado ? ' turno-confirmado' : '') + '"><div class="card-row" style="margin-bottom:6px"><span style="font-size:14px;font-weight:600">' + escapeHtml(t.hora) + 'hs' + fechaLine + '</span><div style="display:flex;gap:4px;align-items:center">' + recTag + badge + '</div></div><div style="font-size:15px;font-weight:500">' + escapeHtml(nombre) + '</div><div style="font-size:13px;color:var(--text2);margin-bottom:2px">' + escapeHtml(t.motivo || 'Sin motivo') + '</div>' +
      (!finalizado ?
        '<div class="turno-actions"><a class="btn-wa' + (needsConfirm ? ' btn-wa-orange' : '') + '" href="' + linkRecordatorio + '" target="_blank">' + waIcon + ' Recordatorio</a>' + (needsConfirm ? '<a class="btn-wa btn-wa-orange" href="' + linkConfirmar + '" target="_blank">✅ Confirmar</a>' : '') + (!t.confirmado ? '<button class="btn" style="font-size:12px;padding:6px 10px;background:var(--green-light);color:var(--green-dark);border-color:var(--green)" onclick="marcarConfirmado(' + t.id + ')">✓ Confirmó</button>' : '') + ' <button class="btn" style="font-size:12px;padding:6px 10px" onclick="marcarCancelado(' + t.id + ')">✕ Canceló</button>' + ' <button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="marcarAusente(' + t.id + ')">🚫 No asistió</button>' + ' <button class="btn" style="font-size:12px;padding:6px 10px" onclick="reprogramarTurno(' + t.id + ')">📝 Reprogramar</button>' + (pac ? '<button class="btn" style="font-size:12px;padding:6px 10px" onclick="abrirDetalle(' + pac.id + ')">📋</button>' : '') + '</div>' :
        '<div class="turno-actions"><button class="btn btn-del" style="font-size:12px;padding:6px 10px" onclick="eliminarTurno(' + t.id + ')">Eliminar</button></div>'
      ) + '</div>';
  }

  async function marcarConfirmado(id) {
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.confirmado = true;
      if (!await save()) return;
      renderAll();
    }
  }
 
  async function marcarCancelado(id) {
    if (!confirm('¿Marcar como cancelado? No se registrará como ausencia.')) return;
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.estado = 'cancelado';
      if (!await save()) return;
      renderAll();
    }
  }
 
  async function marcarAusente(id) {
    if (!confirm('¿El paciente no se presentó sin avisar? Se sumará una ausencia a su historial.')) return;
    const t = turnos.find(x => x.id === id);
    if (t) {
      t.estado = 'ausente';
      const pac = pacientes.find(p => p.id === t.pacId);
      if (pac) pac.ausencias = (pac.ausencias || 0) + 1;
      if (!await save()) return;
      renderAll();
    }
  }
 
  async function eliminarTurno(id) {
    if (!confirm('¿Eliminar turno?')) return;
    try {
      await AppState.eliminarTurno(id);
    } catch (e) {
      mostrarError('No se pudo eliminar el turno. Revisá tu conexión e intentá de nuevo.');
      return;
    }
    renderAll();
  }