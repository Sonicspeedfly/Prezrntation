# Демо-движок — справочник

> Файлы: `js/demo/06-demo.js` (3656 строк) · Место в порядке загрузки: после
> `demo/05-void-os.js`, перед `presentation/07-deck.js` (см. `index.html`).
> Связанные страницы: [void-scene.md](void-scene.md) (3D-комната),
> [void-os.md](void-os.md) (файлы, шелл, мир, команды), [audio.md](audio.md)
> (`Audio`, `VoiceBus`, `AliceVoice`), [ui.md](ui.md) (локализация, настройки,
> телефонный режим, чек-лист жюри), [deck.md](deck.md) (слайды, кнопка запуска),
> [styles.md](styles.md) (классы `.demo-game`, `.dg-*`, `.os-*`).

## Коротко

`06-demo.js` — склейка вокруг двух движков: `VoidScene` (рисует комнату) и
`VoidOS` (владеет миром и шеллом). Файл открывает оверлей `#demoGame` поверх
слайдов по кнопке «▶ ЗАПУСТИТЬ ДЕМО-ИГРУ», ведёт игрока по стадиям `boot → diff →
void → osboot → desk → end`, держит оконный менеджер рабочего стола и шесть
приложений, редактор починки с фальшивым компилятором, таблицу из семи задач на
трёх языках, звуковые и «страшные» реакции на счётчик аномалий, катсцену у двери
и экран концовки. Всё это — одна IIFE `DG`; наружу отдаются `open`, `close`,
`syncLocale` и пустой `syncSettings`, плюс глобалы `window.__openDemoGame` и
компания. Последняя строка файла — посторонний для демки `const stageEl`, его
читает `07-deck.js`.

## Как это работает

### Слои и шов

```
 кнопка на слайде 02 ──► window.__openDemoGame ──► DG.open()
                                                     │
        ┌────────────────────────────────────────────▼──────────┐
        │ DG (06): стадии, окна, редактор, звук, ужасы, концовки │
        └──────┬───────────────────────────────▲──────┬─────────┘
   VoidScene.start/sit/setWorld/...   VoidOS.onChange │ VoidOS.exec/examine/...
        ┌──────▼──────┐   setWorld(снимок)   ┌────────┴──────┴──┐
        │ VoidScene   │◄─── pushWorldToScene ┤ VoidOS (05)      │
        │ (04) рисует │                      │ мир + файлы + sh │
        └─────────────┘                      └──────────────────┘
```

`VoidOS` меняет мир и зовёт слушателей. Единственный слушатель — функция из
`wireVoidOs()`: она толкает снимок мира в сцену (`pushWorldToScene()`), играет
звук, трясёт экран, спавнит призраков, пишет в журнал, открывает редактор и
перерисовывает окна. Сцена в мир не пишет никогда.

### Жизненный цикл оверлея

