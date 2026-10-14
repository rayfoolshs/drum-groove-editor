# Drum Groove Editor

A static drum-groove notation and playback tool. It is an original
("clean-room") rebuild of the idea behind Groove Scribe (mikeslessons.com/groove):
no framework, no CDN, and no build step needed to run it — just open the file.

It bundles two third-party assets, each embedded as a data URI: the **Petaluma**
notation font and a **General MIDI drum bank** from FluidR3 (see *Fonts* and
*Drum sounds* below).

## Run it

Just open `index.html` in a browser. Everything is local (plain HTML/CSS/JS +
Web Audio).

Optional: serve the folder if you prefer a URL, e.g.

```sh
npx serve .
```

## Package / build

Regenerate the distributable artifacts with one command (Node, no dependencies):

```sh
node build.js
```

This writes, next to this folder:

- `drum-groove-editor-standalone.html` — one self-contained file (CSS and all JS inlined);
- `drum-groove-editor.zip` — the archive of this folder's files.

`build.js` is excluded from the zip itself.

## Features

**Appearance**
- Bright / dark mode toggle in the header (remembered per browser, and settable
  with a `Theme` URL parameter). The staff follows the theme on screen and always
  prints on white paper.

**Notation**
- Drum staff rendered as SVG: Hi-hat `x`, Snare, Kick, three Toms, Ride (with
  Bell) and Crash, with stems, beams, flags, accents, ghost notes, flams, buzz
  rolls, rimshots, cross-sticks, open hi-hat, hi-hat foot and ledger lines for
  the cymbals.
- Sticking lanes: R, L, R/L, and counts (1 e & a …), shown above the staff.

**Editing**
- Click a dot to add/remove a note; right-click to cycle its type.
- **Per-part volume**: each row has its own volume slider (hi-hat, snare, kick,
  and every other part).
- **More drums** toggle reveals the extra parts: Tom 1 (High), Tom 2 (Mid),
  Tom 3 (Floor), Ride (with Bell), Crash and Cowbell.
- Time signature (2/4 … 15/8), subdivisions (1/8, 1/16, 1/32, 1/8T, 1/16T, mixed).
- **Bars**: use **+** / **−** next to BARS to add or remove bars (1–16).
- Undo (button or `Ctrl+Z`).

**Transport**
- Web Audio playback for all voices, adjustable BPM and swing. Spacebar toggles playback.
- Metronome with its own **ON/OFF** toggle, a pulse of 4th/8th/16th, a selectable
  **sound** (Click, Beep, Bell, Woodblock, Cowbell, Rim, Hat), and its own
  independent **volume** slider.

**Tools**
- **Permutations**: rotate / reverse / shift a voice's pattern within each bar.
- **Grooves**: a grouped preset library across genres — Rock/Pop, Blues/Jazz
  (swing, shuffle), Funk/Soul (funk, Motown, Afrobeat), Latin (bossa nova, samba,
  cha-cha, baião), Caribbean (reggae one-drop, calypso, second line), Metal and
  other metres (waltz).
- **Stickings** menu: show/hide the lane, alternate R/L, all R, all L, counts, clear.
- **Import MIDI**: map a `.mid` file's drum notes onto the grid (quantised to the
  current subdivision), with velocity mapped to accents/ghosts.
- **ABC**: view the groove in ABC notation.
- **Export MIDI**: writes a Standard MIDI File (type 1) of the whole groove —
  drums on MIDI channel 10, with tempo, time signature, track names, the current
  swing timing applied to off-beats, and velocity mapped from the note types.
  **Import MIDI** maps a `.mid` back onto the grid.
- **Download** SVG / PNG, **Print**, and **Share** a URL that encodes the whole groove.

## Parts

