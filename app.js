/* Drum Groove Editor - application logic, URL model, grid, playback, exports */
(function () {
  'use strict';

  const DIVISIONS = [
    { div: 8, label: '1/8' },
    { div: 16, label: '1/16' },
    { div: 32, label: '1/32' },
    { div: 12, label: '1/8T' },
    { div: 24, label: '1/16T' },
    { div: 48, label: 'Mixed' },
  ];

  const MET_SOUNDS = [
    { id: 'click', label: 'Click' },
    { id: 'beep', label: 'Beep' },
    { id: 'bell', label: 'Bell' },
    { id: 'woodblock', label: 'Woodblock' },
    { id: 'cowbell', label: 'Cowbell' },
    { id: 'rim', label: 'Rim' },
    { id: 'hat', label: 'Hat' },
  ];

  // variant index 0 = off. notes/vels are per-variant General MIDI note lists.
  // pos = staff position in half-steps above the bottom line (0 = bottom line).
  const INSTRUMENTS = [
    { id: 'hh', label: 'Hi-hat', pos: 9, param: 'H',
      variants: ['Off', 'Closed', 'Open', 'Accent'], codes: ['-', 'o', 'p', 'a'],
      notes: [[], [42], [46], [42]], vels: [[], [90], [82], [122]] },
    { id: 'snare', label: 'Snare', pos: 5, param: 'S',
      variants: ['Off', 'Normal', 'Accent', 'Ghost', 'Cross-stick', 'Flam', 'Buzz', 'Rimshot'],
      codes: ['-', 'o', 'a', 'g', 'c', 'f', 'z', 'm'],
      notes: [[], [38], [38], [38], [37], [38], [38], [40]],
      vels: [[], [100], [122], [50], [95], [110], [95], [120]] },
    { id: 'kick', label: 'Kick', pos: 1, param: 'K',
      variants: ['Off', 'Normal', 'Hi-hat foot', 'Kick + HH foot'],
      codes: ['-', 'o', 'f', 'j'],
      notes: [[], [36], [44], [36, 44]],
      vels: [[], [112], [90], [112, 90]] },
    { id: 'tom1', label: 'Tom 1 (High)', pos: 7, param: 'T1', optional: true,
      variants: ['Off', 'Normal', 'Accent'], codes: ['-', 'o', 'a'],
      notes: [[], [50], [50]], vels: [[], [100], [122]] },
    { id: 'tom2', label: 'Tom 2 (Mid)', pos: 6, param: 'T2', optional: true,
      variants: ['Off', 'Normal', 'Accent'], codes: ['-', 'o', 'a'],
      notes: [[], [47], [47]], vels: [[], [100], [122]] },
    { id: 'tom3', label: 'Tom 3 (Floor)', pos: 3, param: 'T3', optional: true,
      variants: ['Off', 'Normal', 'Accent'], codes: ['-', 'o', 'a'],
      notes: [[], [41], [41]], vels: [[], [100], [122]] },
    { id: 'crash', label: 'Crash', pos: 10, param: 'C', optional: true,
      variants: ['Off', 'Crash', 'Accent'], codes: ['-', 'o', 'a'],
      notes: [[], [49], [49]], vels: [[], [110], [127]] },
    { id: 'ride', label: 'Ride', pos: 8, param: 'R', optional: true,
      variants: ['Off', 'Ride', 'Bell', 'Accent'], codes: ['-', 'o', 'b', 'a'],
      notes: [[], [51], [53], [51]], vels: [[], [95], [95], [120]] },
    { id: 'cowbell', label: 'Cowbell', pos: 11, param: 'B', optional: true,
      variants: ['Off', 'Normal'], codes: ['-', 'o'],
      notes: [[], [56]], vels: [[], [110]] },
  ];

  // Groove library. Patterns run for one bar; lengths follow the subdivision
  // (8 chars for 8ths, 12 for 8th-triplets, 16 for 16ths). Letters per instrument:
  // hh  - off, o normal, p open, a accent, c crash, r ride, b ride bell, w cowbell
  // snr - off, o normal, a accent, g ghost, c cross-stick, f flam, z buzz, m rimshot
  // kick- off, o normal, f hi-hat foot, j kick + hi-hat foot
  const PRESETS = [
    // ---- Rock / Pop ----
    { group: 'Rock / Pop', name: 'Rock (8ths)', ts: [4, 4], div: 8, tempo: 90, swing: 0, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o---o---' } },
    { group: 'Rock / Pop', name: 'Four on the floor', ts: [4, 4], div: 8, tempo: 120, swing: 0, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o-o-o-o-' } },
    { group: 'Rock / Pop', name: 'Half-time', ts: [4, 4], div: 8, tempo: 85, swing: 0, tracks: { hh: 'oooooooo', snare: '----o---', kick: 'o-----o-' } },
    { group: 'Rock / Pop', name: 'Train beat', ts: [4, 4], div: 8, tempo: 110, swing: 0, tracks: { hh: 'oooooooo', snare: 'o-o-o-o-', kick: 'o---o---' } },
    { group: 'Rock / Pop', name: 'Disco', ts: [4, 4], div: 8, tempo: 120, swing: 0, tracks: { hh: 'opopopop', snare: '--o---o-', kick: 'o-o-o-o-' } },
    { group: 'Rock / Pop', name: 'Punk', ts: [4, 4], div: 8, tempo: 175, swing: 0, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o--o--o-' } },
    { group: 'Rock / Pop', name: 'Ballad', ts: [4, 4], div: 8, tempo: 66, swing: 0, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o-------' } },

    // ---- Blues / Jazz ----
    { group: 'Blues / Jazz', name: 'Shuffle', ts: [4, 4], div: 8, tempo: 100, swing: 66, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o--o--o-' } },
    { group: 'Blues / Jazz', name: 'Swing (jazz)', ts: [4, 4], div: 12, tempo: 140, swing: 0, tracks: { ride: 'o--o-oo--o-o', snare: '-----g-----g', kick: '---f-----f--' } },
    { group: 'Blues / Jazz', name: 'Blues Shuffle', ts: [4, 4], div: 12, tempo: 120, swing: 0, tracks: { hh: 'o-oo-oo-oo-o', snare: '---o-----o--', kick: 'o-----o-----' } },

    // ---- Funk / Soul ----
    { group: 'Funk / Soul', name: 'Funk (16ths)', ts: [4, 4], div: 16, tempo: 100, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '----o-------o---', kick: 'o--o--o---o-----' } },
    { group: 'Funk / Soul', name: 'Basic 16ths', ts: [4, 4], div: 16, tempo: 90, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '----o-------o---', kick: 'o-------o-------' } },
    { group: 'Funk / Soul', name: 'Motown', ts: [4, 4], div: 8, tempo: 120, swing: 0, tracks: { hh: 'oooooooo', snare: '--o---o-', kick: 'o---o--o' } },
    { group: 'Funk / Soul', name: 'Afrobeat', ts: [4, 4], div: 16, tempo: 106, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '----c-------c---', kick: 'o--o--o--o--o---' } },

    // ---- Latin ----
    { group: 'Latin', name: 'Bossa Nova', ts: [4, 4], div: 16, tempo: 132, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '----c-------c---', kick: 'o-----o-------o-' } },
    { group: 'Latin', name: 'Samba', ts: [4, 4], div: 16, tempo: 104, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '---o---o---o---o', kick: '----o-------o---' } },
    { group: 'Latin', name: 'Cha-Cha', ts: [4, 4], div: 16, tempo: 120, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '--c---c---c---c-', kick: 'o-----o---o-----' } },
    { group: 'Latin', name: 'Baião', ts: [4, 4], div: 16, tempo: 110, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '--o---o---o---o-', kick: 'o---o---o---o---' } },

    // ---- Caribbean / New Orleans ----
    { group: 'Caribbean', name: 'Reggae (one drop)', ts: [4, 4], div: 8, tempo: 76, swing: 0, tracks: { hh: '--o---o-', snare: '----c---', kick: '----o---' } },
    { group: 'Caribbean', name: 'Calypso', ts: [4, 4], div: 8, tempo: 120, swing: 0, tracks: { hh: 'o-o-o-o-', snare: '--o-o-o-', kick: 'o---o---' } },
    { group: 'Caribbean', name: 'Second line', ts: [4, 4], div: 16, tempo: 100, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: 'o-o---o-o-o---o-', kick: 'o-----o-------o-' } },

    // ---- Heavy ----
    { group: 'Heavy', name: 'Metal (double bass)', ts: [4, 4], div: 16, tempo: 180, swing: 0, tracks: { hh: 'o-o-o-o-o-o-o-o-', snare: '----o-------o---', kick: 'oooooooooooooooo' } },

    // ---- Other metres ----
    { group: 'Other metres', name: 'Waltz (3/4)', ts: [3, 4], div: 8, tempo: 120, swing: 0, tracks: { hh: 'oooooo', snare: '--o-o-', kick: 'o-----' } },
  ];

  const DEFAULT_PATTERNS = {
    hh: '--------', snare: '--------', kick: 'o-oo--oo',
    tom1: '--------', tom2: '--------', tom3: '--------',
    crash: '--------', ride: '--------', cowbell: '--------',
  };

  const state = {
    timeSigTop: 4, timeSigBottom: 4, division: 8, tempo: 80, measures: 1,
    metronome: 0, lastMetronome: 4, metronomeSound: 'click', metronomeVolume: 70, swing: 0, title: '', author: '', comment: '',
    showExtras: false, showStickings: false, theme: 'dark',
    volumes: {}, tracks: {}, stickings: [],
  };

  const undoStack = [];
  const el = (id) => document.getElementById(id);
  const byId = (id) => INSTRUMENTS.find((i) => i.id === id);
  const visibleInstruments = () => INSTRUMENTS.filter((i) => !i.optional || state.showExtras);
  const volOf = (id) => (state.volumes[id] == null ? 100 : state.volumes[id]);

  const subsPerMeasure = () => Math.max(1, Math.round(state.timeSigTop / state.timeSigBottom * state.division));
  const totalColumns = () => subsPerMeasure() * state.measures;

  function beatLength() {
    if (state.timeSigBottom === 8 && state.timeSigTop % 3 === 0) return Math.max(1, Math.round(3 * state.division / 8));
    return Math.max(1, Math.round(state.division / 4));
  }

  const ALL_CODES = ['-', 'o', 'a', 'g', 'c', 'f', 'z', 'm', 'p', 'r', 'b', 'w', 'j'];
  function charToCell(inst, ch) {
    if (!ch || ch === ' ' || ch === '-') return 0;
    const i = inst.codes.indexOf(ch);
    if (i > 0) return i;
    // fall back: any unknown letter means a plain hit
    return 1;
  }
  function cellToChar(inst, idx) { return inst.codes[idx] || '-'; }

  function loadPattern(inst, pattern, columns) {
    const chars = String(pattern || '').replace(/\|/g, '');
    const arr = new Array(columns).fill(0);
    for (let i = 0; i < columns; i++) arr[i] = charToCell(inst, chars[i]);
    return arr;
  }

  function syncArrays() {
    const cols = totalColumns();
    for (const inst of INSTRUMENTS) {
      const cur = state.tracks[inst.id] || [];
      const next = new Array(cols).fill(0);
      for (let i = 0; i < Math.min(cur.length, cols); i++) next[i] = cur[i];
      state.tracks[inst.id] = next;
    }
    const stk = state.stickings || [];
    const ns = new Array(cols).fill(0);
    for (let i = 0; i < Math.min(stk.length, cols); i++) ns[i] = stk[i];
    state.stickings = ns;
  }

  function patternFor(inst) {
    const cols = totalColumns();
    const per = subsPerMeasure();
    let out = '|';
    for (let c = 0; c < cols; c++) {
      out += cellToChar(inst, state.tracks[inst.id][c] || 0);
      if ((c + 1) % per === 0) out += '|';
    }
    return out;
  }

  /* ---------------- URL model ---------------- */
  function applyQuery() {
    const q = new URLSearchParams(location.search);
    if (q.get('TimeSig')) {
      const parts = q.get('TimeSig').split('/');
      state.timeSigTop = parseInt(parts[0], 10) || state.timeSigTop;
      state.timeSigBottom = parseInt(parts[1], 10) || state.timeSigBottom;
    }
    if (q.get('Div')) state.division = parseInt(q.get('Div'), 10) || state.division;
    if (q.get('Tempo')) state.tempo = parseInt(q.get('Tempo'), 10) || state.tempo;
    if (q.get('Measures')) state.measures = Math.min(16, Math.max(1, parseInt(q.get('Measures'), 10) || 1));
    if (q.get('Met')) { state.metronome = parseInt(q.get('Met'), 10) || 0; if (state.metronome) state.lastMetronome = state.metronome; }
    if (q.get('MetSound')) state.metronomeSound = q.get('MetSound');
    if (q.get('MetVol')) state.metronomeVolume = Math.min(100, Math.max(0, parseInt(q.get('MetVol'), 10) || 0));
    if (q.get('Swing')) state.swing = parseInt(q.get('Swing'), 10) || 0;
    if (q.get('Title')) state.title = q.get('Title');
    if (q.get('Author')) state.author = q.get('Author');
    if (q.get('Comment')) state.comment = q.get('Comment');
    if (q.get('Extras') === '1') state.showExtras = true;
    if (q.get('Mix')) {
      q.get('Mix').split(',').forEach((pair) => {
        const [id, v] = pair.split(':');
        if (byId(id)) state.volumes[id] = Math.min(100, Math.max(0, parseInt(v, 10) || 0));
      });
    }
    if (q.get('Stk') === '1') state.showStickings = true;
    if (q.get('Theme')) state.theme = q.get('Theme') === 'light' ? 'light' : 'dark';

    syncArrays();
    if (location.search.length > 1) {
      for (const inst of INSTRUMENTS) {
        const val = q.get(inst.param);
        if (val) state.tracks[inst.id] = loadPattern(inst, val, totalColumns());
      }
      const stk = q.get('Stick');
      if (stk) {
        const chars = stk.replace(/\|/g, '');
        for (let i = 0; i < state.stickings.length; i++) {
          const ch = chars[i];
          state.stickings[i] = ch === 'R' ? 1 : ch === 'L' ? 2 : ch === 'B' ? 3 : ch === 'C' ? 4 : 0;
        }
      }
    } else {
      for (const inst of INSTRUMENTS) state.tracks[inst.id] = loadPattern(inst, DEFAULT_PATTERNS[inst.id], totalColumns());
    }
  }

  function buildQuery() {
    const q = new URLSearchParams();
    q.set('TimeSig', state.timeSigTop + '/' + state.timeSigBottom);
    q.set('Div', String(state.division));
    q.set('Tempo', String(state.tempo));
    q.set('Measures', String(state.measures));
    for (const inst of visibleInstruments()) q.set(inst.param, patternFor(inst));
    if (state.metronome) {
      q.set('Met', String(state.metronome));
      if (state.metronomeSound && state.metronomeSound !== 'click') q.set('MetSound', state.metronomeSound);
    }
    if (state.metronomeVolume !== 70) q.set('MetVol', String(state.metronomeVolume));
    if (state.theme && state.theme !== 'dark') q.set('Theme', state.theme);
    if (state.swing) q.set('Swing', String(state.swing));
    if (state.title) q.set('Title', state.title);
    if (state.author) q.set('Author', state.author);
    if (state.comment) q.set('Comment', state.comment);
    if (state.showExtras) q.set('Extras', '1');
    const mix = Object.keys(state.volumes).filter((k) => state.volumes[k] !== 100 && byId(k));
    if (mix.length) q.set('Mix', mix.map((k) => k + ':' + state.volumes[k]).join(','));
    if (state.showStickings) {
      q.set('Stk', '1');
      const s = state.stickings.map((v) => v === 1 ? 'R' : v === 2 ? 'L' : v === 3 ? 'B' : v === 4 ? 'C' : '-').join('');
      q.set('Stick', s);
    }
    return q.toString();
  }

  function syncUrl() {
    history.replaceState(null, '', location.pathname + '?' + buildQuery());
  }

  /* ---------------- rendering ---------------- */
  const VARIANT_CLASS = {
    open: 'v-open', accent: 'v-accent', ghost: 'v-ghost', crossstick: 'v-xstick',
    flam: 'v-flam', buzz: 'v-buzz', rimshot: 'v-rim', hihhatfoot: 'v-foot',
    crash: 'v-crash', ride: 'v-ride', ridebell: 'v-bell', cowbell: 'v-cowbell',
  };
  function variantClass(inst, idx) {
    if (!idx) return '';
    const name = inst.variants[idx].toLowerCase().replace(/[^a-z]/g, '');
    const c = VARIANT_CLASS[name];
    return c ? ' ' + c : '';
  }

  function renderSidebar() {
    const list = el('subdivisionList');
    list.innerHTML = '';
    DIVISIONS.forEach((d) => {
      const b = document.createElement('button');
      b.className = 'side-btn' + (d.div === state.division ? ' active' : '');
      b.innerHTML = `<span class="side-label">${d.label}</span>`;
      b.title = d.label + ' notes';
      b.addEventListener('click', () => { pushUndo(); changeDivision(d.div); });
      list.appendChild(b);
    });
    el('tsTopLabel').textContent = state.timeSigTop;
    el('tsBottomLabel').textContent = state.timeSigBottom;
  }

  function themeColors() {
    const cs = getComputedStyle(document.documentElement);
    return {
      paper: (cs.getPropertyValue('--staff-paper') || '').trim() || '#20242b',
      ink: (cs.getPropertyValue('--staff-ink') || '').trim() || '#e8eaed',
    };
  }

  function renderStaff(colors) {
    el('staffTarget').innerHTML = Staff.render(state, visibleInstruments(), colors || themeColors());
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    try { localStorage.setItem('dge-theme', state.theme); } catch (e) { /* ignore */ }
  }

  // Make the embedded music font available to the page.
  function injectFont() {
    if (document.getElementById('music-font') || !window.MUSIC_FONT_CSS) return;
    const style = document.createElement('style');
    style.id = 'music-font';
    style.textContent = window.MUSIC_FONT_CSS;
    document.head.appendChild(style);
  }

  function renderGrid() {
    const container = el('gridContainer');
    container.innerHTML = '';
    const cols = totalColumns();
    const beat = beatLength();

    for (const inst of visibleInstruments()) {
      const row = document.createElement('div');
      row.className = 'grid-row';
      const label = document.createElement('div');
      label.className = 'grid-label';
      label.textContent = inst.label;
      const cells = document.createElement('div');
      cells.className = 'grid-cells';
      for (let c = 0; c < cols; c++) {
        const idx = state.tracks[inst.id][c] || 0;
        const b = document.createElement('button');
        b.className = 'cell' + (idx ? ' on' : '') + variantClass(inst, idx) + (c % beat === 0 ? ' beat-start' : '');
        b.dataset.inst = inst.id;
        b.dataset.col = String(c);
        b.title = inst.label + ': ' + inst.variants[idx];
        cells.appendChild(b);
      }
      const vol = document.createElement('input');
      vol.type = 'range'; vol.min = '0'; vol.max = '100';
      vol.value = String(volOf(inst.id));
      vol.className = 'grid-vol';
      vol.title = inst.label + ' volume';
      vol.setAttribute('aria-label', inst.label + ' volume');
      vol.addEventListener('input', () => { state.volumes[inst.id] = parseInt(vol.value, 10); syncUrl(); });
      row.appendChild(label); row.appendChild(cells); row.appendChild(vol);
      container.appendChild(row);
    }

    if (state.showStickings) {
      const row = document.createElement('div');
      row.className = 'grid-row sticking-row';
      const label = document.createElement('div');
      label.className = 'grid-label';
      label.textContent = 'Sticking';
      const cells = document.createElement('div');
      cells.className = 'grid-cells';
      for (let c = 0; c < cols; c++) {
        const code = state.stickings[c] || 0;
        const b = document.createElement('button');
        b.className = 'cell' + (code ? ' on' : '') + (c % beat === 0 ? ' beat-start' : '');
        b.dataset.stk = String(c);
        const label2 = code === 1 ? 'R' : code === 2 ? 'L' : code === 3 ? 'R/L' : code === 4 ? Staff.countLabel(state, c) : '';
        b.innerHTML = `<span class="stk">${label2}</span>`;
        cells.appendChild(b);
      }
      row.appendChild(label); row.appendChild(cells);
      container.appendChild(row);
    }
  }

  function renderControls() {
    el('tempoRange').value = state.tempo;
    el('tempoValue').value = state.tempo;
    el('swingRange').value = state.swing;
    el('swingValue').textContent = state.swing + '%';
    el('barCount').textContent = state.measures;
    document.querySelectorAll('.met-btn[data-met]').forEach((b) => b.classList.toggle('active', parseInt(b.dataset.met, 10) === state.metronome));
    el('metToggle').classList.toggle('active', state.metronome > 0);
    el('metToggle').textContent = state.metronome > 0 ? 'ON' : 'OFF';
    el('metSound').value = state.metronomeSound;
    el('metVolume').value = state.metronomeVolume;
    el('metVolumeValue').textContent = state.metronomeVolume + '%';
    el('extrasBtn').classList.toggle('active', state.showExtras);
    el('stickingsBtn').classList.toggle('active', state.showStickings);
    el('themeBtn').textContent = state.theme === 'dark' ? '\u263e Dark' : '\u2600 Light';
  }

  function renderFields() {
    el('tuneTitle').value = state.title;
    el('tuneAuthor').value = state.author;
    el('tuneComment').value = state.comment;
  }

  function renderAll() { renderSidebar(); renderStaff(); renderGrid(); renderControls(); renderFields(); syncUrl(); }

  /* ---------------- undo ---------------- */
  function snapshot() { return JSON.stringify(state); }
  function pushUndo() { undoStack.push(snapshot()); if (undoStack.length > 100) undoStack.shift(); }
  function undo() {
    const prev = undoStack.pop();
    if (!prev) return;
    Object.assign(state, JSON.parse(prev));
    renderAll();
  }

  /* ---------------- edits ---------------- */
  function changeDivision(div) {
    const oldPer = subsPerMeasure();
    const oldTracks = {};
    for (const inst of INSTRUMENTS) oldTracks[inst.id] = state.tracks[inst.id].slice();
    const oldStk = state.stickings.slice();
    state.division = div;
    const newPer = subsPerMeasure();
    const cols = totalColumns();
    const ratio = newPer / oldPer;
    for (const inst of INSTRUMENTS) {
      const next = new Array(cols).fill(0);
      for (let c = 0; c < cols; c++) next[c] = oldTracks[inst.id][Math.floor(c / ratio)] || 0;
      state.tracks[inst.id] = next;
    }
    const ns = new Array(cols).fill(0);
    for (let c = 0; c < cols; c++) ns[c] = oldStk[Math.floor(c / ratio)] || 0;
    state.stickings = ns;
    renderAll();
  }

  function changeTimeSig(top, bottom) { state.timeSigTop = top; state.timeSigBottom = bottom; syncArrays(); renderAll(); }

  function setMeasures(n) { state.measures = Math.min(16, Math.max(1, n)); syncArrays(); renderAll(); }

  function addBar() {
    if (state.measures >= 16) { alert('Maximum of 16 bars.'); return; }
    const per = subsPerMeasure();
    const cols = totalColumns();
    for (const inst of INSTRUMENTS) state.tracks[inst.id] = state.tracks[inst.id].concat(new Array(per).fill(0));
    state.stickings = state.stickings.concat(new Array(per).fill(0));
    state.measures++;
    void cols;
    renderAll();
  }

  function removeBar() {
    if (state.measures <= 1) return;
    const per = subsPerMeasure();
    for (const inst of INSTRUMENTS) state.tracks[inst.id] = state.tracks[inst.id].slice(0, state.tracks[inst.id].length - per);
    state.stickings = state.stickings.slice(0, state.stickings.length - per);
    state.measures--;
    renderAll();
  }

  /* ---------------- permutations ---------------- */
  function rotateWithinMeasures(arr, dir) {
    const per = subsPerMeasure();
    const out = arr.slice();
    for (let m = 0; m * per < out.length; m++) {
      const seg = out.slice(m * per, (m + 1) * per);
      if (dir > 0) seg.unshift(seg.pop()); else seg.push(seg.shift());
      for (let i = 0; i < seg.length; i++) out[m * per + i] = seg[i];
    }
    return out;
  }
  function reverseWithinMeasures(arr) {
    const per = subsPerMeasure();
    const out = arr.slice();
    for (let m = 0; m * per < out.length; m++) {
      const seg = out.slice(m * per, (m + 1) * per).reverse();
      for (let i = 0; i < seg.length; i++) out[m * per + i] = seg[i];
    }
    return out;
  }
  function permute(kind) {
    const inst = byId(el('permVoice').value);
    if (!inst) return;
    pushUndo();
    let arr = state.tracks[inst.id].slice();
    if (kind === 'rotl') arr = rotateWithinMeasures(arr, -1);
    else if (kind === 'rotr') arr = rotateWithinMeasures(arr, 1);
    else if (kind === 'rev') arr = reverseWithinMeasures(arr);
    else if (kind === 'shift') {
      const b = beatLength();
      const shifted = new Array(arr.length).fill(0);
      for (let c = 0; c < arr.length; c++) shifted[(c + b) % arr.length] = arr[c];
      arr = shifted;
    }
    state.tracks[inst.id] = arr;
    renderAll();
  }

  /* ---------------- grooves ---------------- */
  function applyPreset(preset) {
    pushUndo();
    state.timeSigTop = preset.ts[0];
    state.timeSigBottom = preset.ts[1];
    state.division = preset.div;
    state.tempo = preset.tempo;
    state.swing = preset.swing || 0;
    state.measures = 1;
    syncArrays();
    for (const inst of INSTRUMENTS) {
      const pat = preset.tracks[inst.id];
      state.tracks[inst.id] = loadPattern(inst, pat || '', totalColumns());
    }
    state.stickings = new Array(totalColumns()).fill(0);
    renderAll();
  }

  /* ---------------- import MIDI ---------------- */
  function noteToCell(note) {
    if (note === 35 || note === 36) return { inst: 'kick', idx: 1 };
    if (note === 37) return { inst: 'snare', idx: 4 };
    if (note === 38 || note === 39) return { inst: 'snare', idx: 1 };
    if (note === 40) return { inst: 'snare', idx: 7 };
    if (note === 42) return { inst: 'hh', idx: 1 };
    if (note === 44) return { inst: 'kick', idx: 2 };
    if (note === 46) return { inst: 'hh', idx: 2 };
    if (note === 49 || note === 57) return { inst: 'hh', idx: 4 };
    if (note === 51 || note === 59) return { inst: 'hh', idx: 5 };
    if (note === 53) return { inst: 'hh', idx: 6 };
    if (note === 56) return { inst: 'hh', idx: 7 };
    if (note === 41 || note === 43 || note === 45 || note === 47) return { inst: 'tom4', idx: 1 };
    if (note === 48 || note === 50) return { inst: 'tom1', idx: 1 };
    return null;
  }

  function importMidi(arrayBuffer) {
    let parsed;
    try { parsed = MIDI.parse(arrayBuffer); } catch (e) { alert('Could not read MIDI file: ' + e.message); return; }
    if (!parsed.notes.length) { alert('No drum notes found in that MIDI file.'); return; }
    const ppq = parsed.ppq || MIDI.PPQ;
    const tickPerSub = ppq * 4 / state.division;
    const maxTick = parsed.notes[parsed.notes.length - 1].tick;
    const per = subsPerMeasure();
    const needed = Math.min(16, Math.max(1, Math.ceil((maxTick / tickPerSub + 1) / per)));

    pushUndo();
    state.measures = needed;
    syncArrays();
    for (const inst of INSTRUMENTS) state.tracks[inst.id] = new Array(totalColumns()).fill(0);
    state.stickings = new Array(totalColumns()).fill(0);

    for (const n of parsed.notes) {
      const map = noteToCell(n.note);
      if (!map) continue;
      const col = Math.round(n.tick / tickPerSub);
      if (col < 0 || col >= totalColumns()) continue;
      const inst = byId(map.inst);
      let idx = map.idx;
      if (idx === 1) {
        if (n.velocity <= 60) idx = inst.id === 'snare' ? 3 : 1;
        else if (n.velocity >= 118 && inst.id !== 'kick') idx = 2;
      }
      if (state.tracks[inst.id][col] === 0) state.tracks[inst.id][col] = idx;
    }
    renderAll();
  }

  /* ---------------- ABC ---------------- */
  function abcToken(inst, idx) {
    if (!idx) return null;
    const v = inst.variants[idx].toLowerCase();
    if (inst.id === 'kick') return v.indexOf('foot') >= 0 ? 'c' : 'C,';
    if (inst.id === 'snare') {
      if (v.indexOf('cross') >= 0) return '^c';
      if (v.indexOf('rimshot') >= 0) return 'd';
      return 'c';
    }
    if (inst.id === 'hh') {
      if (v.indexOf('open') >= 0) return '^g';
      if (v.indexOf('crash') >= 0) return '^d';
      if (v.indexOf('ride bell') >= 0) return '^b';
      if (v.indexOf('ride') >= 0) return '^a';
      if (v.indexOf('cowbell') >= 0) return '^e';
      return '^f';
    }
    if (inst.id === 'tom1') return 'B,';
    if (inst.id === 'tom4') return 'A,';
    return 'B,';
  }

  function buildAbc() {
    const per = subsPerMeasure();
    let body = '';
    const cols = totalColumns();
    for (let c = 0; c < cols; c++) {
      const tokens = [];
      for (const inst of visibleInstruments()) {
        const t = abcToken(inst, state.tracks[inst.id][c] || 0);
        if (t) tokens.push(t);
      }
      if (tokens.length === 0) body += 'z';
      else if (tokens.length === 1) body += tokens[0];
      else body += '[' + tokens.join('') + ']';
      body += ' ';
      if ((c + 1) % per === 0) body += '| ';
    }
    return 'X:1\nT:' + (state.title || 'Groove') + '\nM:' + state.timeSigTop + '/' + state.timeSigBottom +
      '\nL:1/' + state.division + '\nK:C clef=perc\n' + body.trim();
  }

  /* ---------------- playback ---------------- */
  const player = { playing: false, timer: null, raf: null, startTime: 0, nextTime: 0, col: 0, lastPlayhead: -1 };

  function subDuration() { return (4 * 60 / state.tempo) / state.division; }
  function isTriplet() { return state.division === 12 || state.division === 24 || state.division === 48; }
  function swingOffset(col) {
    if (!state.swing || isTriplet()) return 0;
    return (col % 2 === 1) ? (state.swing / 100) * subDuration() * 0.5 : 0;
  }

  function playColumn(col, t) {
    for (const inst of visibleInstruments()) {
      const idx = state.tracks[inst.id][col] || 0;
      if (!idx) continue;
      const vol = volOf(inst.id) / 100;
      const vels = inst.vels[idx] || [];
      const gain = ((vels[0] || 100) / 122) * vol;
      if (inst.id === 'snare' && idx === 5) { // flam
        AudioEngine.byNote(38, t, gain * 0.6); AudioEngine.byNote(38, t + 0.028, gain);
      } else if (inst.id === 'snare' && idx === 6) { // buzz
        for (let k = 0; k < 4; k++) AudioEngine.byNote(38, t + k * 0.018, gain * 0.5);
      } else {
        const notes = inst.notes[idx] || [];
        for (let i = 0; i < notes.length; i++) AudioEngine.byNote(notes[i], t, ((vels[i] || 100) / 122) * vol);
      }
    }
    if (state.metronome > 0 && state.division >= state.metronome) {
      const step = Math.round(state.division / state.metronome);
      if (col % step === 0) AudioEngine.metronome(state.metronomeSound, t, col % subsPerMeasure() === 0);
    }
  }

  function schedule() {
    while (player.nextTime < AudioEngine.ctx.currentTime + 0.12) {
      const col = player.col % totalColumns();
      playColumn(col, player.nextTime + swingOffset(col));
      player.col++;
      player.nextTime += subDuration();
    }
  }

  function fmtTime(sec) {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updatePlayhead() {
    if (!player.playing) return;
    const elapsed = AudioEngine.ctx.currentTime - player.startTime;
    if (elapsed >= 0) {
      el('timeDisplay').textContent = fmtTime(elapsed);
      const col = Math.floor(elapsed / subDuration()) % totalColumns();
      if (col !== player.lastPlayhead) setPlayhead(col);
    }
    player.raf = requestAnimationFrame(updatePlayhead);
  }

  function setPlayhead(col) {
    document.querySelectorAll('.cell.playing').forEach((c) => c.classList.remove('playing'));
    document.querySelectorAll('.cell[data-col="' + col + '"]').forEach((c) => c.classList.add('playing'));
    player.lastPlayhead = col;
  }

  function startPlayback() {
    AudioEngine.ensure();
    AudioEngine.loadSamples();
    player.playing = true; player.col = 0; player.lastPlayhead = -1;
    player.startTime = AudioEngine.ctx.currentTime + 0.12;
    player.nextTime = player.startTime;
    schedule();
    player.timer = setInterval(schedule, 25);
    player.raf = requestAnimationFrame(updatePlayhead);
    el('playBtn').innerHTML = '&#9632;';
  }

  function stopPlayback() {
    player.playing = false;
    if (player.timer) clearInterval(player.timer);
    if (player.raf) cancelAnimationFrame(player.raf);
    player.timer = null; player.raf = null;
    document.querySelectorAll('.cell.playing').forEach((c) => c.classList.remove('playing'));
    el('playBtn').innerHTML = '&#9654;';
    el('timeDisplay').textContent = '0:00';
  }

  function togglePlayback() { player.playing ? stopPlayback() : startPlayback(); }

  /* ---------------- exports ---------------- */
  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function baseName() { return (state.title || 'groove').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'groove'; }

  // Exported SVG carries the music font so it renders anywhere.
  function svgWithFont() {
    const svg = el('staffTarget').innerHTML;
    const css = window.MUSIC_FONT_CSS;
    if (!css) return svg;
    return svg.replace(/(<svg[^>]*>)/, '$1<defs><style type="text/css">' + css + '</style></defs>');
  }

  function downloadSvg() { download(baseName() + '.svg', new Blob([svgWithFont()], { type: 'image/svg+xml' })); }

  function downloadPng() {
    const svg = svgWithFont();
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = function () {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => download(baseName() + '.png', b), 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('Could not render PNG in this browser. Try SVG.'); };
    img.src = url;
  }

  // Absolute tick for a subdivision column, including swing timing.
  function columnTick(c, tickPerSub) {
    let extra = 0;
    if (state.swing && !isTriplet() && c % 2 === 1) extra = (state.swing / 100) * tickPerSub * 0.5;
    return Math.round(c * tickPerSub + extra);
  }

  function exportMidi() {
    const ppq = MIDI.PPQ;
    const tickPerSub = ppq * 4 / state.division;
    const duration = Math.round(tickPerSub * 0.5);
    const notes = [];
    const cols = totalColumns();
    for (const inst of visibleInstruments()) {
      for (let c = 0; c < cols; c++) {
        const idx = state.tracks[inst.id][c] || 0;
        if (!idx) continue;
        const ns = inst.notes[idx] || [];
        const vs = inst.vels[idx] || [];
        for (let i = 0; i < ns.length; i++) {
          notes.push({ tick: columnTick(c, tickPerSub), note: ns[i], velocity: vs[i] || 100, duration });
        }
      }
    }
    const bytes = MIDI.build({
      tempo: state.tempo,
      ppq,
      timeSigTop: state.timeSigTop,
      timeSigBottom: state.timeSigBottom,
      name: state.title || 'Groove',
      notes,
    });
    download(baseName() + '.mid', new Blob([bytes], { type: 'audio/midi' }));
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    el('playBtn').addEventListener('click', togglePlayback);
    el('undoBtn').addEventListener('click', undo);
    el('clearBtn').addEventListener('click', () => {
      pushUndo();
      for (const inst of INSTRUMENTS) state.tracks[inst.id] = new Array(totalColumns()).fill(0);
      state.stickings = new Array(totalColumns()).fill(0);
      renderAll();
    });
    el('extrasBtn').addEventListener('click', () => { state.showExtras = !state.showExtras; renderAll(); });

    // bars
    el('barPlus').addEventListener('click', () => { pushUndo(); addBar(); });
    el('barMinus').addEventListener('click', () => { pushUndo(); removeBar(); });

    el('tempoRange').addEventListener('input', (e) => { state.tempo = parseInt(e.target.value, 10); el('tempoValue').value = state.tempo; syncUrl(); });
    el('tempoValue').addEventListener('change', (e) => {
      let v = Math.min(300, Math.max(20, parseInt(e.target.value, 10) || 80));
      state.tempo = v; el('tempoRange').value = v; el('tempoValue').value = v; syncUrl();
    });
    el('swingRange').addEventListener('input', (e) => { state.swing = parseInt(e.target.value, 10); el('swingValue').textContent = state.swing + '%'; syncUrl(); });

    el('metToggle').addEventListener('click', () => {
      if (state.metronome > 0) { state.lastMetronome = state.metronome; state.metronome = 0; }
      else { state.metronome = state.lastMetronome || 4; }
      renderControls(); syncUrl();
    });
    document.querySelectorAll('.met-btn[data-met]').forEach((b) => b.addEventListener('click', () => {
      state.metronome = parseInt(b.dataset.met, 10);
      state.lastMetronome = state.metronome;
      renderControls(); syncUrl();
    }));

    // metronome sound selector
    const metSound = el('metSound');
    MET_SOUNDS.forEach((s) => metSound.appendChild(new Option(s.label, s.id)));
    metSound.addEventListener('change', (e) => {
      state.metronomeSound = e.target.value;
      if (state.metronome <= 0) state.metronome = state.lastMetronome || 4;
      renderControls(); syncUrl();
    });

    // metronome volume
    el('metVolume').addEventListener('input', (e) => {
      state.metronomeVolume = parseInt(e.target.value, 10);
      AudioEngine.setMetronomeVolume(state.metronomeVolume / 100);
      el('metVolumeValue').textContent = state.metronomeVolume + '%';
      syncUrl();
    });

    // grid
    const grid = el('gridContainer');
    grid.addEventListener('click', (e) => {
      const sk = e.target.closest('.cell[data-stk]');
      if (sk) {
        pushUndo();
        const c = parseInt(sk.dataset.stk, 10);
        state.stickings[c] = ((state.stickings[c] || 0) + 1) % 5;
        renderGrid(); renderStaff(); syncUrl();
        return;
      }
      const cell = e.target.closest('.cell[data-inst]');
      if (!cell) return;
      pushUndo();
      const inst = byId(cell.dataset.inst);
      const col = parseInt(cell.dataset.col, 10);
      state.tracks[inst.id][col] = state.tracks[inst.id][col] > 0 ? 0 : 1;
      renderStaff(); renderGrid(); syncUrl();
    });
    grid.addEventListener('contextmenu', (e) => {
      const cell = e.target.closest('.cell[data-inst]');
      if (!cell) return;
      e.preventDefault();
      pushUndo();
      const inst = byId(cell.dataset.inst);
      const col = parseInt(cell.dataset.col, 10);
      state.tracks[inst.id][col] = ((state.tracks[inst.id][col] || 0) + 1) % inst.variants.length;
      renderStaff(); renderGrid(); syncUrl();
    });

    el('tuneTitle').addEventListener('input', (e) => { state.title = e.target.value; syncUrl(); });
    el('tuneAuthor').addEventListener('input', (e) => { state.author = e.target.value; syncUrl(); });
    el('tuneComment').addEventListener('input', (e) => { state.comment = e.target.value; syncUrl(); });

    // time signature modal
    const tsTop = el('tsTop'), tsBottom = el('tsBottom');
    for (let i = 2; i <= 15; i++) tsTop.appendChild(new Option(String(i), String(i)));
    [4, 8, 16].forEach((b) => tsBottom.appendChild(new Option(String(b), String(b))));
    el('timeSigBtn').addEventListener('click', () => { tsTop.value = String(state.timeSigTop); tsBottom.value = String(state.timeSigBottom); el('timeSigModal').hidden = false; });
    el('tsCancel').addEventListener('click', () => { el('timeSigModal').hidden = true; });
    el('tsOk').addEventListener('click', () => { pushUndo(); changeTimeSig(parseInt(tsTop.value, 10), parseInt(tsBottom.value, 10)); el('timeSigModal').hidden = true; });

    // menus
    function bindMenu(btnId, menuId) {
      el(btnId).addEventListener('click', (e) => { e.stopPropagation(); const m = el(menuId); const open = m.hidden; closeMenus(); m.hidden = !open; });
    }
    function closeMenus() { document.querySelectorAll('.menu').forEach((m) => { m.hidden = true; }); }
    bindMenu('downloadBtn', 'downloadMenu');
    bindMenu('stickingsBtn', 'stickingsMenu');
    document.addEventListener('click', closeMenus);

    el('downloadMenu').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-dl]');
      if (!b) return;
      closeMenus();
      if (b.dataset.dl === 'svg') downloadSvg();
      else if (b.dataset.dl === 'png') downloadPng();
    });

    el('stickingsMenu').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-stk]');
      if (!b) return;
      closeMenus();
      const act = b.dataset.stk;
      if (act === 'toggle') { state.showStickings = !state.showStickings; }
      else {
        if (!state.showStickings) state.showStickings = true;
        pushUndo();
        const cols = totalColumns();
        if (act === 'clear') state.stickings = new Array(cols).fill(0);
        else if (act === 'right') state.stickings = new Array(cols).fill(1);
        else if (act === 'left') state.stickings = new Array(cols).fill(2);
        else if (act === 'count') state.stickings = new Array(cols).fill(4);
        else if (act === 'alternate') {
          const bl = beatLength();
          state.stickings = state.stickings.map((v, c) => (Math.floor(c / bl) % 2 === 0 ? 1 : 2));
        }
      }
      renderAll();
    });

    // import MIDI
    el('importFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => importMidi(reader.result);
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    });

    // grooves
    const gList = el('grooveList');
    let lastGroup = null;
    PRESETS.forEach((p) => {
      if (p.group && p.group !== lastGroup) {
        const h = document.createElement('div');
        h.className = 'preset-group';
        h.textContent = p.group;
        gList.appendChild(h);
        lastGroup = p.group;
      }
      const b = document.createElement('button');
      b.textContent = p.name;
      b.addEventListener('click', () => { applyPreset(p); el('groovesModal').hidden = true; });
      gList.appendChild(b);
    });
    el('groovesBtn').addEventListener('click', () => { el('groovesModal').hidden = false; });
    el('groovesClose').addEventListener('click', () => { el('groovesModal').hidden = true; });

    // permutations
    el('permBtn').addEventListener('click', () => { el('permModal').hidden = false; });
    el('permClose').addEventListener('click', () => { el('permModal').hidden = true; });
    document.querySelectorAll('.perm-buttons button').forEach((b) => b.addEventListener('click', () => permute(b.dataset.perm)));

    // ABC
    el('abcBtn').addEventListener('click', () => { el('abcSource').value = buildAbc(); el('abcModal').hidden = false; });
    el('abcClose').addEventListener('click', () => { el('abcModal').hidden = true; });

    // share
    el('shareBtn').addEventListener('click', () => { el('shareUrl').value = location.href; el('shareModal').hidden = false; });
    el('shareClose').addEventListener('click', () => { el('shareModal').hidden = true; });
    el('copyShare').addEventListener('click', () => {
      const input = el('shareUrl'); input.select();
      if (navigator.clipboard) navigator.clipboard.writeText(input.value).catch(() => {});
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
    });

    el('exportMidiBtn').addEventListener('click', exportMidi);
    el('printBtn').addEventListener('click', () => window.print());
    el('helpBtn').addEventListener('click', () => { el('helpModal').hidden = false; });
    el('helpClose').addEventListener('click', () => { el('helpModal').hidden = true; });

    // bright / dark mode
    el('themeBtn').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      renderControls();
      renderStaff();
      syncUrl();
    });
    // staff always prints / exports on white paper
    window.addEventListener('beforeprint', () => renderStaff({ paper: '#ffffff', ink: '#14161a' }));
    window.addEventListener('afterprint', () => renderStaff());

    document.querySelectorAll('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; }));

    // Preload the real drum samples on the first user gesture.
    const preloadSamples = () => { AudioEngine.ensure(); AudioEngine.loadSamples(); };
    document.addEventListener('pointerdown', preloadSamples, { once: true });
    document.addEventListener('keydown', preloadSamples, { once: true });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'select' || tag === 'textarea';
      if (e.code === 'Space' && !typing) { e.preventDefault(); togglePlayback(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });
  }

  function init() {
    applyQuery();
    if (!new URLSearchParams(location.search).get('Theme')) {
      try {
        const saved = localStorage.getItem('dge-theme');
        if (saved === 'light' || saved === 'dark') state.theme = saved;
      } catch (e) { /* ignore */ }
    }
    document.documentElement.dataset.theme = state.theme;
    injectFont();
    AudioEngine.setMetronomeVolume(state.metronomeVolume / 100);
    wire();
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
