#!/usr/bin/env node
/*
 * Build script for Drum Groove Editor.
 *
 *   node build.js
 *
 * Regenerates, next to this folder:
 *   ../drum-groove-editor-standalone.html   one self-contained file (CSS + JS inlined)
 *   ../drum-groove-editor.zip               the distributable archive
 *
 * No dependencies; the ZIP is written directly with Node's zlib.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = __dirname;
const PARENT = path.resolve(ROOT, '..');
const FOLDER = path.basename(ROOT);
const STANDALONE = path.join(PARENT, FOLDER + '-standalone.html');
const ZIP = path.join(PARENT, FOLDER + '.zip');

// Files not packed into the archive (dev/build helpers).
const EXCLUDE = new Set(['build.js']);

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------------- single-file HTML ---------------- */
function buildStandalone() {
  let html = read('index.html');
  html = html.replace(/<link rel="stylesheet" href="styles\.css" \/>/,
    () => '<style>\n' + read('styles.css') + '\n</style>');
  html = html.replace(/<script src="([^"]+)"><\/script>/g,
    (m, f) => '<script>\n' + read(f) + '\n</script>');
  fs.writeFileSync(STANDALONE, html);
  return { file: STANDALONE, bytes: Buffer.byteLength(html) };
}

/* ---------------- zip writer ---------------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d) {
  return {
    time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
    date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31),
  };
}

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.startsWith('.') || EXCLUDE.has(name)) continue;
    const full = path.join(dir, name);
    const rel = base ? base + '/' + name : name;
    if (fs.statSync(full).isDirectory()) walk(full, rel, out);
    else out.push({ full, rel });
  }
}

function buildZip() {
  const files = [];
  walk(ROOT, FOLDER, files);
  const { time, date } = dosDateTime(new Date());

  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const data = fs.readFileSync(f.full);
    const crc = crc32(data);
    const comp = zlib.deflateRawSync(data, { level: 9 });
    const nameBuf = Buffer.from(f.rel, 'utf8');

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);        // version needed
    lh.writeUInt16LE(0, 6);         // flags
    lh.writeUInt16LE(8, 8);         // deflate
    lh.writeUInt16LE(time, 10);
    lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    parts.push(lh, nameBuf, comp);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);        // version made by
    ch.writeUInt16LE(20, 6);        // version needed
    ch.writeUInt16LE(0, 8);
    ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(time, 12);
    ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt16LE(0, 30);        // extra len
    ch.writeUInt16LE(0, 32);        // comment len
    ch.writeUInt16LE(0, 34);        // disk start
    ch.writeUInt16LE(0, 36);        // internal attrs
    ch.writeUInt32LE(0, 38);        // external attrs
    ch.writeUInt32LE(offset, 42);   // local header offset
    central.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + comp.length;
  }

  const cd = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  const zip = Buffer.concat([...parts, cd, eocd]);
  fs.writeFileSync(ZIP, zip);
  return { file: ZIP, bytes: zip.length, entries: files.map((f) => f.rel) };
}

/* ---------------- run ---------------- */
const s = buildStandalone();
const z = buildZip();
console.log('standalone: ' + s.file + '  (' + s.bytes + ' bytes)');
console.log('zip:        ' + z.file + '  (' + z.bytes + ' bytes, ' + z.entries.length + ' files)');
z.entries.forEach((e) => console.log('   ' + e));
