/* ============================================================
   TERMINAL: SHATTERED — reference coverage check
   ------------------------------------------------------------
   Every named function (at any depth) and every variable at file or
   module (IIFE) level must be mentioned in its page of
   docs/reference/. For stylesheets: every custom property and every
   @keyframes name. For .html only the inline <script> parts count.

     node tools/doc-coverage.js --all
     node tools/doc-coverage.js docs/reference/voice.md js/core/15-voice-media.js …

   Prints what is missing and exits 1 if anything is. Mentioned means
   the name occurs in the page as a whole word — the check cannot tell
   a description from a passing mention, it only catches what was
   forgotten outright.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

/* page -> the files it describes */
const PAGES = {
    "docs/reference/deck.md":       ["index.html", "js/presentation/02-slides.js", "js/presentation/07-deck.js",
                                     "js/presentation/08-alice-lines.js", "js/presentation/08b-alice-audio.js",
                                     "js/presentation/09-alice-stream.js"],
    "docs/reference/ui.md":         ["js/core/10-i18n.js", "js/core/11-settings.js", "js/demo/12-jury.js",
                                     "js/core/13-mobile.js", "js/core/17-evidence.js", "js/core/21-backstage.js"],
    "docs/reference/audio.md":      ["js/core/01-audio.js", "js/demo/03-alice-voice.js", "js/core/19-neural-voice.js"],
    "docs/reference/voice.md":      ["js/core/00-voice-clips.js", "js/core/00-voice-text.js", "js/core/00-voice-sync.js",
                                     "js/presentation/14-jury-cues.js", "js/core/15-voice-media.js",
                                     "js/presentation/16-jury-intro.js", "js/core/18-voice-extras.js",
                                     "voice/lib.js", "voice/cues.js", "voice/zip.js", "studio.html"],
    "docs/reference/void-scene.md": ["js/demo/04-void-scene.js"],
    "docs/reference/void-os.md":    ["js/demo/05-void-os.js"],
    "docs/reference/demo.md":       ["js/demo/06-demo.js"],
    "docs/reference/sandbox.md":    ["js/core/20-ai-sandbox.js"],
    "docs/reference/server.md":     ["serve.js", "tools/qr.js"],
    "docs/reference/styles.md":     ["styles.css", "styles-media.css"],
    "docs/reference/build.md":      ["assets/build-media.js", "assets/build-brand.js", "tools/doc-coverage.js"]
};

/* loop counters and the like that sit at module level now and then */
const SKIP = new Set(["e", "i", "j", "k", "n", "m", "s", "t", "a", "b", "c", "d", "x", "y", "p", "r", "u", "v", "w", "h", "l", "o", "f", "g",
    "self", "that", "res", "req", "err", "ok", "out", "tmp", "el", "fn", "cb", "len", "key", "val", "idx"]);

/* -> Map(name -> first line) */
function namesOf(src) {
    let text = fs.readFileSync(path.join(ROOT, src), "utf8").replace(/\r/g, "");
    const names = new Map();
    const add = function (n, line) { if (n && !SKIP.has(n) && !names.has(n)) names.set(n, line); };

    if (/\.css$/.test(src)) {
        text.split("\n").forEach(function (l, i) {
            for (const m of l.matchAll(/(--[\w-]+)\s*:/g)) add(m[1], i + 1);
            const k = /@keyframes\s+([\w-]+)/.exec(l);
            if (k) add(k[1], i + 1);
        });
        return names;
    }
    if (/\.html$/.test(src)) {
        /* blank everything outside inline <script> blocks, keeping line numbers */
        let out = "", inScript = false;
        for (const l of text.split("\n")) {
            const open = /<script\b([^>]*)>/.exec(l);
            if (open && !/<\/script>/.test(l.slice(open.index + open[0].length))) inScript = !/\bsrc=/.test(open[1]);
            out += (inScript ? l : "") + "\n";
            if (/<\/script>/.test(l)) inScript = false;
        }
        text = out;
    }
    const lines = text.split("\n");
    /* files indented as a whole (classic scripts at 4, their IIFE bodies at 8)
       vs. files at column 0 (Node scripts) */
    const indents = lines.map(function (l) { return /^(\s*)(?:const|let|var)\s/.exec(l); }).filter(Boolean).map(function (m) { return m[1].length; });
    const base = indents.length ? Math.min.apply(null, indents) : 0;
    const varDepth = base === 0 ? 0 : base + 4;
    lines.forEach(function (l, i) {
        let m;
        if ((m = /^\s*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(l))) add(m[1], i + 1);
        if ((m = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/.exec(l))) add(m[1], i + 1);
        if ((m = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s+)?function\b/.exec(l))) add(m[1], i + 1);
        if ((m = /^(\s*)(?:const|let|var)\s+(.+)/.exec(l)) && m[1].length <= varDepth) {
            const decl = m[2];
            const destr = /^[{[]([^}\]]*)[}\]]/.exec(decl);
            if (destr) { destr[1].split(",").forEach(function (x) { add(x.split(":").pop().split("=")[0].trim(), i + 1); }); return; }
            let depth = 0, cur = "";
            const parts = [];
            for (const ch of decl) {
                if ("([{".includes(ch)) depth++;
                else if (")]}".includes(ch)) depth--;
                if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
            }
            parts.push(cur);
            parts.forEach(function (pt) { const n = /^\s*([A-Za-z_$][\w$]*)/.exec(pt); if (n) add(n[1], i + 1); });
        }
    });
    return names;
}

function check(page, srcs) {
    const doc = fs.existsSync(path.join(ROOT, page)) ? fs.readFileSync(path.join(ROOT, page), "utf8") : "";
    let total = 0;
    const missing = [];
    for (const src of srcs) {
        for (const [n, line] of namesOf(src)) {
            total++;
            const re = new RegExp("(^|[^\\w$-])" + n.replace(/\$/g, "\\$") + "(?![\\w$])");
            if (!re.test(doc)) missing.push(src + ":" + line + "  " + n);
        }
    }
    return { total: total, missing: missing };
}

const args = process.argv.slice(2);
let failed = 0;
if (args[0] === "--all") {
    for (const page of Object.keys(PAGES)) {
        const r = check(page, PAGES[page]);
        console.log((r.missing.length ? "✗ " : "✓ ") + page + " — " + (r.total - r.missing.length) + "/" + r.total);
        if (r.missing.length) { failed += r.missing.length; console.log("    " + r.missing.join("\n    ")); }
    }
} else if (args.length >= 2) {
    const r = check(args[0], args.slice(1));
    console.log("names: " + r.total + ", documented: " + (r.total - r.missing.length) + ", missing: " + r.missing.length);
    if (r.missing.length) console.log(r.missing.join("\n"));
    failed = r.missing.length;
} else {
    console.log("usage: node tools/doc-coverage.js --all\n       node tools/doc-coverage.js <page.md> <source> [source …]");
    process.exit(2);
}
process.exit(failed ? 1 : 0);
