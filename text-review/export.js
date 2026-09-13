/* ============================================================
   TERMINAL: SHATTERED — text-review exporter
   ------------------------------------------------------------
   Rebuilds text-review/demo/*.md and text-review/presentation/*.md
   straight out of the game's own source files, so the review copy
   can never quietly drift away from what actually ships.

       node text-review/export.js

   No dependencies, no dev server, no browser. It loads the three
   data modules in a VM and reads the same objects the page reads.
   ============================================================ */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
const LOCALES = ["ru", "en", "tj", "tj_col"];

/* ---------- load the data modules ---------------------------------
   These are classic scripts declaring top-level consts in one shared
   scope (see docs/ARCHITECTURE.md), so each is wrapped in a function
   that hands the objects back. 05-void-os.js touches no DOM at all;
   10-i18n.js and 02-slides.js only touch it inside functions, so a
   bare shim is enough to get through load.                         */

const domShim = () => ({
    document: { documentElement: {}, body: {}, querySelectorAll: () => [],
                querySelector: () => null, getElementById: () => null,
                createElement: () => ({ style: {}, classList: { add(){}, remove(){} } }) },
    window: {}, localStorage: { getItem: () => null, setItem: () => {} },
    navigator: { language: "ru", userAgent: "" }, console
});

const grab = (file, names) => vm.runInNewContext(
    "(function(){" + read(file) + "\nreturn {" + names.join(",") + "};})()",
    domShim(), { filename: path.basename(file) }
);

const os     = grab("js/demo/05-void-os.js", ["OS_TEXT_BY_LOCALE", "OS_STORY_BY_LOCALE"]);
const i18n   = grab("js/core/10-i18n.js",    ["STRINGS"]);
const slides = grab("js/presentation/02-slides.js", ["SLIDES_BY_LOCALE"]);

/* The game merges the story table over the base table at load time.
   Replicate it, or the export shows dead base-table text that no
   player ever sees. */
const TEXT = {};
LOCALES.forEach(l => {
    TEXT[l] = Object.assign({}, os.OS_TEXT_BY_LOCALE[l], os.OS_STORY_BY_LOCALE[l]);
});

/* ---------- localised section labels ------------------------------ */

const H = {
ru: { t:"Тексты демки", sub:"Снимок player-facing текста демки. Источник правды — код (js/demo/, js/core/10-i18n.js), не этот файл.",
      docs:"Документы Нейкона (VoidOS)", lines:"Реплики и реакции интерфейса", tasks:"Задачи: реакция комнаты и подсказки",
      desk:"Стол и терминал", glitch:"Аномалии окружения", scare:"Критический сбой (скример)",
      walk:"Уход без прогресса", end:"Финалы сессии", voidg:"Пробуждение в темноте",
      lore:"Реакция на починку", hint:"подсказка", noob:"для жюри",
      pt:"Питч-дек", psub:"Шесть слайдов и заметки докладчика. Источник правды — js/presentation/02-slides.js.",
      spk:"Заметки докладчика" },
en: { t:"Demo text", sub:"Snapshot of the demo's player-facing text. The code is the source of truth (js/demo/, js/core/10-i18n.js), not this file.",
      docs:"Neikon's documents (VoidOS)", lines:"Lines and interface reactions", tasks:"Tasks: room reaction and hints",
      desk:"Desk and terminal", glitch:"Environment anomalies", scare:"Critical failure (jump scare)",
      walk:"Walking away", end:"Session endings", voidg:"Waking in the dark",
      lore:"Reaction to the fix", hint:"hint", noob:"for the jury",
      pt:"Pitch deck", psub:"Six slides and speaker notes. Source of truth: js/presentation/02-slides.js.",
      spk:"Speaker notes" },
tj: { t:"Матнҳои демо", sub:"Сурати матни бозигар. Манбаи ҳақиқат код аст (js/demo/, js/core/10-i18n.js), на ин файл.",
      docs:"Ҳуҷҷатҳои Нейкон (VoidOS)", lines:"Ибораҳо ва аксуламалҳои интерфейс", tasks:"Вазифаҳо: аксуламали ҳуҷра ва маслиҳатҳо",
      desk:"Миз ва терминал", glitch:"Аномалияҳои муҳит", scare:"Корношоямии критикӣ",
      walk:"Рафтан бе пешрафт", end:"Анҷоми сессия", voidg:"Бедорӣ дар торикӣ",
      lore:"Аксуламал ба таъмир", hint:"маслиҳат", noob:"барои ҳакамон",
      pt:"Питч-дек", psub:"Шаш слайд ва қайдҳои маърӯзачӣ. Манбаи ҳақиқат: js/presentation/02-slides.js.",
      spk:"Қайдҳои маърӯзачӣ" },
tj_col:{ t:"Матнҳои демо", sub:"Сурати матни бозигар. Манбаи ҳақиқат код, на ин файл.",
      docs:"Ҳуҷҷатҳои Нейкон (VoidOS)", lines:"Ибораҳо ва аксуламали интерфейс", tasks:"Вазифаҳо: аксуламали хона ва маслиҳат",
      desk:"Миз ва терминал", glitch:"Аномалияи муҳит", scare:"Корношоямии критикӣ",
      walk:"Рафтан бе пешрафт", end:"Анҷоми сессия", voidg:"Бедорӣ дар торикӣ",
      lore:"Аксуламал ба таъмир", hint:"маслиҳат", noob:"барои ҳакамон",
      pt:"Питч-дек", psub:"Шаш слайд ва қайди маърӯзачӣ. Манбаи ҳақиқат: js/presentation/02-slides.js.",
      spk:"Қайди маърӯзачӣ" }
};

