/* ============================================================
   TERMINAL: SHATTERED — the one server
   ------------------------------------------------------------
       двойной щелчок по start.bat
       или: node serve.js [port] [--open]   (по умолчанию 8779)

   Всё в одном процессе:
     • презентация — на :8779 и, если свободен, на :80; для телефонов
       жюри — HTTPS на :443 с настоящим сертификатом:
       https://192-168-x-x.local-ip.sh/ (см. «the link for the jury's
       phones» ниже); QR этой ссылки — в окне сервера и на /qr;
     • студия озвучки (/studio.html);
     • голос Элис без записи — ElevenLabs или Piper (/api/tts); там же
       мысли Нейкона в демо — только ElevenLabs;
     • мост к локальной Ollama для полигона (/api/ollama/*).

   Полигон и голос открыты и гостям — телефонам жюри в той же Wi-Fi
   сети (зашли по QR): очередь к модели, ноутбук докладчика без
   очереди, лимит символов ElevenLabs на гостей. Студия и всё, что
   пишет файлы, — только с этого компьютера. Закрыть гостям:
   node serve.js --no-guests.

   Отдаёт презентацию как обычный статический сервер и добавляет
   студию озвучки: studio.html принимает запись с микрофона или
   готовый файл, кладёт его в assets/voice/<язык>/<id>.<ext> и сразу
   пересобирает манифест. Игра, открытая с этого же сервера,
   подтягивает новые записи при смене языка — без перезапуска.

   Только Node, без зависимостей: npm install не нужен.

   Писать (записи, текст) можно только с этого компьютера. Сама
   презентация открывается и с других устройств в сети — жюри может
   смотреть с ноутбука, но не может ничего перезаписать.
   ============================================================ */
"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec, spawn } = require("child_process");
const crypto = require("crypto");
const zlib = require("zlib");
const lib = require("./voice/lib");
const { zip } = require("./voice/zip");
const qr = require("./tools/qr");
const cues = require("./voice/cues");
const HAS_FFMPEG = cues.hasFfmpeg();

/* After a long track's take or script changes, its subtitles are out of
   date; re-time them on the spot. Takes a second or two per track. */
function retime(loc, id) {
    const line = lib.lineById(id);
    if (!line || line.system !== "media") return null;
    if (!HAS_FFMPEG) return { ok: false, why: "ffmpeg не найден — субтитры не пересобраны (node voice/cues.js после установки)" };
    try {
        const r = cues.rebuild(loc, id)[0] || { ok: false, why: "нечего пересобирать" };
        if (r.ok) console.log("  субтитры " + loc + "/" + id + ": " + r.cues.length + " фраз, " + r.turns.length + " реплик");
        return r.ok ? { ok: true, phrases: r.cues.length, turns: r.turns.length } : { ok: false, why: r.why };
    } catch (e) {
        console.error("  субтитры " + loc + "/" + id + ": " + e.message);
        return { ok: false, why: e.message };
    }
}

const ROOT = __dirname;
const args = process.argv.slice(2);
const PORT = parseInt(args.find(a => /^\d+$/.test(a)) || process.env.PORT || "8779", 10);
const OPEN = args.includes("--open");
const GUESTS = !args.includes("--no-guests");
const MAX_BODY = 25 * 1024 * 1024;

const MIME = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
    ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4",
    ".webm": "audio/webm", ".flac": "audio/flac", ".aac": "audio/aac"
};

const COMPRESSIBLE = /^(text\/|application\/json|image\/svg\+xml)/;
const GZ_CACHE = new Map();

/* «This computer»: loopback, or one of this machine's own addresses —
   the deck opened as http://192.168.x.x.nip.io/ on the laptop itself
   reaches the server from its LAN address, not from 127.0.0.1. */
function isLocal(req) {
    const a = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
    if (a === "127.0.0.1" || a === "::1") return true;
    const nets = os.networkInterfaces();
    return Object.keys(nets).some(n => (nets[n] || []).some(i => i.address === a));
}

/* A phone in the same Wi-Fi: a private address. Also 127.x other than
   .1 — only this machine can send from those, and the tests use it to
   look like a guest. */
function clientIp(req) { return (req.socket.remoteAddress || "").replace(/^::ffff:/, ""); }
function isLan(req) {
    const a = clientIp(req);
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|127\.)/.test(a) || /^(fc|fd|fe80)/i.test(a);
}

/* Alice's voice for a deck shown by ANOTHER server on this machine —
   any other static server — asks here, on :8779, for the voice. Same
   host name, other port: allowed. A website anywhere else gets no CORS headers and so
   cannot spend the ElevenLabs credits through this server. */
function corsFor(req) {
    const origin = req.headers.origin;
    if (!origin) return null;
    let oh;
    try { oh = new URL(origin).hostname.replace(/^\[|\]$/g, ""); } catch (e) { return null; }
    const hh = String(req.headers.host || "").replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
    const loop = h => h === "localhost" || h === "127.0.0.1" || h === "::1";
    if (oh !== hh && !(loop(oh) && loop(hh))) return null;
    return { "Access-Control-Allow-Origin": origin, "Vary": "Origin",
             "Access-Control-Expose-Headers": "X-TTS-Engine, X-TTS-Note" };
}

function send(res, code, body, type, extra) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), "utf8");
    res.writeHead(code, Object.assign({
        "Content-Type": type || "text/plain; charset=utf-8",
        "Content-Length": buf.length,
        "Cache-Control": "no-store"
    }, extra || {}));
    res.end(buf);
}
function json(res, code, obj) { send(res, code, JSON.stringify(obj), "application/json; charset=utf-8"); }

function readBody(req, limit) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on("data", c => {
            size += c.length;
            if (size > limit) { reject(lib.fail(413, "файл больше " + Math.round(limit / 1048576) + " МБ — для одной реплики это слишком, сохраните в mp3")); req.destroy(); return; }
            chunks.push(c);
        });
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}
async function readJsonBody(req) {
    const raw = await readBody(req, 256 * 1024);
    try { return JSON.parse(raw.toString("utf8") || "{}"); }
    catch (e) { throw lib.fail(400, "тело запроса — не JSON"); }
}

/* ---- static ------------------------------------------------------------- */

