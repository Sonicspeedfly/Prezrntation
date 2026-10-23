/* ============================================================
   TERMINAL: SHATTERED — subtitle timing from a script + its audio
   ------------------------------------------------------------
       node voice/cues.js              every locale with a script
       node voice/cues.js tj           one locale
       node voice/cues.js ru --debug   show how each boundary was chosen

   Reads voice/scripts/<locale>.txt, finds the matching recording,
   and writes js/presentation/14-jury-cues.js — the timed subtitles
   the jury intro types out while the audio plays.

   No speech recogniser is involved, so the text is never guessed:
   it is the script, word for word. Only the timing comes from the
   audio, in two passes.

   1. Who is speaking. The order of speakers is known from the script;
      what is not known is the moment Neikon hands over to Alice. For
      each hand-over the tool looks near where the script's character
      count predicts it, prefers a real pause, and scores each candidate
      by how the pitch moves across it — Egor sits near 130 Hz, Milly
      near 210 Hz — plus a voicing term, because Alice whispers in the
      first and last acts and a whisper has no pitch at all. Pitch alone
      is not enough: Egor's ironic delivery climbs past 200 Hz, which is
      why a fixed threshold mislabels whole stretches of act 2.

   2. Where each sentence starts inside a speaker's turn: spread by
      character count over that turn's speech time (pauses excluded),
      then snapped to the nearest real speech onset within 0.6 s.

   Needs ffmpeg on PATH to decode audio.

   Audio per locale: the studio take for that language if there is
   one, otherwise — for ru only — the master in assets/audio/ru/. A
   translated script with no recording yet is skipped on purpose: the
   intro then plays Russian audio, and showing translated subtitles
   over Russian speech would be worse than Russian subtitles.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const lib = require("./lib");

const ROOT = lib.ROOT;
const OUT = path.join(ROOT, "js", "presentation", "14-jury-cues.js");
const SCRIPTS = path.join(ROOT, "voice", "scripts");
const MASTERS = path.join(ROOT, "assets", "audio", "ru");

const args = process.argv.slice(2);
const DEBUG = args.includes("--debug");
const ONLY = args.find(a => lib.LOCALES.includes(a)) || null;

const SR = 16000, FRAME = 480, HOP = 320;              // 30 ms window, 20 ms hop
const STEP = HOP / SR;
const MINLAG = Math.floor(SR / 400), MAXLAG = Math.floor(SR / 70);
const SILENCE_DB = -38;

/* ---- script --------------------------------------------------------- */

const SPEAKER = {
    "НЕЙКОН": "neikon", "NEIKON": "neikon",
    "ЭЛИС": "alice", "ELIS": "alice", "ALICE": "alice"
};

function parseScript(src) {
    const out = {};
    let cur = null;
    src.split(/\r?\n/).forEach(raw => {
        const line = raw.trim();
        if (!line || line.startsWith("#") && !line.startsWith("##")) return;
        const h = /^##\s*([a-z0-9_.\-]+)\s*$/i.exec(line);
        if (h) { cur = out[h[1]] = []; return; }
        const m = /^([^:]{2,24}):\s*(.+)$/.exec(line);
        if (!m || !cur) return;
        const who = SPEAKER[m[1].trim().toUpperCase()];
        if (!who) throw new Error("неизвестный говорящий «" + m[1] + "» — нужно НЕЙКОН или ЭЛИС");
        const text = clean(m[2]);
        if (text) cur.push({ who, text, sentences: sentences(text) });
    });
    return out;
}

/* (tags) are ElevenLabs delivery cues, not words */
function clean(s) {
    return s.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").replace(/\s+([,.!?…])/g, "$1").trim();
}

/* Break after . ! ? … only when the next word starts a new sentence, so
   "Нейкон... взгляни" stays whole and "из зала... Это" splits. */
