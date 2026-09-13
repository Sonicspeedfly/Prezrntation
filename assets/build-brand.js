/* ============================================================
   CrystalCore brand mark builder
   ------------------------------------------------------------
       node assets/build-brand.js

   Takes the studio's traced logo (assets/crystalcore-logo.svg —
   74 filled paths, no strokes, chrome shading done with stacked
   translucent layers) and splits it into two self-contained,
   animated SVGs the deck can drop straight into its lockup:

       assets/brand-mark.svg       the crystal cluster + dust
       assets/brand-wordmark.svg   the "CrystalCore" lettering

   Why split at all: the five crystals in the artwork interlock,
   so they arrive as one soup of 273 sub-paths. Grouping them by
   region is what lets the loose shards drift independently of
   the spire instead of the whole mark sliding about as a block.

   Region bounds below were read off a colourised debug render —
   bbox-overlap clustering merges the cluster and cannot find
   them on its own. Re-check them if the source art is redrawn.
   ============================================================ */

const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const SRC = path.join(HERE, "crystalcore-logo.svg");

/* ---------- parse ------------------------------------------------- */

const src = fs.readFileSync(SRC, "utf8");
const paths = [...src.matchAll(/<path\s+fill="([^"]+)"(?:\s+fill-opacity="([^"]+)")?\s+d="([^"]+)"/g)]
    .map(m => ({ fill: m[1], op: m[2] || "1", d: m[3] }));
if (!paths.length) throw new Error("no paths found in " + SRC);

const subpaths = d => d.split(/(?=M)/).map(s => s.trim()).filter(Boolean);

function bbox(d) {
    const t = d.match(/[MmZzCcLl]|-?[\d.]+/g) || [];
    let i = 0, x = 0, y = 0, c = null;
    let a = 1e9, b = 1e9, e = -1e9, f = -1e9;
    const hit = (p, q) => { if (p < a) a = p; if (p > e) e = p; if (q < b) b = q; if (q > f) f = q; };
    while (i < t.length) {
        const k = t[i];
        if (/[A-Za-z]/.test(k)) { c = k; i++; continue; }
        if (c === "M") { x = +t[i]; y = +t[i+1]; i += 2; hit(x, y); }
        else if (c === "m") { x += +t[i]; y += +t[i+1]; i += 2; hit(x, y); }
        else if (c === "c") { const p = t.slice(i, i+6).map(Number); i += 6;
                              hit(x+p[0], y+p[1]); hit(x+p[2], y+p[3]); x += p[4]; y += p[5]; hit(x, y); }
        else if (c === "C") { hit(+t[i], +t[i+1]); hit(+t[i+2], +t[i+3]);
                              x = +t[i+4]; y = +t[i+5]; i += 6; hit(x, y); }
        else if (c === "l") { x += +t[i]; y += +t[i+1]; i += 2; hit(x, y); }
        else if (c === "L") { x = +t[i]; y = +t[i+1]; i += 2; hit(x, y); }
        else i++;
    }
    return { minx: a, miny: b, maxx: e, maxy: f };
}

const items = [];
paths.forEach(p => subpaths(p.d).forEach(d => {
    const bb = bbox(d);
    if (isFinite(bb.minx)) items.push({ d, fill: p.fill, op: p.op, ...bb });
}));

/* ---------- regions ----------------------------------------------- */

const cx = it => (it.minx + it.maxx) / 2;
const cy = it => (it.miny + it.maxy) / 2;

function region(it) {
    if (it.miny >= 278) return "word";                                  // lettering
    if (it.minx >= 310) return cy(it) < 118 ? "kite" : "chipR";         // detached, right
    if (cx(it) < 212 && cy(it) < 172) return "chipL";                   // detached, left
    if (cx(it) < 242 && cy(it) >= 172) return "base";                   // chunky, lower-left
    return "spire";                                                     // the hero crystal
}

const ORDER = ["spire", "base", "chipL", "kite", "chipR"];
const reg = {}; [...ORDER, "word"].forEach(r => reg[r] = []);
items.forEach(it => reg[region(it)].push(it));   // push order == original paint order

const emit = it =>
    `<path fill="${it.fill}"${it.op !== "1" ? ` fill-opacity="${it.op}"` : ""} d="${it.d}"/>`;

/* ---------- the dust field ---------------------------------------- */
/* Wireframe splinters in the same language as the cluster, placed in
   the gaps around it (crystal occupies x 176-359, y 29-262).        */