/* ---------- inline markup -> markdown ----------------------------- */

const ents = s => s
    .replace(/&nbsp;/g, " ").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
    .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

const inline = s => ents(String(s)
    .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<kbd>([\s\S]*?)<\/kbd>/gi, "`$1`")
    .replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/gi, "**$1**")
    .replace(/<(?:i|em)>([\s\S]*?)<\/(?:i|em)>/gi, "_$1_")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").trim();

/* ---------- slide body (HTML) -> markdown -------------------------
   Handles every block the deck actually uses. Anything unknown falls
   through to its text content rather than being dropped silently.  */

function bodyToMd(html) {
    const notes = [];
    // pull speaker notes out first; they get their own section
    html = html.replace(
        /<details class="spk">[\s\S]*?<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
        (_, sum, inner) => { notes.push({ sum: inline(sum), body: inner }); return ""; });

    html = html.replace(/<div class="qr-block"[\s\S]*?<\/div>\s*<\/div>/gi, "");

    const out = [];
    let hLevel = "###";   // drops a level inside the speaker-notes section
    const walk = src => {
        // <pre> keeps its own formatting
        src.split(/(<pre[\s\S]*?<\/pre>)/gi).forEach(chunk => {
            if (/^<pre/i.test(chunk)) {
                const inner = chunk.replace(/^<pre[^>]*>/i, "").replace(/<\/pre>$/i, "");
                out.push("```", ents(inner.replace(/<[^>]+>/g, "")).replace(/^\n+|\n+$/g, ""), "```", "");
                return;
            }
            // a bullet run has to be closed with a blank line before whatever follows
            const endList = () => {
                if (out.length && out[out.length - 1].startsWith("- ")) out.push("");
            };
            chunk.replace(/<(h[234])[^>]*>([\s\S]*?)<\/\1>|<p[^>]*>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>/gi,
                (m, hTag, hTxt, pTxt, liTxt) => {
                    if (hTag)      { const t = inline(hTxt); if (t) { endList(); out.push(hLevel + " " + t, ""); } }
                    else if (pTxt !== undefined) { const t = inline(pTxt); if (t) { endList(); out.push(t, ""); } }
                    else           { const t = inline(liTxt); if (t) out.push("- " + t); }
                    return m;
                });
            endList();
        });
    };
    walk(html);

    const noteMd = [];
    hLevel = "#####";
    notes.forEach(n => {
        noteMd.push("#### " + n.sum.replace(/^\/\/\s*/, ""), "");
        const before = out.length;
        walk(n.body);
        noteMd.push(...out.splice(before));
    });
    return { body: out.join("\n"), notes: noteMd.join("\n") };
}

