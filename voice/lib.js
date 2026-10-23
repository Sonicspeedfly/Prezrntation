/* ============================================================
   TERMINAL: SHATTERED — voice pipeline, shared core
   ------------------------------------------------------------
   Everything that reads or writes a spoken line goes through
   here: the studio server (serve.js) and the subtitle tool
   (voice/cues.js).

   Where things live:
     voice/catalog.json            direction per line: where / emotion / pace
     voice/reading.json            pronunciation notes per locale (studio)
     voice/stamps.json             which text each take was recorded against
     assets/voice/<loc>/<id>.<ext> the takes themselves
     js/core/00-voice-clips.js     GENERATED manifest the game reads
     js/core/00-voice-text.js      GENERATED deck translations (non-ru)
     js/presentation/08-alice-lines.js   Russian deck text + baked audio
     js/core/10-i18n.js            demo lines, all locales (STRINGS)

   The text of a line is never copied into the catalogue. It stays
   in the file the game reads it from, and edits are written back
   there — a second copy would be stale the first time anyone
   fixed a typo in the other one.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["ru", "en", "tj", "tj_col"];
const LOCALE_NAME = {
    ru: "Русский", en: "English",
    tj: "Тоҷикӣ · литературный", tj_col: "Тоҷикӣ · разговорный"
};

const FILES = {
    lines:   path.join(ROOT, "js", "presentation", "08-alice-lines.js"),
    i18n:    path.join(ROOT, "js", "core", "10-i18n.js"),
    text:    path.join(ROOT, "js", "core", "00-voice-text.js"),
    clips:   path.join(ROOT, "js", "core", "00-voice-clips.js"),
    catalog: path.join(ROOT, "voice", "catalog.json"),
    reading: path.join(ROOT, "voice", "reading.json"),
    stamps:  path.join(ROOT, "voice", "stamps.json"),
    takes:   path.join(ROOT, "assets", "voice")
};

const EXT_MIME = {
    mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", m4a: "audio/mp4",
    webm: "audio/webm", flac: "audio/flac", aac: "audio/aac"
};
const MIME_EXT = {
    "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg", "audio/opus": "ogg",
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/vnd.wave": "wav",
    "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac",
    "audio/webm": "webm", "video/webm": "webm", "audio/flac": "flac", "audio/x-flac": "flac"
};
const ID_RE = /^[a-z0-9_.\-]{1,48}$/;

function fail(status, why) { const e = new Error(why); e.status = status; return e; }

/* ---- loading the game's own data files ----------------------------
   They are classic scripts that declare top-level consts in one shared
   scope (docs/ARCHITECTURE.md). Wrapping each in a function hands the
   objects back without a browser. 10-i18n.js touches the DOM only inside
   functions, so a bare shim gets it through load. */

function shim() {
    return {
        document: {
            querySelectorAll: () => [], querySelector: () => null, getElementById: () => null,
            documentElement: {}, body: {},
            createElement: () => ({ style: {}, classList: { add() {}, remove() {} } })
        },
        window: {}, localStorage: { getItem: () => null, setItem: () => {} },
        navigator: { language: "ru", userAgent: "" }, console
    };
}
function evalGlobals(file, names) {
    return vm.runInNewContext(
        "(function(){" + fs.readFileSync(file, "utf8") + "\nreturn {" + names.join(",") + "};})()",
        shim(), { filename: path.basename(file) });
}

/* 08-alice-lines.js is 1.7 MB of base64; evaluating it per request would
   make the studio sluggish. Cache by mtime+size, so an edit made from
   anywhere — studio, CLI, a text editor — is picked up on the next read. */
