/* ============================================================
   TERMINAL: SHATTERED — neural voice
   ------------------------------------------------------------
   Alice reading text that has no recording — the AI sandbox's live
   reactions, and the demo's lines on HARD — in a real voice instead
   of the operating system's robot.

   The voice is made in serve.js: POST /api/tts { text, mood, lang }.
   It answers with
     • ElevenLabs — Milly Maple on Eleven v4, the voice the recorded
       Alice uses; the mood is acted out by audio tags
       ([panicked, breathless] …), any language the model knows;
     • or Piper (tools/piper/), offline, Russian only, when ElevenLabs
       is not set up, refuses, or the internet is down;
   and says which in the X-TTS-Engine header.

   The mood is finished here, in Web Audio:
         crit    — panic: the breath trembles, words stutter and drop
                   out (Piper also shakes in pitch and speeds up);
         loop    — lost in a loop: every phrase comes back as an echo
                   (Piper also goes lower and muffled);
         ok      — relief: a touch brighter, a small room around her;
         neutral — as it came.
   On an ElevenLabs line all of it is light and the pitch is never
   moved — the model has already acted the mood, and Milly has to
   stay Milly. How hard the damage hits follows «НАСТРОЙКИ → ЗВУК →
   глитч голоса» (off / subtle / heavy), like her recorded lines.

   The result plays on the voice bus, so the voice slider rides it,
   and takes the VoiceBus as "sample". Without serve.js (file://, a
   static host) or with neither engine there, speak() resolves false
   and the caller falls back to speech synthesis.

   Part 19 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const NeuralVoice = (function () {
        let info = null;                  // /api/tts/info, or { none: true }
        let checking = null;
        let cur = null;                   // { src, nodes, an, buf, stopped, timer }
        let lastEngine = "", lastNote = "";
        let base = "";                    // where /api/tts lives: "" = the server that gave this page

        function served() { return typeof location !== "undefined" && /^https?:$/.test(location.protocol); }
        function eleven() { return !!(info && info.elevenlabs && info.elevenlabs.configured); }
        function piper() { return !!(info && info.piper); }

        /* Where to ask. First the server that gave this page; if that is
           not serve.js — some other static server on this machine —
           then serve.js on the same host, port 8779 (or ?studio=<port>).
           serve.js allows exactly that: same host name, this machine. */
        function bases() {
            const list = [""];
            let port = "8779";
            try { port = new URLSearchParams(location.search).get("studio") || port; } catch (e) {}
            if (location.port !== port) list.push(location.protocol + "//" + location.hostname + ":" + port + "/");
            return list;
        }
        async function ask(b) {
            try {
                const r = await fetch(b + "api/tts/info", { cache: "no-store" });
                const j = r.ok ? await r.json() : null;
                return j && j.ok ? j : null;
            } catch (e) { return null; }
        }

        /* What does serve.js have? One request per page, cached;
           force re-asks (the bench does on open — the server may have
           been started, or a key added, since the page loaded). */
        function check(force) {
            if (info && !force) return Promise.resolve(eleven() || piper());
            if (checking) return checking;
            if (!served()) { info = { none: true }; return Promise.resolve(false); }
            checking = (async function () {
                for (const b of bases()) {
                    const j = await ask(b);
                    if (j) { info = j; base = b; return eleven() || piper(); }
                }
                info = { none: true };
                return false;
            })().finally(function () { checking = null; });
            return checking;
        }

        /* Can it read this language with this engine? ElevenLabs reads them
           all (Eleven v4 knows Russian, English and Tajik); Piper only
           Russian. engine: "auto" (default) | "elevenlabs" | "piper". */
        function fits(locale, engine) {
            const ru = (locale || "ru") === "ru";
            if (engine === "elevenlabs") return eleven();
            if (engine === "piper") return piper() && ru;
            return eleven() || (piper() && ru);
        }

        /* the sandbox's LUCIDITY bands */
        function moodOf(lucidity) {
            if (lucidity == null) return "neutral";
            if (lucidity <= 25) return "crit";
            if (lucidity <= 64) return "loop";
            if (lucidity <= 84) return "neutral";
            return "ok";
        }

        /* Demo lines carry no LUCIDITY; their words say enough to pick a
           mood. Pain and alarm → crit, lost time → loop, relief → ok. */
        function moodOfText(text) {
            const s = String(text || "").toLowerCase();
            const bangs = (s.match(/!/g) || []).length;
            if (bangs >= 2 || /больно|стой|помоги|не могу|задыха|умира|сбой|рушит|сминает|ломает|падаю|страшно/.test(s)) return "crit";
            /* relief before the loop: «спасибо, я снова вижу» is relief */
            if (/спасибо|получилось|дышу|ясно|стабил|тишина|спокойн/.test(s)) return "ok";
            if (/снова|опять|петл|цикл|по кругу|время|застрял|забыла|не помню/.test(s)) return "loop";
            return "neutral";
        }

        function damage() {
            const g = (typeof settingsState !== "undefined" && settingsState.voiceGlitch) || "subtle";
            return g === "off" ? 0 : g === "heavy" ? 1 : 0.55;
        }

        /* Stutters and dropouts are cut into the samples: Web Audio has no
           node for «say these 80 ms again». A few spots between 15% and 85%
           of the line; every copied slice gets 4 ms fades so the cuts do
           not click. */
        function rough(ctx, buf, g) {
            const sr = buf.sampleRate, src = buf.getChannelData(0), n = src.length;
            const spots = [];
            const count = Math.round(2 + 3 * g);
            for (let i = 0; i < count; i++) spots.push(Math.floor(n * (0.15 + 0.7 * (i + Math.random() * 0.8) / count)));
            const parts = [];
            let pos = 0;
            const fade = Math.floor(sr * 0.004);
            const slice = function (a, b) {
                const s = src.slice(a, b);
                for (let i = 0; i < fade && i < s.length; i++) { s[i] *= i / fade; s[s.length - 1 - i] *= i / fade; }
                return s;
            };
            spots.forEach(function (c) {
                if (c <= pos) return;
                parts.push(src.subarray(pos, c));
                const len = Math.floor(sr * (0.07 + Math.random() * 0.05));
                const reps = 1 + (Math.random() < g ? 2 : 1);
                for (let r = 0; r < reps; r++) parts.push(slice(c, Math.min(n, c + len)));
                if (Math.random() < g * 0.5) parts.push(new Float32Array(Math.floor(sr * (0.03 + Math.random() * 0.04))));
                pos = c;
            });
            parts.push(src.subarray(pos));
            const total = parts.reduce(function (a, p) { return a + p.length; }, 0);
            const out = ctx.createBuffer(1, total, sr), dst = out.getChannelData(0);
            let at = 0;
            parts.forEach(function (p) { dst.set(p, at); at += p.length; });
            return out;
        }

        function lfo(ctx, hz, depth, target, nodes) {
            const o = ctx.createOscillator(), d = ctx.createGain();
            o.frequency.value = hz; d.gain.value = depth;
            o.connect(d); d.connect(target); o.start();
            nodes.push(o, d);
        }

        /* source → mood effects → analyser → volume → voice bus.
           `studio`: an ElevenLabs line — light touch, pitch untouched.
           Returns how long the tail rings after the samples end. */
        function wire(ctx, src, mood, g, studio, volume, nodes) {
            let head = src;
            const add = function (n) { head.connect(n); head = n; nodes.push(n); return n; };
            const room = function (time, fb, wet) {
                const d = ctx.createDelay(2), f = ctx.createGain(), w = ctx.createGain(), mix = ctx.createGain();
                d.delayTime.value = time; f.gain.value = fb; w.gain.value = wet;
                head.connect(d); d.connect(f); f.connect(d); d.connect(w);
                head.connect(mix); w.connect(mix);
                nodes.push(d, f, w, mix);
                head = mix;
            };
            let tail = 0.1;
            if (mood === "crit") {
                if (!studio) {
                    src.playbackRate.value = 1.035;
                    lfo(ctx, 6.5, 0.012 + 0.022 * g, src.playbackRate, nodes);       // the voice shakes
                    const hp = add(ctx.createBiquadFilter()); hp.type = "highpass"; hp.frequency.value = 170;
                }
                const trem = add(ctx.createGain()); trem.gain.value = studio ? 0.92 : 0.82;
                lfo(ctx, 9, studio ? 0.03 + 0.06 * g : 0.12 + 0.2 * g, trem.gain, nodes);   // short of breath
            } else if (mood === "loop") {
                if (!studio) src.playbackRate.value = 0.95;
                const lp = add(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = studio ? 6500 : 3400;
                room(0.34, (studio ? 0.24 : 0.36) + 0.14 * g, studio ? 0.28 : 0.42); // the phrase comes back
                tail = 2.2;
            } else if (mood === "ok") {
                const shelf = add(ctx.createBiquadFilter()); shelf.type = "highshelf"; shelf.frequency.value = 3000; shelf.gain.value = studio ? 1.5 : 2.5;
                room(0.045, 0.2, studio ? 0.12 : 0.18);
                tail = 0.4;
            }
            const an = add(ctx.createAnalyser()); an.fftSize = 512; an.smoothingTimeConstant = 0.55;
            const vol = add(ctx.createGain()); vol.gain.value = volume;
            vol.connect(typeof Audio !== "undefined" && Audio.getVoiceNode ? Audio.getVoiceNode() : ctx.destination);
            return { an: an, tail: tail };
        }

        /* opts: { mood, lang, engine, volume, onStart, onEnd(natural) }. Resolves
           true once the voice has started (or was stopped while being made),
           false if no engine could read it — then nothing was played, onEnd
           is not called, and the caller can fall back. onEnd runs on every
           ending: natural === false means stop() cut it off. */
        async function speak(text, opts) {
            opts = opts || {};
            text = String(text || "").trim();
            const lang = opts.lang || (typeof settingsState !== "undefined" && settingsState.locale) || "ru";
            const want = opts.engine || "auto";                 // the engine asked for
            if (!text || !(await check()) || !fits(lang, want)) return false;
            const ctx = (typeof Audio !== "undefined" && Audio.getContext) ? Audio.getContext() : null;
            if (!ctx) return false;
            if (ctx.state !== "running") { try { await ctx.resume(); } catch (e) {} }
            stop();
            const mine = cur = { stopped: false, nodes: [], onEnd: opts.onEnd };
            const mood = opts.mood || "neutral";
            let buf, engine;
            try {
                const r = await fetch(base + "api/tts", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text, mood: mood, lang: lang, engine: want })
                });
                if (!r.ok) throw new Error("tts " + r.status);
                engine = r.headers.get("X-TTS-Engine") || "piper";
                try { lastNote = decodeURIComponent(r.headers.get("X-TTS-Note") || ""); } catch (e) { lastNote = ""; }
                buf = await ctx.decodeAudioData(await r.arrayBuffer());
            } catch (e) {
                if (cur === mine) cur = null;
                return mine.stopped;                                 // a stop() during the request already ended it
            }
            if (mine.stopped || cur !== mine) return true;          // stopped while it was being made: that is not a failure
            lastEngine = engine;
            const studio = engine === "elevenlabs";
            const g = damage();
            /* stutter on an ElevenLabs line only at «heavy», and lighter */
            if (mood === "crit" && g > 0 && (!studio || g === 1)) buf = rough(ctx, buf, studio ? 0.35 : g);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            mine.src = src;
            const w = wire(ctx, src, mood, g, studio, opts.volume != null ? opts.volume : 1, mine.nodes);
            mine.an = w.an; mine.fbuf = new Uint8Array(w.an.fftSize);
            if (typeof VoiceBus !== "undefined") VoiceBus.acquire("sample", stop, { interrupt: true });
            src.onended = function () {
                mine.timer = setTimeout(function () { finish(mine, true); }, w.tail * 1000);
            };
            src.start();
            mine.playing = true;
            if (opts.onStart) try { opts.onStart(); } catch (e) {}
            return true;
        }

        function finish(h, natural) {
            if (h.done) return;
            h.done = true; h.playing = false;
            clearTimeout(h.timer);
            try { if (h.src) { h.src.onended = null; h.src.stop(); } } catch (e) {}
            h.nodes.forEach(function (n) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} });
            if (cur === h) {
                cur = null;
                if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("sample");
            }
            if (h.onEnd) try { h.onEnd(!!natural); } catch (e) {}
        }

        function stop() {
            const h = cur;
            if (!h) return;
            h.stopped = true;
            finish(h, false);
        }

        /* 0..1 on a −48..0 dBFS scale, like VoiceMedia.level() */
        function level() {
            const h = cur;
            if (!h || !h.playing || !h.an) return 0;
            h.an.getByteTimeDomainData(h.fbuf);
            let sum = 0;
            for (let i = 0; i < h.fbuf.length; i++) { const v = (h.fbuf[i] - 128) / 128; sum += v * v; }
            const db = 20 * Math.log10(Math.sqrt(sum / h.fbuf.length) + 1e-6);
            return Math.max(0, Math.min(1, (db + 48) / 48));
        }

        /* one look on load, so the demo knows before its first line */
        if (typeof document !== "undefined") {
            document.addEventListener("DOMContentLoaded", function () { setTimeout(check, 2500); });
        }

        return {
            check: check, speak: speak, stop: stop, level: level, fits: fits,
            moodOf: moodOf, moodOfText: moodOfText,
            get ready() { return eleven() || piper(); },
            get engines() { return { elevenlabs: eleven(), piper: piper() }; },
            /* what the bench's voice picker shows: served by serve.js at all,
               which voice and model, and why ElevenLabs is resting if it is */
            get status() {
                return {
                    served: !!info && !info.none,
                    elevenlabs: info && info.elevenlabs ? info.elevenlabs : null,
                    piper: piper(), piperVoice: info && info.piperVoice
                };
            },
            get engine() { return lastEngine; },          // who read the last line: "elevenlabs" | "piper"
            get note() { return lastNote; },              // why ElevenLabs was skipped, if it was
            isSpeaking: function () { return !!(cur && (cur.playing || !cur.done)); }
        };
    })();