function serveStatic(req, res, pathname) {
    let rel;
    try { rel = decodeURIComponent(pathname); } catch (e) { return send(res, 400, "bad path"); }
    if (rel.endsWith("/")) rel += "index.html";
    const abs = path.resolve(ROOT, "." + rel);
    if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) return send(res, 403, "forbidden");
    /* dotfiles and the folder of private tool config stay private */
    if (path.relative(ROOT, abs).split(path.sep).some(seg => seg.startsWith("."))) return send(res, 404, "not found");

    fs.stat(abs, (err, st) => {
        if (err || !st.isFile()) return send(res, 404, "not found");
        const type = MIME[path.extname(abs).toLowerCase()] || "application/octet-stream";

        /* no-cache below means «ask first», not «download again»: a reload
           on a phone over weak Wi-Fi gets 304s for everything unchanged,
           and a re-recorded take still shows up because its tag changes */
        const etag = 'W/"' + st.size.toString(36) + "-" + Math.floor(st.mtimeMs).toString(36) + '"';
        if (req.headers["if-none-match"] === etag) {
            res.writeHead(304, { "ETag": etag, "Cache-Control": "no-cache" });
            return res.end();
        }
        res.setHeader("ETag", etag);

        /* Text compresses 3–5×: the deck's JS and CSS go from ~1.1 MB to
           ~0.3 MB on the wire, which is what decides how long a phone on a
           weak link waits for the first working button. Audio, video and
           images are already compressed and are sent as they are. */
        if (COMPRESSIBLE.test(type) && st.size > 1024 && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
            const key = abs + "|" + st.mtimeMs + "|" + st.size;
            let gz = GZ_CACHE.get(key);
            if (!gz) {
                gz = zlib.gzipSync(fs.readFileSync(abs), { level: 9 });
                GZ_CACHE.set(key, gz);
                if (GZ_CACHE.size > 200) GZ_CACHE.delete(GZ_CACHE.keys().next().value);
            }
            res.writeHead(200, { "Content-Type": type, "Content-Encoding": "gzip", "Vary": "Accept-Encoding",
                                 "Content-Length": gz.length, "Cache-Control": "no-cache" });
            return res.end(req.method === "HEAD" ? undefined : gz);
        }
        /* no-cache everywhere: a re-recorded take keeps its file name, and the
           studio is only useful if what you hear is what you just saved */
        const headers = { "Content-Type": type, "Cache-Control": "no-cache", "Accept-Ranges": "bytes" };

        /* single byte range, so <audio controls> can seek */
        const range = req.headers.range;
        const m = range && /^bytes=(\d*)-(\d*)$/.exec(range);
        if (m && (m[1] || m[2])) {
            let start = m[1] ? parseInt(m[1], 10) : st.size - parseInt(m[2], 10);
            let end = m[1] && m[2] ? parseInt(m[2], 10) : st.size - 1;
            start = Math.max(0, start); end = Math.min(st.size - 1, end);
            if (start > end) { res.writeHead(416, { "Content-Range": "bytes */" + st.size }); return res.end(); }
            headers["Content-Range"] = "bytes " + start + "-" + end + "/" + st.size;
            headers["Content-Length"] = end - start + 1;
            res.writeHead(206, headers);
            if (req.method === "HEAD") return res.end();
            return fs.createReadStream(abs, { start, end }).pipe(res);
        }
        headers["Content-Length"] = st.size;
        res.writeHead(200, headers);
        if (req.method === "HEAD") return res.end();
        fs.createReadStream(abs).pipe(res);
    });
}

/* ---- api ---------------------------------------------------------------- */

const LOC = "(ru|en|tj|tj_col)";
const ID = "([a-z0-9_.\\-]{1,48})";
const routes = [];
/* opts.local — this computer only (the studio, anything that writes);
   opts.guests — also phones on the LAN, unless started --no-guests */
function route(method, pattern, opts, fn) {
    routes.push({ method, re: new RegExp("^" + pattern + "$"), local: !!opts.local, guests: !!opts.guests, fn });
}

route("GET", "/api/voice/info", {}, (req, res) => json(res, 200, {
    ok: true, local: isLocal(req), locales: lib.LOCALES, names: lib.LOCALE_NAME,
    inline: lib.manifestIsInline()
}));

/* The deck polls this on load, on tab focus and on every language switch:
   always path mode, so a take saved a second ago is playable right away. */
route("GET", "/api/voice/manifest", {}, (req, res) => json(res, 200, {
    ok: true, clips: lib.clipTable(false).clips, text: lib.voiceText(), cues: cues.readCues()
}));

route("GET", "/api/voice/lines", { local: true }, (req, res, m, q) => {
    const loc = q.get("loc") || "ru";
    json(res, 200, {
        ok: true, loc, lines: lib.listing(loc), stretch: lib.catalog().stretch || "",
        takes: lib.takesSummary()
    });
});

/* One ZIP of takes. ?src=baked,own picks original and/or added takes,
   ?ids=a,b,c narrows to chosen lines (absent = every line),
   ?scope=all takes added takes from every language, not just ?loc. */
route("GET", "/api/voice/pack", { local: true }, (req, res, m, q) => {
    const loc = q.get("loc") || "ru";
    if (!lib.LOCALES.includes(loc)) throw lib.fail(400, "нет такого языка: " + loc);
    const src = String(q.get("src") || "baked,own").split(",");
    const ids = q.get("ids") ? q.get("ids").split(",").filter(id => lib.ID_RE.test(id)) : null;
    const all = q.get("scope") === "all";
    const pack = lib.packEntries({ loc, ids, baked: src.includes("baked"), own: src.includes("own"), allLocales: all });
    if (!pack.audio) throw lib.fail(404, "по этому выбору нет ни одного аудиофайла");

    const d = new Date(), p = n => String(n).padStart(2, "0");
    const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
    const kind = src.includes("baked") && src.includes("own") ? "" : src.includes("baked") ? "-original" : "-added";
    const name = "alice-voice" + kind + "-" + (ids ? "selected" : "all") + "-" + (all ? "all-languages" : loc) + "-" + stamp + ".zip";

    const buf = zip(pack.entries);
    console.log("  архив   " + name + "  " + pack.audio + " файлов, " + (buf.length / 1048576).toFixed(1) + " МБ");
    send(res, 200, buf, "application/zip", { "Content-Disposition": "attachment; filename=\"" + name + "\"" });
});

route("GET", "/api/voice/baked/" + ID, { local: true }, (req, res, m) => {
    const buf = lib.bakedAudio(m[1]);
    if (!buf) return send(res, 404, "нет встроенной записи");
    send(res, 200, buf, "audio/mpeg");
});

route("GET", "/api/voice/script", { local: true }, (req, res, m, q) => {
    const loc = q.get("loc") || "ru";
    const only = q.get("only") || null;
    const md = lib.renderScript(loc, only === "deck" || only === "demo" ? only : null);
    send(res, 200, md, "text/markdown; charset=utf-8", {
        "Content-Disposition": "attachment; filename=\"speaker-list-" + loc + (only ? "-" + only : "") + ".md\""
    });
});

