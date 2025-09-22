// ===== Classroom Soundboard – enhanced controls =====

// --- DOM refs
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const volumeSlider = document.getElementById('volume');
const stopAllBtn = document.getElementById('stopAll');
const debugToggle = document.getElementById('toggleDebug');
const hotkeyToggle = document.getElementById('toggleHotkeys');

let cards = Array.from(document.querySelectorAll('.card'));
let audios = Array.from(document.querySelectorAll('audio'));

// --- Debug area (optional)
let debugEl = document.getElementById('debug');
if (!debugEl) {
  debugEl = document.createElement('div');
  debugEl.id = 'debug';
  debugEl.className = 'debug';
  debugEl.textContent = 'Soundboard Debug · load/play events will appear here';
  document.body.appendChild(debugEl);
}
const log = (...args) => {
  if (!debugToggle || !debugToggle.checked) return;
  const line = document.createElement('div');
  line.textContent = args.join(' ');
  debugEl.appendChild(line);
};

// --- Stop all helper (prevents overlapping playback)
function stopAll() {
  audios.forEach(a => {
    try {
      a.pause();
      a.currentTime = 0;
      a.closest('.card')?.classList.remove('playing');
    } catch {}
  });
}
stopAllBtn?.addEventListener('click', stopAll);

// --- Play a card (stops others first)
function playCard(card) {
  if (!card) return;
  const audio = card.querySelector('audio');
  if (!audio) return;

  stopAll(); // ensure exclusivity
  audio.volume = Number(volumeSlider?.value ?? 1);
  try {
    audio.currentTime = 0;
    audio.play();
    card.classList.add('playing');
    log('▶️ Play:', card.dataset.label || card.querySelector('.title')?.textContent || '(unnamed)');
    audio.onended = () => card.classList.remove('playing');
  } catch (err) {
    log('⚠️ Play error:', err.message || err);
  }
}

// --- Card click
cards.forEach(card => card.addEventListener('click', () => playCard(card)));

// --- Volume live update for any currently-playing sound
volumeSlider?.addEventListener('input', () => {
  audios.forEach(a => {
    if (!a.paused) a.volume = Number(volumeSlider.value);
  });
});

// --- Search filter
searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  cards.forEach(card => {
    const label = (card.dataset.label || card.textContent || '').toLowerCase();
    card.style.display = label.includes(q) ? '' : 'none';
  });
});

// ======================
// Hotkey system (UI + storage)
// ======================

// Storage key
const HK_STORAGE_KEY = 'soundboard_hotkeys_v1';

// Load map from storage
function loadHotkeyMap() {
  try {
    const raw = localStorage.getItem(HK_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch { return {}; }
}

// Save map
function saveHotkeyMap(map) {
  localStorage.setItem(HK_STORAGE_KEY, JSON.stringify(map));
}

let hotkeyMap = loadHotkeyMap(); // shape: { "1": elementId, "A": elementId, ... }

// Give each card a stable id if missing
cards.forEach((card, i) => {
  if (!card.id) card.id = 'sound_' + (card.dataset.label?.replace(/\W+/g, '_') || i);
});

// Initialize defaults from data-key in HTML (only if not already saved)
cards.forEach(card => {
  const key = (card.dataset.key || '').toString().trim();
  if (!key) return;
  const k = normalizeKey(key);
  if (k && !Object.values(hotkeyMap).includes(card.id) && !hotkeyMap[k]) {
    hotkeyMap[k] = card.id;
  }
});
saveHotkeyMap(hotkeyMap);

// Render keycaps from map
function renderKeycaps() {
  cards.forEach(card => {
    const keycap = card.querySelector('.keycap');
    if (!keycap) return;
    const assignedKey = findKeyForCard(card.id);
    keycap.textContent = assignedKey ? assignedKey : keycap.textContent.replace(/\s*\b[0-9A-Z]\b\s*$/, '');
    // Show "Press key" style when editing (CSS can style .editing)
  });
}
function findKeyForCard(cardId) {
  for (const [k, id] of Object.entries(hotkeyMap)) {
    if (id === cardId) return k;
  }
  return null;
}
renderKeycaps();

function normalizeKey(k) {
  if (!k) return null;
  k = k.toString().toUpperCase();
  // Allow 0-9 and A-Z only
  return /^[0-9A-Z]$/.test(k) ? k : null;
}

// Keyboard playback (disabled while in edit mode)
window.addEventListener('keydown', (e) => {
  // ESC stops all
  if (e.key === 'Escape') { stopAll(); return; }

  if (hotkeyToggle?.checked) return; // editing mode: don't trigger playback
  // Ignore when typing in inputs
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (['input','textarea','select'].includes(tag)) return;

  const k = normalizeKey(e.key);
  if (!k) return;
  const cardId = hotkeyMap[k];
  if (!cardId) return;
  const card = document.getElementById(cardId);
  if (card) {
    e.preventDefault();
    playCard(card);
  }
});

// Edit mode: click a keycap to assign
function startListeningForKey(card, keycap) {
  keycap.classList.add('editing');
  const originalText = keycap.textContent;
  keycap.textContent = 'Press key';

  const onKey = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const k = normalizeKey(e.key);
    if (!k && e.key !== 'Escape' && e.key !== 'Backspace' && e.key !== 'Delete') return;

    // Cancel edit
    if (e.key === 'Escape') {
      cleanup();
      keycap.textContent = originalText;
      return;
    }

    // Remove mapping (Backspace/Delete)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      // remove any key mapped to this card
      const existing = findKeyForCard(card.id);
      if (existing) delete hotkeyMap[existing];
      saveHotkeyMap(hotkeyMap);
      keycap.textContent = '';
      cleanup();
      renderKeycaps();
      return;
    }

    // Assign new
    if (k) {
      // If this key is already assigned to another card, unassign it
      if (hotkeyMap[k] && hotkeyMap[k] !== card.id) {
        // just overwrite; effectively moves the key
      }
      // Remove previous key bound to this card (if any)
      const prev = findKeyForCard(card.id);
      if (prev) delete hotkeyMap[prev];

      hotkeyMap[k] = card.id;
      saveHotkeyMap(hotkeyMap);
      keycap.textContent = k;
      cleanup();
      renderKeycaps();
    }
  };

  const cleanup = () => {
    window.removeEventListener('keydown', onKey, true);
    keycap.classList.remove('editing');
  };

  // Capture at high priority so page doesn’t consume it
  window.addEventListener('keydown', onKey, true);
}

// Wire click handlers for keycap in edit mode
cards.forEach(card => {
  const keycap = card.querySelector('.keycap');
  if (!keycap) return;

  keycap.style.cursor = 'pointer';
  keycap.title = 'Click to set hotkey (in Edit Hotkeys mode)';

  keycap.addEventListener('click', (e) => {
    if (!hotkeyToggle?.checked) return; // only when editing
    e.stopPropagation();
    startListeningForKey(card, keycap);
  });
});

// When toggling edit mode, give a quick visual cue
hotkeyToggle?.addEventListener('change', () => {
  document.body.classList.toggle('hotkeys-editing', hotkeyToggle.checked);
});

// Optional: preload for smoother first play
audios.forEach(a => { try { a.load(); } catch {} });