/* ---------- builders ---------------------------------------------- */

const DOCS = ["readme", "note.room", "note.door", "note.alice", "note.again",
              "plate.pylon1", "plate.pylon2", "plate.gauge1", "plate.gauge2",
              "log.anchor", "log.sessions"];
const IDS  = ["room-lamp", "room-fog", "room-interlock", "room-door",
              "room-sessions", "room-anchors", "room-override"];

function buildDemo(loc) {
    const S = i18n.STRINGS[loc], OS = TEXT[loc], h = H[loc], out = [];
    out.push("# " + h.t + " — " + loc.toUpperCase(), "", "_" + h.sub + "_", "");

    out.push("---", "", "## " + h.docs, "");
    DOCS.forEach(k => { if (OS[k]) out.push("### " + k, "", "```", OS[k], "```", ""); });

    out.push("---", "", "## " + h.lines, "");
    [["demo.desk.", h.desk], ["demo.glitch.", h.glitch], ["demo.scare.", h.scare],
     ["demo.walk.", h.walk], ["demo.end.", h.end], ["demo.void.", h.voidg]].forEach(([pre, label]) => {
        const keys = Object.keys(S).filter(k => k.startsWith(pre) && !/_html$|\.aria$/.test(k)).sort();
        if (!keys.length) return;
        out.push("### " + label, "");
        keys.forEach(k => out.push("- `" + k.slice(5) + "` — " + inline(S[k]).replace(/\n/g, " / ")));
        out.push("");
    });

    out.push("---", "", "## " + h.tasks, "");
    IDS.forEach(id => {
        out.push("### " + id + " — " + (S["demo.task." + id + ".title"] || id), "");
        const lore = S["demo.task." + id + ".lore"];
        if (lore) out.push("_" + h.lore + ":_ " + inline(lore), "");
        [["py", "Python"], ["cpp", "C++"], ["c", "C"], ["", ""]].forEach(([suf, lang]) => {
            const base = "demo.task." + id + (suf ? "-" + suf : "");
            const hint = S[base + ".hint"], noob = S[base + ".hintNoob"];
            if (!hint && !noob) return;
            if (lang) out.push("**" + lang + "**");
            if (hint) out.push("- " + h.hint + ": " + inline(hint));
            if (noob) out.push("- " + h.noob + ": " + inline(noob));
            out.push("");
        });
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

function buildDeck(loc) {
    const h = H[loc], deck = slides.SLIDES_BY_LOCALE[loc] || [], out = [];
    out.push("# " + h.pt + " — " + loc.toUpperCase(), "", "_" + h.psub + "_", "");
    deck.forEach((s, i) => {
        const { body, notes } = bodyToMd(s.body || "");
        out.push("---", "", "## " + (i + 1) + ". " + inline(s.title || s.id), "");
        if (s.sub) out.push("_" + inline(s.sub) + "_", "");
        if (body) out.push(body, "");
        if (notes) out.push("### " + h.spk, "", notes, "");
    });
    return out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

/* ---------- write ------------------------------------------------- */

let n = 0;
LOCALES.forEach(loc => {
    [["demo", buildDemo(loc)], ["presentation", buildDeck(loc)]].forEach(([dir, body]) => {
        const dest = path.join(ROOT, "text-review", dir, loc + ".md");
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, body, "utf8");
        console.log((dir + "/" + loc + ".md").padEnd(28), String(body.length).padStart(6), "bytes");
        n++;
    });
});
console.log("\n" + n + " files rebuilt from source.");
