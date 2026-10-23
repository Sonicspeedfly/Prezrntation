# Каркас страницы, слайды и канал Элис — справочник

> Файлы: `index.html` (608 строк), `js/presentation/02-slides.js` (1296 строк),
> `js/presentation/07-deck.js` (200 строк), `js/presentation/08-alice-lines.js` (67 строк),
> `js/presentation/08b-alice-audio.js` (30 строк, 1 742 082 байта),
> `js/presentation/09-alice-stream.js` (839 строк) · Место в порядке загрузки: `02` — пятый
> `<script defer>`, `07` — десятый, `08` — одиннадцатый, `09` — двенадцатый; `08b` в
> `index.html` нет, его вставляет `loadAliceAudio()`.
> Связанные страницы: [README.md](README.md) (общая область, порядок загрузки),
> [ui.md](ui.md) (`10-i18n`, `11-settings`, `13-mobile`, `17-evidence`),
> [audio.md](audio.md) (`Audio`, `VoiceBus`, `AliceVoice`), [voice.md](voice.md)
> (`VOICE_CLIPS`, `VOICE_TEXT`, `VoiceMedia`, интро для жюри), [demo.md](demo.md)
> (`06-demo.js`, всё внутри `#demoGame`), [styles.md](styles.md), [build.md](build.md)
> (`assets/build-media.js` собирает `08b`).

## Коротко

`index.html` — весь DOM страницы: экран загрузки, титульное меню, терминал питча
(шапка, боковое меню, сцена слайда, канал Элис), оверлей демо-игры, чек-лист жюри и
список из 24 скриптов. `02-slides.js` — тексты шести слайдов на четырёх языках
(`ru`, `en`, `tj`, `tj_col`) в виде HTML-строк. `07-deck.js` рисует слайд, печатает
заголовок «машинкой», листает слайды кнопками и клавишами, крутит счётчики в шапке.
`08-alice-lines.js` — русский текст 16 реплик Элис (5 на слайды, 11 фоновых);
`08b-alice-audio.js` — их запись, 1.7 МБ base64, которую страница докачивает в фоне,
когда меню уже работает. `09-alice-stream.js` — живой канал `/dev/alice` справа от
слайда: строки чата, выбор записи под язык, проигрывание через Web Audio с фильтром
«сломанного радио», фоновое бормотание, реакция на смену слайда, бегущая строка в
поле ввода; плюс дождь на титульном экране и ссылки на элементы меню, которыми
пользуется `11-settings.js`.

Ведущий видит это так: меню и загрузка молчат; после перехода в терминал Элис
пишет три приветствия, затем раз в 2.5–5 с шепчет фоновую реплику, а при каждой
смене слайда (кроме `SLIDE_00`) громко говорит сюжетную.

## Как это работает

### Каркас `index.html`

Сверху вниз, в порядке разметки:

| Блок | Элементы | Кто управляет |
|---|---|---|
| `<head>` | `<meta charset="UTF-8">`, `<title data-i18n="page.title">`, `<meta name="viewport" content="width=device-width, initial-scale=1.0">`, `styles.css` (блокирующий), `styles-media.css` с `media="print" onload="this.media='all'"` + `<noscript>`-копия | `applyLocale()` переводит `<title>` и ставит `<html lang>` |
| `body.booting` | класс снимается в `transitionToTerminal()` | `11-settings.js`; CSS прячет по нему чек-лист и CRT-слои |
| `#loadingOverlay` | `.load-crashlines`, `.load-logo`, `#loadBar` › `#loadFill`, `#loadMeta` › `#loadStatus` + `#loadPct`, `#loadLog`, `#loadSkip` | `startNewGame()` / `runLoadingSequence()` в `11-settings.js` |
| `#bootscreen` | `.boot-cave`, `#bootRain`, `.boot-crystal` (SVG с градиентом `#cg`), `.boot-scan`, `.boot-status`, `.boot-version`, `.boot-titleblock`, `#bootMenu` с пятью `button.boot-btn[data-action=play\|load\|settings\|extra\|exit]`, `.boot-brand` с `#bootBrand` (`assets/brand-mark.svg`) и `assets/brand-wordmark.svg` | ссылки на элементы — в `09`, обработчики — в `11-settings.js` |
| `#bootPopupBack` › `#bootPopup[role=dialog]` | `#bootPopupClose`, `#bootPopupTitle`, `#bootPopupBody` | один попап на ЗАГРУЗИТЬ / НАСТРОЙКИ / ЭКСТРА / ВЫХОД (`openPopup()` в `11`) |
| `#bootOverload` | пустой слой вспышки | класс `.on` в `transitionToTerminal()` |
| `#shell` › `header.topbar` | `#uptime`, `#integrity`, подпись `/dev/alice` | `tick()` в `07` |
| `nav#menu` | шесть `button.slide-btn[data-slide=0..5][data-i18n=nav.slide_0N]`, `.menu-foot` с подсказкой `menu.controls_html` («← → или 1..6») | `07` (клик, `.active`), `13-mobile.js` (лента на телефоне) |
| `main#stage.stage[tabindex=0]` | `.breadcrumb` › `#crumb`; `h1#slideTitle` › `span.index` + `#slideTitleText`; `#slideSub`; `.divider`; `#slideBody` (до первого рендера — `p[data-i18n=main.loading]`) | `renderSlide()`; `stageEl` (тот же `#stage`) объявлен в `06-demo.js`; свайпы — `13-mobile.js` |
| `section.alice` | `.alice-head` с `#sanity` и `#packets`; `#aliceStream[aria-live=polite]`; `.alice-input` с `#fakeCmd` и `.fake-caret` | `09` (чат, бегущая строка), `07` (`tick()`, `packetsEl`) |
| `#demoGame.demo-game[role=dialog][aria-hidden=true]` | `#dgClose`; шесть `.dg-stage[data-stage=boot\|diff\|void\|osboot\|desk\|end]`; внутри — карточки `[data-diff]`, `canvas#dgVoidCanvas`, фазы `[data-phase=post\|kernel\|splash\|shell]`, док `#dgDock` с `[data-app=files\|editor\|system\|logs\|alice\|terminal]`, `#dgWinLayer`, редактор `#dgEditor` и т. д. | целиком `06-demo.js`, см. [demo.md](demo.md) |
| 24 `<script defer>` | строки 542–572 | порядок — ниже |
| `aside#jury` | `#juryTab`, `#juryPanel`, `#juryList`, `#juryDone`, `#juryTotal`, `#juryPct`, `#juryFill`, `#juryReset`, `#juryClose` | `12-jury.js`; стоит после скриптов — им это не мешает, `defer` ждёт разбора всего документа |

Инлайн-кода в `index.html` нет, кроме `onload` у `styles-media.css`. Инлайн-стили —
мелочи: отступ в `.menu-foot`, цвет `#fakeCmd`, переменные `--h` у столбиков
`.os-spark`. Русские тексты в разметке — запасные: при загрузке их перезаписывает
`applyLocale()` по `data-i18n` / `data-i18n-html` / `data-i18n-aria` / `data-i18n-title`.

Элементы с `id`, которые ни один скрипт не ищет: `cg` и `osg` (градиенты SVG, на них
ссылается `url(#…)`), `bootBrand`, `dgOsPanelHost`, `dgDeskAnomalyChip`,
`dgDeskVolumeChip`, `dgDeskNudge`, `dgEdPrompt`, `juryPanel` и `juryHead` (цели
`aria-controls` / `aria-labelledby`).

### Порядок скриптов и почему он такой

```
00-voice-clips  00-voice-text  00-voice-sync   ← только таблицы; читаются в момент вызова
01-audio                                       ← Audio, VoiceBus: нужны всем, ни от кого не зависят
02-slides                                      ← чистые данные
03-alice-voice 04-void-scene 05-void-os 06-demo   ← демка; 06 объявляет stageEl
07-deck                                        ← на загрузке: DOM, pad2, tick(); SLIDES/stageEl — при вызове
08-alice-lines                                 ← данные
09-alice-stream                                ← на загрузке: stampVoiceIds() читает 08, buildRain() — DOM
10-i18n 11-settings                            ← 11 при загрузке вешает обработчики на bootMenu/popupBack (09)
                                                  и зовёт bootEverything() → boot() (09) → renderSlide() (07)
12-jury 13-mobile 14-jury-cues 15…21           ← всё, что 07/09/11 трогают только через typeof
```

Жёсткие зависимости во время загрузки, которые этот порядок держит:

1. `09` после `08`: `stampVoiceIds()` выполняется сразу и пишет `voiceId` в объекты
   `ALICE_STORY_LINES` / `ALICE_BG_LINES`. Обёрнуто в `try`, так что без `08` страница
   не упадёт, но у реплик не будет идентификаторов.
2. `11` после `07` и `09`: `bootEverything()` в `11-settings.js` вызывается прямо при
   выполнении файла (DOM к этому моменту уже разобран — `defer`) и зовёт `boot()` →
   `renderSlide(0)`. Там же `bootMenu.addEventListener(…)`, `popupClose.addEventListener(…)`
   — константы из `09`.
3. `07` ничего не берёт у более поздних файлов на верхнем уровне: `aliceReact`,
   `ensureEvidenceButton`, `t` вызываются только внутри функций.

Остальное — в [README.md](README.md) и `docs/ARCHITECTURE.md`, раздел «Порядок и
зависимости».

### Слайды: схема данных

```js
SLIDES_BY_LOCALE = {
  ru:     [ slide × 6 ],   // строки 24–335, канон
  en:     [ slide × 6 ],   // 336–647
  tj:     [ slide × 6 ],   // 648–959, литературный таджикский
  tj_col: [ slide × 6 ],   // 960–1271, разговорный
};
slide = {
  id:    "SLIDE_00" … "SLIDE_05",  // одинаковый во всех языках; по нему ищется реплика Элис
  title: "ВЫЗОВ СИСТЕМЕ",           // печатается машинкой в #slideTitleText
  sub:   "// …",                    // #slideSub, textContent
  body:  `…HTML…`,                  // #slideBody, innerHTML как есть
};
let SLIDES = SLIDES_BY_LOCALE.ru;   // applyLocale() перепривязывает
```