const CHIPS = [
    [166,  52, -20, "hex"],
    [374,  46,  26, "kite"],
    [382, 152, -12, "hex"],
    [156, 178,  15, "kite"],
    [352, 244, -30, "chunk"],
    [186, 268,  14, "hex"],
    [286,   8,  34, "kite"]
];
const SHAPE = {
    hex:   '<polygon points="0,-7 2.2,-3 1.8,5 0,7.5 -1.8,4.5 -2.2,-3"/><line x1="0" y1="-7" x2="0" y2="7.5" opacity="0.45"/>',
    kite:  '<polygon points="0,-5.5 2.8,0 0,6.5 -2.8,0"/><line x1="0" y1="-5.5" x2="0" y2="6.5" opacity="0.4"/>',
    chunk: '<polygon points="-2.6,-2 0,-4.2 3,-1.6 2.1,3.2 -1,4.2"/><line x1="0" y1="-4.2" x2="0" y2="4.2" opacity="0.4"/>'
};
const DOTS  = [[214, 22, 1.2], [386, 96, 1.1], [150, 128, 1.0],
               [300, 282, 1.2], [330, 20, 0.9], [360, 200, 1.0]];
const STARS = [[376, 122, 4], [152, 96, 3], [330, 268, 3]];

const chipMarkup = CHIPS.map(([x, y, r, s], i) =>
    `    <g transform="translate(${x} ${y}) rotate(${r})"><g class="chip chip-${i+1}">${SHAPE[s]}</g></g>`
).join("\n");

const dotMarkup = DOTS.map(([x, y, r], i) =>
    `    <circle class="spk spk-${i+1}" cx="${x}" cy="${y}" r="${r}"/>`).join("\n");

const starMarkup = STARS.map(([x, y, r], i) =>
    `    <g transform="translate(${x} ${y})"><g class="star star-${i+1}">` +
    `<line x1="${-r}" y1="0" x2="${r}" y2="0"/><line x1="0" y1="${-r}" x2="0" y2="${r}"/>` +
    (r > 3 ? `<line x1="${-r*0.62}" y1="${-r*0.62}" x2="${r*0.62}" y2="${r*0.62}" opacity="0.55"/>` +
             `<line x1="${-r*0.62}" y1="${r*0.62}" x2="${r*0.62}" y2="${-r*0.62}" opacity="0.55"/>` : "") +
    `</g></g>`).join("\n");

/* ---------- animation --------------------------------------------- */
/* Travel is in SVG user units. The mark ships ~78px wide over a 240-unit
   viewBox, so one unit is about a third of a pixel: a 10-unit drift is a
   readable float, a 30-unit one would look like the mark falling apart.

   Keyframes are generated from this table rather than written out, because
   every set is needed twice — once at full amplitude, once damped for
   prefers-reduced-motion. Scaling them with a CSS variable instead looks
   tidier and does not work: var() inside calc() in a keyframe is dropped
   by the renderer, which silently freezes the entire mark. */

