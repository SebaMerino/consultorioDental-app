// ==========================================
// CONSTANTES Y CONFIGURACIÓN DEL ODONTOGRAMA
// ==========================================

const DIENTES_SUP_DER = [18, 17, 16, 15, 14, 13, 12, 11];
const DIENTES_SUP_IZQ = [21, 22, 23, 24, 25, 26, 27, 28];
const DIENTES_INF_IZQ = [31, 32, 33, 34, 35, 36, 37, 38];
const DIENTES_INF_DER = [48, 47, 46, 45, 44, 43, 42, 41];

const ESTADO_ICO = {
  sano: '',
  caries: '🟡',
  tratado: '✅',
  extraccion: '🔴',
  corona: '👑',
  ausente: '✕'
};

let estadoOdonto = 'sano';

// ==========================================
// GESTIÓN DEL ODONTOGRAMA INTERACTIVO
// ==========================================

function setEstado(e) {
  estadoOdonto = e;
  document.querySelectorAll('.odonto-opt').forEach(el => el.classList.remove('active-opt'));
  document.querySelector('.opt-' + e).classList.add('active-opt');
}

function renderOdontograma() {
  const p = pacientes.find(x => x.id === detPacId);
  const od = p.odontograma || {};
  
  renderFila('od-sup-der', DIENTES_SUP_DER, od);
  renderFila('od-sup-izq', DIENTES_SUP_IZQ, od);
  renderFila('od-inf-der', DIENTES_INF_DER, od);
  renderFila('od-inf-izq', DIENTES_INF_IZQ, od);
}

function renderFila(elementId, arrayDientes, od) {
  document.getElementById(elementId).innerHTML = arrayDientes.map(num => {
    const est = od[num] || 'sano';
    const ico = ESTADO_ICO[est] || '';
    return '<div class="diente ' + est + '" onclick="toggleDiente(' + num + ')" title="Diente ' + num + '"><span class="d-num">' + num + '</span><span class="d-ico">' + ico + '</span></div>';
  }).join('');
}

async function toggleDiente(num) {
  const p = pacientes.find(x => x.id === detPacId);
  if (!p.odontograma) p.odontograma = {};
  
  const actual = p.odontograma[num] || 'sano';
  
  // Si se hace clic en el mismo estado actual, vuelve a "sano", de lo contrario aplica el seleccionado
  if (actual === estadoOdonto) {
    p.odontograma[num] = 'sano';
  } else {
    p.odontograma[num] = estadoOdonto;
  }
  
  if (!await save()) return;
  renderOdontograma();
}