route("POST", "/api/voice/take/" + LOC + "/" + ID, { local: true }, async (req, res, m, q) => {
    const [, loc, id] = m;
    if (q.get("delete") === "1") {
        lib.deleteTake(loc, id);
        return json(res, 200, { ok: true, cues: retime(loc, id) });
    }
    const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const ext = lib.MIME_EXT[mime];
    if (!ext) throw lib.fail(415, "это не звук, который понимает игра: нужен mp3, wav, ogg, webm, m4a, flac или aac");
    const buf = await readBody(req, MAX_BODY);
    const r = lib.saveTake(loc, id, buf, ext);
    console.log("  запись  " + loc + "/" + id + "." + ext + "  " + (buf.length / 1024).toFixed(0) + " КБ");
    json(res, 200, { ok: true, file: id + "." + ext, clips: r.count, cues: retime(loc, id) });
});

route("POST", "/api/voice/text/" + LOC + "/" + ID, { local: true }, async (req, res, m) => {
    const body = await readJsonBody(req);
    const shown = lib.setText(m[1], m[2], body.text);
    console.log("  текст   " + m[1] + "/" + m[2]);
    json(res, 200, { ok: true, shown, cues: retime(m[1], m[2]) });
});

route("POST", "/api/voice/reading/" + LOC + "/" + ID, { local: true }, async (req, res, m) => {
    const body = await readJsonBody(req);
    lib.setReading(m[1], m[2], body.reading);
    json(res, 200, { ok: true });
});

/* "the text is right, keep the take": re-stamp it against the current text */
route("POST", "/api/voice/stamp/" + LOC + "/" + ID, { local: true }, (req, res, m) => {
    lib.stamp(m[1], m[2]);
    json(res, 200, { ok: true });
});

route("POST", "/api/voice/manifest", { local: true }, (req, res, m, q) => {
    const r = lib.writeManifest({ inline: q.get("inline") === "1" });
    console.log("  манифест: " + (r.inline ? "вшито" : "пути") + ", " + r.count + " записей");
    json(res, 200, { ok: true, inline: r.inline, count: r.count, unknown: r.unknown });
});

/* ---- AI sandbox: Ollama bridge ------------------------------------------ */

/* js/core/19-ai-sandbox.js talks to a local Ollama through here: same
   origin, so Ollama needs no CORS settings, and a stopped Ollama comes
   back as a 502 with a reason instead of a refused connection in the
   browser console. Streams pass straight through; closing the bench
   mid-answer drops the upstream request, and Ollama stops generating. */
