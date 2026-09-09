// ==========================================
// GESTIÓN DE CALENDARIO MENSAL
// ==========================================

function renderCalendario() {
    document.getElementById('cal-tit').textContent = MESES[calMes] + ' ' + calAnio;
    document.getElementById('cal-labels').innerHTML = DIASC.map(d => '<div class="cal-day-label">' + d + '</div>').join('');
    
    const primer = new Date(calAnio, calMes, 1);
    const ultimo = new Date(calAnio, calMes + 1, 0);
    let cells = '';
    
    for (let i = 0; i < primer.getDay(); i++) {
      cells += '<div></div>';
    }
    
    for (let d = 1; d <= ultimo.getDate(); d++) {
      const ds = calAnio + '-' + String(calMes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const esH = ds === hoyStr;
      const esSel = ds === calSel;
      const bloq = !esHabilidado(ds);
      const dot = turnos.some(t => t.fecha === ds && t.estado !== 'cancelado' && t.estado !== 'ausente') ? '<div class="cal-dot"></div>' : '';
      
      let cls = 'cal-cell';
      if (esSel) cls += ' cal-sel';
      else if (esH) cls += ' cal-today';
      else if (bloq) cls += ' cal-bloq';
      
      cells += '<div class="' + cls + '" onclick="calSel=\'' + ds + '\';renderCalendario()">' + d + dot + '</div>';
    }
    
    document.getElementById('cal-grid').innerHTML = cells;
    
    const dt = turnos.filter(t => t.fecha === calSel && t.estado !== 'cancelado' && t.estado !== 'ausente').sort((a, b) => a.hora.localeCompare(b.hora));
    const lbl = parseDate(calSel).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    const bloqInfo = esBloqueado(calSel) ? 
      '<div class="card" style="background:var(--red-light);border-color:var(--red);margin-bottom:8px"><div style="font-size:13px;color:var(--red)">🔴 Día bloqueado: ' + escapeHtml(config.bloqueados.find(b => b.fecha === calSel)?.motivo || 'Sin motivo') + '</div></div>' :
      (!esHabilidado(calSel) ? '<div class="card" style="background:#F3F4F6;margin-bottom:8px"><div style="font-size:13px;color:var(--text2)">📅 Día no laborable</div></div>' : '');
      
    document.getElementById('cal-detalle').innerHTML = '<div class="sec">' + lbl + '</div>' + bloqInfo + (dt.length ? dt.map(t => cardTurno(t, calSel === hoyStr)).join('') : '<div class="empty">Sin turnos este día</div>');
  }
  
  function calNav(d) {
    calMes += d;
    if (calMes > 11) {
      calMes = 0;
      calAnio++;
    }
    if (calMes < 0) {
      calMes = 11;
      calAnio--;
    }
    renderCalendario();
  }