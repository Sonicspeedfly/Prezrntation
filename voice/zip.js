/* ============================================================
   TERMINAL: SHATTERED — minimal ZIP writer
   ------------------------------------------------------------
   Just enough ZIP to hand a batch of voice takes out of the
   studio as one download, with no npm dependency.

   Entries are STORED, not deflated: every payload here is
   already compressed audio (mp3, webm, ogg, m4a), and deflate
   would spend time to win back nothing. Names are flagged UTF-8
   (general-purpose bit 11), which Windows Explorer, macOS Archive
   Utility and 7-Zip all honour.

   ZIP32 only — fine far below 4 GB and 65 535 entries, which a
   pack of voice lines never approaches.
   ============================================================ */
"use strict";

const zlib = require("zlib");

let TABLE = null;
function crc32(buf) {
    if (typeof zlib.crc32 === "function") return zlib.crc32(buf) >>> 0;   // Node >= 22.2
    if (!TABLE) {
        TABLE = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            TABLE[n] = c >>> 0;
        }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosTime(d) { return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF; }
function dosDate(d) { return (((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF; }

/* entries: [{ name: "folder/file.mp3", data: Buffer, date?: Date }] */
function zip(entries) {
    const parts = [], central = [];
    let offset = 0;

    entries.forEach(e => {
        const name = Buffer.from(e.name, "utf8");
        const data = e.data;
        const crc = crc32(data);
        const d = e.date instanceof Date && !isNaN(e.date) ? e.date : new Date();
        const t = dosTime(d), dt = dosDate(d);

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);   // local file header
        local.writeUInt16LE(20, 4);           // version needed: 2.0
        local.writeUInt16LE(0x0800, 6);       // flags: UTF-8 names
        local.writeUInt16LE(0, 8);            // method: store
        local.writeUInt16LE(t, 10);
        local.writeUInt16LE(dt, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18); // compressed size
        local.writeUInt32LE(data.length, 22); // uncompressed size
        local.writeUInt16LE(name.length, 26);
        local.writeUInt16LE(0, 28);           // extra length
        parts.push(local, name, data);

        const dir = Buffer.alloc(46);
        dir.writeUInt32LE(0x02014b50, 0);     // central directory header
        dir.writeUInt16LE(20, 4);             // version made by
        dir.writeUInt16LE(20, 6);             // version needed
        dir.writeUInt16LE(0x0800, 8);
        dir.writeUInt16LE(0, 10);
        dir.writeUInt16LE(t, 12);
        dir.writeUInt16LE(dt, 14);
        dir.writeUInt32LE(crc, 16);
        dir.writeUInt32LE(data.length, 20);
        dir.writeUInt32LE(data.length, 24);
        dir.writeUInt16LE(name.length, 28);
        dir.writeUInt16LE(0, 30);             // extra
        dir.writeUInt16LE(0, 32);             // comment
        dir.writeUInt16LE(0, 34);             // disk number
        dir.writeUInt16LE(0, 36);             // internal attributes
        dir.writeUInt32LE(0, 38);             // external attributes
        dir.writeUInt32LE(offset, 42);        // where the local header starts
        central.push(dir, name);

        offset += local.length + name.length + data.length;
    });

    const cd = Buffer.concat(central);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);         // end of central directory
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(0, 20);
    return Buffer.concat(parts.concat([cd, end]));
}

module.exports = { zip, crc32 };