const OLLAMA = (() => {
    const h = process.env.OLLAMA_HOST || "127.0.0.1:11434";
    try {
        const u = new URL(/^https?:\/\//.test(h) ? h : "http://" + h);
        const host = (u.hostname === "0.0.0.0" || !u.hostname) ? "127.0.0.1" : u.hostname;
        return { host, port: Number(u.port) || 11434 };
    } catch (e) { return { host: "127.0.0.1", port: 11434 }; }
})();

function ollama(res, method, apiPath, body) {
    const up = http.request({
        host: OLLAMA.host, port: OLLAMA.port, method, path: apiPath,
        headers: body ? { "Content-Type": "application/json", "Content-Length": body.length } : {}
    }, r => {
        res.writeHead(r.statusCode, {
            "Content-Type": r.headers["content-type"] || "application/json",
            "Cache-Control": "no-store"
        });
        r.pipe(res);
    });
    up.setTimeout(300000, () => up.destroy(new Error("timeout")));
    up.on("error", e => {
        if (!res.headersSent) json(res, 502, { ok: false, why: "Ollama не отвечает на " + OLLAMA.host + ":" + OLLAMA.port + " (" + (e.code || e.message) + ")" });
        else res.destroy();
    });
    res.on("close", () => { if (!res.writableEnded) up.destroy(); });
    if (body) up.write(body);
    up.end();
}
route("GET", "/api/ollama/(version|tags|ps)", { guests: true }, (req, res, m) => ollama(res, "GET", "/api/" + m[1]));

/* One answer at a time. A laptop CPU generating two answers at once
   gives both late, and the first-word timeout on the page would send
   both to the simulation. So requests wait their turn here, and while
   one waits it hears {"queued": n} every couple of seconds — the page
   shows the place in line and stretches its timeout. The presenter
   (this computer) always goes ahead of the guests.

   Guests: the presenter's model (no loading a second one into memory),
   short answers, one request per phone, at most GUEST_QUEUE waiting. */
const GEN = { busy: false, waiting: [], lastModel: null };
const GUEST_QUEUE = 6;
const guestBusy = new Set();

function nextGen() {
    if (GEN.busy) return;
    const job = GEN.waiting.shift();
    if (!job) return;
    GEN.busy = true;
    GEN.waiting.forEach((j, i) => j.tell(i + 1));
    job.start(() => { GEN.busy = false; nextGen(); });
}

route("POST", "/api/ollama/generate", { guests: true }, async (req, res) => {
    const local = isLocal(req), ip = clientIp(req);
    let body = await readBody(req, local ? 256 * 1024 : 64 * 1024);
    let ask = null;
    try { ask = JSON.parse(body.toString("utf8")); } catch (e) { return json(res, 400, { ok: false, why: "тело запроса — не JSON" }); }

    if (local) GEN.lastModel = ask.model || GEN.lastModel;
    else {
        /* the bench warms the model when it opens: from a phone that is
           the presenter's job, so a guest's warm-up is answered at once */
        if (ask.stream === false && ask.options && ask.options.num_predict <= 1)
            return json(res, 200, { model: ask.model, response: "", done: true });
        if (guestBusy.has(ip)) return json(res, 429, { ok: false, why: "с этого телефона уже идёт запрос — дождитесь ответа" });
        if (GEN.waiting.filter(j => !j.local).length >= GUEST_QUEUE)
            return json(res, 503, { ok: false, why: "очередь ядра заполнена — попробуйте через минуту" });
        if (GEN.lastModel) ask.model = GEN.lastModel;
        ask.options = Object.assign({}, ask.options, { num_predict: Math.min(Number((ask.options || {}).num_predict) || 160, 200) });
        body = Buffer.from(JSON.stringify(ask));
        guestBusy.add(ip);
    }

    let gone = false, timer = 0;
    const job = {
        local,
        tell(n) {                                     // place in line, as an NDJSON line the page understands
            if (gone) return;
            if (!res.headersSent) res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" });
            res.write(JSON.stringify({ queued: n }) + "\n");
        },
        start(done) {
            clearInterval(timer);
            if (gone) return done();
            const up = http.request({
                host: OLLAMA.host, port: OLLAMA.port, method: "POST", path: "/api/generate",
                headers: { "Content-Type": "application/json", "Content-Length": body.length }
            }, r => {
                if (!res.headersSent) res.writeHead(r.statusCode, { "Content-Type": r.headers["content-type"] || "application/json", "Cache-Control": "no-store" });
                /* a closing newline: after queue lines an error body from
                   Ollama has none, and the page reads line by line */
                r.pipe(res, { end: false });
                r.on("end", () => { res.end("\n"); finish(); });
            });
            let ended = false;
            function finish() { if (ended) return; ended = true; done(); }
            up.setTimeout(300000, () => up.destroy(new Error("timeout")));
            up.on("error", e => {
                const why = "Ollama не отвечает на " + OLLAMA.host + ":" + OLLAMA.port + " (" + (e.code || e.message) + ")";
                if (!res.headersSent) json(res, 502, { ok: false, why });
                else if (!res.writableEnded) res.end(JSON.stringify({ error: why }) + "\n");
                finish();
            });
            res.on("close", () => { if (!res.writableEnded) up.destroy(); finish(); });
            up.end(body);
        }
    };
    res.on("close", () => {
        gone = true;
        clearInterval(timer);
        if (!local) guestBusy.delete(ip);
        const i = GEN.waiting.indexOf(job);
        if (i >= 0) { GEN.waiting.splice(i, 1); GEN.waiting.forEach((j, k) => j.tell(k + 1)); }
    });
    /* the presenter jumps the guests, but not other presenter requests */
    if (local) {
        const firstGuest = GEN.waiting.findIndex(j => !j.local);
        GEN.waiting.splice(firstGuest < 0 ? GEN.waiting.length : firstGuest, 0, job);
    } else GEN.waiting.push(job);
    if (GEN.busy) {
        job.tell(GEN.waiting.indexOf(job) + 1);
        timer = setInterval(() => job.tell(GEN.waiting.indexOf(job) + 1), 2500);
    }
    nextGen();
});

/* ---- AI sandbox + demo: Alice's voice without a recording ---------------- */

/* Text that has no take — the sandbox's live reactions, the demo's lines
   on HARD — is read here, in this order:

     1. ElevenLabs: Milly Maple on Eleven v4, the voice and settings the
        recorded Alice uses. Needs the internet and an API key with the
        text_to_speech permission. The key lives OUTSIDE the project —
        %USERPROFILE%\.terminal-shattered\elevenlabs.json { "apiKey": … }
        or ELEVENLABS_API_KEY — so it never ends up on a flash drive, a
        host, or in the page: the browser only ever talks to /api/tts.
     2. Piper (tools/piper/, offline, Russian and English) when ElevenLabs
        is not configured, refuses, or the network is down.
     3. Neither: 503, and the page falls back to speech synthesis.

   Every answer is kept on disk in tools/tts-cache/ (not served), so a
   line said once costs nothing the second time and still sounds right
   with no internet — run the sandbox presets once while online. */

const TTS_DIR = path.join(ROOT, "tools", "tts-cache");
const TTS_CACHE = new Map();

/* ElevenLabs. Settings from the voice's page in ElevenLabs: Stability in
   the middle (Natural), Similarity at the top, Language Auto (so no
   language_code), MP3 44.1 kHz 128 kbps. Clone strength (Low) has no
   field in the public API; low is where the service starts a
   professional clone anyway. Any of it can be overridden in the same
   json: voiceId, model, settings, outputFormat.

   Neikon speaks in the demo with Egor T, set up on the same page with
   the same model and settings — only the voice differs; "neikon":
   { voiceId, voiceName } in the json overrides it. */
const ELEVEN_DEFAULTS = {
    voiceId: "VD1if7jDVYtAKs4P0FIY",            // Milly Maple - Cool and Bright (professional clone)
    voiceName: "Milly Maple - Cool and Bright",
    neikon: { voiceId: "qJBO8ZmKp4te7NTtYgzz", voiceName: "Egor T - Natural, Soothing & Relatable" },  // professional clone
    model: "eleven_v4",
    settings: { stability: 0.5, similarity_boost: 1.0 },
    outputFormat: "mp3_44100_128"
};
const ELEVEN_FILE = path.join(os.homedir(), ".terminal-shattered", "elevenlabs.json");
const eleven = { cooldownUntil: 0, why: "", guestChars: 0 };

/* Guests' new ElevenLabs lines are limited per server run — about a
   dozen reactions — so a room full of phones cannot spend the month's
   credits. After that guests hear Piper; lines already in the cache are
   free for everyone. "guestBudget" in elevenlabs.json changes it. */
function guestBudget(c) {
    const v = Number(process.env.ELEVENLABS_GUEST_BUDGET != null ? process.env.ELEVENLABS_GUEST_BUDGET : c.guestBudget);
    return Number.isFinite(v) && v >= 0 ? v : 3000;
}

/* re-read on every call: a new key in the file works without a restart */
function elevenConfig() {
    let cfg = {};
    try { cfg = JSON.parse(fs.readFileSync(ELEVEN_FILE, "utf8")); } catch (e) {}
    const c = Object.assign({}, ELEVEN_DEFAULTS, cfg);
    c.settings = Object.assign({}, ELEVEN_DEFAULTS.settings, cfg.settings || {});
    c.neikon = Object.assign({}, ELEVEN_DEFAULTS.neikon, cfg.neikon || {});
    c.apiKey = process.env.ELEVENLABS_API_KEY || cfg.apiKey || "";
    if (process.env.ELEVENLABS_VOICE_ID) c.voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (process.env.ELEVENLABS_MODEL) c.model = process.env.ELEVENLABS_MODEL;
    return c;
}

/* Eleven v4 takes its direction from audio tags in square brackets; the
   mood comes from LUCIDITY (sandbox) or from the line's words (demo). */
const MOOD_TAGS = {
    crit:    "[panicked, breathless]",
    loop:    "[disoriented, slow, distant]",
    ok:      "[sigh] [relieved, soft]",
    neutral: ""
};
/* Neikon has one register in the demo: thinking aloud, alone in the dark.
   One word on purpose: "[tired, quiet, thinking aloud]" got a 2.7 s sigh
   from Egor T on v4 and not one word of the line (checked by speech-to-text) */
const NEIKON_TAG = "[quietly]";

/* tag: the audio tag in front of the text ("" for none); voiceId: whose voice */
function elevenSay(c, text, tag, voiceId) {
    const body = JSON.stringify({
        text: (tag ? tag + " " : "") + text,
        model_id: c.model,
        voice_settings: c.settings
    });
    return new Promise((resolve, reject) => {
        const req = require("https").request({
            host: "api.elevenlabs.io", method: "POST",
            path: "/v1/text-to-speech/" + encodeURIComponent(voiceId) + "?output_format=" + encodeURIComponent(c.outputFormat),
            headers: { "xi-api-key": c.apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg",
                       "Content-Length": Buffer.byteLength(body) }
        }, r => {
            const chunks = [];
            r.on("data", d => chunks.push(d));
            r.on("end", () => {
                const buf = Buffer.concat(chunks);
                if (r.statusCode === 200 && buf.length) return resolve(buf);
                let why = "HTTP " + r.statusCode;
                try { const d = JSON.parse(buf.toString("utf8")).detail; why = (d && (d.message || d.status)) || why; } catch (e) {}
                const err = new Error(why);
                err.status = r.statusCode;
                reject(err);
            });
        });
        req.setTimeout(20000, () => req.destroy(new Error("ElevenLabs не ответил за 20 с")));
        req.on("error", reject);
        req.end(body);
    });
}

/* Piper, the offline fallback. It has no emotion switch; what it has is
   pace (length_scale), how loosely the voice is generated (noise_scale),
   how unevenly the sounds are timed (noise_w) and the pause after each
   sentence. Each mood sets those four; the page adds tremor, stutter and
   echo in Web Audio.

   One voice per language, from VOICES in tools/get-piper.js: Russian
   and English. Tajik has none in piper-voices, so a tj line gets 503
   and the page falls back. PIPER_EXE overrides the exe, PIPER_VOICE
   the Russian voice, PIPER_VOICE_EN the English one.

   Piper is not in the repository: when any of it is missing, the
   start-up below fetches it in the background (tools/get-piper.js)
   and piperCheck() switches the voices on once the files are in — no
   restart. --no-piper-download skips that; start.bat / start.sh pass
   it, they have already checked and fetched Piper before the server. */
const getPiper = require("./tools/get-piper");
const PIPER = {};
function piperCheck() {
    const p = getPiper.paths();
    const exe = process.env.PIPER_EXE || p.exe;
    const voices = {};
    if (fs.existsSync(exe)) Object.keys(p.voices).forEach(l => {
        const voice = process.env[l === "ru" ? "PIPER_VOICE" : "PIPER_VOICE_" + l.toUpperCase()] || p.voices[l].voice;
        if (!fs.existsSync(voice)) return;
        let rate = 22050;
        try { rate = JSON.parse(fs.readFileSync(voice + ".json", "utf8")).audio.sample_rate || rate; } catch (e) {}
        voices[l] = { voice, rate, name: path.basename(voice, ".onnx") };
    });
    Object.assign(PIPER, { exe, voices, ok: Object.keys(voices).length > 0 });
}
piperCheck();
/* no Piper build that runs on macOS (tools/get-piper.js, build()) — nothing
   to fetch there; paths set by hand are the presenter's own business */
const PIPER_FETCH = !getPiper.present() && !Object.keys(process.env).some(k => /^PIPER_(EXE|VOICE)/.test(k)) &&
                    !args.includes("--no-piper-download") && getPiper.supported();
function fetchPiper() {
    console.log("  Piper: " + (PIPER.ok ? "не хватает голосов — докачиваю" : "офлайн-голоса нет — качаю") +
                " в фоне (до ~145 МБ, один раз); презентация уже работает");
    getPiper.ensurePiper(m => console.log("  " + m)).then(r => {
        piperCheck();
        const langs = Object.keys(PIPER.voices).join(", ");
        console.log(r.ok ? "  Piper готов — офлайн-голос: " + langs
                         : "  Piper не скачан: " + r.why + " (повторю при следующем запуске; вручную: node tools/get-piper.js)" +
                           (PIPER.ok ? "; пока читает " + langs : ""));
    });
}

const MOODS = {
    /* panic: fast, unsteady, barely a breath between sentences */
    crit:    { length_scale: 0.86, noise_scale: 0.95, noise_w: 1.15, sentence_silence: 0.12 },
    /* stuck in a loop: slow, flat, long gaps */
    loop:    { length_scale: 1.2,  noise_scale: 0.5,  noise_w: 0.55, sentence_silence: 0.55 },
    /* relief: unhurried and even */
    ok:      { length_scale: 1.06, noise_scale: 0.6,  noise_w: 0.7,  sentence_silence: 0.38 },
    neutral: { length_scale: 1.0,  noise_scale: 0.667, noise_w: 0.8, sentence_silence: 0.25 }
};
let ttsQueue = Promise.resolve();

function wav(pcm, rate) {
    const h = Buffer.alloc(44);
    h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
    h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
    h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
}

/* v: PIPER.voices[lang] */
function piperSay(text, mood, v) {
    const m = MOODS[mood] || MOODS.neutral;
    const args = ["--model", v.voice, "--output_raw", "--quiet"];
    Object.keys(m).forEach(k => args.push("--" + k, String(m[k])));
    return new Promise((resolve, reject) => {
        const p = spawn(PIPER.exe, args, { cwd: path.dirname(PIPER.exe), windowsHide: true });
        const out = [], err = [];
        const kill = setTimeout(() => p.kill(), 30000);
        p.stdout.on("data", c => out.push(c));
        p.stderr.on("data", c => err.push(c));
        p.on("error", e => { clearTimeout(kill); reject(e); });
        p.on("close", code => {
            clearTimeout(kill);
            const pcm = Buffer.concat(out);
            if (code !== 0 || !pcm.length) return reject(new Error("piper: " + (Buffer.concat(err).toString("utf8").trim().slice(-300) || "код " + code)));
            resolve(wav(pcm, v.rate));
        });
        p.stdin.end(text.replace(/\s+/g, " ").trim() + "\n", "utf8");
    });
}

function ttsKey(parts) { return crypto.createHash("sha1").update(parts.join("|")).digest("hex"); }
function cached(key, ext) {
    if (TTS_CACHE.has(key)) return TTS_CACHE.get(key);
    const f = path.join(TTS_DIR, key + "." + ext);
    if (!fs.existsSync(f)) return null;
    const hit = { buf: fs.readFileSync(f), ext };
    TTS_CACHE.set(key, hit);
    return hit;
}
function keep(key, buf, ext) {
    const hit = { buf, ext };
    TTS_CACHE.set(key, hit);
    if (TTS_CACHE.size > 60) TTS_CACHE.delete(TTS_CACHE.keys().next().value);
    try { fs.mkdirSync(TTS_DIR, { recursive: true }); fs.writeFileSync(path.join(TTS_DIR, key + "." + ext), buf); } catch (e) {}
    return hit;
}

const ttsBusy = new Set();                      // guests: one line at a time per phone

route("GET", "/api/tts/info", { guests: true }, (req, res) => {
    const c = elevenConfig();
    const guest = !isLocal(req), spent = guest && eleven.guestChars >= guestBudget(c);
    json(res, 200, {
        ok: true,
        elevenlabs: { configured: !!c.apiKey, voice: c.voiceName, neikonVoice: c.neikon.voiceName, model: c.model,
                      paused: Date.now() < eleven.cooldownUntil || spent,
                      why: spent ? "лимит для гостей исчерпан" : (eleven.why || null) },
        piper: PIPER.ok,
        piperVoices: Object.fromEntries(Object.keys(PIPER.voices).map(l => [l, PIPER.voices[l].name])),   // { ru: "ru_RU-irina-medium", en: … }
        moods: Object.keys(MOOD_TAGS)
    });
});

route("POST", "/api/tts", { guests: true }, async (req, res) => {
    const guest = !isLocal(req), ip = clientIp(req);
    if (guest && ttsBusy.has(ip)) return json(res, 429, { ok: false, why: "этот телефон уже ждёт голос" });
    if (guest) ttsBusy.add(ip);
    try { await speakFor(req, res, guest); }
    finally { if (guest) ttsBusy.delete(ip); }
});

async function speakFor(req, res, guest) {
    const body = await readJsonBody(req);
    const text = String(body.text || "").slice(0, guest ? 600 : 1200).trim();
    const mood = MOOD_TAGS[body.mood] !== undefined ? body.mood : "neutral";
    const lang = String(body.lang || "ru");
    /* "alice" (default) | "neikon" — the demo's thoughts, with his own voice and tag */
    const neikon = body.speaker === "neikon";
    /* "auto" (default) | "elevenlabs" — asked for by name, so tried even
       during the pause after an error | "piper" — skip ElevenLabs */
    const engine = body.engine === "elevenlabs" || body.engine === "piper" ? body.engine : "auto";
    if (!text) return json(res, 400, { ok: false, why: "нет текста" });
    let note = "";

    const c = elevenConfig();
    if (engine === "piper") note = "";
    else if (c.apiKey) {
        /* Alice's key stays what it was, so her cached lines stay valid;
           Neikon's carries his tag, so a new tag is not served from old takes */
        const key = neikon ? ttsKey(["eleven", c.neikon.voiceId, c.model, JSON.stringify(c.settings), c.outputFormat, NEIKON_TAG, text])
                           : ttsKey(["eleven", c.voiceId, c.model, JSON.stringify(c.settings), c.outputFormat, mood, text]);
        let hit = cached(key, "mp3");
        const overBudget = guest && eleven.guestChars + text.length > guestBudget(c);
        if (!hit && !overBudget && (engine === "elevenlabs" || Date.now() >= eleven.cooldownUntil)) {
            try {
                hit = keep(key, await (neikon ? elevenSay(c, text, NEIKON_TAG, c.neikon.voiceId)
                                              : elevenSay(c, text, MOOD_TAGS[mood], c.voiceId)), "mp3");
                if (guest) eleven.guestChars += text.length;
                eleven.why = "";
            } catch (e) {
                /* a refusal is not retried for 5 minutes, a network failure
                   for one — otherwise every line would wait for it first */
                eleven.why = e.message;
                eleven.cooldownUntil = Date.now() + (e.status === 401 || e.status === 403 ? 300000 : 60000);
                console.log("  ElevenLabs: " + e.message + (neikon ? " — Нейкон пока молчит" : " — голос Элис пока через Piper"));
            }
        }
        if (hit) return sendAudio(res, hit, "elevenlabs", "");
        note = "ElevenLabs: " + (overBudget ? "лимит для гостей исчерпан" : eleven.why || "пауза после ошибки");
    } else note = "ElevenLabs: ключ не задан";

    /* Neikon has ElevenLabs only: both Piper voices are female, and a wrong
       voice is worse than the silent text he had before */
    if (neikon) return json(res, 503, { ok: false, why: [note, "у Нейкона нет офлайн-голоса"].filter(Boolean).join("; ") });

    /* Piper reads the languages it has a voice for; anything else goes back to the page */
    const v = PIPER.voices[lang];
    if (!v) return json(res, 503, { ok: false, why: [note, PIPER.ok ? "у Piper нет голоса для «" + lang + "»" : "Piper не найден"].filter(Boolean).join("; ") });
    const key = ttsKey(["piper", v.name, mood, text]);
    let hit = cached(key, "wav");
    if (!hit) {
        /* one Piper at a time: two at once on a laptop CPU are both slow,
           and the model is busy answering in the meantime anyway */
        const job = ttsQueue.then(() => piperSay(text, mood, v));
        ttsQueue = job.catch(() => {});
        hit = keep(key, await job, "wav");
    }
    sendAudio(res, hit, "piper", note);
}

function sendAudio(res, hit, engine, note) {
    res.writeHead(200, {
        "Content-Type": hit.ext === "mp3" ? "audio/mpeg" : "audio/wav",
        "Content-Length": hit.buf.length,
        "Cache-Control": "no-store",
        "X-TTS-Engine": engine,
        "X-TTS-Note": encodeURIComponent(note || "")
    });
    res.end(hit.buf);
}

async function handleApi(req, res, pathname, q) {
    for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(pathname);
        if (!m) continue;
        if (r.local && !isLocal(req))
            return json(res, 403, { ok: false, why: "студия работает только на компьютере, где запущен сервер" });
        if (r.guests && !isLocal(req) && !(GUESTS && isLan(req)))
            return json(res, 403, { ok: false, why: "полигон и голос открыты только для устройств в этой Wi-Fi сети" });
        try { return await r.fn(req, res, m, q); }
        catch (e) {
            const code = e.status || 500;
            if (code >= 500) console.error("  ошибка: " + e.message);
            return json(res, code, { ok: false, why: e.message });
        }
    }
    json(res, 404, { ok: false, why: "нет такого адреса" });
}