function sentences(text) {
    const parts = text.split(/(?<=[.!?…])\s+(?=[A-ZА-ЯЁӢӮҒҚҲҶ«"„])/u);
    return parts.map(s => s.trim()).filter(Boolean);
}

/* ---- audio ------------------------------------------------------------- */

function audioFor(loc, id) {
    const takes = lib.scanTakes()[loc] || {};
    if (takes[id]) return path.join(lib.FILES.takes, loc, takes[id].file);
    if (loc === "ru") {
        /* the 64 kbps copy is what the deck plays; the master is the same
           take, so either times the same — prefer what the room will hear */
        for (const m of [path.join(MASTERS, id + ".mp3"), path.join(MASTERS, "masters", id + ".mp3")])
            if (fs.existsSync(m)) return m;
    }
    return null;
}

function decode(file) {
    const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"],
        { maxBuffer: 256 * 1024 * 1024 });
    return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}

function frames(x) {
    const out = [];
    for (let s = 0; s + FRAME + MAXLAG < x.length; s += HOP) {
        let e = 0;
        for (let i = 0; i < FRAME; i++) e += x[s + i] * x[s + i];
        const db = 10 * Math.log10(e / FRAME + 1e-12);
        let f0 = 0;
        if (db > SILENCE_DB) {
            let best = 0, bestLag = 0;
            for (let lag = MINLAG; lag <= MAXLAG; lag++) {
                let num = 0, a = 0, b = 0;
                for (let i = 0; i < FRAME; i++) { const p = x[s + i], q = x[s + i + lag]; num += p * q; a += p * p; b += q * q; }
                const r = num / Math.sqrt(a * b + 1e-12);
                if (r > best) { best = r; bestLag = lag; }
            }
            if (best > 0.55) f0 = SR / bestLag;
        }
        out.push({ t: s / SR, silent: db <= SILENCE_DB, f0 });
    }
    return out;
}

function gaps(fr, minLen) {
    const out = [];
    let start = -1;
    fr.forEach((f, i) => {
        if (f.silent && start < 0) start = i;
        if ((!f.silent || i === fr.length - 1) && start >= 0) {
            const end = f.silent ? i : i - 1;
            const a = fr[start].t, b = fr[end].t + STEP;
            if (b - a >= minLen) out.push({ start: a, end: b });
            start = -1;
        }
    });
    return out;
}

const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

function windowStats(fr, a, b) {
    const w = fr.filter(f => f.t >= a && f.t < b && !f.silent);
    const v = w.filter(f => f.f0).map(f => f.f0);
    return { f0: v.length >= 5 ? median(v) : 0, voiced: w.length ? v.length / w.length : 0, n: w.length };
}

/* ---- alignment ----------------------------------------------------------- */

function align(blocks, fr, label) {
    const speech = fr.filter(f => !f.silent);
    if (!speech.length) throw new Error(label + ": в записи нет речи");
    const spanStart = speech[0].t, spanEnd = speech[speech.length - 1].t + STEP;
    const spanLen = spanEnd - spanStart;
    const chars = blocks.map(b => b.text.length);
    const total = chars.reduce((a, b) => a + b, 0);
    const allGaps = gaps(fr, 0.12).filter(g => g.start > spanStart && g.end < spanEnd);

    /* hand-over points */
    const bounds = [];
    let prev = spanStart, cum = 0;
    for (let k = 0; k < blocks.length - 1; k++) {
        cum += chars[k];
        const expected = spanStart + spanLen * cum / total;
        const W = Math.max(4, spanLen * 0.25);
        const dir = blocks[k + 1].who === "alice" ? 1 : -1;
        const lo = Math.max(prev + 0.8, expected - W), hi = Math.min(spanEnd - 0.8, expected + W);

        const cands = allGaps.filter(g => (g.start + g.end) / 2 >= lo && (g.start + g.end) / 2 <= hi)
            .map(g => ({ t: (g.start + g.end) / 2, gap: g.end - g.start }));
        for (let t = lo; t <= hi; t += 0.1) cands.push({ t, gap: 0 });     // a hand-over with no pause at all

        let best = null;
        cands.forEach(c => {
            const before = windowStats(fr, Math.max(prev, c.t - 3), c.t);
            const after = windowStats(fr, c.t, Math.min(spanEnd, c.t + 3));
            const pitch = before.f0 && after.f0 ? dir * Math.log2(after.f0 / before.f0) : 0;
            const voicing = dir * (before.voiced - after.voiced) * 0.5;
            const near = -Math.abs(c.t - expected) / W * 0.35;
            const pause = c.gap ? 0.15 + Math.min(c.gap, 0.6) * 0.3 : 0;
            const score = pitch + voicing + near + pause;
            if (!best || score > best.score) best = { t: c.t, score, pitch, voicing, near, pause, gap: c.gap, before, after, expected };
        });
        if (!best) best = { t: expected, score: 0, expected };
        bounds.push(best);
        prev = best.t;
    }

    /* turns and sentences inside them */
    const turns = blocks.map((b, k) => ({
        who: b.who,
        start: k === 0 ? spanStart : bounds[k - 1].t,
        end: k === blocks.length - 1 ? spanEnd : bounds[k].t
    }));
    const onsets = allGaps.map(g => g.end);
    const cues = [];
    blocks.forEach((b, k) => {
        const turn = turns[k];
        const sp = fr.filter(f => !f.silent && f.t >= turn.start && f.t < turn.end);
        const lens = b.sentences.map(s => s.length);
        const sum = lens.reduce((a, c) => a + c, 0) || 1;
        let acc = 0;
        b.sentences.forEach((s, j) => {
            let t = turn.start;
            if (j > 0 && sp.length) {
                const idx = Math.min(sp.length - 1, Math.round(sp.length * acc / sum));
                t = sp[idx].t;
                const snap = onsets.filter(o => o > turn.start && o < turn.end && Math.abs(o - t) <= 0.6)
                                   .sort((x, y) => Math.abs(x - t) - Math.abs(y - t))[0];
                if (snap !== undefined) t = snap;
            }
            cues.push({ t: +t.toFixed(2), who: b.who, block: k, text: s });
            acc += lens[j];
        });
    });
    cues.forEach((c, i) => { c.end = +(i + 1 < cues.length ? cues[i + 1].t : spanEnd).toFixed(2); });
    /* keep strictly increasing even if two sentences snapped to one onset */
    for (let i = 1; i < cues.length; i++) if (cues[i].t <= cues[i - 1].t) cues[i].t = +(cues[i - 1].t + 0.25).toFixed(2);

    return { turns, bounds, cues, spanStart, spanEnd };
}

/* ---- build ---------------------------------------------------------------- */

function readExisting() {
    if (!fs.existsSync(OUT)) return {};
    try {
        return require("vm").runInNewContext(
            "(function(){" + fs.readFileSync(OUT, "utf8") + "\nreturn JURY_CUES;})()", {}) || {};
    } catch (e) { return {}; }
}

function writeOut(result) {
    fs.writeFileSync(OUT,
`/* ============================================================
   TERMINAL: SHATTERED — jury intro subtitles
   ------------------------------------------------------------
   GENERATED FILE — do not edit by hand.
   Source: voice/scripts/<locale>.txt   Rebuild: node voice/cues.js
   (the voice studio rebuilds it itself after a take or script save)

   locale -> track id -> { dur, turns, cues }. Text is the script
   verbatim minus its ElevenLabs (tags); timing comes from the audio
   that plays in that locale. 16-jury-intro.js types these out and
   keys its scene changes to turn indexes, so the staging lands on
   the same lines in every language.

   Part 14 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const JURY_CUES = ${JSON.stringify(result, null, 1).replace(/\n/g, "\n    ")};
`, "utf8");
}

/* Recompute the cues of one locale (optionally one track) and rewrite the
   file. Returns one report per track — serve.js shows it in the studio. */
function rebuild(loc, onlyId) {
    const report = [];
    const result = readExisting();
    const file = path.join(SCRIPTS, loc + ".txt");
    if (!fs.existsSync(file)) {
        if (result[loc]) { delete result[loc]; writeOut(result); }
        return [{ loc, id: onlyId || "*", ok: false, why: "нет сценария voice/scripts/" + loc + ".txt" }];
    }
    const script = parseScript(fs.readFileSync(file, "utf8"));
    result[loc] = result[loc] || {};
    const ids = onlyId ? [onlyId] : Object.keys(script);
    if (!onlyId) Object.keys(result[loc]).forEach(id => { if (!script[id]) delete result[loc][id]; });
    ids.forEach(id => {
        const blocks = script[id];
        if (!blocks || !blocks.length) {
            delete result[loc][id];
            report.push({ loc, id, ok: false, why: "в сценарии нет раздела ## " + id });
            return;
        }
        const audio = audioFor(loc, id);
        if (!audio) {
            delete result[loc][id];
            report.push({ loc, id, ok: false, why: "записи на этом языке нет — в интро звучит русская версия с русскими субтитрами" });
            return;
        }
        const fr = frames(decode(audio));
        const a = align(blocks, fr, loc + "/" + id);
        result[loc][id] = {
            dur: +(fr.length * STEP).toFixed(2),
            turns: a.turns.map(t => ({ who: t.who, start: +t.start.toFixed(2), end: +t.end.toFixed(2) })),
            cues: a.cues
        };
        report.push({ loc, id, ok: true, audio: path.relative(ROOT, audio), turns: a.turns, bounds: a.bounds, cues: a.cues, frames: fr });
    });
    if (!Object.keys(result[loc]).length) delete result[loc];
    writeOut(result);
    return report;
}

/* ---- cli ------------------------------------------------------------------ */

function cli() {
    const locs = (ONLY ? [ONLY] : lib.LOCALES).filter(l => fs.existsSync(path.join(SCRIPTS, l + ".txt")));
    if (!locs.length) { console.log("сценариев нет: voice/scripts/<язык>.txt"); return; }
    locs.forEach(loc => rebuild(loc).forEach(r => {
        if (!r.ok) { console.log(r.loc + "/" + r.id + ": " + r.why); return; }
        console.log("\n" + r.loc + "/" + r.id + "  " + (r.frames.length * STEP).toFixed(2) + " с  ← " + r.audio);
        r.turns.forEach(t => {
            const st = windowStats(r.frames, t.start, t.end);
            console.log("   " + (t.who === "neikon" ? "НЕЙКОН" : "ЭЛИС  ") + " " + t.start.toFixed(1).padStart(5) + "–" + t.end.toFixed(1).padEnd(5) +
                        "  тон " + (st.f0 ? Math.round(st.f0) + " Гц" : "  —  ") + "  звонкость " + Math.round(st.voiced * 100) + "%");
        });
        if (DEBUG) {
            r.bounds.forEach((b, k) => console.log("   граница " + (k + 1) + ": " + b.t.toFixed(2) + " с (ждали " + b.expected.toFixed(1) +
                ")  pitch " + (b.pitch || 0).toFixed(2) + " voicing " + (b.voicing || 0).toFixed(2) + " pause " + (b.gap || 0).toFixed(2) + " с"));
            r.cues.forEach(c => console.log("     " + c.t.toFixed(2).padStart(6) + "  " + (c.who === "neikon" ? "Н" : "Э") + "  " + c.text.slice(0, 70)));
        }
    }));
    console.log("\n→ js/presentation/14-jury-cues.js");
}

/* ffmpeg is only needed to time subtitles; without it the studio still
   saves takes and scripts, and says the cues could not be rebuilt */
function hasFfmpeg() {
    try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch (e) { return false; }
}

module.exports = { rebuild, parseScript, hasFfmpeg, readCues: readExisting };
if (require.main === module) cli();
