/* ============================================================
   TERMINAL: SHATTERED — deck
   ------------------------------------------------------------
   Slide router, title typewriter, top-bar meters.

   Part 7/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const titleText = document.getElementById("slideTitleText");
    const slideSub  = document.getElementById("slideSub");
    const slideBody = document.getElementById("slideBody");
    const crumb     = document.getElementById("crumb");
    const indexEl   = document.querySelector("#slideTitle .index");
    const buttons   = Array.from(document.querySelectorAll("button.slide-btn"));

    let current = 0;

    function pad2(n) { return n < 10 ? "0" + n : "" + n; }

    function renderSlide(i, opts = {}) {
        const slide = SLIDES[i];
        if (!slide) return;
        current = i;

        // active button
        buttons.forEach((b, idx) => b.classList.toggle("active", idx === i));

        // crumb + index — slide indices run 0..5 ("[00]" .. "[05]")
        // so the on-stage label matches the side-menu numbering.
        crumb.textContent  = slide.id;
        indexEl.textContent = "[" + pad2(i) + "]";

        // animated typing of the title
        animateTitle(slide.title);

        // sub + body — replace and run swap animation
        slideSub.textContent  = slide.sub;
        slideBody.innerHTML   = slide.body;

        // SLIDE_02: guarantee the demo CTA is present in every locale.
        // The Russian deck embeds it inline; non-RU decks don't — so
        // inject it ourselves if missing, using the i18n labels.
        if (slide.id === "SLIDE_02") {
            ensureDemoCta(slideBody);
        }
        // SLIDE_05: the classroom playtest recording (17-evidence.js)
        if (slide.id === "SLIDE_05" && typeof ensureEvidenceButton === "function") {
            ensureEvidenceButton(slideBody);
        }

        slideSub.classList.remove("swap-anim");
        slideBody.classList.remove("swap-anim");
        // force reflow so the animation can re-run
        void slideSub.offsetWidth;
        void slideBody.offsetWidth;
        slideSub.classList.add("swap-anim");
        slideBody.classList.add("swap-anim");

        stageEl.scrollTop = 0;

        if (!opts.silent) {
            aliceReact(slide);
        }
    }

    /* Safety net for the demo CTA on slide 02.  Every locale's slide body
       now embeds the full CTA block inline (lead paragraph + button + note),
       so the normal path is "already there, leave it alone".  We only build
       a fallback button if a deck somehow ships slide 02 without one —
       otherwise we would drop the lead/note copy and move the button below
       the speaker notes. */
    function ensureDemoCta(rootEl) {
        if (!rootEl) return;
        if (rootEl.querySelector(".demo-cta-btn")) return;
        // stale wrapper with no button — rebuild it from scratch
        rootEl.querySelectorAll(".demo-cta-wrap").forEach(n => n.remove());

        const wrap = document.createElement("div");
        wrap.className = "demo-cta-wrap";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "demo-cta-btn";
        btn.id = "demoCtaBtn";
        btn.setAttribute("onclick",
            "window.__openDemoGame && window.__openDemoGame('slide02')");
        const icon = document.createElement("span");
        icon.className = "demo-cta-icon";
        icon.textContent = "▶";
        const label = document.createElement("span");
        label.className = "demo-cta-label";
        label.setAttribute("data-i18n", "demo.cta.button");
        label.textContent = t("demo.cta.button").replace(/^▶\s*/, "");
        const sub = document.createElement("span");
        sub.className = "demo-cta-sub";
        sub.setAttribute("data-i18n", "demo.cta.hint");
        sub.textContent = t("demo.cta.hint");
        btn.appendChild(icon);
        btn.appendChild(label);
        btn.appendChild(sub);
        wrap.appendChild(btn);
        rootEl.appendChild(wrap);
    }

    /* ------- title typewriter ------- */
    let titleTimer = null;
    function animateTitle(text) {
        if (titleTimer) clearInterval(titleTimer);
        titleText.textContent = "";
        let i = 0;
        const span = document.createElement("span");
        span.className = "typer";
        titleText.appendChild(span);
        titleTimer = setInterval(() => {
            i++;
            const settled = text.slice(0, i);
            // glitch tail-char only while we're still typing
            const noise = (i < text.length && Math.random() < 0.35)
                ? randomChar()
                : "";
            span.textContent = settled + noise;
            if (i >= text.length) {
                clearInterval(titleTimer);
                titleTimer = null;
                span.classList.remove("typer");
                span.textContent = text; // final clean state, no truncation
            }
        }, 28);
    }

    function randomChar() {
        const pool = "01░▒▓<>/\\#$@*█▌";
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /* ------- button + keyboard nav ------- */
    buttons.forEach(b => {
        b.addEventListener("click", () => {
            const idx = parseInt(b.dataset.slide, 10);
            if (idx !== current) renderSlide(idx);
        });
    });

    document.addEventListener("keydown", (e) => {
        // when the demo overlay is active, the slide deck must not react
        // to arrow keys / numeric shortcuts — otherwise typing in the game
        // input or pressing arrows in the editor would scroll the deck
        // underneath the modal.
        if (window.__demoActive) return;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            renderSlide((current + 1) % SLIDES.length);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            renderSlide((current - 1 + SLIDES.length) % SLIDES.length);
        } else if (/^[1-6]$/.test(e.key)) {
            renderSlide(parseInt(e.key, 10) - 1);
        }
    });

    /* ============================================================
       UPTIME + INTEGRITY + SANITY (top bar + alice header)
       ============================================================ */
    const uptimeEl    = document.getElementById("uptime");
    const integrityEl = document.getElementById("integrity");
    const sanityEl    = document.getElementById("sanity");
    const packetsEl   = document.getElementById("packets");

    const startedAt = Date.now();
    let packets = 0;

    function tick() {
        const t = Math.floor((Date.now() - startedAt) / 1000);
        const h = Math.floor(t / 3600);
        const m = Math.floor((t % 3600) / 60);
        const s = t % 60;
        uptimeEl.textContent = pad2(h) + ":" + pad2(m) + ":" + pad2(s);

        // integrity drifts in a creepy way
        const driftI = 30 + Math.sin(t / 6) * 10 + Math.random() * 4;
        integrityEl.textContent = driftI.toFixed(1) + "%";

        const driftS = 45 + Math.sin(t / 4 + 1.2) * 8 + Math.random() * 3;
        sanityEl.textContent    = driftS.toFixed(1) + "%";
    }
    tick();
    setInterval(tick, 1000);

    /* ============================================================
       ALICE CHAT — glitchy auto-feed
       ============================================================ */
    /* ============================================================
       ALICE CHAT — voiced edition
       ------------------------------------------------------------
       • ALICE_STORY_LINES  — voice lines triggered when entering
                              a specific slide (id-keyed).
       • ALICE_BG_LINES     — pool of ambient lines fired at random
                              by aliceLoop().
       Audio payloads are inlined as data:audio/mpeg base64 so the
       whole pitch stays offline / single-file.
       ============================================================ */