/* ---- server -------------------------------------------------------------- */

const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://localhost");
    const p = u.pathname;
    if (p.startsWith("/api/tts")) {
        const cors = corsFor(req);
        if (cors) Object.keys(cors).forEach(k => res.setHeader(k, cors[k]));
        if (req.method === "OPTIONS") {
            if (!cors || !isLocal(req)) return send(res, 403, "forbidden");
            res.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST",
                                 "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" });
            return res.end();
        }
    }
    if (p.startsWith("/api/")) return handleApi(req, res, p, u.searchParams);
    if (p === "/qr") return sendQrPage(res);
    /* the Piper binary and its 63 MB voice are server-side tools, not page assets */
    if (p.startsWith("/tools/")) return send(res, 404, "not found");
    if (p === "/studio.html" && !isLocal(req))
        return send(res, 403, "Студия озвучки открывается только на компьютере, где запущен сервер.");
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "method not allowed");
    serveStatic(req, res, p);
});

/* ---- the link for the jury's phones -------------------------------------- */

/* https://192-168-1-5.local-ip.sh/ — a real name with a real certificate.

   Why not a bare http address: Chrome 154 (October 2026) stops before
   public HTTP sites, phone QR scanners do not all treat a bare IP as a
   link, and getUserMedia and friends want a secure page anyway.

   How: local-ip.sh is a public DNS name that answers 192-168-1-5.local-ip.sh
   with 192.168.1.5, and publishes a Let's Encrypt wildcard certificate
   for *.local-ip.sh together with its private key. The key being public
   is the price: anyone could pose as *.local-ip.sh, so nothing secret may
   travel this way — and nothing does: the deck is public, the
   ElevenLabs key never leaves this server. Fine for a demo on a LAN, not
   for a product.

   The two files live in tools/https/ (tools/ is never served). They are
   fetched when missing or with less than 14 days left, and checked: the
   name must be *.local-ip.sh and the key must fit the certificate.
   Phones need internet to resolve the name, as they did with nip.io.
   Anything missing — no internet, a refused download, :443 and :8443
   both busy — and the link falls back to plain http on the LAN address.
   --no-https skips all of it; --nip uses http://<ip>.nip.io instead. */
