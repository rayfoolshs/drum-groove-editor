/* Drum Groove Editor - custom SVG drum-staff renderer (original implementation).
   Noteheads and the time signature are drawn with the Petaluma (SMuFL) music font,
   which is embedded as a data URI by petaluma.js. */
(function (global) {
  'use strict';

  const GAP = 10;      // staff space, in px
  const TOP = 78;      // y of the top staff line
  const COLW = 38;     // width of one subdivision column
  const LEFT = 78;     // x where the first column centre sits
  const STEM_LEN = 3.1 * GAP;
  const STICK_Y = TOP - 5.0 * GAP;
  const SZ = 4 * GAP;  // SMuFL: 1 em = 4 staff spaces

  const BEAMS = { 4: 0, 8: 1, 16: 2, 32: 3, 12: 1, 24: 2, 48: 3 };

  // SMuFL codepoints (font-independent).
  const GLYPH = { normal: '\uE0A4', x: '\uE0A9', diamond: '\uE0DB', triangle: '\uE0BE' };
  const FONT = (global && global.MUSIC_FONT_FAMILY) || 'Petaluma';
  const TS_SIZE = 21;  // Petaluma's time-signature digits are large, so they use their own size

  let INK = '#14161a';

  function yForPos(p) { return TOP + (8 - p) * GAP / 2; }

  // Draw a music glyph with its vertical centre at cy and horizontal centre at cx.
  // SMuFL noteheads have their origin at the left edge and vertical centre, so a
  // centred <text> with the baseline at cy is correct.
  function glyph(cp, cx, cy, size) {
    return `<text x="${cx}" y="${cy}" font-size="${size || SZ}" text-anchor="middle" font-family="${FONT}" fill="${INK}">${cp}</text>`;
  }

  function tsString(n) {
    return String(n).split('').map((d) => String.fromCodePoint(0xE080 + parseInt(d, 10))).join('');
  }

  function notehead(kind, x, y) { return glyph(GLYPH[kind] || GLYPH.normal, x, y); }

  function accentMark(x, y) {
    return `<path d="M ${x - 6} ${y - 6} L ${x + 6} ${y - 6} L ${x} ${y + 1}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
  }
  function ghostMarks(x, y) {
    return `<path d="M ${x - 9} ${y - 3} q -3 3 0 6" fill="none" stroke="${INK}" stroke-width="1.2"/>`
      + `<path d="M ${x + 9} ${y - 3} q 3 3 0 6" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  }
  function openCircle(x, y) {
    return `<circle cx="${x}" cy="${y - 9}" r="2.6" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
  }
  function dot(x, y) { return `<circle cx="${x}" cy="${y}" r="2.2" fill="${INK}"/>`; }
  function rimshotMark(x, y) {
    return `<rect x="${x - 3.2}" y="${y - 13}" width="6.4" height="6.4" fill="${INK}"/>`;
  }
  function buzzMarks(x, y) {
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += `<line x1="${x - 3}" y1="${y - 9 - i * 3}" x2="${x + 3}" y2="${y - 12 - i * 3}" stroke="${INK}" stroke-width="1.2"/>`;
    }
    return s;
  }
  function graceNote(x, y) {
    return glyph(GLYPH.normal, x - 11, y - 3, 22)
      + `<line x1="${x - 6}" y1="${y - 3}" x2="${x - 6}" y2="${y - 13}" stroke="${INK}" stroke-width="1.2"/>`;
  }
  function flag(x, y) {
    return `<path d="M ${x} ${y} q 7 5 2 16" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  }

  function headKind(inst, idx) {
    if (inst.id === 'hh') return 'x';
    if (inst.id === 'crash') return 'x';
    if (inst.id === 'ride') return idx === 2 ? 'diamond' : 'x';
    if (inst.id === 'cowbell') return 'triangle';
    if (inst.id === 'snare') return idx === 4 ? 'x' : 'normal';
    if (inst.id === 'kick') return idx === 2 ? 'x' : 'normal';
    return 'normal';
  }

  function decoration(inst, idx, x, y) {
    let s = '';
    if (inst.id === 'hh') {
      if (idx === 2) s += openCircle(x, y);
      else if (idx === 3) s += accentMark(x, y);
    } else if (inst.id === 'snare') {
      if (idx === 2) s += accentMark(x, y);
      else if (idx === 3) s += ghostMarks(x, y);
      else if (idx === 5) s += graceNote(x, y);
      else if (idx === 6) s += buzzMarks(x, y);
      else if (idx === 7) s += rimshotMark(x, y);
    } else if (inst.id === 'kick') {
      if (idx === 3) s += glyph(GLYPH.x, x, y - 10);
    } else if (inst.id === 'ride') {
      if (idx === 2) s += dot(x, y - 10);
      else if (idx === 3) s += accentMark(x, y);
    } else if (inst.id === 'crash') {
      if (idx === 2) s += accentMark(x, y);
    } else if (inst.id.indexOf('tom') === 0) {
      if (idx === 2) s += accentMark(x, y);
    }
    return s;
  }

  function render(state, instruments, colors) {
    const c = colors || {};
    INK = c.ink || '#14161a';
    const paper = c.paper || '#fbfbf8';

    const subsPerMeasure = Math.max(1, Math.round(state.timeSigTop / state.timeSigBottom * state.division));
    const totalColumns = subsPerMeasure * state.measures;
    const beams = BEAMS[state.division] == null ? 1 : BEAMS[state.division];

    let subsPerBeat;
    if (state.timeSigBottom === 8 && state.timeSigTop % 3 === 0) {
      subsPerBeat = Math.max(1, Math.round(3 * state.division / 8));
    } else {
      subsPerBeat = Math.max(1, Math.round(state.division / 4));
    }

    const width = LEFT + totalColumns * COLW + 12;
    const bottomLine = TOP + 4 * GAP;
    const height = bottomLine + 58;
    const xCol = (cx) => LEFT + cx * COLW;

    const p = [];
    p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, Helvetica, Arial, sans-serif">`);
    p.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="${paper}"/>`);

    for (let i = 0; i < 5; i++) {
      const y = TOP + i * GAP;
      p.push(`<line x1="8" y1="${y}" x2="${width - 8}" y2="${y}" stroke="${INK}" stroke-width="1"/>`);
    }

    // left barline closes the first measure
    p.push(`<line x1="8" y1="${TOP}" x2="8" y2="${bottomLine}" stroke="${INK}" stroke-width="1.5"/>`);

    // time signature (origin is the digit's vertical centre)
    p.push(glyph(tsString(state.timeSigTop), 35, TOP + GAP, TS_SIZE));
    p.push(glyph(tsString(state.timeSigBottom), 35, TOP + 3 * GAP, TS_SIZE));

    for (let m = 1; m <= state.measures; m++) {
      const x = xCol(m * subsPerMeasure) - COLW / 2;
      if (m === state.measures) {
        p.push(`<line x1="${x}" y1="${TOP}" x2="${x}" y2="${bottomLine}" stroke="${INK}" stroke-width="3"/>`);
        p.push(`<line x1="${x - 5}" y1="${TOP}" x2="${x - 5}" y2="${bottomLine}" stroke="${INK}" stroke-width="1"/>`);
      } else {
        p.push(`<line x1="${x}" y1="${TOP}" x2="${x}" y2="${bottomLine}" stroke="${INK}" stroke-width="1"/>`);
      }
    }

    const columnNotes = [];
    for (let cx = 0; cx < totalColumns; cx++) {
      const list = [];
      for (const inst of instruments) {
        const idx = (state.tracks[inst.id] && state.tracks[inst.id][cx]) || 0;
        if (idx > 0) list.push({ inst, idx });
      }
      columnNotes.push(list);
    }

    for (let cx = 0; cx < totalColumns; cx++) {
      const x = xCol(cx);
      for (const n of columnNotes[cx]) {
        const y = yForPos(n.inst.pos);
        for (let lp = 10; lp <= n.inst.pos; lp += 2) {   // ledger lines above the staff
          const ly = yForPos(lp);
          p.push(`<line x1="${x - 9}" y1="${ly}" x2="${x + 9}" y2="${ly}" stroke="${INK}" stroke-width="1"/>`);
        }
        p.push(notehead(headKind(n.inst, n.idx), x, y));
        p.push(decoration(n.inst, n.idx, x, y));
      }
    }

    for (let start = 0; start < totalColumns; start += subsPerBeat) {
      const end = Math.min(start + subsPerBeat, totalColumns);
      const cols = [];
      for (let cx = start; cx < end; cx++) if (columnNotes[cx].length) cols.push(cx);
      if (!cols.length) continue;

      let groupTop = Infinity;
      for (const cx of cols) for (const n of columnNotes[cx]) groupTop = Math.min(groupTop, yForPos(n.inst.pos));
      let stemTop = groupTop - STEM_LEN;
      const ceiling = TOP - 3.2 * GAP;
      if (stemTop > ceiling) stemTop = ceiling;

      const beamed = beams > 0 && cols.length >= 2;
      for (const cx of cols) {
        const x = xCol(cx) + 5.7;
        let low = -Infinity;
        for (const n of columnNotes[cx]) low = Math.max(low, yForPos(n.inst.pos));
        if (beamed) {
          p.push(`<line x1="${x}" y1="${low - 1}" x2="${x}" y2="${stemTop}" stroke="${INK}" stroke-width="1.6"/>`);
        } else if (beams > 0) {
          const top = Math.min.apply(null, columnNotes[cx].map((n) => yForPos(n.inst.pos))) - STEM_LEN;
          p.push(`<line x1="${x}" y1="${low - 1}" x2="${x}" y2="${top}" stroke="${INK}" stroke-width="1.6"/>`);
          for (let b = 0; b < beams; b++) p.push(flag(x, top + b * 5.2));
        }
      }

      if (beamed) {
        const xFirst = xCol(cols[0]) + 5.7;
        const xLast = xCol(cols[cols.length - 1]) + 5.7;
        for (let b = 0; b < beams; b++) {
          const y = stemTop + b * 5.2;
          p.push(`<rect x="${xFirst}" y="${y}" width="${xLast - xFirst}" height="3.2" fill="${INK}"/>`);
        }
      }
    }

    if (state.showStickings && state.stickings) {
      for (let cx = 0; cx < totalColumns; cx++) {
        const code = state.stickings[cx] || 0;
        if (!code) continue;
        const label = code === 1 ? 'R' : code === 2 ? 'L' : code === 3 ? 'R/L' : countLabel(state, cx);
        p.push(`<text x="${xCol(cx)}" y="${STICK_Y}" font-size="11" font-weight="600" text-anchor="middle" fill="${INK}">${label}</text>`);
      }
    }

    p.push('</svg>');
    return p.join('');
  }

  function countLabel(state, col) {
    let spb;
    if (state.timeSigBottom === 8 && state.timeSigTop % 3 === 0) spb = Math.max(1, Math.round(3 * state.division / 8));
    else spb = Math.max(1, Math.round(state.division / 4));
    const beat = (Math.floor(col / spb) % state.timeSigTop) + 1;
    const s = col % spb;
    const table = { 1: [''], 2: ['', '&'], 3: ['', 'trip', 'let'], 4: ['', 'e', '&', 'a'], 6: ['', 'ta', 'ta', 'ta', 'ta', 'ta'], 8: ['', 'e', '&', 'a', '', 'e', '&', 'a'] };
    const suf = (table[spb] || [''])[s] || '';
    return beat + suf;
  }

  global.Staff = { render, countLabel };
})(window);
