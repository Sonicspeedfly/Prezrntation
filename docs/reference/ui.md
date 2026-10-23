# Интерфейс: локализация, настройки, загрузчик, телефон, видео, служебный доступ — справочник

> Файлы: `js/core/10-i18n.js` (2165 строк), `js/core/11-settings.js` (926), `js/demo/12-jury.js` (306),
> `js/core/13-mobile.js` (259), `js/core/17-evidence.js` (350), `js/core/21-backstage.js` (455).
> Место в порядке загрузки: 13-й, 14-й, 15-й, 16-й, 20-й и 24-й `<script defer>` из 24
> (см. [README.md](README.md#порядок-загрузки-и-кто-что-отдаёт)).
> Связанные страницы: [deck.md](deck.md) (слайды, канал Элис, элементы меню и попапа),
> [voice.md](voice.md) (интро для жюри, `VoiceMedia`, тест голоса, студия),
> [demo.md](demo.md) (демка, её хуки локали), [sandbox.md](sandbox.md) (полигон),
> [audio.md](audio.md) (`Audio`, `VoiceBus`), [styles.md](styles.md) (классы, которые ставит этот код).
> Флаги `window.*` и ключи `localStorage` всех файлов сведены в [README.md](README.md#флаги-window).

## Коротко

`10-i18n.js` держит таблицу `STRINGS` (458 ключей × 4 языка) и две функции: `t(key)`
для поиска строки и `applyLocale(loc)` для переключения языка на лету. `11-settings.js`
хранит состояние настроек `settingsState`, применяет его (`applySettings()`), рисует попапы
стартового меню (НАСТРОЙКИ, ЗАГРУЗИТЬ, ЭКСТРА, ВЫХОД, панель озвучки), гоняет фальшивую загрузку
после «НОВАЯ ИГРА» (в неё на 24 % встраивается интро для жюри), выводит призраков на
стартовом экране и запускает всю страницу (`bootEverything()`). `12-jury.js` — чек-лист
для жюри у правого края. `13-mobile.js` — телефонный слой: отступ под экранную клавиатуру,
сворачиваемый канал Элис, свайп между слайдами. `17-evidence.js` — видеоплеер апробации
(`Shift+V`) с выбором качества под канал. `21-backstage.js` — смета проекта (`Shift+B`) и
служебный доступ (`Shift+H`, `?`, кнопка «⌘ ДОСТУП» на телефоне, «⌘» в верхней панели).

## Как это работает

### Таблица строк `STRINGS`

```js
const STRINGS = {
    ru:     { "ключ": "строка", … },   // строки 12–536, «source of truth»
    en:     { … },                     // 537–1046
    tj:     { … },                     // 1047–1556, литературный таджикский
    tj_col: { … }                      // 1557–2066, разговорный таджикский
};
```

- Значение — строка. Длинные HTML-значения собраны конкатенацией `'…' + '…'` прямо в литерале.
- **Паритет.** Во всех четырёх блоках одни и те же 458 ключей **в одном и том же порядке**
  (проверено скриптом: `missing 0`, `extra 0`, порядок совпадает). Новый ключ добавляется во все
  четыре блока сразу. Проверка — однострочник из корневого [README.md](../../README.md#правки).
- **`_html` в конце ключа** — значение содержит разметку. `applyLocale()` кладёт такое значение
  через `innerHTML`, остальные — через `textContent`. Таких ключей 37 в каждом языке. В попапах
  `11-settings.js` все значения вставляются в шаблонную строку как есть, поэтому там разметка
  проходит и без суффикса.
- **`_plain`** (`demo.ed.allDoneHint_plain`, `demo.ed.nextHint_plain`) — текстовая пара к
  `_html`-версии для вывода в терминал демки.
- **Подстановки** `{n}`, `{total}`, `{s}`, `{f}` (в `demo.game.tasks_hint`, `demo.end.partial.sub`,
  `demo.scare.kernStat`) `t()` не заполняет — вызывающий код делает `.replace` сам.
- **Ключи задач** `demo.task.<id>[-py|-cpp|-c].<поле>`: `title` и `lore` — по одному на задачу,
  `hint` и `hintNoob` — на каждый язык программирования (они называют конкретный синтаксис).
  Выбор ключа делает `taskField()` в [06-demo.js:35](../../js/demo/06-demo.js#L35).

Группы ключей (число одинаково во всех четырёх языках):

| Префикс | Ключей | Что это |
|---|---|---|
| `page.` | 1 | заголовок вкладки |
| `boot.` | 5 | стартовый экран |
| `menu.` | 12 | кнопки меню и подвал боковой навигации |
| `popup.` | 1 | aria-подпись крестика попапа |
| `topbar.` | 4 | верхняя панель |
| `nav.` | 6 | кнопки слайдов |
| `breadcrumb.`, `main.` | 2 + 1 | крошки и «загрузка ядра» |
| `alice.` | 8 | шапка канала Элис, три первые реплики (`alice.open1…3`), две фальшивые команды |
| `settings.` | 52 | попап НАСТРОЕК: `title` 1, `tab` 5, `audio` 11, `video` 8, `game` 10, `a11y` 6, `system` 11 |
| `common.` | 2 | `вкл`/`выкл` |
| `load.`, `extra.`, `exit.` | 4, 3, 5 | попапы ЗАГРУЗИТЬ, ЭКСТРА, ВЫХОД |
| `voice.` | 8 | панель озвучки в ЭКСТРА |
| `demo.` | 264 | демка: `task` 52, `ed` 35, `end` 23, `desk` 19, `walk` 17, `diff` 14, `quick` 14, `void` 13, `app` 12, `os` 10, `hud` 7, `boot` 6, `scare` 6, `report` 6, `hintmode` 6, `sys` 6, `glitch` 5, `game` 4, `cmd` 4, `close` 2, `cta` 2, `input` 1 |
| `jury.` | 7 | рамка чек-листа (сами шаги — в `JURY_CHECKLIST_BY_LOCALE`) |
| `ji.` | 14 | интро для жюри (`16-jury-intro.js`) |
| `ev.` | 8 | видеоплеер (`17-evidence.js`) |
| `vt.`, `secret.` | 8, 2 | тест голоса и «Взаперти» (`18-voice-extras.js`) |
| `sb.` | 21 | полигон (`20-ai-sandbox.js`) |
| `bs.` | 20 | служебный доступ (`21-backstage.js`) |
| **итого** | **458** | |

Шесть строк демки, которые Элис произносит вслух, студия озвучки переписывает прямо в этом
файле: `patchStrings()` в [voice/lib.js:339](../../voice/lib.js#L339) находит блок языка по
заголовку `^ {8}<loc>: {` и меняет одну строку `"ключ": "значение"`. Поэтому отступ заголовков
блоков (8 пробелов) и однострочная запись этих ключей — часть формата.

### `t(key)` — поиск строки

1. Язык — `settingsState.locale`, если `settingsState` уже объявлен, иначе `"ru"`.
2. Словарь — `STRINGS[loc]`, неизвестный язык → `STRINGS.ru`.
3. Ключ есть в словаре (`hasOwnProperty`) → значение.
4. Нет — значение из `STRINGS.ru`, если оно не `null`/`undefined`.
5. Нет и там — сам ключ. Обёртки `tx()` в `06`, `17`, `21` по равенству результата ключу
   понимают, что строки нет, и берут свой запасной текст.

### `applyLocale(loc)` — смена языка, по шагам

1. Неизвестный `loc` → `"ru"`. Если `loc === _appliedLocale` — выход: `applySettings()`
   вызывается на каждое движение ползунка громкости, а перерисовывать слайд и попап
   при этом нельзя.
2. `booting = (_appliedLocale === null)` — первый вызов при загрузке страницы.
   `_appliedLocale = loc`.
3. `voiceSync()` из `00-voice-sync.js` (если есть) — перечитать с `serve.js` записи и переводы
   для всех языков. Возвращает промис или `null` (страница не с `http(s):`).
4. **Только при переключении** (`!booting`), когда промис из шага 3 выполнится:
   - `JuryIntro.prime()` — начать качать акт 1 интро на новом языке;
   - `loadAliceAudio()` — фоновые записи дека для нового языка, но только если интро не
     держит канал (`window.__juryIntroHoldsLink`);
   - `VoiceMedia.followAll()` — тест голоса или «Взаперти», если играют, переходят на
     новый язык с той же доли записи;
   - `VoiceExtras.relocale()` — перерисовать надписи теста голоса.

   При загрузке страницы этого не делается: таймеры в `16-jury-intro.js` и `09-alice-stream.js`
   сами запускают ту же загрузку, в своём порядке (сначала акт 1).
5. `<html lang>` = `loc`.
6. Все элементы с `data-i18n`: значение `t(key)` через `innerHTML`, если у элемента
   `data-i18n-html="1"` **или** ключ кончается на `_html`, иначе через `textContent`.
7. `data-i18n-aria` → `aria-label`, `data-i18n-placeholder` → `placeholder`,
   `data-i18n-title` → `title`.
8. `window.__demoSyncLocale(loc)` (`06-demo.js`) — демка переписывает свои динамические строки
   и файлы VoidOS; `window.__jurySyncLocale(loc)` (`12-jury.js`) — чек-лист перерисовывается.
   Оба в `try`.
9. `SLIDES = SLIDES_BY_LOCALE[loc] || SLIDES_BY_LOCALE.ru` и `renderSlide(current, { silent: true })` —
   текущий слайд перерисовывается без новой реплики Элис.
10. Если открыт попап и его заголовок равен `STRINGS.ru["settings.title"]` или
    `STRINGS.en["settings.title"]` — `renderSettingsPopup()`.

В `index.html` сейчас 78 элементов с `data-i18n` (плюс 2, которые создают `17` и `21`),
6 с `data-i18n-html`, 4 с `data-i18n-aria` (плюс 2 из `21`), 8 с `data-i18n-title`
и ни одного с `data-i18n-placeholder`.

### Настройки: состояние и применение

`settingsState` — копия `SETTINGS_DEFAULTS`, поверх которой при загрузке файла читаются
`localStorage["ts.locale"]` (если входит в `LOCALES`) и `localStorage["ts.juryIntro"]`
(`on`/`off`). Больше ничего не сохраняется: громкость, эффекты и сложность каждый показ
начинаются с умолчаний.

| Настройка | Умолчание | Значения | Где действует |
|---|---|---|---|
| `volMaster` | 70 | 0–100 | `Audio.setVolume("master")`; громкость видео в `17` |
| `volMusic` | 55 | 0–100 | `Audio.setVolume("music")` |
| `volSfx` | 85 | 0–100 | `Audio.setVolume("sfx")` |
| `volVoice` | 100 | 0–100 | `Audio.setVolume("voice")` — голосовая шина Элис |
| `musicOn` | `true` | `true`/`false` | `Audio.setMusicEnabled` (вне демки); `06-demo.js` запоминает |
| `sfxOn` | `true` | `true`/`false` | `Audio.setSfxEnabled`; `09-alice-stream.js` |
| `voiceGlitch` | `"subtle"` | `off`/`subtle`/`heavy` | «сломанное радио» в `09`, нейроголос в `19` |
| `crt` | `"on"` | `on`/`dim`/`off` | CSS-переменная `--crt-line` (0.035/0.015/0); сканлайны 3D-сцены в `06` |
| `vignette` | `"on"` | `on`/`off` | класс `body.no-vignette`; 3D-сцена в `06` |
| `glitch` | `"on"` | `on`/`off` | `window.__ghostsEnabled` (призраки); сила глитча 3D-сцены в `06` |
| `contrast` | 100 | 60–140, шаг 5 | `body.style.filter = contrast(…)`, при 100 фильтр снимается |
| `difficulty` | `"cpp"` | `python`/`cpp`/`c` | ни один файл не читает — демка выбирает сложность сама |
| `hints` | `"rare"` | `off`/`rare`/`full` | `window.__chatterEnabled` (фон Элис, `off` глушит); сила подсказок в `06` |
| `hintMode` | `"tech"` | `tech`/`noob` | в попапе строки нет; читает `06-demo.js:3178` |
| `autosave` | `"on"` | `on`/`off` | ни один файл не читает |
| `epilepsy` | `"off"` | `on`/`off` | класс `body.epilepsy-safe`; его проверяют `06`, `16`, `17`, `18`, `20`, `21` |
| `titleGlitch` | `"on"` | `on`/`off` | `window.__titleGlitchEnabled` — ни один файл не читает |
| `font` | `"norm"` | `norm`/`big` | класс `body.big-font` |
| `locale` | `"ru"` | `ru`/`en`/`tj`/`tj_col` | `applyLocale()`; сохраняется в `ts.locale` |
| `juryIntro` | `"on"` | `on`/`off` | `JuryIntro.enabled()`; сохраняется в `ts.juryIntro` |

`applySettings()` переносит состояние на страницу: CSS-переменная и классы `body`, флаги
`window.__ghostsEnabled` / `__titleGlitchEnabled` / `__chatterEnabled`, четыре громкости, музыка
и звуки (пока открыта демка — `window.__demoActive` — музыка принудительно выключена, фон Элис
молчит), затем `applyLocale(settingsState.locale)` и `window.__demoSyncSettings()` (сейчас пустая
функция в `06-demo.js:3635`).

Попап настроек перестраивается целиком на каждый клик: `renderSettingsPopup()` собирает HTML
вкладки (`pickRow`, `sliderRow`, `boolRow`), вызывает `openPopup()` и заново вешает обработчики.
Кнопка-переключатель пишет значение в `settingsState`, для `locale`/`juryIntro` — ещё и в
`localStorage`, вызывает `applySettings()` и перерисовывает попап; для `juryIntro` —
`JuryIntro.prime()`. Ползунок пишет число и вызывает `applySettings()` без перерисовки
(иначе потерялся бы захват ползунка). «Сбросить» очищает объект **на месте**
и удаляет оба ключа `localStorage`.

### Запуск страницы

`bootEverything()` вызывается прямо во время выполнения `11-settings.js`: у `defer`-скриптов
`document.readyState` уже `"interactive"`, ветка `DOMContentLoaded` не срабатывает. В этот момент
`12…21` ещё не выполнены.

1. `applySettings()` — язык из `ts.locale` применяется до первого кадра (первый вызов
   `applyLocale` с `booting = true`).
2. `boot()` из `09-alice-stream.js` — слайд 0 без реплики, три стартовые строки канала, циклы Элис.
3. Через 4.5 с — первый призрак (`spawnGhost()`), дальше каждые 5.5–11 с.

### «НОВАЯ ИГРА» → загрузка → дек

```
клик .boot-btn[data-action=play]
  └ startNewGame()           сброс оверлея, Audio.playClick()
      └ runLoadingSequence(onDone = transitionToTerminal)
          0 → 8 %   500 мс
          8 → 20 %  650 мс   "mounting /alice …"
          ── JuryIntro.enabled()? ──────────────────────────────┐
          │ да: 20 → 24 % за 300 мс, await JuryIntro.run(...)  │
          │     "enter"       → enter()  (сразу в дек)          │
          │     "skip"        → panic()                         │
          │     "unavailable" → "[WARN] carrier lost (why)…"    │
          │ нет: "[ -- ] CH-104 jury broadcast: off …"          │
          └──────────────────────────────────────────────────────┘
          → 36 % 750 мс → 54 % 800 мс → 74 % 720 мс → 88 % 560 мс → 94 % 450 мс
          через 200 мс panic():
             глитч, "!! KERNEL PANIC !!", 100 %, шесть строк краха за 1.05 с,
             1.3 с: Audio.playTransition, .dying, стоп музыки
             2.2 с: оверлей скрыт → onDone()
  └ transitionToTerminal()
       loadAliceAudio(); звуки перехода; #bootOverload.on
       160 мс: #bootscreen.gone
       +600 мс: снять .booting с body, скрыть экран, animateTitle(), фокус #stage,
                setPitchTerminalActive(true); +700 мс aliceReact(текущий слайд)
```

Без интро от клика до краха ≈ 4.6 с, до дека ≈ 7.6 с. Кнопка «пропустить» появляется через 1.1 с; во время интро
она вызывает `JuryIntro.abort()` (интро завершается с `"skip"` → `panic()`), иначе сразу `panic()`.
Анимация процента идёт на `requestAnimationFrame` — в фоновой вкладке загрузка стоит.

### Чек-лист жюри (`12-jury.js`)

Шаги лежат в `JURY_CHECKLIST_BY_LOCALE` (по 14 на язык, записи `{ id, step, desc }`, `desc` — HTML),
рамка — в `STRINGS` (`jury.*`, через `data-i18n` в разметке `#jury`). `JuryChecklist.init()`
читает состояние `{ open, checked: { id: true } }` из `localStorage["neikon.jury.v1"]`
(один раз переносит старый ключ `nathan.jury.v1`), рисует список, вешает кнопки и
регистрирует `window.__jurySyncLocale`. Отметка хранится по `id`, а не по номеру — после смены
языка галочки остаются на месте.

### Телефонный слой (`13-mobile.js`)

`MobileUX.init()` при загрузке:

| Шаг | Функция | Что делает |
|---|---|---|
| 1 | `setupAutofocusPolicy()` | `window.__dgSkipAutofocus()` — `true` на сенсорном экране или ширине ≤ 820 px; демка тогда не ставит фокус в поле ввода |
| 2 | `trackKeyboard()` | по `visualViewport` считает, сколько экрана закрыто клавиатурой; > 120 px → `--kb` и `body.kb-open` |
| 3 | `setupAlice()` | шапка канала Элис становится кнопкой; на телефоне переключает `section.alice.expanded` |
| 4 | `setupSwipe()` | свайп по `#stage`: ≥ 55 px по горизонтали, ≤ 800 мс, |dx| ≥ 1.6·|dy| → соседний слайд |
| 5 | `setupNavStrip()` | на телефоне держит активную кнопку слайда в центре горизонтальной ленты `#menu` |
| 6 | `setupDemoHud()` | выдвижная панель HUD демки — сейчас не срабатывает: в разметке нет `.dg-game` |

Джойстика здесь нет, хотя заголовок файла его упоминает: виртуальный стик и панель обзора
живут в [06-demo.js:1945](../../js/demo/06-demo.js#L1945) и
[04-void-scene.js:1636](../../js/demo/04-void-scene.js#L1636).

### Видео апробации (`17-evidence.js`)

Три копии одной записи, их делает `assets/build-media.js`:

| Ключ | Файл | Размер на диске |
|---|---|---|
| `hd` | `assets/video/classroom_trial.mp4` | 73.5 МБ |
| `540` | `classroom_trial.540.mp4` | 24.4 МБ |
| `360` | `classroom_trial.360.mp4` | 10.5 МБ |
| — | `classroom_trial.poster.jpg` (постер) | 28 КБ |

Выбор копии при открытии: ручной выбор из `localStorage["ts.evidence.q"]`, иначе `"auto"` →
`autoPick()`:

1. `nearHost()` — `file:`, `localhost`, `127.0.0.1`, `::1`, `*.local`, `10.*`, `192.168.*`,
   `172.16–31.*` → `hd` (качать по сети нечего).
2. `navigator.connection` (Network Information API): `saveData` → `360`; `effectiveType`
   `slow-2g`/`2g`/`3g` → `360`; есть `downlink` → `540` при ≥ 2.5 Мбит/с, иначе `360`.
3. Иначе `measuredMbps()` — скорость, с которой пришли собственные файлы страницы (ресурсы
   > 60 000 байт по `performance.getEntriesByType("resource")`): ≥ 2 Мбит/с → `540`, иначе `360`.

`hd` в режиме АВТО по сети не выбирается никогда. Во время показа: событие `waiting` засекает
начало простоя, `playing` прибавляет его к `stallMs`; больше 6 с суммарно (`STALL_LIMIT_MS`)
при `"auto"` → `stepDown()` на ступень ниже. Ошибка загрузки (копия не собрана) → следующая
ступень вниз, с последней — `hd`; каждая копия пробуется не больше раза (`video.__tried`).
`preload="none"`: до открытия плеера видео не качается.

Пока плеер открыт, `hush()` глушит дек: фон Элис выключен, длинные дорожки `VoiceMedia` на паузе
(или короткие реплики `VoiceBus` оборваны), громкость музыки → 0. `unhush()` при закрытии
возвращает всё. Плеер собирается один раз (`build()`), при каждом открытии `relabel()`
переписывает надписи, если язык сменился.

### Смета и служебный доступ (`21-backstage.js`)

**Смета** — HTML-лист из данных `COST[язык]` (`tj_col` берёт `tj`), пересобирается при каждом
открытии. Схема записи одного языка:

```js
{
  title, sub,                         // заголовок и подзаголовок листа
  kpi:  [[значение, подпись] × 3],     // три крупные цифры сверху
  cols: [статья, расчёт, сумма],       // заголовки столбцов по умолчанию
  sections: [{
      h: "заголовок раздела",
      cols?: [три своих заголовка],    // переопределение для раздела
      rows: [[статья, расчёт, сумма], …],
      total?: [подпись, расчёт, сумма], // итоговая строка, класс .total (зелёная)
      after?: [[статья, расчёт, сумма], …] // обычные строки под итоговой
  }, …],
  notes: [строка, …],                  // сноски внизу
  close: "[ × … ]", aria: "…"
}
```

Разделов семь:
1. Часть 1 — оценка труда за 18 месяцев: 1 850 ч, 15–20 строк в час, три уровня ставок
   (Таджикистан 90–150 сомонӣ/ч, СНГ $20–35, ЕС/США $60–100). Итог — 166 500 – 277 500 сомонӣ.
2. Часть 2 — фактические расходы: связь, амортизация, электричество, голос, полиграфия,
   госпошлина. Итог — 7 450 сомонӣ.
3. Общий итог — зелёная строка «труд + расходы» = 173 950 – 284 950 сомонӣ и под ней (`after`)
   стоимость внедрения для школы, 0 сомонӣ в год. Единственный раздел без `rows` и с `after`.
4. Что сделано.
5. Что сэкономлено устройством проекта. Суммы в сомонӣ; итог — годовая экономия одного
   компьютерного класса.
6. Этап 2 — план масштабирования (команда, бюджет полной версии, модель релиза).
7. Часть 3 — коммерческая модель CrystalCore Studio: команда, Steam (Episode 0 бесплатно,
   эпизоды по $4.99), лицензия для школ (1 500 сомонӣ/год на класс), 0 сомонӣ на внешние
   серверы. Последний раздел, перед сноской.

Доллары везде пересчитаны по ≈ 10,9 сомонӣ за $1 (сноска внизу листа). Расчёт записан
комментарием над `COST` ([21-backstage.js:27](../../js/core/21-backstage.js#L27)). Поменяли
срок, ставку или статью — правьте и комментарий, и `kpi`, и строки во всех трёх языках. Итоги
в `kpi`, в итоговых строках разделов и в общем итоге — одни и те же числа, они должны сходиться.
В числах `kpi` пробел между тысячами — неразрывный (` `): иначе на узком экране карточка
переносит строку посреди числа.

**Служебный доступ** — сетка плиток, собирается при каждом открытии (`panelHtml()`):

| Плитка | Действие (`run`) | Условия |
|---|---|---|
| `sandbox` | `AiSandbox.open()` | на телефоне — другое описание (ИИ ноутбука докладчика) |
| `video` | `Evidence.open()` | |
| `cost` | `openCost()` | |
| `secret` | `VoiceExtras.fireSecret("panel")` | заперта (класс `locked`, тряска `nope`), пока `ts.secret.locked !== "1"` |
| `qr` | `window.open("qr")` | только не на телефоне |

Под плитками на компьютере — список горячих клавиш. Открыть: `Shift+H`, `?`, кнопка `.bs-fab`
(видна по CSS при `hover: none` или ширине ≤ 820 px, скрыта на стартовом экране и в демке) или
значок `.bs-chip` «⌘» в `.topbar .right`.

Слои: видеоплеер `z-index` 999999, полигон 999000, служебный доступ 998900, смета 998800.

## Почему так, а не иначе

1. **Одна таблица `STRINGS` в обычном скрипте, а не JSON-файлы по языкам.** JSON пришлось бы
   загружать `fetch`, а со страницы, открытой с `file://`, он не работает. По коду видно и
   второе: `voice/lib.js` правит этот файл построчно и читает его в Node через `evalGlobals`
   с заглушкой DOM ([voice/lib.js:62](../../voice/lib.js#L62)) — поэтому на верхнем уровне
   файла нет обращений к DOM.
2. **`t()` падает на русский, потом на сам ключ, а не бросает ошибку.** Недопереведённый язык
   показывает русскую строку вместо пустоты; возврат ключа позволяет обёрткам `tx()` в `06`,
   `17`, `21` подставить свой текст.
3. **`applyLocale()` ничего не делает, если язык не сменился.** Комментарий
   [10-i18n.js:2079](../../js/core/10-i18n.js#L2079): правки настроек, не трогающие язык, не
   должны перезапускать печать заголовка слайда и попап. `applySettings()` вызывается на каждое
   движение ползунка.
4. **Загрузки нового языка — после `voiceSync()` и только при переключении.** Комментарий
   [10-i18n.js:2089](../../js/core/10-i18n.js#L2089): качать надо то, что будет играть новый
   язык, а не язык, с которым страница открылась; при загрузке страницы это делают таймеры
   `16` и `09` в своём порядке (акт 1 первым — он нужен через секунды после «НОВАЯ ИГРА»).
5. **Переживают перезагрузку только язык и интро.** Комментарий
   [11-settings.js:39](../../js/core/11-settings.js#L39): прогон, выключивший интро, не должен
   выключать его снова, а выбранный язык должен открываться сразу — меню, голос, интро. Остальное
   намеренно сбрасывается: каждый показ начинается с одинаковых настроек.
6. **Сброс настроек меняет объект на месте, а не присваивает новый.** Комментарий
   [11-settings.js:316](../../js/core/11-settings.js#L316): `window.settingsState` один раз
   получает ссылку на этот объект, и `06-demo.js` читает настройки через неё; присваивание
   оставляло демку (и чтение громкости речи в `03-alice-voice.js`) с мёртвым объектом до сброса.
7. **Интро для жюри встроено в фальшивую загрузку на 24 %.** Комментарий
   [11-settings.js:864](../../js/core/11-settings.js#L864): если звук интро так и не пришёл,
   оно возвращает управление, и загрузка идёт дальше — показ не зависает на пустом экране.
   Выключенное интро пишет строку в лог загрузки (комментарий
   [11-settings.js:875](../../js/core/11-settings.js#L875)), иначе на репетиции непонятно,
   почему его не было.
8. **Призраки — рисованные SVG в коде, а не картинки.** Комментарий
   [11-settings.js:605](../../js/core/11-settings.js#L605): офлайн, без фотоассетов. Ставятся у
   левого или правого края, чтобы не закрывать меню и текст.
9. **Видео — три готовые копии и выбор по измеренному каналу, а не один файл.** Комментарий
   [17-evidence.js:14](../../js/core/17-evidence.js#L14): 73 МБ школьный канал в Душанбе не
   протянет. С локального адреса — сразу оригинал, иначе — оценка браузера, без неё — скорость,
   с которой пришли файлы самой страницы; неизвестно → 360p. Адаптивный поток (HLS/DASH) требовал
   бы плеер-библиотеку и нарезку на сервере — вероятно, поэтому взят ступенчатый спуск по
   простоям: он работает с любым статическим хостингом и с `file://`.
10. **В АВТО музыка глушится громкостью, а не `setMusicEnabled(false)`.** Комментарий
    [17-evidence.js:239](../../js/core/17-evidence.js#L239): обратное включение запустило бы тему
    меню в деке, где она обычно остановлена.
11. **Плеер собирается один раз и переподписывается, смета и панель — пересобираются.** Плеер
    держит `<video>` с уже скачанными данными; по коду видно, что его не пересоздают, а меняют
    надписи в `relabel()` (комментарий [17-evidence.js:160](../../js/core/17-evidence.js#L160)).
    Смета и панель — статический HTML, их дешевле собрать заново на текущем языке
    ([21-backstage.js:263](../../js/core/21-backstage.js#L263)).
12. **Пока окно открыто, клавиши не доходят до слайдов.** Обработчики `17` и `21` стоят на
    `window` в фазе захвата и вызывают `stopImmediatePropagation()`: иначе стрелки листали бы
    слайды под сметой (комментарий [21-backstage.js:426](../../js/core/21-backstage.js#L426)), а
    пробел ставил бы на паузу интро под видео.
13. **Панель служебного доступа вместо одних горячих клавиш.** Комментарий
    [21-backstage.js:10](../../js/core/21-backstage.js#L10): у телефона жюри, открывшего питч по
    QR, клавиатуры нет, а полигон, видео и смета должны быть доступны и ему. На компьютере в
    верхней панели — только знак «⌘»: при 1024 px панель заполнена, а с клавиатуры есть `Shift+H`
    (комментарий [21-backstage.js:399](../../js/core/21-backstage.js#L399)).
14. **Горячие клавиши молчат в полях ввода** (`typing()`, `typingIn()`): `Shift+V`, `Shift+B`,
    `Shift+H` — обычные заглавные буквы в терминале демки и в редакторе кода.
15. **Отступ под клавиатуру считается в JS.** Комментарий
    [13-mobile.js:18](../../js/core/13-mobile.js#L18): Android Chrome уменьшает видимую область,
    но `position: fixed` остаются по размеру макета, и поле ввода уходит под клавиши. Порог 120 px
    отсекает дрожание панели браузера.
16. **Канал Элис свёрнут на телефоне средствами CSS, JS только переключает класс.** Комментарий
    [13-mobile.js:43](../../js/core/13-mobile.js#L43): развёрнутый канал съел бы полэкрана.
17. **Фокус в поле ввода на телефоне не ставится.** Комментарий
    [13-mobile.js:234](../../js/core/13-mobile.js#L234): клавиатура закрыла бы сцену раньше, чем
    игрок прочтёт первую строку.
18. **Свайп не перехватывается у прокручиваемого содержимого.** Комментарий
    [13-mobile.js:83](../../js/core/13-mobile.js#L83): ASCII-арт, блок кода или поле ввода
    листаются сами, а не переключают слайд.
19. **Чек-лист по `id` шага и со старым ключом хранилища.** Комментарий
    [12-jury.js:136](../../js/demo/12-jury.js#L136): ключ раньше носил неверное имя героя;
    член жюри, отметивший полсписка до переименования, не должен вернуться к пустому.
20. **Шаги чек-листа — отдельная таблица, а не ключи `STRINGS`.** Комментарий
    [10-i18n.js:293](../../js/core/10-i18n.js#L293): в `STRINGS` только рамка. По коду видно
    причину: шаг — запись с `id`, по которому хранится отметка, и список таких записей удобнее
    держать массивом в порядке прохождения.
21. **Слои окон заданы числами, а не порядком открытия.** Комментарий
    [21-backstage.js:16](../../js/core/21-backstage.js#L16): `Shift+O` поверх сметы показывает
    полигон сверху, видео всегда выше всего.

## Связи

**`10-i18n.js` берёт** (всё — внутри функций, через `typeof`):

| Имя | Владелец |
|---|---|
| `settingsState` | `11-settings.js` |
| `voiceSync()` | `core/00-voice-sync.js` |
| `JuryIntro` | `presentation/16-jury-intro.js` |
| `loadAliceAudio()`, `popupBack`, `popupTitle` | `presentation/09-alice-stream.js` |
| `VoiceMedia` | `core/15-voice-media.js` |
| `VoiceExtras` | `core/18-voice-extras.js` |
| `SLIDES_BY_LOCALE`, `SLIDES` (переприсваивает) | `presentation/02-slides.js` |
| `current`, `renderSlide()` | `presentation/07-deck.js` |
| `renderSettingsPopup()` | `11-settings.js` |
| `window.__juryIntroHoldsLink`, `window.__demoSyncLocale`, `window.__jurySyncLocale` | `16`, `06`, `12` |

**`10-i18n.js` отдаёт:** `t()` — `06`, `07`, `09`, `11`, `16`, `17`, `18`, `20`, `21`;
`applyLocale()` — только `applySettings()` в `11`; `STRINGS` — `11` (`STRINGS` в комментарии),
`voice/lib.js` (читает и правит файл). `06-demo.js:20,46` ищет `window.STRINGS`, но `const`
верхнего уровня на `window` не попадает — эта запасная ветка всегда пуста.

**`11-settings.js` берёт:** `t()`, `applyLocale()` (`10`); `Audio` (`01`); `bootscreen`,
`bootOverload`, `bootMenu`, `popupBack`, `popupTitle`, `popupBody`, `popupClose`, `boot()`,
`loadAliceAudio()`, `setPitchTerminalActive()`, `aliceReact()` (`09`); `animateTitle()`, `current`
(`07`); `SLIDES` (`02`); `VOICE_CLIPS`, `VOICE_TEXT` (`00-voice-*`); `ALICE_STORY_LINES`,
`ALICE_BG_LINES` (`08`); `JuryIntro` (`16`), `VoiceExtras` (`18`), `AiSandbox` (`20`) — через
`typeof`; `window.__demoActive`, `window.__demoSyncSettings` (`06`). Элементы попапа и меню
используются **на верхнем уровне** (`popupClose.addEventListener` и т. д.) — они объявлены в `09`,
который выполняется раньше.

**`11-settings.js` отдаёт:** `settingsState` (он же `window.settingsState`) — читают `01`, `03`,
`05`, `06`, `09`, `10`, `12`, `15`, `16`, `17`, `19`, `20`, `21`; пишет в него только сам `11`.
`applySettings` (он же `window.applySettings`) — внешних вызовов нет. `renderSettingsPopup()` — `10`.
`escapeHtml()` — вызывается в `09` и `11`; см. «Подводные камни».

**`12-jury.js`:** берёт `settingsState`, `Audio`; отдаёт `JURY_CHECKLIST_BY_LOCALE`, `JuryChecklist`
(снаружи не вызывается) и хук `window.__jurySyncLocale` для `10`.

**`13-mobile.js`:** берёт `renderSlide()`, `current` (`07`), `SLIDES` (`02`), `window.__demoActive`
(`06`); отдаёт `MobileUX` (снаружи не вызывается) и `window.__dgSkipAutofocus` для `06-demo.js`
([06-demo.js:1593](../../js/demo/06-demo.js#L1593), `2431`, `3140`, `3152`).

**`17-evidence.js`:** берёт `t()`, `settingsState`, `Audio`, `VoiceMedia`, `VoiceBus`,
`window.__chatterEnabled`; отдаёт `Evidence` (`21` — плитка видео; кнопка на слайде) и
`ensureEvidenceButton()` (`07-deck.js:49`, на каждом `renderSlide` слайда `SLIDE_05`).

**`21-backstage.js`:** берёт `t()`, `settingsState`, `Audio`, `AiSandbox`, `Evidence`,
`VoiceExtras`, `window.__chatterEnabled`, ключ `ts.secret.locked` (его ставит `18-voice-extras.js:150`);
отдаёт `Backstage` (снаружи не вызывается).

## Константы и состояние

### `10-i18n.js`

| Имя | Значение / тип | Смысл | Кто пишет / читает |
|---|---|---|---|
| `STRINGS` | `{ ru, en, tj, tj_col }` по 458 ключей | все подписи интерфейса и строки демки | правят люди и `voice/lib.js`; читает `t()` |
| `_appliedLocale` | `string \| null` | последний отрисованный язык; `null` — ещё ни разу | пишет и читает `applyLocale()` |

### `11-settings.js`

| Имя | Значение / тип | Смысл | Кто пишет / читает |
|---|---|---|---|
| `SETTINGS_DEFAULTS` | объект, 20 полей | умолчания (таблица выше) | читает инициализация и сброс |
| `settingsState` | `let`, объект | текущие настройки; переменная не переприсваивается, объект мутируется | пишет попап настроек; читают 13 файлов |
| `LOCALES` | `["ru","en","tj","tj_col"]` | допустимые значения `ts.locale` | инициализация |
| `ji`, `loc` | строки | временные при чтении `localStorage` в блоке `try` на верхнем уровне | — |
| `_settingsActiveTab` | `"audio"` | открытая вкладка настроек; живёт между открытиями попапа | `renderSettingsPopup()` |
| `VOICE_DEMO_LINES` | 6 пар `[id записи, ключ STRINGS]` | реплики демки, которые звучат вслух: `demo.end.cry`, `demo.scare.voice`, `demo.walk.voice`, `demo.solved.hard/medium/easy` → `demo.ed.aliceSolved_*` | `voicePanelRows()` |
| `GHOST_SKETCHES` | 5 строк SVG 400×580 | силуэты призраков: маска с рогами, лис в капюшоне, колючие волосы, заячьи уши со швами, раздвоенное лицо | `spawnGhost()` |

### `12-jury.js`

| Имя | Значение / тип | Смысл |
|---|---|---|
| `JURY_CHECKLIST_BY_LOCALE` | `{ ru, en, tj, tj_col }`, по 14 записей `{ id, step, desc }` | шаги: `boot`, `slides`, `settings`, `demo-open`, `void-walk`, `os-boot`, `os-read`, `os-svc`, `os-change`, `os-fsck`, `os-edit`, `os-anomaly`, `os-recover`, `exit-demo` |
| `JuryChecklist` | IIFE → `{ init, render, reset, setOpen }` | модуль чек-листа |
| `STORE_KEY` | `"neikon.jury.v1"` | ключ `localStorage` |
| `STORE_KEY_LEGACY` | `"nathan.jury.v1"` | старый ключ; читается один раз и удаляется |
| `state` | `{ open: false, checked: {} }` | раскрыт ли список и отметки по `id` |

### `13-mobile.js`

| Имя | Значение / тип | Смысл |
|---|---|---|
| `MobileUX` | IIFE → `{ init, isPhone }` | модуль телефонного слоя |
| `mqPhone` | `matchMedia("(max-width: 820px)")` | «телефон» по ширине; совпадает с брейкпоинтом CSS |
| `mqTouch` | `matchMedia("(hover: none) and (pointer: coarse)")` | сенсорный экран без мыши |

### `17-evidence.js`

| Имя | Значение / тип | Смысл | Кто пишет / читает |
|---|---|---|---|
| `Evidence` | IIFE → `{ open, close, isOpen }` | плеер | `21`, кнопка слайда |
| `BASE` | `"assets/video/classroom_trial"` | общий префикс файлов | `VARIANTS`, постер |
| `VARIANTS` | `{ hd, 540, 360 }` → `{ url, label }` | три копии | `switchTo`, `pref`, `tick` |
| `LADDER` | `["hd","540","360"]` | порядок спуска | `stepDown`, обработчик `error` |
| `PREF_KEY` | `"ts.evidence.q"` | ручной выбор качества | `pref`, `setPref` |
| `STALL_LIMIT_MS` | 6000 | суммарный простой, после которого АВТО спускается на ступень | обработчик `playing` |
| `el`, `video` | `HTMLElement`, `HTMLVideoElement` | корень `.ev` и видео; `null` до первого открытия | `build()` |
| `open`, `busy` | `boolean` | плеер открыт / идёт анимация открытия-закрытия (520/480 мс, 150 в спокойном режиме) | `openPlayer`, `close` |
| `lastFocus` | элемент | куда вернуть фокус | `openPlayer` → `close` |
| `chosen` | `"hd"\|"540"\|"360"\|null` | копия, стоящая в `video.src` | `switchTo` |
| `stallMs`, `stallT0` | мс | накопленный простой и начало текущего | обработчики `waiting`/`playing`, `switchTo` |
| `raf` | id кадра | цикл `tick()` | `openPlayer`, `close` |
| `saved` | `{ chatter, music } \| null` | что было до `hush()` | `hush`, `unhush` |

### `21-backstage.js`

| Имя | Значение / тип | Смысл |
|---|---|---|
| `Backstage` | IIFE → `{ openCost, closeCost, openPanel, closePanel, costOpen, panelOpen }` | модуль |
| `COST` | `{ ru, en, tj }`, схема выше | данные сметы |
| `cs`, `csOpen` | элемент `.cs` / `boolean` | смета; элемент создаётся при первом открытии |
| `bs`, `bsOpen` | элемент `.bs` / `boolean` | панель доступа |
| `lastFocus` | элемент | фокус до первого из двух окон |
| `savedChatter` | `boolean \| null` | `__chatterEnabled` до открытия; `null` — ничего не заглушено |

## Функции

### `10-i18n.js`

#### [`t(key)`](../../js/core/10-i18n.js#L2069) → `string`
Строка для текущего языка; цепочка «язык → `ru` → ключ» описана выше. Локальные `loc` и `dict` —
язык и его словарь. Побочных эффектов нет. Подстановки `{n}` не делает.

#### [`applyLocale(loc)`](../../js/core/10-i18n.js#L2082) → `undefined`
Переключает язык всей страницы (шаги 1–10 выше). Локальные: `changed` — язык отличается от
`_appliedLocale`; `booting` — первый вызов; `synced` — результат `voiceSync()` (промис или `null`),
после которого запускаются загрузки нового языка. Трогает DOM (`lang`, `data-i18n*`), `SLIDES`,
хуки `06` и `12`, попап настроек. Вызывает только `applySettings()`. Ломается, если элемент с
`data-i18n` добавлен после смены языка: он получит строку только при следующей смене.

### `11-settings.js`

#### [`applySettings()`](../../js/core/11-settings.js#L51) → `undefined`
Переносит `settingsState` на страницу: локальные `root`/`body` — `<html>` и `<body>`, `crtMap` —
прозрачность сканлайна по `crt`. Ставит `--crt-line`, классы `no-vignette`, `epilepsy-safe`,
`big-font`, фильтр контраста (зажат в 60–140), флаги `__ghostsEnabled`, `__titleGlitchEnabled`,
`__chatterEnabled`, громкости, музыку и звуки (учитывая `__demoActive`), затем `applyLocale()` и
`__demoSyncSettings()`. Зовут: `bootEverything()`, обработчики попапа настроек.

#### [`openPopup(title, html, opts)`](../../js/core/11-settings.js#L106) → `undefined`
Общий попап стартового меню: `dlg` — `#bootPopup`, `opts.wide` ставит класс `wide`; заголовок
через `textContent`, тело через `innerHTML`; `#bootPopupBack.open`; `Audio.playOpen()`.

#### [`closePopup()`](../../js/core/11-settings.js#L115) → `undefined`
Если попап открыт: останавливает тест голоса (`VoiceExtras.stopTest()`), снимает `open`,
`Audio.playClose()`. Зовут крестик, клик по подложке, `Escape` (слушатель `document`).

#### [`isAudible(el)`](../../js/core/11-settings.js#L130) → `boolean`
Кнопка входит в набор со звуком наведения/клика: `.boot-btn`, `.settings-tab`, `.reset-btn`,
`.slide-btn`, кнопки `.toggle` и `.close` попапа, `.load-skip`. Используют делегированные
слушатели `pointerover` и `click` (фаза захвата) на `document`; пока открыта демка — молчат.

#### [`renderSettingsPopup(forceTab)`](../../js/core/11-settings.js#L148) → `undefined`
Собирает попап НАСТРОЕК для `_settingsActiveTab` (или `forceTab`). Локальные: `tabs` — пять вкладок
`audio`/`video`/`game`/`a11y`/`system` с ключами подписей; `tabBar` — их HTML; `pane` — HTML
активной вкладки. Вложенные помощники:
- `pickRow(label, key, opts)` — ряд кнопок `data-key`/`data-val`, активная с классом `on`;
- `sliderRow(label, key, min, max, step, suffix)` — `<input type=range data-skey>` и подпись `data-vlabel`;
- `boolRow(label, key)` — `pickRow` с `true`/`false` (вкл/выкл).

После `openPopup()` вешает обработчики: вкладки; кнопки (`"true"`/`"false"` → `boolean`, запись в
`settingsState`, для `locale`/`juryIntro` — в `localStorage`, `applySettings()`, перерисовка,
`JuryIntro.prime()` для интро); ползунки (`input` → число, подпись, `applySettings()`); `reset` —
кнопка сброса (очистка объекта на месте, `Object.assign` умолчаний, удаление `ts.juryIntro` и
`ts.locale`); `sandbox` — кнопка `[data-act=sandbox]` → `AiSandbox.open()`. В конце
`VoiceExtras.mount(popupBody, вкладка)` — тест голоса под ползунком голоса. Зовут: меню, `10`, сам себя.

#### [`renderLoadPopup()`](../../js/core/11-settings.js#L334) → `undefined`
Попап ЗАГРУЗИТЬ: три пустых слота (`slotLbl`, `empty` — подписи) и реплика Элис `load.note_html`.
Сохранений в игре нет — это декорация.

#### [`renderExtraPopup()`](../../js/core/11-settings.js#L351) → `undefined`
Попап ЭКСТРА: `extra.body_html` (антология эпизодов) и кнопка `#extraVoiceBtn` (`vb`) →
`renderVoicePopup()`.

#### [`voicePanelRows()`](../../js/core/11-settings.js#L394) → `{ deck, demo, loc }`
Каталог всех озвучиваемых реплик для текущего языка. Локальные: `clips` и `texts` — записи и
переводы языка из `VOICE_CLIPS`/`VOICE_TEXT`; `deck`/`demo` — две группы строк. Вложенные:
- `push(arr, id, text, hasBaked)` — строка `{ id, mark, tone, text, path }`: `✓` своя запись,
  `·` вшитая русская, `○` только текст; путь `assets/voice/<loc>/<id>.mp3`;
- `deckLine(p)` — реплика дека из `ALICE_STORY_LINES`/`ALICE_BG_LINES`; вшитая русская запись
  засчитывается, только пока реплика не переведена (то же правило, что `voiceSrcFor` в `09`).

Реплики демки берутся из `VOICE_DEMO_LINES` — в `STRINGS` нет пометки «звучит вслух».

#### [`renderVoicePopup()`](../../js/core/11-settings.js#L424) → `undefined`
Попап ОЗВУЧКА: `data` из `voicePanelRows()`, `row(r)` рисует строку (текст режется до 72 символов
и экранируется `escapeHtml`), слот `#voiceStudioSlot`, подсказка «перезапустить сервер: start.bat».
Затем `voiceStudioLink()`.

#### [`voiceStudioLink()`](../../js/core/11-settings.js#L475) → `undefined`
Заполняет `slot` (`#voiceStudioSlot`): с `http(s):` спрашивает `GET api/voice/info`; если ответ
`{ ok, local }` — кнопка «ОТКРЫТЬ СТУДИЮ ОЗВУЧКИ» (`window.open("studio.html")`), иначе
вложенная `off()` пишет `voice.studio_off_html` (как запустить `start.bat`). Кнопка, ведущая на
404, не показывается.

#### [`escapeHtml(s)`](../../js/core/11-settings.js#L496) → `string`
Экранирует `& < > "` (одинарную кавычку — нет). Перекрывает одноимённую функцию из
`09-alice-stream.js:35` — см. «Подводные камни».

#### [`renderExitPopup()`](../../js/core/11-settings.js#L502) → `undefined`
Попап ВЫХОД с отказом Элис и кнопкой `#exitConfirm`; по ней содержимое `#bootscreen` заменяется
надписью SIGNAL LOST. Вернуть — только перезагрузкой страницы.

#### [`transitionToTerminal()`](../../js/core/11-settings.js#L534) → `undefined`
Переход из загрузки в дек (схема выше): `loadAliceAudio()` в любом случае, звуки, вспышка
`#bootOverload`, `#bootscreen.gone`, снятие `body.booting`, перезапуск печати заголовка, фокус
`#stage`, `setPitchTerminalActive(true)`, первая реплика Элис через 700 мс.

#### Обработчик меню ([11-settings.js:561](../../js/core/11-settings.js#L561))
`click` на `#bootMenu`: `btn` — ближайшая `.boot-btn` (не `disabled`), `data-action`:
`play` → `startNewGame()`, `load`, `settings`, `extra`, `exit` → соответствующий попап.

#### [`startNewGame()`](../../js/core/11-settings.js#L575) → `undefined`
Единственная точка запуска загрузки. `overlay` — `#loadingOverlay`; если он уже `active` — выход
(второй раз за жизнь страницы загрузка не запускается: класс не снимается). Сбрасывает
`fill`, `pct`, `log`, `bar`, `meta`, `skip`, `status` (одноимённые `#load*`), `Audio.playClick()`,
`runLoadingSequence(() => transitionToTerminal())`.

#### [`spawnGhost()`](../../js/core/11-settings.js#L718) → `undefined`
Если `__ghostsEnabled` выключен — только планирует следующий. Иначе: `svg` — случайный из
`GHOST_SKETCHES`; `div.glitch-ghost.memory.sketch` шириной 240–400 px (высота ×1.45); `onLeft` —
край экрана, `maxLeft`, `xLeft` (0–80 px от левого края), `xRight` (0–80 px от правого); `top`
случайный; `svgEl` поворачивается на ±2° и в 40 % случаев отражается. Удаляется по
`animationend` (анимация `ghost-memory` 2.4 с в `styles.css`), `Audio.playGhost()`,
`scheduleNextGhost()`. Призраки живут и после стартового экрана: в деке они под слоем слайдов
(`z-index: 40`).

#### [`scheduleNextGhost()`](../../js/core/11-settings.js#L751) → `undefined`
`setTimeout(spawnGhost, delay)`, `delay` — 5.5–11 с. Цепочка не останавливается никогда.

#### [`runLoadingSequence(onDone)`](../../js/core/11-settings.js#L761) → `undefined`
Фальшивая загрузка (схема выше). Локальные элементы `overlay`, `fill`, `pct`, `status`, `log`,
`bar`, `meta`, `skip`; `p` — текущий процент; `canceled` — последовательность уже завершается
(крах, вход или пропуск), все шаги проверяют его. Вложенные:
- `setPct(n)` — процент (не больше 100) в полосу и текст;
- `setStatus(s)` — строка статуса;
- `addLine(text, cls)` — строка лога (`ok`/`warn`/`err`), хранится не больше 7;
- `ramp(target, duration, statusText, lines)` → `Promise` — линейный рост процента за `duration`
  мс на `requestAnimationFrame` (внутренняя `frame(t)`), строки `lines` равномерно по времени;
  `setStatus` и `addLine` отдаются интро в `JuryIntro.run({ setStatus, addLine })`;
- `panic()` — крах: глитч, 100 %, шесть строк `crashLines` за 1.05 с, на 1.3 с `dying` и стоп
  музыки, на 2.2 с оверлей скрыт и `onDone()`;
- `enter()` — вход из интро («ВОЙТИ В СЕКТОР»): оверлей скрыт и `onDone()` сразу, крах уже
  показало само интро.

Кнопка `skip` появляется через 1.1 с; её обработчик добавляется при каждом запуске (запуск один).

#### [`bootEverything()`](../../js/core/11-settings.js#L907) → `undefined`
`applySettings()` в `try`, `boot()` из `09`, первый призрак через 4.5 с. Вызывается сразу при
выполнении файла (см. «Запуск страницы»).

### `12-jury.js` — методы `JuryChecklist`

| Функция | Что делает |
|---|---|
| [`$(id)`](../../js/demo/12-jury.js#L142) | `document.getElementById` |
| [`locale()`](../../js/demo/12-jury.js#L143) | `settingsState.locale` или `"ru"` |
| [`items()`](../../js/demo/12-jury.js#L147) | шаги текущего языка, неизвестный → `ru` |
| [`load()`](../../js/demo/12-jury.js#L152) | читает `neikon.jury.v1`; если пусто — `nathan.jury.v1`, переписывает его под новым ключом и удаляет старый (ошибка записи игнорируется — хватит чтения); разбирает JSON в `state` |
| [`save()`](../../js/demo/12-jury.js#L172) | `state` → `localStorage` |
| [`updateProgress()`](../../js/demo/12-jury.js#L176) | считает отмеченные шаги текущего списка → `#juryDone`, `#juryTotal`, `#juryPct`, ширина `#juryFill` |
| [`render()`](../../js/demo/12-jury.js#L192) | перерисовывает `#juryList`: `li.jury-item[data-id]` (класс `done`), `step` через `textContent`, `desc` через `innerHTML`; галочка пишет `state.checked[id]`, сохраняет, обновляет прогресс, звук `playOpen` (отметил) или `playClick` (снял) |
| [`setOpen(open)`](../../js/demo/12-jury.js#L229) | `#jury[data-collapsed]` 0/1, `#juryTab[aria-expanded]`, сохранение |
| [`toggle()`](../../js/demo/12-jury.js#L237) | `setOpen(!state.open)` |
| [`reset()`](../../js/demo/12-jury.js#L238) | очищает отметки, сохраняет, перерисовывает |
| [`init()`](../../js/demo/12-jury.js#L244) | нет `#jury` — выход; `load`, `render`, `setOpen(state.open)`; `#juryTab` → `toggle` + щелчок; `#juryClose` → закрыть; `#juryReset` → `window.confirm` (текст по-английски для `en`, иначе по-русски) → `reset`; ставит `window.__jurySyncLocale = () => render()` |

`init()` вызывается сразу при выполнении файла (у `defer` `readyState` уже не `"loading"`).

### `13-mobile.js` — функции `MobileUX`

#### [`isPhone()`](../../js/core/13-mobile.js#L16) → `boolean`
`mqPhone.matches` — ширина ≤ 820 px.

#### [`trackKeyboard()`](../../js/core/13-mobile.js#L24) → `undefined`
Без `window.visualViewport` — выход. Вложенная `apply()`: `hidden = innerHeight − (vv.height + vv.offsetTop)`;
больше 120 px → `--kb` = округлённое значение и `body.kb-open`, иначе 0. `schedule()` собирает
события `resize` и `scroll` визуальной области в один кадр (`raf`).

#### [`setupAlice()`](../../js/core/13-mobile.js#L47) → `undefined`
`.alice-head` получает `role="button"` и `tabindex="0"`. `setExpanded(on)` — класс `expanded` и
`aria-expanded`; `toggle()` — только на телефоне; клик, `Enter` и пробел. `sync()` при выходе за
брейкпоинт снимает `expanded` (на широком экране панель всегда открыта).

#### [`setupSwipe()`](../../js/core/13-mobile.js#L77) → `undefined`
`touchstart`/`touchend` на `#stage` (пассивные). Не отслеживает, пока открыта демка, при
мультитаче и если касание началось в элементе, которому принадлежит горизонтальная прокрутка —
`ownsHorizontalScroll(node)`: идёт вверх до `#stage`, `true` при `scrollWidth − clientWidth > 8`
или `INPUT`/`TEXTAREA`/`SELECT`. Условия свайпа: ≤ 800 мс, |dx| ≥ 55 px, |dx| ≥ 1.6·|dy|; влево —
следующий слайд, вправо — предыдущий, по кругу.

#### [`setupNavStrip()`](../../js/core/13-mobile.js#L120) → `undefined`
`MutationObserver` на классы внутри `#menu`; `reveal()` на телефоне прокручивает ленту так, чтобы
`button.slide-btn.active` стояла по центру (`scrollTo`, `smooth`).

#### [`setupDemoHud()`](../../js/core/13-mobile.js#L142) → `undefined`
Ищет `#demoGame .dg-game`; **сейчас его нет в разметке, функция выходит на второй строке**.
Задумано было: кнопка `#dgHudToggle` «HUD» и подложка `.dg-hud-scrim`, класс `hud-open` на
`#demoGame`; `placeStats()` переносит `.dg-stats` над сценой на телефоне и обратно в `.dg-side`
на широком экране (по `change` медиазапроса, `orientationchange` и `resize` через кадр);
`setOpen(on)` — класс и `aria-expanded`; панель закрывается при открытии редактора `#dgEditor`,
при закрытии демки и по `Escape`.

#### [`setupAutofocusPolicy()`](../../js/core/13-mobile.js#L239) → `undefined`
Ставит `window.__dgSkipAutofocus = () => mqTouch.matches || isPhone()`.

#### [`init()`](../../js/core/13-mobile.js#L243) → `undefined`
Шесть `setup*` по порядку из таблицы выше. Вызывается сразу при выполнении файла.

### `17-evidence.js` — функции `Evidence`

#### [`tx(key, fallback)`](../../js/core/17-evidence.js#L50) → `string`
`t(key)`, если строка есть, иначе `fallback` (русский текст, вписанный в вызов).

#### [`calm()`](../../js/core/17-evidence.js#L53) → `boolean`
`body.epilepsy-safe` или `prefers-reduced-motion: reduce` → спокойный режим (класс `ev-calm`,
короткие таймауты 150 мс).

#### [`pref()`](../../js/core/17-evidence.js#L57) / [`setPref(v)`](../../js/core/17-evidence.js#L61)
Читают/пишут `ts.evidence.q`; допустимы `auto`, `hd`, `540`, `360`, иначе `auto`.

#### [`nearHost()`](../../js/core/17-evidence.js#L65) → `boolean`
Страница открыта с этой машины или из частной сети (список адресов выше).

#### [`measuredMbps()`](../../js/core/17-evidence.js#L73) → `number`
Сумма `transferSize` ресурсов больше 60 000 байт, делённая на сумму их `responseEnd − responseStart`;
`байты·8/1000/мс` = Мбит/с. Нет таких ресурсов или ошибка → 0. Взятые из кеша ресурсы имеют
`transferSize` 0 и не считаются.

#### [`autoPick()`](../../js/core/17-evidence.js#L85) → `"hd"|"540"|"360"`
Выбор АВТО (порядок выше).

#### [`build()`](../../js/core/17-evidence.js#L98) → `undefined`
Создаёт `.ev[role=dialog][aria-modal]` с видео (`playsinline`, `preload="none"`, постер), полосой
REC, тайм-кодом, кнопкой паузы, ползунком 0–1000, кнопками качества `data-q` и закрытия.
Слушатели: клик (закрыть, пауза, выбор качества → `setPref`, `switchTo`, `paintQ`; клик по видео —
пауза), `input` ползунка (перемотка), `waiting`/`playing` (простои, `ev-buffering`,
спуск при `stallMs > STALL_LIMIT_MS`), `play`/`pause` (значок), `error` (следующая копия).

#### [`relabel()`](../../js/core/17-evidence.js#L162) → `undefined`
Если язык отличается от `el.dataset.loc` — переписывает aria-подписи и тексты плеера.

#### [`paintQ()`](../../js/core/17-evidence.js#L175) → `undefined`
Кнопка выбранного режима — класс `on`; в АВТО кнопка реально играющей копии — `live`.

#### [`switchTo(q)`](../../js/core/17-evidence.js#L183) → `undefined`
Неизвестная или текущая копия — выход. Запоминает позицию, сбрасывает простои, отмечает копию в
`video.__tried`, меняет `src`, по `loadedmetadata` вложенная `resume()` возвращает позицию и,
если плеер открыт, запускает воспроизведение. `video.load()`, `paintQ()`.

#### [`stepDown()`](../../js/core/17-evidence.js#L200) → `undefined`
`switchTo` на следующую ступень `LADDER`, если она есть.

#### [`safePlay()`](../../js/core/17-evidence.js#L205) → `undefined`
Снимает `muted`, громкость = `masterVol()`, `video.play()` с проглоченным отказом автозапуска.

#### [`toggle()`](../../js/core/17-evidence.js#L211) → `undefined`
Пауза ↔ воспроизведение.

#### [`masterVol()`](../../js/core/17-evidence.js#L212) → `0…1`
`settingsState.volMaster / 100` (по умолчанию 70). Видео идёт мимо Web Audio, поэтому громкость
ставится элементу напрямую.

#### [`mmss(s)`](../../js/core/17-evidence.js#L217) → `"мм:сс"`
Формат тайм-кода.

#### [`tick()`](../../js/core/17-evidence.js#L221) → `undefined`
Каждый кадр, пока открыт: тайм-код `текущее / длина · метка копии`, ползунок (если не в фокусе),
громкость — ползунок «ОБЩАЯ ГРОМКОСТЬ» действует сразу.

#### [`hush()`](../../js/core/17-evidence.js#L232) / [`unhush()`](../../js/core/17-evidence.js#L246)
Глушат и возвращают дек (см. выше). `unhush()` всегда зовёт `VoiceMedia.resumeAll()`.

#### [`openPlayer()`](../../js/core/17-evidence.js#L256) → `undefined` (наружу — `Evidence.open`)
Если уже открыт или идёт анимация — выход. `build()` при первом вызове, `relabel()`, `hush()`,
классы `ev-on`/`ev-calm` (с принудительной перерисовкой `offsetWidth`), звук, выбор копии при
первом открытии (иначе `safePlay()`), фокус на «ЗАКРЫТЬ» через 520 мс (150 в спокойном режиме),
запуск `tick()`.

#### [`close()`](../../js/core/17-evidence.js#L279) → `undefined`
Пауза, `muted`, класс `ev-off`, звук; через 480 мс (150) — `hidden`, `unhush()`, фокус обратно на
`lastFocus` или `#stage`. Слайд и фокус остаются где были.

#### [`typing(target)`](../../js/core/17-evidence.js#L300) → `boolean`
Фокус в поле ввода: `contenteditable`, `TEXTAREA`, `SELECT`, текстовый `INPUT`, внутри
`.cm-editor`, `.CodeMirror`, `.code-input`, `[data-code-input]`.

#### Слушатель клавиш ([17-evidence.js:309](../../js/core/17-evidence.js#L309))
`window`, фаза захвата. `Shift+V` (и `Ctrl+Shift+V`; без `Alt`/`Meta`, без автоповтора): открыть,
если фокус не в поле ввода, или закрыть. Пока открыт — все клавиши останавливаются
(`stopImmediatePropagation`): `Escape` закрывает, пробел (не на кнопке) — пауза, стрелки ←/→ —
±5 с (кроме фокуса на ползунке).

#### [`ensureEvidenceButton(rootEl)`](../../js/core/17-evidence.js#L335) → `undefined`
Глобальная функция вне модуля. Если в `rootEl` нет `.ev-cta` — создаёт кнопку
`● [ВИДЕОФИКСАЦИЯ…] Shift+V` (`data-i18n="ev.cta"`, текст сразу из `t()`) и ставит её перед
`anchor` — `.qr-block` или `.codeblock`, иначе в конец. Зовёт `renderSlide()` в `07-deck.js` на
каждой отрисовке `SLIDE_05`, поэтому кнопка переживает смену языка.

### `21-backstage.js` — функции `Backstage`

#### Помощники
- [`tx(key, fallback)`](../../js/core/21-backstage.js#L190) — как в `17`.
- [`esc(s)`](../../js/core/21-backstage.js#L193) — экранирует `& < > "`, `null` → `""`. Все данные
  сметы и подписи плиток проходят через него.
- [`calm()`](../../js/core/21-backstage.js#L198) — как в `17` (классы `cs-calm`, `bs-calm`).
- [`loc()`](../../js/core/21-backstage.js#L202) — язык для `COST`: `tj_col` → `tj`.
- [`quiet(on)`](../../js/core/21-backstage.js#L206) — `on`: запомнить `__chatterEnabled` (если ещё не
  запомнен) и выключить; `off`: вернуть, только когда закрыты оба окна.
- [`remember()`](../../js/core/21-backstage.js#L210) — запомнить фокус, если ни одно окно не открыто.
- [`giveBack()`](../../js/core/21-backstage.js#L211) — когда оба окна закрыты: фокус на запомненный
  элемент (если он ещё в документе и не `body`), иначе `blur()`.

#### [`costHtml(d)`](../../js/core/21-backstage.js#L219) → `string`
HTML листа сметы из записи `COST`: шапка (`.cs-title`, `.cs-sub`, `.cs-x`), прокручиваемая
`.cs-scroll[tabindex=-1]`, три KPI, разделы, сноски. Вложенные: `table(sec)` — раздел с
таблицей (свои `cols` раздела или общие), `row(r, cls)` — строка `<th scope=row>` + две ячейки,
сумма в `td.n`, итог с классом `total`, за ним строки `after` без класса.

#### [`openCost()`](../../js/core/21-backstage.js#L247) → `undefined`
Молча закрывает панель доступа, запоминает фокус, создаёт `.cs[role=dialog]` при первом вызове
(клик по подложке или `.cs-x` закрывает), пересобирает содержимое на текущем языке, анимация `on`,
`quiet(true)`, звук, через 50 мс фокус на `.cs-scroll` — стрелки и `PgUp`/`PgDn` листают лист.

#### [`closeCost()`](../../js/core/21-backstage.js#L274) → `undefined`
Класс `off`, звук, через 380 мс (120) `hidden`, `quiet(false)`, `giveBack()`.

#### [`touch()`](../../js/core/21-backstage.js#L287) → `boolean`
`hover: none` или ширина ≤ 820 px — телефонный вид панели (без клавиш и QR).

#### [`secretFound()`](../../js/core/21-backstage.js#L290) → `boolean`
`localStorage["ts.secret.locked"] === "1"` — «Взаперти» уже находили (ключ ставит
`18-voice-extras.js`; несмотря на имя, `"1"` значит «открыт»).

#### [`tile(id, icon, title, desc, key, disabled)`](../../js/core/21-backstage.js#L292) → `string`
Кнопка `.bs-tile[data-bs]`; запертая — класс `locked` и `aria-disabled`; `<kbd>` с клавишей только
не на телефоне.

#### [`panelHtml()`](../../js/core/21-backstage.js#L299) → `string`
Шапка, вводная строка, плитки (таблица выше), на компьютере — список клавиш `<dl>`.

#### [`openPanel()`](../../js/core/21-backstage.js#L331) → `undefined`
Запоминает фокус, создаёт `.bs[role=dialog]` при первом вызове (клик по подложке или `.bs-x`
закрывает, по плитке — `run`), пересобирает содержимое, `on`, `quiet(true)`, звук, фокус на
первую плитку через 50 мс.

#### [`closePanel(silent)`](../../js/core/21-backstage.js#L357) → `undefined`
Скрывает сразу, без анимации. `silent` — без звука и без возврата фокуса (так закрывают перед
открытием другого окна).

#### [`run(b)`](../../js/core/21-backstage.js#L367) → `undefined`
Запертая плитка — перезапуск анимации `nope`. Иначе молча закрывает панель и выполняет действие
плитки.

#### [`mount()`](../../js/core/21-backstage.js#L383) → `undefined`
По `DOMContentLoaded`: кнопка `.bs-fab` («⌘ ДОСТУП», `data-i18n="bs.fab"`, `data-i18n-aria="bs.title"`
— `applyLocale()` держит её подписи) и значок `.bs-chip` «⌘» с разделителем `  |  ` в
`.topbar .right`. Обе — не дублируются при повторном вызове.

#### [`typingIn(target)`](../../js/core/21-backstage.js#L413) → `boolean`
Как `typing()` в `17`, без проверки редакторов кода.

#### Слушатель клавиш ([21-backstage.js:421](../../js/core/21-backstage.js#L421))
`window`, фаза захвата. `costKey` — `Shift+B` без других модификаторов и автоповтора; `panelKey` —
`Shift+H` или `?`. Смета открыта: все клавиши останавливаются; `Escape`/`Shift+B` закрывают;
↑/↓ — 60 px, `PgUp`/`PgDn` и пробел (`Shift+пробел` — назад) — 85 % высоты, `Home`/`End` — к
краю. Панель открыта: клавиши останавливаются, `Escape`/`panelKey` закрывают. Иначе (не в поле
ввода) — открыть смету или панель.

## DOM, классы, события, хранилище

Общие таблицы флагов `window.*` и ключей `localStorage` — в [README.md](README.md#флаги-window).
Здесь — то, что относится к этим шести файлам.

**`localStorage`:** `ts.locale`, `ts.juryIntro` (пишет попап настроек, удаляет сброс);
`neikon.jury.v1` (`{ open, checked }`), `nathan.jury.v1` (только читается и удаляется);
`ts.evidence.q`; `ts.secret.locked` (только читает `21`).

**`window.*`, которые ставят эти файлы:** `settingsState`, `applySettings`, `__ghostsEnabled`,
`__titleGlitchEnabled`, `__chatterEnabled` (`11`; `17` и `21` временно гасят); `__jurySyncLocale`
(`12`); `__dgSkipAutofocus` (`13`). Читают: `__demoActive`, `__demoSyncLocale`,
`__demoSyncSettings`, `__juryIntroHoldsLink`.

**Атрибуты локализации:** `data-i18n`, `data-i18n-html="1"`, `data-i18n-aria`,
`data-i18n-placeholder`, `data-i18n-title`; `<html lang>`.

**CSS-переменные и классы:**

| Что | Где ставится | Значение |
|---|---|---|
| `--crt-line` на `<html>` | `applySettings` | цвет полосы сканлайна |
| `body.no-vignette`, `body.epilepsy-safe`, `body.big-font`, `body.style.filter` | `applySettings` | настройки видео и доступности |
| `body.booting` | снимает `transitionToTerminal` | стартовый экран ещё на месте |
| `#bootPopup.wide`, `#bootPopupBack.open` | `openPopup`/`closePopup` | попап меню |
| `.settings-tab.active`, `.toggle button.on` | `renderSettingsPopup` | активная вкладка и значение |
| `#loadingOverlay.active/.glitching/.dying`, `#loadBar.danger`, `#loadMeta.danger`, `#loadSkip.show` | загрузка | стадии загрузки |
| `#bootOverload.on`, `#bootscreen.gone` | `transitionToTerminal` | вспышка и уход стартового экрана |
| `.glitch-ghost.memory.sketch` | `spawnGhost` | призрак |
| `#jury[data-collapsed]`, `.jury-item.done` | `JuryChecklist` | чек-лист |
| `--kb`, `body.kb-open` | `trackKeyboard` | экранная клавиатура |
| `section.alice.expanded` | `setupAlice` | канал Элис раскрыт |
| `#demoGame.hud-open`, `.dg-hud-toggle`, `.dg-hud-scrim` | `setupDemoHud` (не срабатывает) | панель HUD |
| `.ev`, `.ev-on`, `.ev-off`, `.ev-calm`, `.ev-buffering`; кнопки `.on`/`.live` | `Evidence` | плеер |
| `.ev-cta` | `ensureEvidenceButton` | кнопка на слайде 05 |
| `.cs`, `.cs.on/.off`, `.cs-calm`; `.bs`, `.bs.on`, `.bs-calm`; `.bs-tile.locked/.nope` | `Backstage` | смета и панель |
| `.bs-fab`, `.bs-chip` | `mount` | вход в служебный доступ |

**События:** `click` на `#bootPopupClose`, `#bootPopupBack`, `#bootMenu`; `keydown` `Escape` на
`document` (закрыть попап); `pointerover` и `click` (захват) на `document` — звуки кнопок;
`touchstart`/`touchend` на `#stage`; `resize`/`scroll` на `visualViewport`; `change` у `mqPhone`;
`keydown` в фазе захвата на `window` у `17` и `21`; события `<video>`: `waiting`, `playing`,
`play`, `pause`, `error`, `loadedmetadata`; `DOMContentLoaded` у `21` (`mount`).

**Сеть:** `GET api/voice/info` (`voiceStudioLink`, только с `http(s):`); `voiceSync()` →
`GET api/voice/manifest`; видео `assets/video/classroom_trial*.mp4` и постер; `window.open("qr")`
и `window.open("studio.html")` — страницы `serve.js`.

## Подводные камни

1. **`bootEverything()` выполняется во время загрузки `11`, до `12…21`.** Первый `applyLocale()`
   не находит `__jurySyncLocale`, `JuryIntro`, `VoiceMedia` — и не должен: при `booting` хуки
   не вызываются, а `12` и `21` берут язык сами при создании. Любое новое обращение из `10` или
   `11` к имени из более позднего файла — только через `typeof`.
2. **Элементы, созданные после смены языка, не переводятся сами.** `applyLocale()` проходит по
   DOM один раз за смену. Новый элемент должен получить текст через `t()` в момент создания
   (так делают `17` и `21`) и, если он живёт долго, — `data-i18n*`, чтобы его подхватила
   следующая смена.
3. **`settingsState` нельзя переприсваивать.** `window.settingsState` держит ссылку на исходный
   объект; `06-demo.js`, `01-audio.js`, `03-alice-voice.js` читают через неё. Сброс — только
   очисткой полей и `Object.assign`.
4. **Ключ `_html` = `innerHTML`.** Если значение без разметки, но ключ кончается на `_html`, оно
   всё равно попадёт в `innerHTML`; строки из ввода пользователя в такие ключи не подставлять.
   И наоборот: разметка в ключе без суффикса покажется текстом с тегами в элементах `data-i18n`
   (если нет `data-i18n-html="1"`).
5. **Формат блоков `STRINGS` читает студия.** Заголовок блока языка — ровно 8 пробелов и
   `<loc>: {` на своей строке; озвучиваемые ключи демки (`VOICE_DEMO_LINES`) — одной строкой
   `"ключ": "значение",`. Иначе `patchStrings()` в `voice/lib.js` откажет («найден N раз —
   ожидался один»). Верх файла не должен трогать DOM — `voice/lib.js` выполняет его в Node.
6. **Две функции `escapeHtml`.** [09-alice-stream.js:35](../../js/presentation/09-alice-stream.js#L35)
   экранирует и `'`, [11-settings.js:496](../../js/core/11-settings.js#L496) — нет. Обе —
   объявления `function` верхнего уровня в разных скриптах; после загрузки `11` везде, включая
   `09`, работает версия из `11`. Править надо её.
7. **Перерисовка попапа настроек проверяет заголовок только на русском и английском.**
   ([10-i18n.js:2158](../../js/core/10-i18n.js#L2158)). Сейчас это безвредно: язык меняется только
   из самого попапа, а обработчик кнопки перерисовывает его сам. Но при переключении с `ru`/`en`
   попап рисуется дважды (и дважды звучит `playOpen`). Новый путь смены языка (не из попапа)
   оставит открытый попап на `tj`/`tj_col` непереведённым.
8. **Каждый клик по переключателю настроек — «открытие» попапа.** `renderSettingsPopup()` вызывает
   `openPopup()`, а тот — `Audio.playOpen()`; плюс делегированный щелчок. Обработчики вешаются
   заново на свежий HTML — утечки нет.
9. **Загрузка запускается один раз за жизнь страницы.** Класс `active` с `#loadingOverlay` не
   снимается; повтор `startNewGame()` ничего не сделает. Обработчик `skip` добавляется в
   каждом `runLoadingSequence()` — при повторных запусках они бы копились.
10. **Порядок слушателей клавиш на `window` (захват).** `17` зарегистрирован раньше `21`: при
    открытой смете `Shift+V` открывает видео поверх неё, при открытом видео смета клавиш не
    видит. Новый глобальный обработчик должен так же молчать в полях ввода и не перехватывать
    клавиши, пока открыто чужое окно.
11. **Видео при смене копии продолжает играть, даже если стояло на паузе.** В `switchTo()`
    условие `playing || open` сводится к `open` ([17-evidence.js:194](../../js/core/17-evidence.js#L194)).
12. **АВТО никогда не выбирает `hd` по сети.** Только с локального адреса. На быстром внешнем
    канале будет 540p; оригинал — ручным выбором.
13. **`measuredMbps()` слеп к кешу и чужим доменам.** Ресурсы из кеша и без
    `Timing-Allow-Origin` дают `transferSize` 0 — при повторном открытии без
    Network Information API выбор падает на 360p.
14. **Хуки после смены языка ждут `voiceSync()`.** У запроса манифеста нет тайм-аута: пока он
    висит, `JuryIntro.prime()`, `loadAliceAudio()`, `followAll()`, `relocale()` не вызываются
    (тексты при этом уже переключены).
15. **`setupDemoHud()` и группы ключей демки остались от старого HUD.** Разметки `.dg-game` нет;
    ключи `demo.hud.*`, `demo.quick.*`, `demo.hintmode.*`, `demo.boot.l1–l6`, `demo.game.*`,
    `demo.cmd.*`, 14 из 17 `demo.walk.*`, `demo.input.placeholder`, `demo.desk.side.aria`,
    `demo.ed.failBug`, `demo.ed.failWrong`, `demo.ed.allDoneHint_html`, `demo.ed.nextHint_html`
    (61 на язык) не находятся grep'ом ни литерально, ни по известным динамическим префиксам.
    Удаляя, удаляйте во всех четырёх блоках сразу.
16. **Три настройки ни на что не влияют:** `difficulty`, `autosave` и `titleGlitch`
    (`window.__titleGlitchEnabled` никто не читает, `animateTitle()` в `07` глитчит всегда).
17. **Смета и чек-лист знают не все языки.** `COST` — три записи, `tj_col` показывает `tj`;
    подтверждение сброса чек-листа — только по-английски или по-русски.
18. **Плитка QR работает только через `serve.js`.** `window.open("qr")` с `file://` откроет
    несуществующий файл.