const USE_NIP = args.includes("--nip");
const USE_HTTPS = !args.includes("--no-https") && !USE_NIP;
const TLS_DIR = path.join(ROOT, "tools", "https");
const TLS_SRC = "https://local-ip.sh/";
const JURY = { port80: false, url: null, tls: null, httpsPort: 0 };

function juryLink(useNip, ip) {
    const lan = ip || lanAddress();
    if (!lan) return null;
    return "http://" + lan + (useNip ? ".nip.io" : "") + (JURY.port80 ? "" : ":" + PORT) + "/";
}

/* The link is worked out when asked, not once at start: switch the
   laptop to a phone's hotspot (172.20.10.x on an iPhone, 192.168.43.x
   on Android) and /qr shows the new address at once. The certificate
   is for *.local-ip.sh — any address — so it does not care which
   network it is. A name is checked once a minute. */
const DNS_SEEN = new Map();
async function juryUrlFor(ip) {
    if (JURY.tls && JURY.httpsPort) {
        const host = ip.replace(/\./g, "-") + ".local-ip.sh";
        let seen = DNS_SEEN.get(host);
        if (!seen || Date.now() - seen.at > 60000) { seen = { ok: await resolvesTo(host, ip), at: Date.now() }; DNS_SEEN.set(host, seen); }
        if (seen.ok) return "https://" + host + (JURY.httpsPort === 443 ? "" : ":" + JURY.httpsPort) + "/";
    }
    return juryLink(USE_NIP && await checkNip(ip), ip);
}
/* every network the laptop is on, the first being the one /qr shows big */
async function juryLinks() {
    const out = [];
    for (const n of lanAddresses()) out.push({ name: n.name, ip: n.address, url: await juryUrlFor(n.address) });
    JURY.url = out.length ? out[0].url : null;
    return out;
}
function resolvesTo(host, ip) {
    return new Promise(resolve => {
        const t = setTimeout(() => resolve(false), 1500);
        require("dns").lookup(host, (err, addr) => { clearTimeout(t); resolve(!err && addr === ip); });
    });
}
const checkNip = ip => resolvesTo(ip + ".nip.io", ip);

