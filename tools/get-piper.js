/* ============================================================
   TERMINAL: SHATTERED — Piper downloader
   ------------------------------------------------------------
   Piper (the offline fallback voice, ~145 MB to download, ~160 MB
   on disk) is not kept in the repository. start.bat / start.sh run
   this file before the server; serve.js started by hand calls
   ensurePiper() itself when something is missing, and the voice turns
   on once the files are in; by hand:

       node tools/get-piper.js

   What it fetches, into the layout serve.js looks for:
     tools/piper/piper/        the Piper 1.2.0 build for this OS
                               (github.com/rhasspy/piper, release
                               2023.11.14-2), unpacked with `tar` and
                               test-started; Windows and Linux only —
                               see build() for why not macOS
     tools/piper/voices/       one .onnx + .onnx.json per language in
                               VOICES (huggingface.co/rhasspy/piper-voices)

   Each file goes to <name>.part first and is renamed only when the
   byte count matches Content-Length, so a dropped connection leaves
   nothing that looks finished; the next start fetches it again.
   Parts already in place are skipped. A lock file stops a second
   server started at the same time from downloading in parallel.

   No dependencies: Node 18+ for fetch; `tar` unpacks the archive —
   it ships with Windows 10 (1803) and later, macOS and Linux, and
   the Windows one reads .zip too.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Readable } = require("stream");

const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "tools", "piper");
const RELEASE = "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/";
const VOICE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/";
/* A voice for every deck language piper-voices has one for: Russian and
   English. Tajik has none — on tj Alice stays ElevenLabs or the browser.
   Both female, medium quality, 22050 Hz; test is the launchers' phrase */
const VOICES = {
    ru: { file: "ru_RU-irina-medium.onnx",  dir: "ru/ru_RU/irina/medium/",  test: "Проверка." },
    en: { file: "en_US-lessac-medium.onnx", dir: "en/en_US/lessac/medium/", test: "Voice check." }
};
const LOCK = path.join(DIR, ".downloading");
const LOCK_STALE_MS = 30 * 60 * 1000;     // a lock older than this is a crashed run

/* The build for this machine, or null where there is none that runs.
   macOS is left out on purpose: the macOS archives of this release
   carry no .dylib files (only a dSYM debug bundle), so the binary stops
   at "Library not loaded" — checked by listing piper_macos_aarch64.tar.gz.
   On a Mac the voice stays ElevenLabs, then the browser's speech. */
function build() {
    const key = process.platform + "-" + process.arch;
    return {
        "win32-x64":    "piper_windows_amd64.zip",
        "linux-x64":    "piper_linux_x86_64.tar.gz",
        "linux-arm64":  "piper_linux_aarch64.tar.gz",
        "linux-arm":    "piper_linux_armv7l.tar.gz"
    }[key] || null;
}

/* the unpacked binary must actually start — a build that cannot load its
   libraries would otherwise pass for installed and fail on every phrase */
function runs(exe) {
    return new Promise(function (resolve) {
        let err = "", p;
        /* a file the OS cannot execute at all throws here, not via "error" */
        try { p = spawn(exe, ["--version"], { cwd: path.dirname(exe), windowsHide: true }); }
        catch (e) { resolve(e.code || e.message); return; }
        const timer = setTimeout(function () { try { p.kill(); } catch (e) {} resolve("не ответил за 15 с"); }, 15000);
        p.stderr.on("data", function (d) { err += d; });
        p.on("error", function (e) { clearTimeout(timer); resolve(e.code || e.message); });
        p.on("close", function (code) { clearTimeout(timer); resolve(code === 0 ? "" : (err.trim().split("\n").pop() || "код " + code)); });
    });
}

/* { exe, voices: { ru: { voice, json }, en: … } } — where serve.js looks */
function paths() {
    const voices = {};
    Object.keys(VOICES).forEach(function (l) {
        const voice = path.join(DIR, "voices", VOICES[l].file);
        voices[l] = { voice: voice, json: voice + ".json" };
    });
    return { exe: path.join(DIR, "piper", process.platform === "win32" ? "piper.exe" : "piper"), voices: voices };
}

/* the languages whose voice is on disk next to the exe */
function have() {
    const p = paths();
    if (!fs.existsSync(p.exe)) return [];
    return Object.keys(p.voices).filter(function (l) { return fs.existsSync(p.voices[l].voice) && fs.existsSync(p.voices[l].json); });
}

function present() { return have().length === Object.keys(VOICES).length; }

function mb(n) { return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + " МБ"; }

/* url -> file, through <file>.part; progress(label, got, total) at most
   every ~10 % so a slow link does not flood the console */
async function download(url, file, label, log) {
    const part = file + ".part";
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok || !r.body) throw new Error(label + ": HTTP " + r.status);
    const total = Number(r.headers.get("content-length")) || 0;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const out = fs.createWriteStream(part);
    let got = 0, shown = -1;
    await new Promise(function (resolve, reject) {
        const src = Readable.fromWeb(r.body);
        src.on("data", function (chunk) {
            got += chunk.length;
            const step = total ? Math.floor(got / total * 10) : -1;
            if (step > shown) { shown = step; log(label + ": " + mb(got) + (total ? " из " + mb(total) : "")); }
        });
        src.on("error", reject);
        out.on("error", reject);
        out.on("finish", resolve);
        src.pipe(out);
    });
    if (total && got !== total) { fs.rmSync(part, { force: true }); throw new Error(label + ": оборвалось на " + mb(got) + " из " + mb(total)); }
    fs.renameSync(part, file);
}

