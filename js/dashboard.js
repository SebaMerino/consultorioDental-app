// ==========================================
// RENDERS DE ESTADÍSTICAS (Dashboard)
// ==========================================

function renderDashboard() {
    const ahora = new Date();
    const mesAct = ahora.getMonth();
    const anioAct = ahora.getFullYear();
    
    // Filtros de turnos activos y cancelados del mes en curso
    const turnosMes = turnos.filter(t => {
      const d = parseDate(t.fecha);
      return d.getMonth() === mesAct && d.getFullYear() === anioAct && t.estado !== 'cancelado';
    });
    
    const canceladosMes = turnos.filter(t => {
      const d = parseDate(t.fecha);
      return d.getMonth() === mesAct && d.getFullYear() === anioAct && t.estado === 'cancelado';
    });
    
    // Cálculo de ingresos cobrados en el mes actual
    const ingresosMes = pacientes.reduce((acc, p) => acc + p.pagos.filter(pg => {
      const fechaPago = String(pg.fecha || '');
      return pg.tipo === 'cobro' && fechaPago.slice(0, 7) === anioAct + '-' + String(mesAct + 1).padStart(2, '0');
    }).reduce((a, pg) => a + (Number(pg.monto) || 0), 0), 0);
    
    // Sumatoria total de inasistencias históricas registradas
    const ausMes = pacientes.reduce((acc, p) => acc + (p.ausencias || 0), 0);
    
    document.getElementById('d-turnos').textContent = turnosMes.length;
    document.getElementById('d-ingresos').textContent = fmtMonto(ingresosMes);
    document.getElementById('d-cancelados').textContent = canceladosMes.length;
    document.getElementById('d-ausentes').textContent = ausMes;
    
    // Estructuración del histórico de los últimos 6 meses para las gráficas
    const meses6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anioAct, mesAct - i, 1);
      meses6.push({
        m: d.getMonth(),
        a: d.getFullYear(),
        label: MESES[d.getMonth()].slice(0, 3)
      });
    }
    
    // Valores máximos de referencia para escalar las barras proporcionalmente
    const maxT = Math.max(1, ...meses6.map(({ m, a }) => turnos.filter(t => {
      const d = parseDate(t.fecha);
      return d.getMonth() === m && d.getFullYear() === a && t.estado !== 'cancelado';
    }).length));
    
    const maxI = Math.max(1, ...meses6.map(({ m, a }) => pacientes.reduce((acc, p) => acc + p.pagos.filter(pg => pg.tipo === 'cobro' && pg.fecha.startsWith(a + '-' + String(m + 1).padStart(2, '0'))).reduce((a2, pg) => a2 + pg.monto, 0), 0)));
    
    // Renderizado del gráfico de barras para Turnos Atendidos
    document.getElementById('chart-turnos').innerHTML = meses6.map(({ m, a, label }, i) => {
      const cnt = turnos.filter(t => {
        const d = parseDate(t.fecha);
        return d.getMonth() === m && d.getFullYear() === a && t.estado !== 'cancelado';
      }).length;
      const h = Math.round((cnt / maxT) * 72) + 4;
      return '<div class="chart-bar-col"><div class="chart-val">' + cnt + '</div><div class="chart-bar' + (i === 5 ? ' highlight' : '') + '" style="height:' + h + 'px"></div><div class="chart-label">' + label + '</div></div>';
    }).join('');
    
    // Renderizado del gráfico de barras para Ingresos Mensuales
    document.getElementById('chart-ingresos').innerHTML = meses6.map(({ m, a, label }, i) => {
      const ing = pacientes.reduce((acc, p) => acc + p.pagos.filter(pg => {
        const fechaPago = String(pg.fecha || '');
        return pg.tipo === 'cobro' && fechaPago.slice(0, 7) === a + '-' + String(m + 1).padStart(2, '0');
      }).reduce((a2, pg) => a2 + (Number(pg.monto) || 0), 0), 0);
      const h = Math.round((ing / maxI) * 72) + 4;
      return '<div class="chart-bar-col"><div class="chart-val" style="font-size:8px">' + (ing > 0 ? fmtMonto(ing) : '') + '</div><div class="chart-bar' + (i === 5 ? ' highlight' : '') + '" style="height:' + h + 'px"></div><div class="chart-label">' + label + '</div></div>';
    }).join('');
    
    // Top 5 de tratamientos más recurrentes (frecuencias)
    const freq = {};
    pacientes.forEach(p => p.tratamientos.forEach(t => {
      const k = t.nombre.toLowerCase();
      freq[k] = (freq[k] || 0) + 1;
    }));
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    document.getElementById('d-tratamientos').innerHTML = sorted.length ? 
      sorted.map(([n, c]) => '<div class="card" style="padding:10px 14px;margin-bottom:6px"><div class="card-row"><span style="font-size:14px;font-weight:500;text-transform:capitalize">' + escapeHtml(n) + '</span><span class="badge b-ok">' + c + ' vez' + (c > 1 ? 'es' : '') + '</span></div></div>').join('') :
      '<div class="empty">Sin tratamientos aún</div>';
      
    // Listado de pacientes con saldos deudores activos
    const conDeuda = pacientes.filter(p => calcDeuda(p) > 0).sort((a, b) => calcDeuda(b) - calcDeuda(a));
    
    document.getElementById('d-deudas').innerHTML = conDeuda.length ? 
      conDeuda.map(p => '<div class="card" style="padding:10px 14px;margin-bottom:6px;cursor:pointer" onclick="abrirDetalle(' + p.id + ');switchDetTab(\'pagos\')"><div class="card-row"><span style="font-size:14px;font-weight:500">' + escapeHtml(p.nombre) + '</span><span class="badge b-red">' + fmtMonto(calcDeuda(p)) + '</span></div></div>').join('') :
      '<div class="empty">Sin deudas pendientes ✓</div>';
  }