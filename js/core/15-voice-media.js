/* ============================================================
   TERMINAL: SHATTERED — long voice tracks
   ------------------------------------------------------------
   One player for the voice pieces that run far longer than a deck
   line: the five jury-intro acts, the voice-path test in settings
   and the «Взаперти» extra. Ids match voice/catalog.json.

   Source, per track:
     1. a take recorded for the current language in the voice studio
        (VOICE_CLIPS, refreshed live by 00-voice-sync.js);
     2. otherwise the Russian web copy, assets/audio/ru/<id>.mp3 —
        a long piece falls back rather than going silent, and the
        caller is told which language actually plays so it can show
        subtitles that match;
     3. if that fails to load, the original in masters/.

   Routing. Over http the element runs through Web Audio — the voice
   bus, so the settings slider rides it live, plus an analyser the
   intro and the voice test draw from. From file:// that is not
   possible: Chrome treats a local file as cross-origin to the page
   and a MediaElementSource fed by it outputs pure silence. There the
   element plays on its own, its volume follows the sliders by
   polling, and level() returns a plausible speech envelope instead
   of a measured one. The "master" bus skips the voice slider — the
   extra can be summoned by dragging that slider to zero.

   While a track plays, Alice's deck chatter holds its tongue
   (window.__voiceMediaHold, read by 09-alice-stream.js) and the
   VoiceBus is taken as "sample", which outranks speech synthesis.

   Part 15 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const VoiceMedia = (function () {
        const SRC_KEY = "__vmSrc";
        const active = new Set();
        let hold = 0;

        function locale() {
            const s = (typeof settingsState !== "undefined") ? settingsState : null;
            return (s && s.locale) || "ru";
        }
        function isLocalFile() { return typeof location !== "undefined" && location.protocol === "file:"; }

        /* -> [{ url, loc }] in the order to try */
        function sources(id) {
            const loc = locale();
            const out = [];
            const clips = (typeof VOICE_CLIPS !== "undefined" && VOICE_CLIPS) ? VOICE_CLIPS : {};
            if (clips[loc] && clips[loc][id]) out.push({ url: clips[loc][id], loc: loc });
            if (loc !== "ru" && clips.ru && clips.ru[id]) out.push({ url: clips.ru[id], loc: "ru" });
            out.push({ url: "assets/audio/ru/" + id + ".mp3", loc: "ru" });
            out.push({ url: "assets/audio/ru/masters/" + id + ".mp3", loc: "ru" });
            return out;
        }

        /* The language that will play, without loading anything —
           the intro needs it to pick subtitles before the first frame. */
        function langOf(id) { return sources(id)[0].loc; }

        function setHold(on) {
            hold = Math.max(0, hold + (on ? 1 : -1));
            window.__voiceMediaHold = hold > 0;
        }

        /* Warm the cache for a track that will be needed soon. On a weak
           link this is what makes act 2 start the instant act 1 ends.
           Asked again after a language switch, it drops the download in
           the old language instead of letting it eat the link. */
        const URL_KEY = "__vmUrl";
        const warm = {};
        function drop(el) {
            try { el.removeAttribute("src"); el.load(); } catch (e) {}
        }
        function preload(id) {
            const url = sources(id)[0].url;
            const old = warm[id];
            if (old && old[URL_KEY] === url) return old;
            if (old) drop(old);
            const a = document.createElement("audio");
            a.preload = "auto";
            a.src = url;
            a[URL_KEY] = url;
            try { a.load(); } catch (e) {}
            warm[id] = a;
            return a;
        }

        function busVolume(bus) {
            const s = (typeof settingsState !== "undefined") ? settingsState : null;
            if (bus === "master") {
                const m = (s && Number.isFinite(s.volMaster)) ? s.volMaster : 70;
                return Math.max(0, Math.min(1, m / 100));
            }
            return (typeof voiceVolume01 === "function") ? voiceVolume01() : 1;
        }

        /* opts: { bus: "voice"|"master", volume: 0..1 per-track trim,
                   onStart(info), onEnd(), onError(err), interrupt: bool,
                   followLocale: bool — switch language mid-play (follow()) } */
        function play(id, opts) {
            opts = opts || {};
            const bus = opts.bus === "master" ? "master" : "voice";
            const trim = opts.volume != null ? opts.volume : 1;
            let list = sources(id);
            let attempt = 0, dead = false, started = false, url = null, switching = false;
            let a = null, graph = null, poll = 0, fakeT0 = 0;

            const h = {
                id: id, loc: list[0].loc, bus: bus,
                get audio() { return a; },
                get currentTime() { return a ? a.currentTime : 0; },
                get duration() { return a && isFinite(a.duration) ? a.duration : 0; },
                get playing() { return !!a && !a.paused && !dead; },
                stop: stop, pause: pause, resume: resume, level: level, spectrum: spectrum, follow: follow
            };

            function cleanup() {
                clearInterval(poll); poll = 0;
                if (graph) { try { graph.src.disconnect(); graph.an.disconnect(); graph.g.disconnect(); } catch (e) {} graph = null; }
            }
            function finish(kind, err) {
                if (dead) return;
                dead = true;
                cleanup();
                active.delete(h);
                setHold(false);
                if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("sample");
                if (kind === "end" && opts.onEnd) try { opts.onEnd(); } catch (e) {}
                if (kind === "error" && opts.onError) try { opts.onError(err); } catch (e) {}
            }
            function stop() {
                if (a) { try { a.pause(); } catch (e) {} }
                finish("stop");
            }
            function pause() { if (a && !dead) try { a.pause(); } catch (e) {} }
            function resume() { if (a && !dead && a.paused) { const p = a.play(); if (p && p.catch) p.catch(function () {}); } }

            /* The language was switched while this plays: carry on in the
               new one from the same point of the piece. Takes run to
               different lengths, so the point is a share, not seconds. The
               element keeps its Web Audio routing across a new src. Only
               for tracks that ask — the intro's subtitles are timed to the
               language it started in. */
            function follow() {
                if (dead || !a || !opts.followLocale) return;
                const next = sources(id);
                if (next[0].url === url) return;
                const k = h.duration ? a.currentTime / h.duration : 0;
                const wasPlaying = !a.paused;
                list = next; attempt = 1; url = next[0].url; h.loc = next[0].loc;
                switching = true;
                a.src = url;
                a.addEventListener("loadedmetadata", function () {
                    try { if (isFinite(a.duration)) a.currentTime = k * a.duration; } catch (e) {}
                }, { once: true });
                if (wasPlaying) { const p = a.play(); if (p && p.catch) p.catch(function () {}); }
            }

            function route(el) {
                let ctx = (!isLocalFile() && typeof Audio !== "undefined" && Audio.getContext) ? Audio.getContext() : null;
                if (ctx && ctx.state !== "running") { try { Audio.resume(); } catch (e) {} }
                if (ctx && ctx.state !== "running") ctx = null;
                const out = bus === "voice" && ctx && Audio.getVoiceNode ? Audio.getVoiceNode() : (ctx ? ctx.destination : null);
                if (ctx && out) {
                    try {
                        let src = el[SRC_KEY];
                        if (!src) { src = ctx.createMediaElementSource(el); el[SRC_KEY] = src; }
                        const an = ctx.createAnalyser();
                        an.fftSize = 512;
                        an.smoothingTimeConstant = 0.6;
                        const g = ctx.createGain();
                        /* the voice bus already carries the slider; the master
                           path only exists for the extra, which sets its own level */
                        g.gain.value = bus === "voice" ? trim : trim * busVolume("master");
                        src.connect(an); an.connect(g); g.connect(out);
                        el.volume = 1;
                        graph = { src: src, an: an, g: g, buf: new Uint8Array(an.fftSize), fbuf: new Uint8Array(an.frequencyBinCount) };
                        if (bus === "master") poll = setInterval(function () { if (graph) graph.g.gain.value = trim * busVolume("master"); }, 200);
                        return;
                    } catch (e) { graph = null; }
                }
                el.volume = Math.max(0, Math.min(1, trim * busVolume(bus)));
                poll = setInterval(function () { if (a) a.volume = Math.max(0, Math.min(1, trim * busVolume(bus))); }, 200);
            }

            function tryNext() {
                if (dead) return;
                if (attempt >= list.length) { finish("error", new Error("не удалось загрузить " + id)); return; }
                const s = list[attempt++];
                h.loc = s.loc; url = s.url;
                cleanup();
                const w = warm[id];
                delete warm[id];
                if (w && w[URL_KEY] === s.url) a = w;
                else {
                    if (w) drop(w);                    // preloaded in another language
                    a = document.createElement("audio");
                    a.src = s.url;
                }
                a.preload = "auto";
                a.onended = function () { finish("end"); };
                /* a take in the new language that will not load falls back
                   down the list (from the start) instead of ending the track */
                a.onerror = function () { if (!started || switching) tryNext(); else finish("error", new Error("обрыв " + id)); };
                a.onplaying = function () {
                    switching = false;
                    if (started) return;
                    started = true;
                    fakeT0 = performance.now();
                    if (opts.onStart) try { opts.onStart({ loc: h.loc, duration: h.duration }); } catch (e) {}
                };
                route(a);
                const p = a.play();
                if (p && p.catch) p.catch(function (err) {
                    if (dead) return;
                    if (err && err.name === "NotAllowedError") finish("error", err);   // needs a user gesture
                    else if (!started) tryNext();
                });
            }

            /* 0..1 loudness for meters: RMS on a −48..0 dBFS scale, so
               ordinary speech sits mid-meter instead of in the first notch */
            function level() {
                if (!a || a.paused || dead) return 0;
                if (graph) {
                    graph.an.getByteTimeDomainData(graph.buf);
                    let sum = 0;
                    for (let i = 0; i < graph.buf.length; i++) { const v = (graph.buf[i] - 128) / 128; sum += v * v; }
                    const db = 20 * Math.log10(Math.sqrt(sum / graph.buf.length) + 1e-6);
                    return Math.max(0, Math.min(1, (db + 48) / 48));
                }
                const t = (performance.now() - fakeT0) / 1000;
                return 0.28 + 0.22 * Math.abs(Math.sin(t * 7.3)) * (0.6 + 0.4 * Math.sin(t * 2.1)) + 0.12 * Math.random();
            }
            /* n bands 0..1 for an equaliser */
            function spectrum(n) {
                const out = new Array(n).fill(0);
                if (!a || a.paused || dead) return out;
                if (graph) {
                    graph.an.getByteFrequencyData(graph.fbuf);
                    const usable = Math.floor(graph.fbuf.length * 0.45);       // speech lives low
                    for (let i = 0; i < n; i++) {
                        const from = Math.floor(usable * i / n), to = Math.max(from + 1, Math.floor(usable * (i + 1) / n));
                        let m = 0;
                        for (let j = from; j < to; j++) m = Math.max(m, graph.fbuf[j]);
                        out[i] = m / 255;
                    }
                    return out;
                }
                const lv = level();
                for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(1, lv * (0.55 + 0.45 * Math.sin(i * 1.7 + performance.now() / 160)) + 0.1 * Math.random()));
                return out;
            }

            if (typeof VoiceBus !== "undefined") VoiceBus.acquire("sample", stop, { interrupt: opts.interrupt !== false });
            setHold(true);
            active.add(h);
            tryNext();
            return h;
        }

        function pauseAll() { active.forEach(function (h) { h.pause(); }); }
        function resumeAll() { active.forEach(function (h) { h.resume(); }); }
        function stopAll() { Array.from(active).forEach(function (h) { h.stop(); }); }
        /* after a language switch (10-i18n.js applyLocale) */
        function followAll() { active.forEach(function (h) { h.follow(); }); }

        return { play: play, preload: preload, langOf: langOf, pauseAll: pauseAll, resumeAll: resumeAll, stopAll: stopAll,
                 followAll: followAll, get busy() { return active.size > 0; } };
    })();
