// ==========================================
// CONTROL DE VENTANAS EMERGENTES (Modales)
// ==========================================

function abrirModal(t) {
    if (t === 'turno' && (typeof turnoEditId === 'undefined' || turnoEditId === null)) {
      resetTurnoForm();
    }

    if (t === 'paciente') {
      limpiarErroEnFormulario(['np-nombre', 'np-dni', 'np-tel', 'np-nac', 'np-os', 'np-obs']);
    }

    document.getElementById('m-' + t).classList.add('open');
  }
  
  function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }
  
  // Listener genérico: Cierra el modal si se hace clic en el fondo difuminado
  document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('open');
      }
    });
  });