| `id` | `title` (ru) | Сюжетная реплика |
|---|---|---|
| `SLIDE_00` | ВЫЗОВ СИСТЕМЕ | нет |
| `SLIDE_01` | СМЕРТЬ БАЗОВЫХ ЗНАНИЙ | `deck.slide01` |
| `SLIDE_02` | ВЫБОР СЛОЖНОСТИ = ВЫБОР ЦЕНЫ | `deck.slide02` |
| `SLIDE_03` | ALICE_CORE :: АВТОНОМНЫЙ ИИ | `deck.slide03` |
| `SLIDE_04` | ТЕРМИНАЛ СОПРОТИВЛЯЕТСЯ | `deck.slide04` |
| `SLIDE_05` | РОАДМАП & БИЗНЕС | `deck.slide05` |

Подписи в боковом меню (`01 // ПРОБЛЕМАТИКА` и т. д.) — не `title` слайда, а строки
`nav.slide_0N` из `10-i18n.js`. Это два разных источника.

`body` собирается из повторяющихся блоков; их вид задаёт `styles.css`:

| Блок | Разметка | Где |
|---|---|---|
| сравнение | `.contrast` › `.pane.old` / `.pane.new` › `h3`, `pre.ascii`, `ul` | `SLIDE_00` |
| выноска | `.callout`, `.callout.green`, `.callout.amber`, первая фраза в `<strong>` | на всех слайдах, по 1–2 |
| цифры | `.statgrid` › `.statcard[.tone-plum\|amber\|slime\|cyan]` › `.lbl` + `.val` + `.unit` | 01, 03, 05 |
| ASCII-схема | `pre.ascii[.blood\|.cyan.offline-diagram]` с подписью `span.lbl` | 00–03 |
| код | `p.codeblock` (переносы строк — в самой строке, цвет — инлайн `var(--warn)` / `var(--blood)`) | 01, 03, 04, 05 |
| лестница | `.timeline` › `.tl-step` › `span.tl-tag` + текст | 02–05 |
| кнопка демки | `.demo-cta-wrap` › `p.demo-cta-lead`, `button#demoCtaBtn.demo-cta-btn[onclick="window.__openDemoGame && window.__openDemoGame('slide02')"]`, `p.demo-cta-note` | 02 |
| дашборд B2B | `.edtech` › `.kpi` › `.cell.tone-*`; `.bars` › `.bar` › `.name` + `.track` › `.fill[style="--end:NN%"]` + `.pct` | 05 |
| QR | `.qr-block[data-qr-block]` › `.qr-slot[data-qr-slot]#qrSlotMain` › `img[src=assets/qr-terminal-shattered.png]`, `.qr-caption` | 05 |
| заметки ведущего | `details.spk` › `summary` + `.spk-body` | ровно один на слайд, 24 всего |

Атрибуты `data-qr-block`, `data-qr-slot` и `id="qrSlotMain"` скрипты не читают — это
метки для CSS и ручной замены картинки. `id="demoCtaBtn"` и `id="qrSlotMain"`
повторяются в четырёх языках, но в DOM одновременно живёт только один слайд.

Как править: текст — прямо в шаблонной строке нужного языка; структуру блоков
держать одинаковой во всех четырёх массивах. Новый слайд требует правки в трёх местах
кроме данных — см. «Подводные камни».

### Рендер слайда

`renderSlide(i, opts)`:

1. `SLIDES[i]`; нет такого — выход. `current = i`.
2. `.active` на `i`-й кнопке `button.slide-btn`.
3. `#crumb` ← `slide.id`; `span.index` ← `"[" + pad2(i) + "]"` — номер совпадает с
   нумерацией в меню (`00…05`).
4. `animateTitle(slide.title)`.
5. `#slideSub.textContent` ← `sub`, `#slideBody.innerHTML` ← `body`.
6. `SLIDE_02` → `ensureDemoCta(slideBody)`; `SLIDE_05` → `ensureEvidenceButton(slideBody)`
   из `17-evidence.js`, если он загружен.
7. Перезапуск CSS-анимации `.swap-anim`: снять класс, прочитать `offsetWidth`
   (принудительный reflow), поставить снова.
8. `stageEl.scrollTop = 0`.
9. Без `opts.silent` — `aliceReact(slide)`.

Заголовок печатается по одному символу раз в 28 мс; пока строка не допечатана, с
вероятностью 0.35 в хвост добавляется случайный символ из `"01░▒▓<>/\\#$@*█▌"`. Последний
тик ставит чистый текст и снимает класс `.typer` (курсор).

Кто листает:

| Источник | Что делает |
|---|---|
| клик по `button.slide-btn` | `renderSlide(data-slide)`, если это не текущий |
| `keydown` на `document` | `→`/`↓` — следующий, `←`/`↑` — предыдущий (по кругу), `1`…`6` — прямой переход; при `window.__demoActive` — ничего |
| свайп по `#stage` (`13-mobile.js`) | ≥ 55 px по горизонтали, ≤ 800 мс, `|dx| ≥ 1.6·|dy|` |
| `applyLocale()` (`10-i18n.js:2147`) | `renderSlide(current, { silent: true })` — тот же слайд на новом языке, без реплики |
| `boot()` (`09`) | `renderSlide(0, { silent: true })` при старте |

Шапка: `tick()` раз в секунду пишет `UPTIME` (`ЧЧ:ММ:СС` от `startedAt`),
`INTEGRITY` = 30 + 10·sin(t/6) + rand·4 % и `SANITY` = 45 + 8·sin(t/4 + 1.2) + rand·3 %.
Это декорация, ни с чем не связанная. `PACKETS` растёт на 1 с каждой строкой чата
(`pushAliceLine()`).

### Реплики Элис: данные и идентификаторы

```js
ALICE_STORY_LINES = { SLIDE_01: { text }, …, SLIDE_05: { text } };  // 5 шт., ключ = slide.id
ALICE_BG_LINES    = [ { text }, … ];                                  // 11 шт.
```

После загрузки `09` объекты дополняются полями:

| Поле | Кто пишет | Значение |
|---|---|---|
| `voiceId` | `stampVoiceIds()` при загрузке `09` | `deck.slide01…05` (из ключа `SLIDE_0N`), `deck.bg01…11` (из позиции в массиве, с ведущим нулём) |
| `audio` | `aliceAudioArrived()` после загрузки `08b` | base64 MP3 без префикса `data:` |

`voiceId` — ключ во всех таблицах озвучки: `VOICE_CLIPS[locale][id]` (своя запись
языка), `VOICE_TEXT[locale][id]` (перевод субтитра), `ALICE_AUDIO[id]` (вшитая русская
запись), `assets/audio/ru/masters/deck.<id>.mp3` (оригинал). Порядок `ALICE_BG_LINES`
поэтому значим: вставка в середину сдвинет `deck.bgNN` у всех следующих реплик и они
получат чужие записи.

Текст в `08-alice-lines.js` правит студия озвучки (`voice/lib.js` находит строку
`text:` под ключом и сверяет перед записью) — см. [voice.md](voice.md).

### Пакет записей `08b-alice-audio.js`

```js
window.ALICE_AUDIO = {
  "deck.slide01": "SUQzBAAAAA…",   // base64 MP3, начинается с "ID3"
  …                                 // 16 ключей: deck.slide01…05, deck.bg01…11
};
if (typeof aliceAudioArrived === "function") aliceAudioArrived();
```

Генерируется `node assets/build-media.js` из `assets/audio/ru/masters/deck.*.mp3`:
ffmpeg, моно, 44.1 кГц, 64 кбит/с, без метаданных; сначала слайды, потом фон. Около
1.3 МБ MP3 → 1.74 МБ base64. Руками не правится. Самая длинная запись — `deck.slide02`
(~296 тыс. символов base64), самая короткая — `deck.bg11` (~43 тыс.).

Жизненный цикл загрузки (`aliceAudioState`):

```
idle ──loadAliceAudio()──► loading ──<script> выполнился──► ready
  ▲                           │        (aliceAudioArrived)
  └──── через 8 с ◄── failed ◄┘ onerror
```

`loadAliceAudio()` вызывают:

1. `DOMContentLoaded` + 1200 мс — если интро для жюри не держит канал
   (`window.__juryIntroHoldsLink`);
2. `releaseLink()` в `16-jury-intro.js` — когда скачан акт 1 интро, а если интро уже
   идёт — с акта 4;
3. `applyLocale()` при смене языка (`10-i18n.js:2098`), если канал свободен;
4. `transitionToTerminal()` (`11-settings.js:536`) — всегда, при входе в терминал.

Каждый вызов сначала запускает `warmDeckTakes()`, затем проверяет `deckNeedsBaked()`:
если в текущем языке у каждой реплики есть своя запись, русский пакет не качается
вовсе.

### Выбор звука и текста для реплики

```
voiceTextFor(p)  → VOICE_TEXT[locale][p.voiceId]  или  p.text (русский)

voiceSrcFor(p)   → своя запись языка: deckWarm[url] (blob:) или url из VOICE_CLIPS[locale]
                   иначе вшитая русская p.audio как data:audio/mpeg;base64,…
                         — только если voiceTextFor(p) === p.text (субтитр тоже русский)
                         — и только если aliceRecordingFor(p.text) её видит
                   иначе null  → реплика идёт только текстом
```

Чужой язык не подставляется никогда: у `en` без английской записи и с английским
субтитром реплика молчит, а не говорит по-русски.

Фоновая докачка своих записей (`warmDeckTakes()`): только по `http(s)`, по одной,
`fetch(url)` → `blob` → `URL.createObjectURL` в `deckWarm[url]`. Список нужных
(`wanted()`) перечитывается перед каждой загрузкой — язык мог смениться на середине.
Уже пробованные URL помечаются в `deckTried` и больше не запрашиваются; запись,
перезаписанная в студии, приходит с новым `?v=` и считается новой. Пока
`__juryIntroHoldsLink`, очередь останавливается; `releaseLink()` → `loadAliceAudio()` →
`warmDeckTakes()` запускает её снова.

