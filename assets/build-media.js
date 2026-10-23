/* ============================================================
   TERMINAL: SHATTERED — web media builder (slow-link friendly)
   ------------------------------------------------------------
       node assets/build-media.js            build what is missing or stale
       node assets/build-media.js --force    rebuild everything

   Masters stay untouched; the deck plays light copies built from
   them. The deck is opened from a QR code over Tajik mobile links,
   where every megabyte is seconds of a judge staring at nothing.

   AUDIO   assets/audio/<lang>/masters/<id>.mp3   original, full quality
        →  assets/audio/<lang>/<id>.mp3           64 kbps mono, no tags
           Speech from ElevenLabs is mono 44.1 kHz; 64 kbps is past the
           point where anyone hears a difference in a voice, and halves
           every file. The masters are what the studio hands out as
           «исходные» — that is the set to train an RVC model on.

   VIDEO   assets/video/classroom_trial.mp4       original (720×1280, 60 fps)
        →  classroom_trial.540.mp4                540×960, 30 fps, ~1 Mbit/s
        →  classroom_trial.360.mp4                360×640, 30 fps, ~0.45 Mbit/s
        →  classroom_trial.poster.jpg             first frame the player shows
           All with the index (moov) at the front, so playback starts
           after the first few kilobytes instead of after the whole file.
           The overlay picks a variant from the link speed it measures.

   Needs ffmpeg on PATH.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const FORCE = process.argv.includes("--force");
const AUDIO = path.join(ROOT, "assets", "audio");
const VIDEO = path.join(ROOT, "assets", "video");

function stale(src, out) {
    if (FORCE || !fs.existsSync(out)) return true;
    return fs.statSync(out).mtimeMs < fs.statSync(src).mtimeMs;
}
function ff(args) { execFileSync("ffmpeg", ["-v", "error", "-y"].concat(args), { stdio: "inherit" }); }
const kb = f => (fs.statSync(f).size / 1024).toFixed(0).padStart(6) + " КБ";

/* ---- audio ---------------------------------------------------------- */
let built = 0;
if (fs.existsSync(AUDIO)) {
    fs.readdirSync(AUDIO).forEach(lang => {
        const masters = path.join(AUDIO, lang, "masters");
        if (!fs.existsSync(masters)) return;
        /* deck.* lines go into the bundle below, not into loose files */
        fs.readdirSync(masters).filter(f => /\.(mp3|wav|flac|m4a|ogg|webm)$/i.test(f) && !/^deck\./.test(f)).forEach(f => {
            const src = path.join(masters, f);
            const out = path.join(AUDIO, lang, f.replace(/\.[^.]+$/, ".mp3"));
            if (!stale(src, out)) return;
            ff(["-i", src, "-map_metadata", "-1", "-vn", "-ac", "1", "-ar", "44100",
                "-codec:a", "libmp3lame", "-b:a", "64k", out]);
            console.log("audio  " + path.relative(ROOT, out).padEnd(40) + kb(src) + " →" + kb(out));
            built++;
        });
    });
}

/* ---- deck voice bundle ------------------------------------------------
   Alice's sixteen deck lines ship as base64 inside a script, not as loose
   mp3 files, for one reason: from file:// a loose file is a cross-origin
   resource to Web Audio, and the deck routes these lines through its
   broken-radio filter graph — which then outputs silence. A data: URL has
   no origin problem. The bundle is NOT in index.html's script list: the
   deck injects it in the background once the menu works (09-alice-stream.js
   loadAliceAudio), so 1.3 MB of audio never blocks the first click. */
