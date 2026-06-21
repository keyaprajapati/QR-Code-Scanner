// System States
let currentTab = 'live-scan';
let isCameraRunning = false;
let html5QrScanner = null;
let isMuted = false;
let scanHistory = JSON.parse(localStorage.getItem('aurascan_history')) || [];
let qrGenerator = null;

// Initialize Page Controls
window.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderHistory();
  setupCardParallax();
  
  // Setup HTML5 Camera Scanner configuration
  html5QrScanner = new Html5Qrcode('reader');

  // Set initial sound icon representation
  const isMutedStored = localStorage.getItem('aurascan_muted') === 'true';
  if (isMutedStored) {
    isMuted = true;
    updateMuteUI();
  }
});

// 3D Parallax Tilt Effect for interactive "8D Dynamic" physical micro-movement
function setupCardParallax() {
  const card = document.getElementById('main-interactive-card');
  const container = document.querySelector('.perspective-container');
  
  if (!card || !container) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const tiltX = -(y - centerY) / 20;
    const tiltY = (x - centerX) / 20;

    card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.005, 1.005, 1.005)`;
  });

  container.addEventListener('mouseleave', () => {
    card.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  });
}

// Spring Audio alerts (Web Audio API Synthesizer - 0 assets required)
function playAudioAlert(type) {
  if (isMuted) return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.12);
      }, 80);

      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn('Audio Context blocked by browser safety parameters', e);
  }
}

// Toggle Tab Panels
function switchTab(tabId) {
  if (tabId === currentTab) return;
  
  if (currentTab === 'live-scan' && isCameraRunning) {
    stopLiveCamera();
  }

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));

  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.getElementById(`panel-${tabId}`).classList.remove('hidden');

  currentTab = tabId;
  playAudioAlert('click');
}

// LIVE SCAN CAMERA SYSTEM
async function startLiveCamera() {
  if (isCameraRunning) return;

  const placeholder = document.getElementById('camera-placeholder');
  const controls = document.getElementById('live-controls');
  const laser = document.getElementById('laser');
  const viewBox = document.getElementById('scanner-view-box');
  const statusIndicator = document.getElementById('scanner-pulse');
  const statusText = document.getElementById('scanner-status');

  placeholder.style.opacity = '0';
  setTimeout(() => placeholder.classList.add('hidden'), 300);

  viewBox.classList.add('scanning-active');
  laser.classList.remove('hidden');
  statusIndicator.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping';
  statusText.innerText = 'Scanning Active';

  try {
    const qrCodeSuccessCallback = (decodedText) => {
      handleSuccessScan(decodedText);
    };
    const config = { fps: 20, qrbox: { width: 250, height: 250 } };

    await html5QrScanner.start({ facingMode: 'environment' }, config, qrCodeSuccessCallback);
    isCameraRunning = true;
    controls.classList.remove('hidden');
  } catch (err) {
    console.error('Camera access failed', err);
    showToast('Camera permissions blocked or unsupported device.', true);
    stopLiveCamera();
  }
}

function stopLiveCamera() {
  const placeholder = document.getElementById('camera-placeholder');
  const controls = document.getElementById('live-controls');
  const laser = document.getElementById('laser');
  const viewBox = document.getElementById('scanner-view-box');
  const statusIndicator = document.getElementById('scanner-pulse');
  const statusText = document.getElementById('scanner-status');

  if (isCameraRunning && html5QrScanner) {
    html5QrScanner.stop().then(() => {
      isCameraRunning = false;
    }).catch(err => {
      console.warn('Unable to gracefully terminate stream', err);
    });
  }

  placeholder.classList.remove('hidden');
  setTimeout(() => placeholder.style.opacity = '1', 50);

  controls.classList.add('hidden');
  laser.classList.add('hidden');
  viewBox.classList.remove('scanning-active');
  statusIndicator.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
  statusText.innerText = 'Engine Idle';
}

// DRAG AND DROP FILE LOGIC
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  processImageFile(file);
}

const dropZone = document.getElementById('drop-zone');
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-50/20');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
  }, false);
});

dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processImageFile(file);
  } else {
    showToast('Invalid file. Drop a valid image.', true);
  }
});

function processImageFile(file) {
  const idleState = document.getElementById('upload-idle-state');
  const previewState = document.getElementById('upload-preview-state');
  const previewImg = document.getElementById('uploaded-image-preview');
  const feedback = document.getElementById('upload-feedback');

  idleState.classList.add('hidden');
  previewState.classList.remove('hidden');
  feedback.innerText = 'Analysing image details...';

  const reader = new FileReader();
  reader.onload = function(e) {
    previewImg.src = e.target.result;
    
    setTimeout(() => {
      const scannerLocal = new Html5Qrcode('reader');
      scannerLocal.scanFile(file, true)
        .then(decodedText => {
          feedback.innerText = 'QR Decoded Successfully!';
          feedback.className = 'text-sm font-semibold text-emerald-600';
          handleSuccessScan(decodedText);
          scannerLocal.clear();
        })
        .catch(() => {
          feedback.innerText = 'No readable QR code recognized.';
          feedback.className = 'text-sm font-semibold text-rose-500';
          playAudioAlert('error');
          scannerLocal.clear();
        });
    }, 600);
  };
  reader.readAsDataURL(file);
}

function resetUploadState(e) {
  if (e) e.stopPropagation();
  document.getElementById('upload-idle-state').classList.remove('hidden');
  document.getElementById('upload-preview-state').classList.add('hidden');
  document.getElementById('file-input').value = '';
}

// MANAGE SUCCESS SCAN PAYLOAD
function handleSuccessScan(data) {
  playAudioAlert('success');
  
  const textBlock = document.getElementById('result-text');
  const timestampBlock = document.getElementById('result-timestamp');
  const actionBlock = document.getElementById('result-actions');
  const visitLinkBtn = document.getElementById('action-visit-link');
  const quickCopyBtn = document.getElementById('copy-quick-btn');
  const container = document.getElementById('result-container');

  container.classList.add('success-ripple');
  setTimeout(() => container.classList.remove('success-ripple'), 800);

  textBlock.innerText = data;
  textBlock.className = 'text-sm font-bold text-indigo-950 break-all leading-relaxed select-all';
  
  const now = new Date();
  timestampBlock.innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - DEC_SUCC`;

  actionBlock.classList.remove('opacity-40', 'pointer-events-none');
  quickCopyBtn.classList.remove('opacity-0', 'pointer-events-none');

  if (isValidURL(data)) {
    visitLinkBtn.href = data;
    visitLinkBtn.classList.remove('hidden');
  } else {
    visitLinkBtn.classList.add('hidden');
  }

  pushToHistory(data);
}