### Проигрывание: `playAliceVoice(p, opts)`

```
playAliceVoice(p, {channel})
  ├─ нет p.text / __chatterEnabled === false / __voiceMediaHold / __demoActive
  │  / !pitchTerminalActive                         → null, ни текста, ни звука
  ├─ settingsState.sfxOn === false                  → только строка чата
  ├─ isAliceSpeaking()                              → null (фон не перебивает)
  ├─ pushAliceLine(voiceTextFor(p))                 → строка в чат
  ├─ voiceSrcFor(p) === null                        → только строка
  ├─ VoiceBus.acquire("sample", stopCurrentVoice, {interrupt:true}) не дал → только строка
  ├─ <audio> через document.createElement, playbackRate = profile.pitchBase
  ├─ Web Audio, если контекст running и есть Audio.getVoiceNode():
  │     src(MediaElementSource) → profile.buildGraph(ctx) → gain(gainMul) → voiceNode
  │  иначе: audio.volume = master×voice×gainMul, опрос громкости раз в 200 мс
  ├─ glitch-драйвер по GLITCH_PROFILES[settingsState.voiceGlitch]
  └─ audio.play(); не загрузилось до начала → retryOrEnd(): один повтор —
     fetch(url) → blob: на тот же элемент; второй сбой, data:/blob:, отказ
     NotAllowedError → cleanup()
```

Два канала (`VOICE_PROFILES`):

| Канал | Кто | `gainMul` | `pitchBase` | Граф |
|---|---|---|---|---|
| `bg` | `aliceLoop()` | 0.32 | 0.95 | highpass 240 Гц → lowpass 1250 Гц → peaking 550 Гц −6 дБ → highshelf 3 кГц −18 дБ → сухая ветка 0.85 + задержка 90 мс с обратной связью 0.28 и мокрой веткой 0.45 → `merge`. «Шёпот из другой комнаты». Для глитча качается `lp`. |
| `story` | `aliceReact()` | 0.95 | 1.00 | highpass 380 Гц → lowpass 2800 Гц → peaking 1600 Гц Q 2 +5 дБ → WaveShaper (tanh, `amt` 0.35, 1024 точки, `oversample "2x"`) → gain 0.92. «Сломанное радио». Для глитча качается `peak`. |

Глитч (`GLITCH_PROFILES`, уровень из настроек `voiceGlitch`, по умолчанию `subtle`):

| Профиль | Колебание фильтра | Тремоло | Дрожь скорости | Провалы |
|---|---|---|---|---|
| `off` | 0 | 0 | 0 | нет |
| `subtle` | ±10 % частоты, 0.45 Гц | 6 %, 0.30 Гц | ±0.012 | нет |
| `heavy` | ±25 %, 0.9 Гц | 15 %, 0.6 Гц | ±0.025 | 95 мс раз в 4.2 с (×0.7…1.3) |

Механика глитча, ни одного прыжка по `currentTime`:

1. **Колебание фильтра и тремоло** — `scheduleChunk()` строит две кривые по 64 точки
   на 4 с вперёд и ставит их `setValueCurveAtTime` на частоту `wobble`-фильтра и на
   усиление реплики; таймер перезапускает раз в 3.9 с, чтобы кривые шли встык. Фаза
   считается от `chunkIdx`, поэтому синусоида не рвётся между кусками.
2. **Дрожь скорости** — раз в 320–600 мс `playbackRate = pitchBase ± pitchJitter`,
   зажато в 0.7…1.4.
3. **Провалы** (`heavy`) — `dropFn()` опускает усиление до 0 за 8 мс, держит, через
   `dropoutLenMs` возвращает; `armDrop()` перевзводит себя через
   `dropoutEveryMs × (0.7…1.3)`.
4. Строка чата получает `.glitch` при создании (`pushAliceLine(…, { glitch })`). Ветка
   «у графа нет `wobble` — перезапускать класс раз в 0.8–1.4 с» в коде есть, но оба
   профиля `wobble` отдают, так что сейчас она не срабатывает.

Без графа (контекст не запущен, `buildGraph` упал) остаются только дрожь скорости и
однократный `.glitch` на строке; колебание фильтра, тремоло и провалы требуют узлов
Web Audio.

Остановка: `stopCurrentVoice()` (снаружи, при смене реплики, при выключении звука)
или `cleanup()` (по `ended`/`pause` после конца; по `error` и отказу `play()` — через
`retryOrEnd()`, когда повторять уже нечего). Обе гасят таймеры, снимают `.glitch`,
отключают **все** узлы графа.

### Циклы и гейты

| Цикл | Период | Условие работы |
|---|---|---|
| `aliceLoop()` | 2.5–5 с, перезапускает себя всегда | `pitchTerminalActive`, не `__demoActive`, `__chatterEnabled !== false`, Элис не говорит; случайная реплика из `ALICE_BG_LINES`, канал `bg` |
| `aliceReact(slide)` | на каждый `renderSlide` без `silent` | `pitchTerminalActive`, у слайда есть сюжетная реплика; прерывает фоновую, канал `story` |
| `fakeCmdLoop()` | печать 80–140 мс/символ, стирание 35 мс, пауза 1.4 с на полной строке | всегда; ни от чего не зависит |
| `tick()` (`07`) | 1 с | всегда |

Флаги, которые глушат канал:

| Флаг | Владелец | Действие здесь |
|---|---|---|
| `pitchTerminalActive` | `09`, включает `transitionToTerminal()` | `false` в меню и на экране загрузки: ни текста, ни звука реплик (приветствия `boot()` идут мимо) |
| `window.__demoActive` | `06-demo.js` | молчит канал, не листаются слайды с клавиатуры и свайпом |
| `window.__voiceMediaHold` | `15-voice-media.js` | новая реплика не начинается, пока играет длинная дорожка |
| `window.__chatterEnabled` | `11-settings.js` (`hints !== "off"`), `06`, `17`, `20`, `21` временно выключают | `false` — ни текста, ни звука; идущая реплика гасится опросом раз в 200 мс |
| `settingsState.sfxOn` | `11-settings.js` | `false` — текст без звука; идущая реплика гасится опросом |
| `window.__juryIntroHoldsLink` | `16-jury-intro.js` | откладывает пакет `08b` и останавливает `warmDeckTakes()` |

### Титульный экран

`buildRain()` при загрузке кладёт в `#bootRain` 28 `<span>` со случайными `left`
(0–100 %), длительностью анимации 2.5–6 с, отрицательной задержкой до 4 с (капли
сразу в разных фазах), прозрачностью 0.25–0.75 и высотой 10–32 px. Падение — CSS.
Константы `bootscreen`, `bootOverload`, `bootRain`, `bootMenu`, `popupBack`,
`popupTitle`, `popupBody`, `popupClose` объявлены здесь, а пользуются ими
`11-settings.js` и `10-i18n.js`.

## Почему так, а не иначе

