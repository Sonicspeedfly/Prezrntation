/* ============================================================
   TERMINAL: SHATTERED — jury intro hijack
   ------------------------------------------------------------
   After «НОВАЯ ИГРА» the fake loader climbs to 24%, freezes, and an
   external carrier takes the screen: five acts in which Neikon and
   Alice present the project to the panel themselves, then a gate
   opens on «ВОЙТИ В СЕКТОР». Enter / Space / click goes into the
   deck through the loader's own kernel-panic crash; ESC skips.

   Wired from 11-settings.js runLoadingSequence(). By then the user
   has clicked a menu button, so the browser allows sound — no
   «click to start» screen in the normal case. If a browser refuses
   anyway, the intro asks for one key press, diegetically.

   Audio and words. Each act plays through VoiceMedia (15): the take
   recorded for the current language, else the Russian one. Subtitles
   come from JURY_CUES (14, built by voice/cues.js) for the language
   that is ACTUALLY playing — Russian audio gets Russian text, never a
   translation over the wrong voice. Scene changes are keyed to the
   speaker turns of the script, not to seconds, so the staging lands
   on the same lines in every language and survives any re-recording.

   Slow links. Act 1 is fetched as soon as the menu is up (prime()),
   and fetched again in the new language whenever the language is
   switched; while it buffers, the deck's own voice waits, so the
   first thing the room hears is not competing for bandwidth. Each
   next act is fetched while the current one plays. An act whose
   download stalls is skipped rather than freezing the stage.

   No WebGL: the «bunker» shots are SVG and CSS, so this cannot touch
   the demo's GL context or its task parser.

   Respects the a11y epilepsy mode and prefers-reduced-motion: no
   flashes, no shake, fades instead of tears.

   Part 16 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const JuryIntro = (function () {
        const ACTS = ["jury_act1", "jury_act2", "jury_act3", "jury_act4", "jury_act5"];
        const ACT_STALL_MS    = 15000;    // an act whose download has not moved for this long is skipped
        const ACT_MAX_WAIT_MS = 90000;    // …and so is one that has not started by then, moving or not
        let run = null;                   // the live run, or null
        let lastWhy = "";                 // why the last act was skipped, for the loader log

        function tx(key, fallback) {
            try { const v = t(key); return v && v !== key ? v : fallback; } catch (e) { return fallback; }
        }
        function esc(s) {
            return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
            });
        }
        function calm() {
            return document.body.classList.contains("epilepsy-safe") ||
                   (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        }
        function mmss(s) {
            s = Math.max(0, Math.floor(s || 0));
            return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        }
        /* seconds of the take already downloaded, and the same as a share */
        function buffered(el) {
            try { return el && el.buffered.length ? el.buffered.end(el.buffered.length - 1) : 0; } catch (e) { return 0; }
        }
        function loaded(el) {
            const d = el && el.duration;
            return d > 0 && isFinite(d) ? Math.min(99, Math.round(buffered(el) / d * 100)) + "%" : "…";
        }

        /* On unless switched off in settings; ?intro=0 / ?intro=1 overrides
           for one load — handy for a rehearsal without touching settings. */
        function enabled() {
            try {
                const q = new URLSearchParams(location.search).get("intro");
                if (q === "0" || q === "off") return false;
                if (q === "1" || q === "on") return true;
            } catch (e) {}
            return !(typeof settingsState !== "undefined" && settingsState.juryIntro === "off");
        }

        /* ---- network priming ------------------------------------------- */

        /* The deck's voice bundle (1.7 MB) waits while act 1 downloads in
           the menu. If the intro is already running by then, it waits
           longer — until act 4, when every act is fetched or fetching —
           so on a thin link the acts never queue behind the bundle. */
        function releaseLink() {
            window.__juryIntroHoldsLink = false;
            if (typeof loadAliceAudio === "function") loadAliceAudio();
        }
        function idle() { if (!run && window.__juryIntroHoldsLink) releaseLink(); }
        /* Called on load and again on every language switch (10-i18n.js),
           so act 1 is fetched in the language that will actually play —
           not the Russian one the page happened to open with, which left
           a translated act 1 to start from a cold download and run into
           the watchdog on a slow link. */
        let primedEl = null, holdTimer = 0;
        function prime() {
            if (run || !enabled() || typeof VoiceMedia === "undefined") return;
            const a = VoiceMedia.preload(ACTS[0]);
            if (a === primedEl) return;
            primedEl = a;
            window.__juryIntroHoldsLink = true;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(idle, 9000);   // never hold the deck's own voice hostage
            const done = function () { if (a === primedEl) idle(); };
            if (a.readyState >= 4) { done(); return; }
            a.addEventListener("canplaythrough", done, { once: true });
            a.addEventListener("error", done, { once: true });
        }

        /* ---- dom --------------------------------------------------------- */

        function build() {
            const el = document.createElement("div");
            el.className = "ji" + (calm() ? " ji-calm" : "");
            el.setAttribute("role", "dialog");
            el.setAttribute("aria-label", tx("ji.aria", "Интро для жюри"));
            el.innerHTML = '' +
                '<div class="ji-noise" aria-hidden="true"></div>' +
                '<header class="ji-top">' +
                    '<span class="ji-rec"><i></i>CH-104 · EXTERNAL CARRIER</span>' +
                    '<span class="ji-act"></span>' +
                    '<span class="ji-who" aria-hidden="true"></span>' +
                    '<span class="ji-time">00:00</span>' +
                '</header>' +
                '<div class="ji-alert" aria-live="polite">' +
                    '<div class="l1"></div><div class="l2"></div>' +
                '</div>' +
                '<div class="ji-stage">' + scenes() + '</div>' +
                '<section class="ji-term" aria-live="polite"><div class="ji-lines"></div>' +
                    '<div class="ji-status"></div></section>' +
                '<div class="ji-eq" aria-hidden="true">' + new Array(28).fill('<i></i>').join("") + '</div>' +
                '<div class="ji-gate" aria-hidden="true">' +
                    '<div class="ji-door l"><span>SECTOR</span></div><div class="ji-door r"><span>A-01</span></div>' +
                '</div>' +
                '<div class="ji-go">' +
                    '<button type="button" class="ji-enter" disabled>' + esc(tx("ji.enter", "[ ВОЙТИ В СЕКТОР // НАЧАТЬ ЖИВУЮ ДЕМОНСТРАЦИЮ ]")) + '</button>' +
                    '<div class="ji-enter-hint">' + esc(tx("ji.enter_hint", "Enter · пробел · клик")) + '</div>' +
                '</div>' +
                '<div class="ji-tap" hidden><button type="button">' + esc(tx("ji.tap", "[ ПРИНЯТЬ ТРАНСЛЯЦИЮ — нажмите любую клавишу ]")) + '</button></div>' +
                '<button type="button" class="ji-skip">' + esc(tx("ji.skip", "[ Пропустить интро · ESC ]")) + '</button>';
            document.body.appendChild(el);
            return el;
        }

        function scenes() {
            return '' +
            /* act 1 — the carrier bridges the bus to the audience display */
            '<div class="ji-scene s1">' +
                '<div class="ji-bridge">' +
                    '<div class="node src">VOID_OS<small>/dev/alice</small></div>' +
                    '<div class="wire"><i></i></div>' +
                    '<div class="node dst">AUDIENCE<br>DISPLAY<small>jury.panel</small></div>' +
                '</div>' +
            '</div>' +
            /* act 2 — cargo cult: a crash on the left, the quote on the right */
            '<div class="ji-scene s2">' +
                '<div class="ji-crash">' +
                    '<div class="ji-win-head">core.dump — student.cpp</div>' +
                    '<pre class="ji-stack"></pre>' +
                    '<div class="ji-leak"><span>resident</span><b>96 KB</b><i><u></u></i></div>' +
                '</div>' +
                '<blockquote class="ji-quote"><p>' + esc(tx("ji.quote", "«Этот сектор создан не для зубрёжки синтаксиса, а для реверс-дебаггинга.»")) +
                    '</p><cite>— ' + esc(tx("ji.who.neikon", "НЕЙКОН")) + ' · reverse-debugging</cite></blockquote>' +
            '</div>' +
            /* act 3 — code drives matter; the constant lives on a wall gauge */
            '<div class="ji-scene s3"><div class="ji-cam">' +
                '<svg class="ji-gauge" viewBox="0 0 220 220" aria-hidden="true">' +
                    '<circle cx="110" cy="110" r="100" class="rim"/>' +
                    '<circle cx="110" cy="110" r="88" class="face"/>' +
                    gaugeTicks() +
                    '<text x="110" y="160" class="lbl">BAR</text>' +
                    '<text x="110" y="182" class="val">1.1</text>' +
                    '<g class="needle"><line x1="110" y1="110" x2="110" y2="34"/><circle cx="110" cy="110" r="7"/></g>' +
                '</svg>' +
                '<pre class="ji-code"><span class="c">// door_ctl.cpp — сектор А-01</span>\n' +
                    '<span class="k">const float</span> VENT_LIMIT = <b class="hl">1.1f</b>;  <span class="c">// снять с манометра</span>\n\n' +
                    '<span class="k">if</span> (room_pressure() &lt; VENT_LIMIT)\n' +
                    '    interlock_release();\n' +
                    '<span class="k">else</span>\n' +
                    '    hold_door();</pre>' +
            '</div>' +
            '<div class="ji-plate ji-antiai">ANTI-AI ARCHITECTURE :: HARDWARE CONSTANT VERIFICATION</div>' +
            '</div>' +
            /* act 4 — offline stack, the tea joke, the certificate */
            '<div class="ji-scene s4">' +
                '<div class="ji-card"><div class="k">STACK</div><div class="v">llama.cpp + Qwen2.5-Coder</div>' +
                    '<div class="tag">100% OFFLINE · 0 SOMONI · NO CLOUD · NO API</div></div>' +
                '<div class="ji-langs"><span>PYTHON</span><span>C++</span><span>C</span></div>' +
                '<div class="ji-badge">' + esc(tx("ji.badge", "ГОСУДАРСТВЕННОЕ СВИДЕТЕЛЬСТВО")) + ' <b>№ 410</b></div>' +
                '<div class="ji-plate ji-tea">[ SYSTEM STATUS: LEAD DEVELOPER ALISHER // TEA_LEVEL: 100% · MEMORY_LEAKS: 0 ]</div>' +
            '</div>' +
            '<div class="ji-scene s5"></div>';
        }

        function gaugeTicks() {
            let out = "";
            for (let i = 0; i <= 30; i++) {
                const a = (-120 + i * 8) * Math.PI / 180;
                const r1 = i % 5 === 0 ? 70 : 78, r2 = 86;
                out += '<line class="tick' + (i % 5 === 0 ? " major" : "") + '" x1="' + (110 + r1 * Math.sin(a)).toFixed(1) +
                       '" y1="' + (110 - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (110 + r2 * Math.sin(a)).toFixed(1) +
                       '" y2="' + (110 - r2 * Math.cos(a)).toFixed(1) + '"/>';
                if (i % 10 === 0) out += '<text class="num" x="' + (110 + 58 * Math.sin(a)).toFixed(1) + '" y="' +
                                         (114 - 58 * Math.cos(a)).toFixed(1) + '">' + (i / 10) + '</text>';
            }
            return out;
        }

        /* ---- staging: keyed to speaker turns, not seconds ---------------- */
        /* at: "start" | "last" | "penult" — cue position inside the turn */

        const STACK_LINES = [
            "$ g++ student.cpp -o run && ./run",
            "[ heap ]  resident: 96 KB",
            "[ heap ]  resident: 412 KB",
            "[ heap ]  resident: 1.4 MB",
            "==4410== Invalid read of size 8",
            "==4410==    at 0x4011E6: Room::tick() (room.cpp:71)",
            "==4410== 2,097,152 bytes definitely lost",
            "[ panic ] heap exhausted :: std::bad_alloc",
            "SIGSEGV  ::  segmentation fault (core dumped)",
            "$ _"
        ];

        function stagingFor(r, actIdx) {
            const root = r.root;
            const q = function (s) { return root.querySelector(s); };
            const on = function (s) { const e = q(s); if (e) e.classList.add("on"); };
            const tick = function (fn, ms) { const id = setInterval(fn, ms); r.timers.push(id); return id; };

            switch (actIdx) {
            case 0: return [
                { turn: 1, at: "start", fn: function () {
                    on(".ji-bridge"); root.classList.add("ji-bridged");
                    typeAlert(r, 2, "[ BRIDGING BUS TO AUDIENCE DISPLAY ... OK ]");
                } }
            ];
            case 1: return [
                { turn: 0, at: "start", fn: function () {
                    let i = 0;
                    const pre = q(".ji-stack");
                    tick(function () {
                        if (i >= STACK_LINES.length) return;
                        pre.textContent += STACK_LINES[i++] + "\n";
                    }, 1500);
                } },
                { turn: 1, at: "start", fn: function () {
                    on(".ji-leak");
                    let kb = 96;
                    const v = q(".ji-leak b"), bar = q(".ji-leak u");
                    tick(function () {
                        kb = Math.min(4096 * 1024, Math.round(kb * 1.35 + 64));
                        v.textContent = kb > 9999 ? (kb / 1024).toFixed(1) + " MB" : kb + " KB";
                        bar.style.width = Math.min(100, Math.log2(kb / 96) * 7) + "%";
                    }, 420);
                } },
                { turn: 2, at: "start", fn: function () { on(".ji-quote"); } }
            ];
            case 2: return [
                { turn: 0, at: "start", fn: function () { on(".ji-gauge"); on(".ji-code"); } },
                { turn: 1, at: "start", fn: function () { on(".ji-antiai"); } },
                { turn: 2, at: "start", fn: function () { root.classList.add("ji-push"); } }
            ];
            case 3: return [
                { turn: 0, at: "start", fn: function () { on(".ji-card"); } },
                { turn: 1, at: "start", fn: function () { on(".ji-tea"); } },
                { turn: 1, at: "penult", fn: function () { on(".ji-langs"); } },
                { turn: 1, at: "last", fn: function () { on(".ji-badge"); } }
            ];
            case 4: return [
                { turn: 0, at: "start", fn: function () { root.classList.add("ji-gate-up"); } },
                { turn: 0, at: "last", fn: function () { openGate(r); } },
                { turn: 1, at: "start", fn: function () { armEnter(r); } }
            ];
            }
            return [];
        }

        function typeAlert(r, which, text) {
            const el = r.root.querySelector(".ji-alert .l" + which);
            if (!el) return;
            let i = 0;
            const id = setInterval(function () {
                el.textContent = text.slice(0, ++i);
                if (i >= text.length) clearInterval(id);
            }, 18);
            r.timers.push(id);
        }

        function openGate(r) {
            r.root.classList.add("ji-gate-up", "ji-open");
            if (!calm() && typeof Audio !== "undefined" && Audio.playTransition) try { Audio.playTransition(0.6); } catch (e) {}
        }
        function armEnter(r) {
            if (r.armed) return;
            r.armed = true;
            openGate(r);
            const b = r.root.querySelector(".ji-enter");
            b.disabled = false;
            r.root.classList.add("ji-ready");
            setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) {} }, 60);
        }

        /* ---- cues -------------------------------------------------------- */

        /* Subtitles for the language that plays. Without them (a translated
           take with no script yet) the staging still runs: the Russian turn
           timings, scaled to this recording's length, with no text shown. */
        function cuesFor(id, loc, duration) {
            const all = (typeof JURY_CUES !== "undefined" && JURY_CUES) ? JURY_CUES : {};
            const own = all[loc] && all[loc][id];
            if (own) return { cues: own.cues, text: true };
            const ru = all.ru && all.ru[id];
            if (!ru) return { cues: [], text: false };
            const k = duration && ru.dur ? duration / ru.dur : 1;
            return { cues: ru.cues.map(function (c) { return Object.assign({}, c, { t: c.t * k, end: c.end * k }); }), text: false };
        }

        function indexTurns(cues) {
            const byTurn = {};
            cues.forEach(function (c, i) { (byTurn[c.block] = byTurn[c.block] || []).push(i); });
            return cues.map(function (c, i) {
                const list = byTurn[c.block];
                const pos = list.indexOf(i);
                return { first: pos === 0, last: pos === list.length - 1, penult: pos === list.length - 2 };
            });
        }

        /* Names in a subtitle line follow the language of the line (the
           recording), not the interface: Russian audio under an English UI
           reads «НЕЙКОН: …», as the script does. */
        function speaker(who, loc) {
            if (loc === "en") return who === "neikon" ? "NEIKON" : "ALICE";
            return who === "neikon" ? "НЕЙКОН" : "ЭЛИС";
        }

        function addLine(r, cue) {
            const box = r.root.querySelector(".ji-lines");
            const line = document.createElement("div");
            line.className = "ji-line " + (cue.who === "neikon" ? "n" : "a");
            line.innerHTML = '<span class="who">' + esc(speaker(cue.who, r.textLoc)) +
                             '</span><span class="txt"></span><span class="caret"></span>';
            box.appendChild(line);
            while (box.children.length > 4) box.removeChild(box.firstChild);
            Array.from(box.children).forEach(function (c, i, all) { c.classList.toggle("old", i < all.length - 1); });
            return line.querySelector(".txt");
        }

        /* ---- the run ----------------------------------------------------- */

        function start(hooks) {
            if (run) return run.promise;
            hooks = hooks || {};
            const r = { root: build(), act: -1, handle: null, timers: [], armed: false, done: false, typing: [], raf: 0 };
            run = r;
            window.__juryIntroHoldsLink = true;   // the deck's takes wait for act 4 (releaseLink)
            r.promise = new Promise(function (resolve) { r.resolve = resolve; });

            if (typeof Audio !== "undefined" && Audio.stopMusic) Audio.stopMusic();   // the menu theme would sit under the speech
            if (hooks.setStatus) hooks.setStatus("!! EXTERNAL CARRIER :: CH-104 !!");
            if (hooks.addLine) hooks.addLine("[WARN] foreign carrier on the audience bus", "warn");

            requestAnimationFrame(function () { r.root.classList.add("on"); });
            typeAlert(r, 1, "[ CRITICAL :: EXTERNAL BROADCAST CARRIER DETECTED ]");
            typeAlert(r, 2, "[ BRIDGING BUS TO AUDIENCE DISPLAY ... ");

            r.root.querySelector(".ji-skip").addEventListener("click", function () { finish("skip"); });
            r.root.querySelector(".ji-enter").addEventListener("click", function () { if (r.armed) finish("enter"); });
            r.onKey = function (e) {
                if (!run || run !== r) return;
                if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); finish("skip"); }
                else if ((e.key === "Enter" || e.key === " ") && r.armed) { e.preventDefault(); e.stopImmediatePropagation(); finish("enter"); }
            };
            window.addEventListener("keydown", r.onKey, true);

            setTimeout(function () { nextAct(r); }, calm() ? 400 : 1100);
            loop(r);
            return r.promise;
        }

        function nextAct(r) {
            if (r.done) return;
            r.act++;
            if (r.act >= ACTS.length) { armEnter(r); return; }
            const id = ACTS[r.act];
            r.root.dataset.act = String(r.act + 1);
            r.root.querySelector(".ji-act").textContent = "ACT " + (r.act + 1) + "/5 · " + tx("ji.act" + (r.act + 1), "");
            r.root.querySelector(".ji-lines").innerHTML = "";
            r.cues = null; r.fired = 0; r.staging = stagingFor(r, r.act); r.started = false;
            status(r, "[ ACQUIRING CARRIER · " + id.toUpperCase() + " … ]");

            if (!calm()) { r.root.classList.remove("ji-cut"); void r.root.offsetWidth; r.root.classList.add("ji-cut"); }
            if (typeof Audio !== "undefined" && Audio.playGlitch && !calm()) try { Audio.playGlitch(0.45); } catch (e) {}

            /* Skipped only when the download stops moving, not on a fixed
               clock: a 600 KB act over a weak link may need half a minute,
               and the room would rather watch the percentage climb. */
            const myAct = r.act, t0 = Date.now();
            let got = -1, moved = t0;
            const watch = function () {
                if (r.done || r.act !== myAct || r.started) return;
                const el = r.handle && r.handle.audio, now = Date.now();
                const b = buffered(el);
                if (b > got) { got = b; moved = now; }
                if (now - moved < ACT_STALL_MS && now - t0 < ACT_MAX_WAIT_MS) {
                    if (now - t0 > 2500) status(r, "[ ACQUIRING CARRIER · " + id.toUpperCase() + " · " + loaded(el) + " ]");
                    r.watchdog = setTimeout(watch, 500);
                    return;
                }
                status(r, "[ CARRIER LOST · " + id.toUpperCase() + " — SKIPPED ]");
                lastWhy = id + " stalled at " + loaded(el);
                if (r.handle) r.handle.stop();
                if (r.act === 0) { finish("unavailable"); return; }   // nothing ever played: fall back to the normal loader
                nextAct(r);
            };
            r.watchdog = setTimeout(watch, 500);

            r.handle = VoiceMedia.play(id, {
                bus: "voice",
                onStart: function (info) {
                    if (r.done || r.act !== myAct) return;
                    r.started = r.everStarted = true;
                    clearTimeout(r.watchdog);
                    if (r.act >= 3) releaseLink();
                    status(r, "");
                    const c = cuesFor(id, info.loc, r.handle.duration);
                    r.cues = c.cues; r.showText = c.text; r.textLoc = info.loc; r.marks = indexTurns(c.cues); r.fired = 0;
                    r.root.classList.toggle("ji-notext", !c.text);
                    if (r.act + 1 < ACTS.length) VoiceMedia.preload(ACTS[r.act + 1]);
                },
                onEnd: function () {
                    if (r.done || r.act !== myAct) return;
                    flushStaging(r);
                    setTimeout(function () { nextAct(r); }, r.act === ACTS.length - 1 ? 0 : 650);
                },
                onError: function (err) {
                    if (r.done || r.act !== myAct) return;
                    clearTimeout(r.watchdog);
                    if (err && err.name === "NotAllowedError") { askForGesture(r); return; }
                    status(r, "[ CARRIER LOST · " + id.toUpperCase() + " — SKIPPED ]");
                    lastWhy = (err && err.message) || id + " failed";
                    if (r.act === 0 && !r.everStarted) { finish("unavailable"); return; }
                    nextAct(r);
                }
            });
        }

        /* the browser refused sound without a fresh gesture: ask for one */
        function askForGesture(r) {
            const tap = r.root.querySelector(".ji-tap");
            tap.hidden = false;
            const go = function () {
                tap.hidden = true;
                window.removeEventListener("keydown", go, true);
                tap.removeEventListener("pointerdown", go);
                r.act--;
                nextAct(r);
            };
            window.addEventListener("keydown", go, true);
            tap.addEventListener("pointerdown", go);
        }

        function status(r, text) {
            const s = r.root.querySelector(".ji-status");
            if (s) s.textContent = text;
        }

        /* fire anything the cue list reached without the frame loop seeing it */
        function flushStaging(r) {
            if (!r.cues) return;
            while (r.fired < r.cues.length) fireCue(r, r.fired++, true);
        }

        function fireCue(r, i, silent) {
            const cue = r.cues[i], mark = r.marks[i];
            if (r.showText && !silent) {
                const span = addLine(r, cue);
                r.typing.push({ span: span, text: cue.text, t0: cue.t, dur: Math.max(0.6, (cue.end - cue.t) * 0.8) });
            }
            r.root.dataset.who = cue.who === "neikon" ? "n" : "a";
            const who = r.root.querySelector(".ji-who");
            if (who) { who.textContent = "▶ " + (cue.who === "neikon" ? tx("ji.who.neikon", "НЕЙКОН") : tx("ji.who.alice", "ЭЛИС")); who.className = "ji-who " + (cue.who === "neikon" ? "n" : "a"); }
            r.staging.forEach(function (s) {
                if (s.turn !== cue.block || s.done) return;
                if ((s.at === "start" && mark.first) || (s.at === "last" && mark.last) || (s.at === "penult" && mark.penult)) {
                    s.done = true;
                    try { s.fn(); } catch (e) {}
                }
            });
        }

        function loop(r) {
            if (r.done) return;
            const h = r.handle;
            const now = h ? h.currentTime : 0;
            if (r.cues && h && r.started) {
                while (r.fired < r.cues.length && r.cues[r.fired].t <= now + 0.05) fireCue(r, r.fired++);
                r.root.querySelector(".ji-time").textContent = mmss(now) + " / " + mmss(h.duration);
            }
            r.typing = r.typing.filter(function (ty) {
                const k = Math.max(0, Math.min(1, (now - ty.t0) / ty.dur));
                ty.span.textContent = ty.text.slice(0, Math.ceil(ty.text.length * k));
                return k < 1 && ty.span.isConnected;
            });
            const bars = r.root.querySelectorAll(".ji-eq i");
            const sp = h ? h.spectrum(bars.length) : [];
            for (let i = 0; i < bars.length; i++) bars[i].style.transform = "scaleY(" + (0.06 + (sp[i] || 0) * 0.94).toFixed(3) + ")";
            r.raf = requestAnimationFrame(function () { loop(r); });
        }

        function finish(outcome) {
            const r = run;
            if (!r || r.done) return;
            r.done = true;
            run = null;
            clearTimeout(r.watchdog);
            cancelAnimationFrame(r.raf);
            r.timers.forEach(clearInterval);
            window.removeEventListener("keydown", r.onKey, true);
            if (r.handle) r.handle.stop();
            releaseLink();
            r.root.classList.add("ji-out");
            if (outcome === "enter") r.root.classList.add("ji-out-enter");
            setTimeout(function () { r.root.remove(); }, outcome === "enter" ? 1400 : (calm() ? 200 : 650));
            r.resolve(outcome);
        }

        function abort() { if (run) finish("skip"); }

        if (typeof document !== "undefined") {
            document.addEventListener("DOMContentLoaded", function () { setTimeout(prime, 600); });
        }

        return { enabled: enabled, run: start, abort: abort, prime: prime,
                 get active() { return !!run; }, get why() { return lastWhy; } };
    })();
