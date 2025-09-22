// ===== Soundboard logic: exclusive playback + hotkey panel =====

// DOM refs
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const volumeSlider = document.getElementById('volume');
const stopAllBtn = document.getElementById('stopAll');

// Hotkey panel controls
const hkPanel = document.getElementById('hotkeyPanel');
const hkForm  = document.getElementById('hotkeyForm');
const hkKey   = document.getElementById('hkKey');
const hkSound = document.getElementById('hkSound');
const hkList  = document.getElementById('hotkeyList');
const hkClearAll = document.getElementById('hkClearAll');

let cards = Array.from(document.querySelectorAll('.card'));
let audios = Array.from(document.querySelectorAll('audio'));

// ---- Exclusive playback helpers ----
function stopAll() {
  audios.forEach(a => { try { a.pause(); a.currentTime = 0; } catch {} });
  cards.forEach(c => c.classList.remove('playing'));
}
stopAllBtn?.addEventListener('click', stopAll);

function playCard(card) {
  if (!card) return;
  const audio = card.querySelector('audio');
  if (!audio) return;
  stopAll();
  audio.volume = Number(volumeSlider?.value ?? 1);
  try {
    audio.currentTime = 0;
    audio.play();
    card.classList.add('playing');
    audio.onended = () => card.classList.remove('playing');
  } catch {}
}

// Click-to-play
cards.forEach(card => card.addEventListener('click', () => playCard(card)));

// Live volume update for currently playing sounds
volumeSlider?.addEventListener('input', () => {
  const v = Number(volumeSlider.value);
  audios.forEach(a => { if (!a.paused) a.volume = v; });
});

// Search filter
searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  cards.forEach(card => {
    const label = (card.dataset.label || card.textContent || '').toLowerCase();
    card.style.display = label.includes(q) ? '' : 'none';
  });
});

// ===== Hotkey mapping =====
const HK_STORAGE_KEY = 'soundboard_hotkeys_v2';

// Ensure each card has a stable ID
cards.forEach((card, i) => {
  if (!card.id) {
    const base = (card.dataset.label || 'sound_' + i).toString().replace(/\W+/g,'_');
    card.id = 'id_' + base;
  }
});

// Build sound dropdown
function populateSoundSelect() {
  hkSound.innerHTML = '';
  cards.forEach(card => {
    const opt = document.createElement('option');
    const label = card.dataset.label || card.querySelector('.title')?.textContent || card.id;
    opt.value = card.id;
    opt.textContent = label;
    hkSound.appendChild(opt);
  });
}
populateSoundSelect();

// Storage helpers
function loadMap() {
  try { return JSON.parse(localStorage.getItem(HK_STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveMap(map) {
  localStorage.setItem(HK_STORAGE_KEY, JSON.stringify(map));
}
let hotkeyMap = loadMap();

// Normalize a single character to allowed keys
function normalizeKey(k) {
  if (!k) return null;
  k = k.toString().toUpperCase();
  return /^[0-9A-Z]$/.test(k) ? k : null;
}

// Find key assigned to a card
function keyForCard(cardId) {
  for (const [k,id] of Object.entries(hotkeyMap)) if (id === cardId) return k;
  return null;
}

// Render small key labels on buttons
function renderKeycaps() {
  cards.forEach(card => {
    const cap = card.querySelector('.keycap');
    if (!cap) return;
    const k = keyForCard(card.id);
    cap.textContent = k ? k : '';
  });
}

// Render list of mappings in the panel
function renderList() {
  const entries = Object.entries(hotkeyMap).sort(([a],[b]) => a.localeCompare(b));
  if (!entries.length) {
    hkList.innerHTML = '<div class="help">No hotkeys yet. Add one above.</div>';
    renderKeycaps();
    return;
  }
  const frag = document.createDocumentFragment();
  entries.forEach(([k, id]) => {
    const card = document.getElementById(id);
    const label = card?.dataset.label || card?.querySelector('.title')?.textContent || id;
    const row = document.createElement('div');
    row.className = 'hk-row';
    row.innerHTML = `
      <div class="hk-key">${k}</div>
      <div class="hk-label">${label}</div>
      <button type="button" class="hk-remove" data-k="${k}">Remove</button>
    `;
    frag.appendChild(row);
  });
  hkList.innerHTML = '';
  hkList.appendChild(frag);

  // Wire remove buttons
  hkList.querySelectorAll('.hk-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.k;
      delete hotkeyMap[k];
      saveMap(hotkeyMap);
      renderList();
      renderKeycaps();
    });
  });

  renderKeycaps();
}
renderList();

// Handle add/update mapping
hkForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const keyInput = normalizeKey(hkKey.value);
  const cardId = hkSound.value;
  if (!keyInput || !cardId) {
    hkKey.focus();
    return;
  }
  // Move key if in use; remove previous key for this card
  for (const [k, id] of Object.entries(hotkeyMap)) {
    if (id === cardId) delete hotkeyMap[k];
  }
  hotkeyMap[keyInput] = cardId;
  saveMap(hotkeyMap);
  hkKey.value = '';
  renderList();
  renderKeycaps();
});

// Clear all mappings
hkClearAll?.addEventListener('click', () => {
  if (!confirm('Remove all hotkey mappings?')) return;
  hotkeyMap = {};
  saveMap(hotkeyMap);
  renderList();
  renderKeycaps();
});

// Keyboard handler
window.addEventListener('keydown', (e) => {
  // Stop on Esc
  if (e.key === 'Escape') { stopAll(); return; }

  // Avoid typing in inputs (including our HK form)
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (['input','textarea','select'].includes(tag)) return;

  const k = normalizeKey(e.key);
  if (!k) return;
  const cardId = hotkeyMap[k];
  if (!cardId) return;
  const card = document.getElementById(cardId);
  if (!card) return;
  e.preventDefault();
  playCard(card);
});

// Optional: preload audio for smoother first play
audios.forEach(a => { try { a.load(); } catch {} });