const KEYFRAMES = {
    "cc-breathe": [                                   // the hero crystal: no travel, just breath
        { at: "0%, 100%", o: 0.90, ty: 0,    s: 1 },
        { at: "50%",      o: 1.00, ty: -1.5, s: 1.012 }
    ],
    "cc-drift-a": [                                   // base sits against the spire: smallest travel
        { at: "0%, 100%", tx: 0,   ty: 0,  r: 0 },
        { at: "33%",      tx: -2,  ty: -3, r: -0.8 },
        { at: "66%",      tx: 1.5, ty: -5, r: 0.6 }
    ],
    "cc-drift-b": [
        { at: "0%, 100%", tx: 0, ty: 0,  r: 0,   o: 0.88 },
        { at: "30%",      tx: 3, ty: -5, r: 2.5, o: 1.00 },
        { at: "64%",      tx: 5, ty: -9, r: -2,  o: 0.94 }
    ],
    "cc-drift-c": [
        { at: "0%, 100%", tx: 0,  ty: 0,   r: 0,  o: 0.90 },
        { at: "28%",      tx: -3, ty: -6,  r: -3, o: 1.00 },
        { at: "60%",      tx: -6, ty: -11, r: 2,  o: 0.95 }
    ],
    "cc-float-a": [
        { at: "0%, 100%", tx: 0,  ty: 0,  r: 0,  o: 0.16 },
        { at: "30%",      tx: 2,  ty: -5, r: 10, o: 0.88 },
        { at: "55%",      tx: -2, ty: -9, r: -6, o: 0.46 },
        { at: "78%",      tx: -4, ty: -4, r: 7,  o: 0.74 }
    ],
    "cc-float-b": [
        { at: "0%, 100%", tx: 0,  ty: 0,    r: 0,  o: 0.14 },
        { at: "28%",      tx: -3, ty: -4,   r: -9, o: 0.70 },
        { at: "52%",      tx: -5, ty: -8.5, r: 5,  o: 0.95 },
        { at: "80%",      tx: -1, ty: -3,   r: -4, o: 0.42 }
    ],
    "cc-float-c": [
        { at: "0%, 100%", tx: 0, ty: 0,  r: 0,  o: 0.20 },
        { at: "35%",      tx: 4, ty: -3, r: 12, o: 0.90 },
        { at: "60%",      tx: 6, ty: -7, r: -8, o: 0.52 },
        { at: "85%",      tx: 3, ty: -2, r: 5,  o: 0.80 }
    ],
    "cc-twinkle": [
        { at: "0%, 100%", o: 0,    tx: 0,  ty: 0,  s: 0.60 },
        { at: "35%",      o: 0.85, tx: 1,  ty: -3, s: 1.15 },
        { at: "55%",      o: 0.60, tx: -1, ty: -5, s: 0.95 },
        { at: "70%",      o: 0.95, tx: -2, ty: -2, s: 1.20 }
    ],
    "cc-star": [
        { at: "0%, 100%", o: 0,    r: 0,   s: 0.50 },
        { at: "45%",      o: 0.85, r: 45,  s: 1.10 },
        { at: "55%",      o: 1.00, r: 90,  s: 1.25 },
        { at: "70%",      o: 0.55, r: 135, s: 0.95 }
    ]
};

/* selector, keyframe set, duration, delay, extra */
const BINDINGS = [
    [".cr-spire", "cc-breathe",  7.5, 0.0, ""],
    [".cr-base",  "cc-drift-a", 11.5, 0.0, ""],
    [".cr-chipL", "cc-drift-b",  9.8, 1.7, ""],
    [".cr-kite",  "cc-drift-c", 13.2, 0.6, ""],
    [".cr-chipR", "cc-drift-b", 10.9, 3.1, " reverse"],
    [".chip-1",   "cc-float-a",  9.5, 0.0, ""],
    [".chip-2",   "cc-float-b", 11.2, 1.3, ""],
    [".chip-3",   "cc-float-c",  8.8, 2.6, ""],
    [".chip-4",   "cc-float-b", 12.4, 0.7, " reverse"],
    [".chip-5",   "cc-float-a", 10.6, 3.4, " reverse"],
    [".chip-6",   "cc-float-c",  9.2, 1.9, ""],
    [".chip-7",   "cc-float-b", 13.0, 4.1, ""],
    [".spk-1",    "cc-twinkle",  4.2, 0.0, ""],
    [".spk-2",    "cc-twinkle",  5.5, 0.7, ""],
    [".spk-3",    "cc-twinkle",  3.9, 1.4, ""],
    [".spk-4",    "cc-twinkle",  6.1, 0.3, ""],
    [".spk-5",    "cc-twinkle",  4.7, 2.1, ""],
    [".spk-6",    "cc-twinkle",  5.0, 1.1, ""],
    [".star-1",   "cc-star",     6.8, 0.6, ""],
    [".star-2",   "cc-star",     5.4, 2.4, ""],
    [".star-3",   "cc-star",     7.6, 1.2, ""]
];

/* Per-family travel gain, applied to translation only.

   The mark ships 78px wide over a 240-unit viewBox — about a third of a
   pixel per unit — so the raw table distances, which look sensible as
   numbers, land near one screen pixel and read as a still image. The dust
   needs the most gain: it is what the eye actually reads as floating.
   Tune motion here rather than in the table, so the two stay legible. */
const GAIN = {
    "cc-breathe": 2.0,
    "cc-drift-a": 1.7, "cc-drift-b": 1.7, "cc-drift-c": 1.7,
    "cc-float-a": 2.4, "cc-float-b": 2.4, "cc-float-c": 2.4,
    "cc-twinkle": 2.4, "cc-star": 1.0
};

