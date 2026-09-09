
// ==========================================
// FICHA CLÍNICA: DETALLE DEL PACIENTE
// ==========================================

function abrirDetalle(id) {
  detPacId = id;
  const p = pacientes.find(x => x.id === id);
  if (!p) return;

  document.getElementById('dp-nombre').textContent = p.nombre;
  document.getElementById('dp-tel').textContent = p.tel;
  document.getElementById('dp-avatar').textContent = initials(p.nombre);

  const badgeWrap = document.getElementById('dp-ausencias-badge');
  badgeWrap.innerHTML = (p.ausencias || 0) >= 2 ?
    '<span class="ausencia-badge">⚠ ' + p.ausencias + ' ausencias</span>' : '';

  renderDpInfo(p);
  renderDatosPaciente(p);
  switchDetTab('datos');
  abrirModal('detalle');
}

function renderDpInfo(p) {
  const chips = [];
  if (p.dni) chips.push('<span class="badge" style="background:var(--muted-bg);color:var(--text2)">🪪 DNI: ' + escapeHtml(p.dni) + '</span>');
  if (p.obraSocial) chips.push('<span class="badge" style="background:#F3F4F6;color:var(--text2)">🏥 ' + escapeHtml(p.obraSocial) + '</span>');
  if (p.nac) chips.push('<span class="badge" style="background:#F3F4F6;color:var(--text2)">🎂 ' + fmtFecha(p.nac) + '</span>');

  let html = chips.length ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + chips.join('') + '</div>' : '';

  if (p.obs) {
    html += '<div style="font-size:12px;color:var(--text2);background:var(--bg);border-radius:var(--radius-sm);padding:8px 10px;margin-bottom:12px">⚠️ ' + escapeHtml(p.obs) + '</div>';
  }

  document.getElementById('dp-obs-wrap').innerHTML = html;
}

function renderDatosPaciente(p) {
  const wrap = document.getElementById('det-datos');
  if (!wrap) return;

  wrap.innerHTML = '' +
    '<div class="card" style="margin-bottom:10px">' +
      '<div class="sec" style="margin:0 0 10px">Datos personales</div>' +
      '<div class="detail-field-grid">' +
        '<div class="fg" style="margin:0"><label for="edit-nombre">Nombre</label><input id="edit-nombre" class="form-input" value="' + escapeHtml(p.nombre) + '" /></div>' +
        '<div class="fg" style="margin:0"><label for="edit-dni">DNI *</label><input id="edit-dni" class="form-input" type="text" inputmode="numeric" maxlength="8" value="' + escapeHtml(p.dni || '') + '" /></div>' +
        '<div class="fg" style="margin:0"><label for="edit-tel">Teléfono</label><input id="edit-tel" class="form-input" type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" value="' + escapeHtml(p.tel) + '" /></div>' +
        '<div class="fg" style="margin:0"><label for="edit-nac">Fecha de nacimiento</label><input id="edit-nac" class="form-input" type="date" min="1900-01-01" max="2026-09-07" value="' + escapeHtml(p.nac || '') + '" /></div>' +
        '<div class="fg" style="margin:0"><label for="edit-os">Obra social</label><input id="edit-os" class="form-input" value="' + escapeHtml(p.obraSocial || '') + '" /></div>' +
        '<div class="fg" style="margin:0"><label for="edit-obs">Observaciones</label><textarea id="edit-obs" class="form-input" style="min-height:70px">' + escapeHtml(p.obs || '') + '</textarea></div>' +
      '</div>' +
      '<div class="detail-actions">' +
        '<button class="btn btn-green" style="flex:1" onclick="guardarDatosPaciente()">Guardar cambios</button>' +
        '<button class="btn" style="flex:1;background:var(--bg)" onclick="eliminarPaciente(' + p.id + ')">Eliminar</button>' +
      '</div>' +
    '</div>';
}

async function guardarDatosPaciente() {
  const p = pacientes.find(x => x.id === detPacId);
  if (!p) return;

  const nombre = normalizarTexto(document.getElementById('edit-nombre').value);
  const dni = normalizarDni(document.getElementById('edit-dni').value);
  const tel = normalizarTelefono(document.getElementById('edit-tel').value);

  if (!nombre) {
    alert('Ingresá un nombre para el paciente');
    return;
  }
  if (!validarDni(dni)) {
    alert('Ingresá un DNI válido de 7 u 8 dígitos');
    return;
  }
  if (!validarTelefono(tel)) {
    alert('Ingresá un teléfono válido');
    return;
  }

  const duplicate = pacientes.find(x => x.id !== p.id && normalizarTelefono(x.tel) === tel);
  if (duplicate) {
    alert('Ya existe otro paciente con ese teléfono');
    return;
  }

  p.nombre = nombre;
  p.dni = dni;
  p.tel = tel;
  p.nac = document.getElementById('edit-nac').value;
  p.obraSocial = normalizarObraSocial(document.getElementById('edit-os').value);
  p.obs = normalizarTexto(document.getElementById('edit-obs').value);

  if (!await save()) return;
  renderPacientes();
  renderAll();
  cerrarModal('m-detalle');
  mostrarMensaje('Datos del paciente actualizados', 'success');
}

async function eliminarPaciente(id) {
  const p = pacientes.find(x => x.id === id);
  if (!p) return;

  if (!confirm('¿Seguro que querés eliminar a ' + p.nombre + '?')) return;

  try {
    await AppState.eliminarPaciente(id);
  } catch (e) {
    mostrarError('No se pudo eliminar el paciente. Revisá tu conexión e intentá de nuevo.');
    return;
  }
  renderPacientes();
  renderAll();
  cerrarModal('m-detalle');
  mostrarMensaje('Paciente eliminado', 'success');
}

function switchDetTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(el => el.classList.remove('active'));
  const activeBtn = document.querySelector('[onclick="switchDetTab(\'' + tab + '\')"]');
  if (activeBtn) activeBtn.classList.add('active');

  ['det-datos', 'det-odonto', 'det-trats', 'det-pagos', 'det-turnos'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (tab === 'datos') {
    document.getElementById('det-datos').style.display = 'block';
    const p = pacientes.find(x => x.id === detPacId);
    if (p) renderDatosPaciente(p);
  } else if (tab === 'odonto') {
    document.getElementById('det-odonto').style.display = 'block';
    renderOdontograma();
  } else if (tab === 'trats') {
    document.getElementById('det-trats').style.display = 'block';
    renderDetTrats();
  } else if (tab === 'pagos') {
    document.getElementById('det-pagos').style.display = 'block';
    renderDetPagos();
  } else if (tab === 'turnos') {
    document.getElementById('det-turnos').style.display = 'block';
    renderDetTurnos();
  }
}

function renderDetTrats() {
  const p = pacientes.find(x => x.id === detPacId);
  if (!p) return;

  document.getElementById('dp-trats').innerHTML = p.tratamientos.length ?
    p.tratamientos.map(t => '<div class="trat-item"><div class="trat-fecha">' + fmtFecha(t.fecha) + '</div><div class="trat-nombre">' + escapeHtml(t.nombre) + '</div>' + (t.nota ? '<div class="trat-nota">' + escapeHtml(t.nota) + '</div>' : '') + '</div>').join('') :
    '<div class="empty">Sin tratamientos registrados</div>';
}

function renderDetPagos() {
  const p = pacientes.find(x => x.id === detPacId);
  if (!p) return;

  const deuda = calcDeuda(p);
  const dBox = document.getElementById('dp-deuda');

  if (deuda > 0) {
    dBox.style.background = 'var(--red-light)';
    dBox.innerHTML = '<span style="color:var(--red);font-size:14px;font-weight:600">Saldo Pendiente</span><span class="badge b-red" style="font-size:14px">' + fmtMonto(deuda) + '</span>';
  } else if (deuda < 0) {
    dBox.style.background = 'var(--green-light)';
    dBox.innerHTML = '<span style="color:var(--green-dark);font-size:14px;font-weight:600">Saldo a Favor</span><span class="badge b-ok" style="font-size:14px">' + fmtMonto(Math.abs(deuda)) + '</span>';
  } else {
    dBox.style.background = '#F3F4F6';
    dBox.innerHTML = '<span style="color:var(--text2);font-size:14px;font-weight:500">Cuenta al Día</span><span class="badge b-ok" style="background:#E5E7EB;color:var(--text2);font-size:14px">$0</span>';
  }

  document.getElementById('dp-pagos').innerHTML = p.pagos.length ?
    p.pagos.map(pg => {
      const signo = pg.tipo === 'deuda' ? '+' : '—';
      const col = pg.tipo === 'deuda' ? 'var(--red)' : 'var(--green-dark)';
      const met = pg.metodo ? ' · <span style="text-transform:capitalize;color:var(--text3)">' + pg.metodo.replace('_', ' ') + '</span>' : '';

      return '<div class="pago-row"><div><div style="font-size:13px;font-weight:500">' + escapeHtml(pg.desc) + '</div><div style="font-size:11px;color:var(--text2)">' + fmtFecha(pg.fecha) + met + '</div></div><div style="font-size:14px;font-weight:600;color:' + col + '">' + signo + fmtMonto(pg.monto) + '</div></div>';
    }).join('') :
    '<div class="empty">Sin movimientos de caja</div>';
}

function renderDetTurnos() {
  const pt = turnos.filter(t => t.pacId === detPacId).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora));

  document.getElementById('dp-turnos-pac').innerHTML = pt.length ?
    pt.map(t => cardTurno(t, t.fecha === hoyStr)).join('') :
    '<div class="empty">Sin historial de turnos</div>';
}

async function agregarTrat() {
  const p = pacientes.find(x => x.id === detPacId);
  const nombre = document.getElementById('nt-nombre').value.trim();
  const fecha = document.getElementById('nt-fecha').value || hoyStr;
  const nota = document.getElementById('nt-nota').value.trim();

  if (!nombre) {
    alert('Ingresá el nombre del tratamiento');
    return;
  }

  p.tratamientos.unshift({
    fecha,
    nombre,
    nota
  });

  document.getElementById('nt-nombre').value = '';
  document.getElementById('nt-fecha').value = '';
  document.getElementById('nt-nota').value = '';

  if (!await save()) return;
  renderDetTrats();
  renderPacientes();
  renderDashboard();
}

async function agregarPago() {
  const p = pacientes.find(x => x.id === detPacId);
  const desc = document.getElementById('np-desc').value.trim();
  const monto = parseMonto(document.getElementById('np-monto').value);
  const tipo = document.getElementById('np-tipo').value;
  const metodo = document.getElementById('np-metodo').value;

  if (!desc || isNaN(monto) || monto <= 0) {
    alert('Completá la descripción y un monto válido');
    return;
  }

  p.pagos.unshift({
    fecha: hoyStr,
    desc,
    monto,
    tipo,
    metodo
  });

  document.getElementById('np-desc').value = '';
  document.getElementById('np-monto').value = '';

  if (!await save()) return;
  renderDetPagos();
  renderPacientes();
  renderDashboard();
}