/* ============================================================
   TERMINAL: SHATTERED — jury
   ------------------------------------------------------------
   The jury checklist panel.

   Part 12/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const JURY_CHECKLIST_BY_LOCALE = {
        ru: [
            { id: "boot",         step: "01 // СТАРТ",
              desc: 'На стартовом экране нажми <kbd>НОВАЯ ИГРА</kbd> — попадёшь в аварийный терминал.' },
            { id: "slides",       step: "02 // СЛАЙДЫ 00–05",
              desc: 'Листай <kbd>←</kbd> <kbd>→</kbd> или жми <kbd>1</kbd>..<kbd>6</kbd>. Шесть слайдов: вызов системе, проблематика, механика, ИИ Элис, интерфейс, бизнес.' },
            { id: "settings",     step: "03 // НАСТРОЙКИ И ЯЗЫК",
              desc: 'В стартовом меню открой «<strong>НАСТРОЙКИ</strong>» — звук, CRT, сложность, доступность. На вкладке «<em>СИСТЕМА</em>» переключи язык: <strong>RU / EN / TJ</strong>.' },
            { id: "demo-open",    step: "04 // ЗАПУСК ДЕМО",
              desc: 'На слайде <strong>02</strong> внизу — кнопка <kbd>▶ ЗАПУСТИТЬ ДЕМО-ИГРУ</kbd>. Выбери сложность: EASY (Python), MEDIUM (C++) или HARD (C).' },
            { id: "void-walk",    step: "05 // ПРОБУЖДЕНИЕ В 3D",
              desc: 'Ты очнёшься <strong>от первого лица</strong> в пустом пространстве. Вдали — глючащая дверь, справа впереди — свет терминала. Дойди до него: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + мышь (на телефоне — джойстик слева, свайп справа) и нажми <kbd>E</kbd>.' },
            { id: "os-boot",      step: "06 // ЗАГРУЗКА ОС",
              desc: 'Прошивка → ядро Linux → графическая заставка → рабочий стол, который сам открывает терминал. Дальше ты сидишь за этой машиной.' },
            { id: "os-read",      step: "07 // ОСМОТРИСЬ НА ДИСКЕ",
              desc: 'Набери <code>cat readme.txt</code>, потом <code>ls /dev</code> и <code>cat /home/neikon/notes/01-the-room.txt</code>. <strong>Файлы описывают комнату, в которой ты стоишь.</strong>' },
            { id: "os-svc",       step: "08 // ЧТО ЖИВОЕ, ЧТО НЕТ",
              desc: 'Набери <code>svc list</code>. Два пилона <em>DOWN</em>, дверь <em>LOOPING</em>, Элис <em>DEAD</em>. Каждая строка здесь — предмет в комнате.' },
            { id: "os-change",    step: "09 // ИЗМЕНИ ПРОСТРАНСТВО",
              desc: 'Набери <code>svc start lamp1</code>, затем <code>set fog.density 0.02</code>. Теперь нажми <kbd>esc</kbd>, встань и посмотри: <strong>в темноте зажёгся пилон, туман разошёлся.</strong>' },
            { id: "os-fsck",      step: "10 // ЧТО СЛОМАНО",
              desc: 'Вернись за терминал и набери <code>fsck</code>. Он перечислит битые регионы образа Элис и скажет, какие чинятся руками.' },
            { id: "os-edit",      step: "11 // ПОЧИНИ РЕГИОН",
              desc: '<code>edit &lt;путь&gt;</code> откроет код. Кнопка <kbd>?? для жюри</kbd> объяснит простыми словами, что вписать. Потом <kbd>▶ compile &amp; run</kbd>.' },
            { id: "os-anomaly",   step: "12 // ОШИБКИ ИМЕЮТ ЦЕНУ",
              desc: 'Введи любую ерунду или <code>rm /dev/lamp1</code>. Счётчик <em>АНОМАЛИИ</em> вырастет, комната покраснеет, а <code>ps</code> покажет процесс, который не твой. Он идёт к столу.' },
            { id: "os-recover",   step: "13 // ВЕРНИ ЭЛИС",
              desc: 'Когда <code>fsck</code> чист — <code>run /home/neikon/recover.sh</code>. Она заговорит, пилоны зажгутся, дверь откроется.' },
            { id: "exit-demo",    step: "14 // ВЫХОД ИЗ ДЕМО",
              desc: 'Кнопка <kbd>✕ ВЫЙТИ К СЛАЙДУ</kbd> в углу или <kbd>Esc</kbd> из-за терминала дважды.' }
        ],
        en: [
            { id: "boot",         step: "01 // START",
              desc: 'On the title screen press <kbd>NEW GAME</kbd> to enter the emergency terminal.' },
            { id: "slides",       step: "02 // SLIDES 00–05",
              desc: 'Navigate with <kbd>←</kbd> <kbd>→</kbd> or <kbd>1</kbd>..<kbd>6</kbd>. Six slides: challenge, problem, mechanics, Alice AI, interface, business.' },
            { id: "settings",     step: "03 // SETTINGS & LANGUAGE",
              desc: 'Open <strong>SETTINGS</strong> from the title menu — audio, CRT, difficulty, accessibility. Bottom of the <em>SYSTEM</em> tab: switch language <strong>RU / EN / TJ</strong>.' },
            { id: "demo-open",    step: "04 // LAUNCH THE DEMO",
              desc: 'On slide <strong>02</strong> press <kbd>▶ LAUNCH DEMO</kbd> at the bottom. Pick a difficulty: EASY (Python), MEDIUM (C++) or HARD (C).' },
            { id: "void-walk",    step: "05 // WAKING UP IN 3D",
              desc: 'You come round <strong>in first person</strong> in an empty space. A glitching door hangs in the distance; the terminal glows ahead and to your right. Walk there with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + mouse (phone: stick left, swipe right) and press <kbd>E</kbd>.' },
            { id: "os-boot",      step: "06 // THE OS BOOTS",
              desc: 'Firmware → Linux kernel → graphical splash → a desktop that opens the terminal by itself. From here you are working this machine.' },
            { id: "os-read",      step: "07 // READ THE DISK",
              desc: 'Type <code>cat readme.txt</code>, then <code>ls /dev</code> and <code>cat /home/neikon/notes/01-the-room.txt</code>. <strong>The files describe the room you are standing in.</strong>' },
            { id: "os-svc",       step: "08 // WHAT IS ALIVE",
              desc: 'Type <code>svc list</code>. Two pylons <em>DOWN</em>, the door <em>LOOPING</em>, Alice <em>DEAD</em>. Every line here is an object in the room.' },
            { id: "os-change",    step: "09 // CHANGE THE SPACE",
              desc: 'Type <code>svc start lamp1</code>, then <code>set fog.density 0.02</code>. Now press <kbd>esc</kbd>, stand up and look: <strong>a pylon has come on out in the dark and the fog has cleared.</strong>' },
            { id: "os-fsck",      step: "10 // WHAT IS BROKEN",
              desc: 'Sit back down and type <code>fsck</code>. It lists the corrupt regions of Alice\u2019s image and which ones you can repair by hand.' },
            { id: "os-edit",      step: "11 // REPAIR A REGION",
              desc: '<code>edit &lt;path&gt;</code> opens the code. The <kbd>?? for jury</kbd> button explains in plain words what to type. Then <kbd>▶ compile &amp; run</kbd>.' },
            { id: "os-anomaly",   step: "12 // MISTAKES COST",
              desc: 'Type any nonsense, or <code>rm /dev/lamp1</code>. The <em>ANOMALY</em> count climbs, the room reddens, and <code>ps</code> shows a process that is not yours. It is walking toward the desk.' },
            { id: "os-recover",   step: "13 // BRING ALICE BACK",
              desc: 'Once <code>fsck</code> is clean: <code>run /home/neikon/recover.sh</code>. She speaks, the pylons light, the door opens.' },
            { id: "exit-demo",    step: "14 // EXIT THE DEMO",
              desc: 'The <kbd>✕ EXIT TO SLIDE</kbd> button in the corner, or <kbd>Esc</kbd> twice from the terminal.' }
        ],
        tj: [
            { id: "boot",         step: "01 // ОҒОЗ",
              desc: 'Дар экрани оғозӣ <kbd>БОЗИИ НАВ</kbd>-ро пахш кунед — ба терминали аварийӣ ворид мешавед.' },
            { id: "slides",       step: "02 // СЛАЙДҲОИ 00–05",
              desc: 'Бо <kbd>←</kbd> <kbd>→</kbd> варақ занед ё <kbd>1</kbd>..<kbd>6</kbd>-ро пахш кунед. Шаш слайд.' },
            { id: "settings",     step: "03 // ТАНЗИМОТ ВА ЗАБОН",
              desc: 'Дар менюи оғозӣ «<strong>ТАНЗИМОТ</strong>»-ро кушоед. Дар варақаи «<em>СИСТЕМА</em>» забонро иваз кунед: <strong>RU / EN / TJ</strong>.' },
            { id: "demo-open",    step: "04 // ОҒОЗИ ДЕМО",
              desc: 'Дар слайди <strong>02</strong> тугмаи <kbd>▶ БОЗИИ ДЕМОРО ОҒОЗ КУН</kbd>. Душвориро интихоб кунед: EASY (Python), MEDIUM (C++) ё HARD (C).' },
            { id: "void-walk",    step: "05 // БЕДОРӢ ДАР 3D",
              desc: 'Шумо <strong>аз шахси якум</strong> дар фазои холӣ ба ҳуш меоед. Ба терминал равед: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + муш (дар телефон — ҷойстик ва свайп) ва <kbd>E</kbd>.' },
            { id: "os-boot",      step: "06 // БОРКУНИИ ОС",
              desc: 'Микропрограмма → ҳастаи Linux → экрани графикӣ → мизи корӣ, ки худаш терминалро мекушояд.' },
            { id: "os-read",      step: "07 // ДИСКРО БИХОНЕД",
              desc: '<code>cat readme.txt</code>, баъд <code>ls /dev</code> ва <code>cat /home/neikon/notes/01-the-room.txt</code>. <strong>Файлҳо ҳамон ҳуҷраеро тавсиф мекунанд, ки шумо дар он истодаед.</strong>' },
            { id: "os-svc",       step: "08 // ЧӢ ЗИНДА АСТ",
              desc: '<code>svc list</code> нависед. Ду пилон <em>DOWN</em>, дар <em>LOOPING</em>, Элис <em>DEAD</em>. Ҳар сатри ин ҷо ашёест дар ҳуҷра.' },
            { id: "os-change",    step: "09 // ФАЗОРО ТАҒЙИР ДИҲЕД",
              desc: '<code>svc start lamp1</code>, баъд <code>set fog.density 0.02</code>. Акнун <kbd>esc</kbd> занед, хезед ва бинед: <strong>дар торикӣ пилон фурӯзон шуд, туман тар шуд.</strong>' },
            { id: "os-fsck",      step: "10 // ЧӢ ШИКАСТААСТ",
              desc: 'Боз нишинед ва <code>fsck</code> нависед. Он минтақаҳои вайрони образи Элисро номбар мекунад.' },
            { id: "os-edit",      step: "11 // МИНТАҚАРО ТАЪМИР",
              desc: '<code>edit &lt;роҳ&gt;</code> кодро мекушояд. Тугмаи <kbd>?? барои жюрӣ</kbd> бо забони содда мефаҳмонад. Баъд <kbd>▶ compile &amp; run</kbd>.' },
            { id: "os-anomaly",   step: "12 // ХАТО НАРХ ДОРАД",
              desc: 'Ягон чизи бемаънӣ ё <code>rm /dev/lamp1</code> нависед. Ҳисоби <em>АНОМАЛИЯҲО</em> меафзояд, ҳуҷра сурх мешавад, ва <code>ps</code> просессеро нишон медиҳад, ки аз они шумо нест.' },
            { id: "os-recover",   step: "13 // ЭЛИСРО БАРГАРДОНЕД",
              desc: 'Вақте <code>fsck</code> тоза шуд — <code>run /home/neikon/recover.sh</code>. Ӯ ҳарф мезанад, пилонҳо фурӯзон, дар кушода мешавад.' },
            { id: "exit-demo",    step: "14 // БАРОМАДАН АЗ ДЕМО",
              desc: 'Тугмаи <kbd>✕ БА СЛАЙД БАРГАРД</kbd> ё ду бор <kbd>Esc</kbd>.' }
        ],
        tj_col: [
            { id: "boot",         step: "01 // ОҒОЗ",
              desc: 'Дар экрани аввал <kbd>БОЗИИ НАВ</kbd>-ро пахш кун.' },
            { id: "slides",       step: "02 // СЛАЙДҲОИ 00–05",
              desc: 'Бо <kbd>←</kbd> <kbd>→</kbd> варақ зан ё <kbd>1</kbd>..<kbd>6</kbd> пахш кун. Шаш слайд.' },
            { id: "settings",     step: "03 // НАСТРОЙКА ВА ЗАБОН",
              desc: 'Дар менюи аввал «<strong>НАСТРОЙКА</strong>»-ро кушо. Дар «<em>СИСТЕМА</em>» забонро иваз кун: <strong>RU / EN / TJ</strong>.' },
            { id: "demo-open",    step: "04 // ДЕМОРО КУШО",
              desc: 'Дар слайди <strong>02</strong> тугмаи <kbd>▶ БОЗИИ ДЕМОРО КУШО</kbd>. Душвориро интихоб кун: EASY (Python), MEDIUM (C++) ё HARD (C).' },
            { id: "void-walk",    step: "05 // ДАР 3D БЕДОР ШУДАН",
              desc: 'Ту <strong>аз шахси якум</strong> дар ҷои холӣ бедор мешавӣ. То терминал рав: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> + муш (дар телефон — ҷойстик ва свайп) ва <kbd>E</kbd>.' },
            { id: "os-boot",      step: "06 // ОС БОР МЕШАВАД",
              desc: 'Прошивка → ядрои Linux → экрани графикӣ → мизи корӣ, ки худаш терминалро мекушояд.' },
            { id: "os-read",      step: "07 // ДИСКРО ХОН",
              desc: '<code>cat readme.txt</code>, баъд <code>ls /dev</code> ва <code>cat /home/neikon/notes/01-the-room.txt</code>. <strong>Файлҳо ҳамон хонаеро тавсиф мекунанд, ки худат дар он истодаӣ.</strong>' },
            { id: "os-svc",       step: "08 // ЧӢ ЗИНДААСТ",
              desc: '<code>svc list</code> навис. Ду пилон <em>DOWN</em>, дар <em>LOOPING</em>, Элис <em>DEAD</em>. Ҳар сатри ин ҷо як ашёи гирдат.' },
            { id: "os-change",    step: "09 // ФАЗОРО ИВАЗ КУН",
              desc: '<code>svc start lamp1</code>, баъд <code>set fog.density 0.02</code>. Ҳоло <kbd>esc</kbd> зан, хез ва бин: <strong>дар торикӣ пилон даргирифт, туман кам шуд.</strong>' },
            { id: "os-fsck",      step: "10 // ЧӢ ШИКАСТАГӢ",
              desc: 'Боз шин ва <code>fsck</code> навис. Ӯ ҷойҳои вайрони образи Элисро мегӯяд.' },
            { id: "os-edit",      step: "11 // ҶОЙРО ДУРУСТ КУН",
              desc: '<code>edit &lt;роҳ&gt;</code> кодро мекушояд. Тугмаи <kbd>?? барои жюрӣ</kbd> сода мефаҳмонад. Баъд <kbd>▶ compile &amp; run</kbd>.' },
            { id: "os-anomaly",   step: "12 // ХАТО НАРХ ДОРАД",
              desc: 'Ягон чизи бемаънӣ ё <code>rm /dev/lamp1</code> навис. <em>АНОМАЛИЯ</em> зиёд мешавад, хона сурх мешавад, <code>ps</code> просесси бегонаро нишон медиҳад.' },
            { id: "os-recover",   step: "13 // ЭЛИСРО БАРГАРДОН",
              desc: 'Вақте <code>fsck</code> тоза шуд — <code>run /home/neikon/recover.sh</code>. Ӯ гап мезанад, пилонҳо даргиранд, дар кушода мешавад.' },
            { id: "exit-demo",    step: "14 // АЗ ДЕМО БАРО",
              desc: 'Тугмаи <kbd>✕ БА СЛАЙД БАРГАРД</kbd> ё ду бор <kbd>Esc</kbd>.' }
        ]
    };

    const JuryChecklist = (() => {
        const STORE_KEY = "neikon.jury.v1";
        /* The key used to carry the protagonist's old, wrong name. A juror
           who ticked half the checklist before the rename should not come
           back to an empty one, so the first load still looks there. */
        const STORE_KEY_LEGACY = "nathan.jury.v1";
        let state = { open: false, checked: {} };

        function $(id) { return document.getElementById(id); }
        function locale() {
            return (typeof settingsState !== "undefined" && settingsState && settingsState.locale)
                ? settingsState.locale : "ru";
        }
        function items() {
            const loc = locale();
            return JURY_CHECKLIST_BY_LOCALE[loc] || JURY_CHECKLIST_BY_LOCALE.ru;
        }

        function load() {
            try {
                let raw = localStorage.getItem(STORE_KEY);
                if (!raw) {
                    /* one-time carry-over from the pre-rename key */
                    raw = localStorage.getItem(STORE_KEY_LEGACY);
                    if (raw) {
                        try {
                            localStorage.setItem(STORE_KEY, raw);
                            localStorage.removeItem(STORE_KEY_LEGACY);
                        } catch (e) { /* quota / private mode — read-only is fine */ }
                    }
                }
                if (raw) {
                    const p = JSON.parse(raw);
                    state.open    = !!p.open;
                    state.checked = (p.checked && typeof p.checked === "object") ? p.checked : {};
                }
            } catch (e) { /* ignore */ }
        }
        function save() {
            try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
        }

        function updateProgress() {
            const list = items();
            let done = 0;
            for (let i = 0; i < list.length; i++) if (state.checked[list[i].id]) done++;
            const total = list.length;
            const pct   = total ? Math.round(100 * done / total) : 0;
            const elDone  = $("juryDone");
            const elTotal = $("juryTotal");
            const elPct   = $("juryPct");
            const elFill  = $("juryFill");
            if (elDone)  elDone.textContent  = String(done);
            if (elTotal) elTotal.textContent = String(total);
            if (elPct)   elPct.textContent   = pct + "%";
            if (elFill)  elFill.style.width  = pct + "%";
        }

        function render() {
            const list = $("juryList");
            if (!list) return;
            list.innerHTML = "";
            items().forEach(function (it) {
                const li = document.createElement("li");
                li.className = "jury-item";
                if (state.checked[it.id]) li.classList.add("done");
                li.dataset.id = it.id;
                const checked = state.checked[it.id] ? " checked" : "";
                li.innerHTML =
                    '<label>' +
                        '<input type="checkbox"' + checked + ' />' +
                        '<span>' +
                            '<span class="jury-step"></span>' +
                            '<span class="jury-desc"></span>' +
                        '</span>' +
                    '</label>';
                li.querySelector(".jury-step").textContent = it.step;
                li.querySelector(".jury-desc").innerHTML   = it.desc;
                li.querySelector("input").addEventListener("change", function (e) {
                    state.checked[it.id] = !!e.target.checked;
                    li.classList.toggle("done", !!e.target.checked);
                    save();
                    updateProgress();
                    if (typeof Audio !== "undefined" && Audio) {
                        try {
                            if (e.target.checked && typeof Audio.playOpen === "function") Audio.playOpen();
                            else if (typeof Audio.playClick === "function") Audio.playClick();
                        } catch (err) { /* ignore */ }
                    }
                });
                list.appendChild(li);
            });
            updateProgress();
        }

        function setOpen(open) {
            state.open = !!open;
            const root = $("jury");
            const tab  = $("juryTab");
            if (root) root.setAttribute("data-collapsed", open ? "0" : "1");
            if (tab)  tab.setAttribute("aria-expanded", open ? "true" : "false");
            save();
        }
        function toggle() { setOpen(!state.open); }
        function reset() {
            state.checked = {};
            save();
            render();
        }

        function init() {
            if (!$("jury")) return;
            load();
            render();
            setOpen(state.open);

            const tab = $("juryTab");
            if (tab) tab.addEventListener("click", function () {
                toggle();
                if (typeof Audio !== "undefined" && Audio && typeof Audio.playClick === "function") {
                    try { Audio.playClick(); } catch (e) { /* ignore */ }
                }
            });
            const closeBtn = $("juryClose");
            if (closeBtn) closeBtn.addEventListener("click", function () { setOpen(false); });

            const resetBtn = $("juryReset");
            if (resetBtn) resetBtn.addEventListener("click", function () {
                const msg = locale() === "en"
                    ? "Reset all checklist marks?"
                    : "Сбросить все отметки чек-листа?";
                if (window.confirm(msg)) reset();
            });

            // Re-render when locale changes (called from applyLocale)
            window.__jurySyncLocale = function () { render(); };
        }

        return { init: init, render: render, reset: reset, setOpen: setOpen };
    })();


    // Initialise the jury checklist after the DOM is ready (the markup
    // for #jury sits at the bottom of <body>, so the elements exist
    // by the time this script runs).
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            JuryChecklist.init();
        });
    } else {
        JuryChecklist.init();
    }


    /* ============================================================
       MOBILE / TOUCH ADAPTER
       ------------------------------------------------------------
       The deck is handed to the jury as a QR code, so a phone is a
       first-class target, not a fallback.  The CSS does the layout;
       this module supplies the behaviour that CSS cannot express:

         · --kb        keyboard inset, so the terminal prompt and the
                       code editor never sit under the on-screen keys
         · alice       the chat strip collapses to its header and
                       expands on tap (it would eat half the screen)
         · swipe       left / right anywhere on the slide body moves
                       between slides, the way a deck should behave
         · nav strip   keeps the active slide chip scrolled into view
         · demo HUD    SANITY / hints / walkthrough / quick-fx move
                       into an off-canvas drawer with a toggle button

       Everything here is additive and no-ops on desktop.
       ============================================================ */