function fetchText(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, r => {
            if (r.statusCode !== 200) { r.resume(); return reject(new Error(url + " → HTTP " + r.statusCode)); }
            const chunks = [];
            r.on("data", c => chunks.push(c));
            r.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });
        req.setTimeout(10000, () => req.destroy(new Error(url + " не ответил за 10 с")));
        req.on("error", reject);
    });
}

/* -> { cert, key, validTo } that fits *.local-ip.sh, or null */
function readTls(cert, key) {
    try {
        const x = new crypto.X509Certificate(cert);
        if (!/DNS:\*\.local-ip\.sh\b/.test(x.subjectAltName || "")) return null;
        if (!x.checkPrivateKey(crypto.createPrivateKey(key))) return null;
        const validTo = new Date(x.validTo);
        return validTo > new Date() ? { cert, key, validTo } : null;
    } catch (e) { return null; }
}
async function ensureTls() {
    const certFile = path.join(TLS_DIR, "server.pem"), keyFile = path.join(TLS_DIR, "server.key");
    let have = null;
    try { have = readTls(fs.readFileSync(certFile, "utf8"), fs.readFileSync(keyFile, "utf8")); } catch (e) {}
    if (have && have.validTo - Date.now() > 14 * 864e5) return have;
    try {
        const [cert, key] = await Promise.all([fetchText(TLS_SRC + "server.pem"), fetchText(TLS_SRC + "server.key")]);
        const fresh = readTls(cert, key);
        if (fresh) {
            fs.mkdirSync(TLS_DIR, { recursive: true });
            fs.writeFileSync(certFile, cert); fs.writeFileSync(keyFile, key);
            return fresh;
        }
        console.log("  HTTPS: local-ip.sh отдал сертификат, который не подходит — оставляю http");
    } catch (e) {
        if (!have) console.log("  HTTPS: не скачался сертификат (" + e.message + ") — ссылка для телефонов будет http");
    }
    return have;                                   // an older one still valid beats none
}
function listenHttps(tls) {
    const handler = server.listeners("request")[0];
    const tryPort = port => new Promise(resolve => {
        const s443 = https.createServer({ cert: tls.cert, key: tls.key }, handler);
        s443.once("error", () => resolve(0));
        s443.listen(port, "0.0.0.0", () => resolve(port));
    });
    return tryPort(443).then(p => p || tryPort(8443));
}

route("GET", "/api/lan", {}, async (req, res) => {
    const links = await juryLinks();
    json(res, 200, { ok: links.length > 0, url: JURY.url, links });
});

