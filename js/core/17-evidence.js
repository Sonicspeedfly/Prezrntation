/* ============================================================
   TERMINAL: SHATTERED — evidence overlay
   ------------------------------------------------------------
   Full-screen player for the classroom playtest recording:
   assets/video/classroom_trial*.mp4. Opens over everything
   (z 999999) with a CRT power-on, closes back to a line and a dot,
   and leaves the deck exactly where it was — same slide, same focus,
   no reload.

   Open:  Shift+V (or Ctrl+Shift+V) anywhere except a text field or
          the code editor; the button on slide 05 «РОАДМАП И БИЗНЕС».
   Close: Esc, Shift+V again, «× ЗАКРЫТЬ».

   Weak links. The file is 73 MB at full quality; a school connection
   in Dushanbe will not stream that. Three copies are built by
   assets/build-media.js — HD (original), 540p (~24 MB), 360p (~10 MB),
   all with the index at the front so playback starts after the first
   chunk — plus a 28 KB poster. AUTO picks:
     • HD from file://, localhost or a LAN address — nothing to fetch;
     • otherwise by the browser's own link estimate (Network
       Information API) or, where that does not exist, by how fast
       this page's own files arrived; unknown means 360p;
     • and steps down one level if playback keeps stalling.
   A manual pick sticks for this browser (localStorage).
   Nothing is fetched until the player opens: preload="none".

   While it plays, Alice and the long voice tracks pause and the deck
   music is muted; all of it comes back on close.

   Part 17 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const Evidence = (function () {
        const BASE = "assets/video/classroom_trial";
        const VARIANTS = {
            hd:  { url: BASE + ".mp4",     label: "HD"   },
            540: { url: BASE + ".540.mp4", label: "540p" },
            360: { url: BASE + ".360.mp4", label: "360p" }
        };
        const LADDER = ["hd", "540", "360"];
        const PREF_KEY = "ts.evidence.q";
        const STALL_LIMIT_MS = 6000;      // stalled this long in total → one level down

        let el = null, video = null, open = false, busy = false;
        let lastFocus = null, chosen = null, stallMs = 0, stallT0 = 0, raf = 0;
        let saved = null;                 // what we muted on open

        function tx(key, fallback) {
            try { const v = t(key); return v && v !== key ? v : fallback; } catch (e) { return fallback; }
        }
        function calm() {
            return document.body.classList.contains("epilepsy-safe") ||
                   (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        }
        function pref() {
            try { const v = localStorage.getItem(PREF_KEY); if (v === "auto" || VARIANTS[v]) return v; } catch (e) {}
            return "auto";
        }
        function setPref(v) { try { localStorage.setItem(PREF_KEY, v); } catch (e) {} }

        /* ---- picking a copy ------------------------------------------- */

        function nearHost() {
            if (location.protocol === "file:") return true;
            const h = location.hostname;
            return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1" || /\.local$/.test(h) ||
                   /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
        }

        /* Mbit/s this page actually got, from the larger files it loaded */
        function measuredMbps() {
            try {
                const list = performance.getEntriesByType("resource").filter(function (e) {
                    return e.transferSize > 60000 && e.responseEnd > e.responseStart;
                });
                if (!list.length) return 0;
                let bytes = 0, ms = 0;
                list.forEach(function (e) { bytes += e.transferSize; ms += e.responseEnd - e.responseStart; });
                return ms > 0 ? (bytes * 8 / 1000) / ms : 0;
            } catch (e) { return 0; }
        }

        function autoPick() {
            if (nearHost()) return "hd";
            const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (c) {
                if (c.saveData) return "360";
                if (/^(slow-2g|2g|3g)$/.test(c.effectiveType || "")) return "360";
                if (c.downlink) return c.downlink >= 2.5 ? "540" : "360";
            }
            return measuredMbps() >= 2 ? "540" : "360";
        }

        /* ---- dom --------------------------------------------------------- */

        function build() {
            el = document.createElement("div");
            el.className = "ev";
            el.setAttribute("role", "dialog");
            el.setAttribute("aria-modal", "true");
            el.setAttribute("aria-label", tx("ev.aria", "Видеофиксация апробации"));
            el.hidden = true;
            el.innerHTML = '' +
                '<div class="ev-screen">' +
                    '<div class="ev-frame">' +
                        '<video class="ev-video" playsinline preload="none" poster="' + BASE + '.poster.jpg"></video>' +
                        '<div class="ev-scan" aria-hidden="true"></div>' +
                        '<div class="ev-wait" aria-hidden="true">' + tx("ev.buffering", "БУФЕРИЗАЦИЯ КАНАЛА…") + '</div>' +
                    '</div>' +
                    '<div class="ev-bar">' +
                        '<span class="ev-rec"><i></i>REC</span>' +
                        '<span class="ev-feed">' + tx("ev.feed", "[ LIVE FEED :: ГИМНАЗИЯ ИМ. Б. ГАФУРОВА // КАБИНЕТ ИНФОРМАТИКИ · ПЛЕЙТЕСТ СЕРВЕРА ҲАМРОҲ ]") + '</span>' +
                        '<span class="ev-tc">00:00 / 00:00</span>' +
                    '</div>' +
                    '<div class="ev-ctl">' +
                        '<button type="button" class="ev-play" data-ev="play">❚❚</button>' +
                        '<input type="range" class="ev-seek" min="0" max="1000" value="0" aria-label="' + tx("ev.seek", "Позиция") + '">' +
                        '<span class="ev-q" role="group" aria-label="' + tx("ev.quality", "Качество") + '">' +
                            '<button type="button" data-q="auto">' + tx("ev.auto", "АВТО") + '</button>' +
                            '<button type="button" data-q="360">360p</button>' +
                            '<button type="button" data-q="540">540p</button>' +
                            '<button type="button" data-q="hd">HD</button>' +
                        '</span>' +
                        '<button type="button" class="ev-close" data-ev="close">' + tx("ev.close", "[ × ЗАКРЫТЬ ]") + '</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(el);
            video = el.querySelector("video");

            el.addEventListener("click", function (e) {
                const b = e.target.closest("button");
                if (!b) { if (e.target === video) toggle(); return; }
                if (b.dataset.ev === "close") close();
                else if (b.dataset.ev === "play") toggle();
                else if (b.dataset.q) { setPref(b.dataset.q); switchTo(b.dataset.q === "auto" ? autoPick() : b.dataset.q); paintQ(); }
            });
            const seek = el.querySelector(".ev-seek");
            seek.addEventListener("input", function () {
                if (video.duration) video.currentTime = video.duration * seek.value / 1000;
            });
            video.addEventListener("waiting", function () { el.classList.add("ev-buffering"); stallT0 = performance.now(); });
            video.addEventListener("playing", function () {
                el.classList.remove("ev-buffering");
                if (stallT0) { stallMs += performance.now() - stallT0; stallT0 = 0; }
                if (stallMs > STALL_LIMIT_MS && pref() === "auto") stepDown();
            });
            video.addEventListener("play",  function () { el.querySelector(".ev-play").textContent = "❚❚"; });
            video.addEventListener("pause", function () { el.querySelector(".ev-play").textContent = "▶"; });
            video.addEventListener("error", function () {
                /* a copy that is missing (not built yet) — try the next one down, then the original */
                if (!open) return;
                const i = LADDER.indexOf(chosen);
                const next = i >= 0 && i < LADDER.length - 1 ? LADDER[i + 1] : (chosen !== "hd" ? "hd" : null);
                if (next && !video.__tried[next]) switchTo(next);
            });
        }

        /* Built once, so its words are redrawn when it opens in another
           language than it was built in. */
        function relabel() {
            const l = (typeof settingsState !== "undefined" && settingsState.locale) || "ru";
            if (!el || el.dataset.loc === l) return;
            el.dataset.loc = l;
            el.setAttribute("aria-label", tx("ev.aria", "Видеофиксация апробации"));
            el.querySelector(".ev-wait").textContent = tx("ev.buffering", "БУФЕРИЗАЦИЯ КАНАЛА…");
            el.querySelector(".ev-feed").textContent = tx("ev.feed", "[ LIVE FEED :: ГИМНАЗИЯ ИМ. Б. ГАФУРОВА // КАБИНЕТ ИНФОРМАТИКИ · ПЛЕЙТЕСТ СЕРВЕРА ҲАМРОҲ ]");
            el.querySelector(".ev-seek").setAttribute("aria-label", tx("ev.seek", "Позиция"));
            el.querySelector(".ev-q").setAttribute("aria-label", tx("ev.quality", "Качество"));
            el.querySelector('.ev-q [data-q="auto"]').textContent = tx("ev.auto", "АВТО");
            el.querySelector(".ev-close").textContent = tx("ev.close", "[ × ЗАКРЫТЬ ]");
        }

        function paintQ() {
            const p = pref();
            el.querySelectorAll(".ev-q button").forEach(function (b) {
                b.classList.toggle("on", b.dataset.q === p);
                b.classList.toggle("live", b.dataset.q === chosen && p === "auto");
            });
        }

        function switchTo(q) {
            if (!VARIANTS[q] || q === chosen) return;
            const at = video.currentTime || 0, playing = open && !video.paused;
            chosen = q;
            stallMs = 0; stallT0 = 0;
            video.__tried = video.__tried || {};
            video.__tried[q] = true;
            video.src = VARIANTS[q].url;
            const resume = function () {
                video.removeEventListener("loadedmetadata", resume);
                try { if (at) video.currentTime = at; } catch (e) {}
                if (playing || open) safePlay();
            };
            video.addEventListener("loadedmetadata", resume);
            try { video.load(); } catch (e) {}
            paintQ();
        }
        function stepDown() {
            const i = LADDER.indexOf(chosen);
            if (i >= 0 && i < LADDER.length - 1) switchTo(LADDER[i + 1]);
        }

        function safePlay() {
            video.muted = false;
            video.volume = masterVol();
            const p = video.play();
            if (p && p.catch) p.catch(function () {});
        }
        function toggle() { if (video.paused) safePlay(); else video.pause(); }
        function masterVol() {
            const s = (typeof settingsState !== "undefined") ? settingsState : null;
            const m = (s && Number.isFinite(s.volMaster)) ? s.volMaster : 70;
            return Math.max(0, Math.min(1, m / 100));
        }
        function mmss(s) {
            s = Math.max(0, Math.floor(s || 0));
            return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        }
        function tick() {
            if (!open) return;
            const tc = el.querySelector(".ev-tc"), seek = el.querySelector(".ev-seek");
            tc.textContent = mmss(video.currentTime) + " / " + mmss(video.duration) + " · " + (VARIANTS[chosen] ? VARIANTS[chosen].label : "");
            if (video.duration && document.activeElement !== seek) seek.value = Math.round(video.currentTime / video.duration * 1000);
            video.volume = masterVol();
            raf = requestAnimationFrame(tick);
        }

        /* ---- the rest of the deck goes quiet ---------------------------- */

        function hush() {
            saved = { chatter: window.__chatterEnabled, music: null };
            window.__chatterEnabled = false;
            /* a long track (intro act, voice test) pauses and picks up on
               close; a short deck line or the speech engine is just cut */
            if (typeof VoiceMedia !== "undefined" && VoiceMedia.busy) VoiceMedia.pauseAll();
            else if (typeof VoiceBus !== "undefined") VoiceBus.stopAll();
            /* volume, not setMusicEnabled(): re-enabling would START the menu
               theme in the deck, where it is normally stopped */
            if (typeof Audio !== "undefined" && Audio.getVolume) {
                saved.music = Audio.getVolume("music");
                Audio.setVolume("music", 0);
            }
        }
        function unhush() {
            if (!saved) return;
            window.__chatterEnabled = saved.chatter;
            if (saved.music != null && typeof Audio !== "undefined") Audio.setVolume("music", saved.music);
            if (typeof VoiceMedia !== "undefined") VoiceMedia.resumeAll();
            saved = null;
        }

        /* ---- open / close ------------------------------------------------ */

        function openPlayer() {
            if (open || busy) return;
            if (!el) build();
            relabel();
            open = true; busy = true;
            lastFocus = document.activeElement;
            hush();
            el.hidden = false;
            el.classList.remove("ev-off", "ev-on");
            el.classList.toggle("ev-calm", calm());
            void el.offsetWidth;
            el.classList.add("ev-on");
            if (typeof Audio !== "undefined" && Audio.playOpen) try { Audio.playOpen(); } catch (e) {}
            if (!chosen) switchTo(pref() === "auto" ? autoPick() : pref());
            else safePlay();
            paintQ();
            setTimeout(function () {
                busy = false;
                try { el.querySelector(".ev-close").focus({ preventScroll: true }); } catch (e) {}
            }, calm() ? 150 : 520);
            raf = requestAnimationFrame(tick);
        }

        function close() {
            if (!open || busy) return;
            open = false; busy = true;
            cancelAnimationFrame(raf);
            try { video.pause(); } catch (e) {}
            video.muted = true;
            el.classList.remove("ev-on");
            el.classList.add("ev-off");
            if (typeof Audio !== "undefined" && Audio.playClose) try { Audio.playClose(); } catch (e) {}
            setTimeout(function () {
                el.hidden = true;
                el.classList.remove("ev-off");
                busy = false;
                unhush();
                const back = (lastFocus && lastFocus.isConnected) ? lastFocus : document.getElementById("stage");
                try { if (back) back.focus({ preventScroll: true }); } catch (e) {}
            }, calm() ? 150 : 480);
        }

        /* ---- keys -------------------------------------------------------- */

        function typing(target) {
            if (!target || target === document.body) return false;
            if (target.isContentEditable) return true;
            const tag = target.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") return true;
            if (tag === "INPUT" && !/^(range|checkbox|radio|button|submit)$/i.test(target.type)) return true;
            return !!(target.closest && target.closest(".cm-editor, .CodeMirror, .code-input, [data-code-input]"));
        }

        window.addEventListener("keydown", function (e) {
            if (e.code === "KeyV" && e.shiftKey && !e.altKey && !e.metaKey && !e.repeat) {
                if (!open && typing(e.target)) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                if (open) close(); else openPlayer();
                return;
            }
            if (!open) return;
            /* nothing underneath — slides, the intro, the demo — hears a key
               while the player is up; buttons still get their default action */
            e.stopImmediatePropagation();
            if (e.key === "Escape") { e.preventDefault(); close(); }
            else if (e.key === " " && e.target.tagName !== "BUTTON") { e.preventDefault(); toggle(); }
            else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !(e.target.classList && e.target.classList.contains("ev-seek"))) {
                e.preventDefault();
                video.currentTime = Math.max(0, video.currentTime + (e.key === "ArrowRight" ? 5 : -5));
            }
        }, true);

        return { open: openPlayer, close: close, get isOpen() { return open; } };
    })();

    /* Button on slide 05 «РОАДМАП И БИЗНЕС» — the sixth slide, counting
       from 00. Called by renderSlide() in
       07-deck.js on every render, so it survives a language switch. */
    function ensureEvidenceButton(rootEl) {
        if (!rootEl || rootEl.querySelector(".ev-cta")) return;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ev-cta";
        b.innerHTML = '<span class="ev-cta-icon" aria-hidden="true">●</span>' +
                      '<span class="ev-cta-label" data-i18n="ev.cta"></span>' +
                      '<span class="ev-cta-key">Shift+V</span>';
        b.querySelector(".ev-cta-label").textContent = t("ev.cta");
        b.addEventListener("click", function () { Evidence.open(); });
        /* right under the B2B dashboard it backs up, above the QR block;
           a deck without either gets it at the end */
        const anchor = rootEl.querySelector(".qr-block") || rootEl.querySelector(".codeblock");
        if (anchor) anchor.parentNode.insertBefore(b, anchor);
        else rootEl.appendChild(b);
    }