1. **Записи реплик грузятся после того, как меню заработало.** Очевидно было бы
   подключить их обычным `<script defer>` рядом с остальными. Так и было, и `defer`
   держал всю цепочку: ни одна кнопка на странице не работала, пока 1.7 МБ не скачаются,
   — на мобильном канале 1 Мбит/с около семнадцати секунд
   ([09-alice-stream.js:151](../../js/presentation/09-alice-stream.js#L151),
   [08-alice-lines.js:4](../../js/presentation/08-alice-lines.js#L4)). Телефоны жюри в
   Таджикистане — ровно такой канал. Теперь пакет вставляется динамическим `<script>`
   через 1.2 с, а до его прихода реплика идёт текстом — тот же путь, что у реплики без
   записи.

2. **Пакет ждёт акт 1 интро для жюри.** Интро — первое, что слышит зал, поэтому
   канал отдаётся ему целиком: пока `__juryIntroHoldsLink`, пакет и фоновая докачка
   стоят ([09-alice-stream.js:165](../../js/presentation/09-alice-stream.js#L165),
   [16-jury-intro.js:85](../../js/presentation/16-jury-intro.js#L85)).

3. **Запись — base64 внутри скрипта, а не отдельные MP3.** С `file://` отдельный файл
   для Web Audio — ресурс чужого источника, и `MediaElementSource` за ним выдаёт
   тишину; реплики же идут через граф «сломанного радио». У `data:`-URL источника нет
   ([build-media.js:64](../../assets/build-media.js#L64)). Плата — +33 % к размеру
   и невозможность кешировать записи по одной.

4. **`window.ALICE_AUDIO = …`, а не `const`.** Повторная вставка скрипта (повтор после
   ошибки, смена языка) не должна падать на повторном объявлении
   ([08b-alice-audio.js:9](../../js/presentation/08b-alice-audio.js#L9)). Вызов
   `aliceAudioArrived()` обёрнут в `typeof`, потому что тот же файл исполняет в
   песочнице `vm` студия (`voice/lib.js`, функция `bundle()`), где `09` нет.

5. **Русский пакет не качается, если у языка есть все свои записи.** Иначе 1.7 МБ
   мёртвого веса на слабом канале ([09-alice-stream.js:172](../../js/presentation/09-alice-stream.js#L172)).
   Проверяет `deckNeedsBaked()`; при обратной смене языка на русский
   `applyLocale()` снова зовёт `loadAliceAudio()`, и пакет докачивается.

6. **Чужой язык голоса не играется никогда.** Можно было бы при отсутствии записи
   падать на русскую. Для коротких реплик выбрано молчание: «неправильный голос хуже,
   чем никакой» ([09-alice-stream.js:214](../../js/presentation/09-alice-stream.js#L214)).
   Вшитая русская запись допускается, только пока субтитр тоже русский
   ([09-alice-stream.js:271](../../js/presentation/09-alice-stream.js#L271)), — голос и
   текст на экране всегда одного языка. Длинные дорожки (`VoiceMedia`) решают иначе и
   падают на русский: три минуты тишины перед жюри хуже русского голоса (см.
   `docs/ARCHITECTURE.md`, «Озвучка»).

7. **Реплики найдены по `voiceId`, а не по тексту.** Поиск по строке терял бы запись
   после первой правки копирайта, и пришлось бы протаскивать id через каждый вызов.
   Поэтому id проставляется на объект один раз при загрузке
   ([09-alice-stream.js:133](../../js/presentation/09-alice-stream.js#L133)), а
   расхождение текста и записи ловит студия по хешу текста (`voice/stamps.json`).

8. **Но `aliceRecordingFor()` ищет по тексту.** Это не для колоды, а для демо:
   `AliceVoice` (`03`) знает только произносимую строку, и единственный вопрос — «есть
   ли у этих слов настоящая запись». Если есть, синтез речи молчит: запись и робот не
   должны произносить одни и те же слова
   ([09-alice-stream.js:88](../../js/presentation/09-alice-stream.js#L88)). По
   комментарию, сейчас это ни на что не влияет: записи покрывают только колоду; ценность
   в том, что правило стало структурным. Ключ нормализуется (`_aliceRecKey()`: регистр,
   пробелы, пунктуация), чтобы мелкая разница в кавычках не ломала совпадение.

9. **Свои записи языка качаются в фоне в `blob:`.** Сначала их брали по требованию — на
   слабом канале строка появлялась и молчала, пока файл полз
   ([09-alice-stream.js:231](../../js/presentation/09-alice-stream.js#L231)). По одной —
   чтобы не делить и без того узкий канал между 16 запросами; по коду видно, что
   `wanted()` перечитывается на каждом шаге именно ради смены языка на ходу. `blob:` того
   же источника, что и страница, поэтому граф Web Audio его слышит.

10. **Элис молчит в меню и на экране загрузки.** `pitchTerminalActive` включается
    только в `transitionToTerminal()`
    ([09-alice-stream.js:62](../../js/presentation/09-alice-stream.js#L62)). В меню
    своя музыка и интро, а реплика из-под титульного экрана звучала бы «ниоткуда».
    Вероятно, ещё и из-за автозапуска: к моменту входа в терминал по меню уже кликнули,
    и `AudioContext` разблокирован — комментарий у графа прямо на это рассчитывает
    ([09-alice-stream.js:541](../../js/presentation/09-alice-stream.js#L541)).

11. **Элис молчит в демке и под длинной дорожкой.** В демке её болтовня спорила бы со
    звуками игры (компиляция, призраки, голос на HARD)
    ([09-alice-stream.js:489](../../js/presentation/09-alice-stream.js#L489)). Под
    интро, тестом голоса, «Взаперти» и видео апробации реплика забрала бы `VoiceBus` с
    `interrupt` и оборвала дорожку на полуслове
    ([09-alice-stream.js:484](../../js/presentation/09-alice-stream.js#L484)).

12. **Граф подключается только к запущенному `AudioContext`.**
    `createMediaElementSource()` забирает выход элемента навсегда; на приостановленном
    контексте граф заморожен, и реплика ушла бы в тишину без возврата. Поэтому
    `Audio.resume()` просится, но эта реплика идёт по пути громкости элемента, а граф
    получит следующая ([09-alice-stream.js:548](../../js/presentation/09-alice-stream.js#L548)).

13. **Сначала строится цепочка фильтров, потом захватывается элемент.** `buildGraph`
    может бросить; если элемент уже захвачен, он принадлежит осиротевшему узлу, и
    `audio.volume` в запасной ветке ничего не даёт — реплика молчит
    ([09-alice-stream.js:560](../../js/presentation/09-alice-stream.js#L560)).

14. **Отключается вся цепочка, а не только хвост.** В профиле `bg` есть цикл
    `delay → fbk → delay`; узел в цикле не собирается сборщиком, пока подключён, — это
    была живая петля обратной связи плюс отвязанный `<audio>` на каждую реплику на всё
    время жизни страницы ([09-alice-stream.js:307](../../js/presentation/09-alice-stream.js#L307)).

15. **`cleanup()` проверяет, что элемент ещё «свой».** Сюжетная реплика прерывает
    фоновую через `src = ""`; событие `error` старого элемента приходит позже и без
    проверки снесло бы только что построенный граф новой
    ([09-alice-stream.js:602](../../js/presentation/09-alice-stream.js#L602)).

16. **Глитч никогда не двигает `currentTime`.** Прыжки рвут разборчивость. Вместо них —
    модуляция частоты фильтра, усиления и скорости и короткие провалы громкости, под
    которыми воспроизведение идёт дальше
    ([09-alice-stream.js:432](../../js/presentation/09-alice-stream.js#L432),
    [09-alice-stream.js:696](../../js/presentation/09-alice-stream.js#L696)).

17. **Громкость без графа = общая × голос.** Раньше бралась громкость эффектов: ползунок
    «Голос» без Web Audio ничего не делал, а ползунок эффектов двигал Элис
    ([09-alice-stream.js:291](../../js/presentation/09-alice-stream.js#L291)).

18. **`document.createElement("audio")`, а не `new Audio()`.** `01-audio.js` объявляет
    `const Audio` — свою обёртку над Web Audio, которая закрывает встроенный конструктор
    ([09-alice-stream.js:525](../../js/presentation/09-alice-stream.js#L525)).

19. **Один голос за раз через `VoiceBus`.** `isAliceSpeaking()` видит только
    `<audio>`, а синтез речи из `03` — нет; поэтому очередь решается на общей шине, где
    запись (`"sample"`) всегда перебивает синтез (`"speech"`)
    ([01-audio.js:424](../../js/core/01-audio.js#L424)).

20. **`renderSlide(…, { silent: true })`.** Смена языка перерисовывает текущий слайд, но
    не должна заново запускать его сюжетную реплику
    ([10-i18n.js:2145](../../js/core/10-i18n.js#L2145)); стартовый рендер в `boot()` —
    тоже, Элис ещё за титульным экраном.

21. **Клавиатура колоды глохнет при `__demoActive`.** Иначе ввод в терминале игры и
    стрелки в редакторе листали бы слайды под оверлеем
    ([07-deck.js:146](../../js/presentation/07-deck.js#L146)).

22. **`ensureDemoCta()` — страховка.** Сейчас кнопка демки вшита в `SLIDE_02` всех четырёх
    языков вместе с вводным абзацем и примечанием; функция строит запасную кнопку, только
    если её нет, — иначе потерялся бы текст вокруг и кнопка уехала бы под заметки ведущего
    ([07-deck.js:68](../../js/presentation/07-deck.js#L68)).

23. **Строки чата экранируются.** Субтитр может прийти из `VOICE_TEXT` (переводы
    набираются в студии), а строка собирается через `innerHTML` из трёх `<span>`.

24. **Две команды в бегущей строке — ключи i18n, остальные — нет.** `ps aux | grep void`,
    `gdb ./neikon core` — словарь машины, он не переводится; человеческие слова
    (`alice.cmd.memories`, `alice.cmd.here`) берутся через `t()` в момент печати, поэтому
    следуют смене языка.

25. **Приветствия `alice.open1…3` читаются в момент вставки,** а не при загрузке: к
    этому времени `applySettings()` уже применил сохранённый язык
    ([09-alice-stream.js:789](../../js/presentation/09-alice-stream.js#L789)).

26. **Слайды — HTML-строки в JS, а не отдельные файлы или шаблоны.** В коде причина не
    записана; вероятно, та же, что у всего проекта: с `file://` подгрузка файлов через
    `fetch` не работает, а скрипт — работает. Локаль переключается заменой одного
    массива (`SLIDES`).

27. **`styles-media.css` грузится неблокирующе.** В нём интро, плеер и тест голоса —
    до первого клика ничего из этого на экране нет, поэтому первый кадр его не ждёт
    ([index.html:8](../../index.html#L8)).

28. **Запись, которая не загрузилась, пробуется ещё раз через `fetch` в `blob:`.**
    У ведущего в Chrome стоит помощник загрузок («Скачать аудио с этой страницы»): он
    перехватывает медиа-запросы страниц по `http`, но не `file://` — по `localhost`
    строка появлялась и молчала, из `index.html` звучала. `blob:` не сетевой запрос,
    его такой перехватчик не видит; тот же элемент — значит, граф и таймеры глитча не
    строятся заново. Один повтор на реплику: сбой приходит дважды (`error` и отказ
    `play()`) и считается один раз (`failedSrc`); после начала звука и для
    `data:`/`blob:` повтора нет. Удачный повтор кладёт `blob:` в `deckWarm`, следующий
    раз реплика берёт его сразу. В консоли — `[AliceVoice] <url> не загрузился —
    повтор через fetch` ([09-alice-stream.js:640](../../js/presentation/09-alice-stream.js#L640)).
    То же делает `VoiceMedia` для длинных дорожек (повтор по голому пути).

## Связи

### Что берут из общей области

| Имя | Владелец | Кто здесь берёт | Когда |
|---|---|---|---|
| `SLIDES` | `02-slides.js` | `07` (`renderSlide`, клавиатура) | при вызове |
| `stageEl` | `06-demo.js:3656` | `07` (`renderSlide`) | при вызове |
| `window.__openDemoGame` | `06-demo.js:3640` | `onclick` кнопки демки в `SLIDE_02` и в `ensureDemoCta()` | по клику, с проверкой `&&` |
| `aliceReact` | `09` | `07` (`renderSlide`) | при вызове |
| `ensureEvidenceButton` | `17-evidence.js` | `07` (`renderSlide`, `typeof`) | при вызове |
| `t` | `10-i18n.js` | `07` (`ensureDemoCta`), `09` (`fakeCmdLoop`, `boot`) | при вызове |
| `pad2`, `packets`, `packetsEl` | `07` | `09` (`ts`, `pushAliceLine`) | при вызове |
| `renderSlide` | `07` | `09` (`boot`) | при вызове |
| `ALICE_STORY_LINES`, `ALICE_BG_LINES` | `08` | `09` | **при загрузке** (`stampVoiceIds`) и при вызове |
| `window.ALICE_AUDIO` | `08b` | `09` (`aliceAudioArrived`) | после вставки пакета |
| `aliceAudioArrived` | `09` | `08b` (последняя строка, `typeof`) | при выполнении пакета |
| `VOICE_CLIPS` | `00-voice-clips.js` (перезаполняет `00-voice-sync.js`) | `09` (`voiceClipUrl`, `typeof`) | при вызове |
| `VOICE_TEXT` | `00-voice-text.js` (то же) | `09` (`voiceTextFor`, `typeof`) | при вызове |
| `settingsState` | `11-settings.js` | `09`: `locale`, `sfxOn`, `volMaster`, `volVoice`, `voiceGlitch` (`typeof`) | при вызове |
| `Audio` | `01-audio.js` | `09`: `getContext()`, `getVoiceNode()`, `resume()` | при вызове |
| `VoiceBus` | `01-audio.js` | `09`: `acquire("sample", …)`, `releaseIf("sample")` | при вызове |
| `window.__demoActive`, `__chatterEnabled`, `__voiceMediaHold`, `__juryIntroHoldsLink` | `06`, `11`, `15`, `16` | `07`, `09` | при вызове |

### Что отдают

| Имя | Файл | Кто пользуется |
|---|---|---|
| `SLIDES_BY_LOCALE` | `02` | `10-i18n.js:2142` (`applyLocale`) |
| `SLIDES` (`let`, перепривязывается) | `02` | `07`, `10-i18n.js:2143` (пишет), `11-settings.js:549,556`, `13-mobile.js:113` |
| `renderSlide` | `07` | `09` (`boot`), `10-i18n.js:2147`, `13-mobile.js:115` |
| `current` | `07` | `10-i18n.js:2144`, `11-settings.js:549,556`, `13-mobile.js:115` (только читают) |
| `animateTitle` | `07` | `11-settings.js:549` (`transitionToTerminal`) |
| `pad2` | `07` | `09` (`ts`). В `06-demo.js` своя `edPad2()` — имя `pad2` уже занято |
| `packets`, `packetsEl` | `07` | `09` (`pushAliceLine`) |
| `ALICE_STORY_LINES`, `ALICE_BG_LINES` | `08` | `09`; `11-settings.js:415` (список записей в попапе «Голос»); `voice/lib.js:110` (студия читает файл в `vm`) |
| `window.ALICE_AUDIO` | `08b` | `09`; `voice/lib.js:165` (`bundle()`) |
| `loadAliceAudio` | `09` | `10-i18n.js:2098`, `11-settings.js:536`, `16-jury-intro.js:92` |
| `aliceAudioArrived` | `09` | `08b` |
| `aliceReact` | `09` | `07`, `11-settings.js:556` |
| `setPitchTerminalActive` | `09` | `11-settings.js:555` |
| `aliceHasRecording` | `09` | `03-alice-voice.js:258` (`AliceVoice.speak()`) |
| `stopCurrentVoice` | `09` | `06-demo.js:1473` (`silenceTheDeck`); `VoiceBus` как функция остановки владельца |
| `boot` | `09` | `11-settings.js:910` (`bootEverything`) |
| `bootscreen`, `bootOverload` | `09` | `11-settings.js` (`transitionToTerminal`, `renderExitPopup`) |
| `bootMenu`, `popupClose`, `popupBody` | `09` | `11-settings.js` (обработчики, `openPopup`) |
| `popupBack`, `popupTitle` | `09` | `11-settings.js`, `10-i18n.js:2154` (перерисовка открытых настроек) |
| `escapeHtml` | `09` | никто: перекрыта одноимённой функцией `11-settings.js:496` (см. «Подводные камни») |

Внутренние, наружу не используются: `titleText`, `slideSub`, `slideBody`, `crumb`,
`indexEl`, `buttons`, `ensureDemoCta`, `titleTimer`, `randomChar`, `uptimeEl`,
`integrityEl`, `sanityEl`, `startedAt`, `tick` (`07`); всё остальное в `09`, включая
`aliceRecordingFor`, `playAliceVoice`, `voiceSrcFor`, `voiceTextFor`, профили и таймеры.
Совпадения имён `tick`/`current…` в других файлах — локальные функции внутри модулей
(`17-evidence.js`, `06-demo.js`), с этими не конфликтуют.

## Константы и состояние

### `02-slides.js`

| Имя | Значение / тип | Смысл | Пишет / читает |
|---|---|---|---|
| `SLIDES_BY_LOCALE` | `{ ru, en, tj, tj_col }`, по 6 объектов `{ id, title, sub, body }` | тексты слайдов | никто не пишет / `10` |
| `SLIDES` | `let`, массив из `SLIDES_BY_LOCALE` | активный язык колоды | `applyLocale()` (`10`) / `07`, `11`, `13` |

### `07-deck.js`

| Имя | Значение / тип | Смысл | Пишет / читает |
|---|---|---|---|
| `titleText` | `#slideTitleText` | текст заголовка | `animateTitle` |
| `slideSub` | `#slideSub` | подзаголовок | `renderSlide` |
| `slideBody` | `#slideBody` | тело слайда | `renderSlide` |
| `crumb` | `#crumb` | `SLIDE_0N` в хлебных крошках | `renderSlide` |
| `indexEl` | `#slideTitle .index` | `[0N]` перед заголовком | `renderSlide` |
| `buttons` | массив `button.slide-btn` | кнопки бокового меню, индекс = номер слайда | `renderSlide`, обработчики клика |
| `current` | `let`, число 0…5 | текущий слайд | `renderSlide` / `07`, `10`, `11`, `13` |
| `titleTimer` | `let`, id `setInterval` или `null` | идущая печать заголовка | `animateTitle` |
| `uptimeEl`, `integrityEl`, `sanityEl`, `packetsEl` | `#uptime`, `#integrity`, `#sanity`, `#packets` | счётчики шапки и канала | `tick`, `pushAliceLine` |
| `startedAt` | `Date.now()` при загрузке | начало отсчёта `UPTIME` | `tick` |
| `packets` | `let`, число | сколько строк было в чате | `pushAliceLine` (`09`) |

### `08-alice-lines.js` и `08b-alice-audio.js`

| Имя | Значение / тип | Смысл | Пишет / читает |
|---|---|---|---|
| `ALICE_STORY_LINES` | объект `SLIDE_01…05 → { text }` | сюжетные реплики; `09` добавляет `voiceId`, `audio` | студия (текст), `09` / `09`, `11` |
| `ALICE_BG_LINES` | массив из 11 `{ text }` | фоновые реплики, порядок = `deck.bg01…11` | то же |
| `window.ALICE_AUDIO` | `{ "deck.<id>": base64 }`, 16 ключей | вшитые русские записи | `08b` / `aliceAudioArrived` |

### `09-alice-stream.js`

| Имя | Значение / тип | Смысл | Пишет / читает |
|---|---|---|---|
| `CMD_HINTS` | массив из 9: строки и `{ i18n: key }` | команды бегущей строки | — / `fakeCmdLoop` |
| `stream` | `#aliceStream` | контейнер чата | `pushAliceLine` |
| `fakeCmd` | `#fakeCmd` | бегущая строка | `fakeCmdLoop` |
| `MAX_LINES` | `4` | сколько строк держит чат | `pushAliceLine` |
| `pitchTerminalActive` | `let`, `false` | терминал питча активен — Элис можно говорить | `setPitchTerminalActive` / `playAliceVoice`, `aliceLoop`, `aliceReact` |
| `window.__pitchActive` | копия `pitchTerminalActive` | «для внешней диагностики»; никто не читает | `setPitchTerminalActive` |
| `currentVoiceAudio` | `let`, `HTMLAudioElement` или `null` | реплика, которая сейчас играет | `playAliceVoice`, `cleanup`, `stopCurrentVoice` |
| `currentVoiceGraph` | `let`, `{ source, filters[], gain, wobble }` или `null` | её граф Web Audio | то же |
| `voiceGlitchTimer` | `let`, id `setInterval` | перепланировщик кривых глитча (3.9 с) или CSS-перезапуск | то же |
| `voicePitchTimer` | `let`, id `setInterval` | дрожь `playbackRate` | то же |
| `voiceVolumeWatcher` | `let`, id `setInterval` | опрос раз в 200 мс: громкость без графа, выключение болтовни/звука | то же |
| `voiceGlitchTarget` | `let`, элемент строки | строка чата с классом `.glitch` | то же |
| `voiceDropTimer` | `let`, id `setTimeout` | следующий провал громкости (`heavy`) | то же |
| `VOICE_SRC_KEY` | `"__aliceMediaSrc"` | свойство на `<audio>` для кеша `MediaElementSource` | `playAliceVoice` |
| `_aliceRecIndex` | `let`, `Object.create(null)` или `null` | нормализованный текст → объект реплики с записью; ленивый | `aliceRecordingFor` строит, `aliceAudioArrived` сбрасывает |
| `aliceAudioState` | `let`, `"idle" \| "loading" \| "ready" \| "failed"` | загрузка `08b` | `loadAliceAudio`, `aliceAudioArrived`, `onerror` |
| `deckWarm` | `{}`, URL записи → `blob:` URL | скачанные свои записи языка | `warmDeckTakes` / `voiceClipFor` |
| `deckTried` | `{}`, URL → `true` | уже пробовали качать (успешно или нет) | `warmDeckTakes` |
| `deckWarming` | `let`, `false` | очередь докачки идёт | `warmDeckTakes` |
| `VOICE_PROFILES` | `{ bg, story }`: `gainMul`, `pitchBase`, `buildGraph(ctx)` | звук двух каналов | — / `playAliceVoice` |
| `GLITCH_PROFILES` | `{ off, subtle, heavy }`: `wobbleDepth`, `wobbleHz`, `tremoloDepth`, `tremoloHz`, `pitchJitter`, `dropoutEveryMs`, `dropoutLenMs` | сила глитча (таблица выше) | — / `currentGlitchProfile` |
| `cmdIdx` | `let`, `0` | какая команда из `CMD_HINTS` печатается | `fakeCmdLoop` |
| `charIdx` | `let`, `0` | сколько символов напечатано | `fakeCmdLoop` |
| `deleting` | `let`, `false` | фаза стирания | `fakeCmdLoop` |
| `bootscreen`, `bootOverload`, `bootRain`, `bootMenu`, `popupBack`, `popupTitle`, `popupBody`, `popupClose` | элементы `#bootscreen`, `#bootOverload`, `#bootRain`, `#bootMenu`, `#bootPopupBack`, `#bootPopupTitle`, `#bootPopupBody`, `#bootPopupClose` | титульный экран и попап | `buildRain` / `11`, `10` |

## Функции

В `02-slides.js` и `08-alice-lines.js` функций нет — только данные. В
`08b-alice-audio.js` одна инструкция после таблицы: вызов `aliceAudioArrived()`, если
она объявлена.

### `07-deck.js` — роутер слайдов

#### `pad2(n)` → строка
Число с ведущим нулём до двух знаков (`7` → `"07"`). Используется в `renderSlide`,
`tick` и `ts()` из `09`.

#### `renderSlide(i, opts = {})` → ничего
Показывает слайд `SLIDES[i]` (шаги — в разделе «Рендер слайда»). Пишет `current`,
`.active` у кнопок, `#crumb`, `.index`, `#slideSub`, `#slideBody.innerHTML`,
перезапускает `.swap-anim`, сбрасывает прокрутку `stageEl`. `opts.silent` — без
`aliceReact()`. Несуществующий индекс молча игнорируется. Локальная `slide` — объект
слайда. Вызывают: клик по меню, `keydown`, `boot()`, `applyLocale()`, свайп в
`13-mobile.js`. Ломается, если `stageEl` (из `06-demo.js`) убрать.

#### `ensureDemoCta(rootEl)` → ничего
Если в `rootEl` нет `.demo-cta-btn` — удаляет пустые `.demo-cta-wrap` и строит новую
обёртку: `wrap` › `btn#demoCtaBtn.demo-cta-btn` с `onclick` на
`window.__openDemoGame('slide02')`, внутри `icon` («▶»), `label`
(`data-i18n="demo.cta.button"`, текст из `t()` без ведущего «▶») и `sub`
(`data-i18n="demo.cta.hint"`). При нынешних данных не срабатывает: кнопка есть во всех
четырёх языках.

#### `animateTitle(text)` → ничего
Печатает `text` в `#slideTitleText` внутри `span.typer` по символу раз в 28 мс
(`setInterval` в `titleTimer`, прежний гасится). Пока строка не допечатана, к ней с
вероятностью 0.35 прицеплен `randomChar()`. На последнем символе — чистый текст, класс
`.typer` снимается. Локальные `span` — элемент печати, `settled` — допечатанная часть,
`noise` — шумовой хвост. Вызывают `renderSlide` и `transitionToTerminal()` (`11`).
Флаг `window.__titleGlitchEnabled` не читает (см. «Подводные камни»).

#### `randomChar()` → строка
Один случайный символ из `pool` = `"01░▒▓<>/\\#$@*█▌"`.

#### обработчики кнопок меню (анонимные, строка 138)
На каждую `button.slide-btn` — `click` → `renderSlide(parseInt(data-slide))`, если это
не текущий слайд.

#### обработчик `keydown` на `document` (анонимный, строка 145)
При `window.__demoActive` — выход. `ArrowRight`/`ArrowDown` — следующий слайд по кругу,
`ArrowLeft`/`ArrowUp` — предыдущий, `1`…`6` — слайд `N−1`. На фокус, модификаторы и
`defaultPrevented` не смотрит.

#### `tick()` → ничего
Раз в секунду (`setInterval(tick, 1000)`, первый вызов сразу при загрузке файла):
`UPTIME` из секунд с `startedAt` (локальные `h`, `m`, `s`), `INTEGRITY` (`driftI`) и
`SANITY` (`driftS`) — синус плюс шум, с одним знаком после запятой. Локальная `t`
(секунды) закрывает глобальную `t()` из `10-i18n.js` внутри функции — переводить здесь
нечего, но при правке это надо помнить.

### `09-alice-stream.js` — канал Элис

#### `ts()` → строка
Текущее время как `[ЧЧ:ММ:СС]` для префикса строки чата.

#### `escapeHtml(s)` → строка
Заменяет `& < > " '` на сущности. **Мёртвая:** одноимённая функция в
`11-settings.js:496` объявлена позже и перекрывает эту для всех вызовов, включая
`pushAliceLine` (см. «Подводные камни»).

#### `pushAliceLine(text, opts = {})` → элемент `<div>`
Добавляет в `#aliceStream` строку `div.alice-line[.glitch]` из трёх `<span>`: `.prefix`
(`ts()`), `.name` (`alice@core ::`), `.msg` (экранированный `text`). Класс `.show` — в
следующем кадре (`requestAnimationFrame`), для CSS-появления. Старые строки сверх
`MAX_LINES` удаляются сверху. `packets += 1` и вывод в `#packets`. Локальная `line` —
новая строка. Вызывают `playAliceVoice`, `boot`.

#### `setPitchTerminalActive(v)` → ничего
Ставит `pitchTerminalActive` и `window.__pitchActive`; при выключении —
`stopCurrentVoice()`. Вызывает только `transitionToTerminal()` с `true`; выключения в
коде нет.

#### `_aliceRecKey(s)` → строка
Нормализует текст для индекса записей: нижний регистр, пробелы схлопнуты, убраны
`«»"'`.,!?…:;()-—–`, обрезаны края.

#### `aliceRecordingFor(text)` → объект реплики или `null`
Лениво строит `_aliceRecIndex` из `ALICE_STORY_LINES` и `ALICE_BG_LINES` и ищет по
`_aliceRecKey(text)`. Внутренняя `add(p)` кладёт в индекс только реплики с `text` и
`audio`, пропуская заглушки `PLACEHOLDER_BASE64…` (наследие старого формата — сейчас
таких нет). До прихода `08b` у реплик нет `audio`, индекс пуст; `aliceAudioArrived()`
сбрасывает его, и следующий вызов строит заново. Вызывают `aliceHasRecording`,
`voiceSrcFor`.

#### `aliceHasRecording(text)` → boolean
`!!aliceRecordingFor(text)`. Вызывает `AliceVoice.speak()` в `03-alice-voice.js:258`,
чтобы не синтезировать строку, у которой есть настоящая запись.

#### `stampVoiceIds()` (IIFE, выполняется при загрузке) → ничего
Пишет `voiceId` в каждую реплику: `"deck.slide" + "01"` из ключа `SLIDE_01`;
`"deck.bg" + NN` из позиции в `ALICE_BG_LINES` (с 1, ведущий ноль до 9). Каждый блок в
`try`: без `08` ничего не делает.

#### `loadAliceAudio()` → ничего
Сначала `warmDeckTakes()`. Затем, если `deckNeedsBaked()` и пакет ещё не `loading`/
`ready`, — `aliceAudioState = "loading"` и вставка `<script src="js/presentation/08b-alice-audio.js" async>`
в `<head>`. `onerror`: состояние `failed`, тег удаляется, через 8 с, если всё ещё
`failed`, — `idle` и повтор. Повторы бесконечны с шагом 8 с. Локальная `s` — тег
`<script>`. Вызывают: таймер после `DOMContentLoaded`, `16`, `10`, `11`.

#### `aliceAudioArrived()` → ничего
Раскладывает `window.ALICE_AUDIO` по репликам: внутренняя `attach(p)` пишет
`p.audio = A[p.voiceId]`, если запись есть. Сбрасывает `_aliceRecIndex`,
`aliceAudioState = "ready"`. Вызывается последней строкой `08b`.

#### обработчик `DOMContentLoaded` (анонимный, строка 196)
Через 1200 мс зовёт `loadAliceAudio()`, если `window.__juryIntroHoldsLink` не выставлен
(иначе интро позовёт само).

#### `voiceLocale()` → строка
`settingsState.locale` или `"ru"`, если настроек ещё нет.

#### `deckLines()` → массив
Все 16 объектов реплик: сначала сюжетные, потом фоновые.

#### `voiceClipUrl(phraseObj)` → строка или `null`
`VOICE_CLIPS[voiceLocale()][phraseObj.voiceId]` — URL своей записи языка (или
`data:`-URL в режиме «inlined» манифеста). Без `voiceId` или без таблицы — `null`. На
другой язык не падает. Локальные `byLoc` — таблица языка.

#### `voiceClipFor(phraseObj)` → строка или `null`
То же, но если запись уже скачана в фоне — её `blob:` из `deckWarm`. Локальная `url`.

#### `deckNeedsBaked()` → boolean
Есть ли хоть одна реплика без своей записи, у которой субтитр всё ещё русский
(`voiceTextFor(p) === p.text`), — то есть та, что будет играть вшитую русскую запись.

#### `warmDeckTakes()` → ничего
Фоновая докачка своих записей языка. Выход, если уже идёт, нет `fetch` или страница не
по `http(s)`. Внутренняя `wanted()` — URL из `deckLines()` через `voiceClipUrl`, кроме
`data:` и уже пробованных. Внутренняя рекурсивная `next()`: если интро держит канал —
стоп (`deckWarming = false`); иначе берёт первый из `wanted()`, помечает в `deckTried`,
`fetch` → `blob` → `URL.createObjectURL` в `deckWarm`; ошибки глотаются; затем снова
`next()`. Вызывает `loadAliceAudio`.

#### `voiceTextFor(phraseObj)` → строка
`VOICE_TEXT[voiceLocale()][voiceId]`, иначе русский `phraseObj.text`; для `null` —
`""`. Локальные `id`, `byLoc`.

#### `voiceSrcFor(phraseObj)` → строка или `null`
Источник для `<audio>`: своя запись (`own` из `voiceClipFor`); иначе, если субтитр
русский и реплика есть в индексе записей, — `"data:audio/mpeg;base64," + audio`; иначе
`null`. Единственный вызов — `playAliceVoice`. То же правило продублировано в
`voicePanelRows()` (`11-settings.js:407`) для значков в попапе «Голос».

#### `alicePlaybackAllowed()` → boolean
`false`, если `window.__chatterEnabled === false` или `settingsState.sfxOn === false`.
Читает опрос `voiceVolumeWatcher`.

#### `aliceCurrentVolume()` → число 0…1
`volMaster/100 × volVoice/100` (по умолчанию 100 и 100), зажато в 0…1. Только для пути
без графа. Локальные `s`, `master`, `voice`.

#### `stopCurrentVoice()` → ничего
Гасит все четыре таймера, снимает `.glitch` со строки, отключает `gain`, `source` и все
`filters` графа, ставит реплику на паузу и обнуляет `src` (`""` — вызывает `error`, его
ловит `cleanup` с проверкой). Освобождает `VoiceBus`, если владелец `"sample"`.
Вызывают: `setPitchTerminalActive(false)`, `aliceReact`, опрос громкости,
`VoiceBus` (при перехвате шины), `silenceTheDeck()` в `06-demo.js`.

#### `isAliceSpeaking()` → boolean
Есть `currentVoiceAudio`, он не `ended` и не `paused`. Синтез речи не видит.

#### `VOICE_PROFILES.bg.buildGraph(ctx)` → `{ input, output, nodes, wobble }`
Строит цепочку канала `bg` (таблица в «Проигрывание»): `hp`, `lp`, `notch`, `hiCut`,
параллельно `dry` и `delay` с петлёй `fbk` и `wet`, сводятся в `merge`. `wobble` — `lp`.
`nodes` — все девять узлов, чтобы их можно было отключить.

#### `VOICE_PROFILES.story.buildGraph(ctx)` → `{ input, output, nodes, wobble }`
Цепочка канала `story`: `hp` → `lp` → `peak` → `shaper` (кривая
`tanh(x·(1+4·amt))/tanh(1+4·amt)`, `amt` = 0.35, 1024 точки) → `post`. `wobble` — `peak`.

#### `currentGlitchProfile()` → объект профиля
`GLITCH_PROFILES[settingsState.voiceGlitch]`, при неизвестном значении — `subtle`.
Локальная `lvl`.

#### `playAliceVoice(phraseObj, opts)` → элемент строки чата или `null`
Главная функция канала (схема — в «Проигрывание»). `opts` — объект `{ channel }`
(`"story"` или по умолчанию `"bg"`) или устаревшее `true` (= `{ forceGlitch: true }`;
`forceGlitch` больше ничего не делает, уровень глитча берётся из настроек). Локальные:
`o` — нормализованные опции, `channel`, `profile`, `glitchP`, `glitchOn` (хоть один
параметр глитча ненулевой), `subtitle`, `lineEl`, `voiceSrc`, `audio`, `usingGraph`,
`chainRef`, `ctx` (обнуляется, если контекст не `running`), `voiceNode`; для повтора
загрузки — `started` (было событие `playing`), `retried` (повтор уже был), `failedSrc`
(`audio.src`, сбой которого уже учтён). Кеш
`MediaElementSource` на элементе по `VOICE_SRC_KEY`. Возвращает строку чата, даже если
звук не пошёл; `null` — если не показано ничего (или Элис уже говорит).

#### `cleanup()` (внутри `playAliceVoice`) → ничего
Снимает таймеры, `.glitch` и граф, обнуляет `currentVoiceAudio` — только если
`currentVoiceAudio` всё ещё этот элемент. Висит на `ended` (`once`) и `pause` после
конца; на `error` и отказе `audio.play()` её зовёт `retryOrEnd()`, когда повтора не
будет. `VoiceBus` не освобождает (см. «Подводные камни»).

#### `retryOrEnd(err)` (внутри `playAliceVoice`) → ничего
Висит на `error` элемента и на отказе `play()` (оба раза — и для повтора). Не свой
элемент или `AbortError` (своя смена `src`, остановка) — ничего. `NotAllowedError` —
`cleanup()`: без жеста повтор не поможет. Тот же `audio.src`, что уже провалился
(`failedSrc`), — ничего: один сбой приходит дважды. Иначе, если звук уже шёл, повтор был,
источник `data:`/`blob:` или нет `fetch` — `cleanup()`. Иначе `retried = true`,
предупреждение в консоль, `fetch(voiceSrc, { cache: "no-store" })` → `blob` →
`URL.createObjectURL` в `deckWarm[voiceSrc]` и в `audio.src` того же элемента →
`play()`. Ответ не `ok` или ошибка сети — `cleanup()`.

#### `scheduleChunk()` (внутри `playAliceVoice`) → ничего
Если реплика играет: 64-точечные кривые частоты (`freqCurve`, не ниже 50 Гц, фаза +0.7)
и усиления (`gainCurve`, провал до `tremoloDepth` от базового, фаза +1.3) на 4 с вперёд,
`cancelScheduledValues` + `setValueCurveAtTime`; ошибки перекрытия кривых глотаются.
`chunkIdx` растёт — фаза непрерывна. Запускается сразу и раз в 3900 мс
(`voiceGlitchTimer`).

#### `dropFn()` (внутри `playAliceVoice`) → ничего
Один провал: усиление реплики за 8 мс в 0, держится `dropoutLenMs − 16` мс, за 8 мс
обратно. Только с графом.

#### `armDrop()` (внутри `playAliceVoice`) → ничего
`dropFn()` и перевзвод себя через `dropoutEveryMs × (0.7…1.3)` в `voiceDropTimer`.
Первый запуск — с той же случайной задержкой.

#### `aliceLoop()` → ничего
Если терминал активен, демка закрыта, болтовня включена и Элис молчит — случайная
реплика из `ALICE_BG_LINES` в канал `bg`. Всегда перезапускает себя через 2.5–5 с
(`next`). Первый запуск — `boot()` через 3.5 с.

#### `aliceReact(slide)` → ничего
Если терминал активен и у `slide.id` есть сюжетная реплика — гасит фоновую и играет
`phraseObj` в канале `story`. Вызывают `renderSlide` и `transitionToTerminal()` (через
700 мс после входа, «хвост паники»).

#### `fakeCmdLoop()` → ничего
Бегущая строка в `#fakeCmd`: печатает команду `CMD_HINTS[cmdIdx]` (строка как есть, или
`t(h.i18n)`) по символу, на полной строке ждёт 1.4 с, стирает, переходит к следующей.
Локальная `cmd` — текущая команда. Перезапускает себя через `setTimeout`, не
останавливается.

#### `boot()` → ничего
Старт колоды: `renderSlide(0, { silent: true })`; три приветствия `alice.open1…3` через
350, 1050, 1750 мс (второе — с `.glitch`); `aliceLoop` через 3.5 с; `fakeCmdLoop` через
0.6 с. Вызывает `bootEverything()` в `11-settings.js:910`, пока на экране ещё меню.

#### `buildRain()` (IIFE, выполняется при загрузке) → ничего
28 капель в `#bootRain` со случайными положением, скоростью, фазой, прозрачностью и
высотой (`n` = 28).

## DOM, классы, события, хранилище

**Классы, которые ставит код этих файлов:**

| Класс | Где | Кто |
|---|---|---|
| `.active` | `button.slide-btn` текущего слайда | `renderSlide` |
| `.typer` | `span` внутри `#slideTitleText`, пока идёт печать | `animateTitle` |
| `.swap-anim` | `#slideSub`, `#slideBody` — анимация смены | `renderSlide` |
| `.alice-line`, `.show`, `.glitch` | строки в `#aliceStream` | `pushAliceLine`, `playAliceVoice`, `stopCurrentVoice`, `cleanup` |
| `.demo-cta-wrap`, `.demo-cta-btn`, `.demo-cta-icon`, `.demo-cta-label`, `.demo-cta-sub` | запасная кнопка демки | `ensureDemoCta` |

Капли дождя — безымянные `<span>` в `#bootRain` с инлайн-стилями (`left`,
`animationDuration`, `animationDelay`, `opacity`, `height`). Классы `body.booting`,
`.boot-overload.on`, `.bootscreen.gone`, `#bootPopupBack.open`, `#loadingOverlay.active`
ставит `11-settings.js` — см. [ui.md](ui.md).

**Слушатели:**

| Событие | Цель | Файл |
|---|---|---|
| `click` | каждая `button.slide-btn` | `07` |
| `keydown` (всплытие) | `document` | `07` |
| `DOMContentLoaded` | `document` | `09` (таймер пакета) |
| `ended`, `error` (`once`), `pause` | `<audio>` реплики | `09` |
| `error` | `<script>` пакета `08b` | `09` |
| `onclick` (атрибут) | `#demoCtaBtn` в `SLIDE_02` | `02`, `07` |
| `onload` (атрибут) | `<link href="styles-media.css">` | `index.html` |

Клавиатурные слушатели других файлов в фазе перехвата (`17`, `20`, `21`, `16`) гасят
клавиши раньше, чем они доходят до `keydown` колоды, пока открыты их окна.

**Флаги `window.*`:** пишет `window.__pitchActive` (`09`) и `window.ALICE_AUDIO`
(`08b`); читает `__demoActive`, `__chatterEnabled`, `__voiceMediaHold`,
`__juryIntroHoldsLink`, `__openDemoGame` (через `onclick`).

**localStorage:** эти файлы ничего не хранят. Язык, с которым они работают
(`settingsState.locale`), переживает перезагрузку через ключ `ts.locale` в
`11-settings.js`.

**Сеть и адреса:**

| Что | Когда |
|---|---|
| `js/presentation/08b-alice-audio.js` | `loadAliceAudio()`, вставкой `<script>` |
| `assets/voice/<locale>/<id>.mp3?v=…` (из `VOICE_CLIPS`) | `warmDeckTakes()` по `fetch`, только `http(s)`; иначе — напрямую в `<audio>`; не загрузилось в `<audio>` — ещё раз по `fetch` с `cache: "no-store"` (`retryOrEnd()`) |
| `blob:…` | скачанные свои записи, из `deckWarm` (докачка или повтор); не отзываются |
| `data:audio/mpeg;base64,…` | вшитая русская запись |
| `assets/qr-terminal-shattered.png` | `<img>` в `SLIDE_05` |
| `assets/brand-mark.svg`, `assets/brand-wordmark.svg` | логотип студии на титульном экране |
| `styles.css`, `styles-media.css` | `<head>` |

## Подводные камни

1. **`escapeHtml` объявлена дважды.** В [09-alice-stream.js:35](../../js/presentation/09-alice-stream.js#L35)
   (экранирует и `'`) и в [11-settings.js:496](../../js/core/11-settings.js#L496)
   (не экранирует `'`). Повторное `function` верхнего уровня ошибки не даёт — побеждает
   объявленная позже, то есть версия `11` работает везде, включая `pushAliceLine`.
   Копия в `09` мертва: правка в ней ни на что не влияет. Для текста внутри `<span>`
   отсутствие `'` безвредно; в значении атрибута в одинарных кавычках — нет. То же
   описано в [README.md](README.md), правило 5.

2. **Число слайдов зашито в четырёх местах.** Длина массивов `SLIDES_BY_LOCALE.*`;
   шесть кнопок `button.slide-btn[data-slide]` в `index.html`; регулярка `/^[1-6]$/` в
   обработчике `keydown`; подсказка `menu.controls_html` («1..6») и подписи
   `nav.slide_0N` в `10-i18n.js`. Новый слайд без правки всех — кнопка не появится или
   цифра не сработает. Сюжетная реплика для него не обязательна: `aliceReact` без неё
   молчит (так сейчас у `SLIDE_00`).

3. **Порядок `ALICE_BG_LINES` — это идентификаторы записей.** `deck.bgNN` считается из
   позиции. Вставка или удаление в середине сдвигает id у всех следующих — они начнут
   играть чужие записи и переводы. Добавлять только в конец; удалять — с пересборкой
   `08b` и переименованием записей во всех языках.

4. **`stageEl` живёт в `06-demo.js`.** `renderSlide()` на нём сбрасывает прокрутку. Если
   убрать `06-demo.js` из `index.html`, первый же рендер упадёт с `ReferenceError` — и
   до `transitionToTerminal()` дело не дойдёт.

5. **Общая область видимости и короткие имена.** `current`, `buttons`, `crumb`,
   `stream`, `packets`, `deleting`, `cmdIdx` — глобальные `const`/`let`. Такое же имя на
   верхнем уровне любого другого файла — `SyntaxError`, и тот файл не выполнится
   целиком. `tick`, `boot`, `ts`, `pad2` — глобальные функции: одноимённая функция
   ниже по порядку молча их заменит (как случилось с `escapeHtml`). `06-demo.js`
   поэтому называет свою функцию `edPad2()`.

6. **`cleanup()` не освобождает `VoiceBus`.** `stopCurrentVoice()` зовёт
   `VoiceBus.releaseIf("sample")`, а естественное окончание реплики — нет
   ([09-alice-stream.js:601](../../js/presentation/09-alice-stream.js#L601)). После
   каждой доигранной реплики шина остаётся занятой `"sample"` до следующего перехвата
   или `stopAll()`. Пока в этом состоянии, `VoiceBus.acquire("speech", …)` из
   `03-alice-voice.js` получит отказ. Сейчас это почти не видно: демка, плеер и полигон
   при открытии зовут `VoiceBus.stopAll()`. В `03-alice-voice.js:140` такой же
   обработчик конца записи шину отпускает.

7. **Своя запись языка с `file://` проходит через граф и, вероятно, молчит.**
   `warmDeckTakes()` с `file://` не работает, `voiceClipFor()` отдаёт относительный путь
   из `VOICE_CLIPS` (манифест сейчас в режиме «file paths»), и `playAliceVoice()`
   подключает элемент к `createMediaElementSource` без проверки протокола
   ([09-alice-stream.js:558](../../js/presentation/09-alice-stream.js#L558)). По
   `15-voice-media.js` (комментарий в начале, `isLocalFile()`) и `build-media.js:64`,
   Chrome считает локальный файл чужим источником, и такой узел выдаёт тишину.
   `VoiceMedia` этот случай обходит, канал Элис — нет. Русская вшитая запись (`data:`)
   не затронута. Обход без правки кода — собрать манифест в режиме «inlined».

8. **Настройка «ГЛИТЧ В ЗАГОЛОВКЕ» ни на что не действует.** `11-settings.js:68` ставит
   `window.__titleGlitchEnabled`, но `animateTitle()` его не читает и шумовой символ
   добавляет всегда ([07-deck.js:119](../../js/presentation/07-deck.js#L119)).

9. **Клавиатура колоды не смотрит, откуда пришла клавиша.** Нет проверки фокуса,
   модификаторов и `defaultPrevented`. Стрелка на ползунке громкости в попапе настроек
   двигает и ползунок, и слайд под меню (реплики при этом нет — `pitchTerminalActive`
   ещё `false`); после входа колода откроется не на `SLIDE_00`. `Alt+←` тоже листает.

10. **Запись без перевода ломает правило «голос = субтитр».** `voiceSrcFor()` берёт
    свою запись языка первой и на текст не смотрит. Если в `VOICE_CLIPS.en` запись есть,
    а в `VOICE_TEXT.en` перевода нет, английский голос пойдёт под русским субтитром.
    Держится на том, что студия сохраняет запись и перевод вместе.

11. **Неудачная докачка не повторяется.** URL попадает в `deckTried` до запроса; ошибка
    не снимает метку. Такая реплика до перезагрузки играет напрямую с сервера (или
    молчит без сети). Пакет `08b`, наоборот, повторяется каждые 8 с бесконечно.

12. **Если `08b` выполнится, а `aliceAudioArrived` не окажется,** состояние навсегда
    останется `"loading"`, и `loadAliceAudio()` больше не попробует. Переименовывать
    функцию — только вместе с `assets/build-media.js`, который пишет её имя в пакет.

13. **`applyLocale()` перерисовывает слайд целиком.** `innerHTML` заменяется:
    раскрытые заметки ведущего (`details.spk`) закрываются, прокрутка сбрасывается.

14. **Тело слайда — доверенный HTML.** Вставляется `innerHTML` без очистки; кнопка демки
    держится на инлайн-`onclick`. Тексты слайдов не должны приходить извне.

15. **Приветствия пишутся под меню.** `boot()` вызывается, пока на экране титульный
    экран, и три строки `alice.open*` появляются в скрытом чате; `PACKETS` их считает.
    Это намеренно («чтобы чат не был пустым»), но при отладке не удивляться.

16. **Кеш `VOICE_SRC_KEY` не срабатывает.** На каждую реплику создаётся новый `<audio>`,
    так что `audio[VOICE_SRC_KEY]` всегда пуст. Безвредно; комментарий у константы
    описывает повторное использование элемента, которого нет.

17. **Мусор в разметке демки.** [index.html:455](../../index.html#L455)–479 — 25 строк
    обрывков (` -->`, `ue">`, `ar">`, `pan>`, `ton>`, `div>`, `rea>`…) внутри
    `.dg-stage.dg-desk`, после `#dgDeskNudge`. Похоже на неудачно удалённый блок
    разметки: открывающего `<!--` нет, это текстовые узлы, и браузер выводит их как
    текст на экране рабочего стола (за окнами и обоями их, вероятно, не видно).

18. **Русские тексты в `index.html` — запасные.** Их видно до первого `applyLocale()`;
    они должны совпадать со строками `10-i18n.js`, иначе первый кадр показывает
    устаревший текст.

19. **`isAliceSpeaking()` не знает о синтезе речи.** Реплика колоды не ждёт
    `speechSynthesis`: `VoiceBus.acquire("sample", …, { interrupt: true })` отберёт шину и
    оборвёт синтез. Наложения голосов нет, но и очереди тоже.

### Устаревшие комментарии

- `02-slides.js:6`, `07-deck.js:6`, `08-alice-lines.js:10`, `09-alice-stream.js:6` —
  «Part N/13»: скриптов теперь 24 (плюс `08b`).
- [02-slides.js:20](../../js/presentation/02-slides.js#L20) — «Alice voice lines are
  NOT translated… her audio is in Russian»: переводы и записи на других языках есть
  (`VOICE_TEXT`, `VOICE_CLIPS`).
- [02-slides.js:1275](../../js/presentation/02-slides.js#L1275)–1296 — хвостовой
  комментарий про демо-игру («4 stages», «The `AliceVoice` helper below»): ниже ничего
  нет, `AliceVoice` — в `03-alice-voice.js`, стадий шесть.
- [07-deck.js:42](../../js/presentation/07-deck.js#L42) — «non-RU decks don't [embed
  the CTA]»: противоречит комментарию у `ensureDemoCta` и данным — кнопка есть во всех
  четырёх языках.
- [07-deck.js:188](../../js/presentation/07-deck.js#L188)–200 — заголовок «ALICE CHAT»
  в конце файла: «Audio payloads are inlined as data:audio/mpeg base64 so the whole
  pitch stays offline / single-file» — звук давно в `08b` и грузится лениво.
- [09-alice-stream.js:97](../../js/presentation/09-alice-stream.js#L97) и
  [:129](../../js/presentation/09-alice-stream.js#L129) — запись «в 08-alice-lines.js»:
  записи теперь в `08b-alice-audio.js`.
- [09-alice-stream.js:525](../../js/presentation/09-alice-stream.js#L525) — «the inline
  SFX engine higher up»: движок в `01-audio.js`.
- [09-alice-stream.js:748](../../js/presentation/09-alice-stream.js#L748) — сюжетная
  реплика «always glitched»: при `voiceGlitch = "off"` глитча нет, `forceGlitch` не
  используется.
- [09-alice-stream.js:829](../../js/presentation/09-alice-stream.js#L829)–839 — заголовок
  «I18N — string table + locale switcher» в конце файла: код под ним в `10-i18n.js`.
- [index.html:201](../../index.html#L201) — «the engine in  below (see DemoGame IIFE)»
  — пропущено слово; [:261](../../index.html#L261) и [:314](../../index.html#L314) —
  `VoidScene` / `OsBoot` «in main.js»: такого файла нет (`04-void-scene.js`,
  `06-demo.js`); [:229](../../index.html#L229) — путь `js/10-i18n.js` вместо
  `js/core/10-i18n.js`; [:517](../../index.html#L517) — «4. END» после «5. DESK».
