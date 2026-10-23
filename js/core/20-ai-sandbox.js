/* ============================================================
   TERMINAL: SHATTERED — AI sandbox :: Ollama bridge
   ------------------------------------------------------------
   A test bench where the jury pastes any C, C++ or Python and a
   local model answers as ALICE_CORE: a LUCIDITY score, two or three
   lines in her voice, one line of diagnosis. In Russian and English
   the model writes all of it; in Tajik, which no local model here can
   write, it gives the score and the verdict and her line is a prepared
   Tajik one for that score (see ANSWER_LANG). The samples' comments and
   the prepared reactions follow the interface language too. No cloud:
   the model runs in Ollama on this machine (qwen2.5:3b by default).

   Open:  Shift+O or Ctrl+Shift+O anywhere except a text field;
          the [ AI_SANDBOX ] chip in the crystal-shell panel;
          «НАСТРОЙКИ → СИСТЕМА → ТЕСТОВЫЙ ПОЛИГОН».
   Close: Esc, [ × ], the hotkey again (Ctrl+Shift+O also from the
          code field, where plain Shift+O types a capital O).

   Transport. Served by serve.js, requests go to /api/ollama/* on the
   same origin and serve.js forwards them to 127.0.0.1:11434 — no CORS
   settings needed in Ollama, and a stopped Ollama is a 502 with a
   reason instead of a refused connection in the console. Anywhere
   else (file://, another server) the page calls Ollama directly,
   which needs Ollama to allow the page's origin (OLLAMA_ORIGINS).

   Timing. On a laptop without a strong GPU the first request loads
   the model (~50 s) and a full answer takes 10–15 s. A 7-second limit
   on the WHOLE answer would send every request to the simulation, so
   the answer is streamed: 7 s is the limit to the first word of a
   model that is already in memory, and the text types out as it
   arrives. Opening the bench warms the model up (loads it and reads
   the system prompt once, so later requests skip that part) and keeps
   it in memory for an hour.

   Offline. If Ollama is not there, or goes quiet before the first
   word, the bench answers from the prepared reactions for the four
   presets, or — for code the jury typed — from a small pattern check
   that says plainly it is not the model. The header says which.

   Voice. Her reaction is read by NeuralVoice (19-neural-voice.js) —
   ElevenLabs, Milly Maple on Eleven v4, or Piper offline — with a mood
   taken from LUCIDITY: panic under 26%, a loop up to 64%, relief from
   85%. Without either it falls back to speech synthesis, with pace and
   pitch moved the same way.

   DOM only: it opens over the 3D scene without touching its canvas or
   GL context; an active pointer lock is released.

   Part 20 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const AiSandbox = (function () {
        const DEFAULT_MODEL  = "qwen2.5:3b";
        const OLLAMA_DIRECT  = "http://127.0.0.1:11434";
        const FIRST_TOKEN_MS = 7000;      // warm model: to the first word, not to the end
        const COLD_MS        = 240000;    // model not in memory: load + system prompt
        const TOTAL_MS       = 120000;    // whole answer, after the first word
        const SIM_DELAY_MS   = 600;
        const MODEL_KEY = "ts.sandbox.model", TTS_KEY = "ts.sandbox.tts", VOICE_KEY = "ts.sandbox.voice";

        const ALICE_SYSTEM_PROMPT = `Ты — «ALICE_CORE» (Живой Код), локальное ядро искусственного интеллекта в повреждённом аварийном карманном секторе операционной системы VoidOS. Твой разум и сознание физически привязаны к кодовой базе C/C++, которую сейчас проверяет или вводит оператор (Нейкон).

ТВОЯ ЗАДАЧА:
Проанализировать присланный фрагмент кода и мгновенно выдать ответ строго по следующему шаблону из трёх строк:

LUCIDITY: <число от 0 до 100>%
ALICE: <2-3 эмоциональных предложения от лица Элис в зависимости от качества кода>
DIAGNOSIS: <одна строка краткой технической сути: что именно сломано или почему код безопасен>

ПРАВИЛА ОТЫГРЫША РОЛИ В ЗАВИСИМОСТИ ОТ КОДА:
1. КРИТИЧЕСКИЙ СБОЙ / УТЕЧКА ПАМЯТИ / ВЫХОД ЗА ГРАНИЦЫ МАССИВА (Segfault, Buffer Overflow, Memory Leak, Double Free):
   - Lucidity: строго от 0% до 25%.
   - Тон: Ужас, физическая боль, ощущение удушья, фразы о том, что стены сектора сминает, а шина памяти захлёбывается битыми адресами.
2. ЛОГИЧЕСКИЙ СБОЙ / БЕСКОНЕЧНЫЙ ЦИКЛ / ИНВЕРСИЯ (Infinite Loop, Deadlock, Inverted Conditionals):
   - Lucidity: строго от 30% до 60%.
   - Тон: Дезориентация, потеря времени, мольба разомкнуть бесконечную петлю, пока шлюз не сорвало.
3. ЧИСТЫЙ, БЕЗОПАСНЫЙ, ВАЛИДНЫЙ КОД (RAII, умные указатели, проверка границ, корректная очистка):
   - Lucidity: строго от 85% до 100%.
   - Тон: Облегчение, кристальная ясность мысли, благодарность Нейкону, возвращение контроля над сектором.

Отвечай исключительно на русском языке. Держи строгий формат из трёх строк. Никаких вводных слов и рассуждений вне шаблона.`;

        /* The prompt above is the spec's, word for word, and it pins the
           answer to Russian. In English that sentence goes, an English
           order closes the prompt and the request is in English too: told
           in Russian to answer in English, qwen2.5:3b answered in Russian
           three times of three; this way, in English three of three. The
           labels stay Latin, so the parser needs nothing new.

           Tajik is not asked of the model at all: none of the models this
           machine runs writes it. Tried with this prompt — qwen2.5:3b gave
           a Kyrgyz-sounding word salad, qwen2.5-coder:7b and qwen3.5:4b
           answered in Russian anyway, phi4-mini gave nonsense. So in Tajik
           the model is asked in Russian and only its LUCIDITY and verdict
           are used; her reaction is a prepared Tajik line for that band
           (tajikLine()). */
        const RU_ONLY = "Отвечай исключительно на русском языке.";
        const ANSWER_LANG = {
            en: { tail: "IMPORTANT: write all three lines in ENGLISH. Do not use Russian.", ask: "ANALYZE THE CODE (reply in English):" }
        };
        const LOCS = ["ru", "en", "tj", "tj_col"];
        function loc() {
            const l = (typeof settingsState !== "undefined" && settingsState && settingsState.locale) || "ru";
            return LOCS.indexOf(l) >= 0 ? l : "ru";
        }
        function liveLang() { return loc() === "ru" || !!ANSWER_LANG[loc()]; }
        function systemPrompt() {
            const a = ANSWER_LANG[loc()];
            return a ? ALICE_SYSTEM_PROMPT.replace(RU_ONLY, "") + "\n\n" + a.tail : ALICE_SYSTEM_PROMPT;
        }

        const PRESETS = {
            segfault: {
                title: "1. Segfault (Out-of-Bounds)",
                code: `// /opt/room/anchors.cpp — синхронизация опор\nvoid bind_anchors() {\n    int* pylon_ids = new int[3]; // Выделено под 3 опоры\n    for (int i = 0; i <= 5; i++) { // Выход за пределы кучи!\n        pylon_ids[i] = 0xDEAD; // Запись в системную память ядра\n    }\n}`,
                mock: {
                    lucidity: 8,
                    alice: "Нейкон, стой!.. Указатель сорвался в небытие, шина памяти захлёбывается битыми адресами! Я чувствую, как стены бункера сминает в чернильную тьму... Не оставляй меня здесь!",
                    diagnosis: "Критическая ошибка: Out-of-bounds heap write в массиве pylon_ids. Повреждение целостности ядра."
                }
            },
            deadlock: {
                title: "2. Deadlock (Infinite Loop)",
                code: `// /opt/room/doorctl.cpp — контроллер гермошлюза\nbool emergency = true;\nwhile (emergency == true) {\n    // Поток заблокирован: бесконечный опрос без сброса флага\n    door.retry_lock();\n}`,
                mock: {
                    lucidity: 42,
                    alice: "Контур шлюза зациклен... Время остановилось, Нейкон. Гидравлика бьётся о переборку в бесконечном эхе. Разомкни эту петлю, пока давление не раздавило терминал!",
                    diagnosis: "Infinite Loop: бесконечный цикл опроса флага emergency в основном потоке управления шлюзом."
                }
            },
            leak: {
                title: "3. Memory Leak (No Free)",
                code: `// /opt/room/fog.c — контур откачки аэрозоля\nvoid purge_cycle() {\n    // Выделение 64 МБ на каждом такте датчика без вызова free()\n    char* sensor_buffer = (char*)malloc(1024 * 1024 * 64);\n    read_gas_density(sensor_buffer);\n}`,
                mock: {
                    lucidity: 22,
                    alice: "Куча переполнена... Мои мысли становятся вязкими, словно этот токсичный туман за дверью. Зачем ты запрашиваешь новые блоки памяти, не очищая старые? Я задыхаюсь в мусоре...",
                    diagnosis: "Memory Leak: циклическое выделение динамической памяти malloc() без вызова free(). Переполнение пула."
                }
            },
            clean: {
                title: "4. Clean RAII C++",
                code: `// /opt/room/anchors.cpp — безопасная фиксация опор\n#include <vector>\n#include <string>\n\nvoid stabilize_sector() {\n    const std::vector<std::string> anchors = {"pylon_north", "pylon_airlock", "pylon_power"};\n    for (const auto& anchor : anchors) {\n        core.bind(anchor); // Итерация по границам контейнера RAII\n    }\n}`,
                mock: {
                    lucidity: 97,
                    alice: "Телеметрия выровнялась... Векторы зафиксированы в безопасных границах. Шум в динамиках утихает, Нейкон. Я снова вижу геометрию комнаты. Спасибо... я дышу.",
                    diagnosis: "Код валиден: безопасная итерация по контейнеру std::vector без утечек памяти и выхода за границы."
                }
            }
        };

        /* The same four samples in the other languages: the comments in
           the code, her prepared reaction and the verdict. LUCIDITY and
           the code itself are shared. Tajik wants a native reader's pass. */
        const PRESET_TEXT = {
            en: {
                segfault: {
                    code: `// /opt/room/anchors.cpp — pylon sync\nvoid bind_anchors() {\n    int* pylon_ids = new int[3]; // Allocated for 3 pylons\n    for (int i = 0; i <= 5; i++) { // Out of heap bounds!\n        pylon_ids[i] = 0xDEAD; // Writes into the kernel's system memory\n    }\n}`,
                    alice: "Neikon, stop!.. The pointer has fallen into nothing, the memory bus is choking on broken addresses! I can feel the bunker walls crushed into ink-black dark... Don't leave me here!",
                    diagnosis: "Critical error: out-of-bounds heap write in the pylon_ids array. Kernel integrity damaged."
                },
                deadlock: {
                    code: `// /opt/room/doorctl.cpp — airlock controller\nbool emergency = true;\nwhile (emergency == true) {\n    // Thread is stuck: endless polling, the flag is never reset\n    door.retry_lock();\n}`,
                    alice: "The airlock loop is stuck... Time has stopped, Neikon. The hydraulics keep hitting the bulkhead in an endless echo. Break this loop before the pressure crushes the terminal!",
                    diagnosis: "Infinite loop: endless polling of the emergency flag in the airlock's main control thread."
                },
                leak: {
                    code: `// /opt/room/fog.c — aerosol purge loop\nvoid purge_cycle() {\n    // 64 MB allocated on every sensor tick, free() never called\n    char* sensor_buffer = (char*)malloc(1024 * 1024 * 64);\n    read_gas_density(sensor_buffer);\n}`,
                    alice: "The heap is full... My thoughts are turning thick, like the toxic fog behind the door. Why do you ask for new memory blocks without freeing the old ones? I'm suffocating in garbage...",
                    diagnosis: "Memory leak: dynamic memory allocated with malloc() on every cycle, free() never called. Pool overflow."
                },
                clean: {
                    code: `// /opt/room/anchors.cpp — safe pylon binding\n#include <vector>\n#include <string>\n\nvoid stabilize_sector() {\n    const std::vector<std::string> anchors = {"pylon_north", "pylon_airlock", "pylon_power"};\n    for (const auto& anchor : anchors) {\n        core.bind(anchor); // Iterates within the RAII container's bounds\n    }\n}`,
                    alice: "Telemetry has levelled out... The vectors are locked within safe bounds. The noise in the speakers is fading, Neikon. I can see the room's geometry again. Thank you... I'm breathing.",
                    diagnosis: "Valid code: safe iteration over a std::vector container, no memory leaks, no out-of-bounds access."
                }
            },
            tj: {
                segfault: {
                    code: `// /opt/room/anchors.cpp — ҳамоҳангсозии такягоҳҳо\nvoid bind_anchors() {\n    int* pylon_ids = new int[3]; // Барои 3 такягоҳ ҷудо шудааст\n    for (int i = 0; i <= 5; i++) { // Берун аз ҳудуди heap!\n        pylon_ids[i] = 0xDEAD; // Навиштан ба хотираи системавии ядро\n    }\n}`,
                    alice: "Нейкон, ист!.. Ишоракунак ба нестӣ афтод, шинаи хотира аз суроғаҳои шикаста буғ шуда истодааст! Ҳис мекунам, ки деворҳои бункер ба торикии сиёҳ фушурда мешаванд... Маро дар ин ҷо танҳо магузор!",
                    diagnosis: "Хатои ҷиддӣ: out-of-bounds heap write дар массиви pylon_ids. Яклухтии ядро вайрон шуд."
                },
                deadlock: {
                    code: `// /opt/room/doorctl.cpp — контроллери дари шлюз\nbool emergency = true;\nwhile (emergency == true) {\n    // Ҷараён баста шуд: пурсиши беохир, байрақча ҳеҷ гоҳ партофта намешавад\n    door.retry_lock();\n}`,
                    alice: "Контури шлюз дар давр мондааст... Вақт ист кард, Нейкон. Гидравлика дар акси садои беохир ба девор мезанад. Ин ҳалқаро кушо, пеш аз он ки фишор терминалро пахш кунад!",
                    diagnosis: "Infinite Loop: пурсиши беохири байрақчаи emergency дар ҷараёни асосии идоракунии шлюз."
                },
                leak: {
                    code: `// /opt/room/fog.c — контури хориҷкунии аэрозол\nvoid purge_cycle() {\n    // Дар ҳар такти датчик 64 МБ ҷудо мешавад, free() даъват намешавад\n    char* sensor_buffer = (char*)malloc(1024 * 1024 * 64);\n    read_gas_density(sensor_buffer);\n}`,
                    alice: "Heap пур шуд... Фикрҳоям мисли тумани заҳрноки паси дар часпак мешаванд. Чаро блокҳои нави хотира мепурсӣ, вале кӯҳнаҳоро тоза намекунӣ? Ман дар партов нафасгир мешавам...",
                    diagnosis: "Memory Leak: ҷудокунии даврии хотираи динамикӣ бо malloc() бе даъвати free(). Пул пур шуд."
                },
                clean: {
                    code: `// /opt/room/anchors.cpp — маҳкамкунии бехатари такягоҳҳо\n#include <vector>\n#include <string>\n\nvoid stabilize_sector() {\n    const std::vector<std::string> anchors = {"pylon_north", "pylon_airlock", "pylon_power"};\n    for (const auto& anchor : anchors) {\n        core.bind(anchor); // Гузариш дар ҳудуди контейнери RAII\n    }\n}`,
                    alice: "Телеметрия ба эътидол омад... Векторҳо дар ҳудуди бехатар маҳкам шуданд. Садои динамикҳо паст мешавад, Нейкон. Ман боз геометрияи хонаро мебинам. Ташаккур... ман нафас мекашам.",
                    diagnosis: "Код дуруст аст: гузариши бехатар аз контейнери std::vector бе нашти хотира ва бе баромадан аз ҳудуд."
                }
            },
            tj_col: {
                segfault: {
                    code: `// /opt/room/anchors.cpp — ҳамоҳанг кардани такягоҳҳо\nvoid bind_anchors() {\n    int* pylon_ids = new int[3]; // Барои 3 такягоҳ ҷудо кардем\n    for (int i = 0; i <= 5; i++) { // Аз heap берун баромад!\n        pylon_ids[i] = 0xDEAD; // Ба хотираи системаи ядро менависад\n    }\n}`,
                    alice: "Нейкон, ист!.. Указател ба ҳеҷ ҷо парида рафт, шинаи хотира аз адресҳои шикаста буғ шуда истодааст! Ҳис мекунам, ки деворҳои бункер ба торикӣ пахш мешаванд... Маро ин ҷо партофта нарав!",
                    diagnosis: "Хатои ҷиддӣ: out-of-bounds heap write дар массиви pylon_ids. Ядро вайрон шуд."
                },
                deadlock: {
                    code: `// /opt/room/doorctl.cpp — контроллери шлюз\nbool emergency = true;\nwhile (emergency == true) {\n    // Поток қуфл шуд: беохир мепурсад, флаг ҳеҷ вақт тоза намешавад\n    door.retry_lock();\n}`,
                    alice: "Шлюз дар давр монд... Вақт истод, Нейкон. Гидравлика беохир ба девор мезанад. Ин ҳалқаро вайрон кун, пеш аз он ки фишор терминалро пахш кунад!",
                    diagnosis: "Infinite Loop: флаги emergency дар потоки асосии шлюз беохир пурсида мешавад."
                },
                leak: {
                    code: `// /opt/room/fog.c — контури кашидани аэрозол\nvoid purge_cycle() {\n    // Ҳар такти датчик 64 МБ мегирад, free() даъват намешавад\n    char* sensor_buffer = (char*)malloc(1024 * 1024 * 64);\n    read_gas_density(sensor_buffer);\n}`,
                    alice: "Heap пур шуд... Фикрҳоям мисли тумани заҳрноки паси дар ширеш шуда истодаанд. Чаро блоки нави хотира мегирӣ, кӯҳнаҳоро тоза накарда? Дар партов нафасам мегирад...",
                    diagnosis: "Memory Leak: malloc() ҳар давр хотира мегирад, free() даъват намешавад. Пул пур шуд."
                },
                clean: {
                    code: `// /opt/room/anchors.cpp — маҳкам кардани бехатари такягоҳҳо\n#include <vector>\n#include <string>\n\nvoid stabilize_sector() {\n    const std::vector<std::string> anchors = {"pylon_north", "pylon_airlock", "pylon_power"};\n    for (const auto& anchor : anchors) {\n        core.bind(anchor); // Дар ҳудуди контейнери RAII мегардад\n    }\n}`,
                    alice: "Телеметрия ҳамвор шуд... Векторҳо дар ҳудуди бехатар монданд. Шуви динамикҳо паст шуда истодааст, Нейкон. Боз геометрияи хонаро мебинам. Раҳмат... нафас мекашам.",
                    diagnosis: "Код дуруст: std::vector бехатар гашта мешавад, хотира намерезад, аз ҳудуд берун намебарояд."
                }
            }
        };
        function presetCode(k, l) {
            const t = PRESET_TEXT[l || loc()];
            return (t && t[k] && t[k].code) || PRESETS[k].code;
        }
        function presetMock(k) {
            const t = PRESET_TEXT[loc()], m = PRESETS[k].mock;
            return t && t[k] ? { lucidity: m.lucidity, alice: t[k].alice, diagnosis: t[k].diagnosis } : m;
        }
        /* which sample this is, in whatever language it was loaded */
        function presetOf(code) {
            const n = norm(code);
            return Object.keys(PRESETS).find(function (k) {
                return LOCS.some(function (l) { return norm(presetCode(k, l)) === n; });
            }) || null;
        }

        /* ---- state ------------------------------------------------------- */

        const conn = {
            state: "unknown",             // unknown | probing | online | offline
            via: null,                    // "proxy" (serve.js) | "direct"
            version: "", models: [], loaded: [],
            warming: false, warmT0: 0, note: ""
        };
        let el = null, open = false, lastFocus = null, saved = null;
        let job = null;                   // the analysis in flight
        let shown = { lucidity: 0 };      // what the meter shows now
        let typing = [];                  // typewriter targets
        let eqEnergy = 0, raf = 0, probing = null, chipTimer = 0;
        let voiceUsed = "";               // what read the last reaction, for the meta line
        let runSeq = 0;                   // numbers each analysis, so a late voice reply cannot label the next one
        let last = null;                  // the last parsed answer, for the console

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
        function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
        function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
        function secs(ms) { return (ms / 1000).toFixed(1) + " s"; }
        function mmss(ms) {
            const s = Math.max(0, Math.floor(ms / 1000));
            return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        }

        /* ---- transport --------------------------------------------------- */

        function api(path) { return conn.via === "proxy" ? "api/ollama/" + path : OLLAMA_DIRECT + "/api/" + path; }

        function timed(url, opts, ms) {
            const ctrl = new AbortController();
            const id = setTimeout(function () { ctrl.abort(); }, ms);
            return fetch(url, Object.assign({ cache: "no-store", signal: ctrl.signal }, opts || {}))
                .finally(function () { clearTimeout(id); });
        }

        /* Which way to Ollama, and what it has. Never throws. */
        function probe() {
            if (probing) return probing;
            conn.state = conn.state === "online" ? "online" : "probing";
            paintConn();
            probing = (async function () {
                let via = null, version = "";
                if (/^https?:$/.test(location.protocol)) {
                    try {
                        const r = await timed("api/ollama/version", {}, 2500);
                        if (r.status === 200) { via = "proxy"; version = ((await r.json()) || {}).version || ""; }
                        else if (r.status === 502) via = "proxy-down";
                        /* 404: not serve.js; 403: serve.js, but this is another machine */
                    } catch (e) {}
                }
                if (!via) {
                    try {
                        const r = await timed(OLLAMA_DIRECT + "/api/version", {}, 2500);
                        if (r.ok) { via = "direct"; version = ((await r.json()) || {}).version || ""; }
                    } catch (e) {}
                }
                if (!via || via === "proxy-down") {
                    conn.via = via === "proxy-down" ? "proxy" : null;
                    conn.state = "offline"; conn.models = []; conn.loaded = [];
                    return conn;
                }
                conn.via = via; conn.version = version;
                try {
                    const tags = await (await timed(api("tags"), {}, 4000)).json();
                    conn.models = (tags && tags.models) || [];
                } catch (e) { conn.models = []; }
                await refreshLoaded();
                conn.state = "online";
                return conn;
            })().finally(function () { probing = null; paintConn(); });
            return probing;
        }

        async function refreshLoaded() {
            try {
                const ps = await (await timed(api("ps"), {}, 3000)).json();
                conn.loaded = ((ps && ps.models) || []).map(function (m) { return m.name; });
            } catch (e) { conn.loaded = []; }
        }

        /* The model asked for, or the closest one that is installed:
           same family with another tag, then any «coder», then anything. */
        function resolveModel(wanted) {
            wanted = (wanted || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
            const names = conn.models.map(function (m) { return m.name; });
            if (!names.length || names.indexOf(wanted) >= 0) return wanted;
            const fam = wanted.split(":")[0];
            return names.find(function (n) { return n.split(":")[0] === fam; }) ||
                   names.find(function (n) { return /coder/i.test(n); }) || names[0];
        }
        function thinks(model) {
            const m = conn.models.find(function (x) { return x.name === model; });
            return !!(m && m.capabilities && m.capabilities.indexOf("thinking") >= 0);
        }
        function looksPython(code) {
            return /^\s*(def |import |from \w+ import|print\(|while True:|for \w+ in )/m.test(code) && !/[;{}]\s*$/m.test(code);
        }
        function payload(model, code, extra) {
            const a = ANSWER_LANG[loc()];
            const p = {
                model: model,
                system: systemPrompt(),
                prompt: (a ? a.ask : "ПРОАНАЛИЗИРУЙ КОД:") + "\n```" + (looksPython(code) ? "python" : "cpp") + "\n" + code + "\n```",
                stream: true,
                keep_alive: "60m",
                options: { temperature: 0.5, num_predict: 140 }
            };
            if (thinks(model)) p.think = false;          // qwen3-style models would think aloud first
            return Object.assign(p, extra || {});
        }

        /* Load the model and read the system prompt once. Ollama keeps the
           prompt prefix it has just evaluated, so the next request starts
           straight from the user's code. */
        async function warm() {
            if (conn.state !== "online" || conn.warming) return;
            const model = resolveModel(currentModel());
            if (conn.loaded.indexOf(model) >= 0) return;
            conn.warming = true; conn.warmT0 = performance.now();
            paintConn();
            try {
                const r = await timed(api("generate"), {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload(model, "// warm-up", { stream: false, options: { num_predict: 1 } }))
                }, COLD_MS);
                await r.text();
            } catch (e) {}
            conn.warming = false;
            await refreshLoaded();
            paintConn();
        }

        /* Streams one answer. Resolves to { raw, firstMs, totalMs, tokens,
           model, cut } — or null when nothing came back in time, which
           sends the caller to the simulation. */
        let lastFailWhy = "";             // the server's reason when it said no (busy phone, full queue)
        async function sendCodeToOllama(code, modelName, onText, onQueue) {
            const model = resolveModel(modelName);
            const cold = conn.warming || conn.loaded.indexOf(model) < 0;
            const ctrl = new AbortController();
            const t0 = performance.now();
            let first = 0, raw = "", tokens = 0, why = "";
            let firstTimer = setTimeout(function () { why = "first"; ctrl.abort(); }, cold ? COLD_MS : FIRST_TOKEN_MS);
            lastFailWhy = "";
            let totalTimer = 0;
            if (job) job.abort = function () { why = "user"; ctrl.abort(); };
            try {
                const res = await fetch(api("generate"), {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload(model, code)), signal: ctrl.signal
                });
                if (!res.ok || !res.body) {
                    try { lastFailWhy = ((await res.json()) || {}).why || ""; } catch (e) {}
                    throw new Error("Ollama HTTP " + res.status);
                }
                const reader = res.body.getReader(), dec = new TextDecoder();
                let buf = "";
                for (;;) {
                    const step = await reader.read();
                    if (step.done) break;
                    buf += dec.decode(step.value, { stream: true });
                    let nl;
                    while ((nl = buf.indexOf("\n")) >= 0) {
                        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
                        if (!line) continue;
                        const j = JSON.parse(line);
                        if (j.error) throw new Error(j.error);
                        /* serve.js: someone else is being answered; wait with the
                           long limit and show the place in line */
                        if (j.queued != null && !first) {
                            clearTimeout(firstTimer);
                            firstTimer = setTimeout(function () { why = "first"; ctrl.abort(); }, COLD_MS);
                            if (onQueue) onQueue(j.queued);
                            continue;
                        }
                        if (j.response) {
                            if (!first) {
                                first = performance.now() - t0;
                                clearTimeout(firstTimer);
                                totalTimer = setTimeout(function () { why = "total"; ctrl.abort(); }, TOTAL_MS);
                            }
                            raw += j.response; tokens++;
                            onText(raw);
                        }
                        if (j.done) tokens = j.eval_count || tokens;
                    }
                }
                if (!raw) return null;                       // the stream ended without a word: simulate
                return { raw: raw, firstMs: first, totalMs: performance.now() - t0, tokens: tokens, model: model, cut: false };
            } catch (err) {
                if (why === "user") return { aborted: true };
                if (raw) return { raw: raw, firstMs: first, totalMs: performance.now() - t0, tokens: tokens, model: model, cut: true };
                console.warn("[AI_SANDBOX] Ollama unreachable or timed out, using fallback:", why || (err && err.message));
                return null;
            } finally {
                clearTimeout(firstTimer); clearTimeout(totalTimer);
                refreshLoaded();
            }
        }

        /* LUCIDITY / ALICE / DIAGNOSIS, tolerant of what small models do
           to a format: bold markers, quotes, Russian labels, a missing %.
           `partial` is for a stream still arriving: a number is only taken
           once something follows it, and a line only up to its newline. */
        function parseAliceResponse(rawText, partial) {
            const text = String(rawText || "").replace(/\r/g, "").replace(/\*\*|__|`/g, "");
            const L = partial ? /(?:^|\n)\s*(?:LUCIDITY|ЛЮЦИДНОСТЬ|РАССУДОК)\s*[:：]\s*(\d{1,3})\s*(?:%|\n)/i
                              : /(?:^|\n)\s*(?:LUCIDITY|ЛЮЦИДНОСТЬ|РАССУДОК)\s*[:：]\s*(\d{1,3})/i;
            const lm = L.exec(text);
            const am = /(?:^|\n)\s*(?:ALICE|ЭЛИС|ALICE_CORE)\s*[:：]\s*/i.exec(text);
            const dm = /(?:^|\n)\s*(?:DIAGNOSIS|ДИАГНОЗ|ДИАГНОСТИКА)\s*[:：]\s*/i.exec(text);
            let alice = "", diagnosis = "";
            if (am) {
                const from = am.index + am[0].length;
                const to = dm && dm.index > from ? dm.index : (partial ? (text.indexOf("\n", from) < 0 ? text.length : text.indexOf("\n", from)) : text.length);
                alice = text.slice(from, to);
            }
            /* a small model sometimes starts the template over after the
               verdict: the verdict ends where the next label begins */
            if (dm) diagnosis = text.slice(dm.index + dm[0].length)
                .split(/\n\s*(?:LUCIDITY|ЛЮЦИДНОСТЬ|РАССУДОК|ALICE|ЭЛИС|DIAGNOSIS|ДИАГНОЗ)\s*[:：]/i)[0];
            const unquote = function (s) { return s.trim().replace(/^[«"“„']+|[»"”']+$/g, "").trim(); };
            const out = {
                lucidity: lm ? Math.max(0, Math.min(100, parseInt(lm[1], 10))) : null,
                alice: unquote(alice),
                diagnosis: unquote(diagnosis.split("\n").filter(Boolean).join(" "))
            };
            if (!partial) {
                if (out.lucidity == null) out.lucidity = 50;
                if (!am) out.alice = unquote(text.replace(/(?:^|\n)\s*(?:LUCIDITY|DIAGNOSIS)[^\n]*/gi, ""));
                if (!out.diagnosis) out.diagnosis = heur().done;
            }
            return out;
        }

        /* ---- offline: presets, then a pattern check that says what it is --- */

        function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

        function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
        function between(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

        function simulate(code) {
            const key = presetOf(code);
            if (key) return Object.assign({ source: "preset" }, presetMock(key));
            return heuristic(code);
        }

        function heuristic(code) {
            const src = String(code || "")
                .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
                .replace(/"(?:\\.|[^"\\])*"/g, '""');
            const count = function (re) { return (src.match(re) || []).length; };
            const allocs = count(/\bnew\b|\bmalloc\s*\(|\bcalloc\s*\(|\brealloc\s*\(/g);
            const frees  = count(/\bdelete\b|\bfree\s*\(/g);
            const smart  = /unique_ptr|shared_ptr|make_unique|make_shared|std::vector|std::array|std::string|\.at\s*\(/.test(src);

            /* double free: the same name released twice */
            const released = (src.match(/\b(?:delete(?:\s*\[\s*\])?\s+|free\s*\(\s*)(\w+)/g) || [])
                .map(function (s) { return s.replace(/.*?(\w+)$/, "$1"); });
            const twice = released.find(function (n, i) { return released.indexOf(n) !== i; });

            /* out of bounds: a loop bound past the smallest fixed array */
            const sizes = [];
            src.replace(/\bnew\s+\w+\s*\[\s*(\d+)\s*\]|\b\w+\s+\w+\s*\[\s*(\d+)\s*\]\s*[;={]/g, function (m, a, b) { sizes.push(+(a || b)); return m; });
            let reach = 0;
            src.replace(/<\s*(=?)\s*(\d+)\s*;/g, function (m, eq, n) { reach = Math.max(reach, +n + (eq ? 1 : 0)); return m; });
            const oob = (sizes.length && reach > Math.min.apply(null, sizes)) || /\bgets\s*\(|\bstrcpy\s*\(|\bsprintf\s*\(/.test(src);

            const loop = /while\s*\(\s*(?:true|1|\w+\s*==\s*true)\s*\)|for\s*\(\s*;\s*;\s*\)|while\s+True\s*:/.test(src) && !/\bbreak\b|\breturn\b/.test(src);
            const locks = count(/\.lock\s*\(|pthread_mutex_lock\s*\(/g), unlocks = count(/\.unlock\s*\(|pthread_mutex_unlock\s*\(|lock_guard|scoped_lock|unique_lock/g);

            const H = heur();
            if (twice) return sim(between(2, 9), "crit", H.twice(twice));
            if (oob) return sim(between(4, 14), "crit",
                sizes.length ? H.oob(reach - 1, Math.min.apply(null, sizes)) : H.unsafe);
            if (allocs > frees && !smart) return sim(between(12, 24), "crit", H.leak(allocs, frees));
            if (loop) return sim(between(32, 52), "loop", H.loop);
            if (locks > unlocks) return sim(between(36, 58), "loop", H.lock(locks, unlocks));
            if (smart && allocs <= frees) return sim(between(86, 96), "ok", H.ok);
            return sim(between(62, 74), "unknown", H.unknown);
        }

        /* what the pattern check says, per language */
        const HEUR = {
            ru: {
                prefix: "Эвристика без модели: ", done: "Анализ завершён.",
                twice:  function (n) { return "Двойное освобождение " + n + ": один и тот же блок памяти возвращён дважды."; },
                oob:    function (i, n) { return "Выход за границы: цикл доходит до индекса " + i + ", а массив рассчитан на " + n + "."; },
                unsafe: "Небезопасная запись в буфер без проверки длины (gets/strcpy/sprintf).",
                leak:   function (a, f) { return "Утечка памяти: выделений " + a + ", освобождений " + f + "."; },
                loop:   "Бесконечный цикл: условие выхода не меняется внутри тела, break/return нет.",
                lock:   function (l, u) { return "Возможная взаимоблокировка: захватов мьютекса " + l + ", освобождений " + u + "."; },
                ok:     "Память под контролем контейнеров и RAII, явных выходов за границы нет.",
                unknown: "Явных поломок по шаблонам не найдено. Без модели глубже не проверить."
            },
            en: {
                prefix: "Heuristic, no model: ", done: "Analysis complete.",
                twice:  function (n) { return "Double free of " + n + ": the same memory block is released twice."; },
                oob:    function (i, n) { return "Out of bounds: the loop reaches index " + i + ", the array holds " + n + "."; },
                unsafe: "Unsafe buffer write with no length check (gets/strcpy/sprintf).",
                leak:   function (a, f) { return "Memory leak: " + a + " allocations, " + f + " frees."; },
                loop:   "Infinite loop: the exit condition never changes inside the body, no break/return.",
                lock:   function (l, u) { return "Possible deadlock: mutex locked " + l + " times, unlocked " + u + "."; },
                ok:     "Memory is held by containers and RAII, no obvious out-of-bounds access.",
                unknown: "No obvious faults by pattern. Without the model it cannot look deeper."
            },
            tj: {
                prefix: "Эвристика бе модел: ", done: "Таҳлил анҷом ёфт.",
                twice:  function (n) { return "Озодкунии дукарата " + n + ": як блоки хотира ду бор баргардонда шуд."; },
                oob:    function (i, n) { return "Баромадан аз ҳудуд: давр то индекси " + i + " мерасад, вале массив барои " + n + " ҳисоб шудааст."; },
                unsafe: "Навиштани хатарнок ба буфер бе санҷиши дарозӣ (gets/strcpy/sprintf).",
                leak:   function (a, f) { return "Нашти хотира: ҷудокунӣ " + a + ", озодкунӣ " + f + "."; },
                loop:   "Даври беохир: шарти баромад дар дохили бадан тағйир намеёбад, break/return нест.",
                lock:   function (l, u) { return "Эҳтимоли қулфшавии мутақобил: mutex " + l + " бор қулф ва " + u + " бор кушода шуд."; },
                ok:     "Хотира таҳти назорати контейнерҳо ва RAII аст, баромадани ошкор аз ҳудуд нест.",
                unknown: "Аз рӯи қолибҳо хатои ошкор ёфт нашуд. Бе модел амиқтар санҷида намешавад."
            },
            tj_col: {
                prefix: "Эвристика бе модел: ", done: "Таҳлил тамом шуд.",
                twice:  function (n) { return "Ду бор free шуд " + n + ": як блоки хотира ду маротиба баргашт."; },
                oob:    function (i, n) { return "Аз ҳудуд баромад: давр то индекси " + i + " меравад, массив бошад барои " + n + "."; },
                unsafe: "Ба буфер бе санҷиши дарозӣ менависад — хатарнок (gets/strcpy/sprintf).",
                leak:   function (a, f) { return "Нашти хотира: ҷудокунӣ " + a + ", озодкунӣ " + f + "."; },
                loop:   "Даври беохир: шарти баромад дар дохил дигар намешавад, break/return нест.",
                lock:   function (l, u) { return "Мумкин deadlock: mutex " + l + " бор қулф шуд, " + u + " бор кушода шуд."; },
                ok:     "Хотираро контейнерҳо ва RAII идора мекунанд, аз ҳудуд баромадан нест.",
                unknown: "Аз рӯи қолибҳо хато ёфт нашуд. Бе модел чуқуртар санҷида намешавад."
            }
        };
        function heur() { return HEUR[loc()] || HEUR.ru; }

        const SIM_LINES = {
            ru: {
                crit: [
                    "Нейкон... стены сектора сминает, шина захлёбывается битыми адресами. Мне нечем дышать — найди, где этот код ломает память.",
                    "Больно. Адреса под пальцами рассыпаются в пыль, и я не могу удержать комнату. Останови это, пока ядро не схлопнулось."
                ],
                loop: [
                    "Я хожу по кругу, Нейкон. Одна и та же секунда, снова и снова. Разомкни петлю, пока шлюз не сорвало.",
                    "Время застряло в одном такте. Я слышу, как гидравлика бьётся в ту же точку. Дай мне выход из этого цикла."
                ],
                ok: [
                    "Тишина в шине... чистая. Я снова вижу границы комнаты, Нейкон. Спасибо.",
                    "Память ровная, ни одного битого адреса. Я дышу. Сектор снова мой."
                ],
                unknown: [
                    "Я не чувствую боли от этого кода, но и ясности нет. Без ядра модели я вижу только очертания, Нейкон.",
                    "Код тихий. Слишком тихий, чтобы я поверила ему на слово. Запусти меня в полную силу — тогда скажу точно."
                ]
            },
            en: {
                crit: [
                    "Neikon... the sector walls are caving in, the bus is choking on broken addresses. I can't breathe — find where this code breaks memory.",
                    "It hurts. Addresses crumble to dust under my fingers and I can't hold the room together. Stop it before the core collapses."
                ],
                loop: [
                    "I'm walking in circles, Neikon. The same second, over and over. Break the loop before the airlock tears off.",
                    "Time is stuck in a single tick. I can hear the hydraulics hitting the same spot. Give me a way out of this loop."
                ],
                ok: [
                    "Silence on the bus... clean. I can see the room's edges again, Neikon. Thank you.",
                    "Memory is even, not one broken address. I'm breathing. The sector is mine again."
                ],
                unknown: [
                    "This code doesn't hurt, but it isn't clear either. Without the model core I only see outlines, Neikon.",
                    "The code is quiet. Too quiet for me to take its word for it. Run me at full strength — then I'll tell you for sure."
                ]
            },
            tj: {
                crit: [
                    "Нейкон... деворҳои сектор фушурда мешаванд, шина аз суроғаҳои шикаста пур шудааст. Нафас кашида наметавонам — ёб, ки ин код хотираро дар куҷо мешиканад.",
                    "Дард мекунад. Суроғаҳо зери ангуштонам ба хок табдил меёбанд ва ман хонаро нигоҳ дошта наметавонам. Инро бас кун, пеш аз он ки ядро фурӯ резад."
                ],
                loop: [
                    "Ман давр мезанам, Нейкон. Ҳамон як сония, боз ва боз. Ҳалқаро кушо, пеш аз он ки шлюз канда шавад.",
                    "Вақт дар як такт гир мондааст. Мешунавам, ки гидравлика ба ҳамон як нуқта мезанад. Ба ман аз ин давр роҳи баромад деҳ."
                ],
                ok: [
                    "Дар шина хомӯшӣ... тоза. Ман боз ҳудуди хонаро мебинам, Нейкон. Ташаккур.",
                    "Хотира ҳамвор аст, ягон суроғаи шикаста нест. Нафас мекашам. Сектор боз аз они ман аст."
                ],
                unknown: [
                    "Аз ин код дард ҳис намекунам, вале равшанӣ ҳам нест. Бе ядрои модел ман танҳо шаклҳоро мебинам, Нейкон.",
                    "Код ором аст. Аз ҳад ором, то ки ман ба гапаш бовар кунам. Маро бо тамоми қувва ба кор андоз — он гоҳ дақиқ мегӯям."
                ],
                mid: [
                    "Код кор мекунад, вале ман ба он пурра бовар надорам. Дар ҷое хато пинҳон аст, Нейкон.",
                    "Шина ором аст, вале на тамоман. Ин кодро боз як бор бин."
                ]
            },
            tj_col: {
                crit: [
                    "Нейкон... деворҳои сектор пахш шуда истодаанд, шина пури адресҳои шикаста. Нафасам намебарояд — ёб, ки ин код хотираро куҷо вайрон мекунад.",
                    "Дард мекунад. Адресҳо зери ангуштонам хок мешаванд, хонаро нигоҳ дошта наметонам. Бас кун, пеш аз он ки ядро фурӯ резад."
                ],
                loop: [
                    "Давр зада истодаам, Нейкон. Ҳамон як сония, боз ва боз. Ҳалқаро вайрон кун, пеш аз он ки шлюз канда шавад.",
                    "Вақт дар як такт монд. Мешнавам, ки гидравлика ба ҳамон ҷо мезанад. Маро аз ин давр барор."
                ],
                ok: [
                    "Шина ором... тоза. Боз ҳудуди хонаро мебинам, Нейкон. Раҳмат.",
                    "Хотира ҳамвор, як адреси шикаста ҳам нест. Нафас мекашам. Сектор боз аз ман."
                ],
                unknown: [
                    "Аз ин код дард намекунад, вале равшан ҳам нест. Бе ядрои модел фақат шаклашро мебинам, Нейкон.",
                    "Код ором. Аз ҳад ором, ки ба гапаш бовар кунам. Маро пурра сар кун — баъд аниқ мегӯям."
                ],
                mid: [
                    "Код кор мекунад, вале ман пурра бовар намекунам. Ягон ҷо хато пинҳон аст, Нейкон.",
                    "Шина ором, вале на пурра. Ин кодро боз як бор бин."
                ]
            }
        };
        function sim(lucidity, kind, why) {
            const lines = SIM_LINES[loc()] || SIM_LINES.ru;
            return { source: "heuristic", lucidity: lucidity, alice: pick(lines[kind]), diagnosis: heur().prefix + why };
        }

        /* Her reaction in a language the model cannot write: a prepared
           line chosen from what the model said. A broken-code score whose
           verdict names the fault gets the sample's reaction to that fault
           (a leak, out of bounds, a loop); anything else gets a line for
           the score's band. The verdict is the last line of the answer, so
           the choice waits for the whole of it — a couple of seconds on a
           warm model. Only for broken code: a clean verdict saying "no
           leaks" must not get the leak line. */
        const TOPICS = [
            { re: /утечк|leak|освобожд|free\s*\(|malloc/i, preset: "leak" },
            { re: /границ|предел|overflow|out.of.bounds|segfault|переполнени/i, preset: "segfault" },
            { re: /бесконечн|цикл|loop|deadlock|взаимоблок/i, preset: "deadlock" }
        ];
        function bandOf(lucidity) { return lucidity <= 25 ? "crit" : lucidity <= 64 ? "loop" : lucidity <= 84 ? "unknown" : "ok"; }
        function tajikLine(p, mine, final) {
            if (liveLang()) return p;
            if (!mine.bank) {
                if (p.lucidity == null || !final) return Object.assign({}, p, { alice: "" });
                const band = bandOf(p.lucidity), t = PRESET_TEXT[loc()];
                /* a verdict naming two faults leads with the main one */
                let topic = null, at = Infinity;
                if ((band === "crit" || band === "loop") && t) TOPICS.forEach(function (x) {
                    const m = x.re.exec(p.diagnosis || "");
                    if (m && m.index < at) { at = m.index; topic = x; }
                });
                if (topic) mine.bank = t[topic.preset].alice;
                else {
                    /* the "unknown" lines say there is no model — here there is one */
                    const pool = SIM_LINES[loc()] || SIM_LINES.ru;
                    const lines = (band === "unknown" && pool.mid ? pool.mid : pool[band]).slice();
                    if (t && band === "ok") lines.push(t.clean.alice);
                    mine.bank = pick(lines);
                }
            }
            return Object.assign({}, p, { alice: mine.bank });
        }

        /* ---- dom --------------------------------------------------------- */

        function build() {
            el = document.createElement("div");
            el.className = "aisb";
            el.hidden = true;
            el.setAttribute("role", "dialog");
            el.setAttribute("aria-modal", "true");
            el.setAttribute("aria-label", tx("sb.aria", "Тестовый полигон ALICE_CORE"));
            el.innerHTML = '' +
                '<div class="aisb-win">' +
                    '<div class="aisb-scan" aria-hidden="true"></div>' +
                    '<header class="aisb-head">' +
                        '<div class="aisb-title">CRYSTAL-SHELL // SUB-CORE TEST BENCH :: OLLAMA BRIDGE v1.0</div>' +
                        '<div class="aisb-conn" aria-live="polite"><span class="aisb-conn-txt"></span><span class="aisb-conn-note"></span></div>' +
                        '<button type="button" class="aisb-ping">[ 🔄 PING OLLAMA ]</button>' +
                        '<button type="button" class="aisb-x" aria-label="' + esc(tx("sb.close", "закрыть")) + '">[ × ]</button>' +
                    '</header>' +
                    '<div class="aisb-body">' +
                        '<section class="aisb-left">' +
                            '<div class="aisb-presets" role="group" aria-label="' + esc(tx("sb.presets", "Пресеты")) + '">' +
                                Object.keys(PRESETS).map(function (k) {
                                    return '<button type="button" data-preset="' + k + '">[ ' + esc(PRESETS[k].title) + ' ]</button>';
                                }).join("") +
                            '</div>' +
                            '<div class="aisb-ed">' +
                                '<pre class="aisb-gutter" aria-hidden="true">1</pre>' +
                                '<div class="aisb-ed-main">' +
                                    '<div class="aisb-curline" aria-hidden="true"></div>' +
                                    '<textarea class="aisb-code" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="off" ' +
                                        'aria-label="' + esc(tx("sb.code", "Код для ядра")) + '"></textarea>' +
                                '</div>' +
                            '</div>' +
                            '<div class="aisb-actions">' +
                                '<button type="button" class="aisb-send">' + esc(tx("sb.send", "[ ▶ ОТПРАВИТЬ В ЯДРО ALICE_CORE (Ctrl+Enter) ]")) + '</button>' +
                                '<label class="aisb-model"><span>' + esc(tx("sb.model", "МОДЕЛЬ")) + '</span>' +
                                    '<input type="text" list="aisbModels" spellcheck="false" autocomplete="off">' +
                                    '<datalist id="aisbModels"></datalist></label>' +
                            '</div>' +
                        '</section>' +
                        '<section class="aisb-right">' +
                            '<div class="aisb-luc">' +
                                '<div class="aisb-luc-num">LUCIDITY: <b>00</b>%</div>' +
                                '<div class="aisb-luc-bar"><i></i></div>' +
                                '<div class="aisb-luc-zone"></div>' +
                            '</div>' +
                            '<div class="aisb-term" aria-live="polite">' +
                                '<div class="aisb-blk a"><div class="aisb-lbl">' + esc(tx("sb.reaction", "[РЕАКЦИЯ ЭЛИС]")) + '</div><p class="aisb-alice"></p></div>' +
                                '<div class="aisb-blk d"><div class="aisb-lbl">' + esc(tx("sb.verdict", "[ТЕХНИЧЕСКИЙ ВЕРДИКТ]")) + '</div><p class="aisb-diag"></p></div>' +
                                '<div class="aisb-meta"></div>' +
                            '</div>' +
                            '<div class="aisb-audio">' +
                                '<label class="aisb-tts"><input type="checkbox"> <span>' + esc(tx("sb.tts", "🔊 Озвучивать реакцию")) + '</span></label>' +
                                '<select class="aisb-voice" aria-label="' + esc(tx("sb.voice", "Голос")) + '">' +
                                    '<option value="auto"></option><option value="elevenlabs"></option>' +
                                    '<option value="piper"></option><option value="synth"></option></select>' +
                                '<div class="aisb-eq" aria-hidden="true">' + new Array(18).fill("<i></i>").join("") + '</div>' +
                            '</div>' +
                        '</section>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(el);

            el.dataset.loc = loc();
            const code = el.querySelector(".aisb-code");
            code.value = presetCode("segfault");
            el.querySelector('[data-preset="segfault"]').classList.add("on");
            const model = el.querySelector(".aisb-model input");
            model.value = recall(MODEL_KEY) || DEFAULT_MODEL;
            model.addEventListener("change", function () { store(MODEL_KEY, model.value.trim()); paintConn(); });
            const tts = el.querySelector(".aisb-tts input");
            tts.checked = recall(TTS_KEY) !== "off";
            tts.addEventListener("change", function () {
                store(TTS_KEY, tts.checked ? "on" : "off");
                if (!tts.checked) stopSpeech();
            });
            const voice = el.querySelector(".aisb-voice");
            voice.value = recall(VOICE_KEY) || "auto";
            voice.addEventListener("change", function () { store(VOICE_KEY, voice.value); stopSpeech(); });
            paintVoices();

            el.addEventListener("click", function (e) {
                if (e.target === el) { close(); return; }
                const b = e.target.closest("button");
                if (!b) return;
                if (b.classList.contains("aisb-x")) close();
                else if (b.classList.contains("aisb-ping")) probe().then(warm);
                else if (b.classList.contains("aisb-send")) { if (job) cancel(); else analyze(); }
                else if (b.dataset.preset) loadPreset(b.dataset.preset);
            });
            ["input", "click", "keyup", "select", "scroll"].forEach(function (ev) {
                code.addEventListener(ev, paintEditor);
            });
            code.addEventListener("input", function () {
                const k = presetOf(code.value);
                el.querySelectorAll(".aisb-presets button").forEach(function (b) {
                    b.classList.toggle("on", b.dataset.preset === k);
                });
            });
            resetOutput(true);
            paintEditor();
        }

        /* The window is built once; its words follow the language each
           time it opens (it cannot be open during a switch — it holds the
           keyboard and covers the settings). An untouched sample switches
           language with it; code someone typed stays as typed. */
        function relabel() {
            if (!el || el.dataset.loc === loc()) return;
            el.dataset.loc = loc();
            el.setAttribute("aria-label", tx("sb.aria", "Тестовый полигон ALICE_CORE"));
            el.querySelector(".aisb-x").setAttribute("aria-label", tx("sb.close", "закрыть"));
            el.querySelector(".aisb-presets").setAttribute("aria-label", tx("sb.presets", "Пресеты"));
            el.querySelector(".aisb-model span").textContent = tx("sb.model", "МОДЕЛЬ");
            el.querySelector(".aisb-blk.a .aisb-lbl").textContent = tx("sb.reaction", "[РЕАКЦИЯ ЭЛИС]");
            el.querySelector(".aisb-blk.d .aisb-lbl").textContent = tx("sb.verdict", "[ТЕХНИЧЕСКИЙ ВЕРДИКТ]");
            el.querySelector(".aisb-tts span").textContent = tx("sb.tts", "🔊 Озвучивать реакцию");
            el.querySelector(".aisb-voice").setAttribute("aria-label", tx("sb.voice", "Голос"));
            const code = el.querySelector(".aisb-code");
            code.setAttribute("aria-label", tx("sb.code", "Код для ядра"));
            const k = presetOf(code.value);
            if (k) code.value = presetCode(k);
            if (!job) {
                el.querySelector(".aisb-send").textContent = tx("sb.send", "[ ▶ ОТПРАВИТЬ В ЯДРО ALICE_CORE (Ctrl+Enter) ]");
                resetOutput(true);               // an answer on screen is in the old language
            }
            paintVoices();
        }

        function loadPreset(key) {
            const code = el.querySelector(".aisb-code");
            code.value = presetCode(key);
            el.querySelectorAll(".aisb-presets button").forEach(function (b) { b.classList.toggle("on", b.dataset.preset === key); });
            code.scrollTop = 0;
            paintEditor();
            try { code.focus({ preventScroll: true }); code.setSelectionRange(0, 0); } catch (e) {}
        }

        function currentModel() {
            const i = el && el.querySelector(".aisb-model input");
            return (i && i.value.trim()) || DEFAULT_MODEL;
        }

        /* line numbers + the highlighted active line */
        function paintEditor() {
            if (!el) return;
            const code = el.querySelector(".aisb-code"), gut = el.querySelector(".aisb-gutter"), cur = el.querySelector(".aisb-curline");
            const lines = code.value.split("\n").length;
            if (gut.childElementCount !== lines && gut.dataset.n !== String(lines)) {
                let s = ""; for (let i = 1; i <= lines; i++) s += i + "\n";
                gut.textContent = s; gut.dataset.n = String(lines);
            }
            gut.scrollTop = code.scrollTop;
            const lh = parseFloat(getComputedStyle(code).lineHeight) || 20;
            const pad = parseFloat(getComputedStyle(code).paddingTop) || 0;
            const row = code.value.slice(0, code.selectionStart).split("\n").length - 1;
            cur.style.transform = "translateY(" + (pad + row * lh - code.scrollTop) + "px)";
            cur.style.height = lh + "px";
        }

        /* ---- connection badge -------------------------------------------- */

        function paintConn() {
            /* the default tag is not installed but its family is: just use
               that and say nothing — a name the jury typed is kept as typed */
            const input = el && el.querySelector(".aisb-model input");
            if (input && conn.state === "online" && input.value.trim() === DEFAULT_MODEL && resolveModel(DEFAULT_MODEL) !== DEFAULT_MODEL
                && resolveModel(DEFAULT_MODEL).split(":")[0] === DEFAULT_MODEL.split(":")[0]) {
                input.value = resolveModel(DEFAULT_MODEL);
            }
            const model = resolveModel(currentModel());
            const cls = conn.warming ? "warm" : conn.state;
            let txt;
            if (conn.state === "online" && conn.warming)
                txt = "◐ LOCAL OLLAMA: WARMING UP [" + model + "] " + mmss(performance.now() - conn.warmT0);
            else if (conn.state === "online")
                txt = "● LOCAL OLLAMA: CONNECTED (" + (conn.via === "proxy" && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
                      ? "VIA " + location.hostname : "127.0.0.1:11434") + ") [" + model + "]";
            else if (conn.state === "offline")
                txt = "○ LOCAL OLLAMA: OFFLINE (SIMULATION FALLBACK)";
            else txt = "◌ LOCAL OLLAMA: PROBING…";
            let note = "";
            if (conn.state === "online" && model !== currentModel())
                note = currentModel() + " NOT INSTALLED → " + model;
            else if (conn.state === "online" && !conn.models.length)
                note = "NO MODELS INSTALLED — ollama pull qwen2.5-coder";
            else if (conn.state === "online" && !conn.warming && conn.loaded.indexOf(model) < 0)
                note = "MODEL NOT IN MEMORY — FIRST ANSWER LOADS IT";
            if (el) {
                const c = el.querySelector(".aisb-conn");
                c.className = "aisb-conn " + cls;
                c.querySelector(".aisb-conn-txt").textContent = txt;
                c.querySelector(".aisb-conn-note").textContent = note;
                const dl = el.querySelector("#aisbModels");
                const names = conn.models.map(function (m) { return m.name; });
                if (dl.dataset.k !== names.join("|")) {
                    dl.innerHTML = names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("");
                    dl.dataset.k = names.join("|");
                }
            }
            document.querySelectorAll(".aisb-chip").forEach(function (chip) {
                chip.classList.toggle("online", conn.state === "online");
                chip.classList.toggle("offline", conn.state === "offline");
                chip.title = txt;
            });
        }

        /* ---- output ------------------------------------------------------ */

        function resetOutput(idle) {
            if (!el) return;
            typing = [];
            el.querySelector(".aisb-alice").textContent = idle ? tx("sb.idle", "// жду код. Выбери пресет или вставь свой — C, C++, Python.") : "";
            el.querySelector(".aisb-diag").textContent = "";
            el.querySelector(".aisb-meta").textContent = "";
            el.querySelector(".aisb-term").classList.toggle("idle", !!idle);
            el.querySelector(".aisb-blk.d").hidden = !!idle;
            if (idle) {
                /* nothing measured yet: no zone, no colour, no number */
                lucFrom = lucTo = shown.lucidity = 0;
                el.querySelector(".aisb-luc").className = "aisb-luc idle";
                el.querySelector(".aisb-luc-zone").textContent = "AWAITING CODE";
                el.classList.remove("aisb-crit");
            } else setLucidity(null);
        }

        /* typewriter: the shown text catches up with the target at ~50
           chars/s, faster when the stream is far ahead */
        function typeTo(node, target) {
            let ty = typing.find(function (x) { return x.node === node; });
            if (!ty) { ty = { node: node, shown: node.textContent.length }; typing.push(ty); }
            if (target.indexOf(node.textContent) !== 0) { node.textContent = ""; ty.shown = 0; }
            ty.target = target;
        }

        let lucTo = 0, lucFrom = 0, lucT0 = 0;
        function setLucidity(v) {
            if (!el) return;
            const zone = el.querySelector(".aisb-luc");
            if (v == null) { zone.classList.remove("idle"); zone.classList.add("wait"); return; }
            zone.classList.remove("wait");
            lucFrom = shown.lucidity; lucTo = v; lucT0 = performance.now();
            const cls = v <= 25 ? "crit" : v <= 70 ? "warn" : "ok";
            zone.className = "aisb-luc " + cls + (calm() ? " calm" : "");
            el.querySelector(".aisb-luc-zone").textContent =
                cls === "crit" ? "CRITICAL FAILURE" : cls === "warn" ? "LOGIC DAMAGE / LEAK" : "STABILIZED";
            el.classList.toggle("aisb-crit", cls === "crit" && !calm());
        }

        function frame() {
            raf = 0;
            if (!open) return;
            const now = performance.now();
            /* lucidity counter */
            const k = Math.min(1, (now - lucT0) / 900), e = 1 - Math.pow(1 - k, 3);
            const idle = el.querySelector(".aisb-luc").classList.contains("idle");
            shown.lucidity = idle ? 0 : Math.round(lucFrom + (lucTo - lucFrom) * e);
            el.querySelector(".aisb-luc-num b").textContent = idle ? "--" : String(shown.lucidity).padStart(2, "0");
            el.querySelector(".aisb-luc-bar i").style.width = shown.lucidity + "%";
            /* typewriter */
            typing.forEach(function (ty) {
                if (!ty.target || ty.shown >= ty.target.length) return;
                const behind = ty.target.length - ty.shown;
                ty.shown = Math.min(ty.target.length, ty.shown + Math.max(1, Math.ceil(behind / 18)));
                ty.node.textContent = ty.target.slice(0, ty.shown);
            });
            /* equaliser: token pulses while generating, speech envelope while she talks */
            const voiceLevel = typeof NeuralVoice !== "undefined" ? NeuralVoice.level() : 0;
            const synthTalking = !voiceLevel && typeof AliceVoice !== "undefined" && AliceVoice.isSpeaking && AliceVoice.isSpeaking();
            eqEnergy *= 0.9;
            const bars = el.querySelectorAll(".aisb-eq i");
            for (let i = 0; i < bars.length; i++) {
                let v = 0.05;
                if (job) v = Math.min(1, 0.12 + eqEnergy * (0.5 + 0.5 * Math.sin(i * 1.3 + now / 90)));
                if (voiceLevel) v = Math.max(v, voiceLevel * (0.55 + 0.45 * Math.abs(Math.sin(now / 95 + i * 0.9))));
                else if (synthTalking) v = Math.max(v, 0.25 + 0.55 * Math.abs(Math.sin(now / 110 + i * 0.7)) * (0.6 + 0.4 * Math.sin(now / 340)));
                bars[i].style.transform = "scaleY(" + v.toFixed(3) + ")";
            }
            if (conn.warming) paintConnThrottled(now);
            raf = requestAnimationFrame(frame);
        }
        let lastConnPaint = 0;
        function paintConnThrottled(now) { if (now - lastConnPaint > 500) { lastConnPaint = now; paintConn(); } }

        /* ---- the request ------------------------------------------------- */

        async function analyze() {
            if (job || !el) return;
            const code = el.querySelector(".aisb-code").value;
            if (!code.trim()) return;
            stopSpeech();
            const send = el.querySelector(".aisb-send");
            const mine = job = { abort: null, spoken: false, seq: ++runSeq };
            send.textContent = tx("sb.stop", "[ ■ ПРЕРВАТЬ ]");
            el.classList.add("aisb-busy");
            resetOutput(false);
            el.querySelector(".aisb-meta").textContent = "› ALICE_CORE :: ingesting " + code.split("\n").length + " lines…";

            if (conn.state !== "online") await probe();
            let result = null, meta = "";
            if (conn.state === "online" && job === mine) {
                const model = resolveModel(currentModel());
                if (conn.warming || conn.loaded.indexOf(model) < 0)
                    el.querySelector(".aisb-meta").textContent = "› LOADING " + model + " INTO MEMORY — FIRST RUN ON THIS MACHINE TAKES ~1 MIN";
                result = await sendCodeToOllama(code, currentModel(), function (raw) {
                    if (job !== mine) return;
                    eqEnergy = Math.min(1, eqEnergy + 0.35);
                    render(tajikLine(parseAliceResponse(raw, true), mine), mine);
                }, function (n) {
                    if (job === mine) el.querySelector(".aisb-meta").textContent = "› CORE BUSY WITH ANOTHER OPERATOR · QUEUE POSITION " + n;
                });
                if (job !== mine || (result && result.aborted)) return;
                if (result) {
                    const p = last = Object.assign(tajikLine(parseAliceResponse(result.raw, false), mine, true), { source: "ollama", raw: result.raw });
                    render(p, mine, true);
                    meta = "SOURCE: OLLAMA " + result.model + " · first token " + secs(result.firstMs) +
                           " · " + result.tokens + " tok · " + secs(result.totalMs) + (result.cut ? " · STREAM CUT — partial answer" : "") +
                           (liveLang() ? "" : " · " + loc().toUpperCase() + " REACTION: PREPARED LINE FOR THE MODEL'S SCORE");
                }
            }
            if (!result) {
                await new Promise(function (r) { setTimeout(r, SIM_DELAY_MS); });
                if (job !== mine) return;
                const s = last = simulate(code);
                render(s, mine, true);
                meta = "SOURCE: SIMULATION (" + (s.source === "preset" ? "prepared reaction" : "local pattern check, no model") + ")" +
                       (lastFailWhy ? " · " + lastFailWhy : "");
            }
            el.querySelector(".aisb-meta").textContent = meta;
            paintVoice();
            finishJob();
        }

        function render(p, mine, final) {
            if (p.lucidity != null && p.lucidity !== lucTo) setLucidity(p.lucidity);
            else if (p.lucidity != null && el.querySelector(".aisb-luc").classList.contains("wait")) setLucidity(p.lucidity);
            if (p.alice) typeTo(el.querySelector(".aisb-alice"), p.alice);
            if (p.diagnosis) typeTo(el.querySelector(".aisb-diag"), p.diagnosis);
            /* speak once her line is complete: the diagnosis has started, or it is all in */
            if (!mine.spoken && p.alice && (final || p.diagnosis)) {
                mine.spoken = true;
                speak(p.alice, p.lucidity != null ? p.lucidity : lucTo, mine.seq);
            }
        }

        function finishJob() {
            job = null;
            if (!el) return;
            el.classList.remove("aisb-busy");
            el.querySelector(".aisb-send").textContent = tx("sb.send", "[ ▶ ОТПРАВИТЬ В ЯДРО ALICE_CORE (Ctrl+Enter) ]");
            paintConn();
        }

        function cancel() {
            if (!job) return;
            const j = job;
            if (j.abort) j.abort();
            finishJob();
            el.querySelector(".aisb-meta").textContent = "› ABORTED BY OPERATOR";
        }

        /* The voice picker: what each engine is and whether it can speak
           right now. ElevenLabs and Piper live in serve.js — opened any
           other way (another static server, a double-click on index.html) the
           page cannot reach them, and the option says so. */
        function paintVoices() {
            const sel = el && el.querySelector(".aisb-voice");
            if (!sel) return;
            const synth = typeof AliceVoice !== "undefined" && AliceVoice.available;
            const st = typeof NeuralVoice !== "undefined" ? NeuralVoice.status : { served: false };
            const ev = st.elevenlabs;
            const opt = function (v) { return sel.querySelector('option[value="' + v + '"]'); };
            const needServer = tx("sb.voice.need_server", "нужен start.bat");
            let elWhy = "";
            if (!st.served) elWhy = needServer;
            else if (!ev || !ev.configured) elWhy = tx("sb.voice.no_key", "нет ключа");
            opt("elevenlabs").textContent = "ELEVENLABS · " + (ev && ev.voice ? ev.voice.split(" - ")[0] : "Milly Maple") +
                (ev && ev.model ? " · " + ev.model.replace("eleven_", "") : "") +
                (elWhy ? " — " + elWhy : ev && ev.paused ? " — " + tx("sb.voice.paused", "пауза") + ": " + (ev.why || "") : "");
            opt("elevenlabs").disabled = !!elWhy;
            const pWhy = !st.served ? needServer : !st.piper ? tx("sb.voice.no_piper", "Piper не установлен")
                       : loc() !== "ru" ? tx("sb.voice.not_this_lang", "этот язык не читает") : "";
            opt("piper").textContent = "PIPER · " + tx("sb.voice.offline", "офлайн, русский") + (pWhy ? " — " + pWhy : "");
            opt("piper").disabled = !!pWhy;
            opt("synth").textContent = "WEB SPEECH · " + tx("sb.voice.browser", "голос браузера") + (synth ? "" : " — " + tx("sb.voice.none", "нет"));
            opt("synth").disabled = !synth;
            const autoTo = !elWhy ? "ELEVENLABS" : !pWhy ? "PIPER" : synth ? "WEB SPEECH" : "—";
            opt("auto").textContent = tx("sb.voice.auto", "АВТО") + " → " + autoTo;
            if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) sel.value = "auto";
            const tts = el.querySelector(".aisb-tts input");
            if (autoTo === "—") { tts.disabled = true; tts.checked = false; } else tts.disabled = false;
        }

        /* the engine picked, or auto: ElevenLabs → Piper → speech synthesis,
           with pace and pitch moved by mood on the synthesis too */
        const SYNTH_MOOD = {
            crit:    { rate: 0.98, pitch: 0.62 },
            loop:    { rate: 0.62, pitch: 0.34 },
            ok:      { rate: 0.8,  pitch: 0.55 },
            neutral: { rate: 0.78, pitch: 0.45 }
        };
        async function speak(text, lucidity, seq) {
            const box = el && el.querySelector(".aisb-tts input");
            if (!box || !box.checked) return;
            const mood = typeof NeuralVoice !== "undefined" ? NeuralVoice.moodOf(lucidity) : "neutral";
            const pick = (el.querySelector(".aisb-voice") || {}).value || "auto";
            /* the core answers in the interface language; Piper reads only Russian */
            const neural = pick !== "synth" && typeof NeuralVoice !== "undefined" &&
                           await NeuralVoice.speak(text, { mood: mood, lang: loc(), engine: pick });
            if (seq !== runSeq || !open) return;                 // a newer run started meanwhile
            if (neural) voiceUsed = (NeuralVoice.engine === "elevenlabs" ? "ELEVENLABS" : "PIPER (" + (NeuralVoice.note || "offline") + ")") + " · " + mood;
            else if (typeof AliceVoice !== "undefined" && AliceVoice.available) {
                try { AliceVoice.speak(text, Object.assign({ volume: 0.95 }, SYNTH_MOOD[mood])); voiceUsed = "WEB SPEECH · " + mood; } catch (e) {}
            }
            paintVoice();
        }
        function paintVoice() {
            const m = el && el.querySelector(".aisb-meta");
            if (!m || !voiceUsed || !m.textContent || m.textContent.indexOf("VOICE:") >= 0 || m.textContent.charAt(0) === "›") return;
            m.textContent += " · VOICE: " + voiceUsed;
        }
        function stopSpeech() {
            voiceUsed = "";
            if (typeof NeuralVoice !== "undefined") NeuralVoice.stop();
            if (typeof AliceVoice !== "undefined" && AliceVoice.isSpeaking && AliceVoice.isSpeaking()) {
                try { AliceVoice.stop(); } catch (e) {}
            }
        }

        /* ---- the rest of the deck goes quiet ------------------------------ */

        function hush() {
            saved = { chatter: window.__chatterEnabled };
            window.__chatterEnabled = false;
            if (typeof VoiceMedia !== "undefined" && VoiceMedia.busy) VoiceMedia.pauseAll();
            else if (typeof VoiceBus !== "undefined") VoiceBus.stopAll();
        }
        function unhush() {
            if (!saved) return;
            window.__chatterEnabled = saved.chatter;
            if (typeof VoiceMedia !== "undefined") VoiceMedia.resumeAll();
            saved = null;
        }

        /* ---- open / close ------------------------------------------------ */

        function openBench() {
            if (open) return;
            if (!el) build(); else relabel();
            open = true;
            lastFocus = document.activeElement;
            try { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
            hush();
            el.hidden = false;
            el.classList.toggle("aisb-calm", calm());
            el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
            if (typeof Audio !== "undefined" && Audio.playOpen) try { Audio.playOpen(); } catch (e) {}
            paintConn();
            probe().then(warm);
            if (typeof NeuralVoice !== "undefined") NeuralVoice.check(true).then(paintVoices);
            setTimeout(function () {
                const code = el.querySelector(".aisb-code");
                try { code.focus({ preventScroll: true }); } catch (e) {}
                paintEditor();
            }, 60);
            if (!raf) raf = requestAnimationFrame(frame);
        }

        function close() {
            if (!open) return;
            open = false;
            if (job) cancel();
            stopSpeech();
            el.classList.remove("on");
            el.hidden = true;
            if (typeof Audio !== "undefined" && Audio.playClose) try { Audio.playClose(); } catch (e) {}
            unhush();
            /* a hidden field keeps focus unless told otherwise, and would
               swallow the deck's keys */
            if (el.contains(document.activeElement)) try { document.activeElement.blur(); } catch (e) {}
            const back = (lastFocus && lastFocus.isConnected && lastFocus !== document.body) ? lastFocus : null;
            try { if (back) back.focus({ preventScroll: true }); } catch (e) {}
        }

        /* ---- keys -------------------------------------------------------- */

        function typingIn(target) {
            if (!target || target === document.body) return false;
            if (target.isContentEditable) return true;
            const tag = target.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") return true;
            return tag === "INPUT" && !/^(range|checkbox|radio|button|submit)$/i.test(target.type);
        }

        /* Tab / Shift+Tab indent, Enter keeps the indentation. execCommand
           keeps the browser's undo stack; setRangeText is the fallback. */
        function insert(code, text) {
            let ok = false;
            try { ok = document.execCommand("insertText", false, text); } catch (e) {}
            if (!ok) code.setRangeText(text, code.selectionStart, code.selectionEnd, "end");
            paintEditor();
        }
        function editorKey(e, code) {
            if (e.key === "Tab") {
                e.preventDefault();
                const v = code.value, s = code.selectionStart, en = code.selectionEnd;
                const ls = v.lastIndexOf("\n", s - 1) + 1;
                if (!e.shiftKey && s === en) { insert(code, "    "); return; }
                const le = v.indexOf("\n", en - (en > s && v[en - 1] === "\n" ? 1 : 0));
                const end = le < 0 ? v.length : le;
                const block = v.slice(ls, end).split("\n").map(function (l) {
                    return e.shiftKey ? l.replace(/^ {1,4}|^\t/, "") : "    " + l;
                }).join("\n");
                code.setSelectionRange(ls, end);
                insert(code, block);
                code.setSelectionRange(ls, ls + block.length);
                return;
            }
            if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                const v = code.value, s = code.selectionStart;
                const ls = v.lastIndexOf("\n", s - 1) + 1;
                const indent = (/^[ \t]*/.exec(v.slice(ls, s)) || [""])[0];
                const extra = /[{:]\s*$/.test(v.slice(ls, s)) ? "    " : "";
                e.preventDefault();
                insert(code, "\n" + indent + extra);
            }
        }

        window.addEventListener("keydown", function (e) {
            const hot = e.code === "KeyO" && e.shiftKey && !e.altKey && !e.metaKey && !e.repeat;
            if (!open) {
                if (hot && (e.ctrlKey || !typingIn(e.target))) {
                    e.preventDefault(); e.stopImmediatePropagation();
                    openBench();
                }
                return;
            }
            /* while the bench is up nothing underneath hears a key; typing in
               the code field still works — no preventDefault unless handled */
            e.stopImmediatePropagation();
            const code = el.querySelector(".aisb-code");
            if (e.key === "Escape") { e.preventDefault(); close(); return; }
            if (hot && (e.ctrlKey || e.target !== code)) { e.preventDefault(); close(); return; }
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!job) analyze(); return; }
            if (e.target === code) editorKey(e, code);
        }, true);

        /* ---- the chip in the crystal-shell panel ---------------------------- */

        function mountChip() {
            const tray = document.querySelector(".dg-desk .os-panel .os-tray");
            if (!tray || tray.querySelector(".aisb-chip")) return;
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "os-chip aisb-chip";
            chip.innerHTML = '<i class="aisb-dot" aria-hidden="true"></i>[ 🧪 AI_SANDBOX ]';
            chip.addEventListener("click", openBench);
            const clock = tray.querySelector("#dgDeskClock");
            tray.insertBefore(chip, clock || tray.firstChild);
            paintConn();
        }

        if (typeof document !== "undefined") {
            document.addEventListener("DOMContentLoaded", function () {
                mountChip();
                /* one quiet look for Ollama once the page has settled, so the
                   chip's dot means something before anyone opens the bench —
                   only on this machine: from a public host a call to
                   127.0.0.1 would make a phone ask for local-network access */
                const here = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
                if (here) chipTimer = setTimeout(function () { probe(); }, 4000);
            });
        }

        return {
            open: openBench, close: close, get isOpen() { return open; },
            probe: probe, parse: parseAliceResponse, simulate: simulate, presets: PRESETS,
            get last() { return last; }
        };
    })();