const cache = new Map();
function cached(file, build) {
    let st = null;
    try { st = fs.statSync(file); } catch (e) { st = null; }
    const hit = cache.get(file);
    if (hit && st && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.value;
    const value = build(st);
    if (st) cache.set(file, { mtime: st.mtimeMs, size: st.size, value });
    else cache.delete(file);
    return value;
}

function readJson(file, dflt) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return dflt; }
}
function writeJson(file, obj) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function deckBase() {
    return cached(FILES.lines, () => {
        const o = evalGlobals(FILES.lines, ["ALICE_STORY_LINES", "ALICE_BG_LINES"]);
        return { story: o.ALICE_STORY_LINES || {}, bg: o.ALICE_BG_LINES || [] };
    });
}
function strings() {
    return cached(FILES.i18n, () => evalGlobals(FILES.i18n, ["STRINGS"]).STRINGS || {});
}
function voiceText() {
    return cached(FILES.text, st => {
        if (!st) return {};
        try { return evalGlobals(FILES.text, ["VOICE_TEXT"]).VOICE_TEXT || {}; } catch (e) { return {}; }
    });
}
function catalog() {
    return cached(FILES.catalog, () => readJson(FILES.catalog, { lines: [] }));
}
function lineById(id) {
    return catalog().lines.find(l => l.id === id) || null;
}

/* ---- deck ids -> objects in 08-alice-lines.js --------------------- */

function deckRef(id) {
    let m = /^deck\.slide(\d{2})$/.exec(id);
    if (m) return { kind: "story", key: "SLIDE_" + m[1] };
    m = /^deck\.bg(\d{2})$/.exec(id);
    if (m) return { kind: "bg", index: parseInt(m[1], 10) - 1 };
    return null;
}
function deckEntry(id) {
    const r = deckRef(id), b = deckBase();
    if (!r) return null;
    return r.kind === "story" ? (b.story[r.key] || null) : (b.bg[r.index] || null);
}

/* ---- originals, and the deck's lazy bundle ---------------------------
   Originals of every built-in take live in assets/audio/ru/masters/ —
   the deck's sixteen lines (extracted from the old inline base64) and
   the long media tracks. The deck itself plays a 64 kbps copy:
   deck lines from js/presentation/08b-alice-audio.js, media tracks
   from assets/audio/ru/<id>.mp3 — both built by assets/build-media.js. */

const MASTERS = path.join(ROOT, "assets", "audio", "ru", "masters");
const BUNDLE = path.join(ROOT, "js", "presentation", "08b-alice-audio.js");

function masterFile(id) {
    const f = path.join(MASTERS, id + ".mp3");
    return fs.existsSync(f) ? f : null;
}
function bundle() {
    return cached(BUNDLE, st => {
        if (!st) return {};
        try {
            const sb = shim();
            vm.runInNewContext(fs.readFileSync(BUNDLE, "utf8"), sb, { filename: "08b-alice-audio.js" });
            return sb.window.ALICE_AUDIO || {};
        } catch (e) { return {}; }
    });
}

/* ---- scripts for media tracks ------------------------------------------
   voice/scripts/<loc>.txt holds «## id» sections of «ГОВОРЯЩИЙ: текст»
   lines. For a media track that section IS its text: the studio shows
   and edits it, voice/cues.js times it into subtitles. */

const SCRIPTS = path.join(ROOT, "voice", "scripts");
function scriptFile(loc) { return path.join(SCRIPTS, loc + ".txt"); }

