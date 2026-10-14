/* Drum Groove Editor - Standard MIDI File writer + reader (original implementation) */
(function (global) {
  'use strict';

  function vlq(n) {
    // Variable-length quantity: 7 bits per byte, continuation bit on every byte
    // except the last (most significant group first).
    const groups = [n & 0x7f];
    n >>= 7;
    while (n > 0) {
      groups.unshift((n & 0x7f) | 0x80);
      n >>= 7;
    }
    return groups;
  }

  function metaText(text) {
    const bytes = [];
    for (let i = 0; i < text.length; i++) bytes.push(text.charCodeAt(i) & 0x7f);
    const len = bytes.length;
    return { tick: 0, order: -10, data: [0xff, 0x03, len].concat(bytes) };
  }

  function header(nTracks, ppq) {
    // "MThd", length 6, format 1, nTracks, division
    return [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, nTracks, (ppq >> 8) & 0xff, ppq & 0xff];
  }

  function track(events) {
    events.sort((a, b) => (a.tick - b.tick) || ((a.order || 0) - (b.order || 0)));
    const bytes = [];
    let last = 0;
    for (const ev of events) {
      bytes.push.apply(bytes, vlq(ev.tick - last));
      bytes.push.apply(bytes, ev.data);
      last = ev.tick;
    }
    bytes.push(0, 0xff, 0x2f, 0x00);
    const len = bytes.length;
    return [0x4d, 0x54, 0x72, 0x6b,
      (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff].concat(bytes);
  }

  function readVlq(bytes, pos) {
    let value = 0;
    while (pos < bytes.length) {
      const b = bytes[pos++];
      value = (value << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return { value, pos };
  }

  const MIDI = {
    PPQ: 480,

    // opts: { tempo, ppq?, timeSigTop?, timeSigBottom?, name?, notes:[{tick,note,velocity,duration}] }
    build(opts) {
      const ppq = opts.ppq || this.PPQ;
      const usPerQuarter = Math.round(60000000 / opts.tempo);
      const tsTop = opts.timeSigTop || 4;
      const tsBottom = opts.timeSigBottom || 4;
      const denPow = Math.max(0, Math.round(Math.log(tsBottom) / Math.LN2));

      const tempoTrack = [
        metaText(opts.name || 'Groove'),
        { tick: 0, order: -9, data: [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff] },
        { tick: 0, order: -8, data: [0xff, 0x58, 0x04, tsTop & 0xff, denPow & 0xff, 24, 8] },
      ];

      const noteTrack = [ metaText('Drums') ];
      const seq = opts.notes.slice().sort((a, b) => a.tick - b.tick);
      for (const n of seq) {
        // drums on MIDI channel 10 -> status 0x99 / 0x89
        noteTrack.push({ tick: n.tick, order: 0, data: [0x99, n.note & 0x7f, n.velocity & 0x7f] });
        noteTrack.push({ tick: n.tick + Math.max(20, n.duration | 0), order: -1, data: [0x89, n.note & 0x7f, 0] });
      }

      const bytes = [].concat(header(2, ppq)).concat(track(tempoTrack)).concat(track(noteTrack));
      return new Uint8Array(bytes);
    },

    // Returns { ppq, format, ntrks, notes: [{ tick, note, velocity }] } merged from all tracks.
    parse(arrayBuffer) {
      const bytes = new Uint8Array(arrayBuffer);
      let pos = 0;
      const readStr = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(bytes[pos++]); return s; };
      const u32 = () => { const v = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3]; pos += 4; return v >>> 0; };
      const u16 = () => { const v = (bytes[pos] << 8) | bytes[pos + 1]; pos += 2; return v; };

      if (readStr(4) !== 'MThd') throw new Error('Not a MIDI file');
      const hlen = u32();
      const format = u16();
      const ntrks = u16();
      const division = u16();
      pos += hlen - 6;
      const ppq = (division & 0x8000) ? 480 : division;

      const notes = [];
      for (let tr = 0; tr < ntrks && pos < bytes.length; tr++) {
        if (readStr(4) !== 'MTrk') break;
        const len = u32();
        const end = pos + len;
        let tick = 0;
        let running = 0;
        while (pos < end) {
          const d = readVlq(bytes, pos); tick += d.value; pos = d.pos;
          let status = bytes[pos];
          if (status & 0x80) { pos++; running = status; } else { status = running; }
          const type = status & 0xf0;
          if (status === 0xff) {
            pos++;
            const l = readVlq(bytes, pos); pos = l.pos; pos += l.value;
          } else if (status === 0xf0 || status === 0xf7) {
            const l = readVlq(bytes, pos); pos = l.pos; pos += l.value;
          } else if (type === 0x90 || type === 0x80) {
            const note = bytes[pos++];
            const vel = bytes[pos++];
            if (type === 0x90 && vel > 0) notes.push({ tick, note, velocity: vel });
          } else {
            pos += 2;
          }
        }
        pos = end;
      }
      notes.sort((a, b) => a.tick - b.tick);
      return { ppq, notes, format, ntrks };
    },
  };

  global.MIDI = MIDI;
})(window);