/* On Windows only the system's own bsdtar reads .zip. A GNU tar from Git
   or MSYS that comes first in PATH (Git Bash, a VS Code bash terminal)
   takes "C:\…" for a remote host and stops at "Cannot connect to C:". */
function tarExe() {
    if (process.platform !== "win32") return "tar";
    const own = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
    return fs.existsSync(own) ? own : "tar";
}

function untar(archive, into) {
    return new Promise(function (resolve, reject) {
        const p = spawn(tarExe(), ["-xf", archive, "-C", into], { windowsHide: true });
        let err = "";
        p.stderr.on("data", function (d) { err += d; });
        p.on("error", function (e) { reject(new Error("tar не найден: " + e.message)); });
        p.on("close", function (code) { code === 0 ? resolve() : reject(new Error("tar: " + (err.trim() || "код " + code))); });
    });
}

function takeLock() {
    try {
        const st = fs.statSync(LOCK);
        if (Date.now() - st.mtimeMs < LOCK_STALE_MS) return false;   // another run is at it
    } catch (e) {}
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(LOCK, String(process.pid));
    return true;
}
function dropLock() { try { fs.rmSync(LOCK, { force: true }); } catch (e) {} }

/* -> { ok: true } when everything is in place (now or already),
      { ok: false, why } otherwise. Never throws. */
async function ensurePiper(log) {
    log = log || function () {};
    if (present()) return { ok: true };
    const asset = build();
    if (!asset) return { ok: false, why: process.platform === "darwin"
        ? "у Piper 1.2.0 сборка для macOS вышла без библиотек — на Mac офлайн-голоса нет, остаются ElevenLabs и голос браузера"
        : "для " + process.platform + "-" + process.arch + " у Piper нет сборки" };
    if (typeof fetch !== "function") return { ok: false, why: "нужен Node.js 18 или новее" };
    if (!takeLock()) return { ok: false, why: "уже качается другим запуском" };
    const p = paths();
    try {
        if (!fs.existsSync(p.exe)) {
            const archive = path.join(DIR, asset);
            await download(RELEASE + asset, archive, "Piper", log);
            log("Piper: распаковка…");
            await untar(archive, DIR);
            fs.rmSync(archive, { force: true });
            if (!fs.existsSync(p.exe)) throw new Error("в архиве нет " + path.relative(DIR, p.exe));
            if (process.platform !== "win32") fs.chmodSync(p.exe, 0o755);
            const broken = await runs(p.exe);
            if (broken) {
                fs.rmSync(path.dirname(p.exe), { recursive: true, force: true });
                throw new Error("Piper не запускается на этой машине (" + broken + ") — сборка удалена");
            }
        }
        for (const l of Object.keys(VOICES)) {
            const v = p.voices[l], url = VOICE_URL + VOICES[l].dir + VOICES[l].file;
            if (!fs.existsSync(v.json)) await download(url + ".json", v.json, "голос " + l + " (описание)", log);
            if (!fs.existsSync(v.voice)) await download(url, v.voice, "голос " + l, log);
        }
        return { ok: present() };
    } catch (e) {
        return { ok: false, why: e.message };
    } finally {
        dropLock();
    }
}

/* whether this machine has a Piper build worth fetching at all */
function supported() { return !!build(); }

/* one short phrase through the voice of lang, under a second: the
   launchers' check. runs() only proves the exe starts; this also loads
   the model. "" when audio came out, otherwise the reason */
function speaks(lang) {
    const p = paths();
    return new Promise(function (resolve) {
        let got = 0, err = "", proc;
        try { proc = spawn(p.exe, ["--model", p.voices[lang].voice, "--output_raw", "--quiet"], { cwd: path.dirname(p.exe), windowsHide: true }); }
        catch (e) { resolve(e.code || e.message); return; }
        const timer = setTimeout(function () { try { proc.kill(); } catch (e) {} resolve("не ответил за 15 с"); }, 15000);
        proc.stdout.on("data", function (d) { got += d.length; });
        proc.stderr.on("data", function (d) { err += d; });
        proc.stdin.on("error", function () {});
        proc.on("error", function (e) { clearTimeout(timer); resolve(e.code || e.message); });
        proc.on("close", function (code) { clearTimeout(timer); resolve(code === 0 && got ? "" : (err.trim().split("\n").pop() || "код " + code)); });
        proc.stdin.end(VOICES[lang].test + "\n", "utf8");
    });
}

module.exports = { VOICES, ensurePiper, present, have, paths, supported, runs, speaks };

/* node tools/get-piper.js — what start.bat / start.sh run before the
   server: already in place → a test phrase per voice; something missing
   → download it, then the phrases. Exit 1 unless every voice reads; the
   launchers go on either way */
if (require.main === module) {
    const missing = Object.keys(VOICES).filter(function (l) { return have().indexOf(l) < 0; });
    if (missing.length && supported())
        console.log("  Piper: " + (fs.existsSync(paths().exe) ? "нет голоса " + missing.join(", ") + " — докачиваю (~60 МБ на голос)"
                                                              : "офлайн-голоса нет — качаю (~145 МБ, один раз)"));
    ensurePiper(function (m) { console.log("  " + m); }).then(async function (r) {
        const reads = [], fails = [];
        for (const l of have()) { const why = await speaks(l); if (why) fails.push(l + ": " + why); else reads.push(l); }
        if (!r.ok) console.log("  Piper не скачан: " + r.why);
        fails.forEach(function (f) { console.log("  Piper не прочитал пробную фразу, " + f); });
        if (reads.length) console.log("  Piper готов: " + path.relative(ROOT, DIR) + ", пробная фраза прочитана: " + reads.join(", "));
        process.exit(r.ok && !fails.length ? 0 : 1);
    });
}
