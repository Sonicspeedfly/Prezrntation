/* ============================================================
   TERMINAL: SHATTERED — settings
   ------------------------------------------------------------
   Settings, popups, the fake loading sequence, boot orchestration.

   Part 11/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const SETTINGS_DEFAULTS = {
        // ЗВУК
        volMaster:    70,
        volMusic:     55,
        volSfx:       85,
        volVoice:     100,    // ALICE voice bus (separate from sfx)
        musicOn:      true,
        sfxOn:        true,
        voiceGlitch:  "subtle", // off | subtle | heavy
        // ВИДЕО
        crt:          "on",   // on | dim | off
        vignette:     "on",   // on | off
        glitch:       "on",   // on | off
        contrast:     100,    // 60..140
        // ИГРА
        difficulty:   "cpp",  // python | cpp | c
        hints:        "rare", // off | rare | full
        hintMode:     "tech", // tech | noob  — applies to in-game editor
        autosave:     "on",   // on | off
        // ДОСТУПНОСТЬ
        epilepsy:     "off",  // on | off
        titleGlitch:  "on",   // on | off
        font:         "norm", // norm | big
        // СИСТЕМА
        locale:       "ru"    // ru | en
    };
    let settingsState = Object.assign({}, SETTINGS_DEFAULTS);

    function applySettings() {
        const root = document.documentElement;
        const body = document.body;

        // CRT scanlines
        const crtMap = { on: "0.035", dim: "0.015", off: "0" };
        root.style.setProperty("--crt-line",
            "rgba(255, 51, 51, " + (crtMap[settingsState.crt] || "0.035") + ")");
        // Vignette + flicker (toggle body::after via class)
        body.classList.toggle("no-vignette", settingsState.vignette === "off");
        // Contrast: scale page contrast on body
        const c = Math.max(60, Math.min(140, settingsState.contrast));
        body.style.filter = c === 100 ? "" : "contrast(" + (c / 100) + ")";

        // Glitch ghosts on/off
        window.__ghostsEnabled = (settingsState.glitch === "on");
        // Title typewriter glitch chars (accessibility)
        window.__titleGlitchEnabled = (settingsState.titleGlitch === "on");
        // Epilepsy mode: damp scanline drift and ghost intensity
        body.classList.toggle("epilepsy-safe", settingsState.epilepsy === "on");
        // Font size
        body.classList.toggle("big-font", settingsState.font === "big");
        // Audio
        Audio.setVolume("master", settingsState.volMaster / 100);
        Audio.setVolume("music",  settingsState.volMusic  / 100);
        Audio.setVolume("sfx",    settingsState.volSfx    / 100);
        Audio.setVolume("voice",  settingsState.volVoice  / 100);
        // While the demo is open the slide-deck music + chatter MUST stay
        // off — otherwise quick-fx toggles in the demo would force music
        // back on and overrun the demo's own audio cues.
        if (window.__demoActive) {
            Audio.setMusicEnabled(false);
            Audio.setSfxEnabled(settingsState.sfxOn);
            window.__chatterEnabled = false;
        } else {
            Audio.setMusicEnabled(settingsState.musicOn);
            Audio.setSfxEnabled(settingsState.sfxOn);
            // Alice chatter: kept enabled by default; tied to hints level
            window.__chatterEnabled = (settingsState.hints !== "off");
        }
        // Locale (UI language) — re-render all i18n strings + active slide
        applyLocale(settingsState.locale);
        // Demo overlay sync — let it mirror the same settings (quick-fx panel)
        if (typeof window.__demoSyncSettings === "function") {
            try { window.__demoSyncSettings(); } catch (e) {}
        }
    }
    /* expose so the demo-game IIFE can read & mutate (and re-apply) */
    window.settingsState  = settingsState;
    window.applySettings  = applySettings;
    window.__ghostsEnabled       = true;
    window.__chatterEnabled      = true;
    window.__titleGlitchEnabled  = true;

    // popup helpers
    function openPopup(title, html, opts) {
        opts = opts || {};
        const dlg = document.getElementById("bootPopup");
        dlg.classList.toggle("wide", !!opts.wide);
        popupTitle.textContent = title;
        popupBody.innerHTML    = html;
        popupBack.classList.add("open");
        Audio.playOpen();
    }
    function closePopup() {
        if (!popupBack.classList.contains("open")) return;
        popupBack.classList.remove("open");
        Audio.playClose();
    }
    popupClose.addEventListener("click", closePopup);
    popupBack.addEventListener("click", (e) => {
        if (e.target === popupBack) closePopup();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && popupBack.classList.contains("open")) closePopup();
    });

    // ---------- global hover / click sound delegation ----------
    function isAudible(el) {
        // play sounds for menu buttons + tabs + sliders + slide-btn + close
        return el.matches(
            ".boot-btn, .settings-tab, .reset-btn, .slide-btn, " +
            ".boot-popup .toggle button, .boot-popup .close, .load-skip");
    }
    document.addEventListener("pointerover", (e) => {
        if (window.__demoActive) return;       // demo has its own audio palette
        const t = e.target.closest("button");
        if (t && isAudible(t)) Audio.playHover();
    });
    document.addEventListener("click", (e) => {
        if (window.__demoActive) return;       // demo has its own audio palette
        const t = e.target.closest("button");
        if (t && isAudible(t)) Audio.playClick();
    }, true);

    let _settingsActiveTab = "audio";
    function renderSettingsPopup(forceTab) {
        if (forceTab) _settingsActiveTab = forceTab;
        const tabs = [
            { id: "audio",  labelKey: "settings.tab.audio"  },
            { id: "video",  labelKey: "settings.tab.video"  },
            { id: "game",   labelKey: "settings.tab.game"   },
            { id: "a11y",   labelKey: "settings.tab.a11y"   },
            { id: "system", labelKey: "settings.tab.system" }
        ];

        const tabBar = `<div class="settings-tabs">` +
            tabs.map(tab =>
                `<button class="settings-tab${_settingsActiveTab === tab.id ? " active" : ""}"
                         data-tab="${tab.id}">${t(tab.labelKey)}</button>`
            ).join("") +
            `</div>`;

        // helper: pick-row (toggle buttons)
        const pickRow = (label, key, opts) => {
            const btns = opts.map(o =>
                `<button data-key="${key}" data-val="${o.v}" class="${settingsState[key] === o.v ? "on" : ""}">${o.l}</button>`
            ).join("");
            return `<div class="row"><label>${label}</label><div class="toggle">${btns}</div></div>`;
        };
        // helper: slider-row
        const sliderRow = (label, key, min, max, step, suffix) => {
            const v = settingsState[key];
            return `<div class="row"><label>${label}</label>` +
                   `<div class="slider-wrap">` +
                   `<input type="range" min="${min}" max="${max}" step="${step}" ` +
                   `value="${v}" data-skey="${key}">` +
                   `<span class="val" data-vlabel="${key}">${v}${suffix||""}</span>` +
                   `</div></div>`;
        };
        // helper: toggle bool row
        const boolRow = (label, key) => pickRow(label, key, [
            { l: t("common.on"), v: true }, { l: t("common.off"), v: false }
        ]);

        let pane = "";
        if (_settingsActiveTab === "audio") {
            pane = `<div class="settings-pane active">
                ${sliderRow(t("settings.audio.master"),   "volMaster", 0, 100, 1, "%")}
                ${sliderRow(t("settings.audio.music"),    "volMusic",  0, 100, 1, "%")}
                ${sliderRow(t("settings.audio.sfx"),      "volSfx",    0, 100, 1, "%")}
                ${sliderRow(t("settings.audio.voice"),    "volVoice",  0, 100, 1, "%")}
                ${boolRow  (t("settings.audio.menu_music"),"musicOn")}
                ${boolRow  (t("settings.audio.ui_sfx"),    "sfxOn")}
                ${pickRow  (t("settings.audio.glitch"), "voiceGlitch", [
                    { l: t("settings.audio.glitch.off"),    v: "off"    },
                    { l: t("settings.audio.glitch.subtle"), v: "subtle" },
                    { l: t("settings.audio.glitch.heavy"),  v: "heavy"  }
                ])}
                <div class="settings-note">${t("settings.audio.note_html")}</div>
            </div>`;
        } else if (_settingsActiveTab === "video") {
            pane = `<div class="settings-pane active">
                ${pickRow(t("settings.video.crt"), "crt", [
                    { l: t("settings.video.crt.on"),  v: "on"  },
                    { l: t("settings.video.crt.dim"), v: "dim" },
                    { l: t("settings.video.crt.off"), v: "off" }
                ])}
                ${pickRow(t("settings.video.vignette"), "vignette", [
                    { l: t("common.on"),  v: "on"  },
                    { l: t("common.off"), v: "off" }
                ])}
                ${pickRow(t("settings.video.glitch"), "glitch", [
                    { l: t("common.on"),  v: "on"  },
                    { l: t("common.off"), v: "off" }
                ])}
                ${sliderRow(t("settings.video.contrast"), "contrast", 60, 140, 5, "%")}
                <div class="settings-note">${t("settings.video.note_html")}</div>
            </div>`;
        } else if (_settingsActiveTab === "game") {
            pane = `<div class="settings-pane active">
                ${pickRow(t("settings.game.difficulty"), "difficulty", [
                    { l: t("settings.game.diff.python"), v: "python" },
                    { l: t("settings.game.diff.cpp"),    v: "cpp"    },
                    { l: t("settings.game.diff.c"),      v: "c"      }
                ])}
                ${pickRow(t("settings.game.hints"), "hints", [
                    { l: t("settings.game.hints.off"),  v: "off"  },
                    { l: t("settings.game.hints.rare"), v: "rare" },
                    { l: t("settings.game.hints.full"), v: "full" }
                ])}
                ${pickRow(t("settings.game.autosave"), "autosave", [
                    { l: t("common.on"),  v: "on"  },
                    { l: t("common.off"), v: "off" }
                ])}
                <div class="settings-note">${t("settings.game.note_html")}</div>
            </div>`;
        } else if (_settingsActiveTab === "a11y") {
            pane = `<div class="settings-pane active">
                ${pickRow(t("settings.a11y.epilepsy"), "epilepsy", [
                    { l: t("common.off"), v: "off" },
                    { l: t("common.on"),  v: "on"  }
                ])}
                ${pickRow(t("settings.a11y.title_glitch"), "titleGlitch", [
                    { l: t("common.on"),  v: "on"  },
                    { l: t("common.off"), v: "off" }
                ])}
                ${pickRow(t("settings.a11y.font"), "font", [
                    { l: t("settings.a11y.font.norm"), v: "norm" },
                    { l: t("settings.a11y.font.big"),  v: "big"  }
                ])}
                <div class="settings-note">${t("settings.a11y.note_html")}</div>
            </div>`;
        } else if (_settingsActiveTab === "system") {
            pane = `<div class="settings-pane active">
                ${pickRow(t("settings.system.locale"), "locale", [
                    { l: t("settings.system.locale.ru"),     v: "ru" },
                    { l: t("settings.system.locale.en"),     v: "en" },
                    { l: t("settings.system.locale.tj"),     v: "tj" },
                    { l: t("settings.system.locale.tj_col"), v: "tj_col" }
                ])}
                <div class="row">
                  <label>${t("settings.system.reset")}</label>
                  <button class="reset-btn" data-act="reset">${t("settings.system.reset_btn")}</button>
                </div>
                <div class="settings-note">${t("settings.system.note_html")}</div>
            </div>`;
        }

        openPopup(t("settings.title"), tabBar + pane, { wide: true });

        // tab clicks
        popupBody.querySelectorAll(".settings-tab").forEach(b => {
            b.addEventListener("click", () => {
                _settingsActiveTab = b.dataset.tab;
                renderSettingsPopup();
            });
        });
        // pick-row toggles
        popupBody.querySelectorAll(".toggle button").forEach(btn => {
            btn.addEventListener("click", () => {
                const k = btn.dataset.key;
                let   v = btn.dataset.val;
                if (v === "true")  v = true;
                if (v === "false") v = false;
                settingsState[k] = v;
                applySettings();
                renderSettingsPopup();
            });
        });
        // sliders (live)
        popupBody.querySelectorAll('input[type="range"]').forEach(inp => {
            inp.addEventListener("input", () => {
                const k = inp.dataset.skey;
                settingsState[k] = parseInt(inp.value, 10);
                const lbl = popupBody.querySelector('[data-vlabel="' + k + '"]');
                if (lbl) lbl.textContent = inp.value + (lbl.textContent.match(/%$/) ? "%" : "");
                applySettings();
            });
        });
        // reset
        const reset = popupBody.querySelector('[data-act="reset"]');
        if (reset) reset.addEventListener("click", () => {
            /* Mutate in place. `window.settingsState` was aliased to this
               exact object once at load, and 06-demo.js reads it through that
               alias in eight places — rebinding here left the demo (and the
               speech-volume reader) looking at a dead pre-reset object
               forever. */
            Object.keys(settingsState).forEach(k => { delete settingsState[k]; });
            Object.assign(settingsState, SETTINGS_DEFAULTS);
            applySettings();
            renderSettingsPopup();
        });
    }

    function renderLoadPopup() {
        const slotLbl = t("load.slot");
        const empty   = t("load.empty");
        openPopup(t("load.title"), `
            <div style="font-size:12px;letter-spacing:0.10em;line-height:1.7;
                        color:rgba(220,240,240,0.85);">
                <div class="row"><label>${slotLbl} 01</label><span style="opacity:.45;">${empty}</span></div>
                <div class="row"><label>${slotLbl} 02</label><span style="opacity:.45;">${empty}</span></div>
                <div class="row"><label>${slotLbl} 03</label><span style="opacity:.45;">${empty}</span></div>
                <div style="margin-top:14px;font-size:11px;color:rgba(220,240,240,0.55);
                            letter-spacing:0.12em;line-height:1.55;">
                  ${t("load.note_html")}
                </div>
            </div>
        `);
    }

    function renderExtraPopup() {
        openPopup(t("extra.title"), `
            <div style="font-size:12px;letter-spacing:0.05em;line-height:1.7;
                        color:rgba(220,240,240,0.85);">
                ${t("extra.body_html")}
            </div>
        `);
    }

    function renderExitPopup() {
        openPopup(t("exit.title"), `
            <div style="font-size:12px;letter-spacing:0.05em;line-height:1.75;
                        color:rgba(220,240,240,0.85);">
                ${t("exit.body_html")}
                <div style="margin-top:14px;text-align:right;">
                    <button class="boot-btn" id="exitConfirm"
                        style="display:inline-flex;width:auto;padding:8px 18px;font-size:12px;">
                        ${t("exit.confirm")}
                    </button>
                </div>
            </div>
        `);
        document.getElementById("exitConfirm").addEventListener("click", () => {
            // best-effort: replace boot screen with last-words text
            bootscreen.innerHTML = `
                <div style="margin:auto;text-align:center;color:#f4f6f7;
                            font-family:'Courier New',monospace;">
                  <div style="font-size:28px;letter-spacing:0.25em;
                              color:#fff;margin-bottom:18px;
                              text-shadow:0 0 12px rgba(180,230,230,0.4);">
                    ${t("exit.signal_lost")}
                  </div>
                  <div style="font-size:12px;letter-spacing:0.18em;opacity:0.55;
                              line-height:1.8;">
                    ${t("exit.terminated_html")}
                  </div>
                </div>
            `;
        });
    }

    function transitionToTerminal() {
        // overload flash → fade boot screen → strip .booting → CRT effects come back
        Audio.playGlitch(0.5);
        Audio.playTransition(1.0);
        Audio.stopMusic();
        bootOverload.classList.add("on");
        setTimeout(() => {
            bootscreen.classList.add("gone");
            setTimeout(() => {
                bootOverload.classList.remove("on");
                document.body.classList.remove("booting");
                bootscreen.style.display = "none";
                // restart the title typing on the active slide so it feels fresh
                animateTitle(SLIDES[current].title);
                // re-focus stage for keyboard nav
                document.getElementById("stage").focus();
                // Open the ALICE channel: from this point on the chat loop
                // and aliceReact() can actually fire audio. Give the panic
                // a short tail before her first story line kicks in.
                setPitchTerminalActive(true);
                setTimeout(() => aliceReact(SLIDES[current]), 700);
            }, 600);
        }, 160);
    }

    bootMenu.addEventListener("click", (e) => {
        const btn = e.target.closest(".boot-btn");
        if (!btn || btn.disabled) return;
        const a = btn.dataset.action;
        if (a === "play")      startNewGame();
        else if (a === "load")     renderLoadPopup();
        else if (a === "settings") renderSettingsPopup();
        else if (a === "extra")    renderExtraPopup();
        else if (a === "exit")     renderExitPopup();
    });

    /* «New game» → show the loading overlay, run the fake game-loading
       sequence, then crash into the CRT terminal. This is the only place
       the loading screen is triggered. */
    function startNewGame() {
        const overlay = document.getElementById("loadingOverlay");
        if (!overlay || overlay.classList.contains("active")) return;
        // reset overlay state so it can play fresh
        overlay.classList.remove("glitching", "dying", "gone");
        overlay.style.display = "";   // clear any inline display:none from a previous run
        overlay.classList.add("active");
        const fill = document.getElementById("loadFill");
        const pct  = document.getElementById("loadPct");
        const log  = document.getElementById("loadLog");
        const bar  = document.getElementById("loadBar");
        const meta = document.getElementById("loadMeta");
        const skip = document.getElementById("loadSkip");
        const status = document.getElementById("loadStatus");
        if (fill) fill.style.width = "0%";
        if (pct)  pct.textContent  = "0%";
        if (log)  log.innerHTML    = "";
        if (bar)  bar.classList.remove("danger");
        if (meta) meta.classList.remove("danger");
        if (skip) { skip.classList.remove("show"); skip.style.opacity = ""; }
        if (status) status.textContent = "initializing kernel modules\u2026";
        Audio.playClick();
        runLoadingSequence(() => transitionToTerminal());
    }

    /* ============================================================
       GHOSTS — "memory surfacing" effect.
       Character resurfaces from heavy blur, briefly resolves into
       a dim silhouette, then dissolves back. NOT a copy-paste glitch.
       ============================================================ */
    /* Hand-sketched memory silhouettes — original line-art (offline, no
       photo assets). Each is intentionally unfinished: broken strokes,
       asymmetric eyes, missing edges. The memory-surfacing CSS animation
       blurs them in, briefly resolves the strokes, then fades them back
       out — like a face you almost remembered. */
    const GHOST_SKETCHES = [
        /* 01 — tall masked figure with horn-ears (zoum archetype) */
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" fill="none" stroke="#e7ecef" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M150 32 Q142 8 152 6 Q160 18 170 38" />
          <path d="M260 38 Q272 14 282 20 Q280 36 256 50" stroke-dasharray="4 5"/>
          <path d="M170 38 Q200 32 230 38 Q272 50 280 100 Q282 162 250 196" />
          <path d="M170 38 Q132 60 130 110 Q128 160 158 196" stroke-dasharray="6 5" opacity="0.85"/>
          <ellipse cx="205" cy="130" rx="65" ry="42" stroke-dasharray="3 4" stroke-width="1.6"/>
          <line x1="180" y1="118" x2="180" y2="146" stroke-width="3.6"/>
          <line x1="230" y1="120" x2="230" y2="148" stroke-width="3.6"/>
          <path d="M194 168 Q205 174 218 168" stroke-dasharray="2 3"/>
          <path d="M130 222 Q160 200 200 200 Q250 200 295 220" />
          <path d="M110 248 Q90 320 90 400" stroke-dasharray="8 6" opacity="0.7"/>
          <path d="M295 248 Q320 320 315 405" stroke-dasharray="8 6" opacity="0.7"/>
          <path d="M205 220 L205 410" stroke-dasharray="3 4" opacity="0.5"/>
          <path d="M150 460 L165 540" stroke-dasharray="2 8" opacity="0.3"/>
          <path d="M255 460 L240 530" stroke-dasharray="2 8" opacity="0.3"/>
          <path d="M75 280 L92 300" opacity="0.4"/>
          <path d="M330 270 L312 295" opacity="0.4"/>
        </svg>`,
        /* 02 — fox/kitsune mask in deep hood */
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" fill="none" stroke="#e7ecef" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M120 100 Q145 50 200 38 Q255 50 280 100 Q290 150 280 220" />
          <path d="M120 100 Q108 160 122 220" stroke-dasharray="5 4"/>
          <path d="M155 95 L200 78 L245 95 L240 165 L200 195 L160 165 Z" stroke-width="2.7"/>
          <path d="M195 175 L200 195 L205 175" stroke-width="2"/>
          <path d="M173 130 Q180 122 192 128" stroke-width="3"/>
          <path d="M212 128 Q220 122 232 130" stroke-width="3"/>
          <path d="M165 85 L170 55 L185 80" />
          <path d="M235 85 L230 55 L215 80" stroke-dasharray="3 3"/>
          <path d="M200 138 L196 152 L204 152 Z" opacity="0.6"/>
          <path d="M155 225 Q120 280 110 380" stroke-dasharray="8 6" opacity="0.65"/>
          <path d="M250 225 Q295 280 305 380" stroke-dasharray="8 6" opacity="0.65"/>
          <path d="M200 220 L200 410" stroke-dasharray="3 5" opacity="0.5"/>
          <path d="M170 365 Q200 380 230 365" />
          <path d="M180 380 Q200 392 220 380" stroke-dasharray="2 3"/>
          <path d="M135 440 L150 530" stroke-dasharray="2 9" opacity="0.3"/>
          <path d="M280 440 L260 525" stroke-dasharray="2 9" opacity="0.3"/>
        </svg>`,
        /* 03 — spiky-haired youth, asymmetric (one eye half-erased) */
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" fill="none" stroke="#e7ecef" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M140 70 L150 30 L162 65 L175 22 L188 55 L200 18 L215 58 L228 30 L240 70 L255 38 L265 75" stroke-width="2.7"/>
          <path d="M155 95 Q150 158 175 195 Q200 215 230 200 Q260 175 258 110" />
          <path d="M150 90 Q145 130 152 175" stroke-dasharray="4 4" opacity="0.7"/>
          <path d="M170 135 Q183 128 195 135" stroke-width="2.9"/>
          <line x1="182" y1="138" x2="184" y2="148" stroke-width="2.5"/>
          <line x1="220" y1="138" x2="234" y2="138" stroke-width="2.5"/>
          <path d="M192 172 Q205 178 215 174" stroke-dasharray="2 2"/>
          <path d="M195 158 L240 168" stroke-width="2" stroke-dasharray="3 2"/>
          <path d="M180 220 L175 250" />
          <path d="M225 220 L230 250" />
          <path d="M155 270 Q200 260 245 270" />
          <path d="M120 295 Q105 360 108 440" stroke-dasharray="6 5" opacity="0.6"/>
          <path d="M280 295 Q295 360 290 445" stroke-dasharray="6 5" opacity="0.6"/>
          <path d="M155 320 L150 380" stroke-dasharray="3 3"/>
          <path d="M155 380 L168 470" stroke-dasharray="3 3"/>
          <path d="M200 280 L200 460" stroke-dasharray="2 4" opacity="0.4"/>
          <path d="M170 500 L185 555" stroke-dasharray="2 9" opacity="0.3"/>
          <path d="M250 500 L235 550" stroke-dasharray="2 9" opacity="0.3"/>
        </svg>`,
        /* 04 — bunny-eared figure with stitched mask (X-eyes, sewn mouth) */
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" fill="none" stroke="#e7ecef" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M170 80 Q172 30 178 4 Q188 30 188 75" />
          <path d="M170 80 Q165 50 175 35" stroke-dasharray="3 3" opacity="0.7"/>
          <path d="M225 80 Q220 20 215 0 Q210 30 215 80" />
          <path d="M225 80 Q235 50 230 35" stroke-dasharray="3 3" opacity="0.7"/>
          <path d="M177 65 L177 25" stroke-width="1.4" opacity="0.5"/>
          <path d="M221 65 L221 22" stroke-width="1.4" opacity="0.5"/>
          <circle cx="200" cy="145" r="72" stroke-dasharray="6 4"/>
          <line x1="170" y1="125" x2="186" y2="141" stroke-width="2.7"/>
          <line x1="186" y1="125" x2="170" y2="141" stroke-width="2.7"/>
          <line x1="214" y1="125" x2="230" y2="141" stroke-width="2.7"/>
          <line x1="230" y1="125" x2="214" y2="141" stroke-width="2.7"/>
          <line x1="180" y1="178" x2="220" y2="178" stroke-width="2.3"/>
          <line x1="186" y1="175" x2="186" y2="181" stroke-width="1.8"/>
          <line x1="196" y1="175" x2="196" y2="181" stroke-width="1.8"/>
          <line x1="206" y1="175" x2="206" y2="181" stroke-width="1.8"/>
          <line x1="216" y1="175" x2="216" y2="181" stroke-width="1.8"/>
          <path d="M140 245 Q200 220 260 245" />
          <path d="M120 280 Q105 360 115 450" stroke-dasharray="6 5" opacity="0.7"/>
          <path d="M280 280 Q295 360 285 450" stroke-dasharray="6 5" opacity="0.7"/>
          <circle cx="200" cy="320" r="4"/>
          <circle cx="200" cy="370" r="4"/>
          <path d="M150 480 L165 550" stroke-dasharray="2 9" opacity="0.3"/>
          <path d="M250 480 L240 545" stroke-dasharray="2 9" opacity="0.3"/>
        </svg>`,
        /* 05 — split-face character (jack archetype, two halves disagree) */
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" fill="none" stroke="#e7ecef" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M155 60 Q175 28 200 25 Q230 28 248 60 Q265 110 258 165 Q245 200 220 215" />
          <path d="M155 60 Q138 110 142 165 Q155 200 180 215" stroke-dasharray="5 4"/>
          <path d="M200 25 L200 215" stroke-width="2.2" stroke-dasharray="4 3"/>
          <path d="M168 118 Q176 110 185 118" stroke-width="2.7"/>
          <line x1="176" y1="115" x2="176" y2="124"/>
          <path d="M168 175 Q183 182 198 175" stroke-width="2"/>
          <line x1="212" y1="110" x2="232" y2="130" stroke-width="2.7"/>
          <line x1="232" y1="110" x2="212" y2="130" stroke-width="2.7"/>
          <path d="M204 175 L208 180 L213 174 L218 180 L222 174 L228 180 L232 176" stroke-width="1.8"/>
          <path d="M170 35 L165 60 L180 30 L190 55" stroke-width="2"/>
          <path d="M230 35 L235 60 L220 30 L210 55" stroke-width="2" opacity="0.6"/>
          <path d="M135 245 Q200 225 265 245" />
          <path d="M115 275 Q95 360 105 440" stroke-dasharray="6 5" opacity="0.7"/>
          <path d="M285 275 Q305 360 295 440" stroke-dasharray="6 5" opacity="0.7"/>
          <path d="M200 240 L200 440" stroke-dasharray="2 5" opacity="0.4"/>
          <path d="M155 470 L170 545" stroke-dasharray="2 9" opacity="0.3"/>
          <path d="M245 470 L230 540" stroke-dasharray="2 9" opacity="0.3"/>
        </svg>`
    ];

    function spawnGhost() {
        if (!window.__ghostsEnabled) return scheduleNextGhost();
        const svg = GHOST_SKETCHES[Math.floor(Math.random() * GHOST_SKETCHES.length)];

        const g = document.createElement("div");
        g.className = "glitch-ghost memory sketch";
        const w = 240 + Math.random() * 160;
        const h = w * 1.45;
        g.style.width  = w + "px";
        g.style.height = h + "px";
        // Prefer the left/right edges so ghosts don't sit on top of menu/text
        const onLeft = Math.random() < 0.5;
        const maxLeft = window.innerWidth - w;
        const xLeft  = Math.max(0, Math.random() * 80);
        const xRight = Math.min(maxLeft, maxLeft - Math.random() * 80);
        g.style.left   = (onLeft ? xLeft : xRight) + "px";
        g.style.top    = Math.max(0, Math.random() * (window.innerHeight - h)) + "px";
        g.innerHTML = svg;
        // Per-spawn variation: rotate / flip the inner SVG (the parent <div>
        // is animated via @keyframes transform: translateX, so flipping the
        // SVG directly preserves both effects).
        const svgEl = g.querySelector("svg");
        if (svgEl) {
            const rot  = (Math.random() * 4 - 2).toFixed(2);
            const flip = Math.random() < 0.4 ? -1 : 1;
            svgEl.style.transformOrigin = "center center";
            svgEl.style.transform = "rotate(" + rot + "deg) scaleX(" + flip + ")";
        }
        document.body.appendChild(g);
        g.addEventListener("animationend", () => g.remove());
        Audio.playGhost();
        scheduleNextGhost();
    }
    function scheduleNextGhost() {
        const delay = 5500 + Math.random() * 5500;
        setTimeout(spawnGhost, delay);
    }

    /* ============================================================
       FAKE LOADING SEQUENCE
       — simulates a normal game booting, then kernel-panic crashes
       — reveals the boot menu underneath
       ============================================================ */
    function runLoadingSequence(onDone) {
        const overlay = document.getElementById("loadingOverlay");
        const fill    = document.getElementById("loadFill");
        const pct     = document.getElementById("loadPct");
        const status  = document.getElementById("loadStatus");
        const log     = document.getElementById("loadLog");
        const bar     = document.getElementById("loadBar");
        const meta    = document.getElementById("loadMeta");
        const skip    = document.getElementById("loadSkip");

        let p = 0, canceled = false;
        const setPct = n => {
            p = Math.min(100, n);
            fill.style.width = p + "%";
            pct.textContent  = Math.floor(p) + "%";
        };
        const setStatus = s => { status.textContent = s; };
        const addLine = (text, cls) => {
            const div = document.createElement("div");
            div.className = "line" + (cls ? " " + cls : "");
            div.textContent = text;
            log.appendChild(div);
            while (log.children.length > 7) log.removeChild(log.firstChild);
        };
        const ramp = (target, duration, statusText, lines) => {
            const start = p;
            const t0    = performance.now();
            if (statusText) setStatus(statusText);
            if (lines) {
                lines.forEach((l, i) => {
                    setTimeout(() =>
                        !canceled && addLine(l.text, l.cls),
                        Math.max(60, duration * (i + 1) / (lines.length + 1)));
                });
            }
            return new Promise(res => {
                function frame(t) {
                    if (canceled) return res();
                    const e = Math.min(1, (t - t0) / duration);
                    setPct(start + (target - start) * e);
                    if (e < 1) requestAnimationFrame(frame);
                    else res();
                }
                requestAnimationFrame(frame);
            });
        };
        function panic() {
            if (canceled) return;
            canceled = true;
            skip.style.opacity = "0";
            overlay.classList.add("glitching");
            bar.classList.add("danger");
            meta.classList.add("danger");
            Audio.playGlitch(1.3);
            setStatus("!! KERNEL PANIC !!");
            setPct(100);
            const crashLines = [
                { t: 50,   text: "[ERR ] segmentation fault @ alice.core", cls: "err" },
                { t: 220,  text: "[ERR ] memory corrupted: 0xdeadbeef",     cls: "err" },
                { t: 420,  text: "[ERR ] stack overflow in physics_init()", cls: "err" },
                { t: 620,  text: "[WARN] reality not bounded",              cls: "warn" },
                { t: 830,  text: "[FATAL] alice.exe stopped responding",     cls: "err" },
                { t: 1050, text: "[ KILL ] kernel halted. core dumped.",     cls: "err" }
            ];
            crashLines.forEach(l => setTimeout(() => addLine(l.text, l.cls), l.t));
            setTimeout(() => {
                Audio.playTransition(1.0);
                overlay.classList.add("dying");
                // session is loading INTO the terminal — menu theme dies here
                Audio.stopMusic();
            }, 1300);
            setTimeout(() => {
                overlay.style.display = "none";
                if (onDone) onDone();
            }, 2200);
        }

        // skip button shows after a moment
        setTimeout(() => skip.classList.add("show"), 1100);
        skip.addEventListener("click", () => { if (!canceled) panic(); });

        // run the sequence
        (async function run() {
            addLine("> terminal-shattered :: session NEIKON loading", "ok");
            addLine("> mounting runtime…");
            await ramp(8,  500);
            await ramp(20, 650, "mounting /alice …", [
                { text: "[ OK ] /dev/alice mounted",   cls: "ok" }
            ]);
            if (canceled) return;
            await ramp(36, 750, "compiling shaders …", [
                { text: "[ OK ] crt_filter.glsl",      cls: "ok" },
                { text: "[ OK ] scanline.glsl",        cls: "ok" }
            ]);
            if (canceled) return;
            await ramp(54, 800, "initializing physics …", [
                { text: "[ OK ] entropy seeded",       cls: "ok" },
                { text: "[ OK ] gravity locked",       cls: "ok" }
            ]);
            if (canceled) return;
            await ramp(74, 720, "loading characters …", [
                { text: "[ OK ] neikon · idle",        cls: "ok" },
                { text: "[WARN] alice.core fragmented", cls: "warn" }
            ]);
            if (canceled) return;
            await ramp(88, 560, "starting alice_core …", [
                { text: "[WARN] memory blocks missing: 12", cls: "warn" },
                { text: "[WARN] integrity: 38%",            cls: "warn" }
            ]);
            if (canceled) return;
            await ramp(94, 450, "finalizing …", [
                { text: "[ERR ] alice.exe not responding", cls: "err" }
            ]);
            if (!canceled) setTimeout(panic, 200);
        })();
    }

    // start once DOM is ready
    function bootEverything() {
        // apply persisted settings (locale, volumes, video toggles) before first paint
        try { applySettings(); } catch (e) { /* ignore */ }
        boot();
        // first ghost surfaces a bit after the menu appears
        setTimeout(spawnGhost, 4500);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootEverything);
    } else {
        bootEverything();
    }

    /* ============================================================
       JURY CHECKLIST  ::  step-by-step guide for the panel of
       judges, pinned to the right edge of the viewport. The list
       is rendered from a per-locale source of truth and the open
       state + ticked items are persisted in localStorage so a
       judge who reloads the page does not lose progress.
       ============================================================ */
