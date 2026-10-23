# Стили (styles.css, styles-media.css) — справочник

> Файлы: `styles.css` (5755 строк), `styles-media.css` (1208 строк) · Подключение: `index.html` строки 7–11,
> до всех скриптов; `styles.css` блокирует первую отрисовку, `styles-media.css` грузится неблокирующе.
> Связанные страницы: [deck.md](deck.md), [ui.md](ui.md), [demo.md](demo.md), [void-scene.md](void-scene.md),
> [void-os.md](void-os.md), [voice.md](voice.md), [audio.md](audio.md), [../ARCHITECTURE.md](../ARCHITECTURE.md)

## Коротко

Весь внешний вид проекта — два файла CSS без препроцессора, без сборки и без веб-шрифтов.
`styles.css` рисует всё, что видно до первого клика и во время показа: заглушку загрузки, титульное
меню, CRT-оболочку презентации (шапка, меню слайдов, сцена слайда, канал Элис), призраков, чек-лист
жюри, демо-оверлей VoidOS (3D-сцена, загрузка ОС, рабочий стол, редактор задач) и всю мобильную
адаптацию. `styles-media.css` — слои, которые появляются только по действию пользователя: интро для
жюри (`.ji`), плеер записи урока (`.ev`), тест голосового тракта (`.vt`), секрет «Взаперти» (`.sx`),
полигон ИИ (`.aisb`), смета (`.cs`) и служебная панель (`.bs`). Большая часть разметки создаётся
скриптами; CSS только реагирует на классы, которые эти скрипты ставят и снимают.

## Как это работает

### Порядок подключения

```
<link rel="stylesheet" href="styles.css">                                      ← блокирует paint
<link rel="stylesheet" href="styles-media.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="styles-media.css"></noscript>
```

1. `styles.css` грузится обычным образом: без него первый кадр (заглушка загрузки и титульное меню)
   нельзя показать.