async function sendQrPage(res) {
    const links = await juryLinks();
    if (!links.length) return send(res, 503, "У этого компьютера нет адреса в локальной сети — подключите его к Wi-Fi или к точке доступа телефона и обновите страницу.");
    const main = links[0], others = links.slice(1);
    const card = (l, big) => `<figure class="${big ? "main" : "alt"}"><div class="code">${qr.toSvg(qr.encode(l.url))}</div>
      <figcaption><b>${l.url}</b><span>${l.name} · ${l.ip}</span></figcaption></figure>`;
    send(res, 200, `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>QR · TERMINAL: SHATTERED</title>
<style>
  html, body { margin: 0; min-height: 100%; background: #030507; color: #dff4f2; font-family: "Courier New", monospace; }
  main { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 24px; box-sizing: border-box; text-align: center; }
  h1 { margin: 0; font-size: clamp(16px, 2.6vw, 26px); letter-spacing: 0.2em; color: #7ecfc4; font-weight: normal; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .code { background: #fff; padding: 12px; box-shadow: 0 0 40px rgba(126, 207, 196, 0.35); }
  .main .code { width: min(62vh, 86vw); }
  .alt .code { width: min(22vh, 40vw); padding: 6px; }
  .code svg { display: block; width: 100%; height: auto; }
  figcaption b { display: block; font-size: clamp(14px, 2vw, 22px); letter-spacing: 0.04em; word-break: break-all; font-weight: normal; }
  figcaption span { display: block; margin-top: 4px; font-size: 12px; opacity: 0.55; letter-spacing: 0.1em; }
  .alt figcaption b { font-size: 13px; }
  .others { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; margin-top: 8px; }
  .others p { flex-basis: 100%; margin: 0; font-size: 12px; opacity: 0.6; letter-spacing: 0.1em; }
  small { opacity: 0.6; letter-spacing: 0.1em; line-height: 1.6; }
</style></head><body><main>
  <h1>// ОТСКАНИРУЙТЕ — ДЕМКА НА ТЕЛЕФОНЕ</h1>
  ${card(main, true)}
  <small>телефон — в той же сети, что и этот ноутбук${main.url.startsWith("https:") ? " · защищённое подключение" : ""}</small>
  ${others.length ? '<div class="others"><p>ноутбук ещё в этих сетях — если телефоны подключены к ним:</p>' + others.map(l => card(l, false)).join("") + "</div>" : ""}
</main></body></html>`, "text/html; charset=utf-8");
}

/* Prefer the ordinary home/office ranges: a VPN adapter (Tailscale and
   friends hand out 100.x) is listed too, and a laptop on the same Wi-Fi
   cannot reach that one. */
function lanAddresses() {
    const nets = os.networkInterfaces();
    const lan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;
    const virtual = /tailscale|zerotier|vethernet|virtualbox|vmware|hyper-v|wsl|docker|vpn|loopback|bluetooth/i;
    const out = [];
    Object.keys(nets).forEach(name => (nets[name] || []).forEach(n => {
        if (n.family === "IPv4" && !n.internal && lan.test(n.address) && !virtual.test(name)) out.push({ name, address: n.address });
    }));
    return out;
}
function lanAddress() {
    const l = lanAddresses();
    return l.length ? l[0].address : null;
}

function openBrowser(target) {
    const cmd = process.platform === "win32" ? 'start "" "' + target + '"'
              : process.platform === "darwin" ? 'open "' + target + '"'
              : 'xdg-open "' + target + '"';
    exec(cmd, () => {});
}

server.on("error", err => {
    if (err.code === "EADDRINUSE") {
        console.log("\n  Порт " + PORT + " уже занят — скорее всего, сервер уже запущен в другом окне.");
        console.log("  Презентация: http://localhost:" + PORT + "/\n");
        if (OPEN) openBrowser("http://localhost:" + PORT + "/");
        setTimeout(() => process.exit(0), 300);
        return;
    }
    console.error(err);
    process.exit(1);
});

/* :80 as well, so the phones' link has no port. Busy (another web
   server, Skype of old) or not allowed (Linux/macOS without root) —
   then the link simply carries :8779. */
function listen80() {
    return new Promise(resolve => {
        if (PORT === 80) { JURY.port80 = true; return resolve(); }
        const s80 = http.createServer(server.listeners("request")[0]);
        s80.once("error", () => resolve());
        s80.listen(80, "0.0.0.0", () => { JURY.port80 = true; resolve(); });
    });
}

server.listen(PORT, "0.0.0.0", async () => {
    const r = lib.writeManifest();          // fresh on start: files may have been copied in by hand
    await listen80();
    /* HTTPS whenever there is a certificate — even offline at start:
       the name may resolve later, and the link is worked out when asked */
    if (USE_HTTPS) {
        const tls = await ensureTls();
        const port = tls ? await listenHttps(tls) : 0;
        if (port) { JURY.tls = tls; JURY.httpsPort = port; }
    }
    const links = await juryLinks();
    if (JURY.tls && JURY.url && !JURY.url.startsWith("https:"))
        console.log("  HTTPS: имя *.local-ip.sh пока не находится (нет интернета?) — ссылка http; /qr переключится сама");
    const local = "http://localhost" + (JURY.port80 ? "" : ":" + PORT) + "/";
    const line = "=".repeat(64);
    console.log(line);
    console.log("  TERMINAL: SHATTERED · презентация, студия, голос, полигон");
    console.log(line);
    console.log("  ПРЕЗЕНТАЦИЯ:            " + local);
    console.log("  СТУДИЯ ОЗВУЧКИ:         " + local + "studio.html");
    if (JURY.url) {
        console.log("  ДЛЯ ТЕЛЕФОНОВ ЖЮРИ:     " + JURY.url + "   (та же Wi-Fi сеть)");
        if (JURY.tls) console.log("  сертификат:             *.local-ip.sh, действует до " + JURY.tls.validTo.toISOString().slice(0, 10));
        links.slice(1).forEach(l => console.log("  другая сеть (" + l.name + "): " + l.url));
        console.log("  сменили сеть (точка доступа телефона) — откройте /qr: ссылка пересчитается сама");
        console.log("  QR на весь экран:       " + local + "qr");
        console.log("");
        console.log(qr.toConsole(qr.encode(JURY.url)));
        console.log("");
    }
    const c = elevenConfig();
    console.log("  голос Элис без записи:  " + (c.apiKey ? "ElevenLabs (Milly Maple, " + c.model + ")" : "ElevenLabs не настроен") +
                (PIPER.ok ? " → Piper офлайн: " + Object.keys(PIPER.voices).join(", ") : "") +
                (PIPER_FETCH ? (PIPER.ok ? ", остальное докачивается" : " → Piper качается") : ""));
    console.log("  голос Нейкона в демо:   " + (c.apiKey ? "ElevenLabs (" + c.neikon.voiceName.split(" - ")[0] + ", " + c.model + ")" : "молчит — нужен ключ ElevenLabs"));
    console.log("  гости по QR:            " + (GUESTS ? "полигон и голос открыты (ElevenLabs — до " + guestBudget(c) + " символов)" : "закрыто (--no-guests)"));
    console.log("  записей в студии:       " + r.count + (r.inline ? " (вшиты)" : ""));
    if (r.unknown.length) console.log("  не распознаны по имени: " + r.unknown.join(", "));
    console.log("  окно не закрывать. остановить — Ctrl+C");
    console.log(line);
    if (OPEN) openBrowser(local);
    if (PIPER_FETCH) fetchPiper();
});
