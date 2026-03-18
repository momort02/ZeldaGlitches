// ══════════════════════════════════════════
//  HYRULE GLITCH ARCHIVE — script.js
//  Source : Firebase Firestore
// ══════════════════════════════════════════

import { initializeApp }              from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, collection,
         getDocs, orderBy, query,
         doc, getDoc, onSnapshot }    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE CONFIG — remplacer par vos valeurs ──
const firebaseConfig = {
  apiKey:            "AIzaSyDDhRD_Ig2Zmhu_utqPhywiXcBAK7S0gvg",
  authDomain:        "zeldaglitches.firebaseapp.com",
  projectId:         "zeldaglitches",
  storageBucket:     "zeldaglitches.firebasestorage.app",
  messagingSenderId: "304863545616",
  appId:             "1:304863545616:web:0dcec75a5e49c237733d95"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── STATE ──
let GLITCHES       = [];
let activeFilter   = 'all';
let activeCategory = 'all';
let searchQuery    = '';

// ── INDEXES ──
let GLITCH_BY_GAME = {};
let STATS          = {};
let CATEGORIES     = [];

// ── DOM ──
const grid        = document.getElementById('grid');
const noResults   = document.getElementById('noResults');
const countBadge  = document.getElementById('countBadge');
const catRow      = document.getElementById('catRow');
const overlay     = document.getElementById('modalOverlay');
const modalTitle  = document.getElementById('modalTitle');
const modalBody   = document.getElementById('modalBody');
const loadingEl   = document.getElementById('loadingState');

// ══════════════════════════════════════════
//  DATA LOADING — Firestore
// ══════════════════════════════════════════
async function loadData() {
  try {
    const q    = query(collection(db, 'glitches'), orderBy('id'));
    const snap = await getDocs(q);
    GLITCHES   = snap.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    buildIndexes();
    loadingEl.style.display = 'none';
    initUI();
  } catch (err) {
    loadingEl.innerHTML = `
      <span style="color:var(--accent-red)">
        ⚠ Erreur Firebase : ${err.message}<br>
        <small>Vérifiez la config et les règles Firestore.</small>
      </span>`;
    console.error(err);
  }
}

// ══════════════════════════════════════════
//  INDEXES & STATS
// ══════════════════════════════════════════
function buildIndexes() {
  GLITCH_BY_GAME = {
    botw: GLITCHES.filter(g => g.game === 'botw'),
    totk: GLITCHES.filter(g => g.game === 'totk'),
    both: GLITCHES.filter(g => g.game === 'both'),
  };
  STATS = {
    total:    GLITCHES.length,
    botw:     GLITCH_BY_GAME.botw.length,
    totk:     GLITCH_BY_GAME.totk.length,
    both:     GLITCH_BY_GAME.both.length,
    speedrun: GLITCHES.filter(g => g.speedrunUse).length,
  };
  CATEGORIES = [...new Set(GLITCHES.map(g => g.category))].sort();
}

// ══════════════════════════════════════════
//  FILTER
// ══════════════════════════════════════════
function getFiltered() {
  let list = GLITCHES;
  if (['botw','totk','both'].includes(activeFilter)) list = list.filter(g => g.game === activeFilter);
  if (activeFilter === 'patched')  list = list.filter(g => g.patchStatus === 'patched');
  if (activeFilter === 'speedrun') list = list.filter(g => g.speedrunUse);
  if (activeCategory !== 'all')    list = list.filter(g => g.category === activeCategory);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      (g.tags || []).some(t => t.toLowerCase().includes(q)) ||
      g.category.toLowerCase().includes(q)
    );
  }
  return list;
}

// ══════════════════════════════════════════
//  BADGE HELPERS
// ══════════════════════════════════════════
function gameBadge(game) {
  const map = { botw:['badge-botw','BotW'], totk:['badge-totk','TotK'], both:['badge-both','BotW+TotK'] };
  const [cls, label] = map[game] || ['badge-both', game];
  return `<span class="game-badge ${cls}">${label}</span>`;
}
function diffBadge(d) {
  const map = { easy:['diff-easy','Facile'], medium:['diff-medium','Moyen'], hard:['diff-hard','Difficile'] };
  const [cls, label] = map[d] || ['diff-easy', d];
  return `<span class="difficulty ${cls}">${label}</span>`;
}
function patchBadge(s) {
  if (s === 'works')            return `<span class="patch-badge patch-works">✓ Actif</span>`;
  if (s === 'patched')          return `<span class="patch-badge patch-patched">✗ Patché</span>`;
  if (s === 'version_specific') return `<span class="patch-badge patch-version">~ Version</span>`;
  return '';
}
function patchLabel(s) {
  if (s === 'works')            return '✓ Toujours actif';
  if (s === 'patched')          return '✗ Patché';
  if (s === 'version_specific') return '~ Dépend de la version';
  return s;
}

// ══════════════════════════════════════════
//  RENDER — STATS
// ══════════════════════════════════════════
function renderStats() {
  document.getElementById('statTotal').textContent    = STATS.total;
  document.getElementById('statBotw').textContent     = STATS.botw;
  document.getElementById('statTotk').textContent     = STATS.totk;
  document.getElementById('statBoth').textContent     = STATS.both;
  document.getElementById('statSpeedrun').textContent = STATS.speedrun;
}

