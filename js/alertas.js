// ==========================================
// GESTIÓN Y RENDERIZADO DE ALERTAS
// ==========================================

function renderAlertas() {
    const th = turnos.filter(t => t.fecha === hoyStr && t.estado !== 'cancelado' && t.estado !== 'ausente').sort((a, b) => a.hora.localeCompare(b.hora));
    const c2 = turnos.filter(t => diffD(t.fecha) === 2 && !t.confirmado && t.estado !== 'cancelado' && t.estado !== 'ausente');
    const conA = pacientes.filter(p => (p.ausencias || 0) >= 2);
    
    // 1. Panel de turnos programados para el día de hoy
    document.getElementById('alerta-hoy').innerHTML = th.length ? 
      th.map(t => {
        const pac = pacientes.find(p => p.id === t.pacId);
        const nombre = pac ? pac.nombre : 'Paciente';
        return '<div class="card" style="display:flex;align-items:center;gap:12px">' +
          '<div class="avatar" style="background:var(--blue-light);color:var(--blue)">' + initials(nombre) + '</div>' +
          '<div>' +
            '<div style="font-size:14px;font-weight:500">' + escapeHtml(t.hora) + 'hs — ' + escapeHtml(nombre) + '</div>' +
            '<div style="font-size:12px;color:var(--text2)">' + escapeHtml(t.motivo || 'Sin motivo') + ' · ' + (t.confirmado ? '<span style="color:var(--green-dark)">✓ Confirmado</span>' : 'Sin confirmar') + '</div>' +
            '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
            (!t.confirmado ? '<button class="btn" style="font-size:12px;padding:6px 10px;background:var(--green-light);color:var(--green-dark);border-color:var(--green)" onclick="marcarConfirmado(' + t.id + ')">✓ Confirmó</button>' : '') +
            '<button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="marcarAusente(' + t.id + ')">🚫 No asistió</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') : 
      '<div class="empty">Sin turnos hoy</div>';
      
    // 2. Panel de confirmaciones pendientes (Turnos a 48 hs de antelación)
    document.getElementById('alerta-confirm').innerHTML = c2.length ? 
      c2.map(t => {
        const pac = pacientes.find(p => p.id === t.pacId);
        const nombre = pac ? pac.nombre : 'Paciente';
        const linkRecordatorio = linkWhatsAppTurno(t, 'recordatorio');
        const linkConfirmar = linkWhatsAppTurno(t, 'confirmar');
        
        return '<div class="card">' +
          '<div class="card-row" style="margin-bottom:8px">' +
            '<div>' +
              '<div style="font-size:14px;font-weight:500">' + escapeHtml(nombre) + '</div>' +
              '<div style="font-size:12px;color:var(--text2)">' + parseDate(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' ' + t.hora + 'hs</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<a class="btn-wa btn-wa-orange" href="' + linkRecordatorio + '" target="_blank">' + waIcon + ' Recordatorio</a>' +
            '<a class="btn-wa" href="' + linkConfirmar + '" target="_blank">✅ Confirmar</a>' +
            '<button class="btn" style="font-size:12px;padding:6px 10px;background:var(--green-light);color:var(--green-dark);border-color:var(--green)" onclick="marcarConfirmado(' + t.id + ')">✓ Confirmó</button>' +
            '<button class="btn btn-red" style="font-size:12px;padding:6px 10px" onclick="marcarCancelado(' + t.id + ')">✕ Canceló</button>' +
          '</div>' +
        '</div>';
      }).join('') : 
      '<div class="empty">Sin confirmaciones pendientes ✓</div>';
      
    // 3. Panel de control para pacientes con ausencias reiteradas
    document.getElementById('alerta-ausencias').innerHTML = conA.length ? 
      conA.map(p => 
        '<div class="card">' +
          '<div class="card-row">' +
            '<div>' +
              '<div style="font-size:14px;font-weight:500">' + escapeHtml(p.nombre) + '</div>' +
              '<div style="font-size:12px;color:var(--text2)">' + p.ausencias + ' ausencia' + (p.ausencias > 1 ? 's' : '') + ' sin avisar</div>' +
            '</div>' +
            '<button class="btn" style="font-size:12px;padding:6px 10px" onclick="resetAusencias(' + p.id + ')">Resetear</button>' +
          '</div>' +
        '</div>'
      ).join('') : 
      '<div class="empty">Sin ausencias reiteradas ✓</div>';
  }
  
  async function resetAusencias(pid) {
    const p = pacientes.find(x => x.id === pid);
    if (p) {
      p.ausencias = 0;
      if (!await save()) return;
      renderAll();
    }
  }