function scriptSections(loc) {
    return cached(scriptFile(loc), st => {
        if (!st) return {};
        const out = {};
        let cur = null;
        fs.readFileSync(scriptFile(loc), "utf8").split(/\r?\n/).forEach(raw => {
            const h = /^##\s*([a-z0-9_.\-]+)\s*$/i.exec(raw.trim());
            if (h) { cur = h[1]; out[cur] = []; return; }
            if (cur && raw.trim() && !/^#/.test(raw.trim())) out[cur].push(raw.trim());
        });
        Object.keys(out).forEach(k => { out[k] = out[k].join("\n"); });
        return out;
    });
}

const SCRIPT_HEADER = (loc) =>
`# Сценарий длинных дорожек — ${LOCALE_NAME[loc] || loc}.
# Источник субтитров интро: node voice/cues.js (студия пересобирает их сама).
#
# Формат: «## id дорожки», затем реплики «ГОВОРЯЩИЙ: текст» — НЕЙКОН или ЭЛИС.
# Порядок реплик должен совпадать с записью. (Скобки) — теги голоса, в субтитры не идут.
`;

function writeScriptSection(loc, id, body) {
    const file = scriptFile(loc);
    const src = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : SCRIPT_HEADER(loc);
    const lines = src.split(/\r?\n/);
    const start = lines.findIndex(l => new RegExp("^##\\s*" + id.replace(/[.]/g, "\\.") + "\\s*$", "i").test(l.trim()));
    const block = body ? ["## " + id].concat(body.split("\n").map(s => s.trim()).filter(Boolean)) : [];
    let next;
    if (start < 0) {
        next = lines.concat(block.length ? [""].concat(block) : []);
    } else {
        let end = start + 1;
        while (end < lines.length && !/^##\s*[a-z0-9_.\-]+\s*$/i.test(lines[end].trim())) end++;
        while (end > start + 1 && !lines[end - 1].trim()) end--;          // keep the blank line before the next section
        next = lines.slice(0, start).concat(block, lines.slice(end));
    }
    fs.mkdirSync(SCRIPTS, { recursive: true });
    fs.writeFileSync(file, next.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n"), "utf8");
}

/* Every turn must name a known speaker, or the cue builder cannot tell
   where a hand-over is — fail at save time, where the fix is obvious. */
function checkScript(body) {
    body.split("\n").map(s => s.trim()).filter(Boolean).forEach((l, i) => {
        const m = /^([^:]{2,24}):\s*\S/.exec(l);
        if (!m || !/^(НЕЙКОН|NEIKON|ЭЛИС|ELIS|ALICE)$/i.test(m[1].trim()))
            throw fail(400, "строка " + (i + 1) + ": каждая реплика начинается с «НЕЙКОН:» или «ЭЛИС:»");
    });
}

/* ---- text ----------------------------------------------------------- */

function ruText(line) {
    if (line.system === "deck") { const e = deckEntry(line.id); return e ? e.text : ""; }
    if (line.system === "media") return scriptSections("ru")[line.id] || "";
    return (strings().ru || {})[line.key] || "";
}
/* The text written for this locale, or "" when there is none. */
function textFor(line, loc) {
    if (line.system === "deck") {
        if (loc === "ru") return ruText(line);
        return ((voiceText()[loc] || {})[line.id]) || "";
    }
    if (line.system === "media") return scriptSections(loc)[line.id] || "";
    return ((strings()[loc] || {})[line.key]) || "";
}
/* What the game actually shows in this locale: an untranslated deck or
   media line falls back to the Russian base, a demo line has none. */
function shownText(line, loc) {
    return textFor(line, loc) || (line.system === "deck" || line.system === "media" ? ruText(line) : "");
}
function hasBaked(line) {
    if (line.system === "media") return !!masterFile(line.id);
    if (line.system !== "deck") return false;
    return !!(masterFile(line.id) || bundle()[line.id]);
}

function isCrlf(src) {
    return (src.match(/\r\n/g) || []).length > src.split("\n").length / 2;
}
function decodeJsString(lit) {
    return vm.runInNewContext(lit);
}

/* Russian deck text: rewrite exactly one `text:` line in 08-alice-lines.js.
   Found by position under its own key, then checked against what the file
   currently holds — so a reordered file fails loudly instead of putting the
   new line under the wrong slide. */
function patchDeckRu(id, text) {
    const ref = deckRef(id);
    if (!ref) throw fail(400, "это не реплика презентации: " + id);
    const src = fs.readFileSync(FILES.lines, "utf8");

    let from;
    if (ref.kind === "story") {
        const m = new RegExp("^[ \\t]*" + ref.key + "\\s*:\\s*\\{", "m").exec(src);
        if (!m) throw fail(500, "в 08-alice-lines.js не найден блок " + ref.key);
        from = m.index;
    } else {
        from = src.indexOf("ALICE_BG_LINES");
        if (from < 0) throw fail(500, "в 08-alice-lines.js не найден ALICE_BG_LINES");
    }
    const re = /^([ \t]*text:\s*)("(?:[^"\\\r\n]|\\.)*")(,?)[ \t]*$/gm;
    re.lastIndex = from;
    const target = ref.kind === "story" ? 0 : ref.index;
    let m, n = 0, hit = null;
    while ((m = re.exec(src))) { if (n === target) { hit = m; break; } n++; }
    if (!hit) throw fail(500, "в 08-alice-lines.js не найдена строка text: для " + id);

    const was = deckEntry(id);
    if (!was || decodeJsString(hit[2]) !== was.text)
        throw fail(500, "08-alice-lines.js устроен не так, как ожидалось — " + id + " не на своём месте, правка не записана");

    const next = src.slice(0, hit.index) + hit[1] + JSON.stringify(text) + hit[3] +
                 src.slice(hit.index + hit[0].length);
    fs.writeFileSync(FILES.lines, next, "utf8");
}

const TEXT_HEADER =
`/* ============================================================
   TERMINAL: SHATTERED — voice text overrides
   ------------------------------------------------------------
   СГЕНЕРИРОВАННЫЙ ФАЙЛ — правится из студии озвучки (studio.html).

   Перевод реплик Элис из презентации. Ложится поверх русской базы
   в 08-alice-lines.js: что есть здесь — показывается на этом языке,
   чего нет — остаётся по-русски, вместе с русской записью.

   Part 0 of the deck's script, loaded first by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

`;

function writeVoiceText(all) {
    const order = catalog().lines.map(l => l.id);
    const out = {};
    LOCALES.forEach(loc => {
        const src = all[loc];
        if (!src) return;
        const sorted = {};
        order.forEach(id => { if (src[id]) sorted[id] = src[id]; });
        Object.keys(src).forEach(id => { if (!(id in sorted) && src[id]) sorted[id] = src[id]; });
        if (Object.keys(sorted).length) out[loc] = sorted;
    });
    fs.mkdirSync(path.dirname(FILES.text), { recursive: true });
    fs.writeFileSync(FILES.text, TEXT_HEADER + "    const VOICE_TEXT = " +
        JSON.stringify(out, null, 4).replace(/\n/g, "\n    ") + ";\n", "utf8");
}

function patchVoiceText(loc, id, text) {
    const all = JSON.parse(JSON.stringify(voiceText()));
    all[loc] = all[loc] || {};
    if (text) all[loc][id] = text; else delete all[loc][id];
    writeVoiceText(all);
}

/* Demo line text: rewrite one "key": value line inside one locale block of
   10-i18n.js. The key must occur exactly once in that block. */
function patchStrings(loc, key, text) {
    const src = fs.readFileSync(FILES.i18n, "utf8");
    const head = l => new RegExp("^ {8}" + l + ": \\{[ \\t]*$", "m").exec(src);
    const lm = head(loc);
    if (!lm) throw fail(500, "в 10-i18n.js нет блока " + loc);
    const start = lm.index + lm[0].length;
    let end = src.length;
    LOCALES.forEach(l => {
        if (l === loc) return;
        const o = head(l);
        if (o && o.index > start && o.index < end) end = o.index;
    });
    const body = src.slice(start, end);
    const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
        '^([ \\t]*"' + k + '"\\s*:\\s*)("(?:[^"\\\\\\r\\n]|\\\\.)*"|\'(?:[^\'\\\\\\r\\n]|\\\\.)*\')(\\s*,?)[ \\t]*$', "gm");
    const hits = [];
    let m;
    while ((m = re.exec(body))) hits.push(m);
    if (hits.length !== 1)
        throw fail(500, "ключ " + key + " в блоке " + loc + " найден " + hits.length + " раз — ожидался один");
    const h = hits[0];
    const nextBody = body.slice(0, h.index) + h[1] + JSON.stringify(text) + h[3] +
                     body.slice(h.index + h[0].length);
    fs.writeFileSync(FILES.i18n, src.slice(0, start) + nextBody + src.slice(end), "utf8");
}

function setText(loc, id, raw) {
    const line = lineById(id);
    if (!line) throw fail(404, "нет такой реплики: " + id);
    if (!LOCALES.includes(loc)) throw fail(400, "нет такого языка: " + loc);
    const text = String(raw == null ? "" : raw).replace(/\r\n?/g, "\n").trim();
    if (line.system === "media") {
        if (loc === "ru" && !text) throw fail(400, "русский сценарий — база для субтитров, пустым его оставить нельзя");
        if (text) checkScript(text);
        if (text !== textFor(line, loc)) writeScriptSection(loc, id, text);   // пусто = убрать перевод
        return shownText(line, loc);
    }
    if (line.system === "deck") {
        if (loc === "ru") {
            if (!text) throw fail(400, "русский текст — база для всех языков, пустым его оставить нельзя");
            if (text !== ruText(line)) patchDeckRu(id, text);
        } else {
            patchVoiceText(loc, id, text);           // пусто = убрать перевод
        }
    } else {
        if (!text) throw fail(400, "пустая строка оставит в игре пустой субтитр");
        if (text !== textFor(line, loc)) patchStrings(loc, line.key, text);
    }
    return shownText(line, loc);
}

/* ---- reading notes, stamps ----------------------------------------- */

function readings() { return readJson(FILES.reading, {}); }
function setReading(loc, id, raw) {
    if (!lineById(id)) throw fail(404, "нет такой реплики: " + id);
    if (!LOCALES.includes(loc)) throw fail(400, "нет такого языка: " + loc);
    const r = readings();
    const v = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    r[loc] = r[loc] || {};
    if (v) r[loc][id] = v; else delete r[loc][id];
    if (!Object.keys(r[loc]).length) delete r[loc];
    writeJson(FILES.reading, r);
}

/* A stamp records the text a take was read from. When the text changes
   afterwards, the take no longer matches its subtitle — the studio flags
   it instead of letting the game play the old words under the new ones. */
function hash(s) { return crypto.createHash("sha1").update(String(s), "utf8").digest("hex").slice(0, 12); }
function stamps() { return readJson(FILES.stamps, {}); }
function stamp(loc, id) {
    const line = lineById(id);
    if (!line) throw fail(404, "нет такой реплики: " + id);
    const s = stamps();
    s[loc] = s[loc] || {};
    s[loc][id] = hash(shownText(line, loc));
    writeJson(FILES.stamps, s);
}
function unstamp(loc, id) {
    const s = stamps();
    if (s[loc]) { delete s[loc][id]; if (!Object.keys(s[loc]).length) delete s[loc]; }
    writeJson(FILES.stamps, s);
}

/* ---- takes ----------------------------------------------------------- */

function takeDir(loc) { return path.join(FILES.takes, loc); }

function scanTakes() {
    const out = {};
    LOCALES.forEach(loc => {
        out[loc] = {};
        let names = [];
        try { names = fs.readdirSync(takeDir(loc)); } catch (e) { return; }
        names.forEach(fn => {
            const ext = path.extname(fn).slice(1).toLowerCase();
            if (!EXT_MIME[ext]) return;
            const id = fn.slice(0, -(ext.length + 1));
            if (!ID_RE.test(id)) return;
            const st = fs.statSync(path.join(takeDir(loc), fn));
            if (!st.size) return;
            const prev = out[loc][id];
            if (!prev || st.mtimeMs > prev.mtime)
                out[loc][id] = { file: fn, ext, size: st.size, mtime: Math.round(st.mtimeMs) };
        });
    });
    return out;
}

function removeTakeFiles(loc, id) {
    let names = [], n = 0;
    try { names = fs.readdirSync(takeDir(loc)); } catch (e) { return 0; }
    names.forEach(fn => {
        const ext = path.extname(fn).slice(1).toLowerCase();
        if (EXT_MIME[ext] && fn.slice(0, -(ext.length + 1)) === id) {
            fs.unlinkSync(path.join(takeDir(loc), fn)); n++;
        }
    });
    return n;
}

function saveTake(loc, id, buf, ext) {
    if (!LOCALES.includes(loc)) throw fail(400, "нет такого языка: " + loc);
    if (!lineById(id)) throw fail(404, "нет такой реплики: " + id);
    if (!EXT_MIME[ext]) throw fail(415, "это не звук, который понимает игра: нужен mp3, wav, ogg, webm, m4a, flac или aac");
    if (!buf || !buf.length) throw fail(400, "пустой файл");
    fs.mkdirSync(takeDir(loc), { recursive: true });
    removeTakeFiles(loc, id);                       // одна реплика — один файл
    fs.writeFileSync(path.join(takeDir(loc), id + "." + ext), buf);
    stamp(loc, id);
    return writeManifest();
}
function deleteTake(loc, id) {
    if (!LOCALES.includes(loc)) throw fail(400, "нет такого языка: " + loc);
    const n = removeTakeFiles(loc, id);
    unstamp(loc, id);
    writeManifest();
    return n;
}

/* ---- manifest -------------------------------------------------------- */

/* locale -> id -> src. Paths carry ?v=<mtime>: re-recording a line keeps
   its filename, and without the version the browser would keep playing
   the old take out of its cache. */
function clipTable(inline) {
    const known = new Set(catalog().lines.map(l => l.id));
    const takes = scanTakes();
    const clips = {}, unknown = [];
    let count = 0, bytes = 0;
    LOCALES.forEach(loc => Object.keys(takes[loc]).sort().forEach(id => {
        const t = takes[loc][id];
        if (!known.has(id)) { unknown.push(loc + "/" + t.file); return; }
        clips[loc] = clips[loc] || {};
        clips[loc][id] = inline
            ? "data:" + EXT_MIME[t.ext] + ";base64," + fs.readFileSync(path.join(takeDir(loc), t.file)).toString("base64")
            : "assets/voice/" + loc + "/" + t.file + "?v=" + t.mtime;
        count++; bytes += t.size;
    }));
    return { clips, unknown, count, bytes };
}

function manifestIsInline() {
    try { return /Mode: inlined/.test(fs.readFileSync(FILES.clips, "utf8").slice(0, 2000)); }
    catch (e) { return false; }
}

/* opts.inline: true / false, or undefined to keep whatever the file is now —
   so a take saved from the studio does not silently undo a build that was
   inlined for shipping. */
function writeManifest(opts) {
    opts = opts || {};
    const inline = opts.inline === undefined ? manifestIsInline() : !!opts.inline;
    const t = clipTable(inline);
    const body = Object.keys(t.clips).length
        ? JSON.stringify(t.clips, null, 4).replace(/\n/g, "\n    ")
        : "{\n        /* пусто — записей ещё нет: студия озвучки (studio.html) или assets/voice/<locale>/ */\n    }";
    fs.mkdirSync(path.dirname(FILES.clips), { recursive: true });
    fs.writeFileSync(FILES.clips,
`/* ============================================================
   TERMINAL: SHATTERED — voice clips
   ------------------------------------------------------------
   GENERATED FILE — do not edit by hand.
   Written by the voice studio (studio.html) on every save, and by
   serve.js on start (start.bat).

   Maps locale -> clip id -> audio source. Any line listed here plays
   as a real recording in that locale instead of the built-in take or
   speech synthesis.

   Mode: ${inline ? "inlined base64 (self-contained, works from file://)" : "file paths (small file, the studio swaps takes live)"}
   Clips: ${t.count}${t.count ? "  ·  source audio " + (t.bytes / 1048576).toFixed(2) + " MB" : ""}

   Part 0 of the deck's script, loaded first by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const VOICE_CLIPS = ${body};
`, "utf8");
    return { count: t.count, bytes: t.bytes, unknown: t.unknown, inline };
}

/* ---- studio listing ---------------------------------------------------- */

function listing(loc) {
    if (!LOCALES.includes(loc)) throw fail(400, "нет такого языка: " + loc);
    const takes = scanTakes()[loc] || {};
    const st = stamps()[loc] || {};
    const rd = readings()[loc] || {};
    return catalog().lines.map(line => {
        const text = textFor(line, loc);
        const shown = shownText(line, loc);
        const take = takes[line.id] || null;
        const translated = loc === "ru" || line.system === "demo" || !!text;
        /* what the game plays for this line right now, in this locale */
        let plays = "none";
        if (take) plays = "own";
        else if (line.system === "deck" && hasBaked(line) && (loc === "ru" || !text)) plays = "baked";
        /* long tracks fall back to the Russian original in every language:
           a three-minute intro going silent is worse than hearing it in
           Russian — and the intro then shows Russian subtitles to match */
        else if (line.system === "media" && hasBaked(line)) plays = "baked";
        else if (line.system === "demo") plays = line.reachable === false ? "none" : "synth";
        return {
            id: line.id, system: line.system, group: line.group || null, who: line.who || "",
            label: line.label || "", reachable: line.reachable !== false,
            where: line.where || "", emotion: line.emotion || "", pace: line.pace || "", note: line.note || "",
            text, shown, ru: ruText(line), translated,
            editableEmpty: (line.system === "deck" || line.system === "media") && loc !== "ru",
            reading: rd[line.id] || "",
            baked: hasBaked(line),
            take: take ? {
                file: take.file, size: take.size, mtime: take.mtime,
                url: "assets/voice/" + loc + "/" + take.file + "?v=" + take.mtime
            } : null,
            stale: !!(take && st[line.id] && st[line.id] !== hash(shown)),
            plays
        };
    });
}

/* The original take — full quality, as recorded. Falls back to the
   deck's 64 kbps bundle only if a master was never extracted. */
function bakedAudio(id) {
    const line = lineById(id);
    if (!line || !hasBaked(line)) return null;
    const m = masterFile(id);
    if (m) return fs.readFileSync(m);
    const b = bundle()[id];
    return b ? Buffer.from(b, "base64") : null;
}

/* locale -> ids that have an added take; lets the studio count what a
   download will contain across every language, not just the open one */
function takesSummary() {
    const t = scanTakes(), out = {};
    LOCALES.forEach(loc => { out[loc] = Object.keys(t[loc] || {}).sort(); });
    return out;
}

/* ---- download packs ------------------------------------------------------
   What the studio hands out as one ZIP:
     original/ru/<id>.mp3          the Russian takes baked into the deck —
                                   also the clean reference set if an RVC
                                   model is to be trained on this voice
     added/<loc>/<id>.<ext>        takes recorded or attached in the studio
     texts.tsv                     which words each file says (opens in Excel)
     README.txt                    what the folders are

   opts: { loc, ids (array|null = all), baked, own, allLocales } */

const PACK_README = [
    "Реплики Элис · terminal: shattered",
    "Выгружено из студии озвучки: {date}",
    "",
    "original/ru/    исходные записи — русские, вшитые в презентацию",
    "added/<язык>/   добавленные — записанные или приложенные в студии",
    "texts.tsv       какой текст звучит в каждом файле (открывается в Excel)",
    "",
    "Имя файла = id реплики. Вернуть файл в игру: студия → карточка",
    "реплики → «приложить файл» → «сохранить в игру».",
    ""
].join("\r\n");

function packEntries(opts) {
    opts = opts || {};
    const want = opts.ids && opts.ids.length ? new Set(opts.ids) : null;
    const lines = catalog().lines.filter(l => !want || want.has(l.id));
    const entries = [];
    const rows = [["файл", "id", "язык", "вид", "текст"]];

    if (opts.baked) {
        lines.forEach(l => {
            const data = hasBaked(l) ? bakedAudio(l.id) : null;
            if (!data) return;
            const m = masterFile(l.id);
            const name = "original/ru/" + l.id + ".mp3";
            entries.push({ name, data, date: m ? fs.statSync(m).mtime : new Date() });
            rows.push([name, l.id, "ru", "исходная", ruText(l).replace(/\n/g, " / ")]);
        });
    }
    if (opts.own) {
        const takes = scanTakes();
        const locs = opts.allLocales ? LOCALES : [opts.loc || "ru"];
        locs.forEach(loc => lines.forEach(l => {
            const t = takes[loc] && takes[loc][l.id];
            if (!t) return;
            const name = "added/" + loc + "/" + t.file;
            entries.push({ name, data: fs.readFileSync(path.join(takeDir(loc), t.file)), date: new Date(t.mtime) });
            rows.push([name, l.id, loc, "добавленная", shownText(l, loc)]);
        }));
    }

    const audio = entries.length;
    if (audio) {
        const cell = c => String(c == null ? "" : c).replace(/[\t\r\n]+/g, " ");
        const tsv = rows.map(r => r.map(cell).join("\t")).join("\r\n") + "\r\n";
        const stamp = new Date().toLocaleString("ru-RU");
        /* BOM: without it Excel reads UTF-8 TSV as cp1251 and the text is mojibake */
        entries.push({ name: "texts.tsv", data: Buffer.from("﻿" + tsv, "utf8") });
        entries.push({ name: "README.txt", data: Buffer.from("﻿" + PACK_README.replace("{date}", stamp), "utf8") });
    }
    return { entries, audio };
}

/* ---- speaker list (Markdown) ------------------------------------------ */
/* «скачать спикер-лист» in the studio: every line of a locale with its
   direction, file name and text, for the voice actor or RVC. */

function renderScript(loc, only) {
    const rows = listing(loc).filter(r => !only || r.system === only);
    const cat = catalog();
    const o = [];
    const what = only === "deck" ? "презентация" : only === "demo" ? "демка" : "все реплики";
    o.push("# Спикер-лист · " + LOCALE_NAME[loc] + " · " + what, "");
    o.push("Собрано из кода игры. Студия: `studio.html` (запуск — `start.bat`).", "");
    if (cat.stretch) o.push("> " + cat.stretch, "");

    const groups = [
        ["deck", "story", "Презентация · сюжетные, по одной на слайд"],
        ["deck", "bg", "Презентация · фоновые, падают в случайный момент"],
        ["demo", null, "Демка · звучит на HARD"],
        ["media", "jury", "Интро для жюри · экран загрузки"],
        ["media", "extra", "Экстра · настройки и пасхалка"]
    ];
    groups.forEach(([sys, grp, title]) => {
        const part = rows.filter(r => r.system === sys && (!grp || r.group === grp));
        if (!part.length) return;
        o.push("---", "", "## " + title, "");
        part.forEach(r => {
            o.push("### `" + r.id + "` · " + r.label + (r.reachable ? "" : " · сейчас не звучит"), "");
            o.push("- **где:** " + r.where);
            o.push("- **эмоция:** " + r.emotion);
            o.push("- **темп:** " + r.pace);
            if (r.note) o.push("- **заметка:** " + r.note);
            if (r.reading) o.push("- **читать:** " + r.reading);
            const now = r.take ? "своя запись (" + r.take.file + ")" + (r.stale ? " — ⚠ текст менялся после записи" : "")
                : r.plays === "baked" ? "встроенная русская запись"
                : r.plays === "synth" ? "синтез речи браузера"
                : "только текст";
            o.push("- **файл:** `assets/voice/" + loc + "/" + r.id + ".mp3` · сейчас: " + now, "");
            if (loc !== "ru" && r.system === "deck") o.push("<sub>русский оригинал: " + r.ru + "</sub>", "");
            o.push("```text", r.text || "", "```", "");
        });
    });
    return o.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

module.exports = {
    ROOT, LOCALES, LOCALE_NAME, FILES, EXT_MIME, MIME_EXT, ID_RE, fail,
    catalog, lineById, listing, textFor, shownText, ruText,
    setText, setReading, stamp, saveTake, deleteTake, scanTakes,
    clipTable, writeManifest, manifestIsInline, voiceText, bakedAudio,
    takesSummary, packEntries, renderScript
};