const REDUCED_AMP = 0.5;
const num = n => String(+(+n).toFixed(3));

function frameCss(f, amp, gain) {
    const out = [];
    if (f.o !== undefined) out.push("opacity: " + f.o);
    const t = [];
    if (f.tx !== undefined || f.ty !== undefined)
        t.push(`translate(${num((f.tx || 0) * amp * gain)}px, ${num((f.ty || 0) * amp * gain)}px)`);
    if (f.r !== undefined) t.push(`rotate(${num(f.r * amp)}deg)`);
    if (f.s !== undefined) t.push(`scale(${num(1 + (f.s - 1) * amp)})`);
    if (t.length) out.push("transform: " + t.join(" "));
    return `      ${f.at} { ${out.join("; ")}; }`;
}

const keyframeSet = (amp, sfx) => Object.keys(KEYFRAMES).map(name =>
    `    @keyframes ${name}${sfx} {\n` +
    KEYFRAMES[name].map(f => frameCss(f, amp, GAIN[name] || 1)).join("\n") + "\n    }").join("\n");

const bindings = (sfx, indent) => BINDINGS.map(([sel, name, dur, delay, extra]) =>
    `${indent}${sel.padEnd(10)} { animation: ${name}${sfx} ${dur}s ease-in-out infinite ${delay}s${extra}; }`
).join("\n");

const STYLE = `
  <style>
    .cr, .chip, .star, .spk { transform-box: fill-box; transform-origin: center; }
    .chip, .spk, .star { opacity: 0; }

${bindings("", "    ")}

${keyframeSet(1, "")}

    /* Reduced motion damps the drift to about a third rather than stopping
       it: a logo frozen mid-float reads as a broken asset, while the large
       sweeping travel is what the setting exists to prevent. */
    @media (prefers-reduced-motion: reduce) {
${bindings("-r", "        ")}
    }
${keyframeSet(REDUCED_AMP, "-r")}
  </style>`;


/* ---------- write ------------------------------------------------- */

const MARK_VB = "150 0 240 292";      // crystal is x 176-359, y 29-262
const markSvg =
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VB}"
     role="img" aria-label="CrystalCore" style="overflow:visible">
  <title>CrystalCore</title>${STYLE}

  <!-- the five crystals of the artwork, each independently animatable -->
${ORDER.map(r => `  <g class="cr cr-${r}">\n` +
             reg[r].map(it => "    " + emit(it)).join("\n") + "\n  </g>").join("\n")}

  <!-- drifting splinters -->
  <g class="dust-chips" stroke="#ffffff" fill="none" stroke-width="1.15"
     stroke-linejoin="miter" stroke-linecap="round">
${chipMarkup}
  </g>
  <g class="dust-dots" fill="#ffffff" stroke="none">
${dotMarkup}
  </g>
  <g class="dust-stars" stroke="#ffffff" fill="none" stroke-width="0.8" stroke-linecap="round">
${starMarkup}
  </g>
</svg>
`;

const w = reg.word;
const wb = {
    minx: Math.min(...w.map(i => i.minx)), maxx: Math.max(...w.map(i => i.maxx)),
    miny: Math.min(...w.map(i => i.miny)), maxy: Math.max(...w.map(i => i.maxy))
};
const pad = 4;
const wordSvg =
`<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${(wb.minx - pad).toFixed(0)} ${(wb.miny - pad).toFixed(0)} ${(wb.maxx - wb.minx + pad * 2).toFixed(0)} ${(wb.maxy - wb.miny + pad * 2).toFixed(0)}"
     role="img" aria-label="CrystalCore">
  <title>CrystalCore</title>
  <g class="wordmark">
${w.map(it => "    " + emit(it)).join("\n")}
  </g>
</svg>
`;

fs.writeFileSync(path.join(HERE, "brand-mark.svg"), markSvg, "utf8");
fs.writeFileSync(path.join(HERE, "brand-wordmark.svg"), wordSvg, "utf8");

ORDER.concat("word").forEach(r =>
    console.log(r.padEnd(6), String(reg[r].length).padStart(4), "sub-paths"));
console.log("\nbrand-mark.svg     ", fs.statSync(path.join(HERE, "brand-mark.svg")).size, "bytes");
console.log("brand-wordmark.svg ", fs.statSync(path.join(HERE, "brand-wordmark.svg")).size, "bytes");
