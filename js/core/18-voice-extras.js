/* ============================================================
   TERMINAL: SHATTERED — voice-path test and the «Взаперти» extra
   ------------------------------------------------------------
   1. Settings → ЗВУК, under the voice slider: a button that plays
      voice_test (Alice reads a calibration line) so the room can set
      the level before the jury arrives. The slider itself glows with
      the signal, and dragging it is heard live — the test runs on the
      voice bus.

   2. «Взаперти». Two ways in, neither announced anywhere:
        • three quick clicks on ALICE_CORE (top bar or boot screen);
        • the voice slider dragged to 0% with Shift held.
      Half a second of dark-red safe-mode, a toast, then secret_locked
      plays — on the master bus, since the second trigger has just
      muted the voice bus.

   Both play through VoiceMedia (15): the take for the current
   language, else the Russian one — and if the language is switched
   while one plays, it carries on in the new one from the same point.

   Mounted from renderSettingsPopup() and closePopup() in
   11-settings.js; the triggers are delegated listeners and need no
   wiring.

   Part 18 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const VoiceExtras = (function () {
        const SEGMENTS = 24;
        let test = null;                  // { handle, raf, peak }
        let secret = null;                // { handle, toast, raf }

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
        /* level() is RMS mapped from −48..0 dBFS onto 0..1 (15-voice-media.js) */
        function db(level) {
            return level > 0.01 ? Math.round(level * 48 - 48) + " dBFS" : "−∞";
        }

        /* ---- 1. voice-path test ----------------------------------------- */

        /* Called after every render of the settings popup. The popup is
           rebuilt on each toggle, so a test that is already running just
           shows up in the fresh controls instead of restarting. */
        let ui = null;                    // the controls currently in the popup
        function mount(body, tab) {
            if (tab !== "audio") { stopTest(); ui = null; return; }
            const slider = body && body.querySelector('input[data-skey="volVoice"]');
            if (!slider || typeof VoiceMedia === "undefined") return;
            const box = document.createElement("div");
            box.className = "vt";
            box.innerHTML = '' +
                '<button type="button" class="vt-btn"></button>' +
                '<div class="vt-meter" aria-hidden="true">' + new Array(SEGMENTS).fill("<i></i>").join("") + '</div>' +
                '<div class="vt-log"><div class="l1">' + esc(tx("vt.log", "// КАНАЛ 104 :: КАЛИБРОВКА ЧАСТОТНОЙ МОДУЛЯЦИИ")) + '</div>' +
                '<div class="l2" aria-live="polite"></div></div>';
            slider.closest(".row").insertAdjacentElement("afterend", box);
            ui = { box: box, btn: box.querySelector(".vt-btn"), segs: box.querySelectorAll(".vt-meter i"),
                   l2: box.querySelector(".l2"), wrap: slider.closest(".slider-wrap") };
            ui.btn.addEventListener("click", function () { if (test) stopTest(); else startTest(); });
            paint(!!test);
        }
        function liveUi() { return ui && ui.box.isConnected ? ui : null; }
        function paint(on) {
            const u = liveUi();
            if (!u) return;
            u.btn.textContent = on ? tx("vt.stop", "[ ■ ОСТАНОВИТЬ ТЕСТ ]") : tx("vt.button", "[ 🔊 ТЕСТ АКУСТИЧЕСКОГО ТРАКТА ]");
            u.btn.classList.toggle("on", on);
            u.box.classList.toggle("live", on);
            if (!on) {
                u.segs.forEach(function (s) { s.className = ""; });
                if (u.wrap) { u.wrap.classList.remove("vt-live"); u.wrap.style.removeProperty("--vt-level"); }
            }
        }
        function say(msg) { const u = liveUi(); if (u) u.l2.textContent = msg; }

        function startTest() {
            if (test) return;
            stopSecret();
            const mine = test = { raf: 0, peak: 0, handle: null };
            paint(true);
            say(tx("vt.tuning", "[ .. ] поиск несущей…"));
            if (typeof Audio !== "undefined" && Audio.resume) try { Audio.resume(); } catch (e) {}
            mine.handle = VoiceMedia.play("voice_test", {
                bus: "voice",
                followLocale: true,
                onStart: function () { if (test === mine) loopTest(); },
                onEnd: function () { if (test === mine) endTest(tx("vt.done", "[ OK ] тракт откалиброван")); },
                onError: function (err) {
                    if (test !== mine) return;
                    endTest(err && err.name === "NotAllowedError" ? tx("vt.blocked", "[ ERR ] браузер не дал звук — нажмите ещё раз")
                                                                  : tx("vt.missing", "[ ERR ] запись теста не найдена"));
                }
            });
        }

        function loopTest() {
            if (!test) return;
            const u = liveUi(), h = test.handle;
            const lv = h ? h.level() : 0;
            test.peak = Math.max(lv, test.peak * 0.94);
            if (u && h) {
                const lit = Math.round(lv * SEGMENTS), pk = Math.min(SEGMENTS - 1, Math.round(test.peak * SEGMENTS));
                for (let i = 0; i < u.segs.length; i++) {
                    u.segs[i].className = i < lit ? (i >= SEGMENTS - 3 ? "hot" : i >= SEGMENTS - 8 ? "warm" : "on") : (i === pk ? "pk" : "");
                }
                if (u.wrap) { u.wrap.classList.add("vt-live"); u.wrap.style.setProperty("--vt-level", lv.toFixed(3)); }
                u.l2.textContent = "[ " + (h.loc || "ru").toUpperCase() + " ] " + mmss(h.currentTime) + " / " + mmss(h.duration) +
                                   " · " + tx("vt.level", "уровень") + " " + db(lv);
            }
            test.raf = requestAnimationFrame(loopTest);
        }

        function endTest(msg) {
            if (test) cancelAnimationFrame(test.raf);
            test = null;
            paint(false);
            if (msg != null) say(msg);
        }

        function stopTest() {
            if (!test) return;
            const h = test.handle;
            endTest("");
            if (h) h.stop();
        }

        /* ---- 2. «Взаперти» ------------------------------------------------ */

        function fireSecret(source) {
            if (secret || typeof VoiceMedia === "undefined") return;
            stopTest();
            secret = { raf: 0 };
            try { localStorage.setItem("ts.secret.locked", "1"); } catch (e) {}

            const flash = document.createElement("div");
            flash.className = "sx-flash" + (calm() ? " sx-calm" : "");
            flash.innerHTML = '<span>SAFE MODE · REG 0x00</span>';
            document.body.appendChild(flash);
            setTimeout(function () { flash.remove(); }, 520);
            if (!calm() && typeof Audio !== "undefined" && Audio.playGlitch) try { Audio.playGlitch(0.5); } catch (e) {}

            const toast = document.createElement("div");
            toast.className = "sx-toast";
            toast.setAttribute("role", "status");
            toast.innerHTML = '<div class="sx-head">' + esc(tx("secret.toast", '[ ARCHIVE_RECOVERY :: REGISTER 0x00 // UNLOCKED EVENT "ВЗАПЕРТИ" ]')) + '</div>' +
                              '<div class="sx-row"><span class="sx-meter"><i></i></span><span class="sx-tc">00:00</span>' +
                              '<button type="button" class="sx-stop">' + esc(tx("secret.stop", "[ ■ ]")) + '</button></div>';
            document.body.appendChild(toast);
            requestAnimationFrame(function () { toast.classList.add("on"); });
            toast.querySelector(".sx-stop").addEventListener("click", stopSecret);
            secret.toast = toast;

            const mine = secret;
            setTimeout(function () {
                if (secret !== mine) return;
                mine.handle = VoiceMedia.play("secret_locked", {
                    bus: "master",
                    followLocale: true,
                    onStart: function () { if (secret === mine) loopSecret(); },
                    onEnd: function () { if (secret === mine) stopSecret(); },
                    onError: function () { if (secret === mine) stopSecret(); }
                });
            }, 480);
        }

        function loopSecret() {
            if (!secret || !secret.handle) return;
            const h = secret.handle;
            const bar = secret.toast.querySelector(".sx-meter i"), tc = secret.toast.querySelector(".sx-tc");
            bar.style.transform = "scaleX(" + Math.max(0.02, h.level()).toFixed(3) + ")";
            tc.textContent = mmss(h.currentTime) + " / " + mmss(h.duration);
            secret.raf = requestAnimationFrame(loopSecret);
        }

        function stopSecret() {
            if (!secret) return;
            const s = secret;
            secret = null;
            cancelAnimationFrame(s.raf);
            if (s.handle) s.handle.stop();
            if (s.toast) {
                s.toast.classList.remove("on");
                setTimeout(function () { s.toast.remove(); }, 400);
            }
        }

        /* trigger A: three clicks on ALICE_CORE within ~0.7 s */
        let clicks = [];
        document.addEventListener("click", function (e) {
            if (!e.target.closest || !e.target.closest(".alice-core-mark")) return;
            const now = performance.now();
            clicks = clicks.filter(function (c) { return now - c < 700; });
            clicks.push(now);
            if (clicks.length >= 3) { clicks = []; fireSecret("core"); }
        });

        /* trigger B: the voice slider reaches 0 while Shift is held.
           The input event carries no modifier state, so Shift is tracked
           from the pointer and keyboard events that move the slider. */
        let shift = false;
        ["pointerdown", "pointermove", "keydown", "keyup"].forEach(function (type) {
            window.addEventListener(type, function (e) { shift = !!e.shiftKey; }, true);
        });
        let armed = true;                 // one shot per trip to zero
        document.addEventListener("input", function (e) {
            const s = e.target;
            if (!s || !s.matches || !s.matches('input[data-skey="volVoice"]')) return;
            const v = parseInt(s.value, 10);
            if (v > 0) { armed = true; return; }
            if (armed && shift) { armed = false; fireSecret("slider"); }
        });

        /* After a language switch (10-i18n.js): the secret can be playing
           then — trigger B fires from the settings, a tab away from the
           language row. Its voice follows by itself (followLocale); the
           toast's words are redrawn here. */
        function relocale() {
            const head = secret && secret.toast && secret.toast.querySelector(".sx-head");
            if (head) head.textContent = tx("secret.toast", '[ ARCHIVE_RECOVERY :: REGISTER 0x00 // UNLOCKED EVENT "ВЗАПЕРТИ" ]');
        }

        return { mount: mount, stopTest: stopTest, startTest: startTest, fireSecret: fireSecret, stopSecret: stopSecret,
                 relocale: relocale, get testing() { return !!test; } };
    })();