// ══════════════════════════════════════════
//  RENDER — CATEGORY ROW
// ══════════════════════════════════════════
function renderCatRow() {
  catRow.innerHTML = '';
  const mkBtn = (val, label) => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (activeCategory === val ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => { activeCategory = val; renderCards(); renderCatRow(); });
    catRow.appendChild(btn);
  };
  mkBtn('all', 'Tous');
  CATEGORIES.forEach(c => mkBtn(c, c));
}

// ══════════════════════════════════════════
//  RENDER — CARDS
// ══════════════════════════════════════════
function renderCards() {
  const filtered = getFiltered();
  grid.innerHTML = '';
  countBadge.textContent = `${filtered.length} glitch${filtered.length !== 1 ? 's' : ''}`;
  noResults.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = `card ${g.game}`;
    card.innerHTML = `
      <div class="card-header">
        <div class="card-name">${g.name}</div>
        <div class="card-badges">${gameBadge(g.game)}${diffBadge(g.difficulty)}</div>
      </div>
      <div class="card-summary">${g.summary}</div>
      <div class="card-footer">
        <div class="card-tags">
          <span class="tag">#${g.category}</span>
          ${(g.tags || []).slice(0,2).map(t => `<span class="tag">#${t}</span>`).join('')}
        </div>
        <div class="card-icons">
          ${patchBadge(g.patchStatus)}
          ${g.speedrunUse ? `<span class="speedrun-icon" title="Speedrun">⚡</span>` : ''}
          ${g.video       ? `<span class="video-icon"    title="Vidéo dispo">▶</span>` : ''}
        </div>
      </div>`;
    card.addEventListener('click', () => openModal(g));
    grid.appendChild(card);
  });
}

// ══════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════
function openModal(g) {
  modalTitle.textContent = g.name;

  let html = `
    <div class="modal-meta">
      ${gameBadge(g.game)} ${diffBadge(g.difficulty)} ${patchBadge(g.patchStatus)}
      ${g.speedrunUse ? `<span class="patch-badge patch-speedrun">⚡ Speedrun</span>` : ''}
    </div>
    <div class="modal-info-grid">
      <div class="info-cell"><div class="info-cell-label">Catégorie</div><div class="info-cell-value">${g.category}</div></div>
      <div class="info-cell"><div class="info-cell-label">Version testée</div><div class="info-cell-value">${g.version || '—'}</div></div>
      <div class="info-cell"><div class="info-cell-label">Statut patch</div><div class="info-cell-value">${patchLabel(g.patchStatus)}</div></div>
      <div class="info-cell"><div class="info-cell-label">Tags</div><div class="info-cell-value">${(g.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join('')}</div></div>
    </div>
    <div class="modal-section"><h3>Explication</h3><p>${g.explanation || '—'}</p></div>`;

  if (g.steps && g.steps.length) {
    html += `<div class="modal-section"><h3>Marche à suivre</h3><ol class="steps">${g.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div>`;
  }
  if (g.warning) html += `<div class="warning-box">⚠️ <span>${g.warning}</span></div>`;
  if (g.tip)     html += `<div class="tip-box">💡 <span>${g.tip}</span></div>`;

  if (g.video) {
    const videoId = g.video.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (videoId) {
      html += `
        <div class="modal-section">
          <h3>Démonstration</h3>
          <div class="video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1"
              title="Démonstration : ${g.name}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerpolicy="strict-origin-when-cross-origin"
              allowfullscreen>
            </iframe>
          </div>
        </div>`;
    }
  }

  modalBody.innerHTML = html;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════
function bindEvents() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderCards();
    });
  });
  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderCards();
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function initUI() {
  renderStats();
  renderCatRow();
  renderCards();
  bindEvents();
}


// ══════════════════════════════════════════
//  BANNER TICKER
// ══════════════════════════════════════════
function initBanner(data) {
  const wrap  = document.getElementById('tickerWrap');
  const track = document.getElementById('tickerTrack');

  if (!data || !data.enabled || !data.message?.trim()) {
    wrap.style.display = 'none';
    return;
  }

  const msg  = data.message.trim();
  const unit = `<span class="ticker-item">${msg}</span><span class="ticker-sep">•</span>`;

  // Remplir avec suffisamment de répétitions (au moins 20 pour les messages courts)
  const reps = Math.max(20, Math.ceil(1200 / (msg.length * 9)));
  track.innerHTML = unit.repeat(reps * 2); // *2 pour la boucle seamless

  // Rendre visible AVANT de mesurer (sinon scrollWidth = 0)
  wrap.style.display = 'block';
  track.style.animationDuration = '0s'; // pause pendant le calcul

  // Double rAF : 1er = layout, 2ème = paint → scrollWidth fiable
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const unitW  = track.scrollWidth / (reps * 2);
    const totalW = unitW * reps;
    const speed  = 80; // px/s

    if (totalW === 0) return; // sécurité

    const styleId = 'ticker-dynamic';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@keyframes ticker-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-${totalW}px); }
    }`;

    track.style.animationDuration = `${totalW / speed}s`;
  }));
}

async function loadBanner() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'banner'));
    if (snap.exists()) initBanner(snap.data());
  } catch (e) {
    console.warn('Banner:', e.message);
  }
}

// ── BOOT ──
loadData();
loadBanner();
