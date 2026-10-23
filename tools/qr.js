/* ============================================================
   TERMINAL: SHATTERED — QR code, no dependencies
   ------------------------------------------------------------
   serve.js draws the link for the jury's phones with this: in the
   console (half-block characters) and at /qr (SVG, for the big
   screen). Byte mode, error correction M (15%), versions 1–10 —
   enough for any LAN address with a path.

   The standard algorithm (ISO/IEC 18004), checked module by module
   against Python's qrcode package for the same version and mask.
   ============================================================ */
"use strict";

/* error correction M, versions 0..10 (index 0 unused) */
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS    = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const FORMAT_M = 0;                       // the two format bits of level M

function rawModules(ver) {
    let r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
        const n = Math.floor(ver / 7) + 2;
        r -= (25 * n - 10) * n - 55;
        if (ver >= 7) r -= 36;
    }
    return r;
}
const dataCodewords = ver => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];

/* ---- Reed–Solomon over GF(256), polynomial 0x11D ---- */
function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z;
}
function rsDivisor(degree) {
    const r = new Array(degree).fill(0);
    r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < r.length; j++) {
            r[j] = gfMul(r[j], root);
            if (j + 1 < r.length) r[j] ^= r[j + 1];
        }
        root = gfMul(root, 0x02);
    }
    return r;
}
function rsRemainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
        const f = b ^ r.shift();
        r.push(0);
        div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
}

/* ---- data: mode, length, bytes, padding; then ECC, interleaved ---- */
function codewords(bytes, ver) {
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4);                                        // byte mode
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    const cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));           // terminator
    put(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

    const nb = NUM_BLOCKS[ver], eccLen = ECC_PER_BLOCK[ver];
    const raw = Math.floor(rawModules(ver) / 8);
    const short = nb - raw % nb, shortLen = Math.floor(raw / nb);
    const div = rsDivisor(eccLen), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
        const dat = data.slice(k, k + shortLen - eccLen + (i < short ? 0 : 1));
        k += dat.length;
        const ecc = rsRemainder(dat, div);
        if (i < short) dat.push(0);
        blocks.push(dat.concat(ecc));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++)
        blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= short) out.push(b[i]); });
    return out;
}

/* ---- the matrix ---- */
function build(ver, words, mask) {
    const size = ver * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };
    const bit = (v, i) => ((v >>> i) & 1) !== 0;

    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
            if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
        }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    if (ver > 1) {
        const n = Math.floor(ver / 7) + 2;
        const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
        const pos = [6];
        for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
        pos.forEach((y, i) => pos.forEach((x, j) => {
            if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) return;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++)
                set(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }));
    }
    const format = mk => {
        const data = FORMAT_M << 3 | mk;
        let rem = data;
        for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        const b = (data << 10 | rem) ^ 0x5412;
        for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
        set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
        for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
        for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(b, i));
        for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(b, i));
        set(8, size - 8, true);
    };
    format(0);
    if (ver >= 7) {
        let rem = ver;
        for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
        const b = ver << 12 | rem;
        for (let i = 0; i < 18; i++) {
            const a = size - 11 + i % 3, c = Math.floor(i / 3);
            set(a, c, bit(b, i)); set(c, a, bit(b, i));
        }
    }
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
            const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
            if (!fn[y][x] && i < words.length * 8) { m[y][x] = bit(words[i >>> 3], 7 - (i & 7)); i++; }
        }
    }
    const MASKS = [
        (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
        (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
        (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
    ];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
        if (!fn[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
    format(mask);
    return m;
}

/* lower is easier to scan: long runs, 2×2 blocks, finder look-alikes, dark balance */
function penalty(m) {
    const n = m.length;
    let p = 0, dark = 0;
    const line = get => {
        let run = 1;
        for (let i = 1; i <= n; i++) {
            if (i < n && get(i) === get(i - 1)) { run++; continue; }
            if (run >= 5) p += run - 2;
            run = 1;
        }
        const s = Array.from({ length: n }, (_, i) => get(i) ? "1" : "0").join("");
        for (const pat of ["10111010000", "00001011101"]) for (let k = s.indexOf(pat); k >= 0; k = s.indexOf(pat, k + 1)) p += 40;
    };
    for (let y = 0; y < n; y++) { line(x => m[y][x]); line(x => m[x][y]); }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
    }
    m.forEach(r => r.forEach(c => { if (c) dark++; }));
    p += (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
    return p;
}

/* encode(text, { version, mask }) → { version, mask, size, modules[y][x] } */
function encode(text, opts) {
    opts = opts || {};
    const bytes = Array.from(Buffer.from(String(text), "utf8"));
    let ver = opts.version;
    if (!ver) for (ver = 1; ver <= 10 && dataCodewords(ver) < bytes.length + (ver <= 9 ? 2 : 3); ver++);
    if (ver > 10) throw new Error("QR: текст слишком длинный");
    const words = codewords(bytes, ver);
    let best = null;
    for (let mk = 0; mk < 8; mk++) {
        if (opts.mask != null && mk !== opts.mask) continue;
        const m = build(ver, words, mk), score = penalty(m);
        if (!best || score < best.score) best = { version: ver, mask: mk, size: m.length, modules: m, score };
    }
    return best;
}

/* for a dark console: light modules drawn as blocks, two rows per line */
function toConsole(q, border) {
    border = border == null ? 2 : border;
    const n = q.size, light = (x, y) => x < 0 || y < 0 || x >= n || y >= n || !q.modules[y][x];
    const rows = [];
    for (let y = -border; y < n + border; y += 2) {
        let s = "";
        for (let x = -border; x < n + border; x++) {
            const t = light(x, y), b = y + 1 < n + border ? light(x, y + 1) : false;
            s += t && b ? "█" : t ? "▀" : b ? "▄" : " ";
        }
        rows.push(s);
    }
    return rows.join("\n");
}

function toSvg(q, border) {
    border = border == null ? 4 : border;
    const dim = q.size + border * 2;
    let d = "";
    q.modules.forEach((row, y) => row.forEach((on, x) => { if (on) d += "M" + (x + border) + " " + (y + border) + "h1v1h-1z"; }));
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + " " + dim + '" shape-rendering="crispEdges">' +
           '<rect width="100%" height="100%" fill="#fff"/><path fill="#000" d="' + d + '"/></svg>';
}

module.exports = { encode, toConsole, toSvg };
