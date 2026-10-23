/* ============================================================
   TERMINAL: SHATTERED — backstage: the cost sheet and the access panel
   ------------------------------------------------------------
   1. Смета проекта — 18 months of the author's work priced at developer
      rates, the money actually spent, and the full cost. Shift+B anywhere (except a text field), or from
      the access panel. Slides up like a printout, unlike the video's
      CRT flash; wide on the big screen, full-screen and scrollable on
      a phone. The numbers are in COST below — edit them there.

   2. Служебный доступ — the hidden things in one place, for a phone
      that has no hotkeys: the AI bench, the classroom video, the cost
      sheet, the «Взаперти» archive (locked until found), the QR for
      phones, and the list of hotkeys. Opens from a floating button on
      touch screens, from «⌘ ДОСТУП» in the top bar, or Shift+H / «?».

   Stacking: AI bench 999000 above both, so Shift+O over the sheet
   shows the bench on top; the evidence player stays above all.

   Part 21 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const Backstage = (function () {

        /* ---- the numbers ------------------------------------------------ */
        /* 18 months of the author's own work, ≈ 1 850 h (3–4 h a day after
           work and at weekends), ≈ 29 000 lines → 15–20 lines an hour.
           Labour priced at 90–150 somoni/h (Tajikistan), $20–35 (CIS),
           $60–100 (EU/US). Money actually spent over the 18 months:
           3 600 + 1 800 + 850 + 650 + 394 + 156 = 7 450 somoni. Full cost
           = labour + spend = 173 950 – 284 950 somoni. Dollars at ≈ 10,9
           somoni per $1. A section may carry `total` (the green row) and
           `after` (rows printed under it). */
        const COST = {
            ru: {
                title: "СМЕТА ПРОЕКТА",
                sub: "финансово-экономический расчёт реальных затрат и полной рыночной стоимости за 18 месяцев разработки",
                kpi: [
                    ["18 мес. (1 850 ч)", "авторская разработка (29 000 строк кода, 4 языка)"],
                    ["7 450 сомонӣ ($685)", "фактические личные и накладные расходы за 18 мес."],
                    ["174–285 тыс. сомонӣ", "ПОЛНАЯ СТОИМОСТЬ ПРОЕКТА (труд + все затраты, $16–26 тыс.)"]
                ],
                cols: ["статья", "расчёт", "сумма"],
                sections: [
                    { h: "ЧАСТЬ 1. ОЦЕНКА ВЛОЖЕННОГО ТРУДА РАЗРАБОТЧИКА (18 МЕСЯЦЕВ)", rows: [
                        ["Объём кодовой базы", "≈ 29 000 строк кода (JS, C++, C, Python) + 4 языка", "48 МБ"],
                        ["Средняя выработка чистого кода", "проектирование архитектуры, 3D-математика WebGL, отладка", "15–20 строк / час"],
                        ["Фактическое рабочее время", "18 месяцев (по 3–4 часа ежедневно после работы и в выходные)", "1 850 часов"],
                        ["Оценка труда по ставкам Таджикистана", "90–150 сомонӣ/час ($8,5–14/ч — уровень Middle/Senior)", "166 500 – 277 500 сомонӣ ($15,3–25,5 тыс.)"],
                        ["Оценка труда по ставкам СНГ", "$20–35 за час разработки", "$37 000 – $64 750"],
                        ["Оценка труда по ставкам ЕС / США", "$60–100 за час разработки", "$111 000 – $185 000"]
                    ], total: ["Итого стоимость авторского труда (Таджикистан)", "1 850 человеко-часов", "166 500 – 277 500 сомонӣ ($15,3–25,5 тыс.)"] },
                    { h: "ЧАСТЬ 2. ФАКТИЧЕСКИЕ ДЕНЕЖНЫЕ И НАКЛАДНЫЕ РАСХОДЫ ЗА 18 МЕСЯЦЕВ", rows: [
                        ["Интернет и связь (18 мес.)", "тариф провайдера 200 сомонӣ/мес. × 18 месяцев", "3 600 сомонӣ ($330)"],
                        ["Амортизация оборудования (18 мес.)", "износ рабочего ноутбука и периферии (100 сомонӣ/мес.)", "1 800 сомонӣ ($165)"],
                        ["Электроэнергия (1 850 часов работы)", "питание рабочей станции, монитора и сети по тарифу РТ", "850 сомонӣ ($78)"],
                        ["Акустический синтез и обработка звука", "лицензионный голосовой пакет (4 языка) + локальный Piper TTS", "650 сомонӣ ($60)"],
                        ["Полиграфия, картриджи и документация", "печать тиража буклетов (4 языка), стикеров, актов, папок", "394 сомонӣ ($36)"],
                        ["Государственная регистрация авторских прав", "официальная госпошлина Минкультуры РТ (Свидетельство № 410)", "156 сомонӣ ($14)"],
                        ["Движок 3D, сервер и локальный ИИ", "свой код WebGL 1.0 (1 762 строки), открытая модель Ollama + Qwen", "0 сомонӣ ($0)"]
                    ], total: ["Итого фактических расходов автора за 18 мес.", "оплачено из личных средств разработчика", "7 450 сомонӣ ($685)"] },
                    { h: "ОБЩИЙ ИТОГОВЫЙ РЕЗУЛЬТАТ СМЕТЫ", rows: [],
                      total: ["ПОЛНАЯ ИТОГОВАЯ СЕБЕСТОИМОСТЬ ПРОЕКТА (ТРУД + РАСХОДЫ ЗА 18 МЕС.)", "166,5–277,5 тыс. + 7 450 сомонӣ", "173 950 – 284 950 сомонӣ ($16,0–26,2 тыс.)"],
                      after: [
                        ["СТОИМОСТЬ ВНЕДРЕНИЯ И ЭКСПЛУАТАЦИИ ДЛЯ ШКОЛЫ РТ", "работает 100% офлайн на существующих школьных ПК", "0 сомонӣ / в год"]
                    ] },
                    { h: "Что сделано", rows: [
                        ["Код", "≈ 29 000 строк: JS, CSS, HTML, сервер", ""],
                        ["3D-движок", "WebGL 1.0 с нуля, без библиотек", "1 762 строки"],
                        ["Языки", "русский, английский, таджикский — литературный и разговорный", "4"],
                        ["Озвучка", "интро, слайды, тест, экстра; субтитры — автоматически", "7,3 мин"],
                        ["ИИ в игре", "локальный полигон: модель разбирает код, Элис отвечает голосом", ""],
                        ["Апробация", "гимназия им. Б. Гафурова, 8 «В» класс", "видео 2:55"]
                    ] },
                    { h: "Сэкономлено устройством проекта", cols: ["вместо", "обычно стоит", "у нас"], rows: [
                        ["Движок Unity / Three.js", "лицензия, сборка 10–30 МБ", "0 сомонӣ · 0,4 МБ"],
                        ["Дикторы в студии", "7 600–24 000 сомонӣ", "650 сомонӣ"],
                        ["Композитор и звукорежиссёр", "3 300–16 400 сомонӣ", "0 сомонӣ"],
                        ["3D-художник и текстуры", "11–55 тыс. сомонӣ", "0 сомонӣ"],
                        ["Облачный ИИ", "оплата за запрос, нужен интернет", "0 сомонӣ, офлайн"],
                        ["Сервер", "55–220 сомонӣ в месяц", "0 сомонӣ"]
                    ], total: ["Годовая экономия 1 компьютерного класса", "на облачных подписках", "38 000 – 75 000 сомонӣ в год"] },
                    { h: "ЭТАП 2. ПЛАН МАСШТАБИРОВАНИЯ ПРОЕКТА (РАСШИРЕНИЕ КОМАНДЫ)", rows: [
                        ["Переход к командной разработке (CrystalCore Studio)", "расширение штата до 3–4 специалистов (художник, моделлер, сценарист, инженер)", "рост темпа в 4 раза"],
                        ["Прогнозный бюджет продакшена полной версии", "оплата труда команды, студийные ассеты, слоты локализации (×3–4 к базе)", "25 000 – 35 000 сомонӣ ($2,3–3,2 тыс.)"],
                        ["Двухконтурная модель релиза (B2C + B2G)", "1) Экспортный релиз в Steam (привлечение внешней выручки) · 2) Внедрение в школы и вузы РТ", "100% самоокупаемость"]
                    ] },
                    { h: "ЧАСТЬ 3. КОММЕРЧЕСКАЯ МОДЕЛЬ И МАСШТАБИРОВАНИЕ (CRYSTALCORE STUDIO)", rows: [
                        ["Расширение штата разработки", "команда 3–4 специалиста (3D-художник, левел-дизайн, сценарист, QA)", "рост бюджета ×3–4 (рабочие места в РТ)"],
                        ["Релиз в Steam (международный рынок)", "Episode 0 — бесплатно (воронка); сюжетные эпизоды — $4.99 ($2.79 / 30 сомонӣ в СНГ)", "экспортная валютная выручка"],
                        ["Лицензия для школ и лицеев РТ (B2B/B2G)", "Пробный модуль — 0 сомонӣ; полная лицензия на комп. класс (25 ПК) — 1 500 сомонӣ/год", "в 30 раз дешевле зарубежных аналогов"],
                        ["Эксплуатационные затраты школы на ИИ", "работает 100% офлайн на базе локального ядра (без оплаты внешних API и трафика)", "0 сомонӣ на внешние серверы"]
                    ] }
                ],
                notes: [
                    "Пересчёт в доллары — по курсу ≈ 10,9 сомонӣ за $1.",
                    "Ставки — ориентир по рынку, не бухгалтерский расчёт."
                ],
                close: "[ × ЗАКРЫТЬ ]", aria: "Смета проекта"
            },
            en: {
                title: "PROJECT COST SHEET",
                sub: "financial and economic estimate of real costs and full market value over 18 months of development",
                kpi: [
                    ["18 months (1,850 h)", "original development (29,000 lines of code, 4 languages)"],
                    ["7,450 somoni ($685)", "actual personal and overhead costs over 18 months"],
                    ["174–285k somoni", "FULL PROJECT VALUE (labour + all costs, $16–26k)"]
                ],
                cols: ["item", "basis", "amount"],
                sections: [
                    { h: "PART 1. VALUE OF THE DEVELOPER'S LABOUR (18 MONTHS)", rows: [
                        ["Code base", "≈ 29,000 lines of code (JS, C++, C, Python) + 4 languages", "48 MB"],
                        ["Average output of clean code", "architecture design, WebGL 3D maths, debugging", "15–20 lines / hour"],
                        ["Actual working time", "18 months (3–4 hours a day after work and at weekends)", "1,850 hours"],
                        ["Labour at Tajikistan rates", "90–150 somoni/hour ($8.5–14/h — Middle/Senior level)", "166,500 – 277,500 somoni ($15.3–25.5k)"],
                        ["Labour at CIS rates", "$20–35 per hour of development", "$37,000 – $64,750"],
                        ["Labour at EU / US rates", "$60–100 per hour of development", "$111,000 – $185,000"]
                    ], total: ["Total value of the author's labour (Tajikistan)", "1,850 person-hours", "166,500 – 277,500 somoni ($15.3–25.5k)"] },
                    { h: "PART 2. ACTUAL MONEY AND OVERHEAD COSTS OVER 18 MONTHS", rows: [
                        ["Internet and phone (18 months)", "provider plan 200 somoni/month × 18 months", "3,600 somoni ($330)"],
                        ["Equipment depreciation (18 months)", "wear of the work laptop and peripherals (100 somoni/month)", "1,800 somoni ($165)"],
                        ["Electricity (1,850 working hours)", "workstation, monitor and network at the RT tariff", "850 somoni ($78)"],
                        ["Voice synthesis and audio processing", "licensed voice package (4 languages) + local Piper TTS", "650 somoni ($60)"],
                        ["Printing, cartridges and paperwork", "booklets (4 languages), stickers, certificates, folders", "394 somoni ($36)"],
                        ["State copyright registration", "official fee, Ministry of Culture of RT (Certificate No. 410)", "156 somoni ($14)"],
                        ["3D engine, server and local AI", "own WebGL 1.0 code (1,762 lines), open Ollama + Qwen model", "0 somoni ($0)"]
                    ], total: ["Total actual costs over 18 months", "paid from the developer's own funds", "7,450 somoni ($685)"] },
                    { h: "OVERALL RESULT OF THE ESTIMATE", rows: [],
                      total: ["FULL PROJECT COST (LABOUR + COSTS OVER 18 MONTHS)", "166.5–277.5k + 7,450 somoni", "173,950 – 284,950 somoni ($16.0–26.2k)"],
                      after: [
                        ["COST OF ROLL-OUT AND OPERATION FOR A SCHOOL IN RT", "runs 100% offline on existing school PCs", "0 somoni / year"]
                    ] },
                    { h: "What is built", rows: [
                        ["Code", "≈ 29,000 lines: JS, CSS, HTML, server", ""],
                        ["3D engine", "WebGL 1.0 from scratch, no libraries", "1,762 lines"],
                        ["Languages", "Russian, English, Tajik — literary and colloquial", "4"],
                        ["Voice", "intro, slides, test, extra; subtitles aligned automatically", "7.3 min"],
                        ["AI in the game", "local bench: the model reads code, Alice answers aloud", ""],
                        ["Classroom trial", "B. Gafurov gymnasium, grade 8 \"V\"", "video 2:55"]
                    ] },
                    { h: "Saved by how the project is built", cols: ["instead of", "usually costs", "here"], rows: [
                        ["Unity / Three.js engine", "licence, 10–30 MB build", "0 somoni · 0.4 MB"],
                        ["Studio voice actors", "7,600–24,000 somoni", "650 somoni"],
                        ["Composer and sound designer", "3,300–16,400 somoni", "0 somoni"],
                        ["3D artist and textures", "11–55k somoni", "0 somoni"],
                        ["Cloud AI", "pay per request, needs internet", "0 somoni, offline"],
                        ["Server", "55–220 somoni a month", "0 somoni"]
                    ], total: ["Yearly saving for one computer class", "on cloud subscriptions", "38,000 – 75,000 somoni a year"] },
                    { h: "STAGE 2. SCALING PLAN (GROWING THE TEAM)", rows: [
                        ["Move to team development (CrystalCore Studio)", "staff grows to 3–4 specialists (artist, modeller, writer, engineer)", "4× faster pace"],
                        ["Projected production budget of the full version", "team pay, studio assets, localisation slots (×3–4 the base)", "25,000 – 35,000 somoni ($2.3–3.2k)"],
                        ["Two-track release model (B2C + B2G)", "1) Export release on Steam (outside revenue) · 2) Roll-out in schools and universities of RT", "100% self-funding"]
                    ] },
                    { h: "PART 3. COMMERCIAL MODEL AND SCALING (CRYSTALCORE STUDIO)", rows: [
                        ["Growing the development team", "a team of 3–4 specialists (3D artist, level design, writer, QA)", "budget grows ×3–4 (jobs in RT)"],
                        ["Steam release (international market)", "Episode 0 — free (funnel); story episodes — $4.99 ($2.79 / 30 somoni in the CIS)", "export revenue in foreign currency"],
                        ["Licence for RT schools and lyceums (B2B/B2G)", "trial module — 0 somoni; full licence per computer class (25 PCs) — 1,500 somoni/year", "30 times cheaper than foreign equivalents"],
                        ["School operating costs for the AI", "runs 100% offline on the local core (no paid external APIs or traffic)", "0 somoni on external servers"]
                    ] }
                ],
                notes: [
                    "Dollar amounts at ≈ 10.9 somoni per $1.",
                    "Rates are a market guide, not an accounting statement."
                ],
                close: "[ × CLOSE ]", aria: "Project cost sheet"
            },
            tj: {
                title: "СМЕТАИ ЛОИҲА",
                sub: "ҳисоби молиявию иқтисодии хароҷоти воқеӣ ва арзиши пурраи бозорӣ дар 18 моҳи таҳия",
                kpi: [
                    ["18 моҳ (1 850 соат)", "таҳияи муаллифӣ (29 000 сатри код, 4 забон)"],
                    ["7 450 сомонӣ ($685)", "хароҷоти воқеии шахсӣ ва иловагӣ дар 18 моҳ"],
                    ["174–285 ҳаз. сомонӣ", "АРЗИШИ ПУРРАИ ЛОИҲА (меҳнат + ҳамаи хароҷот, $16–26 ҳаз.)"]
                ],
                cols: ["модда", "ҳисоб", "маблағ"],
                sections: [
                    { h: "ҚИСМИ 1. АРЗЁБИИ МЕҲНАТИ БАРНОМАСОЗ (18 МОҲ)", rows: [
                        ["Ҳаҷми коди барнома", "≈ 29 000 сатри код (JS, C++, C, Python) + 4 забон", "48 МБ"],
                        ["Ҳосилнокии миёнаи коди тоза", "тарҳрезии меъморӣ, математикаи 3D-и WebGL, ислоҳи хатоҳо", "15–20 сатр / соат"],
                        ["Вақти воқеии корӣ", "18 моҳ (ҳар рӯз 3–4 соат баъди кор ва дар рӯзҳои истироҳат)", "1 850 соат"],
                        ["Арзиши меҳнат бо нархи Тоҷикистон", "90–150 сомонӣ/соат ($8,5–14/соат — сатҳи Middle/Senior)", "166 500 – 277 500 сомонӣ ($15,3–25,5 ҳаз.)"],
                        ["Арзиши меҳнат бо нархи ИДМ", "$20–35 барои як соати таҳия", "$37 000 – $64 750"],
                        ["Арзиши меҳнат бо нархи ИА / ИМА", "$60–100 барои як соати таҳия", "$111 000 – $185 000"]
                    ], total: ["Ҳамагӣ арзиши меҳнати муаллиф (Тоҷикистон)", "1 850 одам-соат", "166 500 – 277 500 сомонӣ ($15,3–25,5 ҳаз.)"] },
                    { h: "ҚИСМИ 2. ХАРОҶОТИ ВОҚЕИИ ПУЛӢ ВА ИЛОВАГӢ ДАР 18 МОҲ", rows: [
                        ["Интернет ва алоқа (18 моҳ)", "тарифи провайдер 200 сомонӣ/моҳ × 18 моҳ", "3 600 сомонӣ ($330)"],
                        ["Истеҳлоки таҷҳизот (18 моҳ)", "фарсудашавии ноутбуки корӣ ва дастгоҳҳои канорӣ (100 сомонӣ/моҳ)", "1 800 сомонӣ ($165)"],
                        ["Нерӯи барқ (1 850 соати кор)", "барқи истгоҳи корӣ, монитор ва шабака бо тарифи ҶТ", "850 сомонӣ ($78)"],
                        ["Синтези овоз ва коркарди садо", "бастаи овозии литсензионӣ (4 забон) + Piper TTS-и маҳаллӣ", "650 сомонӣ ($60)"],
                        ["Чоп, картриҷҳо ва ҳуҷҷатгузорӣ", "чопи буклетҳо (4 забон), стикерҳо, санадҳо, ҷузвдонҳо", "394 сомонӣ ($36)"],
                        ["Бақайдгирии давлатии ҳуқуқи муаллиф", "боҷи расмии Вазорати фарҳанги ҶТ (Шаҳодатномаи № 410)", "156 сомонӣ ($14)"],
                        ["Муҳаррики 3D, сервер ва СИ-и маҳаллӣ", "коди худ WebGL 1.0 (1 762 сатр), модели кушодаи Ollama + Qwen", "0 сомонӣ ($0)"]
                    ], total: ["Ҳамагӣ хароҷоти воқеии муаллиф дар 18 моҳ", "аз ҳисоби маблағи шахсии барномасоз пардохт шуд", "7 450 сомонӣ ($685)"] },
                    { h: "НАТИҶАИ УМУМИИ СМЕТА", rows: [],
                      total: ["АРЗИШИ ПУРРАИ ЛОИҲА (МЕҲНАТ + ХАРОҶОТ ДАР 18 МОҲ)", "166,5–277,5 ҳаз. + 7 450 сомонӣ", "173 950 – 284 950 сомонӣ ($16,0–26,2 ҳаз.)"],
                      after: [
                        ["АРЗИШИ ТАТБИҚ ВА ИСТИФОДА БАРОИ МАКТАБИ ҶТ", "100% офлайн дар компютерҳои мавҷудаи мактаб кор мекунад", "0 сомонӣ / сол"]
                    ] },
                    { h: "Чӣ сохта шуд", rows: [
                        ["Код", "≈ 29 000 сатр: JS, CSS, HTML, сервер", ""],
                        ["Муҳаррики 3D", "WebGL 1.0 аз сифр, бе китобхонаҳо", "1 762 сатр"],
                        ["Забонҳо", "русӣ, англисӣ, тоҷикӣ — адабӣ ва гуфтугӯӣ", "4"],
                        ["Садогузорӣ", "интро, слайдҳо, санҷиш, экстра; субтитрҳо — худкор", "7,3 дақ"],
                        ["СИ дар бозӣ", "полигони маҳаллӣ: модел кодро таҳлил мекунад, Элис бо овоз ҷавоб медиҳад", ""],
                        ["Озмоиш", "гимназияи ба номи Б. Ғафуров, синфи 8 «В»", "видео 2:55"]
                    ] },
                    { h: "Аз ҳисоби сохтори лоиҳа сарфа шуд", cols: ["ба ҷои", "одатан арзиш дорад", "дар мо"], rows: [
                        ["Муҳаррики Unity / Three.js", "литсензия, сохтаи 10–30 МБ", "0 сомонӣ · 0,4 МБ"],
                        ["Дикторҳо дар студия", "7 600–24 000 сомонӣ", "650 сомонӣ"],
                        ["Оҳангсоз ва садорежиссёр", "3 300–16 400 сомонӣ", "0 сомонӣ"],
                        ["Рассоми 3D ва текстураҳо", "11–55 ҳаз. сомонӣ", "0 сомонӣ"],
                        ["СИ-и абрӣ", "пардохт барои ҳар дархост, интернет лозим", "0 сомонӣ, офлайн"],
                        ["Сервер", "55–220 сомонӣ дар як моҳ", "0 сомонӣ"]
                    ], total: ["Сарфаи солонаи як синфи компютерӣ", "дар обунаҳои абрӣ", "38 000 – 75 000 сомонӣ дар як сол"] },
                    { h: "МАРҲИЛАИ 2. НАҚШАИ ВУСЪАТИ ЛОИҲА (ВАСЕЪ КАРДАНИ ДАСТА)", rows: [
                        ["Гузариш ба таҳияи дастаҷамъӣ (CrystalCore Studio)", "васеъ кардани ҳайат то 3–4 мутахассис (рассом, моделсоз, сенариянавис, муҳандис)", "суръат 4 баробар меафзояд"],
                        ["Буҷети пешбинишудаи истеҳсоли версияи пурра", "музди меҳнати даста, ассетҳои студиявӣ, ҷойҳои локализатсия (×3–4 нисбат ба база)", "25 000 – 35 000 сомонӣ ($2,3–3,2 ҳаз.)"],
                        ["Модели дуконтураи релиз (B2C + B2G)", "1) Релизи содиротӣ дар Steam (ҷалби даромади беруна) · 2) Татбиқ дар мактабҳо ва донишгоҳҳои ҶТ", "100% худтаъминкунӣ"]
                    ] },
                    { h: "ҚИСМИ 3. МОДЕЛИ ТИҶОРАТӢ ВА ВУСЪАТ (CRYSTALCORE STUDIO)", rows: [
                        ["Васеъ кардани ҳайати таҳия", "дастаи 3–4 мутахассис (рассоми 3D, тарроҳи сатҳҳо, сенариянавис, QA)", "буҷет ×3–4 меафзояд (ҷойҳои корӣ дар ҶТ)"],
                        ["Релиз дар Steam (бозори байналмилалӣ)", "Episode 0 — ройгон (барои ҷалби бозингарон); эпизодҳои сюжетӣ — $4.99 ($2.79 / 30 сомонӣ дар ИДМ)", "даромади асъории содиротӣ"],
                        ["Литсензия барои мактабҳо ва литсейҳои ҶТ (B2B/B2G)", "модули озмоишӣ — 0 сомонӣ; литсензияи пурра барои синфи компютерӣ (25 компютер) — 1 500 сомонӣ/сол", "30 маротиба арзонтар аз аналогҳои хориҷӣ"],
                        ["Хароҷоти истифодаи СИ дар мактаб", "100% офлайн дар асоси ядрои маҳаллӣ кор мекунад (бе пардохти API-ҳои беруна ва трафик)", "0 сомонӣ барои серверҳои беруна"]
                    ] }
                ],
                notes: [
                    "Ба доллар бо қурби ≈ 10,9 сомонӣ барои $1 гузаронида шуд.",
                    "Нархҳо — тахминӣ аз рӯи бозор, на ҳисоби муҳосибӣ."
                ],
                close: "[ × ПӮШИДАН ]", aria: "Сметаи лоиҳа"
            }
        };

        let cs = null, csOpen = false, bs = null, bsOpen = false;
        let lastFocus = null, savedChatter = null;

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
        function loc() {
            const l = (typeof settingsState !== "undefined" && settingsState.locale) || "ru";
            return l === "tj_col" ? "tj" : l;
        }
        function quiet(on) {
            if (on) { if (savedChatter === null) { savedChatter = window.__chatterEnabled; window.__chatterEnabled = false; } }
            else if (savedChatter !== null && !csOpen && !bsOpen) { window.__chatterEnabled = savedChatter; savedChatter = null; }
        }
        function remember() { if (!csOpen && !bsOpen) lastFocus = document.activeElement; }
        function giveBack() {
            if (csOpen || bsOpen) return;
            const back = lastFocus && lastFocus.isConnected && lastFocus !== document.body ? lastFocus : null;
            try { if (back) back.focus({ preventScroll: true }); else if (document.activeElement) document.activeElement.blur(); } catch (e) {}
        }

        /* ---- 1. the cost sheet ------------------------------------------ */

        function costHtml(d) {
            const table = function (sec) {
                const cols = sec.cols || d.cols;
                const row = function (r, cls) {
                    return '<tr' + (cls ? ' class="' + cls + '"' : "") + '><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) +
                           '</td><td class="n">' + esc(r[2]) + '</td></tr>';
                };
                return '<section class="cs-sec"><h3>' + esc(sec.h) + '</h3><table><thead><tr><th>' + esc(cols[0]) + '</th><th>' + esc(cols[1]) +
                       '</th><th class="n">' + esc(cols[2]) + '</th></tr></thead><tbody>' + sec.rows.map(function (r) { return row(r); }).join("") +
                       (sec.total ? row(sec.total, "total") : "") +
                       (sec.after || []).map(function (r) { return row(r); }).join("") + '</tbody></table></section>';
            };
            return '' +
                '<div class="cs-paper">' +
                    '<header class="cs-head">' +
                        '<div><div class="cs-title">' + esc(d.title) + ' <span>// TERMINAL: SHATTERED · EP. 0</span></div>' +
                        '<div class="cs-sub">' + esc(d.sub) + '</div></div>' +
                        '<button type="button" class="cs-x">' + esc(d.close) + '</button>' +
                    '</header>' +
                    '<div class="cs-scroll" tabindex="-1">' +
                        '<div class="cs-kpi">' + d.kpi.map(function (k) {
                            return '<div><b>' + esc(k[0]) + '</b><span>' + esc(k[1]) + '</span></div>';
                        }).join("") + '</div>' +
                        d.sections.map(table).join("") +
                        '<footer class="cs-notes">' + d.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join("") + '</footer>' +
                    '</div>' +
                '</div>';
        }

        function openCost() {
            if (csOpen) return;
            closePanel(true);
            remember();
            const d = COST[loc()] || COST.ru;
            if (!cs) {
                cs = document.createElement("div");
                cs.className = "cs";
                cs.setAttribute("role", "dialog");
                cs.setAttribute("aria-modal", "true");
                cs.addEventListener("click", function (e) {
                    if (e.target === cs || e.target.closest(".cs-x")) closeCost();
                });
                document.body.appendChild(cs);
            }
            cs.setAttribute("aria-label", d.aria);
            cs.innerHTML = costHtml(d);                    // rebuilt on every open: follows the language
            cs.hidden = false;
            cs.classList.toggle("cs-calm", calm());
            cs.classList.remove("on", "off"); void cs.offsetWidth; cs.classList.add("on");
            csOpen = true;
            quiet(true);
            if (typeof Audio !== "undefined" && Audio.playOpen) try { Audio.playOpen(); } catch (e) {}
            /* focus the scroll area: arrows, PgUp/PgDn and Space scroll it */
            setTimeout(function () { try { cs.querySelector(".cs-scroll").focus({ preventScroll: true }); } catch (e) {} }, 50);
        }

        function closeCost() {
            if (!csOpen) return;
            csOpen = false;
            cs.classList.remove("on");
            cs.classList.add("off");
            if (typeof Audio !== "undefined" && Audio.playClose) try { Audio.playClose(); } catch (e) {}
            setTimeout(function () { if (!csOpen) { cs.hidden = true; cs.classList.remove("off"); } }, calm() ? 120 : 380);
            quiet(false);
            giveBack();
        }

        /* ---- 2. the access panel ---------------------------------------- */

        function touch() {
            return (window.matchMedia && (matchMedia("(hover: none)").matches || matchMedia("(max-width: 820px)").matches));
        }
        function secretFound() { try { return localStorage.getItem("ts.secret.locked") === "1"; } catch (e) { return false; } }

        function tile(id, icon, title, desc, key, disabled) {
            return '<button type="button" class="bs-tile' + (disabled ? " locked" : "") + '" data-bs="' + id + '"' + (disabled ? ' aria-disabled="true"' : "") + '>' +
                   '<span class="bs-ico" aria-hidden="true">' + icon + '</span>' +
                   '<span class="bs-txt"><b>' + esc(title) + '</b><small>' + esc(desc) + '</small></span>' +
                   (key && !touch() ? '<kbd>' + esc(key) + '</kbd>' : "") + '</button>';
        }

        function panelHtml() {
            const phone = touch();
            const found = secretFound();
            return '' +
                '<div class="bs-box">' +
                    '<header class="bs-head"><div class="bs-title">' + esc(tx("bs.title", "СЛУЖЕБНЫЙ ДОСТУП")) + '</div>' +
                    '<button type="button" class="bs-x">' + esc(tx("bs.close", "[ × ]")) + '</button></header>' +
                    '<p class="bs-lead">' + esc(tx("bs.lead", "Скрытые функции презентации — здесь, раз на телефоне нет горячих клавиш.")) + '</p>' +
                    '<div class="bs-grid">' +
                        tile("sandbox", "🧪", tx("bs.sandbox", "Полигон ALICE_CORE"),
                             phone ? tx("bs.sandbox.phone", "ИИ ноутбука докладчика разбирает ваш код; без него — симуляция")
                                   : tx("bs.sandbox.desc", "локальный ИИ разбирает код, Элис отвечает голосом"), "Shift+O") +
                        tile("video", "📹", tx("bs.video", "Видео апробации"), tx("bs.video.desc", "гимназия им. Б. Гафурова, 8 «В» класс"), "Shift+V") +
                        tile("cost", "📊", tx("bs.cost", "Смета проекта"), tx("bs.cost.desc", "что потрачено и сколько это стоит на рынке"), "Shift+B") +
                        tile("secret", found ? "🔓" : "🔒",
                             found ? tx("bs.secret", "Архив: «Взаперти»") : tx("bs.secret.locked", "Архив: запись повреждена"),
                             found ? tx("bs.secret.desc", "восстановленная запись — проиграть снова")
                                   : tx("bs.secret.hint", "подсказка: ALICE_CORE × 3"), "", !found) +
                        (phone ? "" : tile("qr", "▦", tx("bs.qr", "QR для телефонов"), tx("bs.qr.desc", "ссылка на демку в этой Wi-Fi сети — на весь экран"), "")) +
                    '</div>' +
                    (phone ? "" :
                    '<div class="bs-keys"><div class="bs-keys-h">' + esc(tx("bs.keys", "Горячие клавиши")) + '</div><dl>' +
                        '<dt>Shift+O</dt><dd>' + esc(tx("bs.sandbox", "Полигон ALICE_CORE")) + '</dd>' +
                        '<dt>Shift+V</dt><dd>' + esc(tx("bs.video", "Видео апробации")) + '</dd>' +
                        '<dt>Shift+B</dt><dd>' + esc(tx("bs.cost", "Смета проекта")) + '</dd>' +
                        '<dt>Shift+H</dt><dd>' + esc(tx("bs.title", "СЛУЖЕБНЫЙ ДОСТУП")) + '</dd>' +
                        '<dt>Esc</dt><dd>' + esc(tx("bs.k.esc", "закрыть окно")) + '</dd>' +
                        '<dt>← →</dt><dd>' + esc(tx("bs.k.slides", "слайды")) + '</dd>' +
                    '</dl></div>') +
                '</div>';
        }

        function openPanel() {
            if (bsOpen) return;
            remember();
            if (!bs) {
                bs = document.createElement("div");
                bs.className = "bs";
                bs.setAttribute("role", "dialog");
                bs.setAttribute("aria-modal", "true");
                bs.addEventListener("click", function (e) {
                    if (e.target === bs || e.target.closest(".bs-x")) { closePanel(); return; }
                    const b = e.target.closest(".bs-tile");
                    if (b) run(b);
                });
                document.body.appendChild(bs);
            }
            bs.setAttribute("aria-label", tx("bs.title", "Служебный доступ"));
            bs.innerHTML = panelHtml();
            bs.hidden = false;
            bs.classList.toggle("bs-calm", calm());
            bs.classList.remove("on"); void bs.offsetWidth; bs.classList.add("on");
            bsOpen = true;
            quiet(true);
            if (typeof Audio !== "undefined" && Audio.playOpen) try { Audio.playOpen(); } catch (e) {}
            setTimeout(function () { try { bs.querySelector(".bs-tile").focus({ preventScroll: true }); } catch (e) {} }, 50);
        }

        function closePanel(silent) {
            if (!bsOpen) return;
            bsOpen = false;
            bs.hidden = true;
            bs.classList.remove("on");
            if (!silent && typeof Audio !== "undefined" && Audio.playClose) try { Audio.playClose(); } catch (e) {}
            quiet(false);
            if (!silent) giveBack();
        }

        function run(b) {
            const id = b.dataset.bs;
            if (b.classList.contains("locked")) {
                b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
                return;
            }
            closePanel(true);
            if (id === "sandbox" && typeof AiSandbox !== "undefined") AiSandbox.open();
            else if (id === "video" && typeof Evidence !== "undefined") Evidence.open();
            else if (id === "cost") openCost();
            else if (id === "secret" && typeof VoiceExtras !== "undefined") VoiceExtras.fireSecret("panel");
            else if (id === "qr") window.open("qr", "_blank", "noopener");
        }

        /* ---- the floating button and the top-bar entry ------------------- */

        function mount() {
            if (!document.querySelector(".bs-fab")) {
                const fab = document.createElement("button");
                fab.type = "button";
                fab.className = "bs-fab";
                fab.setAttribute("aria-label", tx("bs.title", "Служебный доступ"));
                fab.setAttribute("data-i18n-aria", "bs.title");     // applyLocale keeps it current
                fab.innerHTML = '<span aria-hidden="true">⌘</span><i data-i18n="bs.fab">' + esc(tx("bs.fab", "ДОСТУП")) + '</i>';
                fab.addEventListener("click", function () { if (bsOpen) closePanel(); else openPanel(); });
                document.body.appendChild(fab);
            }
            const right = document.querySelector(".topbar .right");
            if (right && !right.querySelector(".bs-chip")) {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "bs-chip";
                /* just the sign: the top bar is full at 1024 px, and the
                   keyboard has Shift+H anyway — this is for the mouse */
                chip.textContent = "⌘";
                chip.title = tx("bs.title", "Служебный доступ") + " · Shift+H";
                chip.setAttribute("aria-label", tx("bs.title", "Служебный доступ"));
                chip.setAttribute("data-i18n-aria", "bs.title");
                chip.addEventListener("click", openPanel);
                right.appendChild(document.createTextNode("  |  "));
                right.appendChild(chip);
            }
        }

        /* ---- keys -------------------------------------------------------- */

        function typingIn(target) {
            if (!target || target === document.body) return false;
            if (target.isContentEditable) return true;
            const tag = target.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") return true;
            return tag === "INPUT" && !/^(range|checkbox|radio|button|submit)$/i.test(target.type);
        }

        window.addEventListener("keydown", function (e) {
            const plain = e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && !e.repeat;
            const costKey = plain && e.code === "KeyB";
            const panelKey = (plain && e.code === "KeyH") || (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey);
            if (csOpen) {
                /* nothing underneath hears a key — the arrows would turn the
                   slides behind the sheet; here they scroll the sheet itself */
                e.stopImmediatePropagation();
                if (e.key === "Escape" || costKey) { e.preventDefault(); closeCost(); return; }
                const box = cs.querySelector(".cs-scroll"), page = box.clientHeight * 0.85;
                const by = { ArrowDown: 60, ArrowUp: -60, PageDown: page, PageUp: -page, " ": e.shiftKey ? -page : page,
                             Home: -box.scrollHeight, End: box.scrollHeight }[e.key];
                if (by && !(e.target && e.target.tagName === "BUTTON" && e.key === " ")) {
                    e.preventDefault();
                    box.scrollBy({ top: by, behavior: calm() ? "auto" : "smooth" });
                }
                return;
            }
            if (bsOpen) {
                e.stopImmediatePropagation();
                if (e.key === "Escape" || panelKey) { e.preventDefault(); closePanel(); }
                return;
            }
            if (typingIn(e.target)) return;
            if (costKey) { e.preventDefault(); e.stopImmediatePropagation(); openCost(); }
            else if (panelKey) { e.preventDefault(); e.stopImmediatePropagation(); openPanel(); }
        }, true);

        if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", mount);

        return {
            openCost: openCost, closeCost: closeCost, openPanel: openPanel, closePanel: closePanel,
            get costOpen() { return csOpen; }, get panelOpen() { return bsOpen; }
        };
    })();