2. `styles-media.css` подключается с `media="print"`, поэтому браузер скачивает его с низким
   приоритетом и не ждёт его перед отрисовкой; `onload` переключает `media` на `all`. Заголовочный
   комментарий файла ([styles-media.css:12](../../styles-media.css#L12)) объясняет: ничего из этого
   файла не видно до первого клика, на медленном канале меню появляется примерно на 4 КБ раньше.
3. `<noscript>` подключает его обычным способом, если скрипты выключены (тогда `onload` не сработает).

### Каскад состояний

CSS почти не содержит логики «сам по себе». Каждое состояние — класс или атрибут, который ставит JS:

```
<body class="booting">                      ← index.html; снимает transitionToTerminal() (11-settings.js)
  .loading-overlay  .active/.glitching/.dying   ← startNewGame()/runLoadingSequence() (11-settings.js)
  .bootscreen       .gone                       ← transitionToTerminal()
  .boot-popup-back  .open, .boot-popup.wide     ← openPopup()/closePopup() (11-settings.js)
  .boot-overload    .on                         ← transitionToTerminal()
  .shell            (статичная сетка)
     button.slide-btn.active                    ← renderSlide() (07-deck.js)
     #slideSub/#slideBody .swap-anim            ← renderSlide()
     section.alice.expanded                     ← MobileUX.setupAlice() (13-mobile.js)
  .demo-game        .open/.at-desk/.shake/...   ← DemoGame (06-demo.js)
     .dg-stage.on, [data-stage]                 ← gotoStage()
  aside.jury[data-collapsed]                    ← JuryChecklist.setOpen() (12-jury.js)
  .ji / .ev / .vt / .sx-* / .aisb / .cs / .bs   ← создаются скриптами 16, 17, 18, 20, 21
body.no-vignette / .epilepsy-safe / .big-font   ← applySettings() (11-settings.js)
body.kb-open + --kb на :root                    ← MobileUX.trackKeyboard() (13-mobile.js)
```

### Три способа, которыми JS влияет на стили

| Способ | Где | Пример |
|---|---|---|
| Класс на элементе | почти везде | `elRoot.classList.add("open")` в `DemoGame.open()` |
| Пользовательское свойство | 4 места, `style.setProperty` | `--crt-line`, `--kb`, `--lid`, `--vt-level` |
| Инлайн-стиль | ширины полос, позиции призраков, `body.style.filter` | `fill.style.width = p + "%"` в `runLoadingSequence()` |

Свойства `--end` (полосы EdTech) и `--h` (столбики `.os-spark`) задаются не скриптом, а инлайн-атрибутом
`style` в разметке слайдов и `index.html`.

## Пользовательские свойства

### Палитра `:root` ([styles.css:6–38](../../styles.css#L6))

| Свойство | Значение | Что задаёт | Кто меняет |
|---|---|---|---|
| `--bg-void` | `#030000` | фон страницы (`html, body`), цвет текста на активных кнопках | никто |
| `--bg-panel` | `#0a0202` | фон панелей: шапка, меню, сцена, Элис, панель жюри | никто |
| `--bg-deep` | `#060101` | фон вложенных блоков: `.codeblock`, `.statcard`, `.ascii`, `.contrast .pane` | никто |
| `--blood` | `#ff3333` | основной красный: текст, рамки, свечение | никто |
| `--blood-dim` | `#a01818` | приглушённый красный: неактивные кнопки, начало градиентов полос | никто |
| `--blood-soft` | `#5a0d0d` | тёмно-красные рамки панелей | никто |
| `--ash` | `#7a3535` | второстепенный текст, подписи, метки | никто |
| `--bone` | `#f6ecec` | основной светлый текст | никто |
| `--warn` | `#ffc46b` | `em` в тексте слайда, предупреждения в логах | никто |
| `--good` | `#6effb3` | «ок», решённые задачи, отмеченные пункты жюри | никто |
| `--ghost` | `rgba(255,51,51,.35)` | объявлено, но нигде не читается (`var(--ghost)` в коде нет) | никто |
| `--crt-line` | `rgba(255,51,51,.035)` | цвет строки развёртки в `body::before` и в `.demo-game .dg-scanlines` | `applySettings()` ([11-settings.js:57](../../js/core/11-settings.js#L57)): `on` → 0.035, `dim` → 0.015, `off` → 0 |

Вторичная палитра ([styles.css:20–37](../../styles.css#L20)). Комментарий: студенты жаловались, что
сплошной красный «выглядит анемично»; холодные акценты разбивают монотонность, но используются скупо,
чтобы красный оставался главным. Смысловое назначение из комментария: голубой — система и офлайн,
янтарный — предупреждения и legacy, «слизь» — живой код, сливовый — ИИ и голос Элис.

| Свойство | Значение | Свойство | Значение |
|---|---|---|---|
| `--cyan` | `#5be7ff` | `--slime` | `#b6ff63` |
| `--cyan-dim` | `#2a7d92` | `--slime-dim` | `#5a8a2a` |
| `--cyan-soft` | `rgba(91,231,255,.18)` | `--slime-soft` | `rgba(182,255,99,.16)` |
| `--plum` | `#b890ff` | `--amber` | `#ffc46b` |
| `--plum-dim` | `#7752c0` | `--amber-dim` | `#8a5a1a` |
| `--plum-soft` | `rgba(184,144,255,.18)` | `--amber-soft` | `rgba(255,196,107,.16)` |

Схема у всех четырёх одинаковая: `--X` — текст и свечение, `--X-dim` — рамка, `--X-soft` — подложка
градиента. Пары используются тон-классами `.tone-cyan/.tone-plum/.tone-slime/.tone-amber`
(`.statcard`, `.edtech .kpi .cell`, `.edtech .bars .bar`). `--amber` совпадает с `--warn` по значению,
это два имени одного цвета.

Ни одно свойство палитры JS не меняет. Слайды в `js/presentation/02-slides.js` читают их через
инлайн-`style="color:var(--warn)"` и подобные, `index.html` — через `style="color:var(--blood)"`.

### Мобильный слой `:root` ([styles.css:4011–4017](../../styles.css#L4011))

| Свойство | По умолчанию | Что задаёт | Кто пишет |
|---|---|---|---|
| `--kb` | `0px` | высота экранной клавиатуры. `.demo-game .dg-stage { bottom: var(--kb) }` поднимает все стадии демо над клавиатурой | `trackKeyboard()` в [13-mobile.js:34](../../js/core/13-mobile.js#L34): `innerHeight − (visualViewport.height + offsetTop)`, если больше 120 px, иначе 0; заодно ставит `body.kb-open` |
| `--safe-t` | `env(safe-area-inset-top, 0px)` | отступ от выреза экрана сверху | никто (вычисляет браузер) |
| `--safe-b` | `env(safe-area-inset-bottom, 0px)` | то же снизу | никто |
| `--safe-l` | `env(safe-area-inset-left, 0px)` | то же слева | никто |
| `--safe-r` | `env(safe-area-inset-right, 0px)` | то же справа | никто |

Комментарий на [styles.css:4005](../../styles.css#L4005) говорит, что `--kb` пишет `main.js`. Такого
файла больше нет; пишет `MobileUX` в `js/core/13-mobile.js`.

`env()` в `<meta viewport>` без `viewport-fit=cover` возвращает нули, поэтому на iPhone с вырезом
`--safe-*` фактически равны `0px` (по коду `index.html:6` видно, что `viewport-fit` не задан).

### Локальные свойства компонентов

| Свойство | Где объявлено | Что задаёт | Кто пишет |
|---|---|---|---|
| `--lid` | `.demo-game .dg-void-lids` ([styles.css:4758](../../styles.css#L4758)), 0 | раскрытие век: высота каждого `.lid` = `calc(52% − var(--lid) * 52%)`; 0 — закрыты, 1 — открыты | `06-demo.js`: [1743](../../js/demo/06-demo.js#L1743) `"0"`, [1770](../../js/demo/06-demo.js#L1770) `String(open)` во время моргания, [1809](../../js/demo/06-demo.js#L1809) `"1"`, [1884](../../js/demo/06-demo.js#L1884) `"0.0"` |
| `--end` | не объявлено, fallback `30%` в `bar-grow` | конечная ширина полосы `.edtech .bars .bar .track .fill` | инлайн `style="--end:72%"` в `02-slides.js` (6 полос × 4 локали) |
| `--h` | не объявлено, fallback `50%` | высота столбика `.os-spark i` | инлайн `style="--h:38%"` в `index.html:378` |
| `--vt-level` | не объявлено, fallback `0` | уровень сигнала 0..1: заливка и свечение ползунка громкости голоса в `.slider-wrap.vt-live` | `VoiceExtras` в [18-voice-extras.js:123](../../js/core/18-voice-extras.js#L123) (`setProperty`), снимает [:88](../../js/core/18-voice-extras.js#L88) (`removeProperty`) |
| `--ji-n` | `.ji`, `#ffc46b` | цвет Нейкона в интро: реплики, цитата, табличка «чай», бейдж, эквалайзер | никто |
| `--ji-a` | `.ji`, `#5be7ff` | цвет Элис в интро: реплики, кнопка входа, эквалайзер | никто |
| `--ji-red` | `.ji`, `#ff3333` | индикатор REC, рамка тревоги, полоса утечки | никто |
| `--ji-teal` | `.ji`, `rgba(126,207,196,.9)` | рамки узлов шины, рамка тревоги после «моста» | никто |
| `--ev-teal` | `.ev`, `rgba(126,207,196,.85)` | рамка кадра, надписи плеера | никто |
| `--ev-w` | `.ev`, `min(96vw, calc((100vh − 118px) * 16 / 9))` | ширина экрана плеера: 16:9, вписанные в окно с местом под панель управления | переопределяется в `@media (max-aspect-ratio: 1/1)` (9:16) и `(max-width: 820px)` (`96vw`) |
| `--sb-cyan` | `.aisb`, `#00f0ff` | акцент полигона: кнопка отправки, курсор, «ок» | никто |
| `--sb-amber` | `.aisb`, `#ffc46b` | заголовок, пресеты, «предупреждение» | никто |
| `--sb-line` | `.aisb`, `rgba(0,240,255,.22)` | разделители колонок и рамки панелей полигона | никто |

Медиа-слои объявляют свои свойства на корневом элементе слоя, а не на `:root`: слой создаётся
скриптом целиком и уносит палитру с собой, а `styles-media.css` может прийти позже `styles.css`.

## Анимации (@keyframes)

Столбец «Статус»: `жива` — анимация реально проигрывается; `мёртвая` — селектор, который её
запускает, не совпадает ни с одним элементом или класс никто не ставит (проверено grep по `js/`,
`index.html`, `studio.html`); `перекрыта` — правило есть, но его побеждает другое.

### Оболочка презентации (styles.css)

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `scan-drift` | `background-position` 0 → 120px, строки развёртки ползут вниз, 7 s linear | `body::before` | жива; `body.epilepsy-safe::before` её снимает |
| `crt-flicker` | `opacity` 1 → 0.92..0.97 короткими провалами, `steps(40)`, 5.4 s | `body::after` (виньетка) | жива; `body.no-vignette::after` снимает |
| `pulse` | `opacity` и `scale` 1 → 0.3/0.7 | `.topbar .dot` (1.4 s), `.alice-head .label .heart` (1 s) | жива |
| `bar-jitter` | `translateY` и `opacity` полоски у края меню, `steps(8)` | `nav.menu::after` | жива (на телефоне скрыта) |
| `active-glitch` | `box-shadow` голубой/пурпурный раскол в последних 4 % цикла 6 s | `button.slide-btn.active` | жива |
| `blink` | `opacity` 1 ↔ 0, `steps(2)` | `.menu-foot .blink`, `.alice-input .fake-caret` | жива |
| `caret` | цвет `border-right` — мигающий курсор | `.typer` (заголовок слайда во время печати, `animateTitle()` в 07-deck.js) | жива |
| `swap-in` | `opacity`, `translateY(6px)`, `blur(2px)` → ноль, 0.32 s | `.swap-anim` на `#slideSub`/`#slideBody` (`renderSlide()`) | жива |
| `text-glitch` | сдвиг ±2px и цветной `text-shadow`, `steps(20)` | `.alice-line.glitch .name/.msg` (`pushAliceLine()` в 09-alice-stream.js) | жива |

### Титульный экран и загрузка

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `rain-fall` | капля `translateY(-20vh → 120vh)` с появлением и угасанием | `.boot-rain span`; 28 капель строит `buildRain()` в 09-alice-stream.js, каждой задаёт свою `animationDuration` 2.5–6 s и отрицательный `animationDelay` | жива |
| `crystal-float` | покачивание кристалла ±2° и ±2 % по высоте, 6 s | `.boot-crystal` | жива (скрыт ≤900px) |
| `boot-fade-in` | `opacity 0→1`, `translateY(8px→0)` | `.boot-supratitle/.boot-title/.boot-subtitle` (задержки 0.2/0.4/0.7 s), `.boot-menu li` (0.9–1.3 s по `nth-child`), `.boot-brand` (1.4 s), `.boot-status`/`.boot-version` (0.1 s), `.boot-popup-back` (0.25 s) | жива |
| `pulse-dot` | `opacity` 0.55 ↔ 1 | `.boot-status .dot` | жива |
| `load-shake` | дрожание ±1px, 0.06 s `steps(2)` | `.loading-overlay.glitching` (ставит `panic()` в 11-settings.js) | жива |
| `load-die` | рост `contrast`/`brightness`, `blur`, `scale` до 1.14 и угасание, 0.9 s | `.loading-overlay.dying` (через 1.3 s после `panic()`) | жива |
| `load-line-glitch` | `translateX`/`skewX` строки лога | `.load-log .line.glitch` | мёртвая: `addLine()` вызывается только с `ok`/`warn`/`err` |

### Призраки

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `ghost-flash` | вспышка до 0.28 с рваным `clip-path`, 950 ms `steps(14)` | базовый `.glitch-ghost` | перекрыта: единственный создаваемый призрак — `glitch-ghost memory sketch` (`spawnGhost()` в 11-settings.js:723), а `.glitch-ghost.memory` задаёт свою анимацию |
| `ghost-memory` | выход из размытия 22px → 0 → обратно в размытие, пик `opacity` 0.28, 2400 ms | `.glitch-ghost.memory` | жива; `animationend` удаляет элемент |
| `ghost-memory-edge` | `opacity` контурного слоя | `.glitch-ghost.memory::before` | мёртвая: у `.sketch` псевдоэлементы `display:none`, других вариантов призрака скрипты не создают |

### Виджеты слайдов

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `bar-grow` | `width: 0 → var(--end, 30%)`, 1.4 s | `.edtech .bars .bar .track .fill` | жива |
| `demo-shake` | дрожание ±1px | `.demo-console.running/.crashed .demo-out`, `.playground.running/.crashed .pg-out` | мёртвая (см. «Мёртвый CSS») |
| `pg-pulse` | `opacity` точки статуса | `.playground.running .pg-status .dot` | мёртвая |
| `voice-bar` | высота столбика VU 3 → 14px | `.playground.speaking .voice-vu span` | мёртвая |

### Демо-оверлей: каркас и старый текстовый режим

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `dg-fadein` | `opacity` и `blur(8px)` → 0, 0.4 s | `.demo-game.open` | жива |
| `dg-stagein` | `opacity`, `translateY(8px)` | `.demo-game .dg-stage.on` | жива |
| `dg-load` | ширина полосы 0 → 38 → 42 → 100 %, 2.2 s | `.dg-boot .dg-loadbar i` | жива |
| `dg-lnin` | появление строки загрузки | `.dg-boot-lines .ln` (строки строит `runBootSequence()`) | жива |
| `dg-term-breathe` | пульс `box-shadow` терминала | `.demo-game .dg-terminal`, `.demo-game.speaking .dg-terminal` | мёртвая: `.dg-terminal` в разметке нет |
| `dg-glitch-line` | сдвиг и `hue-rotate` строки | `.dg-screen .ln.glitch` | мёртвая |
| `dg-cursor-blink` | `opacity` полоски у поля ввода | `.dg-prompt::after` | мёртвая |
| `dg-pulse` | пульс числа FEAR | `.dg-stat.fear.high .val` | мёртвая |
| `dg-ghost-flash` | вспышка ASCII-призрака до 0.95, 1.4 s `steps(20)` | `.demo-game .dg-ghost` (`spawnGhost()` в 06-demo.js:2238 кладёт `<pre>` в `.dg-desk` или в корень) | жива |
| `dg-shake` | тряска ±6px, 0.5 s | `.demo-game.shake .dg-scene` | класс ставит `shake()` (06-demo.js:2231), но `.dg-scene` в разметке нет — эффекта не видно |
| `dg-shake-hard` | тряска ±10px с поворотом, 0.7 s | `.demo-game.shake-hard .dg-scene` | то же |
| `dg-speak-shimmer` | сливовое мерцание рамки | `.demo-game.speaking .dg-terminal` | класс `speaking` ставит `speakAsAlice()` (06-demo.js:3378), цели нет |
| `dg-ed-fail` | красная вспышка `box-shadow`, 0.45 s × 2 | `.dg-editor.failed` (06-demo.js:3222, снимается через 900 ms) | жива |
| `dg-ed-flash` | зелёная вспышка, 0.6 s × 2 | `.dg-editor.solved` (06-demo.js:3330) | жива |
| `dg-fear-pulse` | внутреннее красное свечение комнаты | `.demo-game.fearpulse .dg-room` | мёртвая: `fearpulse` только снимается (06-demo.js:1511, 1669), `.dg-room` нет |
| `dg-fear-jitter` | дрожание 1–1.5px `translate3d` | `.demo-game.fearbreach .dg-terminal/.dg-editor` | мёртвая: `fearbreach` только снимается |
| `dg-fear-shimmer` | `hue-rotate`/`saturate` | то же | мёртвая |
| `dg-input-glitch` | сдвиг поля ввода | `.dg-input.glitched` | мёртвая |
| `dg-ed-possess` | `hue-rotate`/`invert` редактора, 0.24 s | `.dg-editor.possessed` | мёртвая: `flashEditorGlitch()` (06-demo.js:1681) нигде не вызывается |
| `dg-end-flash` | фон корня мигает тёмно-красным, 0.9 s × 3 | `.demo-game.bad-ending` | перекрыта: `playBadEndingScare()` ставит `bad-ending` и `fear-100` одновременно, у обоих правил специфичность (0,2,0), `.fear-100` стоит ниже в файле и забирает `animation` |
| `dg-end-title-shake` | `translate`+`skew` заголовка концовки, `steps(2)` бесконечно | `.demo-game.bad-ending .dg-end h2` | жива |
| `dg-fear-100` | фон: тёмный → белый → чёрный → тёмно-красный, 0.6 s `steps(8)` | `.demo-game.fear-100` | жива |

### Демо-оверлей: 3D-сцена, загрузка ОС, рабочий стол

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `dg-void-urge` | янтарное свечение компаса | `.dg-void-compass.urge` (06-demo.js:1796) | жива; снимается `prefers-reduced-motion` |
| `dg-void-use` | пульс свечения кнопки «включить» | `.dg-void-use.on` | жива; снимается `prefers-reduced-motion` |
| `dg-os-in` | `opacity 0→1` фазы | `.dg-os-phase.on` | жива |
| `dg-os-line` | строка ядра выезжает слева | `.dg-os-kernel .kl` | жива |
| `dg-os-shard` | мерцание граней логотипа | `.dg-os-splash .os-shard` (SVG в index.html) | жива; снимается `prefers-reduced-motion` |
| `dg-os-spin` | вращение пунктирного кольца, 9 s | `.dg-os-splash .os-ring` | то же |
| `dg-os-wave` | высота столбиков 22 ↔ 92 % | `.dg-os-shell .os-wave i` | то же |
| `os-win-in` | появление окна `scale(0.97)` | `.demo-game .os-window`; у `.dragging` — `none` | жива |
| `dg-cry` | `scale`/`translateY` крика Элис, 0.42 s × 3 | `.dg-void-sub.cry` (06-demo.js:3083) | жива |

В [styles.css:5581](../../styles.css#L5581) `.demo-game .sys-row i.loop` ссылается на
`animation: desk-loop`, но `@keyframes desk-loop` нигде нет: статус двери `LOOPING` в окне «Система»
(класс `loop` ставит `renderSystem()` в 06-demo.js:2567) не мигает.

### Медиа-слои (styles-media.css)

| Имя | Что анимирует | Где используется | Статус |
|---|---|---|---|
| `ji-flicker` | провал `opacity` до 0.86 раз в 7 s | `.ji-noise` | жива; снимается `.ji-calm` и `prefers-reduced-motion` |
| `ji-blink` | `opacity` 0.15 на половине цикла | `.ji-rec i`, `.ji-line .caret`, `.ev-rec i`, `.ev-cta-icon` | жива; общая для интро и плеера |
| `ji-cut` | монтажная склейка: сдвиг, `skewX`, `hue-rotate`, рваный `clip-path`, 0.42 s | `.ji.ji-cut .ji-stage` (переход между актами, `nextAct()`) | жива; в спокойном режиме класс не ставится |
| `ji-wire` | бегущий блик по проводу шины | `.ji-bridge.on .wire i` | жива |
| `ji-needle` | дрожание стрелки манометра −32° ↔ −30° | `.ji.ji-push .ji-gauge .needle` | жива |
| `ji-hl` | подсветка константы `1.1f` | `.ji.ji-push .ji-code .hl` | жива |
| `ji-neon` | неоновое свечение кнопки входа | `.ji-enter` | жива |
| `ev-bg-in` / `ev-bg-out` | затемнение фона плеера | `.ev.ev-on` / `.ev.ev-off` | жива |
| `ev-flash` | белая вспышка 0.5 → 0 | `.ev.ev-on::after` | жива; снимается `.ev-calm` |
| `ev-crt-on` | включение кинескопа: точка → линия → кадр | `.ev.ev-on .ev-screen` | жива |
| `ev-crt-off` | выключение: кадр → линия → точка | `.ev.ev-off .ev-screen` | жива |
| `sx-flash` | два пика `opacity` за 0.5 s со сдвигом | `.sx-flash` | жива |
| `sx-fade` | одно плавное появление | `.sx-flash.sx-calm` | жива |
| `aisb-in` | `opacity` и `scale(0.975)` | `.aisb.on .aisb-win`, `.bs.on .bs-box` | жива |
| `aisb-jitter` | сдвиг полосы ясности, без смены яркости | `.aisb-luc.crit:not(.calm) .aisb-luc-bar i` | жива |
| `aisb-wait` | мигание числа ясности | `.aisb-luc.wait .aisb-luc-num b` | жива |
| `aisb-pulse` | мигание точки статуса | `.aisb-dot` | жива; `body.epilepsy-safe` снимает |
| `cs-dim` | затемнение фона сметы | `.cs.on` | жива |
| `cs-feed` | лист выезжает снизу, 0.55 s | `.cs.on .cs-paper` | жива |
| `cs-out` | лист уезжает вниз | `.cs.off .cs-paper` | жива |
| `cs-row` | разделы «печатаются» по очереди с задержками 0.3–0.92 s | `.cs.on .cs-kpi`, `.cs.on .cs-sec:nth-of-type(1..6)` | жива |
| `bs-nope` | покачивание заблокированной плитки | `.bs-tile.nope` (21-backstage.js:370) | жива |

## Компоненты

Порядок разделов повторяет порядок в файлах. Для каждого блока: строки, кто создаёт разметку, какие
классы переключает JS.

### CRT-рамка: развёртка и виньетка ([styles.css:53–103](../../styles.css#L53))

- `body::before` — строки развёртки: `repeating-linear-gradient` с шагом 4px цвета `--crt-line`,
  `mix-blend-mode: screen`, `z-index: 9000`, анимация `scan-drift`.
- `body::after` — виньетка (радиальный градиент к чёрному по краям) плюс слабые красные полосы сверху и
  снизу, `z-index: 9001`, анимация `crt-flicker`.
- Оба `position: fixed; inset: 0; pointer-events: none` — клики проходят насквозь.
- `body.booting::before/::after { opacity: 0 }` ([:669](../../styles.css#L669)) прячет их, пока на
  экране титульное меню: оно должно выглядеть чистым. `transitionToTerminal()` снимает `booting`,
  эффекты проявляются за 0.6 s.

### Сетка оболочки `.shell` ([:106–118](../../styles.css#L106))

`position: fixed; inset: 0`, CSS Grid 2×3: строки `36px 1fr 150px`, колонки `320px 1fr`, области
`top / menu main / alice alice`, `z-index: 10`. Разметка статичная (`index.html:132–195`).
При `max-width: 900px` ([:650](../../styles.css#L650)) сетка становится одной колонкой из четырёх строк,
при `≤820px` её перестраивает мобильный слой.

### Шапка `.topbar` ([:121–155](../../styles.css#L121))

Строка с `.tag` (мигающая `.dot`, анимация `pulse`) и `.right` (аптайм, целостность, канал).
В `.right` скрипт 21-backstage.js (`mount()`) дописывает кнопку `.bs-chip`. На телефоне шапка
переносится в две строки, в альбомной ориентации телефона (`max-height: 480px`) скрыта.

### Меню слайдов `nav.menu` и `button.slide-btn` ([:158–274](../../styles.css#L158))

- `nav.menu::before` — надпись `[ NAV_CORE :: v0.3.1-broken ]` из CSS `content`; `::after` — дрожащая
  полоса `bar-jitter`.
- `button.slide-btn` сбрасывает стили через `all: unset`, рисует префикс `//` в `::before`.
  Активную кнопку отмечает `renderSlide()` ([07-deck.js:28](../../js/presentation/07-deck.js#L28)):
  `classList.toggle("active", idx === i)`. Активная — красная заливка, префикс `>>`, `active-glitch`.
- `.menu-foot` со статусами и `.blink`.
- На телефоне меню превращается в горизонтальную ленту «чипов» со `scroll-snap`; `::before/::after`
  и `.menu-foot` скрыты. Активный чип в видимую часть прокручивает `setupNavStrip()` (13-mobile.js).

### Сцена слайда `main.stage` и содержимое слайдов ([:277–537](../../styles.css#L277), [:1582–2413](../../styles.css#L1582))

Каркас статичен (`index.html:167–179`): `.breadcrumb .here`, `h1.slide-title` с `.index`,
`.subtitle`, `.divider`, `.body-text`. Тело слайда — HTML-строка из `SLIDES` (02-slides.js), его
вставляет `renderSlide()`. Классы, которые встречаются в разметке слайдов:

| Блок | Строки | Назначение |
|---|---|---|
| `.body-text p/strong/em/ul li/code` | 344–391 | базовая типографика; `li::before` рисует `└─` |
| `.codeblock` | 393–405 | моноширинный блок с пунктирной рамкой |
| `.statgrid`, `.statcard .lbl/.val/.unit`, `.tone-*` | 408–470 | ряд из 4 карточек с цифрами; ≤1100px — 2 колонки |
| `.callout`, `.callout.green`, `.callout.amber` | 473–485 | выноска с цветной левой рамкой |
| `.timeline`, `.tl-step`, `.tl-tag` | 488–517 | вертикальная шкала с точками |
| `.typer` | 519–528 | курсор при печати заголовка; ставит и снимает `animateTitle()` (07-deck.js:113, 126) |
| `.swap-anim` | 531–537 | появление подзаголовка и тела; `renderSlide()` снимает класс, форсирует reflow (`offsetWidth`) и ставит снова, чтобы анимация перезапустилась |
| `.ascii`, `.ascii.blood/.cyan` (+`.lbl`) | 1620–1648 | ASCII-иллюстрации; `white-space: pre`, на телефоне прокручиваются внутри себя |
| `details.spk`, `.spk-body` | 1653–1683 | свёрнутые заметки докладчика, маркер `[ + ]`/`[ - ]` |
| `.contrast .pane.old/.new` | 1686–1732 | «старый путь / наш путь» в две колонки |
| `.edtech .kpi .cell .lbl/.v`, `.bars .bar .name/.track/.fill/.pct`, `.tone-*` | 2120–2228 | панель метрик; полосы растут анимацией `bar-grow` до `--end` |
| `.qr-block`, `.qr-slot` (`.corner-tr/.corner-bl`, `.qr-hint`), `.qr-caption h4/.qr-url` | 2238–2322 | рамка под QR-код с уголками |
| `.demo-cta-wrap`, `.demo-cta-lead/-btn/-icon/-label/-sub/-note` | 2332–2413 | кнопка запуска демо на слайде 02; есть в разметке каждой локали, запасной вариант строит `ensureDemoCta()` (07-deck.js:74) |

`.ev-cta` (кнопка записи урока на слайде 05) описана в `styles-media.css`, её вставляет
`ensureEvidenceButton()` (17-evidence.js:334).

### Канал Элис `section.alice` ([:540–638](../../styles.css#L540))

`.alice-head` (`.label .heart` с `pulse`, `.stats`), `.alice-stream`, `.alice-input` с `.ps` и
`.fake-caret`. Строки создаёт `pushAliceLine()` (09-alice-stream.js:43): `div.alice-line` с
`.prefix/.name/.msg`, через кадр добавляется `.show` (переход `opacity`/`translateY` 0.35 s);
`.glitch` включает `text-glitch` и ставится/снимается при глитч-озвучке (09-alice-stream.js:681).
На телефоне панель по умолчанию свёрнута до шапки (`max-height: 34px`), `.expanded` раскрывает до
40vh; класс переключает `setupAlice()` (13-mobile.js:56). Свёрнутое состояние — умолчание CSS, а не
действие JS: комментарий [:4140](../../styles.css#L4140) объясняет, что телефон не должен увидеть
развёрнутую панель даже на один кадр.

### Титульный экран `.bootscreen` ([:664–1228](../../styles.css#L664))

Статичная разметка `index.html:38–127`, `z-index: 9500`. Слои по глубине:
`.boot-cave` (градиенты пещеры) → `.boot-rain` (капли, строит `buildRain()`) →
`.boot-crystal` (SVG, `z-index: 1`) → `.boot-scan` (тонкая развёртка) → `.boot-stage`
(`z-index: 2`, сетка 2 колонки: `.boot-titleblock` и `.boot-menu`) → `.boot-status`,
`.boot-version`, `.boot-brand` (`z-index: 5`) → `.boot-popup-back` (`z-index: 10`).

- `.boot-btn` — кнопки меню со срезанными углами (`clip-path`) и бликом в `::before`;
  `[disabled]` гасит hover. `.arrow` появляется при наведении.
- `.boot-brand` — знак студии: два внешних SVG (`assets/brand-mark.svg`, `assets/brand-wordmark.svg`).
  Комментарий [:960](../../styles.css#L960): анимация живёт внутри SVG-файлов, CSS страницы до
  документа в `<img>` не дотягивается, здесь только рамка и hover.
- `.bootscreen.gone` — гаснет со вспышкой (`contrast(2.5) brightness(2) hue-rotate`) и `scale(1.08)`
  за 0.55 s. Ставит `transitionToTerminal()` (11-settings.js:543) через 160 ms после `.boot-overload.on`.
- `.boot-overload` ([:1196](../../styles.css#L1196)) — полноэкранная красно-белая вспышка поверх
  всего (`z-index: 9999`), `.on` держится ~760 ms.

### Всплывающие окна и настройки ([:1059–1150](../../styles.css#L1059), [:1463–1580](../../styles.css#L1463))

Одно окно `#bootPopup` на все пункты меню (ЗАГРУЗИТЬ, НАСТРОЙКИ, ЭКСТРА, ВЫХОД). `openPopup()`
(11-settings.js:106) ставит `.boot-popup-back.open` и `.boot-popup.wide` для настроек; содержимое —
строка HTML из `renderSettingsPopup()` и соседних функций.

- `.boot-popup h2/.row/label/.toggle button(.on)/.close` — общий вид.
- `.settings-tabs`, `.settings-tab(.active)`, `.settings-pane(.active)` — пять вкладок.
- `.slider-wrap input[type=range]` с собственными бегунками для WebKit и Firefox, `.val`.
- `.settings-note em`, `.reset-btn`, `.aisb-launch` (кнопка полигона, стиль в styles-media.css).
- `.pill` ([:1142](../../styles.css#L1142)) — не используется.

### Модификаторы настроек ([:1572–1580](../../styles.css#L1572))

См. раздел «Режимы доступности» ниже: `body.no-vignette`, `body.epilepsy-safe`, `body.big-font`.

### Призраки `.glitch-ghost` ([:1152–1193](../../styles.css#L1152), [:1398–1461](../../styles.css#L1398))

`spawnGhost()` (11-settings.js:718) раз в 5.5–11 s добавляет в `body`
`div.glitch-ghost.memory.sketch` с одним из пяти SVG-набросков `GHOST_SKETCHES`, случайным
размером 240–400px по ширине, у левого или правого края, и удаляет его по `animationend`. Если
`window.__ghostsEnabled` ложно (настройка «Глитч» выключена), призрак не создаётся, но цикл
продолжается. `.sketch` отключает растровые слои `::before/::after` и даёт SVG `drop-shadow`.
`.glitch-ghost.red` и не-sketch вариант `.memory` скрипты не создают.

### Заглушка загрузки `.loading-overlay` ([:1230–1396](../../styles.css#L1230))

Разметка `index.html:19–33`, `z-index: 12000`, по умолчанию `display: none`.
`startNewGame()` (11-settings.js:575) ставит `.active`, `runLoadingSequence()` двигает
`.load-bar .fill` инлайн-шириной, пишет строки `.load-log .line(.ok/.warn/.err)` (не больше 7),
через 1.1 s показывает `.load-skip.show`. `panic()` ставит `.glitching` (тряска и
`.load-crashlines`), `.load-bar.danger` и `.load-bar-meta.danger`, через 1.3 s `.dying`, через
2.2 s прячет оверлей инлайн-стилем `display: none`. Класс `.gone` только снимается в
`startNewGame()`, ставить его некому.

### Демо-оверлей `.demo-game` ([:2415–3522](../../styles.css#L2415), [:4735–5755](../../styles.css#L4735))

Корень `#demoGame` из `index.html:203`, `z-index: 99000`, `display: none` до `.open`.
Управляет им `DemoGame` в 06-demo.js. Классы корня:

| Класс / атрибут | Кто ставит | Что меняет в CSS |
|---|---|---|
| `.open` | `open()` (06-demo.js:1485), снимает `close()` | `display: block`, `dg-fadein`; прячет `aside.jury` (`.demo-game.open ~ aside.jury`), прячет `.bs-fab` (`body:has(.demo-game.open)`) |
| `[data-stage]` | `gotoStage()` (1573) | в CSS не используется; читает `MobileUX` через `MutationObserver` |
| `.at-desk` | `gotoStage("desk")` (1569) | всё в `.dg-void`, кроме канваса, скрыто; канвас затемнён `brightness(0.55) saturate(0.8)` |
| `.shake` / `.shake-hard` | `shake()` (2231), снимается через 800 ms | целится в `.dg-scene` — элемента нет |
| `.speaking` | `speakAsAlice()` (3378) | целится в `.dg-terminal` — элемента нет |
| `.bad-ending` | `playBadEndingScare()` (3493) | тряска заголовка `.dg-end h2`, красный подзаголовок, призраки `.dg-ghost` с `opacity: .55 !important` |
| `.fear-100` | там же (3494) | вспышка фона `dg-fear-100` |
| `.fearpulse`, `.fearbreach`, `.jury`, `.hud-open` | никто (первые два только снимаются) | мёртвые правила |

Стадии — `.dg-stage[data-stage]`, видимая отмечена `.on` (`gotoStage()`, 1567; на стадии `desk`
`.on` остаётся и у `void`, чтобы 3D-комната была видна за рабочим столом):

1. **`.dg-boot`** — ASCII-плашка, `.dg-loadbar i` (`dg-load`), строки `.dg-boot-lines .ln.ok/.warn/.bad`.
2. **`.dg-diff`** — три карточки `.dg-diff-card.easy/.medium/.hard` с `.dgtag`, `h3`, `p`, `.dgmeta`.
3. **`.dg-void`** ([:4740](../../styles.css#L4740)) — `canvas.dg-void-canvas` (WebGL, см.
   [void-scene.md](void-scene.md)) и HUD поверх: `.dg-void-lids .lid.top/.bot` (веки на `--lid`),
   `.dg-void-sub` (`.on`, `.plate` для текста табличек, `.cry` для крика Элис),
   `.dg-void-help` (`.on`, `.locked` при захвате указателя), `.dg-void-objective.on`,
   `.dg-void-compass` (`.on`, `.near` ближе 4 м, `.urge`; `.arrow` поворачивает скрипт,
   `.dist`), `.dg-void-use.on` (кнопка «включить», `.key`), `.dg-void-touch.on` с
   `.dg-void-stick(.live)` и `.dg-void-look` — только на сенсорных экранах. Все классы ставит
   контроллер стадии в 06-demo.js:1743–1980.
4. **`.dg-os`** ([:4972](../../styles.css#L4972)) — `.dg-os-crt` и четыре `.dg-os-phase`
   (`.on` переключает `osPhase()` в 06-demo.js:2079): `.dg-os-post` (янтарный POST),
   `.dg-os-kernel` (строки `.kl.ok/.warn/.bad`), `.dg-os-splash` (`.os-mark`, `.os-shard`,
   `.os-ring`, `.os-word`, `.os-tagline`, `.os-status`, `.os-progress i`), `.dg-os-shell`
   (`.os-wall`, `.os-panel`, `.os-dock .os-ico`, `.os-widgets .os-card` со `.os-spark`/`.os-wave`,
   окно `.os-win.on` с `.os-win-bar`, `.os-dots`, `.os-win-body .ol/.ps/.cmd/.ai/.sys`).
   Кнопка `.dg-os-skip`.
5. **`.dg-desk`** ([:5345](../../styles.css#L5345)) — рабочий стол VoidOS. Комментарий
   [:5338](../../styles.css#L5338): мебель та же, что у заставки, чтобы машина, которую игрок видел
   при загрузке, была той, за которой он работает. Обои `.os-wall` полупрозрачны (`opacity: .9`),
   сквозь них видна 3D-комната. `.os-panel` с `.os-tray`, `.os-chip` (`i.ok/.warn/.bad` пишет
   `refreshDeskPanels()`), `.os-standup`; `.os-dock .os-ico(.active/.alice)`;
   `.os-winlayer` с окнами `.os-window(.focused/.dragging)` — их создаёт оконный менеджер `WM`
   (06-demo.js:2263), `z-index` окна растёт инлайн от 10. Приложения:
   `.app-terminal` (`.desk-out .tl.echo/.sys/.warn/.bad/.ai`, `.desk-in`, `.desk-input`),
   `.app-files` (`.fm-bar`, `.fm-up`, `.fm-path`, `.fm-list`, `.fm-row.dir/.dev/.broken` с
   `.ic/.nm/.mt`, `.fm-empty`), `.app-editor` (`.np-bar`, `.np-area[readonly]`, `.np-foot`,
   `.np-save`), `.app-system` (`.sys-block`, `.sys-row` с `i.up/.down/.loop`, `.sys-slider`,
   `.sys-val`, `.sys-meter`), `.app-logs` (`.log-block .ttl/pre`), `.alice-app`
   (`.err/.ok/.sub/.line`). Подсказка `.os-hintbar`. Чип полигона `.os-chip.aisb-chip` добавляет
   `mountChip()` из 20-ai-sandbox.js.
6. **Редактор `.dg-editor`** ([:3145–3402](../../styles.css#L3145)) — лист, выезжающий снизу
   (`translateY(120%)` → `.open`). `.ed-bar` (`.ed-file`, `.ed-x`), `.ed-prompt .ed-tag`, `.ed-hint`,
   `.ed-code` с `.ed-gutter` поверх `textarea.ed-area`, панель сборки `.ed-out-head(.on)` +
   `.ed-out(.on)` со строками `.ed-out-line.sev-cmd/-ctx/-error/-warning/-note/-run`, `.ed-foot`,
   `.ed-status.ok/.bad/.warn`, `.ed-actions button(.primary)`. Классы `.open`, `.solved`,
   `.failed` и содержимое ставит 06-demo.js:3130–3330. Внутри `.dg-desk` редактор растянут от
   панели до низа (`top: 34px`, `z-index: 60`).
7. **`.dg-end`** — `h2`, `.dg-end-sub`, `.dg-end-log`, `.dg-end-actions button`; `.win`/`.lose`
   на самой стадии (06-demo.js:3442) красят заголовок.

Общие слои демо: `.dg-scanlines` (`z-index: 5`, цвет из `--crt-line` с `!important`),
`.dg-vignette` (6; `body.no-vignette` гасит), `.dg-close` (200), призраки `.dg-ghost` (50).

Старый текстовый режим демо (`.dg-game` с `.dg-scene`, `.dg-room`, `.dg-terminal`, `.dg-prompt`,
`.dg-side` и HUD-панелями) остался в CSS, но из разметки удалён — см. «Мёртвый CSS».

### Чек-лист жюри `aside.jury` ([:3524–3841](../../styles.css#L3524))

Каркас в `index.html:581–605`, список строит `JuryChecklist.render()` (12-jury.js:192):
`li.jury-item(.done)` > `label` > `input[type=checkbox]` + `.jury-step` + `.jury-desc` (в нём `code`,
`kbd`, `strong`, `em`). Открытость — атрибут `data-collapsed="0|1"`, который ставит
`setOpen()` (12-jury.js:228); панель `.jury-panel` появляется через `opacity/transform/visibility`.
`.jury-tab` — плашка в правом верхнем углу (`z-index: 99500`), `.jury-bar > i` — прогресс,
ширину пишет `updateProgress()`. Скрыт при `body.booting` и при открытом демо.

Комментарий [:3532](../../styles.css#L3532): селекторы привязаны к `aside.jury`, а не к `.jury`,
потому что демо-оверлей когда-то ставил себе класс `jury` в режиме подсказок для жюри, и голый
`.jury { pointer-events: none }` убивал клики по HUD демо.

### Режим подсказок и пошаговый список ([:3844–3979](../../styles.css#L3844))

`.dg-hintmode`, `.demo-game.jury .dg-hint`, `.dg-walk ol li.done/.now`,
`.demo-game.jury .dg-editor .ed-hint`. Всё это часть старого HUD: класс `jury` на `.demo-game`
никто не ставит (`hintMode` живёт в `state` 06-demo.js:1296), `.dg-walk` и `.dg-hintmode` в
разметке нет. Живое правило одно — `.demo-game.open ~ aside.jury { display: none !important }`
([:3988](../../styles.css#L3988)); оно работает через соседний селектор, потому что `aside.jury`
стоит в `body` после `#demoGame` (комментарий: так не нужен `:has()`).

### Интро для жюри `.ji` ([styles-media.css:26–492](../../styles-media.css#L26))

Корень и всю разметку строит `JuryIntro.build()` (16-jury-intro.js:117) и удаляет по окончании.
`z-index: 99700`. Части: `.ji-noise` (развёртка + виньетка, 8), `.ji-top` с `.ji-rec i`,
`.ji-act`, `.ji-who.n/.a`, `.ji-time` (5); `.ji-alert .l1/.l2` (4); `.ji-stage` со сценами
`.ji-scene.s1..s5` (1); `.ji-term` с `.ji-lines .ji-line.n/.a(.old) .who .caret` и `.ji-status`
(3); `.ji-eq i` — 28 столбиков эквалайзера (3); `.ji-gate .ji-door.l/.r` (2); `.ji-go` с
`.ji-enter` и `.ji-enter-hint` (4); `.ji-tap` — просьба нажать клавишу, если браузер не дал
звук (7); `.ji-skip` (6).

Сцены: акт 1 — `.ji-bridge .node.src/.dst`, `.wire i`; акт 2 — `.ji-crash` (`.ji-win-head`,
`.ji-stack`, `.ji-leak b/i/u`) и `.ji-quote p/cite`; акт 3 — `.ji-cam` с SVG-манометром
`.ji-gauge` (`.rim/.face/.tick(.major)/.num/.lbl/.val/.needle`) и `.ji-code .c/.k/.hl`, таблички
`.ji-plate.ji-antiai`; акт 4 — `.ji-card .k/.v/.tag`, `.ji-langs`, `.ji-badge`, `.ji-plate.ji-tea`.

Состояния корня: `.on` (проявление), `[data-act="1..5"]` (видимая сцена; при любом акте тревога
`.ji-alert` уезжает наверх и уменьшается, после первого — гаснет), `[data-who="n"]` (эквалайзер
янтарный), `.ji-bridged`, `.ji-push` (камера наезжает `scale(1.45)`), `.ji-cut` (склейка),
`.ji-gate-up`/`.ji-open` (двери закрываются и раскрываются), `.ji-ready` (кнопка входа),
`.ji-notext` (нет субтитров — прячет строки), `.ji-out` и `.ji-out-enter` (уход; с задержкой 0.75 s,
пока под интро гаснет титульный экран — комментарий [:44](../../styles-media.css#L44) ссылается на
~0.76 s `transitionToTerminal`, это 160 + 600 ms в 11-settings.js). `.ji-calm` ставится при сборке.
Отдельным элементам `.on` ставит `stagingFor()`.

### Плеер записи `.ev` ([styles-media.css:494–637](../../styles-media.css#L494))

Строит `Evidence` в 17-evidence.js:100, `z-index: 999999` — выше всего. `.ev-screen` шириной
`--ev-w`, `.ev-frame` с `aspect-ratio: 16/9` (на портретном экране 9/16), `.ev-video`, `.ev-scan`,
`.ev-wait` (видна при `.ev-buffering`), `.ev-bar` (`.ev-rec i`, `.ev-feed`, `.ev-tc`),
`.ev-ctl` (`.ev-play`, `.ev-seek`, `.ev-q button.on/.live`, `.ev-close`). Классы корня: `.ev-on`,
`.ev-off`, `.ev-calm`, `.ev-buffering`; `[hidden]` скрывает. Кнопка `.ev-cta`
(`.ev-cta-icon/-label/-key`) живёт на слайде 05.

### Тест голосового тракта `.vt` ([styles-media.css:639–673](../../styles-media.css#L639))

`VoiceExtras.mount()` (18-voice-extras.js:67) вставляет `.vt` после ползунка громкости голоса на
вкладке «Звук»: `.vt-btn(.on)`, `.vt-meter i.on/.warm/.hot/.pk` (сегменты красит `paint`-цикл),
`.vt-log .l1/.l2`, `.vt.live`. Пока идёт тест, ползунок получает `.slider-wrap.vt-live` и `--vt-level`.

### Секрет «Взаперти» `.sx` ([styles-media.css:675–733](../../styles-media.css#L675))

`.alice-core-mark` — надпись `ALICE_CORE` в шапке и на титуле; три клика за 0.7 s запускают
`fireSecret()` (18-voice-extras.js:206). Он создаёт `.sx-flash(.sx-calm)` (`z-index: 999998`, живёт
520 ms) и `.sx-toast(.on)` (`999990`) с `.sx-head`, `.sx-row`, `.sx-meter i`, `.sx-tc`, `.sx-stop`.
Комментарий к `sx-flash`: два пика за полсекунды — ниже порога три вспышки в секунду.

### Полигон ИИ `.aisb` ([styles-media.css:740–981](../../styles-media.css#L740))

Строит `AiSandbox` в 20-ai-sandbox.js:703, `z-index: 999000`. Окно `.aisb-win` (сетка: шапка и тело),
`.aisb-scan`. Шапка: `.aisb-title`, `.aisb-conn.online/.offline/.warm` с `.aisb-conn-note`,
`.aisb-ping`, `.aisb-x`. Левая колонка: `.aisb-presets button.on`, редактор `.aisb-ed` из
`.aisb-gutter`, `.aisb-ed-main`, `.aisb-curline`, `textarea.aisb-code`; `.aisb-actions` с
`.aisb-send` и `.aisb-model input`. Правая: шкала ясности `.aisb-luc` (`.aisb-luc-num b`,
`.aisb-luc-bar i`, `.aisb-luc-zone`; классы `.wait/.ok/.warn/.crit` и `.calm` ставит
`setLucidity()` (20-ai-sandbox.js:935), `.idle` — сброс перед новым запросом), терминал `.aisb-term(.idle)` с блоками `.aisb-blk.a/.d`, `.aisb-lbl`,
`.aisb-alice`, `.aisb-diag`, `.aisb-meta`; звук `.aisb-audio` (`.aisb-tts`, `.aisb-voice`, `.aisb-eq i`).
Корень: `.on`, `.aisb-busy`, `.aisb-crit` (красная рамка, не в спокойном режиме). Скрипт ставит ещё
`.aisb-calm` (20-ai-sandbox.js:1153), но правил для него в CSS нет. Снаружи: `.aisb-chip` с
`.aisb-dot` (`.online/.offline`) в панели рабочего стола и `.aisb-launch` в настройках.

### Смета `.cs` ([styles-media.css:983–1108](../../styles-media.css#L983))

Строит 21-backstage.js:254, `z-index: 998800`. Выезжает снизу как распечатка: `.cs-paper` с
перфорацией в `::before`, `.cs-head` (`.cs-title span`, `.cs-sub`, `.cs-x`), `.cs-scroll`,
`.cs-kpi div b/span`, разделы `.cs-sec h3` с таблицами (`tr.total`, ячейки `.n` — суммы),
`.cs-notes`. Классы `.on`/`.off`/`.cs-calm`. На телефоне таблицы перестраиваются в карточки.

### Служебная панель `.bs`, кнопка `.bs-fab`, значок `.bs-chip` ([styles-media.css:1110–1208](../../styles-media.css#L1110))

`.bs` (21-backstage.js:336, `z-index: 998900`): `.bs-box`, `.bs-head`, `.bs-title`, `.bs-x`,
`.bs-lead`, сетка `.bs-grid` плиток `.bs-tile` (`.bs-ico`, `.bs-txt b/small`, `kbd`;
`.locked` — пунктир и `cursor: help`, `.nope` — покачивание), `.bs-keys dl/dt/dd`. Классы
`.on`/`.bs-calm`. `.bs-fab` — плавающая кнопка слева снизу (`99600`) на той же высоте, что плашка
жюри справа; видна при `(hover: none), (max-width: 820px)` и скрыта при `body.booting` и открытом
демо. `.bs-chip` — значок `⌘` в шапке, на сенсорных и узких экранах скрыт. Обе создаёт `mount()`
(21-backstage.js:382).

## Порядок наложения (z-index)

Все верхние слои — `position: fixed` прямо в `body`, поэтому их `z-index` сравниваются в одном
корневом контексте. Таблица собрана по фактическим значениям обоих файлов.

| z-index | Элемент | Файл:строка | Когда на экране |
|---|---|---|---|
| 10 | `.shell` (вся презентация) | styles.css:117 | всегда после титула |
| 40 | `.glitch-ghost` | styles.css:1159 | каждые 5.5–11 s, 2.4 s |
| 9000 | `body::before` (развёртка) | styles.css:67 | всегда, кроме `body.booting` |
| 9001 | `body::after` (виньетка) | styles.css:86 | то же, кроме `body.no-vignette` |
| 9500 | `.bootscreen` | styles.css:674 | до входа в презентацию |
| 9999 | `.boot-overload` | styles.css:1198 | ~760 ms при входе |
| 12000 | `.loading-overlay` | styles.css:1237 | от «НОВАЯ ИГРА» до краха загрузки |
| 99000 | `.demo-game` | styles.css:2428 | демо открыто |
| 99500 | `aside.jury` | styles.css:3542 | после титула, кроме открытого демо |
| 99600 | `.bs-fab` | styles-media.css:1179 | телефон/сенсор, после титула, вне демо |
| 99700 | `.ji` | styles-media.css:34 | интро для жюри |
| 998800 | `.cs` | styles-media.css:990 | смета |
| 998900 | `.bs` | styles-media.css:1113 | служебная панель |
| 999000 | `.aisb` | styles-media.css:749 | полигон ИИ |
| 999990 | `.sx-toast` | styles-media.css:706 | секрет, пока играет запись |
| 999998 | `.sx-flash` | styles-media.css:681 | 520 ms |
| 999999 | `.ev` | styles-media.css:500 | плеер записи |

Сверка с заголовком `styles-media.css` (строки 16–19): числа совпадают. Комментарий называет 99500
«deck popups», но на этом уровне стоит чек-лист жюри; всплывающие окна меню лежат внутри
`.bootscreen` на уровне 10 его собственного контекста. Комментарий не упоминает `.demo-game` (99000)
и слои `styles.css` ниже 12000.

Внутренние контексты:

- `.bootscreen`: кристалл 1, сцена 2, статус/версия/знак 5, `.boot-popup-back` 10, подложка
  знака −1.
- `.demo-game`: стадии 10, развёртка 5, виньетка 6 — то есть общие развёртка и виньетка демо лежат
  *под* стадиями. В `.dg-void`: веки 30, подпись/подсказка/цель/компас 40, сенсорный слой 42,
  кнопка «включить» и «пропустить» 45. В `.dg-desk`: окна 30 (`.os-winlayer`, внутри окна от 11 и
  выше инлайн), подсказка 35, панель и док 40, редактор 60. Призрак `.dg-ghost` 50, кнопка выхода
  200 (на телефоне 220).
- `.ji`: сцена 1, двери 2, терминал и эквалайзер 3, тревога и кнопка входа 4, шапка 5, «пропустить»
  6, `.ji-tap` 7, шум 8 (поверх всего, `pointer-events: none`).
- `.aisb-scan` 5 внутри окна полигона.

Следствия: глобальные развёртка и виньетка (9000/9001) лежат поверх презентации, но под демо и
всеми медиа-слоями — у демо и интро свои (`.dg-scanlines`, `.ji-noise`). Плеер записи (999999)
перекрывает даже полигон и тосты: запись урока открывается по `Shift+V` из любого места, кроме
полей ввода (обработчик на `window` в 17-evidence.js:309).

## Медиазапросы и точки перелома

| Условие | Где | Что делает |
|---|---|---|
| `max-width: 1100px` | styles.css:414, 1692, 1786, 1966, 2140, 2180 | виджеты слайдов в 2 или 1 колонку |
| `max-width: 900px` | styles.css:650, 1215, 3549 | старая адаптация: сетка `.shell` в одну колонку, меню в несколько рядов, титул в одну колонку, `aside.jury` ближе к краю |
| `max-width: 820px` | styles.css:4054 (главный блок), 5266, 5647, 5725; styles-media.css:469, 604, 637, 965, 1087 | телефон: шапка в две строки, меню-лента, свёрнутая Элис, все попапы — почти полноэкранные листы, чек-лист жюри — нижний лист, демо в одну колонку, редактор — полноэкранный лист над клавиатурой, рабочий стол VoidOS: окна во весь экран, док внизу; интро, плеер, полигон и смета — во весь экран |
| `max-width: 480px` | styles.css:4643 | узкий телефон: мельче заголовки, ASCII 8px |
| `(hover: none) and (pointer: coarse)` | styles.css:4659 | сенсор: hover без сдвига, цели 44px, `overscroll-behavior: contain` у прокручиваемых областей |
| `max-width: 900px` and `max-height: 480px` and `landscape` | styles.css:4688, 5315 | телефон боком: скрыта шапка, Элис 30px, титул снова в 2 колонки, HUD 3D-сцены по краям |
| `max-height: 520px` | styles-media.css:487 | низкое окно: интро ужимает сцену и терминал |
| `max-aspect-ratio: 1/1` | styles-media.css:600 | портретный экран: кадр плеера 9:16, потому что запись вертикальная |
| `max-width: 520px` | styles-media.css:673 | тест голоса в одну колонку |
| `max-width: 560px` | styles-media.css:1168 | служебная панель — нижний лист, плитки в одну колонку |
| `(hover: none), (max-width: 820px)` | styles-media.css:1204 | показать `.bs-fab`, скрыть `.bs-chip` |
| `prefers-reduced-motion: reduce` | styles.css:4729 (только с `max-width: 820px`), 5324; styles-media.css:735, 979 | см. ниже |

JS повторяет две точки в `MobileUX` (13-mobile.js:13–14): `mqPhone = "(max-width: 820px)"` и
`mqTouch = "(hover: none) and (pointer: coarse)"`. Менять порог нужно в обоих местах.

На интервале 821–900px работают только старые правила 900px: сетка уже одноколоночная, а меню
ещё не лента, а перенос кнопок по две (`flex: 1 1 45%`).

## Режимы доступности

| Режим | Кто включает | Что меняет в CSS |
|---|---|---|
| `body.no-vignette` | `applySettings()`, «Видео → Виньетка: выкл» | `body::after` — `opacity: 0`, анимация снята (`!important`); `.demo-game .dg-vignette` — `opacity: 0` |
| `--crt-line` | `applySettings()`, «Видео → CRT: on/dim/off» | прозрачность строк развёртки 0.035 / 0.015 / 0 (и в демо) |
| `body.style.filter = contrast(c)` | `applySettings()`, «Видео → Контраст» 60–140 % | контраст всей страницы; при 100 % фильтр снимается |
| `body.epilepsy-safe` | `applySettings()`, «Доступность → Эпилепсия» | `body::before` без `scan-drift`; `.glitch-ghost` — `animation-duration: 3000ms` (призрак проявляется и гаснет медленнее; заданное там же `opacity: .18` во время анимации не действует, его перекрывают кадры `ghost-memory`); блик `.boot-btn::before` скрыт; `.ev-cta-icon` и `.aisb-dot` не мигают. Скрипты 16, 17, 18, 20, 21 по этому же классу ставят `.ji-calm`, `.ev-calm`, `.sx-calm`, `.cs-calm`, `.bs-calm`, `.aisb-luc.calm` |
| `prefers-reduced-motion: reduce` | система | ≤820px: скрыты `.boot-rain`, `.dg-scanlines`, `.load-crashlines`; везде: без анимации `.os-ring`, `.os-shard`, `.os-wave i`, `.dg-void-use.on`, `.dg-void-compass.urge`, шум/REC/курсор/кнопка входа интро, REC и значок плеера, окно и шкала полигона, точка статуса; камера интро не наезжает. Функции `calm()` в скриптах 16–21 считают этот запрос равным режиму эпилепсии |
| `body.big-font` | `applySettings()`, «Доступность → Шрифт: крупный» | `body` 16px, `.body-text` 17px/1.7, `.slide-title` `clamp(22px, 2.3vw, 30px)`, `.boot-btn` 18px. Демо, чек-лист, попапы и медиа-слои заданы в px и не меняются |
| `window.__titleGlitchEnabled` | «Доступность → Глитч заголовка» | только JS, CSS не затрагивает |

Чего режим эпилепсии не трогает (по CSS и grep `epilepsy` в 11-settings.js и 06-demo.js):
`crt-flicker` на `body::after` (выключается только виньеткой), вспышка `.boot-overload`,
`load-die` (`brightness(4) contrast(8)`), `dg-fear-100` (кадр белого фона), тряска заголовка
плохой концовки, вспышки `.dg-ghost`. 3D-сцена свой глитч ограничивает в JS (`voidGlitchAmount()`,
06-demo.js:1714).

Фокус: пунктирная рамка есть только у `button.slide-btn:focus-visible`. Остальные `:focus-visible`
снимают `outline` и заменяют его подсветкой или сдвигом: `.demo-cta-btn` (рамка и свечение),
`.dg-diff-card` (подъём на 2px), `.ji-enter`, `.ji-skip`, кнопки `.ev-ctl`, `.ev-cta`, `.vt-btn`,
`.aisb-*`, `.cs-x`, `.bs-tile`, `.bs-chip`. У `.boot-btn` стоит `outline: none` без замены —
фокус с клавиатуры в титульном меню не виден.

## Шрифты

Веб-шрифтов нет: ни `@font-face`, ни `@import`, ни внешних `url()`. Только системные стеки:

| Стек | Где |
|---|---|
| `"Courier New", "Lucida Console", Courier, monospace` | `html, body` (14px, `line-height: 1.55`), `.ascii`, `.ji`, `.ev`, `.cs`, `.bs` |
| `"Courier New", monospace` | почти все компоненты титула, загрузки и демо (явно, потому что `.bootscreen`, `.loading-overlay` и `.demo-game` задают свои цвета и шрифт заново) |
| `Georgia, "Times New Roman", serif`, курсив, жирный | `.boot-title`, `.load-logo`, `.ji-quote p` |
| `ui-monospace, "JetBrains Mono", Menlo, monospace` | `.jury-desc code, .jury-desc kbd` |
| `"Fira Code", Consolas, "Lucida Console", "Courier New", monospace` | `.aisb` (используется то, что установлено) |

Начертание знака студии — не шрифт, а SVG `assets/brand-wordmark.svg`: комментарий
[styles.css:984](../../styles.css#L984) — рукописный курсив должен выжить на машине без Garamond.

Восемь объявлений в чек-листе жюри записаны как `font: 700 10px/1 inherit` (styles.css:3570, 3583,
3657, 3664, 3683, 3778, 3788, 3835). `inherit` нельзя ставить на место семейства внутри
сокращённой записи `font`, браузер отбрасывает такое объявление целиком. Вес, размер и межстрочный
интервал этих элементов берутся из умолчаний: например, `.jury-tab` и `.jury-close` — кнопки и
получают системный шрифт кнопки браузера, `.jury-step` не жирный.

## Почему так, а не иначе

- **Два файла стилей, второй — неблокирующий.** Очевидная альтернатива — один `styles.css`.
  Комментарии `styles-media.css:12–14` и `index.html:8–9`: ничего из медиа-слоёв не видно до первого
  клика, поэтому файл грузится через `media="print"` + `onload`, и на медленном канале меню
  появляется примерно на 4 КБ раньше. Это ограничение про слабый интернет на телефонах жюри.
- **Эффекты CRT, призраки, интро — CSS, а не canvas.** Альтернатива — полноэкранный `<canvas>`
  поверх страницы с циклом `requestAnimationFrame`. По коду видно, что CSS-слои ничего не стоят
  скриптам: `body::before/::after` — два псевдоэлемента с градиентом и `pointer-events: none`, их
  анимирует компоновщик. Где GPU телефона не тянет, CSS отключает дорогое точечно: «дышащее»
  свечение терминала снято, потому что «costs fps on phones» ([styles.css:4420](../../styles.css#L4420)),
  тяжёлую виньетку демо ослабляют первой ([:4635](../../styles.css#L4635)). Интро намеренно на SVG и
  CSS, без WebGL, чтобы не задеть GL-контекст демо (16-jury-intro.js:30). Canvas остался только там,
  где без него нельзя, — 3D-комната.
- **Знак студии — внешние SVG с анимацией внутри.** Альтернатива — инлайн-SVG, которым управляет
  этот CSS. Комментарий `index.html:99–103`: одна надпись — 145 контуров, инлайн добавил бы около
  120 КБ в `index.html`; CSS внутри SVG, подключённого через `<img>`, продолжает работать, а стили
  страницы туда не достают ([styles.css:960](../../styles.css#L960)).
- **Порядок наложения — большие разрывы между слоями.** По коду видно правило: каждый следующий
  слой может открыться поверх предыдущего. Демо (99000) открывается со слайда; чек-лист (99500) по
  замыслу комментария [:3529](../../styles.css#L3529) стоял выше демо, теперь в демо скрыт;
  интро (99700) идёт поверх заглушки загрузки (12000); полигон (999000) открывается из рабочего
  стола демо через `.aisb-chip`, смета и служебная панель — из любого места, плеер (999999) —
  над всем, потому что запись открывается по `Shift+V` откуда угодно. Шестизначные числа — по коду
  видно только то, что они гарантированно выше всех слоёв `styles.css`; историю выбора чисел
  комментарии не объясняют.
- **Призраки — атмосфера, а не помеха.** Пик прозрачности снижен с 0.95 до 0.28, `pointer-events:
  none`, появление у левого и правого краёв (комментарии [:1182](../../styles.css#L1182),
  11-settings.js:728).
- **Свёрнутая Элис на телефоне — умолчание CSS, а не действие JS.** Альтернатива — сворачивать
  скриптом при загрузке; тогда на первом кадре панель была бы развёрнута (комментарий
  [:4140](../../styles.css#L4140)).
- **`--kb` сдвигает стадии, а не добавляет отступ корню.** Стадии абсолютны относительно
  `.demo-game`, а такой блок отсчитывается от padding-box, поэтому `padding-bottom` корня их бы не
  сдвинул (комментарий [:4351](../../styles.css#L4351)).
- **Поля ввода на телефоне — не меньше 16px** (`.dg-prompt input`, `.desk-input`; `textarea.ed-area`
  15px): иначе мобильный браузер увеличивает страницу при фокусе (комментарии [:4450](../../styles.css#L4450),
  [:4595](../../styles.css#L4595)).
- **Нумерация строк редактора — отдельный слой с теми же метриками, что `textarea`.** Альтернатива —
  `contenteditable` с номерами внутри. Комментарий [:3238](../../styles.css#L3238): шрифт, размер,
  межстрочный интервал, верхний отступ и `white-space` у `.ed-gutter` и `.ed-area` обязаны совпадать
  байт в байт, иначе номера уползают. Панель сборки берёт место снизу листа (`flex: 0 0 auto`), чтобы
  не сжимать эту пару ([:3308](../../styles.css#L3308)).
- **Чек-лист скрывается в демо через соседний селектор `~`, а не `:has()`** (комментарий
  [:3985](../../styles.css#L3985)): `aside.jury` стоит в разметке после `#demoGame`. `.bs-fab` в
  `styles-media.css:1208` то же самое делает через `body:has(.demo-game.open)` — в браузере без
  `:has()` кнопка доступа останется поверх демо.
- **Вспышки — не чаще трёх в секунду.** `sx-flash` даёт два пика за 0.5 s
  ([styles-media.css:693](../../styles-media.css#L693)), шкала полигона в критической зоне трясётся,
  а не мигает ([:890](../../styles-media.css#L890)). Спокойный режим медиа-слоёв включается одним
  классом от скрипта (`.ji-calm` и т. п.), а не дублированием правил под каждое условие: функции
  `calm()` объединяют `body.epilepsy-safe` и `prefers-reduced-motion`.
- **Вторая палитра (голубой, сливовый, «слизь», янтарный).** Комментарий [:20](../../styles.css#L20):
  сплошной красный студенты назвали «анемичным»; новые цвета используются скупо, чтобы красный
  оставался главным.
- **Сенсорные цели 44px, `touch-action: manipulation`, свой цвет подсветки касания**
  ([:4031](../../styles.css#L4031), [:4655](../../styles.css#L4655)): убрать задержку 300 ms и серую
  вспышку на Android, жюри управляет пальцами.
- **`box-sizing: border-box` у чипа меню на телефоне.** Базовое правило кнопки — `all: unset`, а оно
  сбрасывает и `box-sizing`; без явного значения `min-height` плюс отступы дали бы чип 62px
  (комментарий [:4113](../../styles.css#L4113)).

## Связи

CSS не объявляет и не читает переменных JS. Связь двусторонняя только через классы, атрибуты и
четыре пользовательских свойства.

Берёт из скриптов (класс или свойство → кто ставит):

| Что | Кто |
|---|---|
| `body.booting` (снятие) | `transitionToTerminal()` — 11-settings.js |
| `body.no-vignette`, `.epilepsy-safe`, `.big-font`, `--crt-line`, `body.style.filter` | `applySettings()` — 11-settings.js |
| `.boot-popup-back.open`, `.boot-popup.wide`, `.settings-tab.active`, `.toggle button.on` | `openPopup()`, `renderSettingsPopup()` — 11-settings.js |
| `.loading-overlay.*`, `.load-bar.danger`, `.load-skip.show`, `.bootscreen.gone`, `.boot-overload.on` | 11-settings.js |
| `.glitch-ghost.memory.sketch` | `spawnGhost()` — 11-settings.js |
| `.boot-rain span`, `.alice-line(.show/.glitch)` | `buildRain()`, `pushAliceLine()` — 09-alice-stream.js |
| `.slide-btn.active`, `.swap-anim`, `.typer`, `.demo-cta-*` | `renderSlide()`, `animateTitle()`, `ensureDemoCta()` — 07-deck.js |
| HTML тел слайдов (`.statgrid`, `.callout`, `.edtech`, `--end`…) | `SLIDES` — 02-slides.js |
| `.demo-game.*`, `.dg-stage.on`, `.dg-void-*`, `--lid`, `.dg-os-phase.on`, `.os-window`, `.dg-editor.*`, `.dg-ghost` | `DemoGame` — 06-demo.js |
| `aside.jury[data-collapsed]`, `.jury-item(.done)` | `JuryChecklist` — 12-jury.js |
| `--kb`, `body.kb-open`, `section.alice.expanded` | `MobileUX` — 13-mobile.js |
| `.ji` и все `.ji-*` | `JuryIntro` — 16-jury-intro.js |
| `.ev`, `.ev-cta` | `Evidence`, `ensureEvidenceButton()` — 17-evidence.js |
| `.vt`, `--vt-level`, `.sx-flash`, `.sx-toast` | `VoiceExtras` — 18-voice-extras.js |
| `.aisb`, `.aisb-chip` | `AiSandbox` — 20-ai-sandbox.js |
| `.cs`, `.bs`, `.bs-fab`, `.bs-chip` | `Backstage` — 21-backstage.js |

Отдаёт: палитру `--blood`, `--warn`, `--good`, `--cyan`, `--amber`, `--ash`, `--bone` и другие —
инлайн-стилям в 02-slides.js и index.html; точки перелома 820px и сенсорный запрос — `MobileUX`
(13-mobile.js:13–14), который должен с ними совпадать; конец анимации `ghost-memory` — событие
`animationend`, по которому `spawnGhost()` удаляет призрака. `index.html` подключает оба файла.

## Мёртвый CSS

Проверено скриптом, который выписал все классы из селекторов обоих файлов (603) и искал каждый как
отдельное слово в `js/**`, `index.html`, `studio.html`; затем каждый найденный случай проверен
вручную (динамически собираемые имена вроде `"tone-" + x` в коде не встречаются).

| Правила | Строки styles.css | Почему мёртвые |
|---|---|---|
| `.pill` | 1142–1150 | класс нигде не ставится |
| `.glitch-ghost.red`; `.glitch-ghost.memory::before/::after` с `ghost-memory-edge`; `ghost-flash` | 1173–1193, 1419–1461 | создаётся только `memory sketch`, у него псевдоэлементы скрыты, анимацию задаёт `.memory` |
| `.loading-overlay.gone` | 1256–1259 | класс только снимается |
| `.load-log .line.glitch`, `load-line-glitch` | 1353–1360 | `addLine()` не получает `glitch` |
| `.term`, `.term .glyph`, `.term em` | 1594–1616 | в слайдах нет; зато `.term` совпадает с иконками дока `os-ico term` (index.html:372, 443) и подмешивает им `padding: 1px 6px 1px 4px`, `white-space: nowrap`, `gap` |
| `.ascii.warn`, `.ascii.plum`, `.ascii.slime` | 1634, 1637, 1638 | в слайдах только `.blood` и `.cyan` |
| `.demo-console` целиком (`.demo-toolbar`, `.demo-grid`, `.demo-src`, `.demo-out`, `.demo-foot`, `.leak-bar`, `.leak-label`, `.running/.crashed`) и `demo-shake` | 1734–1866 | виджет утечки памяти со слайдов убран; от него остались только JS-заглушки `window.__runLeakDemo`/`__resetLeakDemo` (06-demo.js:3646) |
| `.playground` целиком (`.pg-*`, `.lang-*`, `.src-*`, `.voice-vu`, `.speaking`, `.idle`) с `pg-pulse`, `voice-bar` | 1868–2117 | заменён кнопкой демо `.demo-cta-*`; осталась заглушка `window.__runPlayground` |
| `.edtech .kpi .cell .v.good` | 2163–2166 | в слайдах нет |
| `.qr-slot.filled .qr-hint` | 2296 | класс не ставится; атрибут `data-qr-src` из комментария [:2233](../../styles.css#L2233) никто не читает |
| Старая текстовая стадия `.dg-game`: `.dg-scene`, `.dg-side`, `.dg-room`, `.dg-floor`, `.dg-back-wall`, `.dg-terminal`, `.dg-term-bar`, `.dg-screen`, `.dg-prompt`, `.dg-side-head`, `.dg-diff-badge`, `.dg-stats`, `.dg-stat`, `.dg-bar`, `.dg-hint`, `.hint-tag`, `.hint-cmd`, `.dg-log-mini` | 2643–2938 | стадии `.dg-game` в `index.html` нет |
| `.demo-game.shake/.shake-hard .dg-scene`, `.demo-game.speaking .dg-terminal` | 2965–2966, 3039–3046 | классы ставятся, цели нет — тряски и мерцания не видно |
| `.dg-quick` (`.qttl`, `.qrow`, `.qlbl`, `.qbtns`, `.qnote`) | 3066–3138 | элемента нет |
| `.fearpulse`, `.fearbreach`, `.dg-input.glitched`, `.dg-editor.possessed` | 3404–3470 | первые два только снимаются, `.dg-input` нет, `flashEditorGlitch()` не вызывается |
| `.demo-game.bad-ending { animation: dg-end-flash }` | 3493–3495 | перекрыто `.demo-game.fear-100`, который ставится одновременно и стоит ниже |
| Режим подсказок: `.dg-hintmode`, `.dg-walk`, `.demo-game.jury …` | 3844–3979 | элементов нет, класс `jury` не ставится |
| Мобильный HUD демо: `.dg-hud-toggle`, `.dg-hud-scrim`, `.hud-open`, мобильные правила `.dg-game/.dg-scene/.dg-terminal/.dg-prompt/.dg-side/.dg-stats`, сенсорные `.dg-screen`, `.dg-side`, `.dg-walk ol` | 4024–4029, 4396–4551, 4679–4681 | `MobileUX.setupDemoHud()` ищет `.dg-game`, не находит и выходит (13-mobile.js:145), кнопка и подложка не создаются |

Связанные пометки: `@keyframes desk-loop` не существует, хотя на него ссылается живое правило
`.sys-row i.loop` (5581). `--ghost` объявлен и не читается. JS ставит `.aisb-calm`, для которого
правил нет.

## Подводные камни

- **Порядок правил решает исход у равной специфичности.** Классы состояния корня демо
  (`.open`, `.bad-ending`, `.fear-100`) все задают `animation` с весом (0,2,0); побеждает нижний в
  файле. Новый класс с анимацией корня, поставленный ниже `.fear-100`, перекроет и его.
- **`all: unset` у `button.slide-btn`** сбрасывает `box-sizing` и фокусную рамку; всё, что нужно,
  возвращается явно (`:focus-visible`, мобильный `box-sizing`).
- **Фильтр на `body`.** `applySettings()` при контрасте ≠ 100 % пишет `body.style.filter`. Фильтр
  делает `body` контейнером для всех `position: fixed` потомков. Пока у `body` `height: 100%` и
  `overflow: hidden`, это незаметно; если странице разрешить прокрутку, оверлеи поедут вместе с ней.
- **Ширины gutter и textarea редактора** должны меняться парой — и в базовом правиле, и в
  мобильном (38px/46px и 36px/44px).
- **Комментарии про `main.js`** ([:2853](../../styles.css#L2853), [:4005](../../styles.css#L4005),
  [:4024](../../styles.css#L4024), [:4519](../../styles.css#L4519); `index.html:261`, `:314`)
  указывают на файл, которого нет: код разнесён по `js/core`, `js/presentation`, `js/demo`.
- **Комментарий о призраках на [:1153](../../styles.css#L1153)** говорит, что они лежат *под*
  содержимым слайда. По числам это не так: призрак — `fixed` в `body` с `z-index: 40`, оболочка
  `.shell` — 10, призрак рисуется поверх текста и меню. Читаемым текст оставляют только низкая
  прозрачность, `mix-blend-mode: screen` и `pointer-events: none`.
- **Комментарий «REDUCED DATA / WEAK GPU»** ([:4724](../../styles.css#L4724)) обещает отключать
  декор при экономии энергии и просьбе о меньшем движении. Запрос — только
  `prefers-reduced-motion` и только вместе с `max-width: 820px`; на ноутбуке с этой системной
  настройкой дождь, развёртка демо и полосы краха остаются.
- **В `.dg-desk` после подсказки (`index.html:455–479`) лежат 25 строк обрывков разметки**
  (` -->`, `ue">`, `ar">`, `pan>`…) — текстовые узлы внутри стадии. Их закрывают абсолютные обои
  `.os-wall`, поэтому на экране их обычно не видно; при правке слоёв рабочего стола (например,
  `z-index` или прозрачности обоев) они проявятся.
- **`.bs-fab` прячется в демо через `:has()`** — в старых браузерах без `:has()` (Chrome до 105,
  Firefox до 121) кнопка видна поверх демо.
- **Медиа-слои могут прийти позже основного CSS.** Из-за неблокирующей загрузки клик в первые
  миллисекунды на медленном канале может открыть слой без стилей. По коду видно, что все такие
  слои открываются только по действию пользователя после показа меню, поэтому на практике окно
  мало.
