/* ============================================================
   TERMINAL: SHATTERED — mobile
   ------------------------------------------------------------
   Touch/phone adapter: keyboard inset, swipe, virtual stick.

   Part 13/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const MobileUX = (() => {

        const mqPhone = window.matchMedia("(max-width: 820px)");
        const mqTouch = window.matchMedia("(hover: none) and (pointer: coarse)");

        function isPhone() { return mqPhone.matches; }

        /* ---------- 1. on-screen keyboard inset -------------------
           Android Chrome shrinks the *visual* viewport when the keyboard
           opens but leaves position:fixed elements sized to the layout
           viewport — so the input you are typing into ends up hidden
           behind the keys.  We measure the difference and expose it as
           --kb, which the mobile CSS uses as bottom padding. */
        function trackKeyboard() {
            const vv = window.visualViewport;
            if (!vv) return;
            let raf = 0;
            const apply = () => {
                raf = 0;
                // how much of the layout viewport the keyboard covers
                const hidden = window.innerHeight - (vv.height + vv.offsetTop);
                // ignore browser-chrome jitter; only a real keyboard is this big
                const kb = hidden > 120 ? Math.round(hidden) : 0;
                document.documentElement.style.setProperty("--kb", kb + "px");
                document.body.classList.toggle("kb-open", kb > 0);
            };
            const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
            vv.addEventListener("resize", schedule);
            vv.addEventListener("scroll", schedule);
            apply();
        }

        /* ---------- 2. alice chat: header-only until tapped ---------
           The collapsed look is the CSS default on phones (see the mobile
           block in styles.css), so all this does is flip the .expanded
           class and keep the aria state honest. */
        function setupAlice() {
            const alice = document.querySelector("section.alice");
            const head  = alice && alice.querySelector(".alice-head");
            if (!alice || !head) return;

            head.setAttribute("role", "button");
            head.setAttribute("tabindex", "0");

            const setExpanded = (on) => {
                alice.classList.toggle("expanded", on);
                head.setAttribute("aria-expanded", on ? "true" : "false");
            };
            const toggle = () => {
                if (!isPhone()) return;
                setExpanded(!alice.classList.contains("expanded"));
            };

            head.addEventListener("click", toggle);
            head.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
            });

            // Back on a wide screen the panel is always open — drop the class
            // so it doesn't linger if the phone is rotated into a tablet width.
            const sync = () => { if (!isPhone()) setExpanded(false); };
            sync();
            mqPhone.addEventListener("change", sync);
        }

        /* ---------- 3. swipe between slides ------------------------ */
        function setupSwipe() {
            const stage = document.getElementById("stage");
            if (!stage) return;

            let x0 = 0, y0 = 0, t0 = 0, tracking = false;

            // A swipe that starts inside something the user can pan
            // horizontally (ASCII art, a code block, an input) belongs to
            // that element, not to the deck.
            const ownsHorizontalScroll = (node) => {
                for (let el = node; el && el !== stage; el = el.parentElement) {
                    if (el.scrollWidth - el.clientWidth > 8) return true;
                    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
                }
                return false;
            };

            stage.addEventListener("touchstart", (e) => {
                if (window.__demoActive || e.touches.length !== 1) { tracking = false; return; }
                if (ownsHorizontalScroll(e.target)) { tracking = false; return; }
                const t = e.touches[0];
                x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
                tracking = true;
            }, { passive: true });

            stage.addEventListener("touchend", (e) => {
                if (!tracking) return;
                tracking = false;
                const t  = e.changedTouches[0];
                const dx = t.clientX - x0;
                const dy = t.clientY - y0;
                const dt = Date.now() - t0;
                // horizontal, long enough, quick enough, and clearly not a scroll
                if (dt > 800) return;
                if (Math.abs(dx) < 55) return;
                if (Math.abs(dx) < Math.abs(dy) * 1.6) return;
                if (typeof renderSlide !== "function" || typeof SLIDES === "undefined") return;
                const n = SLIDES.length;
                renderSlide(dx < 0 ? (current + 1) % n : (current - 1 + n) % n);
            }, { passive: true });
        }

        /* ---------- 4. keep the active nav chip visible ------------- */
        function setupNavStrip() {
            const menu = document.getElementById("menu");
            if (!menu || typeof MutationObserver === "undefined") return;

            const reveal = () => {
                if (!isPhone()) return;
                const active = menu.querySelector("button.slide-btn.active");
                if (!active) return;
                // centre the chip in the strip without scrolling the page
                const target = active.offsetLeft - (menu.clientWidth - active.offsetWidth) / 2;
                menu.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
            };

            new MutationObserver(reveal).observe(menu, {
                subtree: true,
                attributes: true,
                attributeFilter: ["class"]
            });
            reveal();
        }

        /* ---------- 5. demo HUD drawer ----------------------------- */
        function setupDemoHud() {
            const root = document.getElementById("demoGame");
            const game = root && root.querySelector(".dg-game");
            if (!root || !game) return;

            const scrim = document.createElement("div");
            scrim.className = "dg-hud-scrim";
            scrim.setAttribute("aria-hidden", "true");

            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "dg-hud-toggle";
            toggle.id = "dgHudToggle";
            toggle.setAttribute("aria-controls", "dgSidePanel");
            toggle.setAttribute("aria-expanded", "false");
            const dot = document.createElement("span");
            dot.className = "dot";
            const lbl = document.createElement("span");
            lbl.textContent = "HUD";
            toggle.appendChild(dot);
            toggle.appendChild(lbl);

            const side = game.querySelector(".dg-side");
            if (side && !side.id) side.id = "dgSidePanel";

            game.insertBefore(scrim, game.firstChild);
            game.appendChild(toggle);

            /* SANITY and FEAR are the two numbers that make the demo make
               sense — burying them in a drawer the player has to open would
               hide the whole feedback loop.  On phones the stats block moves
               out of the HUD and sits permanently above the terminal as a
               compact strip; on wider screens it belongs back in the side
               panel, between the header and the hint-mode switch.
               Both anchors are looked up fresh on every call so the result
               only ever depends on the current viewport, never on whatever
               the layout happened to be when this ran the first time. */
            const placeStats = () => {
                const stats = game.querySelector(".dg-stats");
                const scene = game.querySelector(".dg-scene");
                const home  = game.querySelector(".dg-side");
                if (!stats || !scene || !home) return;
                const target = isPhone() ? scene : home;
                if (stats.parentElement === target) return;
                if (target === scene) {
                    scene.insertBefore(stats, scene.firstChild);
                } else {
                    home.insertBefore(stats, home.querySelector(".dg-hintmode"));
                }
            };
            placeStats();
            mqPhone.addEventListener("change", placeStats);
            window.addEventListener("orientationchange", placeStats);
            // Belt and braces: some mobile browsers cross the breakpoint on
            // rotation or a URL-bar reflow without firing a clean MQL change.
            let placeRaf = 0;
            window.addEventListener("resize", () => {
                if (placeRaf) return;
                placeRaf = requestAnimationFrame(() => { placeRaf = 0; placeStats(); });
            });

            const setOpen = (on) => {
                root.classList.toggle("hud-open", on);
                toggle.setAttribute("aria-expanded", on ? "true" : "false");
            };

            toggle.addEventListener("click", () => setOpen(!root.classList.contains("hud-open")));
            scrim.addEventListener("click", () => setOpen(false));

            // The editor is a full-screen sheet on phones — the drawer on
            // top of it would just trap the player.
            const editor = document.getElementById("dgEditor");
            if (editor && typeof MutationObserver !== "undefined") {
                new MutationObserver(() => {
                    if (editor.classList.contains("open")) setOpen(false);
                }).observe(editor, { attributes: true, attributeFilter: ["class"] });
            }

            // Closing the demo must not leave the drawer latched open, and
            // re-opening is a good moment to re-check where the stats belong.
            if (typeof MutationObserver !== "undefined") {
                new MutationObserver(() => {
                    if (!root.classList.contains("open")) setOpen(false);
                    placeStats();
                }).observe(root, { attributes: true, attributeFilter: ["class", "data-stage"] });
            }

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && root.classList.contains("hud-open")) setOpen(false);
            });
        }

        /* ---------- 6. don't ambush the player with the keyboard ---- */
        /* The desk focuses the command input so a desktop player
           can type immediately.  On a phone that throws the keyboard up
           over the scene before they have read a single line, so the demo
           checks this flag before focusing. */
        function setupAutofocusPolicy() {
            window.__dgSkipAutofocus = () => mqTouch.matches || isPhone();
        }

        function init() {
            setupAutofocusPolicy();
            trackKeyboard();
            setupAlice();
            setupSwipe();
            setupNavStrip();
            setupDemoHud();
        }

        return { init: init, isPhone: isPhone };
    })();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { MobileUX.init(); });
    } else {
        MobileUX.init();
    }
