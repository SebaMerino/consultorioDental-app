// ==========================================
// CONTROLADOR PRINCIPAL Y ENRUTAMIENTO 
// ==========================================

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn = document.getElementById('menu-btn');
    if (!sidebar || !backdrop) return;

    const willOpen = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', willOpen);
    backdrop.classList.toggle('open', willOpen);
    if (btn) btn.setAttribute('aria-expanded', String(willOpen));
  }

  function cerrarMenu() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btn = document.getElementById('menu-btn');
    if (!sidebar || !backdrop) return;

    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

async function init() {
  aplicarTema();
    calMes = hoy.getMonth();
    calAnio = hoy.getFullYear();
    calSel = hoyStr;
    
    document.getElementById('hdr-fecha').textContent = hoy.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    
    const fi = document.getElementById('f-fecha');
    if (fi) {
      fi.value = hoyStr;
      fi.min = hoyStr;
    }
    const ntFecha = document.getElementById('nt-fecha');
    if (ntFecha) ntFecha.value = hoyStr;
    
    initAppInteractions();

    // Trae pacientes/turnos/config del usuario logueado antes de
    // pintar nada (si falla, cargarDatosDesdeSupabase ya muestra el
    // error y renderAll() simplemente pinta todo vacío).
    await cargarDatosDesdeSupabase();

    renderAll();
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const clavePestana = user ? 'consultorio-pestana-' + user.id : 'consultorio-pestana';
    const ultimaPestana = localStorage.getItem(clavePestana) || 'agenda';
    goTab(ultimaPestana);
    initPWA();
  }

  function initAppInteractions() {
    document.querySelectorAll('.fg input, .fg select, .fg textarea').forEach(el => {
      el.addEventListener('input', () => el.classList.remove('input-error'));
      el.addEventListener('change', () => el.classList.remove('input-error'));
    });

    document.addEventListener('input', (event) => {
      const input = event.target;
      if (input.matches('input[type="tel"]')) {
        input.value = input.value.replace(/\D/g, '').slice(0, 10);
      }
    });

    const monto = document.getElementById('np-monto');
    if (monto) {
      monto.addEventListener('input', () => {
        monto.value = formatearMontoInput(monto.value);
      });
    }

    const hoyInput = fechaStr(new Date());
    ['tn-nac', 'np-nac'].forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.max = hoyInput;
    });
  }

  function aplicarTema() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const claveTema = user ? 'consultorio-tema-' + user.id : 'consultorio-tema';
    const oscuro = localStorage.getItem(claveTema) === 'dark';
    document.body.classList.toggle('dark-theme', oscuro);
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.textContent = oscuro ? '☀' : '☾';
      button.setAttribute('aria-label', oscuro ? 'Usar modo claro' : 'Usar modo oscuro');
      button.title = oscuro ? 'Usar modo claro' : 'Usar modo oscuro';
    }
  }

  function toggleTheme() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const claveTema = user ? 'consultorio-tema-' + user.id : 'consultorio-tema';
    const oscuro = !document.body.classList.contains('dark-theme');
    localStorage.setItem(claveTema, oscuro ? 'dark' : 'light');
    aplicarTema();
  }
  
  function renderAll() {
    renderAgenda();
    renderCalendario();
    renderPacientes();
    renderDashboard();
    renderAlertas();
    actualizarSelectPac();
  }
  
  function goTab(t) {
    const tabs = ['agenda', 'calendario', 'pacientes', 'dashboard', 'alertas'];
    const index = tabs.indexOf(t);

    if (index === -1) return;

    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    const clavePestana = user ? 'consultorio-pestana-' + user.id : 'consultorio-pestana';
    localStorage.setItem(clavePestana, t);
    if (t === 'dashboard' && typeof renderDashboard === 'function') {
      renderDashboard();
    }

    cerrarMenu();

    document.querySelectorAll('.nav-btn').forEach((b, i) => {
      b.classList.toggle('active', tabs[i] === t);
    });
    
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
    });
    const view = document.getElementById('v-' + t);
    if (view) view.classList.add('active');
    
    const btn = document.getElementById('hdr-btn');
    if (!btn) return;

    if (t === 'pacientes') {
      btn.style.display = 'none';
    } else if (t === 'dashboard') {
      btn.style.display = '';
      btn.textContent = '⚙️ Config';
      btn.onclick = () => abrirConfig();
    } else {
      btn.style.display = '';
      btn.textContent = '+ Turno';
      btn.onclick = () => abrirModal('turno');
    }
  }
  
  // ==========================================
  // DISPARADOR DE ARRANQUE
  // ==========================================
  window.initApp = init;