# VoidOS — справочник

> Файлы: `js/demo/05-void-os.js` (2639 строк) · Место в порядке загрузки: 8-й из 24
> `<script defer>` в `index.html`, после `demo/04-void-scene.js`, перед `demo/06-demo.js`.
> Связанные страницы: [demo.md](demo.md) (кто зовёт VoidOS: стол, окна, редактор,
> проверки кода), [void-scene.md](void-scene.md) (кто рисует мир), [ui.md](ui.md)
> (`settingsState`, смена языка), [README.md](README.md); общая картина —
> [ARCHITECTURE.md](../ARCHITECTURE.md), правила игры — [GAME.md](../GAME.md).

## Коротко

`05-void-os.js` — операционная система, внутри которой идёт демо-игра: виртуальная
файловая система, состояние комнаты (`world`), шелл из 23 команд и трёх сигналов
(`clear`, `exit`, `look`), менеджер служб, счётчик аномалий, цепочка из пятнадцати целей и «память» Нейкона, от которой
зависит, какие файлы есть на диске. Файл ничего не рисует и не трогает DOM: он хранит
состояние и сообщает об изменениях через `onChange`; `06-demo.js` переносит их в 3D-сцену,
звук и окна. Первые ~1460 строк — две таблицы текстов на четырёх языках
(`OS_TEXT_BY_LOCALE`, `OS_STORY_BY_LOCALE`), остальное — IIFE `VoidOS`. Зритель видит
результат за столом в 3D-комнате: вывод `ls`/`cat`/`svc`, окна «Файлы», «Система»,
«Блокнот», «Журналы», строку цели внизу экрана, таблички на опорах и приборах.

## Как это работает

### Устройство файла

