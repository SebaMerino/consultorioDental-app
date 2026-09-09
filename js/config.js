// ==========================================
// GESTIÓN DE CONFIGURACIÓN Y HORARIOS
// ==========================================

function abrirConfig() {
    document.getElementById('cfg-dra').value = config.dra;
    document.getElementById('cfg-desde').value = config.desde;
    document.getElementById('cfg-hasta').value = config.hasta;
    renderCfgDias();
    renderCfgBloqueados();
    document.getElementById('m-horarios').classList.add('open');
  }
  
  function renderCfgDias() {
    document.getElementById('cfg-dias').innerHTML = 
      DIAS_SEMANA.map((d, i) => '<div class="horario-dia">' + d + '</div>').join('') + 
      DIAS_SEMANA.map((d, i) => '<div class="horario-cell' + (config.dias.includes(i) ? ' activo' : '') + '" onclick="toggleDia(' + i + ')">' + (config.dias.includes(i) ? '✓' : '─') + '</div>').join('');
  }
  
  function toggleDia(i) {
    if (config.dias.includes(i)) {
      config.dias = config.dias.filter(d => d !== i);
    } else {
      config.dias.push(i);
    }
    renderCfgDias();
  }
  
  function renderCfgBloqueados() {
    document.getElementById('cfg-bloqueados-lista').innerHTML = config.bloqueados.length ? 
      config.bloqueados.map((b, i) => '<div class="card-row" style="padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px">' + fmtFecha(b.fecha) + (b.motivo ? ' — ' + escapeHtml(b.motivo) : '') + '</span><button class="btn btn-del" style="font-size:11px;padding:3px 8px" onclick="quitarBloqueo(' + i + ')">✕</button></div>').join('') :
      '<div style="font-size:13px;color:var(--text3);margin-bottom:8px">Sin días bloqueados</div>';
  }
  
  function agregarBloqueo() {
    const fecha = document.getElementById('cfg-bloqueo-fecha').value;
    const motivo = document.getElementById('cfg-bloqueo-motivo').value.trim();
    
    if (!fecha) {
      alert('Seleccioná una fecha');
      return;
    }
    
    if (!config.bloqueados.find(b => b.fecha === fecha)) {
      config.bloqueados.push({ fecha, motivo });
      renderCfgBloqueados();
    }
    
    document.getElementById('cfg-bloqueo-fecha').value = '';
    document.getElementById('cfg-bloqueo-motivo').value = '';
  }
  
  function quitarBloqueo(i) {
    config.bloqueados.splice(i, 1);
    renderCfgBloqueados();
  }
  
  async function guardarConfig() {
    config.dra = normalizarTexto(document.getElementById('cfg-dra').value) || config.dra;
    config.desde = document.getElementById('cfg-desde').value;
    config.hasta = document.getElementById('cfg-hasta').value;

    if (config.desde && config.hasta && config.desde >= config.hasta) {
      mostrarError('El horario de inicio debe ser anterior al de cierre.');
      return;
    }

    setBtnLoading('btn-guardar-config');
    const guardado = await AppState.guardar();
    if (!guardado) {
      quitarBtnLoading('btn-guardar-config');
      return;
    }
    AppState.refrescar();
    mostrarMensaje('Configuración guardada correctamente.', 'success');
    cerrarModal('m-horarios');
    quitarBtnLoading('btn-guardar-config');
  }