function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// REGISTRY/HISTORY DATABASE LOGIC (Local Storage)
function pushToHistory(data) {
  if (scanHistory.length > 0 && scanHistory[0].text === data) return;

  const record = {
    id: Date.now(),
    text: data,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
  };

  scanHistory.unshift(record);
  if (scanHistory.length > 15) scanHistory.pop();

  localStorage.setItem('aurascan_history', JSON.stringify(scanHistory));
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('history-empty');

  if (scanHistory.length === 0) {
    emptyState.classList.remove('hidden');
    document.querySelectorAll('.history-item-row').forEach(row => row.remove());
    return;
  }

  emptyState.classList.add('hidden');
  document.querySelectorAll('.history-item-row').forEach(row => row.remove());

  scanHistory.forEach(item => {
    const row = document.createElement('div');
    row.className = 'history-item-row p-3 bg-white/70 hover:bg-white border border-indigo-100/30 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all hover:scale-[1.01] duration-300';
    
    const isUrl = isValidURL(item.text);
    const iconType = isUrl ? 'link-2' : 'align-left';
    
    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-9 h-9 rounded-xl ${isUrl ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'} flex items-center justify-center shrink-0">
          <i data-lucide="${iconType}" class="w-4 h-4"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-slate-700 truncate select-all pr-2">${escapeHTML(item.text)}</p>
          <div class="flex items-center gap-1.5 mt-0.5 text-[9px] font-semibold text-slate-400">
            <span>${item.date}</span>
            <span>•</span>
            <span>${item.time}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        ${isUrl ? `<a href="${item.text}" target="_blank" class="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-lg transition-colors"><i data-lucide="external-link" class="w-3.5 h-3.5"></i></a>` : ''}
        <button onclick="copyRawText('${escapeJS(item.text)}')" class="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteHistoryItem(${item.id})" class="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
      </div>
    `;
    container.appendChild(row);
  });

  lucide.createIcons();
}

function deleteHistoryItem(id) {
  scanHistory = scanHistory.filter(item => item.id !== id);
  localStorage.setItem('aurascan_history', JSON.stringify(scanHistory));
  renderHistory();
  showToast('Entry removed');
}

function clearHistory() {
  scanHistory = [];
  localStorage.removeItem('aurascan_history');
  renderHistory();
  showToast('History wiped successfully.');
}

// QR GENERATOR LOGIC
function generateQR() {
  const text = document.getElementById('qr-input-text').value.trim();
  const container = document.getElementById('qrcode-container');
  const placeholderText = document.getElementById('gen-placeholder-text');
  const actionPanel = document.getElementById('gen-actions');
  
  const darkColor = document.getElementById('qr-color-dark').value;
  const lightColor = document.getElementById('qr-color-light').value;
  const errorLevel = document.getElementById('qr-error-level').value;

  container.innerHTML = '';

  if (!text) {
    placeholderText.classList.remove('hidden');
    actionPanel.classList.add('hidden');
    return;
  }

  placeholderText.classList.add('hidden');
  actionPanel.classList.remove('hidden');

  qrGenerator = new QRCode(container, {
    text: text,
    width: 180,
    height: 180,
    colorDark: darkColor,
    colorLight: lightColor,
    correctLevel: QRCode.CorrectLevel[errorLevel]
  });
}

function downloadQR() {
  const container = document.getElementById('qrcode-container');
  const img = container.querySelector('img');
  if (!img) return;

  const link = document.createElement('a');
  link.download = `aurascan_qr_${Date.now()}.png`;
  link.href = img.src;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Download initialized!');
}

function copyGeneratedQR() {
  const text = document.getElementById('qr-input-text').value.trim();
  if (!text) return;
  copyTextHelper(text);
  showToast('QR Content Link Copied!');
}

// ACTIONS AND HELPERS
function copyResultText() {
  const text = document.getElementById('result-text').innerText;
  copyTextHelper(text);
  showToast('Copied to clipboard!');
}

function copyRawText(text) {
  copyTextHelper(text);
  showToast('Copied successfully!');
}

function copyTextHelper(text) {
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  document.execCommand('copy');
  document.body.removeChild(tempInput);
}

function searchWebResult() {
  const text = document.getElementById('result-text').innerText;
  if (!text) return;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
}

function toggleAudioMute() {
  isMuted = !isMuted;
  localStorage.setItem('aurascan_muted', isMuted);
  updateMuteUI();
  
  if (!isMuted) {
    playAudioAlert('success');
  }
}

function updateMuteUI() {
  const btn = document.getElementById('mute-btn');
  if (isMuted) {
    btn.innerHTML = `<i data-lucide="volume-x" class="w-4 h-4 text-rose-500"></i><span class="text-rose-500">Muted</span>`;
  } else {
    btn.innerHTML = `<i data-lucide="volume-2" class="w-4 h-4 text-emerald-500 animate-pulse"></i><span class="text-slate-600">Sound On</span>`;
  }
  lucide.createIcons();
}

function showToast(message, isWarning = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  
  toastMsg.innerText = message;
  
  if (isWarning) {
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-rose-600/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl transition-all duration-300 opacity-100 scale-100 translate-y-0 z-50 flex items-center gap-2';
  } else {
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl shadow-xl transition-all duration-300 opacity-100 scale-100 translate-y-0 z-50 flex items-center gap-2';
  }

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'scale-90', 'translate-y-4');
  }, 2500);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g,
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function escapeJS(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\"/g, '\\"');
}