| Part | Shown by default | General MIDI note(s) |
| ---- | ---------------- | -------------------- |
| Hi-hat | yes | 42 closed, 46 open |
| Snare | yes | 38 normal, 37 cross-stick, 40 rimshot |
| Kick | yes | 36, 44 (hi-hat foot) |
| Tom 1 (High) | More drums | 50 |
| Tom 2 (Mid) | More drums | 47 |
| Tom 3 (Floor) | More drums | 41 |
| Ride | More drums | 51, 53 (bell) |
| Crash | More drums | 49 |
| Cowbell | More drums | 56 |

## URL parameters

The share URL uses the same parameter names as the original link, so an existing
Groove Scribe link loads here too:

```
index.html?TimeSig=4/4&Div=8&Tempo=80&Measures=1&H=|--------|&S=|--------|&K=|o-oo--oo|
```

| Param      | Meaning                                  |
| ---------- | ---------------------------------------- |
| `TimeSig`  | e.g. `4/4`                               |
| `Div`      | subdivisions per whole note: 8, 16, 32, 12, 24, 48 |
| `Tempo`    | BPM                                      |
| `Measures` | number of bars                          |
| `H`,`S`,`K` | Hi-hat / Snare / Kick patterns (see encoding below) |
| `T1`,`T2`,`T3` | Tom 1 (High) / Tom 2 (Mid) / Tom 3 (Floor) patterns |
| `C`,`R`,`B` | Crash / Ride / Cowbell patterns |
| `Extras` | `1` shows the Toms, Ride, Crash and Cowbell parts |
| `Mix` | per-part volume overrides, e.g. `hh:70,ride:60` (0–100, default 100) |
| `Met` | metronome pulse: `4`, `8`, or `16` (absent = off) |
| `MetSound` | metronome tone: `click`,`beep`,`bell`,`woodblock`,`cowbell`,`rim`,`hat` |
| `MetVol` | metronome volume `0`–`100` (default 70) |
| `Swing` | swing amount `0`–`100` |
| `Title`,`Author`,`Comment` | free text |
| `Stk`,`Stick` | sticking lane (`R`,`L`,`B`=both,`C`=count,`-`) |
| `Theme` | `light` for bright mode (absent = dark) |

A pattern is one character per subdivision: `o` = hit, `-` = rest, and a
trailing `|` marks each bar. Extra note types use letters, per part, so
round-tripping is lossless:

| Part | Characters |
| ---- | ---------- |
| Hi-hat | `o` closed, `p` open, `a` accent |
| Snare | `o` normal, `a` accent, `g` ghost, `c` cross-stick, `f` flam, `z` buzz, `m` rimshot |
| Kick | `o` normal, `f` hi-hat foot, `j` kick + hi-hat foot |
| Toms, Crash | `o` normal, `a` accent |
| Ride | `o` ride, `b` bell, `a` accent |
| Cowbell | `o` normal |

## Fonts

Noteheads and the time signature are drawn with **Petaluma**, a hand-drawn
(jazz-styled) SMuFL music font, subsetted to just the glyphs used and embedded
as a data URI in `petaluma.js` (about 5 KB of font data). Exported SVG/PNG files
embed the same subset so they render identically anywhere.

Petaluma is © Robert Piéchaud and licensed under the SIL Open Font License 1.1.
The full licence is in `Petaluma-OFL.txt`.

## Drum sounds

Playback uses the **General MIDI drum bank** from the FluidR3 GM soundfont
(the FluidR3Mono_GM2 rendering), embedded as MP3 data URIs in `samples.js` and
decoded on the first user gesture. Each GM drum note maps to its soundfont
sample; a note without a sample falls back to the built-in Web Audio synth, and
the metronome is always synthesised.

FluidR3 is © Frank Wen, licensed under the MIT licence; see
`GM-DrumBank-CREDITS.txt`.

## Notes

Groove Scribe itself is GPL-2.0 (© Lou Montulli, Mike Johnston). This project
shares no code with it; it is a from-scratch reimplementation of the concept.
"Groove Scribe" is not used as this project's name.