| строки | что |
|---|---|
| [1–9](../../js/demo/05-void-os.js#L1) | шапка |
| [11–794](../../js/demo/05-void-os.js#L11) | `OS_TEXT_BY_LOCALE` — машинный слой: man-страницы, конфиг, устройства, вывод команд |
| [797–1456](../../js/demo/05-void-os.js#L797) | `OS_STORY_BY_LOCALE` — сюжетный слой: записки, таблички, журналы, цели, воспоминания |
| [1458–1464](../../js/demo/05-void-os.js#L1458) | слияние сюжета поверх машины (единственный код уровня файла) |
| [1466–2639](../../js/demo/05-void-os.js#L1466) | `const VoidOS = (function () { … })()` — движок |

Внутри IIFE разделы идут так: `ot()` → `world` → события → мини-ФС (`dir`, `file`,
`buildFs`) → пути (`norm`, `lookup`, `parentOf`) → `anomaly()` → запись в мир
(`applyConfLine`, `syncConfFile`, `allRepaired`) → цепочка целей (`QUESTS`) → память
(`MEMORIES`, `remember`, `examine`) → аномалии геометрии (`GLITCH_*`) → службы
(`SERVICES`, `svcState`) → помощники вывода → команды (`CMDS`) → публичный объект.

На верхнем уровне файл только объявляет данные и выполняет одно `Object.assign` над
своими же таблицами. К чужим глобалам он обращается только из функций: `settingsState`
читается в `ot()` в момент вызова, под `typeof`-защитой. Поэтому `05` может грузиться
раньше `11-settings.js`, где `settingsState` объявлен.

### Текстовые таблицы

Обе таблицы устроены одинаково:

```
OS_TEXT_BY_LOCALE = {
  ru:     { "ключ": "строка", … },
  en:     { … },
  tj:     { … },     // литературный таджикский
  tj_col: { … }      // разговорный таджикский
}
```

Значение — одна строка; многострочные тексты склеены `+` с `\n`. Ключ — с точкой-группой
(`man.svc`, `out.lampUp`) или без неё (`readme`, `conf`, `history`, `personality`,
`recover.sh`). Во всех четырёх локалях набор ключей одинаковый (проверено скриптом:
52 ключа в машинной таблице и 36 в сюжетной на каждый язык).

**Машинный слой, `OS_TEXT_BY_LOCALE`** ([строка 11](../../js/demo/05-void-os.js#L11)) —
52 ключа на язык:

| группа | ключей | что | где используется |
|---|---|---|---|
| `readme` | 1 | старая версия readme | **перекрывается** сюжетом, на экран не попадает |
| `note.room/door/alice` | 3 | старые версии записок | **перекрываются** сюжетом |
| `conf` | 1 | шаблон `/etc/void.conf` | `buildFs`, `relocalize` |
| `history` | 1 | `.bash_history` прошлого Нейкона | `buildFs`, `relocalize` |
| `man.*` | 6 | `svc`, `set`, `fsck`, `edit`, `recover`, `anomaly` | `buildFs` → `world.manPages` и `/usr/share/man/*.1` |
| `dev.*` | 5 | тела `/dev/alice`, `door0`, `lamp0..2` | `buildFs`, `relocalize` |
| `log.*` | 3 | `log.alice`, `log.anomaly.armed`, `log.anomaly.short` | журналы, `anomaly()` |
| `personality` | 1 | `/etc/alice/personality.cfg` | `buildFs` |
| `recover.sh` | 1 | текст скрипта восстановления | `buildFs` |
| `svc.*` | 5 | описания служб в `svc list` | `CMDS.svc` через `SERVICES[n].key` |
| `help.*` | 5 | заголовок, клавиши, `look`, `exit`, «начни с» | `CMDS.help` |
| `out.*` | 20 | комментарии-реплики в выводе команд (`// …`) | команды |

**Сюжетный слой, `OS_STORY_BY_LOCALE`** ([строка 808](../../js/demo/05-void-os.js#L808)) —
36 ключей на язык:

| группа | ключей | что | где используется |
|---|---|---|---|
| `q.*` | 17 | строка цели для каждого шага `QUESTS` (15) + `q.done` («—») + `q.barrier` | `questObjective()`; `q.barrier` не используется нигде |
| `world.*` | 3 | `pylonDark`, `gaugeDark`, `doorLook` — ответ на `E` у тёмной опоры, тёмного прибора, запертой двери | `examine()` |
| `plate.*` | 4 | таблички `pylon1`, `pylon2`, `gauge1`, `gauge2`; в `gauge*` есть подстановка `{v}` | `examine()`, `MEMORIES.core` |
| `remember.*` | 5 | реплика при воспоминании: `anchor`, `core`, `pressure`, `vent`, `sessions` | `remember()` |
| `log.*` | 2 | `log.anchor`, `log.sessions` — файлы, которые появляются по памяти | `MEMORIES` |
| `note.again` | 1 | четвёртая записка | `MEMORIES.sessions` |
| `readme`, `note.room/door/alice` | 4 | действующие тексты readme и трёх записок | `buildFs`, `relocalize` |

**Слияние.** Сразу после второй таблицы
([строка 1460](../../js/demo/05-void-os.js#L1460)) для каждой локали выполняется
`Object.assign(OS_TEXT_BY_LOCALE[loc], OS_STORY_BY_LOCALE[loc])`. После этого машинная
таблица содержит 84 ключа, и `ot()` читает только её. Общих ключей четыре: `readme`,
`note.room`, `note.door`, `note.alice`. По ним побеждает сюжет; машинные версии этих
четырёх текстов — мёртвый текст: правка в `OS_TEXT_BY_LOCALE` до экрана не доедет, без
ошибки и предупреждения. Проверять по итоговому значению:
`OS_TEXT_BY_LOCALE.ru["readme"]` в консоли. (`ARCHITECTURE.md` перечисляет как общие ещё
`plate.*` и `log.*` — по коду `plate.*` есть только в сюжете, а `log.*` в двух таблицах
разные.)

**Что не переводится.** Пути, имена команд, вывод `ls`/`ps`/`dmesg`/`fsck`/`stat`,
ответы `set` и `svc`, номера устройств, `kern.log` и бинарные заглушки в `/boot` — это
английские литералы прямо в коде команд. Переводится то, что человек должен понять:
`// …`-реплики (`out.*`), файлы, таблички, цели.

### Поиск строки: `ot(key)`

```
локаль = settingsState.locale  (если settingsState объявлен и не пуст)  иначе "ru"
OS_TEXT_BY_LOCALE[локаль][key]  →  OS_TEXT_BY_LOCALE.ru[key]  →  сам key
```

Неизвестная локаль падает на русскую таблицу целиком. Нет перевода — русский текст. Нет
ключа вообще — на экране сам ключ (например, `plate.gauge3`): пустой файл заметить
трудно, ключ — сразу.

### Мир

`world` ([строка 1481](../../js/demo/05-void-os.js#L1481)) — единственный источник
истины о комнате. Его пишут только функции VoidOS; `06-demo.js` и сцена читают
(`VoidOS.world` отдан наружу по ссылке). Все поля — в разделе «Константы и состояние».
Стартовые значения задаются дважды: в литерале объекта и в `boot()`; `boot()` выполняется
при каждом запуске демки и затирает то, что осталось от прошлого прогона (с одним
исключением — `sessionsRestored`, см. «Подводные камни»).

### Виртуальная файловая система

Узел — обычный объект ([строка 1515](../../js/demo/05-void-os.js#L1515)):

| поле | у кого | смысл |
|---|---|---|
| `t` | все | `"d"` каталог, `"f"` файл |
| `kids` | каталог | `{ имя: узел }` |
| `body` | файл | содержимое, строка |
| `mode` | файл | `"rw-"` (по умолчанию), `"r--"`, `"rwx"`; у каталогов поля нет, `ls` печатает `rwx` |
| `dev` | `/dev/*` | имя службы; делает файл символьным устройством (`c` в `ls`, `state` в `stat`) |
| `broken` | битые | `** CORRUPT **` в `ls`/`tree`/`find`, попадает в `fsck` |
| `taskId` | регионы задач | мировой `id` задачи; только такие файлы открывает `edit` |
| `hidden` | `.bash_history` | не виден в `ls`/`tree` без `-a` и в окне «Файлы» |
| `conf` | `/etc/void.conf` | сохранение через `writeFile` применяет ключи |
| `script` | `recover.sh` | `"recover"`: `run` запускает восстановление |
| `anomaly` | `anomaly.log` | метка; кодом не читается |

`dir(kids, opts)` и `file(body, opts)` собирают узлы через `Object.assign`.
`buildFs(diff, tasks)` ([строка 1528](../../js/demo/05-void-os.js#L1528)) строит образ
заново на каждом `boot()`:

```
/
├─ boot/
│  ├─ vmlinuz-6.9.0-alice        r--  заглушка «<binary> 9.1 MiB»
│  └─ initrd.img                 r--  broken; чинится сам, когда allRepaired()
├─ dev/  alice door0 lamp0 lamp1 lamp2 null      dev=<имя>
├─ etc/
│  ├─ hostname                   "void"
│  ├─ void.conf                  conf; ot("conf"), затем syncConfFile()
│  └─ alice/
│     ├─ personality.cfg
│     └─ lucidity.state          r--, broken; оживает по памяти "core" или allRepaired()
├─ home/neikon/
│  ├─ readme.txt  recover.sh (rwx, script)  .bash_history (hidden)
│  └─ notes/ 01-the-room.txt 02-the-door.txt 03-alice.txt
│            04-again.txt        ← появляется по памяти "sessions"
├─ tmp/  (пусто)
├─ var/log/
│  ├─ kern.log  alice.log  anomaly.log         r--
│  ├─ anchor.log                 ← появляется по памяти "anchor"
│  └─ session.log                ← появляется по памяти "sessions"
├─ mnt/alice/  (пусто)
├─ usr/share/man/  svc.1 set.1 fsck.1 edit.1 recover.1 anomaly.1   r--
└─ opt/room/  lamp.cfg fog.* interlock.* doorctl.* sessions.* anchors.* override.*
              ← из таблицы задач 06-demo.js: broken, taskId, тело = task.code
```

Без регионов задач в образе 27 файлов; с семью регионами — 34 на старте и до 37 после
всех воспоминаний. Каталог `/opt/room` в литерале не объявлен: цикл по `tasks` создаёт
недостающие каталоги по пути `task.file`. Расширение регионов (`.py`/`.cpp`/`.c`)
определяется лестницей задач сложности, сам VoidOS о языках не знает.

**Пути.** `norm(p)` делает путь абсолютным относительно `cwd`, выбрасывает пустые
сегменты и `.`, на `..` снимает последний сегмент (выше корня не уходит). `~` не
поддерживается: `cd ~` ищет каталог с именем `~`. `lookup(p)` спускается по `kids` и
возвращает `{ node, path }` или `null`; `"/"` даёт корень. `parentOf(p)` возвращает
`{ parent, base, path }` — нужен только `rm`.

### `/etc/void.conf`: ключи и три пути записи

Конфиг — текст из `ot("conf")` плюс реальные значения из `world`. Ключи разбирает
`applyConfLine(key, value)` ([строка 1661](../../js/demo/05-void-os.js#L1661)):

| ключ | значение | что меняет | событие | ответ |
|---|---|---|---|---|
| `fog.density` | число, зажим 0.005…0.14 | `world.fog` → плотность тумана в сцене | `world/fog` | `fog.density = …`; не число → `set: fog.density wants a number` |
| `lamp.lamp0..2` | `on`/`1`/`true`/`up` → вкл, остальное → выкл | `world.lamps[id]`, затем `checkQuests()` | `world/lamp` | `lamp.lampN = on/off` |
| `door.door0` | любое слово; `open` при `!allRepaired()` отклоняется | `world.door` | `world/door` | `open` рано → `+4` аномалии и `door0: refused — initrd.img is corrupt` |
| `room.width` | число, 10…40 | `world.room.w` | `world/room` | |
| `room.depth` | число, 12…60 | `world.room.d` | `world/room` | |
| `room.height` | число, 3…12 | `world.room.h` | `world/room` | ключа нет в шаблоне конфига |
| `room.barrier` | целое, 0…4 | `world.room.barrier` — сколько панелей перегородки стоит | `world/barrier` | при 0 дописывает `  (проход открыт)` — по-русски в любой локали |
| `anomaly.threshold` | любое | ничего | через `anomaly()` | `+6` аномалии, `watchdog: threshold is read-only while armed` |
| другое | | | | `set: unknown key '…' (see /etc/void.conf)` |

Три пути записи:

1. **`set <ключ> <значение>`** — `CMDS.set` склеивает всё после ключа пробелами, зовёт
   `applyConfLine`, затем `syncConfFile()`. Ответ с `refused|unknown|wants|read-only`
   печатается как `warn`, иначе `out`.
2. **Блокнот** — `writeFile("/etc/void.conf", body)` записывает тело как есть, потом
   прогоняет **каждую** строку вида `ключ = значение` через `applyConfLine`
   (комментарии `#` отсекаются регуляркой). `syncConfFile` не зовётся: в файле остаётся
   то, что набрал игрок, даже если значение было зажато.
3. **Команды и эффекты задач** — `svc`, `applyEffect`, `aliceAlive` пишут в `world`
   напрямую и зовут `syncConfFile()`.

`syncConfFile()` ([строка 1708](../../js/demo/05-void-os.js#L1708)) — обратное
направление: восемью `replace` по регуляркам переписывает значения `fog.density`,
`lamp.lamp0..2`, `door.door0`, `room.width`, `room.depth`, `room.barrier` в теле файла из
`world`. Комментарии и выравнивание шаблона остаются. `room.height` и
`anomaly.threshold` не синхронизируются. Если игрок удалил файл (`rm /etc/void.conf`),
функция молча ничего не делает.

### Счётчик аномалий

`world.corruption` (0…100) поднимает `anomaly(amount, reason)`
([строка 1649](../../js/demo/05-void-os.js#L1649)): прибавляет, зажимает в 0…100,
дописывает в `/var/log/anomaly.log` строку `[ NN] причина` (при первой записи заменяет
заголовок `log.anomaly.armed` на короткий `log.anomaly.short`) и излучает
`corruption { value, reason, delta }`. Событие уходит и тогда, когда счётчик уже упёрся
в 100.

| источник | `+N` | где |
|---|---|---|
| неизвестная команда | 2 | `exec` |
| `set door.door0 open` при битом образе | 4 | `applyConfLine` |
| `set anomaly.threshold …` (и любое сохранение конфига в Блокноте, см. «Подводные камни») | 6 | `applyConfLine` |
| запуск неизвестного исполняемого файла | 7 | `CMDS.run` (на практике недостижим: исполняемый в образе только `recover.sh`) |
| `svc stop lamp0` | 8 | `CMDS.svc` |
| провал починки | 9 | `repairFailed` (зовёт `06`) |
| `rm` устройства из `/dev` | 12 | `CMDS.rm` |
| `rm` неисправленного региона | 15 | `CMDS.rm` |

Понижают счётчик только `repairDone` (−6 за починку, без записи в журнал) и
`aliceAlive` (обнуляет). Сам VoidOS реагирует на порог в двух местах: `ps` показывает
лишний процесс при `> 30` (`<walking>`, при `> 60` — `<near>`), `dmesg` пишет о сущности
при `> 20` и о её приближении к `/dev/lamp0` при `> 55`. Тряска, призраки, звук и
проигрыш на 100 — в `06-demo.js` (`wireVoidOs`). Знаменатель `/ 45` в `df`, счётчиках
стола и на мониторе — литерал; строка `anomaly.threshold = 45` в конфиге ничего не
задаёт.

### Проверка кода игрока без компилятора

Компилятора в сборке нет. Починка региона — разбор текста по шаблонам в `06-demo.js`
(`runEditor`, фабрики `interlockCheck`/`anchorsCheck`/`doorCheck`/`overrideCheck`,
литералы `must`/`mustNot`; подробно — [demo.md, «Семантические
проверки»](demo.md#семантические-проверки)). VoidOS даёт этому разбору вход (событие
`edit`), данные мира (`world.gauges`) и принимает результат:

```
игрок: edit /opt/room/interlock.py       (или клик по региону в «Файлах»/«Системе»)
  CMDS.edit: lookup → есть taskId? → ещё не починен? → emit("edit", {path, taskId})
06 wireVoidOs → openEditor(task)          в textarea кладётся task.code
игрок правит и жмёт ▶
06 runEditor: stripComments → task.check(src, raw)  или  mustNot/must
  ├─ есть диагностика → onTaskFailed → VoidOS.repairFailed(id)          +9 аномалий
  │                                  → VoidOS.spawnGlitch(TASK_GLITCH[id], id)
  └─ чисто           → onTaskSolved → VoidOS.repairDone(id, task.file)  repaired, −6, снять аномалии
                                    → VoidOS.applyEffect(task.effect)  комната меняется
```

Эффекты одинаковы на всех трёх лестницах (`LADDER_PY`, `LADDER_CPP`, `LADDER_C`):

| задача (`id`) | `effect` | что делает `applyEffect` |
|---|---|---|
| `room-lamp` | `{ lamp: "lamp1", on: true }` | `world.lamps.lamp1 = true` |
| `room-fog` | `{ fog: 0.02 }` | `world.fog = 0.02` (без зажима, в отличие от `set`) |
| `room-interlock` | `{ barrier: 0, lamp: "lamp2", on: true, interlock: true }` | перегородка в пол, `lamp2` вкл, `world.interlock = "released"` |
| `room-door` | `{ door: "halted" }` | `world.door = "halted"` |
| `room-sessions` | `{ sessions: true }` | `world.sessionsRestored = true`, `remember("sessions")` |
| `room-anchors` | `{ anchors: true }` | `world.anchorsBound = true` |
| `room-override` | `{ unlocked: true }` | `world.lockOverridden = true`, `world.door = "open"` |

После каждого эффекта — `syncConfFile()` (где есть что синхронизировать), событие
`world` и в конце `checkQuests()`. Комментарий над `applyEffect` объясняет, зачем эффект
применяет ОС, а не редактор: клик в панели починки и ручной запуск того же скрипта должны
приводить в одно и то же состояние.

**Приборы на стенах.** Единственная задача, ответ на которую нельзя прочитать с диска, —
`room-interlock`. В скрипте стоит заглушка `VENT_LIMIT = 0.0`, а нужное число
генерируется в `boot()` ([строка 2402](../../js/demo/05-void-os.js#L2402)):

```
vent     = (2 + floor(rnd·3)) + (1 + floor(rnd·9)) / 10     → 2.1 … 4.9, десятая ≠ 0
pressure = round1(vent − (0.6 + rnd·0.8))                   → всегда ниже vent минимум на 0.5
world.gauges = { vent: round1(vent), pressure }
```

Число нигде не записывается в файл. Его показывают только два объекта в комнате:
`examine("gauge1")` — манометр, давление в камере; `examine("gauge2")` — табличка
клапана, предел продувки. Оба подставляют значение в `plate.gauge*` вместо `{v}` через
`toFixed(1)` в момент нажатия `E` и только при включённой `lamp1` (иначе
`world.gaugeDark`). `interlockCheck` в `06` читает `VoidOS.world.gauges.vent` и
`.pressure` в момент нажатия ▶ и требует совпадения с пределом с точностью 0.001;
давление вместо предела ловится отдельной диагностикой. Правило клапана («ниже —
отпускает») написано открытым текстом в шапке скрипта и на табличке; засекречено только
число. Десятая доля у предела не бывает нулём, чтобы `3.0` и `3` не превращались в спор о
форматировании (комментарий в `boot()`).

Что из этого следует (в коде сформулировано как «cannot be solved, guessed or memorised
from the chair», остальное — вывод): текст региона, скопированный куда угодно — в поиск,
соседу, в чат с языковой моделью, — ответа не содержит. Число добывается одним способом:
встать из-за стола, включить свет и дойти до двух стен.

### Цепочка целей

`QUESTS` ([строка 1747](../../js/demo/05-void-os.js#L1747)) — 15 шагов. У каждого
`id` (он же суффикс ключа `q.<id>` со строкой цели), `where` (на что указывает шеврон
компаса в сцене) и `done()` — условие по `world`:

| # | `id` | `where` | `done()` истинно, когда |
|---|---|---|---|
| 1 | `wake` | `terminal` | `world.visited["/home/neikon/readme.txt"]` |
| 2 | `lamp` | `terminal` | `world.repaired["room-lamp"]` |
| 3 | `plate1` | `pylon1` | `world.examined.pylon1` |
| 4 | `anchor` | `terminal` | `world.visited["/var/log/anchor.log"]` |
| 5 | `fog` | `terminal` | `world.repaired["room-fog"]` |
| 6 | `gauges` | `gauge2` | `world.examined.gauge1 && world.examined.gauge2` |
| 7 | `interlock` | `terminal` | `world.repaired["room-interlock"]` |
| 8 | `plate2` | `pylon2` | `world.examined.pylon2` |
| 9 | `doorctl` | `terminal` | `world.repaired["room-door"]` |
| 10 | `sessions` | `terminal` | `world.repaired["room-sessions"]` |
| 11 | `seen` | `terminal` | `world.visited["/var/log/session.log"]` |
| 12 | `anchors` | `terminal` | `world.repaired["room-anchors"]` |
| 13 | `recover` | `terminal` | `world.aliceState === "alive"` |
| 14 | `override` | `terminal` | `world.lockOverridden` |
| 15 | `door` | `door` | `world.doorOpened` |

`checkQuests()` ([строка 1815](../../js/demo/05-void-os.js#L1815)) двигает
`world.questIdx` в два прохода:

1. Вперёд, пока текущий шаг выполнен: `questIdx++` и
   `emit("quest", { done, next, objective })` на каждый шаг.
2. Затем с конца списка назад до текущего: первый найденный (самый дальний) выполненный
   шаг — `questIdx = i + 1` и одно событие `quest`. Пропущенные промежуточные шаги
   события не получают и больше не показываются, даже если не выполнены.

Если что-то сдвинулось — ещё `emit("world", { what: "quest" })`. Второй проход нужен
потому, что шелл принимает любые команды в любом порядке: игрок может сделать шаг 5
раньше шага 1, и строгая цепочка просила бы его прочитать уже не нужный файл
(комментарий в коде). `checkQuests` зовут `cat`, `svc` для ламп, `set lamp.*`,
`remember`, `examine`, `applyEffect`, `repairDone`, `aliceAlive`. Публичный
`VoidOS.checkQuests` снаружи не вызывается.

`questObjective()` отдаёт `ot("q.<id>")` текущего шага, после конца цепочки — `q.done`
(«—»). `questWhere()` отдаёт `where` или `"door"` после конца.

### Память и осмотр

Нейкон не может открыть файл, о котором не вспомнил. `remember(key)`
([строка 1882](../../js/demo/05-void-os.js#L1882)) срабатывает один раз на ключ:
ставит `world.remembered[key]`, выполняет `MEMORIES[key]`, если он есть, излучает
`remember { key, line: ot("remember.<key>") }` (`06` показывает строку субтитром и
печатает в терминал) и зовёт `checkQuests()`.

| ключ | кто вызывает | что появляется на диске |
|---|---|---|
| `anchor` | первый осмотр `pylon1` | `/var/log/anchor.log` (`log.anchor`) |
| `core` | первый осмотр `pylon2` | `/etc/alice/lucidity.state` перестаёт быть битым, тело — текст таблички `plate.pylon2` |
| `pressure` | первый осмотр `gauge1` | ничего, только реплика |
| `vent` | первый осмотр `gauge2` | ничего, только реплика |
| `sessions` | `applyEffect({ sessions })` после `room-sessions` | `/var/log/session.log` (47 сеансов) и `notes/04-again.txt` |

`examine(id)` ([строка 1892](../../js/demo/05-void-os.js#L1892)) — ответ на `E` в
комнате. Возвращает `{ cls, lines }` или `null` для неизвестного `id`:

| `id` | условие | ответ | побочно |
|---|---|---|---|
| `pylon1`, `pylon2` | своя лампа (`lamp1`/`lamp2`) выключена | `sys`, `world.pylonDark` | — |
| | лампа горит | `out`, `plate.pylon1/2` | `examined[id]`, при первом осмотре `remember("anchor"/"core")`, `checkQuests()` |
| `gauge1`, `gauge2` | `lamp1` выключена (обе зависят от неё) | `sys`, `world.gaugeDark` | — |
| | `lamp1` горит | `out`, `plate.gauge1/2` с числом | `examined[id]`, `remember("pressure"/"vent")`, `checkQuests()` |
| `door` | `!world.lockOverridden` | `warn`, `world.doorLook` | — |
| | замок сброшен | `{ cls: "ok", lines: [] }` | `doorOpened = true`, `checkQuests()`, `emit("doorOpen")` → `06` запускает катсцену |

### Аномалии геометрии

Пять видов в `GLITCH_KINDS` ([строка 1947](../../js/demo/05-void-os.js#L1947)):

| вид | `counted` | `cause` | предел | что рисует сцена |
|---|---|---|---|---|
| `dup` | да | `leak` | 5 (`GLITCH_CAPS`) | копии двери |
| `loop` | нет | `infinite-loop` | вкл/выкл | дверь грузится быстрее и не останавливается |
| `flicker` | нет | `null-deref` | вкл/выкл | пилоны гаснут каждый в своём ритме |
| `ghost` | да | `overflow` | 4 (`GLITCH_CAPS`) | лишние опоры |
| `drift` | нет | `bad-compare` | вкл/выкл | сетка пола расходится |

`spawnGlitch(kind, taskId)` увеличивает счётчик (у `counted`) или включает флаг (у
остальных), записывает вид в `world.glitches.by[taskId]` и излучает `glitch` и
`world/glitch`. Возвращает `false`, если вид неизвестен, предел достигнут или флаг уже
стоит, — тогда `06` не печатает строку про аномалию. `clearGlitchesFor(taskId)` при
починке снимает то, что принёс этот регион: у `counted` — минус один за каждую запись, у
флагов — сброс в 0 (даже если тот же флаг поставил и другой регион). `glitchReport()` —
строки вида `  dup       x2   (leak)` для `dmesg` и консоли. Какая задача какой вид
вызывает — `TASK_GLITCH` в `06-demo.js`. Аномалии ничего не выделяют: сцена рисует уже
загруженные меши ещё раз с другой матрицей, поэтому пределы — про читаемость картинки, а
не про память (комментарий над `GLITCH_CAPS`).

### Шелл

`exec(raw)` ([строка 2418](../../js/demo/05-void-os.js#L2418)):

1. `trim`; пустая строка → `{ cls: "out", lines: [] }`, в историю не попадает.
2. `history.push(line)`, `world.lastLine = line` (её рисует монитор в комнате).
3. Разбиение по пробелам; имя команды приводится к нижнему регистру, аргументы — нет.
4. `CMDS[cmd]` → вызов; `clear`/`exit`/`look` → `{ cls: "sys", lines: [], signal: cmd }`
   (их обрабатывает `06`: очистка вывода или подъём из-за стола); иначе `+2` аномалии и
   `<cmd>: command not found` + `out.unknownCmd`.
5. `world.lastOut` — последние 4 строки ответа; `emit("exec", { line, res })`.

Ответ команды — `{ cls, lines }`, `cls` ∈ `out`/`warn`/`bad`/`sys` (помощники `ok`,
`warn`, `bad`, `sys`); `06` печатает каждую строку как `span.tl.<cls>`. Исключений
`exec` не ловит.

| команда | аргументы | что делает | побочные эффекты |
|---|---|---|---|
| `help` | — | список команд, клавиши, «начни с» | — |
| `pwd` | — | `cwd` | — |
| `ls` | `[путь] [-a]` | строки `fmtRow`: `d`/`c`/`-`, права, имя, `** CORRUPT **` | `-a` работает только после пути (`ls . -a`); `ls -a` ищет файл `-a` |
| `cd` | `[путь]` | без аргумента — `/home/neikon` | меняет `cwd` |
| `cat` | `<файл>` | тело; у битого региона — `warn` с шапкой `out.corrupt` и подсказкой `edit <путь>` | `visited[path]`, `emit("read")`, `checkQuests()` |
| `head` | `<файл>` | `cat`, первые 12 строк | те же, что у `cat` |
| `tree` | `[путь]` | дерево с `\|- ` и `` `- ``, скрытые не показывает | — |
| `find` | `<подстрока>` | все **файлы**, в полном пути которых есть подстрока (без учёта регистра), включая скрытые | — |
| `grep` | `<текст> <файл>` | строки файла с текстом, без учёта регистра | — |
| `stat` | `<путь>` | путь, тип, права, размер; у устройства — `state` из `svcState`, у битого — `health` | — |
| `svc` | `list`/`start`/`stop`/`restart` (+`halt` для `door0`) `<имя>` | таблица служб или действие, см. ниже | лампы, дверь, `+8` за `stop lamp0` |
| `set` | `<ключ> <значение…>` | `applyConfLine` | см. раздел о конфиге |
| `fsck` | `[устройство] [--quiet]` | битые узлы: регионы с `[repairable: edit …]`, остальные `[rebuilds from the others]`; чисто — приглашение запустить `recover.sh` | `world.ranFsck = true`; `--quiet` — пустой `out`/`bad` |
| `edit` | `<путь>` | не регион → `out.editNotRegion`; починен → `already clean`; иначе `opening …` | `emit("edit")` → редактор в `06` |
| `run` | `<путь>` | `recover.sh`: при `!allRepaired()` отказ, иначе `rebuilding …`; без `x` → `not executable`; иначе `segmentation fault` | `emit("recover")`; `+7` |
| `rm` | `<путь>` | устройство → `+12`, файл остаётся; неисправленный регион → `+15`, печатает `removed`, но файл **остаётся**; остальное удаляется из `kids` (каталог — целиком, без `-r`) | см. слева |
| `ps` | — | четыре процесса; `door0-loader` в `R` при `loop`; `alice_core` в `Z`, пока мертва; при `corruption > 30` — `??? [unknown]` | — |
| `dmesg` | — | `kern.log` + `geometry: …` по активным аномалиям (время случайное) + строки о сущности при `> 20`/`> 55` | — |
| `df` | — | `/dev/alice` `DEGRADED (N regions)` или `clean`, `anomaly N / 45` | — |
| `man` | `[тема]` | без темы — список тем; иначе страница из `world.manPages` | — |
| `history` | — | нумерованная `history` VoidOS | — |
| `whoami` | — | `neikon`, uid, «сеанс начат `120 + corruption·4` с назад», реплика `out.whoami*` | в `help` не указан |
| `uname` | — | строка ядра | в `help` не указан |

`svc` подробнее. `list` — по `SERVICES`: имя, `svcState`, `ot(svc.*)`. Лампы: `stop lamp0`
гасит стол и поднимает аномалии на 8; `start`/`restart` включают лампу, **любая другая**
подкоманда — выключает. `door0`: `stop`/`halt` → `halted`; `start`/`restart` → `open`,
если `allRepaired()`, иначе обратно `loop` (так кнопка «повтор» в окне «Система»
отменяет эффект `room-door`). `alice`: уже живая — `already up`, иначе отказ с
`out.aliceDead`; Элис поднимается только через `recover.sh`.

### Графический слой

Окна «Файлы», «Блокнот», «Журналы» и «Система» в `06` работают через те же узлы:

* `list(path)` — строки `{ name, path, kind: dir|dev|file, broken, taskId, hidden, meta }`
  без скрытых; `meta` — число элементов, `svcState` устройства или размер в байтах.
* `readFile(path)` — `{ path, body, readonly, broken, taskId }`; `readonly` у `r--` и у
  устройств. Ставит `visited[path]`, но не зовёт `checkQuests` и ничего не излучает.
* `writeFile(path, body)` — `write: no such file` / `write: read-only` / `saved <путь>`;
  у конфига применяет ключи; излучает `world/conf` (для конфига) и `write`.
* Кнопки «Системы» и клики по регионам зовут `exec("svc …")`, `exec("set fog.density …")`,
  `exec("edit …")` — ту же строку, что набрал бы игрок; поэтому они попадают в
  `history`, `lastLine` и проходят тот же код.

Автодополнение для поля ввода `06`: `complete(prefix)` — имена `CMDS` плюс
`clear`/`exit`/`look`; `pathComplete(prefix)` — дети каталога из части до последнего
`/` (или `cwd`), включая скрытые, без `/` на конце у каталогов.

### События

`emit(kind, data)` зовёт всех слушателей по порядку, каждого в `try/catch` (ошибка
слушателя глушится). Слушатель в проекте один — `wireVoidOs()` в
[06-demo.js:2935](../../js/demo/06-demo.js#L2935); подписывается один раз (флаг
`osWired`) до первого `boot()`. На **любое** событие он вызывает `pushWorldToScene()`
(перенос `fog`, `corruption`, `door`, `lamps`, `alice`, `glitches`, `room` в
`VoidScene.setWorld`), `Audio.setAmbientIntensity(corruption / 100)`,
`refreshDeskPanels()` и `paintMonitor()`. Дальше — по виду:

| `kind` | `data` | кто излучает | что делает `06` сверх общего |
|---|---|---|---|
| `world` | `{ what: … }` | `applyConfLine`, `svc`, `applyEffect`, `aliceAlive`, `spawnGlitch`, `clearGlitchesFor`, `checkQuests`, `writeFile`, `relocalize`, `boot` | `lamp` — звук открытия/закрытия и запись в журнал жюри; `door` — звук перехода и запись; `alice` — звук |
| `corruption` | `{ value, reason?, delta }` | `anomaly`, `repairDone` (`delta: -6`) | при `delta > 0`: звук глюка, тряска при `> 30`, призрак при `> 45` с вероятностью 0.6, запись причины, при `>= 100` — `endRun("lose")` |
| `glitch` | `{ kind, cause, level }` или `{ kind: "cleared", cause: taskId }` | `spawnGlitch`, `clearGlitchesFor` | звук, сильная тряска, запись; при `cleared` — запись `geometry :: restored` |
| `quest` | `{ done, next, objective }` | `checkQuests` | `syncQuestGuide()`, строка цели, звук, запись |
| `remember` | `{ key, line }` | `remember` | субтитр `showVoidText` и строка `ai` в терминале |
| `doorOpen` | `{}` | `examine("door")` | `playEnding()` — катсцена |
| `edit` | `{ path, taskId }` | `CMDS.edit` | `openEditor(task)` |
| `recover` | `{}` | `CMDS.run` для `recover.sh` | `runRecovery()` → `VoidOS.aliceAlive()` |
| `read` | `{ path }` | `CMDS.cat` | только общее |
| `exec` | `{ line, res }` | `exec` | только общее |
| `repair` | `{ taskId, all }` | `repairDone` | только общее |
| `write` | `{ path }` | `writeFile` | только общее |

Значения `what` у `world`: `boot`, `fog`, `lamp`, `door`, `room`, `barrier`, `quest`,
`glitch`, `sessions`, `anchors`, `interlock`, `alice`, `locale`, `conf`.
`04-void-scene.js` VoidOS не слушает и в него не пишет: сцена получает снимок мира
только через `pushWorldToScene()` в `06`.

### Смена языка

`relocalize()` ([строка 2544](../../js/demo/05-void-os.js#L2544)) переписывает тела
файлов на месте через вложенный помощник `put(path, key)`: readme, три записки,
`recover.sh`, `.bash_history`, `personality.cfg`, `alice.log`, пять устройств, конфиг
(шаблон заново, затем `syncConfFile()`), `anchor.log` и `lucidity.state` — если
соответствующее воспоминание уже есть. Пересобирает `world.manPages`, излучает
`world/locale`. Прогресс живёт вне текстов (`repaired`, `glitches`, `corruption`,
`lamps`) и не теряется. Вызывает `syncLocale()` в `06` при смене языка; до первого
`boot()` (`ROOT === null`) функция ничего не делает.

Не переписываются: `session.log`, `notes/04-again.txt`, файлы `/usr/share/man/*.1`
(команда `man` при этом уже на новом языке), заголовок `anomaly.log`, тела регионов
(`task.code` из `06`).

### Жизненный цикл

1. Загрузка файла: объявлены две таблицы, выполнено слияние, создан `VoidOS` с пустым
   `ROOT`.
2. `06 startGame(diff)` → `wireVoidOs()` (один раз за жизнь страницы) →
   `VoidOS.boot(diff, state.tasks)`: сброс полей мира, новые `gauges`, `buildFs`,
   `syncConfFile`, `emit("world", { what: "boot" })` — слушатель уже подписан и переносит
   мир в сцену. Затем `06` ещё раз зовёт `pushWorldToScene()` сам.
3. Игра: команды (`exec`), окна (`list`/`readFile`/`writeFile`), `E` в комнате
   (`examine`), редактор (`repairDone`/`repairFailed`/`spawnGlitch`/`applyEffect`).
4. `run recover.sh` → `recover` → `aliceAlive()`: Элис жива, обе опоры горят, счётчик
   аномалий в ноль. Дверь не открывается: её держит протокол шлюза до `room-override`.
5. `room-override` → `lockOverridden`, дверь `open` → `E` у двери → `doorOpen` → катсцена.
6. Повторный запуск демки — снова `boot()`; слушатель второй раз не подписывается.

## Почему так, а не иначе

- **Файловая система — это уровень, а не меню.** `/etc/void.conf` не описывает комнату,
  а задаёт её: `set fog.density` меняет туман в 3D. Очевидная альтернатива — сценарный
  промпт с маркерами задач. Шапка, оставшаяся от этого файла в конце
  `04-void-scene.js` ([строка 1723](../../js/demo/04-void-scene.js#L1723)), говорит, что
  прежняя демка и была «сценарным промптом на одиннадцать магических слов», и формулирует
  три правила замены: ФС — уровень, ничего не объявляется, ошибки физические.
- **VoidOS владеет миром, сцена только рисует.** Альтернатива — дать сцене своё
  состояние ламп и двери. Тогда свет на полу и вывод `svc list` могли бы разойтись; при
  одном владельце это одно и то же число (`ARCHITECTURE.md`, «Три слоя игры»). Поэтому
  файл не трогает ни DOM, ни WebGL и общается только через `onChange`.
- **Проверка кода шаблонами, а не настоящим компилятором.** В коде это названо прямо:
  «THE FAKE COMPILER» в `06-demo.js`. Причины выведены из ограничений проекта, в коде не
  записаны: сборка одна, офлайн, открывается с `file://` и с флешки, телефоны жюри
  сидят на слабом интернете — компиляторы C/C++ и интерпретатор Python для браузера
  весят десятки мегабайт и всё равно не нужны. По коду видно и второе: регионы — не
  законченные программы. Они зовут `room.pressure()`, `interlock.release()`,
  `lock.push()` — API комнаты, которого нет ни в одной стандартной библиотеке; настоящему
  компилятору пришлось бы подсовывать имитацию комнаты, а проверить нужно смысл
  («какая ветка выполняется при низком давлении»), который шаблонный разбор достаёт
  прямо.
- **Число живёт только на стене.** Предел продувки генерируется в `boot()` и не
  пишется ни в один файл; задача собирает проверку из `world.gauges` в момент нажатия ▶.
  Альтернатива — константа в таблице задач — делала бы ответ видимым из-за стола и
  одинаковым у всех. Комментарий: «cannot be solved, guessed or memorised from the
  chair». `pressure` всегда ниже `vent`, чтобы условие проходило, как только предел
  переписан верно; десятая у предела не ноль, чтобы проверка не превращалась в спор
  `3.0` против `3`.
- **Приборы и опоры молчат без света.** Альтернатива — читать табличку в любой момент.
  Комментарий: «an unpowered dial in an unlit room has nothing to tell anyone». Так
  первая задача (`room-lamp`) становится условием для двух следующих походов.
- **Образ собирается заново на каждом `boot(diff, tasks)`.** Регионы берутся из
  лестницы выбранной сложности (`.py`/`.cpp`/`.c`), тексты — из `ot()` на текущем
  языке; комментарий у цикла регионов: «come straight from the deck's existing task
  table, so their hints stay localised». Повтор демки обязан начинаться с чистого мира,
  а патчить старое дерево пришлось бы для каждого поля. Сразу после сборки —
  `syncConfFile()`, чтобы повтор не оставил `cat /etc/void.conf` расходящимся с комнатой
  (комментарий в `boot()`).
- **Память кладёт файлы на диск.** `anchor.log`, `session.log`, `04-again.txt` не
  существуют, пока Нейкон не вспомнит. Альтернатива — все файлы сразу — давала бы
  прочитать журнал якорей, не вставая. Комментарий: «Neikon cannot be handed a file he
  does not know exists».
- **Поворот сюжета — файл, а не реплика.** 47 сеансов лежат в `session.log`, который
  можно перечитать и пересчитать. Комментарий: иначе «the reveal is just a line of
  dialogue that scrolls away».
- **Цепочка целей прыгает вперёд.** Шелл принимает команды в любом порядке; строгая
  цепочка просила бы прочитать файл, который игрок уже прочитал (комментарий в
  `checkQuests`).
- **`room-override` не входит в `allRepaired()`.** Сброс замка идёт после возвращения
  Элис; если бы `recover.sh` ждал и его, цепочка встала бы в дедлок (комментарий над
  `NOT_HER_IMAGE`).
- **Аномалии ничего не выделяют, а починка их снимает.** Пределы `dup ≤ 5`,
  `ghost ≤ 4` — для читаемости картинки: роста памяти нет в принципе. Обратимость —
  чтобы последствия ощущались системой, а не наказанием (комментарии над `GLITCH_CAPS`
  и `clearGlitchesFor`).
- **Эффект починки применяет ОС.** Клик в панели и ручной запуск того же скрипта
  приходят в одно состояние (комментарий над `applyEffect`). По той же причине окна
  «Система» и «Файлы» зовут `exec("svc start lamp1")`, а не пишут в `world` сами.
- **Две таблицы текстов и слияние в этом же файле.** Сюжет отделён от вывода команд,
  чтобы его можно было переписать, не трогая машину (комментарий над
  `OS_STORY_BY_LOCALE`). Слияние стоит в том же файле, что и обе таблицы, — «no
  cross-script ordering hazard». Цена — перекрытие четырёх общих ключей.
- **Пропуск перевода виден.** `ot()` падает на русский, потом на сам ключ: «a missing
  translation degrades to something visible rather than to an empty file».
- **Словарь машины не переводится.** Команды, пути и номера устройств игрок набирает
  буквально, и на любом компьютере они выглядят так же (комментарий «OS TEXT» в конце
  `04-void-scene.js`, `ARCHITECTURE.md`, «Локализация»).
- **Смена языка — переписать тела на месте.** Прогресс, повреждения и журнал аномалий
  живут вне текстов, поэтому `relocalize()` ничего не теряет (комментарий в коде).
  Пересобирать образ было бы нельзя: пропали бы удалённые и вспомненные файлы.
- **Туман 0.11 на старте.** Яркость — `exp(-dist · density)`: при 0.11 лампа стола на
  7.8 м читается на 42 %, дверь на 23.6 м — на 7 %. Задача тумана опускает плотность до
  0.02, и арифметика в скрипте та же: `0.11 − 3 × 0.03` (комментарий в `boot()`).
- **`settingsState` — под `typeof` и только в момент вызова.** `11-settings.js`
  грузится позже `05`; обращение на верхнем уровне упало бы в temporal dead zone.
- **Каждый слушатель — в своём `try/catch`.** По коду видно: ошибка в обработчике `06`
  (звук, DOM) не прерывает `emit` и не оставляет мир полуизменённым — запись в `world`
  к этому моменту уже сделана.

## Связи

Берёт из общей области:

| имя | файл-владелец | где |
|---|---|---|
| `settingsState` | `js/core/11-settings.js` | `ot()`, только `settingsState.locale`, под `typeof` |

Больше ничего: массив задач приходит аргументом `boot(diff, tasks)` из `06-demo.js`
(`state.tasks` = `TASKS_BY_DIFF[diff]`).

Отдаёт:

| имя | кто пользуется |
|---|---|
| `OS_TEXT_BY_LOCALE` | только сам файл (`ot()`); в консоли — для проверки итогового текста |
| `OS_STORY_BY_LOCALE` | только сам файл (слияние) |
| `VoidOS` | `js/demo/06-demo.js` — единственный потребитель в коде; `04-void-scene.js` упоминает его только в комментариях |

Методы `VoidOS`, которые зовёт `06-demo.js`: `boot` ([1659](../../js/demo/06-demo.js#L1659)),
`exec` ([2475](../../js/demo/06-demo.js#L2475), [2558](../../js/demo/06-demo.js#L2558),
[2574](../../js/demo/06-demo.js#L2574), [2594](../../js/demo/06-demo.js#L2594),
[2613](../../js/demo/06-demo.js#L2613), [2716](../../js/demo/06-demo.js#L2716)),
`examine` ([1895](../../js/demo/06-demo.js#L1895)), `questWhere`
([1924](../../js/demo/06-demo.js#L1924)), `questObjective`
([1934](../../js/demo/06-demo.js#L1934), [2858](../../js/demo/06-demo.js#L2858)),
`list` ([2444](../../js/demo/06-demo.js#L2444)), `readFile`
([2495](../../js/demo/06-demo.js#L2495), [2638](../../js/demo/06-demo.js#L2638)),
`writeFile` ([2523](../../js/demo/06-demo.js#L2523)), `cwd`
([2701](../../js/demo/06-demo.js#L2701), [2728](../../js/demo/06-demo.js#L2728),
[2889](../../js/demo/06-demo.js#L2889)), `complete`/`pathComplete`
([2755](../../js/demo/06-demo.js#L2755)), `allRepaired`
([2862](../../js/demo/06-demo.js#L2862)), `onChange`
([2938](../../js/demo/06-demo.js#L2938)), `aliceAlive`
([3023](../../js/demo/06-demo.js#L3023)), `repairFailed`/`spawnGlitch`
([3314](../../js/demo/06-demo.js#L3314)), `repairDone`/`applyEffect`
([3336](../../js/demo/06-demo.js#L3336)), `relocalize`
([3563](../../js/demo/06-demo.js#L3563)) и `world` — напрямую в десятке мест
(`gauges` в `interlockCheck`, счётчики стола, монитор, окна, отчёт жюри).

Никто снаружи не зовёт `anomaly`, `remember`, `clearGlitchesFor`, `glitchReport`,
`glitchCaps`, `currentQuest`, `checkQuests`: они открыты для консоли браузера
(`GAME.md` советует `VoidOS.spawnGlitch('dup')`, `VoidOS.glitchReport()`).

## Константы и состояние

### Уровень файла

| имя | значение/тип | смысл | кто пишет / кто читает |
|---|---|---|---|
| `OS_TEXT_BY_LOCALE` | `{ ru, en, tj, tj_col }` по 52 ключа, после слияния 84 | машинные тексты | пишет слияние на загрузке / `ot()` |
| `OS_STORY_BY_LOCALE` | `{ ru, en, tj, tj_col }` по 36 ключей | сюжетные тексты | никто / слияние |
| `VoidOS` | объект (результат IIFE) | публичный API ОС | создаётся один раз / `06-demo.js`, консоль |

### Уровень IIFE `VoidOS`

| имя | значение/тип | смысл | кто пишет / кто читает |
|---|---|---|---|
| `world` | объект | состояние комнаты, поля ниже | функции VoidOS / все, включая `06` через `VoidOS.world` |
| `listeners` | `Array<fn>` | подписчики `onChange` | `onChange` / `emit` |
| `ROOT` | узел-каталог или `null` | корень образа | `buildFs` / `lookup`, `find`, `fsck`, `relocalize` |
| `cwd` | строка, `"/home/neikon"` | текущий каталог шелла | `buildFs`, `cd` / `norm`, `ls`, `tree`, `pwd`, `pathComplete`, `VoidOS.cwd()` |
| `history` | `Array<string>` | все непустые строки `exec`, включая сгенерированные окнами | `exec`, `buildFs` (сброс) / `CMDS.history` |
| `NOT_HER_IMAGE` | `{ "room-override": true }` | задачи, не входящие в образ Элис | — / `allRepaired` |
| `QUESTS` | массив из 15 `{ id, where, done }` | цепочка целей | — / `checkQuests`, `currentQuest`, `questObjective`, `questWhere` |
| `MEMORIES` | `{ anchor, core, sessions }` → функции | что воспоминание кладёт на диск | — / `remember` |
| `GLITCH_CAPS` | `{ dup: 5, ghost: 4 }` | пределы счётных аномалий | — / `spawnGlitch`; наружу как `VoidOS.glitchCaps` |
| `GLITCH_KINDS` | 5 видов `{ counted, cause }` | словарь аномалий | — / `spawnGlitch`, `clearGlitchesFor`, `glitchReport` |
| `SERVICES` | `lamp0..2`, `door0`, `alice` → `{ key, world }` | службы для `svc list`; поле `world` кодом не читается | — / `CMDS.svc` |
| `CMDS` | `{ имя: fn(args) }`, 23 команды | шелл | заполняется при создании IIFE / `exec`, `complete` |

### Поля `world`

| поле | старт | смысл | пишут | читают |
|---|---|---|---|---|
| `fog` | `0.11` | плотность тумана | `applyConfLine`, `applyEffect`, `boot` | `syncConfFile`; `06` → сцена, ползунок «Системы» |
| `lamps` | `{ lamp0: true, lamp1: false, lamp2: false }` | лампы-опоры | `applyConfLine`, `svc`, `applyEffect`, `aliceAlive`, `boot` | `svcState`, `examine`, `syncConfFile`; `06` → сцена, `syncQuestGuide` |
| `door` | `"loop"` | `loop`/`halted`/`open`; `set` пропускает любое слово | `applyConfLine`, `svc`, `applyEffect`, `boot` | `svcState`, `ps`, `syncConfFile`; `06` → сцена, «Система» |
| `corruption` | `0` | счётчик аномалий 0…100 | `anomaly`, `repairDone`, `aliceAlive`, `boot` | `ps`, `dmesg`, `df`, `whoami`; `06` — звук, тряска, призраки, проигрыш, монитор, счётчики |
| `aliceState` | `"dead"` | `dead`/`alive`; `partial` из комментария не ставится нигде | `aliceAlive`, `boot` | `svcState`, `svc alice`, `ps`, `whoami`, шаг `recover`; `06` → сцена, окно ALICE |
| `repaired` | `{}` | `taskId → true` | `repairDone`, `boot` | `allRepaired`, `QUESTS`, `edit`, `rm`, `df`; `06` — счётчики, «Система», отчёт |
| `visited` | `{}` | прочитанные пути | `cat`, `readFile`, `boot` | `QUESTS`; `06 deskNudge` |
| `lastLine` | `""` | последняя команда | `exec`, `boot` | `06 paintMonitor` |
| `lastOut` | `[]` | до 4 последних строк ответа | `exec`, `boot` | `06 paintMonitor` |
| `questIdx` | `0` | номер текущего шага цепочки | `checkQuests`, `boot` | `currentQuest`, `questObjective`, `questWhere` |
| `examined` | `{}` | осмотренные в комнате объекты | `examine`, `boot` | `QUESTS`, `examine` |
| `remembered` | `{}` | вспомненные ключи | `remember`, `boot` | `remember`, `relocalize` |
| `ranFsck` | `false` | запускался ли `fsck` | `fsck`, `boot` | никто |
| `doorOpened` | `false` | игрок открыл дверь | `examine`, `boot` | шаг `door` |
| `anchorsBound` | `false` | решена `room-anchors` | `applyEffect`, `boot` | никто |
| `glitches` | `{ dup: 0, loop: 0, flicker: 0, ghost: 0, drift: 0, by: {} }` | аномалии геометрии; `by` — `taskId → [виды]` | `spawnGlitch`, `clearGlitchesFor`, `boot` | `glitchReport`; `06` → сцена |
| `room` | `{ w: 16, d: 26, h: 5, barrier: 4 }` | размеры комнаты и панели перегородки | `applyConfLine`, `applyEffect`, `boot` | `syncConfFile`; `06` → сцена |
| `tasks` | (нет в литерале) | массив задач сложности | `boot` | `allRepaired`, `df`; `06` «Система» |
| `gauges` | (нет в литерале) | `{ vent, pressure }`, новые на каждый запуск | `boot` | `examine`; `06 interlockCheck` |
| `interlock` | (нет в литерале) | `"held"`/`"released"` | `boot`, `applyEffect` | никто |
| `lockOverridden` | (нет в литерале) | протокол шлюза сброшен | `boot`, `applyEffect` | `examine`, шаг `override` |
| `sessionsRestored` | (нет в литерале) | журнал сеансов восстановлен | `applyEffect` | никто; `boot` не сбрасывает |
| `manPages` | (нет в литерале) | `{ тема: текст }` | `buildFs`, `relocalize` | `CMDS.man` |
| `diff` | (нет в литерале) | сложность (`easy`/`medium`/`hard`) | `buildFs` | никто |

## Функции

### Уровень файла

#### слияние таблиц (анонимная функция в `forEach`) → ничего
[05-void-os.js:1460](../../js/demo/05-void-os.js#L1460). Для каждой локали
`OS_STORY_BY_LOCALE` делает `Object.assign` в одноимённую локаль `OS_TEXT_BY_LOCALE`,
если та существует. Выполняется один раз при загрузке. Локаль, которой нет в машинной
таблице, молча пропускается.

### Язык и события

#### `ot(key)` → строка
[05-void-os.js:1471](../../js/demo/05-void-os.js#L1471). Текст на языке
`settingsState.locale` с откатом на `ru`, потом на сам ключ. Читает `settingsState` в
момент вызова. Зовут почти все функции файла.

#### `emit(kind, data)` → ничего
[05-void-os.js:1507](../../js/demo/05-void-os.js#L1507). Вызывает каждого слушателя с
`(kind, data || {})`, исключения глушит. Синхронно: к возврату из `emit` слушатели уже
отработали.

#### `onChange(fn)` → ничего
[05-void-os.js:1512](../../js/demo/05-void-os.js#L1512). Добавляет слушателя.
Отписки нет; защита от двойной подписки — на стороне `06` (`osWired`).

### Мини-ФС

#### `dir(kids, opts)` → узел-каталог
[05-void-os.js:1517](../../js/demo/05-void-os.js#L1517). `{ t: "d", kids }` плюс поля
`opts`.

#### `file(body, opts)` → узел-файл
[05-void-os.js:1520](../../js/demo/05-void-os.js#L1520). `{ t: "f", body, mode: "rw-" }`
плюс `opts` (они перекрывают `mode`).

#### `buildFs(diff, tasks)` → корень
[05-void-os.js:1528](../../js/demo/05-void-os.js#L1528). Собирает образ (дерево — в
разделе о ФС): локальный `manPages` из шести `ot("man.*")`, локальный `fs` — корень,
затем для каждой задачи создаёт недостающие каталоги по `task.file` и кладёт файл
`{ body: task.code, broken: true, taskId: task.id }`. Ставит `ROOT`, сбрасывает
`cwd` в `/home/neikon` и `history`, пишет `world.manPages` и `world.diff`. Зовёт только
`boot`. Сломать можно, передав задачу без `file` (`replace` на `undefined` упадёт) или с
путём, проходящим через существующий файл (`node.kids` у файла нет).

### Пути

#### `norm(p)` → абсолютный путь
[05-void-os.js:1619](../../js/demo/05-void-os.js#L1619). Относительный путь — от `cwd`;
`.` и пустые сегменты выбрасываются, `..` снимает сегмент. `~` — обычное имя.

#### `lookup(p)` → `{ node, path }` или `null`
[05-void-os.js:1629](../../js/demo/05-void-os.js#L1629). Спуск по `kids` от `ROOT`. До
первого `boot()` (`ROOT === null`) возвращает `{ node: null, path: "/" }` для `"/"` и
`null` для остального.

#### `parentOf(p)` → `{ parent, base, path }` или `null`
[05-void-os.js:1640](../../js/demo/05-void-os.js#L1640). Родительский каталог и имя.
Зовёт только `CMDS.rm`.

### Аномалии и запись в мир

#### `anomaly(amount, reason)` → новое значение `corruption`
[05-void-os.js:1649](../../js/demo/05-void-os.js#L1649). Прибавляет с зажимом 0…100,
пишет строку в `/var/log/anomaly.log` (если файл есть и `reason` задан), излучает
`corruption`. Заголовок журнала заменяется на короткий, только если тело всё ещё равно
`ot("log.anomaly.armed")` на текущем языке. Наружу — `VoidOS.anomaly`.

#### `applyConfLine(key, value)` → строка-ответ
[05-void-os.js:1661](../../js/demo/05-void-os.js#L1661). Применяет один ключ конфига к
`world` (таблица ключей — выше) и излучает `world`. Конфиг-файл сама не трогает. Зовут
`CMDS.set` и `writeFile`. Ответ на английском (кроме русского хвоста у `room.barrier 0`);
`CMDS.set` по словам `refused|unknown|wants|read-only` решает, печатать ли его как `warn`.

#### `syncConfFile()` → ничего
[05-void-os.js:1708](../../js/demo/05-void-os.js#L1708). Переписывает восемь значений в
теле `/etc/void.conf` из `world`. Регулярки требуют формата `ключ = значение`; если игрок
переписал строку иначе (например, `fog.density: 0.05`), она перестанет обновляться.

#### `allRepaired()` → `boolean`
[05-void-os.js:1730](../../js/demo/05-void-os.js#L1730). Все задачи из `world.tasks`,
кроме `NOT_HER_IMAGE`, есть в `world.repaired`, и задач больше нуля. Решает: можно ли
`recover.sh`, `svc start door0` → `open`, `set door.door0 open`, оживают ли `initrd.img` и
`lucidity.state`. Наружу — `VoidOS.allRepaired` (зовёт `06 deskNudge`).

### Цепочка целей

#### `QUESTS[i].done()` → истинность
[05-void-os.js:1747](../../js/demo/05-void-os.js#L1747). Пятнадцать функций без
аргументов, условия — в таблице цепочки. Шаги `wake`, `anchor`, `seen` возвращают
`undefined`, пока путь не прочитан, — для `while`/`if` это ложь.

#### `currentQuest()` → элемент `QUESTS`
[05-void-os.js:1805](../../js/demo/05-void-os.js#L1805). Шаг по `questIdx`; после конца
цепочки — последний (`door`).

#### `questObjective()` → строка
[05-void-os.js:1808](../../js/demo/05-void-os.js#L1808). `ot("q.<id>")` или `q.done`.
Зовут `checkQuests` (в данные события) и `06` (`syncQuestGuide`, `deskNudge`).

#### `checkQuests()` → `boolean` (сдвинулась ли цепочка)
[05-void-os.js:1815](../../js/demo/05-void-os.js#L1815). Проход вперёд и прыжок на
самый дальний выполненный шаг; события `quest` и `world/quest`. Алгоритм — выше.

### Память и осмотр

#### `MEMORIES.anchor()` → ничего
[05-void-os.js:1852](../../js/demo/05-void-os.js#L1852). Кладёт `/var/log/anchor.log`
(`r--`, `ot("log.anchor")`), если его ещё нет и `/var/log` существует.

#### `MEMORIES.core()` → ничего
[05-void-os.js:1858](../../js/demo/05-void-os.js#L1858). Снимает `broken` с
`/etc/alice/lucidity.state` и пишет туда текст таблички второй опоры
(`ot("plate.pylon2")`).

#### `MEMORIES.sessions()` → ничего
[05-void-os.js:1870](../../js/demo/05-void-os.js#L1870). Кладёт `/var/log/session.log`
(`ot("log.sessions")`) и `/home/neikon/notes/04-again.txt` (`ot("note.again")`), каждый —
если его ещё нет.

#### `remember(key)` → `boolean` (вспомнил впервые)
[05-void-os.js:1882](../../js/demo/05-void-os.js#L1882). Один раз на ключ: флаг,
`MEMORIES[key]`, событие `remember`, `checkQuests()`. Зовут `examine` и `applyEffect`;
наружу — `VoidOS.remember`.

#### `examine(id)` → `{ cls, lines }` или `null`
[05-void-os.js:1892](../../js/demo/05-void-os.js#L1892). Ответ на `E` у опоры, прибора
или двери (таблица — выше). Зовёт `06 onVoidExamine`. Для двери после сброса замка
возвращает класс `ok`, которого нет среди классов шелла; `06` его не печатает, потому что
`lines` пустой.

### Аномалии геометрии

#### `spawnGlitch(kind, taskId)` → `boolean`
[05-void-os.js:1965](../../js/demo/05-void-os.js#L1965). Добавляет аномалию с учётом
предела (`GLITCH_CAPS[kind] || 3` — запасное 3 не используется, оба счётных вида имеют
предел), запоминает виновника в `glitches.by`, излучает `glitch` и `world/glitch`. Зовёт
`06 onTaskFailed`; доступна из консоли.

#### `clearGlitchesFor(taskId)` → число снятых записей
[05-void-os.js:1986](../../js/demo/05-void-os.js#L1986). Снимает аномалии региона;
события — только если было что снимать. Зовёт `repairDone`.

#### `glitchReport()` → `Array<string>`
[05-void-os.js:2004](../../js/demo/05-void-os.js#L2004). Строки по ненулевым видам в
порядке `GLITCH_KINDS`. Зовёт `CMDS.dmesg`; консоль.

### Службы и вывод

#### `svcState(name)` → `"UP"`/`"DOWN"`/`"LOOPING"`/`"OPEN"`/`"HALTED"`/`"DEAD"`/`"?"`
[05-void-os.js:2022](../../js/demo/05-void-os.js#L2022). Состояние службы из `world`.
Любое значение двери, кроме `loop` и `open`, читается как `HALTED`; `null` (`/dev/null`)
— `?`. Зовут `svc list`, `stat`, `list()`.

#### `ok(lines)`, `warn(lines)`, `bad(lines)`, `sys(lines)` → `{ cls, lines }`
[05-void-os.js:2031](../../js/demo/05-void-os.js#L2031). Обёртки ответа с классом
`out`/`warn`/`bad`/`sys`; `[].concat` принимает строку или массив.

### Команды (`CMDS`)

Все — `function (args)` → `{ cls, lines }`; `args` — слова после имени команды.

#### `CMDS.help()`
[05-void-os.js:2039](../../js/demo/05-void-os.js#L2039). Список команд (английские
строки в коде) плюс `help.look`, `help.exit`, `help.hotkeys`, `help.start`. `rm`,
`whoami`, `uname` в списке нет.

#### `CMDS.pwd()`
[05-void-os.js:2060](../../js/demo/05-void-os.js#L2060). `cwd`.

#### `CMDS.ls(args)`
[05-void-os.js:2062](../../js/demo/05-void-os.js#L2062). Цель — `args[0]` или `cwd`;
файл — одна строка, каталог — отсортированные строки `fmtRow`, пустой — `(empty)`.
`-a` ищется среди всех аргументов, но первый аргумент всегда считается путём.

#### `fmtRow(name, node)` → строка
[05-void-os.js:2075](../../js/demo/05-void-os.js#L2075). `d`/`c`/`-` + права + имя
(`/` у каталога) + `  ** CORRUPT **`. Зовёт только `ls`.

#### `CMDS.cd(args)`
[05-void-os.js:2082](../../js/demo/05-void-os.js#L2082). Меняет `cwd`; ошибки
`no such file or directory` / `not a directory`. Приглашение перерисовывает `06`.

#### `CMDS.cat(args)`
[05-void-os.js:2091](../../js/demo/05-void-os.js#L2091). Тело файла; отмечает
`visited`, излучает `read`, зовёт `checkQuests()` — так продвигаются шаги `wake`,
`anchor`, `seen`. Битый регион — `warn` с `out.corrupt` и `out.repairWith`. Тело региона
— всегда исходный `task.code`, в том числе после починки.

#### `CMDS.head(args)`
[05-void-os.js:2105](../../js/demo/05-void-os.js#L2105). `cat` и первые 12 строк при
успехе; ошибки `cat` проходят как есть.

#### `CMDS.tree(args)` и вложенная `walk(node, prefix, name)`
[05-void-os.js:2111](../../js/demo/05-void-os.js#L2111). Рекурсивный обход с
отступом в три пробела; скрытые узлы пропускает; битые файлы помечает.

#### `CMDS.find(args)` и вложенная `walk(node, path)`
[05-void-os.js:2126](../../js/demo/05-void-os.js#L2126). Обходит всё дерево от `ROOT`,
собирает файлы, чей путь содержит подстроку без учёта регистра. Каталоги в выдачу не
попадают, скрытые — попадают.

#### `CMDS.grep(args)`
[05-void-os.js:2142](../../js/demo/05-void-os.js#L2142). `grep <текст> <файл>`:
строки с подстрокой без учёта регистра; ищет одно слово (первый аргумент), фраз с
пробелами нет.

#### `CMDS.stat(args)`
[05-void-os.js:2153](../../js/demo/05-void-os.js#L2153). Путь, тип, права, размер
(байты тела или число элементов), `state` устройства, `health` битого узла.

#### `CMDS.svc(args)`
[05-void-os.js:2169](../../js/demo/05-void-os.js#L2169). Без аргументов — `list`.
Ветки ламп, двери и Элис — в разделе «Шелл». После изменения ламп и двери —
`syncConfFile()` и `world`-событие; после ламп ещё `checkQuests()`.

#### `CMDS.set(args)`
[05-void-os.js:2224](../../js/demo/05-void-os.js#L2224). Нужно минимум два аргумента;
`applyConfLine(args[0], остальное через пробел)`, затем `syncConfFile()`.

#### `CMDS.fsck(args)` и вложенная `walk(node, path)`
[05-void-os.js:2231](../../js/demo/05-void-os.js#L2231). Собирает все узлы с `broken`.
`--quiet` — пустой ответ, `bad` при повреждениях (так написан `recover.sh`, но сам
скрипт текстом не исполняется). Аргумент, кроме `/dev/alice`/`alice`, проверяется
только на существование; отчёт всегда про `/dev/alice`. Ставит `world.ranFsck`.

#### `CMDS.edit(args)`
[05-void-os.js:2261](../../js/demo/05-void-os.js#L2261). Открывает регион: событие
`edit`, остальное делает `06`. Порядок регионов не проверяет — любой неисправленный
регион можно открыть в любой момент.

#### `CMDS.run(args)`
[05-void-os.js:2271](../../js/demo/05-void-os.js#L2271). `recover.sh` (по `script`,
не по имени) → проверка `allRepaired()` → событие `recover`. Иначе — проверка флага `x` и
`+7` с `segmentation fault`.

#### `CMDS.rm(args)`
[05-void-os.js:2290](../../js/demo/05-void-os.js#L2290). Устройство и неисправленный
регион не удаляются, но стоят аномалий (12 и 15). Всё остальное, включая каталоги
целиком и починенные регионы, удаляется через `parentOf`.

#### `CMDS.ps()`
[05-void-os.js:2307](../../js/demo/05-void-os.js#L2307). Таблица процессов из `world`.

#### `CMDS.dmesg()`
[05-void-os.js:2319](../../js/demo/05-void-os.js#L2319). `kern.log` + строки
`geometry:` со случайной меткой времени 300…399 + строки о сущности. Без проверки на
существование `kern.log`.

#### `CMDS.df()`
[05-void-os.js:2330](../../js/demo/05-void-os.js#L2330). Число неисправленных задач
(включая `room-override`) и счётчик аномалий.

#### `CMDS.man(args)`
[05-void-os.js:2340](../../js/demo/05-void-os.js#L2340). Страница из `world.manPages`
(не из файлов `/usr/share/man`).

#### `CMDS.history()`
[05-void-os.js:2348](../../js/demo/05-void-os.js#L2348). Нумерованная `history` или
`(nothing yet)`.

#### `CMDS.whoami()`
[05-void-os.js:2354](../../js/demo/05-void-os.js#L2354). Четыре строки; последняя —
`out.whoamiAlice` или `out.whoamiAlone`.

#### `CMDS.uname()`
[05-void-os.js:2363](../../js/demo/05-void-os.js#L2363). Строка
`void 6.9.0-alice … crystalfs x86_64`.

### Публичный объект `VoidOS`

#### `boot(diff, tasks)` → ничего
[05-void-os.js:2368](../../js/demo/05-void-os.js#L2368). Сбрасывает мир (все поля, кроме
`sessionsRestored`), генерирует `gauges`, ставит `interlock = "held"`,
`lockOverridden = false`, комнату 16×26×5 с 4 панелями, вызывает `buildFs`,
`syncConfFile` и излучает `world/boot`. Зовёт `06 startGame`.

#### `exec(raw)` → `{ cls, lines, signal? }`
[05-void-os.js:2418](../../js/demo/05-void-os.js#L2418). Разбор и выполнение строки
шелла (шаги — в разделе «Шелл»). Зовут поле ввода стола и окна `06`.

#### `applyEffect(effect)` → ничего
[05-void-os.js:2442](../../js/demo/05-void-os.js#L2442). Применяет поля эффекта задачи в
порядке `lamp` → `barrier` → `door` → `fog` → `sessions` → `anchors` → `interlock` →
`unlocked`, каждое со своим `world`-событием, в конце `checkQuests()`. `null` — ничего.
Значения не проверяет и не зажимает. Зовёт `06 onTaskSolved`.

#### `repairDone(taskId, path)` → ничего
[05-void-os.js:2493](../../js/demo/05-void-os.js#L2493). `repaired[taskId] = true`,
`clearGlitchesFor`, снимает `broken` с файла по `path`; если теперь `allRepaired()` —
ещё с `initrd.img` и `lucidity.state`. Счётчик аномалий −6 (не ниже 0),
`checkQuests()`, события `repair` и `corruption` (`delta: -6`). Тело файла не меняет.
Зовёт `06 onTaskSolved`, до `applyEffect`.

#### `repairFailed(taskId)` → ничего
[05-void-os.js:2509](../../js/demo/05-void-os.js#L2509). `anomaly(9, "failed repair on
region <id>")`. Зовёт `06 onTaskFailed`.

#### `aliceAlive()` → ничего
[05-void-os.js:2512](../../js/demo/05-void-os.js#L2512). `aliceState = "alive"`, обе
дальние лампы включены, `corruption = 0` (без события `corruption`), `syncConfFile`,
`checkQuests`, `world/alice`. Дверь не трогает. Зовёт `06 runRecovery`.

#### `anomaly`, `allRepaired`, `examine`, `remember`, `spawnGlitch`, `clearGlitchesFor`, `glitchReport`, `questObjective`, `currentQuest`, `checkQuests`
Внутренние функции, отданные наружу как есть (описаны выше). `glitchCaps` — ссылка на
`GLITCH_CAPS`.

#### `questWhere()` → `"terminal"`/`"pylon1"`/`"pylon2"`/`"gauge2"`/`"door"`
[05-void-os.js:2536](../../js/demo/05-void-os.js#L2536). `where` текущего шага или
`"door"` после конца цепочки. Зовёт `06 syncQuestGuide` → `VoidScene.setGuide`.

#### `relocalize()` → ничего
[05-void-os.js:2544](../../js/demo/05-void-os.js#L2544). Переписывает тела
переводимых файлов на текущий язык через вложенный `put(path, key)` (пишет
`ot(key)`, если путь существует и это файл), затем `syncConfFile`, новые
`world.manPages`, `world/locale`. Зовёт `06 syncLocale`.

#### `list(path)` → массив строк каталога или `null`
[05-void-os.js:2574](../../js/demo/05-void-os.js#L2574). Для окна «Файлы». `null`, если
путь не каталог.

#### `readFile(path)` → `{ path, body, readonly, broken, taskId }` или `null`
[05-void-os.js:2593](../../js/demo/05-void-os.js#L2593). Для «Блокнота» и «Журналов».
Отмечает `visited`, событий нет.

#### `writeFile(path, body)` → строка-статус
[05-void-os.js:2605](../../js/demo/05-void-os.js#L2605). Для кнопки «Сохранить»
«Блокнота». Пишет тело; у `/etc/void.conf` прогоняет каждую строку
`/^\s*([a-z0-9.]+)\s*=\s*([^#\s]+)/i` через `applyConfLine` и излучает `world/conf`;
всегда излучает `write`.

#### `cwd()` → строка
[05-void-os.js:2621](../../js/demo/05-void-os.js#L2621). Текущий каталог для
приглашения, эха команды и монитора `06`.

#### `world`, `onChange`
Ссылка на объект мира и функция подписки (описаны выше).

#### `complete(prefix)` → `Array<string>`
[05-void-os.js:2624](../../js/demo/05-void-os.js#L2624). Имена команд с префиксом,
включая `rm`, `whoami`, `uname`, `clear`, `exit`, `look`.

#### `pathComplete(prefix)` → `Array<string>`
[05-void-os.js:2628](../../js/demo/05-void-os.js#L2628). Имена в каталоге префикса,
начинающиеся с его последнего сегмента, с той же частью пути впереди.

## DOM, классы, события, хранилище

- DOM, CSS-классы, `localStorage`, `window.*`, сеть, таймеры — нет. Файл чистый: только
  данные, состояние и события `onChange` (список видов — в разделе «События»).
- Глобалы, которые появляются: `OS_TEXT_BY_LOCALE`, `OS_STORY_BY_LOCALE`, `VoidOS` — в
  общей лексической области, не свойства `window`.
- Классы ответа `out`/`warn`/`bad`/`sys` (и `ok` у двери) — это имена, которые `06`
  подставляет в `span.tl.<cls>`; стили — в [styles.md](styles.md).
- Случайность: `Math.random` в `boot()` (числа на приборах) и в `dmesg` (метки времени
  строк `geometry:`).

## Подводные камни

- **Правка общего ключа в машинной таблице не видна.** `readme`, `note.room`,
  `note.door`, `note.alice` перекрывает `OS_STORY_BY_LOCALE`. Новый ключ, добавленный в
  обе таблицы, ведёт себя так же.
- **Новый ключ — во все четыре локали.** Пропуск не ломает игру (откат на русский), но
  игрок на `en` получит русскую строку.
- **Поле мира без проброса не дойдёт до сцены.** Сцена видит только то, что перечислено
  в `pushWorldToScene()` в `06`. Новое поле `world`, влияющее на 3D, добавляют туда же.
- **Сохранение `/etc/void.conf` в «Блокноте» стоит +6 аномалий.** `writeFile` прогоняет
  через `applyConfLine` каждую строку, включая неизменённую `anomaly.threshold = 45`, а
  этот ключ всегда поднимает счётчик. Заодно срабатывают события и звуки всех трёх ламп и
  двери.
- **`dmesg` падает после `rm /var/log/kern.log`.** `lookup` вернёт `null`, а
  `hit.node.body` читается без проверки; `exec` исключений не ловит, `06 deskSubmit`
  тоже — строка ввода очищена, вывода нет, в консоли `TypeError`.
- **`ls -a` не работает.** Первый аргумент всегда путь; `-a` срабатывает только как
  `ls <путь> -a`. `~` в путях не поддерживается, хотя приглашение показывает `~`.
- **`svc <что угодно> lampN` выключает лампу.** Включают только `start`/`restart`.
- **`set door.door0` принимает любое слово.** `svcState` покажет `HALTED`, сцена
  нарисует незнакомое значение как цикл.
- **`rm` региона врёт.** Неисправленный регион остаётся на диске, хотя ответ —
  `removed` (плюс 15 аномалий). Починенный регион удаляется по-настоящему.
- **`+7` за неизвестный бинарник недостижим.** Флаг `x` в образе есть только у
  `recover.sh`, а его `run` перехватывает раньше. `out.runSegv` на экран не попадает.
- **Починенный регион показывает старый баг.** `repairDone` снимает `broken`, но тело
  файла остаётся исходным `task.code`: `cat /opt/room/fog.py` после починки печатает
  код с ошибкой без пометки.
- **Чтение в окнах не двигает цепочку.** `readFile` ставит `visited`, но не зовёт
  `checkQuests`: открыть `readme.txt` в «Блокноте» — шаг `wake` засчитается только на
  следующем событии, которое проверяет цепочку.
- **Прыжок цепочки не возвращается.** Включить `lamp1` через `svc start lamp1` (так
  делает `.bash_history`) и осмотреть опору — `questIdx` перескочит шаг `lamp`, хотя
  `room-lamp` не починен. Для `recover.sh` регион всё равно нужен: его назовёт `fsck`.
- **Финал достижим без Элис.** `examine("door")` проверяет только `lockOverridden`;
  `edit` не ограничивает порядок задач, а перегородку убирает `set room.barrier 0`
  без всякой цены. Решить `room-override` первым и дойти до двери — катсцена с криком
  Элис, которая мертва.
- **`sessionsRestored` переживает повторный запуск.** `boot()` его не сбрасывает; сейчас
  поле никто не читает, но первый же читатель получит `true` из прошлого прогона.
- **`relocalize()` переписывает конфиг шаблоном.** Ручные правки в «Блокноте»
  (комментарии, лишние строки) при смене языка пропадут; значения вернёт
  `syncConfFile`. Файлы, созданные памятью (`session.log`, `04-again.txt`), и
  `/usr/share/man/*.1` остаются на старом языке.
- **Заголовок `anomaly.log` зависит от языка.** Если язык сменили до первой аномалии,
  строка «аномалий не зафиксировано» на старом языке так и останется над записями.
- **Порядок в `onTaskSolved`: сначала `repairDone`, потом `applyEffect`.** Первый
  кладёт `repaired`, второй — эффект; оба зовут `checkQuests`, и шаги по `repaired` и по
  эффекту (`lockOverridden`) засчитываются в этом порядке.
- **Пределы аномалий — в двух местах.** `GLITCH_CAPS` здесь и `DUP_OFFSETS` (пять
  смещений копий двери) в `04-void-scene.js`. Поднять `dup` выше 5 — сцене не хватит
  смещений.
- **Не называть функции на верхнем уровне голыми глобальными именами.** Всё внутри
  IIFE; новые помощники кладите туда же, иначе они попадут в общую область всех 24
  скриптов (см. «Известные особенности» в `ARCHITECTURE.md`).