1. `DG.open(source)` ([06-demo.js:1482](../../js/demo/06-demo.js#L1482)):
   при первом вызове `init()` (если `DOMContentLoaded` его ещё не позвал), класс
   `open` на `#demoGame`, `aria-hidden="false"`, `document.body.style.overflow =
   "hidden"`, `window.__demoActive = true`, `silenceTheDeck()`, запоминание и
   выключение музыки слайдов (`state.musicWasOn`, `Audio.setMusicEnabled(false)`),
   запоминание и выключение болтовни Элис (`state.chatterWasOn`,
   `window.__chatterEnabled = false`), `gotoStage("boot")`. Аргумент `source`
   (слайды передают `'slide02'`) не используется.
2. Стадии сменяет только `gotoStage(name)` — см. ниже.
3. `DG.close()` ([06-demo.js:1507](../../js/demo/06-demo.js#L1507)): снимает
   классы `open shake shake-hard speaking fearpulse fearbreach bad-ending fear-100`,
   возвращает прокрутку, `__demoActive = false`, музыку (`state.musicWasOn !== false`)
   и болтовню (если была включена), `Audio.stopAmbient()`, гасит `decayTimer` и
   `fearTimer`, ставит камеру сцены на ноги (`VoidScene.sit(false)`,
   `VoidScene.rearm()`), `stopVoidStage()`, `stopOsBoot()`, ещё раз
   `silenceTheDeck()`. `state.stage` при этом не меняется — следующий `open()`
   сам уйдёт в `boot`.

### Машина стадий

```
 open ─► boot ──(≈2,8 с)──► diff ──клик по карточке──► startGame ─► void
                                ▲                                   │  E у терминала
                    «ЕЩЁ РАЗ»   │                    первый раз ────┤
                                │                  ┌────────────────▼
 end ◄── endRun ◄── катсцена / аномалии ≥ 100      │ osboot (≈14 с или «пропустить»)
                                                   ▼
          void ◄──── standUp (Esc, Ctrl+D, exit, look, кнопка) ──── desk
               ────── E у терминала второй и далее раз ───────────►
```

| стадия | вход | что на экране | выход |
|---|---|---|---|
| `boot` | `runBootSequence()` | ascii-рамка и семь строк `BOOT_LINES` | сам через 300 мс после последней строки → `diff` |
| `diff` | ничего | три карточки `.dg-diff-card[data-diff]` | клик → `startGame(diff)` |
| `void` | `runVoidStage()` при первом входе, `resumeVoidStage()` если `voidActive` | 3D от первого лица, веки, субтитры, компас, кнопка `E`, сенсорный джойстик | `onVoidArrive()` → `osboot` (первый раз) или `desk`; катсцена → `end`; аномалии ≥ 100 → `end` |
| `osboot` | `runOsBoot()` | прошивка → ядро → заставка → оболочка | сам → `desk`; кнопка `#dgOsSkip` → `skipOsBoot()` |
| `desk` | `VoidScene.sit(true)`, `openTerminalApp()`, панели, монитор, фокус | рабочий стол crystal-shell поверх приглушённой комнаты | `standUp()` → `void`; аномалии ≥ 100 → `end` |
| `end` | ничего (текст уже заполнил `endRun`) | заголовок, подзаголовок, отчёт | `#dgRestart` → `diff`; `#dgExitEnd` → `close()` |

`gotoStage(name)` ([06-demo.js:1543](../../js/demo/06-demo.js#L1543)) делает по порядку:

1. Уход с `desk` на любую другую стадию: `VoidScene.sit(false)`, `VoidScene.rearm()`,
   `arrivedHandled = false`.
2. Уход с `void` куда угодно, кроме `desk` и `osboot`: `stopVoidStage()`.
   `osboot` и `desk` считаются «игрок всё ещё в комнате», сцена продолжает
   рисоваться.
3. Уход с `osboot`: `stopOsBoot()`.
4. `state.stage = name`; каждая `.dg-stage` получает `on`, если её `data-stage`
   равен `name`, а на `desk` ещё и `void` остаётся `on`.
5. Корень: `at-desk` на `desk` (CSS прячет HUD комнаты и приглушает канвас),
   атрибут `data-stage`, событие `emitJury("stage")`.
6. Действие входа из таблицы выше.

### Запуск прогона: `startGame(diff)`

[06-demo.js:1623](../../js/demo/06-demo.js#L1623). Копирует профиль
`PROFILES[diff]`, накладывает на `hintStrength` настройку `settingsState.hints`
(`off` → 0, `rare` → не выше 0,35, `full` → 1,0; результат нигде не читается —
см. «Подводные камни»), сбрасывает `state` (сложность, профиль, `sanity = 100`,
`fear = 0`, `progress`, история, `ended`, задачи `TASKS_BY_DIFF[diff]`, `taskIdx`,
`edOpen`, `walkStep = "help"`, `edHintShown`, `osBooted`, `endingPlayed`),
закрывает все окна (`WM.closeAll()`), обнуляет ссылки на терминал и
`deskHistory`, подписывается на `VoidOS` (`wireVoidOs()`, один раз за жизнь
страницы), загружает мир (`VoidOS.boot(diff, state.tasks)`), сразу толкает его в
сцену, прячет редактор, снимает «страшные» классы, обновляет панели и уходит в
`void`.

### Стадия `void`: пробуждение и навигация

`runVoidStage()` ([06-demo.js:1731](../../js/demo/06-demo.js#L1731)). Без
канваса или без WebGL (`VoidScene.supported()` ложно) — сразу `osboot`: питч не
должен упираться в старый ноутбук. Иначе `VoidScene.start(canvas, opts)` с
параметрами:

| параметр | откуда |
|---|---|
| `glitch` | `voidGlitchAmount()`: easy 0,35 / medium 0,7 / hard 1,0; `glitch: "off"` → не выше 0,15; эпилепсия или `prefers-reduced-motion` → не выше 0,2 |
| `scan` | `settingsState.crt`: `off` → 0, `dim` → 0,45, иначе 1 |
| `vignette` | `settingsState.vignette`: `off` → 0,25, иначе 1 |
| `onWake`, `onMove`, `onArrive`, `onLock`, `onInteract` | `onVoidWake`, `onVoidMove`, `onVoidArrive`, `onVoidLock`, `onVoidExamine` |

`VoidScene` умеет ещё `onEntity` (появление/уход сущности), `06` его не передаёт.

Таймлайн пробуждения (все таймеры — через `voidLater()`, гасятся `voidClearTimers()`):

| мс | что |
|---|---|
| 0 | веки закрыты (`--lid: 0`) |
| 620 / 980 / 1320 / 1680 / 2050 | `--lid` 0,28 → 0,02 → 0,55 → 0,12 → 1,00 |
| 1500, 8100, 14700 | субтитры `demo.void.sub1…3`, каждый 6000 мс |
| 17000 | включаются подсказка управления, компас, строка цели; `syncQuestGuide()` |
| 22000 | если игрок не подходил ближе 6,5 м (`voidBestDist`) — `demo.void.nudge` и класс `urge` на компасе |

Плюс сразу: `Audio.playGlitch()`, `Audio.startAmbient()`, `logEvent("sys", demo.void.log_wake)`.

Обратные вызовы сцены:

- `onVoidWake(t, wake)` — прозрачность канваса `0.15 + 0.85 * wake` («глаза ещё не
  фокусируются»).
- `onVoidMove(dist, bearing, target)` — минимальная дистанция, «N.N m» на
  компасе, поворот стрелки на `-bearing`, класс `near` ближе 4 м. Если рядом цель
  (`target`), прячет компас и показывает кнопку `E` с подписью: терминал —
  `demo.void.use` или `demo.void.sit` (после первой загрузки ОС), дверь —
  `demo.void.examine.door`, всё остальное — `demo.void.examine.pylon`. Подпись
  меняется через атрибут `data-i18n`, поэтому `applyLocale()` переводит её сам.
- `onVoidArrive()` — `E` у терминала, один раз на визит (`arrivedHandled`). Если ОС
  уже загружалась (`state.osBooted`) — сразу `desk`. Иначе: HUD гаснет, веки
  закрываются, `Audio.playGlitch()`, `logEvent`, `state.osBooted = true`, через
  720 мс `osboot`.
- `onVoidExamine(id)` — `E` у опоры, прибора или двери. `VoidOS.examine(id)`
  решает, что это значит; ответ показывается табличкой (`showVoidText()`) и
  копируется в терминал с заголовком `// id`. Потом `syncQuestGuide()`.
- `onVoidLock(on)` — снятие захвата мыши запоминает `voidUnlockAt` (см. Escape);
  подсказка управления тускнеет (`locked`) на время захвата.

`syncQuestGuide()` ([06-demo.js:1921](../../js/demo/06-demo.js#L1921)) держит
стрелку компаса на объекте текущей цели (`VoidScene.setGuide(VoidOS.questWhere())`),
включает интерактивность: `pylon1` — когда горит `lamp1`, `pylon2` — `lamp2`,
`gauge1`/`gauge2` — `lamp1` («в тёмной комнате прибор — диск холодного стекла»),
`door` — всегда. Строка цели — `VoidOS.questObjective()`.

`resumeVoidStage()` — возврат из-за стола: без век, без субтитров, без сброса
камеры; HUD включён, табличка убрана, компас перенаправлен.

На телефоне `wireVoidTouch()` даёт два слоя: джойстик слева (радиус 46 px,
`VoidScene.setMove(-dy/R, dx/R)`) и площадку взгляда справа
(`VoidScene.addLook(dx*0.0055, dy*0.0055)`). Каждый палец отслеживается по
`Touch.identifier`, поэтому ходить и смотреть можно одновременно. Слой включается
классом `on`, если `isTouchDevice()`.

### Стадия `osboot`: четыре фазы

`runOsBoot()` ([06-demo.js:2086](../../js/demo/06-demo.js#L2086)), таймеры — `osLater()`,
каждый шаг проверяет `osSkipped`:

| фаза | данные | темп |
|---|---|---|
| `post` | `OS_POST`, 9 строк в `#dgOsPost` | 110–200 мс на строку, затем 380 мс |
| `kernel` | `OS_KERNEL`, 20 строк `[время, текст, класс]` → `span.kl.<класс>` вида `[  1.203771] …` | 105–185 мс на строку, затем 520 мс |
| `splash` | `OS_SPLASH_STEPS`, 4 ключа i18n в `#dgOsStatus`, полоса `#dgOsProgress` 25→100 % | 620 мс на шаг, затем 480 мс |
| `shell` | часы `#dgOsClock`, окно `#dgOsWin` через 700 мс, `OS_SHELL_TYPE` построчно; строка с `type: true` печатается по символу через 42 мс | 460 мс на строку (160 мс на пустую), 560 мс после набранной, 900 мс до `desk` |

По сумме задержек загрузка идёт около 14 с. Кнопка `#dgOsSkip` →
`skipOsBoot()`: `osSkipped = true`, таймеры сняты, `desk`. Текст прошивки и ядра
не переводится, переводятся только шаги заставки.

### Стол: терминал, панели, монитор

На входе в `desk` вызывается `openTerminalApp()`: окно `terminal` в оконном
менеджере, внутри `#dgTermOut`, форма `#dgTermForm`, приглашение `#dgTermPs`, поле
`#dgTermIn` (`maxlength=120`). Разметка строится один раз на окно
(`body.dataset.built`); закрытое окно при следующем открытии строится заново, и
вывод старого пропадает.

Путь строки:

```
Enter → deskSubmit → deskHistory.push, deskEcho("~ $ строка")
      → VoidOS.exec(raw) → { cls, lines, signal? }
         signal "clear" → очистить вывод
         signal "exit" | "look" → standUp()
         иначе deskPrint(cls, lines)
      → updateDeskPrompt(), refreshDeskPanels()
```

Параллельно `VoidOS.exec` излучает `exec` и события мира, и общий хвост слушателя
тоже перерисовывает панели и монитор.

Клавиши поля ввода (`onDeskKey`, [06-demo.js:2737](../../js/demo/06-demo.js#L2737)):

| клавиша | действие |
|---|---|
| `↑` / `Ctrl+P` | предыдущая команда (`deskHistoryStep(-1)`) |
| `↓` / `Ctrl+N` | следующая |
| `Tab` | одно слово — `VoidOS.complete()` по именам команд, иначе `VoidOS.pathComplete()` по последнему слову; один вариант подставляется (после команды — пробел), несколько печатаются строкой |
| `Escape` | `standUp()` с `stopPropagation()` |
| `Ctrl+L` | очистить вывод |
| `Ctrl+C` | на непустой строке — эхо `строка^C` и сброс; на пустой — не трогает (работает копирование) |
| `Ctrl+A` / `Home`, `Ctrl+E` / `End` | курсор в начало / конец |
| `Ctrl+U` / `Ctrl+K` | стереть до начала / до конца строки |
| `Ctrl+W` | стереть слово перед курсором |
| `Ctrl+D` | на пустой строке — встать |

Панели (`refreshDeskPanels()`, [06-demo.js:2832](../../js/demo/06-demo.js#L2832)):
`ТОМ` — `degraded · N` (N нечинёных задач) или `clean`; `АНОМАЛИИ` — `N / 45`
с классом `ok` / `warn` (> 20) / `bad` (> 44); строка-подсказка внизу слева —
`deskNudge()`; часы `HH:MM` (обновляются только вместе с панелями, своего таймера
нет); перерисовка открытых окон `refreshApps()`.

Монитор: `ensureMonitor()` создаёт 2D-канвас 384×288 и отдаёт его сцене
(`VoidScene.setScreen`), `paintMonitor()` рисует приглашение с текущим каталогом,
последнюю команду (`world.lastLine`, 40 символов), до шести строк
`world.lastOut` и `anomaly N/45`; при аномалиях > 45 цвета красные. Потом
`VoidScene.refreshScreen()` — текстура экрана в комнате обновится на следующем
кадре. Монитор перерисовывается после каждого вывода в терминал и каждого события
`VoidOS`.

### Команды

Сам разбор команд — в `VoidOS.exec` (`CMDS` в `05-void-os.js`), полный список с
выводом — в [void-os.md](void-os.md). `06` видит команду только как результат и
события:

| команда | что делает `06` |
|---|---|
| `help` `pwd` `ls` `cd` `cat` `head` `tree` `find` `grep` `stat` `fsck` `rm` `ps` `dmesg` `df` `man` `history` `whoami` `uname` | печатает вывод; `cd` меняет приглашение; `remember` (табличка + строка `ai`) приходит не от `cat`, а от осмотра опор и приборов (`examine`) и от восстановления сессий; `rm` живого устройства поднимает аномалии |
| `svc list\|start\|stop\|restart` | события мира `lamp`/`door` → звук, запись в журнал, сцена |
| `set <ключ> <значение>` | события `fog`/`room`/`barrier`/`lamp`/`door` → сцена |
| `edit <путь>` | событие `edit` → `openEditor(task)` по `taskId` |
| `run /home/neikon/recover.sh` | событие `recover` → `runRecovery()` |
| `clear` | сигнал → очистка вывода |
| `exit`, `look` | сигнал → `standUp()` |
| неизвестная | `VoidOS` поднимает аномалии на 2 → `corruption` → звук и реакции |

Те же действия доступны мышью: окна «Система» и «Файлы» зовут
`VoidOS.exec("svc start lamp1")`, `VoidOS.exec("edit /opt/room/…")`,
`VoidOS.exec("set fog.density 0.02")` — ту же строку, что набрал бы игрок. В
`deskHistory` они не попадают, в `world.lastLine` (монитор) — попадают.

### Оконный менеджер `WM`

[06-demo.js:2263](../../js/demo/06-demo.js#L2263). Модуль внутри `DG` с картой
`open` (id приложения → `{el, body}`), счётчиком `zTop` (с 10) и слоем
`#dgWinLayer`.

- `spawn(id, title, cls)` — если окно открыто, поднимает и возвращает его. Иначе
  строит `div.os-window.<cls>[data-app]` с заголовком (три точки, название,
  кнопка ✕) и телом `.os-win-body`, на десктопе ставит каскадом
  (`left = 60 + 34n`, `top = 56 + 28n` px), вешает подъём по `pointerdown` и
  перетаскивание, играет `Audio.playOpen()`.
- Перетаскивание (`drag`) — Pointer Events с захватом указателя; окно не
  уходит за край настолько, чтобы потерять заголовок (90 px по горизонтали,
  34 px снизу). На телефоне (`isPhone()`, ширина ≤ 820 px) перетаскивания и
  каскада нет — CSS раскладывает окна на весь экран.
- `closeTop()` закрывает окно с наибольшим `z-index` и сообщает, было ли что
  закрывать — так `Escape` знает, что пора вставать.
- `syncDock()` ставит `active` на кнопки дока с открытыми окнами.

Приложения (`launchApp(id)` по кнопкам дока `#dgDock [data-app]`):

| id | функция | содержимое | откуда данные |
|---|---|---|---|
| `terminal` | `openTerminalApp()` | шелл | `VoidOS.exec` |
| `files` | `openFilesApp(path)` / `renderFiles(body)` | каталог `filesCwd`, кнопка ↑, строки ▸ каталог / ◈ устройство / ▤ файл, метка `CORRUPT` у битых; клик: каталог → вход, регион задачи → `VoidOS.exec("edit …")`, прочее → Блокнот | `VoidOS.list` |
| `editor` | `openEditorApp(path)` | Блокнот: путь, `textarea`, статус «только чтение / можно писать», кнопка сохранения → `VoidOS.writeFile` | `VoidOS.readFile` (отмечает файл прочитанным) |
| `system` | `openSystemApp()` / `renderSystem(body)` | службы `lamp0…2` (UP/DOWN, старт/стоп), `door0` (LOOPING → «остановить», иначе «перезапустить»), ползунок тумана 0,005…0,140, список регионов ✓/✕ с кнопкой починки, полоса аномалий `N / 45` | `VoidOS.world` + `VoidOS.exec` |
| `logs` | `openLogsApp()` / `renderLogs(body)` | `kern.log`, `alice.log`, `anomaly.log` | `VoidOS.readFile` |
| `alice` | `openAliceApp()` / `renderAlice(body)` | `NO CARRIER` или `LINK UP · lucidity 89%` и две реплики | `VoidOS.world.aliceState` |

`refreshApps()` перерисовывает открытые «Файлы», «Систему», «Журналы» и «ALICE»
после каждого события `VoidOS`. Терминал и Блокнот не перерисовываются — иначе
стёрлись бы вывод и набранный текст.

### Шов `VoidOS → всё остальное`: `wireVoidOs()`

[06-demo.js:2935](../../js/demo/06-demo.js#L2935). Подписка делается один раз
(`osWired`). На каждое событие сначала `pushWorldToScene()` и
`Audio.setAmbientIntensity(corruption / 100)`, в конце `refreshDeskPanels()` и
`paintMonitor()`. Между ними — разбор:

| событие `kind` | данные | реакция |
|---|---|---|
| `world`, `what: "lamp"` | `id`, `on` | `Audio.playOpen()` / `playClose()`; журнал `svc lampN -> up/down` |
| `world`, `what: "door"` | `state` | `Audio.playTransition(0.5)`; журнал `door0 -> state` |
| `world`, `what: "alice"` | — | `Audio.playOpen()` |
| `corruption`, `delta > 0` | `delta`, `reason` | `Audio.playGlitch(0.5 + delta/30)`; > 30 — `shake(corruption > 60)`; > 45 — с вероятностью 0,6 `spawnGhost()`; журнал `reason`; ≥ 100 — `endRun("lose", {reason: "anomaly"})` |
| `glitch` | `kind`, `cause` | `cleared` → журнал «restored after …»; иначе `Audio.playGlitch(1.0)`, `shake(true)`, журнал `geometry :: kind (cause)` |
| `quest` | `objective`, `next` | `syncQuestGuide()`, строка цели, `Audio.playOpen()`, журнал |
| `remember` | `line` | табличка в комнате и строка `ai` в терминале |
| `doorOpen` | — | журнал, `playEnding()` |
| `edit` | `taskId` | `openEditor(task)` — задача ищется в `state.tasks` по `id` |
| `recover` | — | `runRecovery()` |
| прочие (`exec`, `read`, `write`, `repair`, `world` с `fog`/`room`/`barrier`/`glitch`/`quest`/`boot`/`conf`/`locale`/…) | — | только общий хвост |

`pushWorldToScene()` ([06-demo.js:2925](../../js/demo/06-demo.js#L2925)) — единственное
место, где мир попадает в сцену: `{fog, corruption, door, lamps, alice, glitches,
room}`. Новое поле мира, которое должна видеть комната, добавляется сюда.

### Редактор починки и панель сборки

Редактор — не окно `WM`, а постоянная панель `#dgEditor` внутри стадии `desk`.

```
edit <путь> ─► VoidOS: событие edit ─► openEditor(task)
   state.edOpen = true, state.edTask = task, код = task.code (исходный, с багом)
▶ / Ctrl+Enter / Ctrl+S ─► runEditor()
   src = stripComments(code, task.lang)
   task.check ? diag = task.check(src, code)              (семантическая проверка)
              : mustNot → diags.bug ; must → diags.partial (регулярки)
   diag ─► статус failRun/failBuild, renderDiagnostics, onTaskFailed
   null ─► статус okBuild + язык, onTaskSolved
```

Диагностика — объект, а не флаг:

```
{ line, col, text, severity: "error" | "warning", flag: "-Werror=…" | null,
  msg, fn?: "main" | "<module>", notes?: [{line, col, msg}], run?: ["…", …] }
```

`line`/`col` ищутся (`findIn`) в том, что держит игрок (`code`), а не в
`task.code`, поэтому остаются верными после любой правки. Если `check` бросил
исключение — `internal compiler error` на строке 1.

`diagLines(task, d)` превращает объект в строки `{cls, text}`. Первая —
`$ <команда сборки>`, взятая из первой строки `task.success`. Дальше по
инструменту (`buildTool`):

| инструмент | ошибка | предупреждение |
|---|---|---|
| `python3` | `Traceback…`, `File "<file>", line N, in <fn>`, строка кода, `RoomError: msg` | `<file>:N: RoomWarning: msg` |
| `roomctl` | `<file>:LL:CC: error: msg [roomctl]` | то же с `warning` |
| `gcc` / `g++` | `In function 'fn':`, `<file>:LL:CC: error: msg [flag]`, затем `cc1: all warnings being treated as errors` и `make: *** [<file>] Error 1` | `<file>:LL:CC: warning: msg [flag]` |

Затем `note:` по каждой заметке и строки `run` — что «вывела» программа. Эти
строки идут в панель под кодом (`renderDiagnostics`) и тем же текстом в терминал
(`onTaskFailed`), поэтому причина переживает закрытие редактора. Всё напечатанное
там не переводится; переводятся заголовок панели и строка статуса.

Провал (`onTaskFailed`, [06-demo.js:3296](../../js/demo/06-demo.js#L3296)):
строка `demo.ed.buildFail` + диагностика в терминал, журнал `compile FAIL :: …`,
`VoidOS.repairFailed(id)` (+9 аномалий), аномалия геометрии
`TASK_GLITCH[id]` через `VoidOS.spawnGlitch` (если не упёрлась в предел — строка
`demo.glitch.<вид>`), `shake(profile.shakeHard)`, призрак с вероятностью
`ghostChance` и ещё один с вероятностью `ghostChance / 2`, `Audio.playGlitch(0.9)`.

Успех (`onTaskSolved`, [06-demo.js:3328](../../js/demo/06-demo.js#L3328)): класс
`solved`, строка `demo.ed.buildOk`, строки `task.success`, лор задачи,
`VoidOS.repairDone(id, file)` (снимает аномалии региона, −6 к счётчику,
продвигает цели), `VoidOS.applyEffect(task.effect)` — комната меняется,
`tasksSolved++`, `taskIdx` = число починенных по `world.repaired`, событие
`task_solved`, реплика Элис (голосом на HARD, иначе строкой `[ alice ]`),
подсказка «что дальше» или «всё чисто», через 1200 мс редактор закрывается.

Клавиши `textarea`: `Escape` → `closeEditor()` со `stopPropagation()`,
`Ctrl/Cmd+Enter` и `Ctrl/Cmd+S` → `runEditor()`, `Tab` → четыре пробела. Жёлоб
(`refreshGutter`) нумерует строки двумя цифрами (`01`, `02`…) и прокручивается
вместе с кодом; `textarea` стоит в `white-space: pre`, поэтому визуальная строка
равна строке текста.

### Лестница задач

`TASKS_BY_DIFF`: `easy → LADDER_PY`, `medium → LADDER_CPP`, `hard → LADDER_C`.
Семь задач в одном порядке, с одинаковым `id`, `effect` и аномалией; меняются
язык, файл, код и проверка.

| # | `id` | `strId` (py / cpp / c) | `tier` | файл | проверка | `effect` | аномалия |
|---|---|---|---|---|---|---|---|
| 1 | `room-lamp` | — (`lang: "ROOM-CFG"` везде) | `intro` | `lamp.cfg` | `must`/`mustNot` + `diags` | `{lamp: "lamp1", on: true}` | `flicker` |
| 2 | `room-fog` | `room-fog-py` / `-cpp` / `-c` | `mid` | `fog.{py,cpp,c}` | `must`/`mustNot` + `diags` | `{fog: 0.02}` | `ghost` |
| 3 | `room-interlock` | `room-interlock-*` | `mid` | `interlock.*` | `interlockCheck` | `{barrier: 0, lamp: "lamp2", on: true, interlock: true}` | `dup` |
| 4 | `room-door` | `room-door-*` | `mid` | `doorctl.*` | `doorCheck` | `{door: "halted"}` | `loop` |
| 5 | `room-sessions` | `room-sessions-*` | `story` | `sessions.*` | `must`/`mustNot` + `diags` | `{sessions: true}` | `drift` |
| 6 | `room-anchors` | `room-anchors-*` | `story` | `anchors.*` | `anchorsCheck` | `{anchors: true}` | `drift` |
| 7 | `room-override` | `room-override-*` | `hard` | `override.*` | `overrideCheck` | `{unlocked: true}` | `loop` |

Все файлы лежат в `/opt/room/`. Схема записи задачи:

| поле | тип | смысл |
|---|---|---|
| `id` | строка | мировой идентификатор: цели, аномалии, `world.repaired`, путь в `/opt/room` |
| `strId` | строка, необязательно | ключ локализации подсказок `demo.task.<strId>.hint/.hintNoob` |
| `tier` | `intro` / `mid` / `story` / `hard` | ступень; код его не читает, это документация в данных |
| `lang` | `ROOM-CFG` / `PYTHON` / `C++` / `C` | метка в шапке редактора и режим `stripComments` |
| `file` | путь | имя в диагностике и шапке |
| `code` | строка | исходный код с багом; русские комментарии внутри — часть сюжета |
| `must`, `mustNot` | массивы `RegExp` | литеральная проверка по коду без комментариев |
| `diags.bug(raw)`, `diags.partial(raw)` | функции → диагностика | что сказать, если сработал `mustNot` / не сработал `must` |
| `check(src, raw)` | функция → диагностика или `null` | семантическая проверка; если есть, регулярки не смотрятся |
| `success` | массив строк | первая — команда сборки (`$ roomctl apply…`, `$ python3…`, `$ g++ -O2 … && ./…`, `$ gcc -O2 …`), остальные — вывод успешного запуска |
| `effect` | объект | что починка делает с комнатой; применяет `VoidOS.applyEffect` |

Заголовок, реплика Элис и лор пишутся один раз на задачу (`demo.task.<id>.title`,
`.lore`), подсказки — по одной на язык (`demo.task.<strId>.hint`, `.hintNoob`;
у `room-lamp` — `demo.task.room-lamp.hint`). Все ключи есть в четырёх локалях
`10-i18n.js`. `taskField(task, field)` ищет сначала по `strId`, потом по `id`,
потом в самой записи задачи.

### Семантические проверки

Фабрики возвращают замыкание `check(src, raw)`. `src` — код без комментариев (по
нему проверяем), `raw` — то, что видит игрок (по нему считаем номер строки).

**`interlockCheck(d)`** ([06-demo.js:303](../../js/demo/06-demo.js#L303)),
`d = {press, release, hold, fn}`. Правило клапана: отпускать, пока давление ниже
предела. Шаги:

1. `VENT_LIMIT = 3,4` (запятая) → ошибка `expected '.'`.
2. Нет числового присваивания `VENT_LIMIT` → ошибка.
3. Число ноль (заглушка) → ошибка `-Werror=room-placeholder` и строки
   «барьер стоит».
4. Число совпало с показанием манометра (`world.gauges.pressure`) → ошибка «это
   давление в камере, а не предел клапана».
5. Число отличается от `world.gauges.vent` больше чем на 0,001 → ошибка «не
   совпадает с табличкой клапана».
6. Ищется сравнение `CMP`: `(давление() | VENT_LIMIT) оп (давление() | VENT_LIMIT)`
   с `<`, `<=`, `>`, `>=`. Нет — ошибка; обе стороны одного вида — ошибка.
7. Оператор приводится к виду «давление слева» (`FLIP`), `lowTakesThen` — истина
   для `<`/`<=`.
8. В тексте после условия ищутся первые вхождения `release` и `hold`; одного нет —
   ошибка.
9. Если ветка, выполняемая при низком давлении, — не `release`, ошибка «замок
   отпускает на пределе и выше» и строки запуска с давлением в камере.

Принимаются `p < L`, `p <= L`, `L > p`, перестановка веток с `p > L`/`p >= L`.
Предел клапана не печатается ни на одном шаге — только показание манометра,
которое игрок и так видит на стене. `VoidOS` читается в момент нажатия ▶, не при
загрузке файла.

**`anchorsCheck(d)`** ([06-demo.js:410](../../js/demo/06-demo.js#L410)),
`d = {listRe, list, count, bind, fn}`. Достаёт строки из списка якорей. Только в
C (`count: "count"`): нет присваивания `count` или оно не число → ошибка;
`sizeof(…)` принимается без сравнения; `count` больше длины массива → ошибка
`-Werror=array-bounds`, привязанная к вызову `core_bind(active[` (а не к имени
`active` — оно встречается в шапке файла), с двумя заметками; меньше →
предупреждение `-Wroom-bound` и строки привязки первых `count` якорей. Затем
для всех языков: не хватает `anchor01`/`02`/`03` (`ANCHORS_NEED`) →
предупреждение `-Wroom-coherence` с выводом `anchorsRun()`: «bind … ok» по каждому
и «coherence N% — '…' never bound».

**`doorCheck(d)`** ([06-demo.js:475](../../js/demo/06-demo.js#L475)),
`d = {open, retry, fn}`. Находит `if (!)image_is_damaged()` (с `!` или `not`),
смотрит, что идёт раньше после условия — `open` или `retry`, учитывает
отрицание. Если на ветке «образ повреждён» стоит `open` — предупреждение
`-Wroom-logic` и три строки зацикленной двери. Принимаются и перестановка веток,
и отрицание условия.

**`overrideCheck(d)`** ([06-demo.js:511](../../js/demo/06-demo.js#L511)),
`d = {keys, listRe, decl, fn}`. Считает ключи `n` в списке, разбирает границы
цикла: C/C++ — `for (… i = a; i < b | i <= b; …)`, где `b` с `size()`, `sizeof`
или `count` означает `n`; Python — `range(a, b)` / `range(b)`, где `len(` означает
`n`. Верхняя граница больше `n` → ошибка `-Werror=array-bounds` («array subscript
N is above array bounds of 'decl[n]'»); цикл покрывает не все ключи → предупреждение
`-Wroom-bound` и строки замка «accepted … rejected … SEALED». Принимаются `i < 3`,
`i <= 2`, `i < count`, `range(len(KEYS))`, `range(0, 3)`.

Литеральные задачи (`room-lamp`, `room-fog`, `room-sessions`) несут `must` и
`mustNot` плюс `diags`: `bug` — когда баг на месте (лампа: ошибка без флага;
туман: предупреждение `-Wroom-filter` с выводом трёх фильтров; журнал:
предупреждение `-Wroom-index` «1 entry (46 overwritten)»), `partial` — когда баг
убран, а правильной записи нет (лампа: «unknown value», заметка с допустимыми
значениями; туман: «присваивание константы»; журнал: ошибка `-Werror=room-index`
с заметкой «the corrected write is here»). Без `diags` срабатывают общие
сообщения `the reported defect is still present` и `the fix does not do what the
file asks for`.

### Подсказки и сложность

`PROFILES` ([06-demo.js:57](../../js/demo/06-demo.js#L57)):

| поле | easy | medium | hard | кто читает |
|---|---|---|---|---|
| `label` | `EASY` | `MEDIUM` | `HARD` | `reportBeats()` |
| `voice` | false | false | true | все вызовы `speakAsAlice` |
| `ghostChance` | 0,18 | 0,45 | 0,85 | `onTaskFailed()` |
| `shakeHard` | false | false | true | `onTaskFailed()` |
| `hintStrength` | 1,0 | 0,65 | 0,32 | пишется в `startGame()`, не читается |
| `sanityDecay` | 0,15 | 0,35 | 0,60 | никто |
| `fearGainBad` / `fearGainGood` | 8 / −4 | 16 / −3 | 28 / −2 | никто |
| `shakeChance` | 0,15 | 0,50 | 0,90 | никто |
| `bootDelay` | 1800 | 2200 | 2600 | никто |
| `endText` / `endSub` | русские строки концовок | | | никто (концовки берутся из i18n) |

Сложность выбирает язык (лестницу), силу глитча сцены (`voidGlitchAmount`), шанс
призраков, силу тряски и голос Элис. Доступность подсказок от сложности и от
настройки `hints` не зависит: обе кнопки работают одинаково на всех уровнях.

Подсказки в редакторе (`showEditorHint(mode)`):

- `? hint` → `mode = "tech"`: `demo.task.<strId|id>.hint` — намёк на форму
  ошибки, метка `demo.ed.labelTech` янтарным.
- `?? для жюри` → `mode = "noob"`: `hintNoob` — разбор словами, метка
  `demo.ed.labelJury` голубым.
- без `mode` (только из `syncLocale`) — вариант выбирает
  `settingsState.hintMode === "noob"`.
- Нет нужного варианта — берётся другой, нет обоих — `demo.ed.noHint`.
- Текст вставляется через `innerHTML`: строки подсказок содержат разметку.
- До первого нажатия в поле стоит приглушённая `demo.ed.hintPrompt_html`.

Сама по себе подсказка не всплывает. Постоянная ориентировка — строка
`deskNudge()` внизу слева: текущая цель `VoidOS.questObjective()`, а если её нет —
по прогрессу: Элис жива → `nudge.done`, всё починено → `nudge.recover`, что-то
починено → `nudge.more`, аномалий > 30 → `nudge.anomaly`, прочитан `readme.txt` →
`nudge.explore`, иначе `nudge.start`.

### Ужасы: аномалии, тряска, призраки

Сценария страха нет. Всё запускает счётчик `world.corruption`, который игрок
поднимает сам (таблица штрафов — в [GAME.md](../GAME.md#аномалии) и
[void-os.md](void-os.md)).

| порог / событие | реакция |
|---|---|
| любой рост | `Audio.playGlitch(0.5 + delta/30)`, интенсивность эмбиента `corruption/100` |
| > 30 | `shake()` (жёсткая > 60) на каждый рост |
| > 45 | призрак с вероятностью 0,6; монитор и цвета панели — красные |
| ≥ 100 | `endRun("lose", {reason: "anomaly"})` → `playBadEndingScare()` |
| аномалия геометрии | `Audio.playGlitch(1.0)`, `shake(true)` |
| провал починки | `shake(shakeHard)`, призраки по `ghostChance`, `Audio.playGlitch(0.9)` |

`shake(hard)` снимает `shake`/`shake-hard`, форсирует перерасчёт стилей
(`void elRoot.offsetWidth`), чтобы анимация перезапустилась, ставит нужный класс
на 800 мс. `spawnGhost()` кладёт `pre.dg-ghost` со случайным шаблоном из `GHOSTS`
(пять ASCII-фигур) в стол (если он на экране) или в корень: `left` 8–68 %, `top`
10–65 %, кегль 10–16 px, через 1500 мс удаляет.

`playBadEndingScare(reason)`: классы `bad-ending` и `fear-100`, шесть призраков за
~0,4 с, четыре жёсткие тряски с глитчами (0, 280, 620, 1100 мс), строки
`demo.scare.kpanic`, `alice1`, `kernStat` (с `{s}` = sanity, `{f}` = fear), через
700 и 1200 мс `alice2` и `kernEnd`; на HARD — шёпот `demo.scare.voice`.
`playWalkAwayScare()` — три призрака без тряски, строки `demo.walk.*`, на HARD шёпот.

### Звуковые сигналы

| где | вызов |
|---|---|
| загрузка демки | `Audio.playGlitch(0.6)` |
| пробуждение | `Audio.playGlitch()` (0,5 с), `Audio.startAmbient()` |
| `E` у терминала | `Audio.playGlitch()` |
| осмотр объекта | `Audio.playClick()` |
| новое окно | `Audio.playOpen()` |
| лампа вкл / выкл | `Audio.playOpen()` / `Audio.playClose()` |
| смена состояния двери | `Audio.playTransition(0.5)` |
| Элис ожила, шаг цели | `Audio.playOpen()` |
| рост аномалий | `Audio.playGlitch(0.5 + delta/30)` |
| аномалия геометрии | `Audio.playGlitch(1.0)` |
| провал починки | `Audio.playGlitch(0.9)` |
| `recover.sh` | `Audio.playTransition(1.2)` |
| реплика Элис голосом | `Audio.playGlitch(1.6)` |
| катсцена | эмбиент в 0; `threshold` → `playTransition(0.8)`; `edge` → `playGlitch(0.5)`; `cry` → `playGlitch(1.4)`; `fall` → `playGhost()` |
| плохая концовка | `playGlitch` 1,6 / 1,2 / 1,6 / 0,9 |
| каждое событие `VoidOS` | `Audio.setAmbientIntensity(corruption/100)` |
| `close()` | `Audio.stopAmbient()`, музыка слайдов обратно |

`playGlitch(dur)` разносит шесть шумовых всплесков на `dur` секунд;
`playTransition(dur)` — пила 70→1600 Гц за `dur` секунд (см. [audio.md](audio.md)).

Голос (`speakAsAlice`) звучит только при `profile.voice` (HARD):

| момент | ключ текста | `pitch` / `rate` / `volume` | `clip` |
|---|---|---|---|
| задача решена | `demo.ed.aliceSolved_<diff>` | 0,40 / 0,70 / — | `demo.solved.<diff>` |
| `recover.sh` | `demo.desk.alice1` | 1,0 / 0,92 / — | нет |
| такт `cry` | `demo.end.cry` | 1,35 / 1,15 / 1 | `demo.end.cry` |
| плохая концовка | `demo.scare.voice` | 0,25 / 0,6 / 0,8 | `demo.scare.voice` |
| уход (недостижим) | `demo.walk.voice` | 0,42 / 0,7 / 0,7 | `demo.walk.voice` |

`clip` — id записи в `VOICE_CLIPS`; `AliceVoice` сначала ищет запись, потом идёт
в нейроголос или `speechSynthesis`. Если `AliceVoice.speak` вернул ложь, в
терминал печатается `[ tts ] браузер не дал голос…` и текст реплики.

### Восстановление Элис, катсцена, концовки

`run /home/neikon/recover.sh` при чистом `fsck` → событие `recover` →
`runRecovery()`: `VoidOS.aliceAlive()` (обе опоры горят, аномалии в 0), переход,
три строки `recover.sh`, через 900 мс реплики Элис (голосом на HARD), через 2600 мс
`demo.desk.goDoor` и перенаправление компаса на дверь. Это не конец: дверь держит
протокол `room-override`.

Когда задача `room-override` решена и игрок нажимает `E` у открытой двери,
`VoidOS` излучает `doorOpen` → `playEnding()` ([06-demo.js:3053](../../js/demo/06-demo.js#L3053)):

1. Защита от повтора `state.endingPlayed`.
2. HUD убирается (кнопка `E`, компас, подсказка, цель, сенсорный слой).
3. Эмбиент в 0.
4. `VoidScene.playCutscene({onBeat, onDone})` — камера уходит сцене, такты
   приходят в `onBeat`:

| такт | реакция `06` |
|---|---|
| `walk` | нет |
| `threshold` | `Audio.playTransition(0.8)` |
| `edge` | `Audio.playGlitch(0.5)`, `shake(false)`, журнал `sector :: floor plate absent beyond door0` |
| `cry` | табличка `demo.end.cry` с классом `cry`, `Audio.playGlitch(1.4)`, голос на HARD, журнал |
| `fall` | `shake(true)`, `Audio.playGhost()` |
| `black` | табличка убирается |

5. `onDone` → `stopVoidStage()`, `endRun("cliff", {})`.

`endRun(result, opts)` ([06-demo.js:3397](../../js/demo/06-demo.js#L3397)) срабатывает
один раз (`state.ended`). Сообщает `emitJury("end")`, гасит таймеры, для `lose`
играет `playBadEndingScare()` и показывает экран через 1900 мс, для остальных —
сразу. `state.lastEnd` запоминается для перевода экрана на лету. Тексты:

| `result` | заголовок / подзаголовок | хвост отчёта | кто вызывает |
|---|---|---|---|
| `cliff` | `demo.end.cliff.title/.sub` | `demo.end.win.tag/.body` | `playEnding` |
| `lose` | `demo.end.lose.title/.sub` | `demo.end.lose.tag` + `body_broken` (или `body_fear`/`body_sanity`) | `wireVoidOs`, аномалии ≥ 100 |
| `win` | `demo.end.win.*` | `demo.end.win.*` | никто |
| `partial` | `demo.end.partial.*`, `{n}`/`{total}` | `demo.end.partial.*` | никто |
| `walked_away` | `demo.end.walked.*` | `demo.end.walked.*` + `playWalkAwayScare` | никто |

Отчёт начинается с `reportBeats(profile)`: сложность, шаги (`VoidScene.walked() /
0.75` — шаг 0,75 м), решено `taskIdx / всего`, sanity, fear, число набранных
команд (`deskHistory.length`). Родитель заголовка получает `win` или `lose`.

### Escape и всплытие

Три обработчика `keydown` и два из них обязаны гасить событие:

```
textarea редактора ── Escape → closeEditor(); stopPropagation ──┐ (дальше не идёт)
поле терминала     ── Escape → standUp();     stopPropagation ──┤
document (всплытие):                                            │
   Ctrl/Cmd+P при открытой демке → preventDefault               │
   Escape, демка открыта:                                       │
     state.edOpen          → closeEditor()                      │
     stage === "desk"      → WM.closeTop() || standUp()         │
     < 500 мс после выхода из захвата мыши → ничего             │
     < 600 мс после standUp → ничего                            │
     иначе                 → close()                            │
```

Без `stopPropagation()` в поле терминала одно нажатие обрабатывалось дважды:
поле поднимало игрока (`stage` становилась `void`), документ видел уже не `desk`
и закрывал демку. Защита `stoodUpAt` (600 мс) страхует тот же случай по времени,
`voidUnlockAt` (500 мс) — `Escape`, которым браузер снимает захват мыши.

Порядок «панель починки → верхнее окно → встать → выйти» соблюдается, когда
фокус не в поле терминала. Из поля `Escape` сразу поднимает игрока, открытые
окна остаются.

Слушатели `window` в фазе перехвата (`17-evidence`, `20-ai-sandbox`,
`21-backstage`, `16-jury-intro`) срабатывают раньше всех трёх — см.
[ARCHITECTURE.md](../ARCHITECTURE.md#escape-и-всплытие-события).

### Язык и настройки на лету

`window.__demoSyncLocale = DG.syncLocale` зовёт `applyLocale()`
([10-i18n.js:2133](../../js/core/10-i18n.js#L2133)), а `applyLocale()` вызывается и
из `applySettings()` — значит, `syncLocale()` идёт после любого применения
настроек, а не только смены языка. Что она делает
([06-demo.js:3558](../../js/demo/06-demo.js#L3558)):

1. `VoidOS.relocalize()` — переписывает тела сюжетных файлов на месте; прогресс
   живёт вне текстов и не теряется.
2. `refreshDeskPanels()` — подсказка, окна «Файлы/Система/Журналы/ALICE».
3. Плейсхолдер поля терминала.
4. Если открыт редактор — заголовок задачи и подсказка (или приглашение к ней).
5. Если стадия `end` — заголовок, подзаголовок и отчёт заново, без повтора
   «страшной» сцены.

Не переводятся: уже напечатанный вывод терминала, табличка в комнате, строки
загрузки ОС, заголовки открытых окон (ставятся при `spawn`), Блокнот. Статичные
подписи с `data-i18n` переводит сам `applyLocale()`.

`window.__demoSyncSettings = DG.syncSettings` — пустая функция (в старом HUD
она зеркалила быстрые эффекты). Поэтому `crt`, `vignette`, `glitch`,
`epilepsy`, сменённые посреди прогона, дойдут до сцены только при следующем
`runVoidStage()`.

### События для жюри

`emitJury(type, extra)` шлёт `CustomEvent("dg:event")` на `window` с
`detail = {type, stage, diff, corruption, repaired, totalTasks, …extra}`. Типы:
`stage`, `log` (через `logEvent(cls, text)`), `hint`, `task_solved`, `end`. В
проекте этого события никто не слушает: чек-лист жюри (`12-jury.js`) отмечается
вручную и вообще скрыт, пока демка открыта (`.demo-game.open ~ aside.jury`).
Это точка расширения для внешней панели или записи прогона.

## Почему так, а не иначе

**Стадии и выход**

- **`Escape` снимает по одному слою и никогда не роняет всю демку из ОС.**
  Альтернатива — `Escape` закрывает оверлей. Отвергнута: путь обратно — полный
  повтор пролога, на защите это катастрофа (комментарий
  [06-demo.js:1435](../../js/demo/06-demo.js#L1435)).
- **`stopPropagation()` в поле терминала и в редакторе.** Альтернатива — один
  обработчик на документе. Не годится: документ читает уже изменённую стадию и
  проваливается в последнюю ветку `close()`; игрок просил встать, а попадал к
  слайдам ([06-demo.js:2766](../../js/demo/06-demo.js#L2766)).
- **Временные окна 500 и 600 мс.** `Escape`, которым браузер снимает захват мыши,
  и хвост нажатия, поднявшего игрока, — одно нажатие, а не просьба выйти
  ([06-demo.js:1830](../../js/demo/06-demo.js#L1830), [1458](../../js/demo/06-demo.js#L1458)).
- **`Ctrl+P` перехвачен в демке.** Альтернатива — оставить браузеру. Отвергнута:
  диалог печати — модальное окно поверх живого питча, которое держит презентацию,
  пока кто-то не найдёт «Отмена». В терминале это «предыдущая команда», как в bash
  ([06-demo.js:1438](../../js/demo/06-demo.js#L1438), [2740](../../js/demo/06-demo.js#L2740)).
- **`osboot` и `desk` не гасят сцену.** Раньше гасили: комната за терминалом
  застывала на последнем кадре, а возврат из-за стола попадал в `runVoidStage()` —
  заново проигрывал пробуждение и ставил игрока в точку спавна
  ([06-demo.js:1551](../../js/demo/06-demo.js#L1551)). Смысл живой комнаты —
  заметить, как загорелась опора, пока печатаешь
  ([06-demo.js:1565](../../js/demo/06-demo.js#L1565)).
- **Пробуждение — один раз, дальше `resumeVoidStage()`.** Без век, без
  субтитров, без сброса камеры ([06-demo.js:1804](../../js/demo/06-demo.js#L1804)).
- **Уход со стадии сносит её таймеры и цикл кадра.** Иначе пропущенное интро жгло
  бы `requestAnimationFrame` под терминалом весь сеанс
  ([06-demo.js:1544](../../js/demo/06-demo.js#L1544)); `close()` по той же причине
  гасит сцену и загрузку ОС ([06-demo.js:1528](../../js/demo/06-demo.js#L1528)).
- **`close()` сам сажает камеру на ноги** (`sit(false)`, `rearm()`): он не идёт
  через `gotoStage`, и следующий прогон открывался с камерой в кресле, которая
  ехала к позе прошлого сеанса ([06-demo.js:1530](../../js/demo/06-demo.js#L1530)).
- **Нет WebGL — сразу загрузка ОС.** Питч не имеет права упереться в старый
  ноутбук или заблокированный драйвер ([06-demo.js:1733](../../js/demo/06-demo.js#L1733)).

**Звук слайдов**

- **`silenceTheDeck()` — одно место для всех каналов слайдов**: шина `VoiceBus`,
  `stopCurrentVoice()`, `AliceVoice.stop()` и страховочная пауза всех `<audio>`.
  Раньше `close()` останавливал синтез речи, но не запись реплики; одна функция не
  может забыть канал ([06-demo.js:1468](../../js/demo/06-demo.js#L1468),
  [1538](../../js/demo/06-demo.js#L1538)).
- **Музыка и болтовня Элис выключаются и восстанавливаются по сохранённому
  состоянию**, а `11-settings.js` при `__demoActive` их не включает: иначе
  быстрые настройки внутри демки возвращали бы музыку поверх звуков игры.

**Мир и сцена**

- **`pushWorldToScene()` — единственный шов ОС → рендер.** Альтернатива — каждый
  обработчик толкает свои поля. Так дважды терялись `glitches` и `room`:
  перегородка опускалась в мире, но стояла в комнате
  ([06-demo.js:2920](../../js/demo/06-demo.js#L2920)).
- **Синхронизация сразу после `VoidOS.boot()`**: повторный прогон начинается с
  чистого мира, а сцена помнит геометрию прошлого
  ([06-demo.js:1660](../../js/demo/06-demo.js#L1660)). Сейчас `boot()` сам
  излучает `world/boot`, так что вызов стал страховкой — см. «Подводные камни».
- **Графический слой и шелл — два ввода к одной логике.** Альтернатива — окна с
  собственной логикой. Отвергнута: комната должна отвечать одинаково; кнопка
  «Система» буквально выполняет `svc start lamp1`. Окна нужны, чтобы член жюри,
  ни разу не открывавший терминал, не застрял у пустого приглашения
  ([06-demo.js:2254](../../js/demo/06-demo.js#L2254)).
- **На телефоне окна во весь экран, без перетаскивания**: таскать окно 400 px по
  экрану 375 px бессмысленно ([06-demo.js:2259](../../js/demo/06-demo.js#L2259)).
- **Веки, субтитры, компас, джойстик живут в `06`, а не в сцене.** `VoidScene`
  знает только геометрию и векторы ввода ([06-demo.js:1692](../../js/demo/06-demo.js#L1692)).
- **Табличка — панель, которая уходит сама, и копия в терминале.** Строка
  субтитра вмещает одно предложение; осмотренное не должно теряться, когда игрок
  сядет ([06-demo.js:1891](../../js/demo/06-demo.js#L1891), [1905](../../js/demo/06-demo.js#L1905)).
- **Опоры и приборы интерактивны только при свете.** Незапитанный прибор в тёмной
  комнате — диск холодного стекла ([06-demo.js:1925](../../js/demo/06-demo.js#L1925)).
- **Компас гаснет, когда кнопка `E` в досягаемости** — дело сделано, а на
  телефоне они делят одно место ([06-demo.js:1865](../../js/demo/06-demo.js#L1865)).
- **Толчок через 22 с, если игрок не сдвинулся.** Жюри не обязательно играет в
  игры и не должно чувствовать, что застряло ([06-demo.js:1791](../../js/demo/06-demo.js#L1791)).
- **На сенсорном устройстве нет автофокуса** в поле терминала и редакторе:
  клавиатура закрыла бы сцену и задачу раньше, чем игрок их прочтёт
  ([06-demo.js:1590](../../js/demo/06-demo.js#L1590), [3138](../../js/demo/06-demo.js#L3138)).
- **Текст прошивки и ядра — по-английски.** Так выглядит настоящий журнал ядра на
  любой машине в любой стране; переводится только человеческая обвязка
  ([06-demo.js:2019](../../js/demo/06-demo.js#L2019)).
- **Монитор в комнате показывает этот сеанс** — 2D-канвас становится текстурой
  экрана, поэтому из-за спины видно, что набрано.

**Задачи и сборка**

- **Сложность выбирает язык, а не трудность идей.** Три лестницы задают одни и те
  же семь вопросов в одном порядке, потому что от этого зависит сюжет, и потому
  что off-by-one остаётся off-by-one в любой записи. Ручной работы с памятью нет
  нигде ([06-demo.js:129](../../js/demo/06-demo.js#L129)).
- **Два идентификатора задачи.** `id` один на всех языках — на нём держатся
  цели, аномалии, пути, `world.repaired`; `strId` — для подсказок, которые обязаны
  называть настоящий синтаксис. Заголовок и реплика пишутся один раз
  ([06-demo.js:138](../../js/demo/06-demo.js#L138)).
- **Комната ломается в форме ошибки** (`TASK_GLITCH`): цикл за границу множит
  предметы, условие, которое не отпускает, гоняет дверь, выключенный свет мигает,
  потеря записи о себе раздваивает пол ([06-demo.js:106](../../js/demo/06-demo.js#L106)).
- **Провал — объект диагностики, а не булево.** Раньше было два предложения и имя
  файла — без строки, столбца и причины, и они врали в обе стороны: перестановку
  веток называли «баг на месте», чтение за концом массива в C — «собирается»
  ([06-demo.js:152](../../js/demo/06-demo.js#L152)).
- **Номер строки — из буфера игрока**, а не из `task.code`: остаётся верным после
  любой правки ([06-demo.js:172](../../js/demo/06-demo.js#L172)).
- **Вывод сборки не переводится** — это словарь машины, как `ls`/`ps`/`dmesg`;
  объяснение словами живёт за кнопкой `?? для жюри`
  ([06-demo.js:175](../../js/demo/06-demo.js#L175)).
- **Номера с ведущим нулём, `edPad2()` вместо `pad2()`.** `:06:` указывает на
  строку жёлоба `06`; имя `pad2` уже занято в `07-deck.js`, и голое совпадение
  молча перекрыло бы чужую функцию ([06-demo.js:181](../../js/demo/06-demo.js#L181)).
- **Проверка по коду без комментариев.** Закомментировавший старую строку баг
  починил, вписавший имена якорей в `TODO` — нет. Блочные комментарии заменяются
  пробелами, чтобы не сдвинуть номера строк; `#` считается комментарием только в
  Python и конфиге — в C он съел бы директиву препроцессора
  ([06-demo.js:188](../../js/demo/06-demo.js#L188)).
- **Семантические проверки вместо литеральных регулярок** для `room-interlock`,
  `room-anchors`, `room-door`, `room-override`. Литеральная проверка знала одну
  запись и отвечала «баг на месте» на всё остальное — включая перестановку веток,
  которой учит `room-door`, отрицание условия, `i <= 2`, `i < count`,
  `range(len(KEYS))` ([06-demo.js:291](../../js/demo/06-demo.js#L291),
  [470](../../js/demo/06-demo.js#L470), [505](../../js/demo/06-demo.js#L505)).
- **Предел клапана не печатается нигде и читается из мира в момент ▶.** Ответ не
  должен существовать на диске, иначе задачу видно из-за стола. Чтение внутри
  замыкания, а не при загрузке файла, ещё и обходит временную мёртвую зону:
  `VoidOS` к тому моменту давно объявлен ([06-demo.js:298](../../js/demo/06-demo.js#L298),
  [645](../../js/demo/06-demo.js#L645)).
- **Выход за границу массива проверяется раньше недостающих якорей**: сборка,
  которая не собралась, ничего не говорит о связности. Ошибка привязана к вызову
  `core_bind(active[`, потому что имя `active[]` есть в шапке файла и `findIn`
  нашёл бы сначала комментарий ([06-demo.js:395](../../js/demo/06-demo.js#L395),
  [436](../../js/demo/06-demo.js#L436)). `sizeof(active)/sizeof(active[0])`
  разъехаться не может и принимается сразу ([06-demo.js:427](../../js/demo/06-demo.js#L427)).
- **Редактор помнит, какая задача на экране (`state.edTask`).** Раньше все
  функции редактора читали `state.tasks[state.taskIdx]`: `edit` открывал регион не
  по порядку — на экране один файл, проверяется другой
  ([06-demo.js:3114](../../js/demo/06-demo.js#L3114)).
- **`taskIdx` — число починенных по миру, а не `++`.** Регион можно решить не по
  порядку, и счётчик засчитал бы задачу, которой игрок не касался
  ([06-demo.js:3340](../../js/demo/06-demo.js#L3340)).
- **Общая строка «проверь починку» печатается только без диагностики.** Слепое
  предложение поверх настоящей диагностики — та самая табличка, которую
  заменили ([06-demo.js:3304](../../js/demo/06-demo.js#L3304)).

**Ужасы, голос, концовка**

- **Страх не заскриптован.** Тряска и призраки из старой демки срабатывают от
  счётчика аномалий, который игрок поднимает сам
  ([06-demo.js:2226](../../js/demo/06-demo.js#L2226)).
- **Сила глитча: потолок от сложности, настройки только понижают.** Видео-настройки
  слайдов и режим без вспышек не могут сделать сцену резче, чем задумано, но могут
  почти погасить искажения ([06-demo.js:1706](../../js/demo/06-demo.js#L1706)).
- **Голос — только на HARD, включая крик у двери.** Крик единственный не проверял
  `profile.voice`, и самая громкая реплика звучала на всех уровнях на полной
  громкости ([06-demo.js:3085](../../js/demo/06-demo.js#L3085)).
- **`endRun` — один раз.** Аномалии упираются в 100, но `VoidOS` продолжает
  излучать рост на каждом `corrupt()`; ветка `≥ 100` заходила в `endRun` снова и
  снова — ещё призраки, ещё тряска и реплика Элис поверх себя («её фраза звучит
  дважды») ([06-demo.js:3398](../../js/demo/06-demo.js#L3398)).
- **Конец эпизода — дверь, а не возвращение Элис.** После `recover.sh` игроку
  возвращают ноги и ведут к двери ([06-demo.js:3036](../../js/demo/06-demo.js#L3036)).
  Такт `edge` даёт один низкий толчок без слов до шага; Элис кричит на `cry`,
  на полсекунды позже, чем нужно ([06-demo.js:3072](../../js/demo/06-demo.js#L3072)).
- **Отчёт — из того, что случилось.** `steps` был счётчиком старой текстовой
  игры, который никто не увеличивал, а `commands hit` печатал имена полей — жюри
  видело слово `tasksSolved`. Теперь шаги — пройденные метры сцены, команды —
  `deskHistory` ([06-demo.js:3000](../../js/demo/06-demo.js#L3000)).

**Язык и совместимость**

- **Смена языка переписывает файлы.** Файловая система — это сценарий: без
  `relocalize()` игрок переключился бы на таджикский, а `readme.txt` говорил бы
  по-русски ([06-demo.js:3560](../../js/demo/06-demo.js#L3560)).
- **`tx()` падает на ключ, а не на ошибку.** Если `t()` ещё не доступна (гонка
  инициализации), функция пробует `window.STRINGS`, потом возвращает ключ
  ([06-demo.js:13](../../js/demo/06-demo.js#L13)).
- **Старые глобалы игровой площадки оставлены заглушками** (`__runLeakDemo`,
  `__runPlayground` открывают новую демку, остальные пустые): всё, что ещё зовёт
  старый API, не ломается ([06-demo.js:3644](../../js/demo/06-demo.js#L3644)).
- **Подписи кнопки `E` меняются через атрибут `data-i18n`.** По коду видно, что
  так `applyLocale()` переводит текущую подпись без отдельной ветки в
  `syncLocale()`.

## Связи

**Берёт из общей области** (всё — только внутри функций, не при загрузке файла):

| имя | владелец | зачем |
|---|---|---|
| `VoidOS` | `js/demo/05-void-os.js` | мир, файлы, `exec`, `boot`, `onChange`, `examine`, цели, починка, аномалии, `relocalize` |
| `VoidScene` | `js/demo/04-void-scene.js` | `start/stop/supported`, `sit`, `rearm`, `setWorld`, `setGuide`, `setInteractable`, `setMove`, `addLook`, `interact`, `setScreen`, `refreshScreen`, `playCutscene`, `walked` |
| `Audio` | `js/core/01-audio.js` | звуки, эмбиент, музыка (`setMusicEnabled`); имя перекрывает `window.Audio`, поэтому `typeof Audio !== "undefined"` всегда истинно |
| `VoiceBus` | `js/core/01-audio.js` | `stopAll()` в `silenceTheDeck()` |
| `AliceVoice` | `js/demo/03-alice-voice.js` | `speak`, `stop`, геттер `available` |
| `stopCurrentVoice` | `js/presentation/09-alice-stream.js` | остановка реплики слайдов |
| `t` | `js/core/10-i18n.js` | строки через `tx()` и `taskField()` |
| `window.STRINGS`, `window.settingsState` | `10-i18n.js`, `11-settings.js` | запасной путь `tx()`; настройки `hints`, `hintMode`, `crt`, `vignette`, `glitch`, `epilepsy`, `musicOn` |
| `window.__dgSkipAutofocus` | `js/core/13-mobile.js` | не ставить фокус на сенсорных устройствах |
| `window.__chatterEnabled` | `11-settings.js`, `09-alice-stream.js` | читается и пишется при входе/выходе |

**Отдаёт:**

| имя | кто пользуется |
|---|---|
| `DG` (`const`) | только этот файл; в `03-alice-voice.js:281` упомянут в комментарии |
| `window.__openDemoGame` | кнопка `#demoCtaBtn` в `02-slides.js` (4 локали) и `07-deck.js:87` |
| `window.__closeDemoGame` | упомянут в комментарии `index.html:200`; кода-вызова нет |
| `window.__demoSyncLocale` | `applyLocale()`, [10-i18n.js:2133](../../js/core/10-i18n.js#L2133) |
| `window.__demoSyncSettings` | `applySettings()`, [11-settings.js:94](../../js/core/11-settings.js#L94) |
| `window.__runLeakDemo`, `__resetLeakDemo`, `__runPlayground`, `__resetPlayground`, `__pgTab`, `__pgVoiceToggle` | никто (заглушки старого API) |
| `window.__demoActive` | `07-deck.js` (клавиши слайдов), `09-alice-stream.js` (реплики), `11-settings.js` (звук), `13-mobile.js` (свайпы) |
| `stageEl` (`const`, последняя строка) | [07-deck.js:61](../../js/presentation/07-deck.js#L61) — прокрутка `#stage` к началу при смене слайда |
| событие `dg:event` на `window` | никто |

## Константы и состояние

### Уровень файла

| имя | значение / тип | смысл | кто пишет / читает |
|---|---|---|---|
| `DG` | объект `{open, close, syncSettings, syncLocale}` | движок демки (IIFE) | создаётся при загрузке; читают глобалы ниже |
| `stageEl` | `HTMLElement` `#stage` | контейнер слайдов; раздел `SLIDE ROUTER` в конце файла | `07-deck.js` |

### Уровень IIFE `DG`: таблицы

| имя | значение | смысл | кто читает |
|---|---|---|---|
| `PROFILES` | `{easy, medium, hard}` | ручки сложности, см. таблицу в «Подсказки и сложность» | `startGame`, `onTaskFailed`, `speakAsAlice`-вызовы, `reportBeats` |
| `TASK_GLITCH` | id задачи → вид аномалии | какая аномалия появляется при провале | `onTaskFailed` |
| `ANCHORS_NEED` | `["anchor01", "anchor02", "anchor03"]` | полный набор якорей | `anchorsRun`, `anchorsCheck` |
| `LADDER_PY`, `LADDER_CPP`, `LADDER_C` | массивы из 7 задач | лестницы Python / C++ / C ([548](../../js/demo/06-demo.js#L548), [775](../../js/demo/06-demo.js#L775), [1008](../../js/demo/06-demo.js#L1008)) | `TASKS_BY_DIFF` |
| `TASKS_BY_DIFF` | `{easy: LADDER_PY, medium: LADDER_CPP, hard: LADDER_C}` | выбор лестницы | `startGame` |
| `BOOT_LINES` | 7 пар `[класс, текст]` | экран загрузки демки (`sys`, `warn`, `bad`, `ok`) | `runBootSequence` |
| `GHOSTS` | 5 ASCII-шаблонов | призраки | `spawnGhost` |
| `OS_POST` | 9 строк | экран прошивки | `runOsBoot` |
| `OS_KERNEL` | 20 троек `[время, текст, класс]` | журнал ядра; класс `""`/`warn`/`ok`/`bad` | `runOsBoot` |
| `OS_SPLASH_STEPS` | 4 ключа `demo.os.step.*` | статус заставки | `runOsBoot` |
| `OS_SHELL_TYPE` | 7 записей `{txt, cls, type?}` | что оболочка «печатает» сама; `type: true` — посимвольно | `runOsBoot` |

Тексты в таблицах — данные: правятся на месте, порядок строк — порядок показа.
Русские строки в комментариях кода задач — часть сюжета и не переводятся.

### Уровень IIFE `DG`: объект `state`

[06-demo.js:1275](../../js/demo/06-demo.js#L1275). Часть полей объявлена в
литерале, часть появляется по ходу (отмечено «дин.»).

| поле | тип / начальное | смысл | пишет / читает |
|---|---|---|---|
| `stage` | `"boot"` | текущая стадия | `gotoStage` / все |
| `diff` | `"easy"` | `easy`/`medium`/`hard` | `startGame` / `voidGlitchAmount`, `emitJury`, реплика Элис |
| `profile` | `PROFILES.easy` | копия профиля прогона | `startGame` / провал, голос, отчёт |
| `sanity` | 100 | наследие старой игры; не меняется | `startGame` / отчёт, `kernStat` |
| `fear` | 0 | то же | `startGame` / отчёт, `kernStat` |
| `progress.tasksSolved` | 0 | число успешных сборок | `onTaskSolved` / `emitJury` |
| `history`, `historyIdx` | `[]`, −1 | не используются (история — `deskHistory`) | `startGame` сбрасывает |
| `decayTimer` | `null` | таймер старой игры; никто не ставит | `close`, `endRun` гасят |
| `fearTimer` (дин.) | — | то же | `close`, `endRun` гасят |
| `ended` | `false` | прогон закончен | `endRun` / `endRun` |
| `tasks` | `[]` | лестница прогона (копия) | `startGame` / все |
| `taskIdx` | 0 | число починенных задач | `onTaskSolved` / отчёт, `syncLocale`, запасной путь редактора |
| `edOpen` | `false` | редактор открыт | `openEditor`/`closeEditor` / Escape, редактор |
| `edHintShown` | `false` | подсказка уже показана | `showEditorHint`, `openEditor` / `syncLocale` |
| `hintMode` | `"normal"` | задуман как `normal`/`jury`; не читается | — |
| `edTask` (дин.) | задача / `null` | какая задача в редакторе | `openEditor`, `closeEditor` / редактор |
| `musicWasOn`, `chatterWasOn` (дин.) | bool | состояние слайдов до входа | `open` / `close` |
| `walkStep` (дин.) | `"help"` | шаг старого пошагового гида; только пишется | `startGame` |
| `osBooted` (дин.) | bool | ОС уже загружалась в этом прогоне | `onVoidArrive` / `onVoidMove`, `onVoidArrive` |
| `endingPlayed` (дин.) | bool | катсцена уже запущена | `playEnding` |
| `lastEnd` (дин.) | `{result, opts}` | для перевода экрана концовки | `endRun` / `syncLocale` |

### Уровень IIFE `DG`: переменные

| имя | начальное | смысл |
|---|---|---|
| `elRoot` … `elOsSkip` | `undefined` | ссылки на DOM, заполняет `init()`; полный список — в «DOM» ниже |
| `voidTimers` | `[]` | таймеры стадии `void` |
| `voidActive` | `false` | сцена запущена (`runVoidStage`) и не остановлена |
| `voidBestDist` | 999 | ближайшее расстояние до цели за визит, для толчка на 22 с |
| `arrivedHandled` | `false` | `E` у терминала уже обработана в этом визите |
| `voidUnlockAt` | 0 | время снятия захвата мыши, мс |
| `voidTextTimer` | `null` | таймер скрытия таблички |
| `osTimers` | `[]` | таймеры загрузки ОС |
| `osSkipped` | `false` | загрузку прервали; каждый шаг проверяет |
| `WM` | объект | оконный менеджер, внутри `open` (карта окон), `zTop` (10), `layer` |
| `filesCwd` | `"/home/neikon"` | каталог окна «Файлы»; между прогонами не сбрасывается |
| `deskHistory`, `deskHistIdx` | `[]`, −1 | история команд терминала и указатель |
| `monCanvas`, `monCtx` | `null` | 2D-канвас монитора 384×288 и его контекст |
| `stoodUpAt` | 0 | время последнего `standUp()`, мс |
| `osWired` | `false` | подписка на `VoidOS` уже сделана |

## Функции

### Строки

#### `tx(key)` → строка
[06-demo.js:16](../../js/demo/06-demo.js#L16). `t(key)`, если глобальная `t`
доступна; иначе `window.STRINGS[settingsState.locale][key]`; иначе сам ключ.
Ошибки глотает. Вызывается везде, где демка показывает текст.

#### `taskField(task, field)` → строка
[06-demo.js:35](../../js/demo/06-demo.js#L35). Ищет `demo.task.<strId>.<field>`, затем
`demo.task.<id>.<field>` (через `t`, затем через `STRINGS`), иначе `task[field]`,
иначе `""`. Ответ `t`, равный самому ключу, считается промахом. Поля: `title`,
`hint`, `hintNoob`, `lore`.

### Фальшивый компилятор

#### `edPad2(n)` → строка
[06-demo.js:186](../../js/demo/06-demo.js#L186). Две цифры с ведущим нулём, как в
жёлобе. Не `pad2` — это имя занято в `07-deck.js`.

#### `stripComments(src, lang)` → строка
[06-demo.js:195](../../js/demo/06-demo.js#L195). Блочные `/* … */` заменяет
пробелами с сохранением переводов строк, `// …` вырезает до конца строки, `# …`
вырезает только для `PYTHON` и `ROOM-CFG`. Строковые литералы не разбирает:
`//` или `#` внутри кавычек тоже срежется.

#### `findIn(code, re)` → `{line, col, text}`
[06-demo.js:205](../../js/demo/06-demo.js#L205). Первая строка, где совпал `re`
(флаг `g` снимается), с номером строки и столбца с единицы. Ничего не нашлось —
строка 1, столбец 1.

#### `dg(raw, at, severity, flag, msg, extra)` → диагностика
[06-demo.js:215](../../js/demo/06-demo.js#L215). Собирает объект диагностики:
место по `findIn(raw, at)`; из `extra` берёт `fn`, `run` и `notes` (пары
`[RegExp, текст]` превращаются в `{line, col, msg}`).

#### `buildCmd(task)` / `buildTool(task)` → строка
[06-demo.js:234](../../js/demo/06-demo.js#L234). Команда сборки — первая строка
`task.success` без `$ `, иначе `build`; инструмент — её первое слово (`roomctl`,
`python3`, `g++`, `gcc`).

#### `diagLines(task, d)` → `[{cls, text}]`
[06-demo.js:239](../../js/demo/06-demo.js#L239). Рендер диагностики в строки по
тону инструмента (таблица в «Редактор починки»). Вложенная `at(l, c)` даёт
префикс `<file>:LL:CC: `. Классы строк: `sev-cmd`, `sev-ctx`, `sev-error`,
`sev-warning`, `sev-note`, `sev-run`. Зовут `renderDiagnostics` и `onTaskFailed`.

#### `interlockCheck(d)` → `check(src, raw)`
[06-demo.js:303](../../js/demo/06-demo.js#L303). Фабрика проверки предохранителя,
алгоритм — в «Семантические проверки». Вложенная `q(s)` экранирует имя функции
давления для `RegExp`; из него строятся `P`, `CMP`; `FLIP` разворачивает оператор.
Читает `VoidOS.world.gauges.vent` и `.pressure` в момент вызова.

#### `anchorsRun(bound)` → массив строк
[06-demo.js:400](../../js/demo/06-demo.js#L400). «Вывод программы» привязки якорей:
`core: bind <a>  ok` на каждый и итог `coherence N%` с перечнем непривязанных.

#### `anchorsCheck(d)` → `check(src, raw)`
[06-demo.js:410](../../js/demo/06-demo.js#L410). Проверка списка якорей и, в C,
согласованности `count`.

#### `doorCheck(d)` → `check(src, raw)`
[06-demo.js:475](../../js/demo/06-demo.js#L475). Какой вызов стоит на ветке
повреждённого образа, с учётом отрицания.

#### `overrideCheck(d)` → `check(src, raw)`
[06-demo.js:511](../../js/demo/06-demo.js#L511). Покрывает ли цикл все ключи и
только существующие. Если границы не разобрались (`NaN`) — принимает код.

#### `diags.bug(raw)` / `diags.partial(raw)` → диагностика
Методы записей `room-lamp`, `room-fog`, `room-sessions` в трёх лестницах
(например, [06-demo.js:564](../../js/demo/06-demo.js#L564)). `bug` — баг на месте
(сработал `mustNot`), `partial` — правильной записи нет (не сработал `must`).
`runEditor` передаёт вторым аргументом `src`, методы его не используют.

### Инициализация, вход и выход

#### `$(sel)` → элемент
[06-demo.js:1317](../../js/demo/06-demo.js#L1317). `elRoot.querySelector(sel)`.
Нигде не вызывается.

#### `init()`
[06-demo.js:1319](../../js/demo/06-demo.js#L1319). Находит `#demoGame` (нет — выход),
заполняет все `el*`, вешает обработчики: док → `launchApp`, кнопка `E` →
`VoidScene.interact()`, `wireVoidTouch()`, «пропустить загрузку», закрыть,
«ещё раз» → `diff`, «выйти» → `close`, карточки сложности → `startGame`,
«встать» → `standUp`, кнопки редактора, `input`/`scroll`/`keydown` на `textarea`,
глобальный `keydown` на `document` (Ctrl+P и Escape). Запускается на
`DOMContentLoaded` или сразу, если DOM готов; `open()` зовёт её повторно, если
корня ещё нет.

#### `silenceTheDeck()`
[06-demo.js:1470](../../js/demo/06-demo.js#L1470). `VoiceBus.stopAll()`,
`stopCurrentVoice()`, `AliceVoice.stop()`, пауза и перемотка в 0 всех `<audio>`
документа. Каждый шаг в `try` и с проверкой `typeof`.

#### `open(source)` / `close()`
[06-demo.js:1482](../../js/demo/06-demo.js#L1482), [1507](../../js/demo/06-demo.js#L1507).
Вход и выход оверлея, шаги — в «Жизненный цикл оверлея». Экспортируются как
`DG.open`/`DG.close` и `window.__openDemoGame`/`__closeDemoGame`.

#### `gotoStage(name)`
[06-demo.js:1543](../../js/demo/06-demo.js#L1543). Единственная смена стадии;
порядок действий — в «Машина стадий».

#### `runBootSequence()`
[06-demo.js:1600](../../js/demo/06-demo.js#L1600). Очищает `#dgBootLines`, через
380 мс начинает выводить `BOOT_LINES` по одной (`span.ln.<класс>`, 240–380 мс),
после последней через 300 мс — `diff`. `Audio.playGlitch(0.6)`. Вложенная `tick`
— шаг вывода. Таймеры не сохраняются и `close()` их не снимает.

#### `startGame(diff)`
[06-demo.js:1623](../../js/demo/06-demo.js#L1623). Новый прогон, шаги — в «Запуск
прогона».

#### `flashEditorGlitch()`
[06-demo.js:1681](../../js/demo/06-demo.js#L1681). Класс `possessed` на редакторе на
240 мс. Нигде не вызывается.

### Стадия `void`

#### `voidClearTimers()` / `voidLater(fn, ms)`
[06-demo.js:1700](../../js/demo/06-demo.js#L1700). Снять все таймеры стадии /
поставить таймер с учётом в `voidTimers`.

#### `voidGlitchAmount()` → 0…1
[06-demo.js:1709](../../js/demo/06-demo.js#L1709). Потолок по сложности, ограничения
от `glitch: off` (0,15), эпилепсии (0,2), `prefers-reduced-motion` (0,2).

#### `isTouchDevice()` → bool
[06-demo.js:1724](../../js/demo/06-demo.js#L1724). `(hover: none) and (pointer: coarse)`
или `ontouchstart` при ширине ≤ 900 px.

#### `runVoidStage()`
[06-demo.js:1731](../../js/demo/06-demo.js#L1731). Запуск сцены и таймлайна
пробуждения. Сбрасывает веки, кнопки и субтитр, ставит легенду управления под тип
ввода (`demo.void.help_html` / `help_touch_html`). Вложенная
`blink(open, ms)` — шаг век через `--lid`. Без WebGL → `osboot`.

#### `resumeVoidStage()`
[06-demo.js:1807](../../js/demo/06-demo.js#L1807). Возврат к ногам без кинематографа.

#### `voidSay(key, delay, hold)`
[06-demo.js:1819](../../js/demo/06-demo.js#L1819). Через `delay` мс показать
`tx(key)` в `#dgVoidSub` и отдать ту же строку `neikonSay()`, через `hold` мс
убрать. Пропускает, если сцена уже остановлена.

#### Голос Нейкона: `neikonSay(text)`, `neikonSpoken(text)`, `neikonHush()`
[06-demo.js:1832](../../js/demo/06-demo.js#L1832)–[1882](../../js/demo/06-demo.js#L1882).
Мысли Нейкона вслух: строки пробуждения (`voidSay`), цель в пустоте
(`syncQuestGuide`, только когда строка цели уже на экране) и строка-подсказка
стола (`refreshDeskPanels`, только на стадии `desk`). Читает ElevenLabs голосом
Egor T — `NeuralVoice.speak(text, { speaker: "neikon", lang })`; без ElevenLabs
Нейкон остаётся текстом: голоса Piper женские, а голос браузера — чей угодно.

- `neikonSpoken(text)` — что читать: срезает хвост-команду после двоеточия
  (`: run /home/neikon/recover.sh`, `: cat /var/log/session.log`) и обратные
  кавычки. Строка без букв (`q.done` = «—») не читается.
- `neikonSay(text)` — та же мысль подряд (`neikonLast`) не повторяется. Пока
  его строка готовится или звучит (`neikonBusy`), новые ждут в `neikonQueue`
  по порядку, не больше трёх (лишняя вытесняет самую старую): строки
  пробуждения идут через 6,6 с, а каждая звучит около 7 с — с одним местом
  цель вытесняла третью строку. Пока говорит Элис (`NeuralVoice.isSpeaking()`,
  `AliceVoice.isSpeaking()`), мысль остаётся текстом; следующая строка Элис
  обрывает Нейкона, и очередь сбрасывается. Звук выключен (`sfxOn === false`)
  или демо закрыто — молчит.
- `neikonHush()` — очередь и `neikonLast` пусты, текущая строка Нейкона
  остановлена. Зовут `runVoidStage()` (повтор начинается с первой мысли) и
  `close()`.

#### `onVoidLock(on)` / `onVoidWake(t, wake)` / `onVoidMove(dist, bearing, target)` / `onVoidArrive()` / `onVoidExamine(id)`
[06-demo.js:1835](../../js/demo/06-demo.js#L1835)–[1903](../../js/demo/06-demo.js#L1903).
Обратные вызовы `VoidScene`, описаны в «Стадия `void`».

#### `showVoidText(lines)`
[06-demo.js:1909](../../js/demo/06-demo.js#L1909). Табличка: строки через `\n`,
классы `on plate`, скрытие через `9000 + 400 × строк` мс. Повторный вызов
перезапускает таймер.

#### `syncQuestGuide()`
[06-demo.js:1921](../../js/demo/06-demo.js#L1921). Компас, интерактивные цели,
строка цели.

#### `stopVoidStage()`
[06-demo.js:1937](../../js/demo/06-demo.js#L1937). `voidActive = false`, таймеры,
`voidBestDist = 999`, `VoidScene.stop()`, сброс прозрачности канваса.

#### `wireVoidTouch()`
[06-demo.js:1946](../../js/demo/06-demo.js#L1946). Сенсорное управление. Внутри:
`stickStart` (запоминает палец и центр джойстика, класс `live`), `stickMove`
(смещение, ограниченное радиусом 46 px, → `setMove`), `stickEnd` (сброс ручки и
движения), обработчики площадки взгляда и `lookEnd`. `touchstart`/`touchmove`
вешаются с `passive: false` и зовут `preventDefault()`, иначе страница
прокручивалась бы под пальцем.

### Загрузка ОС

#### `osClear()` / `osLater(fn, ms)`
[06-demo.js:2076](../../js/demo/06-demo.js#L2076). То же, что `voidClearTimers`/
`voidLater`, для `osTimers`.

#### `osPhase(name)`
[06-demo.js:2079](../../js/demo/06-demo.js#L2079). Класс `on` у секции
`.dg-os-phase[data-phase=name]`, у остальных снимается.

#### `runOsBoot()`
[06-demo.js:2086](../../js/demo/06-demo.js#L2086). Четыре фазы. Без `.dg-os` — сразу
`desk`. Вложенные: `postTick` (строка прошивки), `kernelPhase` и его `tick`
(строка ядра, автопрокрутка), `splashPhase` и его `tick` (шаг заставки, полоса),
`shellPhase` (часы, окно), `typeShell` с `nextLine` (следующая строка оболочки) и
`typeTick` (следующий символ набираемой строки).

#### `skipOsBoot()` / `stopOsBoot()`
[06-demo.js:2195](../../js/demo/06-demo.js#L2195), [2200](../../js/demo/06-demo.js#L2200).
Прервать загрузку и перейти к столу / только прервать (из `gotoStage` и `close`).

### События для жюри

#### `emitJury(type, extra)`
[06-demo.js:2208](../../js/demo/06-demo.js#L2208). `CustomEvent("dg:event")` на
`window`. Ошибки глотает.

#### `logEvent(cls, text)`
[06-demo.js:2221](../../js/demo/06-demo.js#L2221). `emitJury("log", {cls, text})`.
На экран ничего не пишет.

### Ужасы

#### `shake(hard)`
[06-demo.js:2231](../../js/demo/06-demo.js#L2231). Класс `shake` или `shake-hard` на
корне на 800 мс с перезапуском анимации.

#### `spawnGhost()`
[06-demo.js:2238](../../js/demo/06-demo.js#L2238). ASCII-призрак на 1,5 с.

### Оконный менеджер `WM`

Методы модуля [06-demo.js:2263](../../js/demo/06-demo.js#L2263):

| функция | что делает |
|---|---|
| `isPhone()` → bool | `(max-width: 820px)` |
| `raise(id)` | `z-index = ++zTop`, класс `focused` только у этого окна, `syncDock()` |
| `close(id)` → bool | удалить окно из DOM и карты, `syncDock()`; `false`, если окна не было |
| `closeTop()` → bool | закрыть окно с наибольшим `z-index`; `false`, если окон нет |
| `syncDock()` | `active` на кнопках дока по открытым окнам |
| `drag(win, handle)` | перетаскивание за заголовок; внутренняя `end` снимает захват и класс `dragging` |
| `spawn(id, title, cls)` → `{el, body}` или `null` | создать или поднять окно; `null`, если нет `#dgWinLayer` |
| `closeAll()` | закрыть всё, `zTop = 10` |
| `get(id)` → `{el, body}` или `undefined` | открытое окно |

Наружу отдаются все, кроме `isPhone` и `drag`. `WM.raise` снаружи модуля не
вызывается.

### Приложения

#### `appTitle(id)` → строка
[06-demo.js:2399](../../js/demo/06-demo.js#L2399). `tx("demo.app." + id)`.

#### `launchApp(id)`
[06-demo.js:2401](../../js/demo/06-demo.js#L2401). Маршрут кнопки дока к
`open*App`. Неизвестный id — ничего.

#### `openTerminalApp()`
[06-demo.js:2411](../../js/demo/06-demo.js#L2411). Окно терминала; при первом
построении — разметка, ссылки `elTermOut/In/Form/Ps`, плейсхолдер, обработчики
`submit` и `keydown`, приветствие `demo.desk.term.hello`, фокус через 120 мс (не на
сенсорных). Уже построенное окно — только фокус.

#### `openFilesApp(path)` / `renderFiles(body)`
[06-demo.js:2437](../../js/demo/06-demo.js#L2437), [2443](../../js/demo/06-demo.js#L2443).
Окно «Файлы»; `path` меняет `filesCwd`. Отрисовка каталога по `VoidOS.list`;
`(empty)`, если пусто или каталога нет.

#### `openEditorApp(path)`
[06-demo.js:2492](../../js/demo/06-demo.js#L2492). Блокнот. Без пути — пустой и
только для чтения с подсказкой `demo.app.editor.pick`. Сохранение пишет ответ
`VoidOS.writeFile` («saved …» / «write: read-only») в строку статуса и обновляет
панели. Правка `/etc/void.conf` применяется к миру (`VoidOS` разбирает строки).

#### `openSystemApp()` / `renderSystem(body)`
[06-demo.js:2536](../../js/demo/06-demo.js#L2536), [2541](../../js/demo/06-demo.js#L2541).
«Система»: службы, дверь, туман, регионы, аномалии; каждое действие —
`VoidOS.exec(…)`.

#### `openLogsApp()` / `renderLogs(body)`
[06-demo.js:2630](../../js/demo/06-demo.js#L2630). Три журнала, `(missing)` при
отсутствии файла.

#### `openAliceApp()` / `renderAlice(body)`
[06-demo.js:2651](../../js/demo/06-demo.js#L2651). Состояние канала Элис.

#### `refreshApps()`
[06-demo.js:2673](../../js/demo/06-demo.js#L2673). Перерисовка «Файлов», «Системы»,
«Журналов», «ALICE», если открыты.

### Стол

#### `deskPrint(cls, lines)`
[06-demo.js:2685](../../js/demo/06-demo.js#L2685). Строка или массив строк в
`#dgTermOut` как `span.tl.<cls>` (`out`, `sys`, `ok`, `bad`, `warn`, `ai`, `lore`),
автопрокрутка, `paintMonitor()`. Без построенного терминала — ничего.

#### `deskEcho(line)`
[06-demo.js:2697](../../js/demo/06-demo.js#L2697). Эхо команды `~/путь $ строка`
(`span.tl.echo`).

#### `deskSubmit(e)`
[06-demo.js:2706](../../js/demo/06-demo.js#L2706). Отправка строки в `VoidOS.exec`
и разбор сигналов.

#### `updateDeskPrompt()`
[06-demo.js:2726](../../js/demo/06-demo.js#L2726). `neikon@void:<cwd>$`, домашний
каталог как `~`.

#### `deskHistoryStep(delta)`
[06-demo.js:2731](../../js/demo/06-demo.js#L2731). Сдвиг по `deskHistory` в
пределах `[0, length]`; позиция `length` — пустая строка.

#### `onDeskKey(e)`
[06-demo.js:2737](../../js/demo/06-demo.js#L2737). Клавиши поля терминала, таблица
— в «Стол».

#### `refreshDeskPanels()`
[06-demo.js:2832](../../js/demo/06-demo.js#L2832). Счётчики, подсказка, часы, окна.
Новая подсказка на стадии `desk` уходит в `neikonSay()`.

#### `deskNudge()` → строка
[06-demo.js:2855](../../js/demo/06-demo.js#L2855). Строка ориентировки по прогрессу.

#### `ensureMonitor()` / `paintMonitor()`
[06-demo.js:2871](../../js/demo/06-demo.js#L2871), [2878](../../js/demo/06-demo.js#L2878).
Создать канвас монитора и отдать сцене / перерисовать его.

#### `sitDown()` / `standUp()`
[06-demo.js:2907](../../js/demo/06-demo.js#L2907), [2912](../../js/demo/06-demo.js#L2912).
Сесть (если не за столом) → `desk`; встать (если за столом): `stoodUpAt = now`,
`void`. `sitDown` нигде не вызывается — садятся через `onVoidArrive`.

### Шов с `VoidOS`

#### `pushWorldToScene()`
[06-demo.js:2925](../../js/demo/06-demo.js#L2925). Снимок мира в `VoidScene.setWorld`.

#### `wireVoidOs()`
[06-demo.js:2935](../../js/demo/06-demo.js#L2935). Подписка на `VoidOS.onChange`,
таблица реакций — в «Шов».

#### `reportBeats(prof)` → массив строк
[06-demo.js:3007](../../js/demo/06-demo.js#L3007). Шапка отчёта концовки: шесть
строк и пустая.

#### `runRecovery()`
[06-demo.js:3022](../../js/demo/06-demo.js#L3022). Возвращение Элис после
`recover.sh`.

#### `playEnding()`
[06-demo.js:3053](../../js/demo/06-demo.js#L3053). Катсцена у двери. Методы
переданного объекта: `onBeat(name)` — реакции на такты, `onDone()` — остановка
сцены и `endRun("cliff")`.

### Редактор

#### `openEditor(task)`
[06-demo.js:3111](../../js/demo/06-demo.js#L3111). Заполняет шапку (`lang`, файл,
`task N/7`, заголовок), приглашение к подсказке, исходный код, статус, чистит
диагностику, жёлоб, открывает панель, фокус через 320 мс, строка
`demo.ed.openLine` в терминал. Код всегда исходный: прошлая попытка игрока не
сохраняется.

#### `closeEditor()`
[06-demo.js:3146](../../js/demo/06-demo.js#L3146). Закрыть панель, сбросить
`edOpen`/`edTask`, вернуть фокус в терминал (не на сенсорных).

#### `resetEditor()`
[06-demo.js:3158](../../js/demo/06-demo.js#L3158). Вернуть исходный код, статус
`demo.ed.statusReset`, очистить диагностику.

#### `showEditorHint(mode)`
[06-demo.js:3171](../../js/demo/06-demo.js#L3171). Подсказка `tech`/`noob`, правила
— в «Подсказки и сложность». С `mode` шлёт `emitJury("hint")`.

#### `refreshGutter()`
[06-demo.js:3189](../../js/demo/06-demo.js#L3189). Номера строк `01…` и синхронная
прокрутка.

#### `clearDiagnostics()` / `renderDiagnostics(task, d)`
[06-demo.js:3202](../../js/demo/06-demo.js#L3202), [3208](../../js/demo/06-demo.js#L3208).
Очистить панель сборки / вывести `diagLines` в `#dgEdOut`, показать заголовок с
`file:LL`, класс `failed` на 900 мс.

#### `runEditor()`
[06-demo.js:3227](../../js/demo/06-demo.js#L3227). Проверка кода. Вложенные
`fail(msg)` и `okay(msg)` ставят строку статуса с классом `bad`/`ok`.

#### `onTaskFailed(task, diag)` / `onTaskSolved(task)`
[06-demo.js:3296](../../js/demo/06-demo.js#L3296), [3328](../../js/demo/06-demo.js#L3328).
Последствия провала и успеха, описаны в «Редактор починки».

### Голос, концовки, язык

#### `speakAsAlice(text, opts)`
[06-demo.js:3377](../../js/demo/06-demo.js#L3377). Класс `speaking` на корне,
`Audio.playGlitch(1.6)`, `AliceVoice.speak(text, opts)` с обёрнутым `onEnd`
(снимает класс и зовёт пользовательский). Отказ — класс снят, текст в терминал.
Сам `profile.voice` не проверяет — это делают вызывающие.

#### `endRun(result, opts)`
[06-demo.js:3397](../../js/demo/06-demo.js#L3397). Конец прогона, один раз.
Вложенная `showEndStage` заполняет заголовок, подзаголовок, отчёт и вызывает
`gotoStage("end")`.

#### `playBadEndingScare(reason)` / `playWalkAwayScare()`
[06-demo.js:3491](../../js/demo/06-demo.js#L3491), [3523](../../js/demo/06-demo.js#L3523).
Сцены перед экраном плохой концовки и ухода. `reason` не используется.

#### `syncLocale()`
[06-demo.js:3558](../../js/demo/06-demo.js#L3558). Перевод на лету, шаги — в «Язык
и настройки». Весь код в `try`.

#### `syncSettings()`
[06-demo.js:3635](../../js/demo/06-demo.js#L3635). Метод объекта `DG`, пустой.

### Глобальные заглушки

`window.__runLeakDemo` и `window.__runPlayground` зовут `DG.open()`;
`__resetLeakDemo`, `__resetPlayground`, `__pgTab`, `__pgVoiceToggle` — пустые
функции ([06-demo.js:3646](../../js/demo/06-demo.js#L3646)).

## DOM, классы, события, хранилище

### Элементы (`init()`, разметка в `index.html`)

| переменная | селектор | что это |
|---|---|---|
| `elRoot` | `#demoGame` | корень оверлея |
| `elClose` | `#dgClose` | «✕ ВЫЙТИ К СЛАЙДУ» |
| `elBootLines` | `#dgBootLines` | строки загрузки |
| `elEndTitle`, `elEndSub`, `elEndLog` | `#dgEndTitle`, `#dgEndSub`, `#dgEndLog` | экран концовки |
| `elRestart`, `elExitEnd` | `#dgRestart`, `#dgExitEnd` | «ЕЩЁ РАЗ», «ВЫЙТИ К СЛАЙДУ» |
| `elEditor` | `#dgEditor` | панель починки |
| `elEdLang`, `elEdFile`, `elEdTag`, `elEdTitle`, `elEdHint` | `#dgEdLang`, `#dgEdFile`, `#dgEdTag`, `#dgEdTitle`, `#dgEdHint` | шапка и подсказка |
| `elEdArea`, `elEdGutter`, `elEdStatus` | `#dgEdArea`, `#dgEdGutter`, `#dgEdStatus` | код, жёлоб, статус |
| `elEdRun`, `elEdReset`, `elEdHintBtn`, `elEdHintNoobBtn`, `elEdClose` | `#dgEdRun`, `#dgEdReset`, `#dgEdHintBtn`, `#dgEdHintNoobBtn`, `#dgEdClose` | кнопки |
| `elEdOut`, `elEdOutHead`, `elEdOutCmd` | `#dgEdOut`, `#dgEdOutHead`, `#dgEdOutCmd` | панель сборки |
| `elDesk` | `.dg-desk` | стадия стола |
| `elTermOut`, `elTermIn`, `elTermForm`, `elTermPs` | `#dgTermOut`, `#dgTermIn`, `#dgTermForm`, `#dgTermPs` | терминал; создаются `openTerminalApp()`, переназначаются при каждом построении |
| `elDeskLeave` | `#dgDeskLeave` | «встать ⏎ esc» |
| `elDock`, `elWinLayer` | `#dgDock`, `#dgWinLayer` | док и слой окон |
| `elDeskClock`, `elDeskNudgeText` | `#dgDeskClock`, `#dgDeskNudgeText` | часы, строка-подсказка |
| `elMeterVolumeVal`, `elMeterAnomalyVal` | `#dgMeterVolumeVal`, `#dgMeterAnomalyVal` | счётчики «ТОМ» и «АНОМАЛИИ» |
| `elVoidCanvas`, `elVoidLids`, `elVoidSub`, `elVoidHelp` | `#dgVoidCanvas`, `#dgVoidLids`, `#dgVoidSub`, `#dgVoidHelp` | канвас сцены, веки, субтитр/табличка, легенда |
| `elVoidCompass`, `elVoidDist`, `elVoidObjective`, `elVoidUse` | `#dgVoidCompass`, `#dgVoidDist`, `#dgVoidObjective`, `#dgVoidUse` | компас, расстояние, цель, кнопка `E` |
| `elVoidTouch`, `elVoidStick`, `elVoidLook` | `#dgVoidTouch`, `#dgVoidStick`, `#dgVoidLook` | сенсорный слой |
| `elOsRoot` | `.dg-os` | стадия загрузки ОС |
| `elOsPost`, `elOsKernel`, `elOsStatus`, `elOsProgress`, `elOsClock`, `elOsWin`, `elOsWinBody`, `elOsSkip` | `#dgOsPost`, `#dgOsKernel`, `#dgOsStatus`, `#dgOsProgress`, `#dgOsClock`, `#dgOsWin`, `#dgOsWinBody`, `#dgOsSkip` | фазы загрузки |

### Классы и атрибуты, которые ставит код

| где | класс / атрибут | когда |
|---|---|---|
| `#demoGame` | `open`, `aria-hidden` | `open()`/`close()` |
| `#demoGame` | `at-desk`, `data-stage` | `gotoStage` |
| `#demoGame` | `shake`, `shake-hard` | `shake()`, 800 мс |
| `#demoGame` | `speaking` | `speakAsAlice` до конца реплики |
| `#demoGame` | `bad-ending`, `fear-100` | `playBadEndingScare` |
| `#demoGame` | `fearpulse`, `fearbreach` | только снимаются (`close`, `startGame`) |
| `.dg-stage` | `on` | текущая стадия; `void` — ещё и под `desk` |
| `body` | `style.overflow = "hidden"` | пока демка открыта |
| `#dgEditor` | `open`, `solved`, `failed` (900 мс), `possessed` (не ставится), `aria-hidden` | редактор |
| `#dgEdOut`, `#dgEdOutHead` | `on` | есть диагностика |
| `#dgEdStatus` | `ed-status`, `ed-status bad`, `ed-status ok` | статус сборки |
| `#dgVoidLids` | CSS-переменная `--lid` (0…1) | веки |
| `#dgVoidCanvas` | `style.opacity` | пробуждение |
| `#dgVoidSub` | `on`, `plate`, `cry` | субтитр, табличка, крик |
| `#dgVoidHelp` | `on`, `locked` | легенда, захват мыши |
| `#dgVoidCompass` | `on`, `near`, `urge` | компас |
| `#dgVoidUse` | `on`; у подписи — атрибут `data-i18n` | кнопка `E` |
| `#dgVoidObjective`, `#dgVoidTouch` | `on` | цель, сенсорный слой |
| `#dgVoidStick` | `live` | палец на джойстике |
| `.dg-os-phase` | `on` | фаза загрузки |
| `#dgOsWin` | `on` | окно оболочки |
| `.os-window` | `focused`, `dragging`, `data-app`, `style.left/top/zIndex` | окна `WM` |
| кнопки дока | `active` | окно открыто |
| `#dgMeterVolumeVal`, `#dgMeterAnomalyVal` | `ok`, `warn`, `bad` | счётчики |
| родитель `#dgEndTitle` | `win`, `lose` | концовка |

Создаваемые элементы: `span.ln.<cls>` (загрузка), `span.kl.<cls>` (ядро),
`span.ol.<cls>` (оболочка), `span.tl.<cls>` (терминал), `span.ed-out-line.sev-*`
(сборка), `pre.dg-ghost`, окна `.os-window` с `.os-win-bar`, `.os-win-title`,
`.win-close`, `.os-win-body`; внутри приложений — `fm-*`, `np-*`, `sys-*`,
`log-block`, `alice-app`.

### Слушатели

| цель | событие | обработчик |
|---|---|---|
| `document` | `keydown` (всплытие) | Ctrl/Cmd+P, Escape — в `init()` |
| `#dgEdArea` | `keydown`, `input`, `scroll` | горячие клавиши редактора, жёлоб |
| `#dgTermIn` | `keydown` | `onDeskKey` |
| `#dgTermForm` | `submit` | `deskSubmit` |
| `#dgVoidStick`, `#dgVoidLook` | `touchstart/move/end/cancel` | `wireVoidTouch` |
| заголовок окна | `pointerdown/move/up/cancel` | `drag` |
| окно | `pointerdown` | `raise` |
| кнопки | `click` | док, `E`, карточки, закрыть/ещё раз/выйти/встать/пропустить, кнопки редактора, кнопки приложений |
| — | `DOMContentLoaded` | `init` |

### Флаги и события `window`

- Пишет: `__demoActive`, `__chatterEnabled`, экспорты `__openDemoGame`,
  `__closeDemoGame`, `__demoSyncSettings`, `__demoSyncLocale` и заглушки.
- Читает: `settingsState`, `STRINGS`, `__dgSkipAutofocus`, `__chatterEnabled`.
- Шлёт: `dg:event` (`CustomEvent`, `detail` описан в «События для жюри»).
- `localStorage`, сеть, cookies — не трогает. Голос и записи идут через
  `AliceVoice` (см. [audio.md](audio.md)).

## Подводные камни

### Инварианты

- **Новое поле мира — в `pushWorldToScene()`.** Иначе сцена молча рисует старое
  значение, а мир под ней меняется правильно. Ловится только замером.
- **Ни одна строка не должна печатать `world.gauges.vent`** — ни в статус, ни в
  панель сборки, ни в журнал. Иначе задача решается из-за стола.
- **`Escape` в любом новом поле ввода демки обязан звать `stopPropagation()`**,
  если обработчик меняет стадию; иначе документ закроет демку тем же нажатием.
- **Новый глобальный слушатель клавиш** должен молчать, пока фокус в поле ввода
  (см. «Известные особенности» в [ARCHITECTURE.md](../ARCHITECTURE.md)).
- **Новая задача** — запись во все три лестницы с одинаковым `id`, строка в
  `TASK_GLITCH`, эффект в `VoidOS.applyEffect`, ключи `demo.task.<id>.title/.lore`
  и `demo.task.<strId>.hint/.hintNoob` во всех четырёх локалях.
- **Первая строка `task.success` — команда сборки.** От неё зависит тон
  диагностики (`buildTool`); поменять `$ gcc` на что-то другое — сменится формат.
- **Голые имена функций в этом файле видны всем файлам.** `edPad2` назван так
  из-за `pad2` в `07-deck.js`; новый помощник проверяется grep'ом по `js/`.
- **`speakAsAlice` не проверяет сложность.** Новый вызов обязан сам проверить
  `state.profile.voice`.

### Неочевидное поведение

- Из поля терминала `Escape` поднимает игрока сразу, мимо открытых окон. Если
  фокус не в поле, первым закрывается верхнее окно — и это может быть сам
  терминал: вывод пропадает, при следующем входе за стол строится новый.
- Пока окно терминала закрыто, `deskPrint` пишет в отсоединённый элемент:
  копия осмотра в комнате, вывод починки и реплики уходят в никуда. До первой
  посадки за стол терминала нет вовсе — копия осмотра двери теряется.
- `openEditor` всегда загружает исходный код задачи; закрытие редактора
  (в том числе автоматическое через 1,2 с после успеха) теряет правки.
- `syncLocale()` вызывается после любого `applySettings()`, а не только при
  смене языка, и каждый раз переписывает тела сюжетных файлов.
- Настройки видео, сменённые посреди прогона, дойдут до сцены только при
  следующем запуске `runVoidStage()` — `syncSettings` пуст.
- Подсказки (`? hint`, `?? для жюри`) работают одинаково на всех сложностях и
  при любой настройке `hints`; карточки сложности обещают «подсказки с
  задержкой» и «подсказки редкие», но код этого не делает.
- `filesCwd` не сбрасывается между прогонами: «Файлы» открываются там, где их
  оставили.
- `runBootSequence()` не хранит таймеры: закрыть демку во время загрузки и
  открыть снова в пределах ~3 с — и старая цепочка переключит на `diff` раньше
  времени.

### Расхождения кода и комментариев, мёртвый код, вероятные ошибки

Найдено при чтении, код не правился.

1. [06-demo.js:113](../../js/demo/06-demo.js#L113): «Five kinds for six tasks» —
   задач семь; кроме `drift` повторяется и `loop` (`room-door`, `room-override`).
2. [06-demo.js:1626](../../js/demo/06-demo.js#L1626): комментарий обещает `rare` →
   25 %, код ставит не выше 0,35; главное — `hintStrength` после этого никто не
   читает. Настройка `hints` на демку не влияет. Из профиля не читаются также
   `sanityDecay`, `fearGainBad`, `fearGainGood`, `shakeChance`, `bootDelay`,
   `endText`, `endSub`.
3. `state.sanity` и `state.fear` не меняются: отчёт всегда пишет sanity 100 и
   fear 0, `demo.scare.kernStat` — `sanity: 100% · fear_level: 0%`
   ([06-demo.js:3014](../../js/demo/06-demo.js#L3014), [3510](../../js/demo/06-demo.js#L3510)).
   Та же болезнь, которую комментарий к `reportBeats` лечил для `steps`.
   `decayTimer`/`fearTimer` никто не ставит; `state.history`, `historyIdx`,
   `hintMode` не читаются; `walkStep` только пишется.
4. `endRun` вызывается только с `lose` (`reason: "anomaly"`) и `cliff`. Ветки
   `win`, `partial`, `walked_away`, причины `fear`/`sanity` и
   `playWalkAwayScare()` недостижимы. Комментарий
   [06-demo.js:3412](../../js/demo/06-demo.js#L3412) перечисляет пять исходов,
   включая необработанный `abandoned`; комментарий
   [06-demo.js:3487](../../js/demo/06-demo.js#L3487) говорит, что сцена
   запускается от sanity 0 или fear 100 — на деле от аномалий ≥ 100.
5. `shake()` ставит классы, но CSS трясёт `.demo-game.shake .dg-scene`
   ([styles.css:2965](../../styles.css#L2965)), а `.dg-scene` в нынешней разметке
   нет — тряска не видна. То же у `speaking` (`.dg-terminal`,
   [styles.css:3039](../../styles.css#L3039)). `fearpulse`/`fearbreach` только
   снимаются.
6. Мёртвые функции: `flashEditorGlitch()`, `$()`, `sitDown()`. Ветка
   `buildFailHint` в `onTaskFailed` недостижима — функцию всегда зовут с
   диагностикой. Комментарий [06-demo.js:3349](../../js/demo/06-demo.js#L3349)
   («walkthrough — first successful compile…») остался без кода.
7. [06-demo.js:1570](../../js/demo/06-demo.js#L1570): «чек-лист жюри показывается
   по атрибуту `data-stage`» — ни одно CSS-правило этот атрибут на корне не
   читает, а `aside.jury` скрыт целиком при `.demo-game.open`
   ([styles.css:3988](../../styles.css#L3988)). `dg:event` никто не слушает.
8. [06-demo.js:1660](../../js/demo/06-demo.js#L1660): «`boot()` emits nothing» —
   `VoidOS.boot()` излучает `world/boot`
   ([05-void-os.js:2416](../../js/demo/05-void-os.js#L2416)), а подписка
   `wireVoidOs()` сделана до `boot()`, так что явный `pushWorldToScene()` лишний
   (безвреден). То же утверждение повторяет `ARCHITECTURE.md`.
9. [06-demo.js:3571](../../js/demo/06-demo.js#L3571): `syncLocale()` берёт задачу
   как `state.tasks[state.taskIdx]`, а не `state.edTask` — после смены языка в
   открытом редакторе заголовок может принадлежать другой задаче (например,
   открыт `interlock`, починена одна `lamp` → `taskIdx = 1` → заголовок `fog`).
   Комментарий «перерисовать показанный вариант подсказки» не выполняется:
   `showEditorHint()` без аргумента выбирает вариант по
   `settingsState.hintMode`, и показанный `?? для жюри` превращается в
   техническую подсказку.
10. [06-demo.js:1852](../../js/demo/06-demo.js#L1852): у приборов `gauge1`/`gauge2`
    кнопка подписана `demo.void.examine.pylon` — «ОСМОТРЕТЬ ОПОРУ».
11. [06-demo.js:2591](../../js/demo/06-demo.js#L2591): ползунок тумана в «Системе»
    на каждом `input` выполняет `set fog.density`, `VoidOS` излучает событие,
    `refreshApps()` перестраивает окно — и перетаскиваемый ползунок удаляется из
    DOM на первом шаге. По коду видно, что перетаскивание должно обрываться.
12. Переход `desk → end` (аномалии ≥ 100 за столом) не останавливает сцену: условие
    [06-demo.js:1558](../../js/demo/06-demo.js#L1558) срабатывает только при
    уходе с `void`. `voidActive` остаётся истиной, цикл кадра идёт за экраном
    концовки, а «▶ ЕЩЁ РАЗ» уводит в `resumeVoidStage()` — без пробуждения, без
    перезапуска сцены, игрок там, где стоял.
13. [06-demo.js:3388](../../js/demo/06-demo.js#L3388): строка
    `[ tts ] браузер не дал голос. читаю про себя:` захардкожена по-русски.
14. Проверки `AliceVoice && AliceVoice.available`
    ([06-demo.js:3090](../../js/demo/06-demo.js#L3090), [3355](../../js/demo/06-demo.js#L3355),
    [3516](../../js/demo/06-demo.js#L3516), [3535](../../js/demo/06-demo.js#L3535))
    стоят вне `try` и без `typeof`: если убрать `03-alice-voice.js` из
    `index.html`, на HARD будет `ReferenceError` — вопреки правилу «файл можно
    убрать».
15. [06-demo.js:2474](../../js/demo/06-demo.js#L2474): клик по уже починенному
    региону в «Файлах» выполняет `edit`, `VoidOS` отвечает «already clean», ответ
    выбрасывается — клик ничего не делает.
16. `close()` не сбрасывает `state.edOpen`: закрыть демку с открытым редактором,
    открыть снова — первый `Escape` на экране загрузки или выбора сложности уйдёт
    в `closeEditor()` ([06-demo.js:1451](../../js/demo/06-demo.js#L1451)).
17. [06-demo.js:511](../../js/demo/06-demo.js#L511): `overrideCheck` принимает
    код, где цикла нет вовсе (ни `for`, ни `range` не найдены → `lo = 0`,
    `hi = n`) или граница не разбирается (`NaN` → `return null`). Вероятная
    лазейка: удалить цикл целиком — задача засчитана.
18. Мелочи: `state.edHintShown = true` дважды
    ([06-demo.js:3184](../../js/demo/06-demo.js#L3184)); `paintMonitor` берёт
    шесть строк `lastOut`, а `VoidOS` хранит четыре; `open(source)` не использует
    `source`; `playBadEndingScare(reason)` не использует `reason`.