const DECK_MASTERS = path.join(AUDIO, "ru", "masters");
const BUNDLE = path.join(ROOT, "js", "presentation", "08b-alice-audio.js");
if (fs.existsSync(DECK_MASTERS)) {
    const ids = fs.readdirSync(DECK_MASTERS).filter(f => /^deck\..+\.mp3$/i.test(f))
        .map(f => f.replace(/\.mp3$/i, ""))
        .sort((a, b) => {                       // slides first, then the ambient pool
            const k = s => (s.startsWith("deck.slide") ? "0" : "1") + s;
            return k(a) < k(b) ? -1 : 1;
        });
    const newest = ids.reduce((m, id) => Math.max(m, fs.statSync(path.join(DECK_MASTERS, id + ".mp3")).mtimeMs), 0);
    if (ids.length && (FORCE || !fs.existsSync(BUNDLE) || fs.statSync(BUNDLE).mtimeMs < newest)) {
        let inBytes = 0, outBytes = 0;
        const table = {};
        ids.forEach(id => {
            const src = path.join(DECK_MASTERS, id + ".mp3");
            inBytes += fs.statSync(src).size;
            const mp3 = execFileSync("ffmpeg", ["-v", "error", "-i", src, "-map_metadata", "-1", "-vn",
                "-ac", "1", "-ar", "44100", "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "-"],
                { maxBuffer: 64 * 1024 * 1024 });
            outBytes += mp3.length;
            table[id] = mp3.toString("base64");
        });
        fs.writeFileSync(BUNDLE,
`/* ============================================================
   TERMINAL: SHATTERED — Alice's deck voice, bundled
   ------------------------------------------------------------
   GENERATED FILE — do not edit. Rebuild: node assets/build-media.js
   Source: assets/audio/ru/masters/deck.*.mp3 (originals, untouched).

   Loaded lazily by 09-alice-stream.js (loadAliceAudio), never from
   index.html, so it cannot hold up the first paint on a slow link.
   Assigned to window rather than declared, so a second injection can
   never throw a redeclaration error.
   ============================================================ */
window.ALICE_AUDIO = ${JSON.stringify(table, null, 1)};
if (typeof aliceAudioArrived === "function") aliceAudioArrived();
`, "utf8");
        console.log("bundle js/presentation/08b-alice-audio.js".padEnd(47) + (inBytes / 1024).toFixed(0).padStart(6) + " КБ mp3 →" +
                    (fs.statSync(BUNDLE).size / 1024).toFixed(0).padStart(6) + " КБ js (" + ids.length + " реплик, 64 кбит/с)");
        built++;
    }
}

/* ---- video ---------------------------------------------------------- */
const VARIANTS = [
    { suffix: ".540.mp4", scale: "540:960", crf: "27", maxrate: "1100k", buf: "2200k", ab: "64k" },
    { suffix: ".360.mp4", scale: "360:640", crf: "29", maxrate: "450k",  buf: "900k",  ab: "48k" }
];
if (fs.existsSync(VIDEO)) {
    fs.readdirSync(VIDEO).filter(f => /\.mp4$/i.test(f) && !/\.(540|360)\.mp4$/i.test(f)).forEach(f => {
        const src = path.join(VIDEO, f);
        const base = src.replace(/\.mp4$/i, "");
        VARIANTS.forEach(v => {
            const out = base + v.suffix;
            if (!stale(src, out)) return;
            ff(["-i", src, "-map_metadata", "-1",
                "-vf", "scale=" + v.scale + ":force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
                "-c:v", "libx264", "-preset", "medium", "-profile:v", "main", "-pix_fmt", "yuv420p",
                "-crf", v.crf, "-maxrate", v.maxrate, "-bufsize", v.buf,
                "-c:a", "aac", "-ac", "1", "-b:a", v.ab,
                "-movflags", "+faststart", out]);
            console.log("video  " + path.relative(ROOT, out).padEnd(40) + kb(src) + " →" + kb(out));
            built++;
        });
        const poster = base + ".poster.jpg";
        if (stale(src, poster)) {
            ff(["-ss", "2.5", "-i", src, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "6", poster]);
            console.log("poster " + path.relative(ROOT, poster).padEnd(40) + "        →" + kb(poster));
            built++;
        }
    });
}
console.log(built ? "\n" + built + " файлов собрано" : "всё актуально");
