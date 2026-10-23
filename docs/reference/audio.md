# Звук и голос Элис — справочник

> Файлы: `js/core/01-audio.js` (489 строк), `js/demo/03-alice-voice.js` (312 строк),
> `js/core/19-neural-voice.js` (309 строк) · Место в порядке загрузки: `01` — четвёртый
> `<script defer>` после трёх `00-voice-*`; `03` — шестой, после `02-slides.js`; `19` — 22-й,
> после `18-voice-extras.js`, перед `20-ai-sandbox.js`.
> Связанные страницы: [server.md](server.md) (`/api/tts`, ElevenLabs, Piper),
> [voice.md](voice.md) (записи, `VoiceMedia`), [deck.md](deck.md) (голос Элис в деке),
> [demo.md](demo.md) (`speakAsAlice`), [sandbox.md](sandbox.md) (озвучка полигона),
> [ui.md](ui.md) (настройки звука), [ARCHITECTURE.md, «Озвучка»](../ARCHITECTURE.md#озвучка).

## Коротко

`01-audio.js` — весь звук страницы, кроме самого голоса: наведение и щелчки в меню,
глитчи, переходы, «шёпот» призраков, тема загрузочного меню (ре минор, петля ≈13,3 с) и
гул комнаты в демке. Звуковых файлов у него нет: каждый эффект собирается из осцилляторов
и шума Web Audio в момент вызова. Там же — четыре шины громкости (master, music, sfx,
voice), арбитр голоса `VoiceBus` и `voiceVolume01()` для синтеза речи.
`03-alice-voice.js` (`AliceVoice`) — голос Элис в демке и запасной голос полигона: запись
реплики на текущем языке, иначе нейроголос с `serve.js`, иначе `speechSynthesis`
браузера. `19-neural-voice.js` (`NeuralVoice`) — клиент `POST /api/tts`: получает фразу от
ElevenLabs или Piper, доигрывает настроение эффектами Web Audio и пускает в голосовую
шину. Ведущий слышит это как звук меню на загрузочном экране, голос Элис на HARD в демке
и озвученные ответы полигона.

## Как это работает

### Граф Web Audio

```
 tone() / noise() / play*()   ──┐
 гул комнаты (amb*)           ──┴─► sfxGain ───┐
 schedNote() / noiseWash()    ────► musicGain ─┼─► masterGain ─► ctx.destination
 <audio> записей (03, 09, 15) ──┐              │
 NeuralVoice (19)             ──┴─► voiceGain ─┘
 speechSynthesis (03) — мимо графа; громкость считается руками: voiceVolume01()
```

Громкость линейная: `gain = ползунок / 100`, итог любого звука = master × шина × уровень
самого звука. Значения по умолчанию в `vol` (`0.7 / 0.55 / 0.85 / 1.0`) совпадают с
`SETTINGS_DEFAULTS` в [11-settings.js:12](../../js/core/11-settings.js#L12)
(`70 / 55 / 85 / 100`). `applyVolumes()` пишет в шины:

| Шина | Значение |
|---|---|
| `masterGain` | `vol.master` |
| `musicGain` | `vol.music × (musicEnabled ? 1 : 0)` |
| `sfxGain` | `vol.sfx × (sfxEnabled ? 1 : 0)` |
| `voiceGain` | `vol.voice` (флаг sfx на неё не влияет) |

### Жизненный цикл контекста

1. `ensureCtx()` создаёт `AudioContext` (или `webkitAudioContext`) лениво и строит четыре
   `GainNode`. Первым обычно приходит `applySettings()` из `11-settings.js` при загрузке:
   `Audio.setMusicEnabled(true)` → `startMusic()` → `ensureCtx()`. До жеста пользователя
   браузер создаёт контекст в состоянии `suspended`.
2. `audioUnlockOnce` вешает на `window` три слушателя в фазе захвата — `pointerdown`,
   `keydown`, `touchstart`. Первое событие зовёт `Audio.resume()` и снимает все три.
3. Пока контекст стоит, `playMusicLoop()` нот не планирует, а перепроверяет состояние
   каждые 500 мс. После разблокировки тема меню начинается сама.
4. Голосовые пути (`03` `playClip`, `09-alice-stream.js`, `15-voice-media.js`,
   `18-voice-extras.js`) перед проигрыванием ещё раз зовут `Audio.resume()`.
   `NeuralVoice.speak()` ждёт `ctx.resume()` сам.

Без Web Audio (`AudioContext` нет) `ensureCtx()` возвращает `null`, все `play*` молча
выходят, `getContext()` и `getVoiceNode()` отдают `null`.

### Синтезированные эффекты

Два примитива, оба выходят в `sfxGain` и молчат при `!ctx || !sfxEnabled`:

- `tone(freq, dur, gain, type, opts)` — один осциллятор и `GainNode`. Огибающая: 0 → `gain`
  за 4 мс линейно, затем экспонента до 0,0005 к концу `dur`. `opts.sweep` — экспоненциальный
  глайд частоты к `max(20, sweep)` за `dur`. Остановка через `dur + 0.02` с.
- `noise(dur, gain, lowpass, highpass)` — на каждый вызов новый буфер белого шума длиной
  `sampleRate × dur`, затем по желанию highpass и lowpass (биквады), затем `GainNode`: сразу
  `gain` (без атаки), экспонента до 0,0005.

| Эффект | Состав | Где звучит |
|---|---|---|
| `playHover()` | синус 820 Гц, 50 мс, 0,08 | наведение на кнопки меню (11) |
| `playClick()` | квадрат 620 Гц, 40 мс, 0,16 + шум 100 мс, 0,10, полоса 300–1200 Гц | щелчок по кнопкам (11, 06, 12) |
| `playOpen()` | два синуса вверх: 420→760 Гц, 200 мс, 0,10 и 560→880 Гц, 220 мс, 0,07 | открытие окон, лампа включилась |
| `playClose()` | синус вниз 620→280 Гц, 180 мс, 0,10 | закрытие окон, лампа погасла |
| `playGlitch(dur = 0.5)` | 6 шумовых всплесков через `setTimeout` с шагом `dur/6`; каждый 100–200 мс, 0,18–0,28, highpass 80–680 Гц, lowpass 400–4400 Гц, всё случайное | сбои, порча мира, начало реплики Элис в демке |
| `playTransition(dur = 0.9)` | пила 70→1600 Гц экспонентой за `dur`; громкость линейно до 0,16 к 40 % `dur`, потом экспонента к 0,001; поверх шум `0.85·dur`, 0,20, полоса 200–4000 Гц | переход в терминал, дверь, катсцена |
| `playGhost()` | треугольник 180–240 Гц со свипом к 240–360 Гц за 1,4 с, 0,05 + шум 0,9 с, 0,025, полоса 250–800 Гц | призрак на экране (11), падение в демке |

### Тема меню

`playMusicLoop()` планирует всю петлю разом на `ctx.currentTime + 0.05`:

- темп: `beat = 0.83` с (≈72 BPM), `bar = 3.32` с, петля 4 такта ≈ 13,28 с;
- аккорды Dm – B♭ – F – Am (i – VI – III – v, ре-эолийский): бас треугольником (пик 0,09),
  суббас октавой ниже синусом (0,06), трезвучие пэда синусами (0,040 / 0,035 / 0,030).
  Ноты длятся 1,05 и 1,02 такта, поэтому соседние аккорды перекрываются;
- мелодия: пять нот D5, F5, A5, F5, D5 в тактах 0, 0, 2, 3, 3 — синус 0,06 и тень октавой
  ниже треугольником 0,018;
- `noiseWash(t0, bar × 4)` — шумовая подложка на всю петлю, lowpass 800 Гц, 0,02;
- следующий проход — `setTimeout` за 200 мс до конца петли (`loopMs − 200`).

`schedNote(t, dur, freq, type, peak, attack, release, dest)` — одна нота: атака
`min(attack, 0.4·dur)` линейно, удержание пика до `max(dur − release, attack)`, экспонента
к 0,0008 к концу. Выход — `dest` или `musicGain`.

### Гул комнаты (только демка)

```
ambOscA  пила   41,2 Гц ─┐
ambOscB  синус  41,9 Гц ─┴─► ambFilter (lowpass 260 Гц, Q 6) ─► ambGain ─► sfxGain
ambLfo   синус  0,06 Гц ─► ambLfoGain ×90 ─► ambFilter.frequency   (260 ± 90 Гц)
```

Два осциллятора в 0,7 Гц друг от друга дают биение; LFO медленно водит срез фильтра —
комната «дышит». `startAmbient()` поднимает `ambGain` с 0,0001 до 0,05 за 3,5 с и запускает
редкие события `ambEvent()`. `setAmbientIntensity(v)` получает от демки порчу мира
`w.corruption / 100` ([06-demo.js:2957](../../js/demo/06-demo.js#L2957)):

| Параметр | При 0 | При 1 | Как меняется |
|---|---|---|---|
| частота `ambOscB` | 41,9 Гц (биение 0,7 Гц) | 45,3 Гц (биение 4,1 Гц) | `setTargetAtTime`, τ 1,5 с |
| Q фильтра | 6 | 15 | τ 1,5 с |
| громкость `ambGain` | 0,05 | 0,10 | τ 2 с |
| пауза между событиями | 9–22 с | 2–5 с | при следующем `scheduleAmbEvent()` |
| доля «далёких» событий | 75 % | 25 % | при следующем `ambEvent()` |

`ambEvent()`: с вероятностью 45 % — «оседает металл», шумовая волна (далеко: 1,1 с,
0,020, lowpass 700 Гц; близко: 0,55 с, 0,055, lowpass 1800 Гц; highpass 120 Гц), иначе —
«щелчок конструкции», треугольник 60–100 Гц (далеко: 0,5 с, 0,030; близко: 0,22 с,
0,070). Громкость обоих умножается на `1 + ambIntensity`.

### `VoiceBus`: кто говорит

Один владелец голоса на всю страницу: `owner` — `"sample"`, `"speech"` или `null`, и
`release` — функция остановки текущего владельца.

`acquire(who, stopFn, opts)`:

| Сейчас владеет | Просит | `interrupt` | Итог |
|---|---|---|---|
| `null` | любой | любой | захват, `true` |
| `"sample"` | `"speech"` | любой | отказ, `false` — синтез не говорит поверх записи |
| любой | любой | нет | отказ, `false` |
| любой | любой (кроме случая выше) | да | `owner = null`, вызов старого `release()`, захват, `true` |

`releaseIf(who)` освобождает шину, только если владелец того же вида; `release` при этом не
зовётся. `stopAll()` освобождает и зовёт `release`.

| Кто захватывает | Вид | `stopFn` | Где |
|---|---|---|---|
| запись реплики демки | `"sample"` | `stopClip` | [03-alice-voice.js:127](../../js/demo/03-alice-voice.js#L127) |
| синтез речи | `"speech"` | `hardStop` | [03-alice-voice.js:225](../../js/demo/03-alice-voice.js#L225) |
| реплика дека | `"sample"` | `stopCurrentVoice` | [09-alice-stream.js:523](../../js/presentation/09-alice-stream.js#L523) |
| длинная дорожка | `"sample"` | `VoiceMedia` `stop` | [15-voice-media.js:258](../../js/core/15-voice-media.js#L258) |
| нейроголос | `"sample"` | `NeuralVoice.stop` | [19-neural-voice.js:245](../../js/core/19-neural-voice.js#L245) |

`stopAll()` зовут `silenceTheDeck()` при входе в демку
([06-demo.js:1472](../../js/demo/06-demo.js#L1472)), `hush()` в
[17-evidence.js:238](../../js/core/17-evidence.js#L238) и
[20-ai-sandbox.js:1134](../../js/core/20-ai-sandbox.js#L1134).

### `AliceVoice.speak(text, opts)`: порядок решения

```
opts.clip и есть запись на текущем языке ──► playClip()        → true
текст пустой                              ──►                   → false
aliceHasRecording(текст) (запись дека)    ──►                   → false
та же строка уже звучит                   ──►                   → false
NeuralVoice.fits(язык) и нет opts.synth  ──► speakNeural()     → true сразу
иначе                                     ──► speakSynth()      → true / false
                     speakNeural не смог  ──► speakSynth(); если и он не смог — opts.onEnd()
```

`opts.synth: true` — только голос браузера, без ElevenLabs и Piper. Его ставит
WEB SPEECH полигона: без флага выбор «голос браузера» тратил кредиты ElevenLabs.

`NeuralVoice.speak(text, opts)` принимает ещё `opts.speaker`: `"neikon"` —
мысли Нейкона в демо (06-demo.js, `neikonSay`), голос Egor T. Для него нужен
только ElevenLabs (`eleven()`), `fits()` и Piper не участвуют; на сервер уходит
`speaker: "neikon"`.

**Запись.** `playClip(id, opts)` берёт `VOICE_CLIPS[locale][id]`, захватывает шину как
`"sample"` с перебиванием, глушит синтез (`hardStop()`), создаёт `<audio>` через
`document.createElement`. Если контекст уже `running`, элемент уходит в граф:
`MediaElementSource → GainNode(уровень реплики) → voiceGain`, `a.volume = 1`. Если контекст
стоит — просит `Audio.resume()` и этот раз играет мимо графа с
`a.volume = уровень × voiceVolume01()`. Конец, ошибка загрузки и отказ `play()` ведут в
`finish`: отпустить шину, вызвать `opts.onEnd`.

**Синтез речи.** `speakSynth(str, opts)` глушит нейроголос, захватывает шину как `"speech"`,
режет текст на куски по 4–7 слов (`4 + floor(random·4)`), кладёт их в `queue` и через
60 мс зовёт `pump(epoch)`. `pump` говорит ровно один кусок: новый
`SpeechSynthesisUtterance`, голос из `pickVoice()`, высота и темп с разбросом на каждый
кусок, громкость `volumeNow()` на момент куска. `onend` и `onerror` куска снова зовут
`pump` с тем же номером эпохи. Пустая очередь — конец строки: шина отпускается, зовётся
`opts.onEnd`. Любая остановка (`hardStop()`) увеличивает `epoch`, и запоздалые `onend`
старой строки ничего не продолжают.

| Параметр куска | Формула | По умолчанию |
|---|---|---|
| `u.pitch` | `max(0.3, pitch + (random − 0.5)·0.15)` | `pitch = 0.45` |
| `u.rate` | `max(0.5, rate + (random − 0.5)·0.10)` | `rate = 0.78` |
| `u.volume` | `clamp(volume × voiceVolume01())` | `volume = 0.95` |
| `u.lang` | `opts.lang` или язык голоса или `"ru-RU"` | — |

**Нейроголос.** `speakNeural(str, opts)` глушит всё своё, запоминает номер строки
`neuralLine`, ставит `speaking = true` и отдаёт фразу в `NeuralVoice.speak()` с
настроением `opts.mood` или `NeuralVoice.moodOfText(str)` и языком интерфейса. Ответ
приходит через 1–3 с, поэтому `speak()` говорит «да» сразу. Если `NeuralVoice.speak()`
вернул `false` и за это время не началась другая строка, та же фраза уходит в
`speakSynth()`.

### `NeuralVoice`: путь фразы

1. `check()` — один раз на страницу: `GET api/tts/info` сначала у сервера, отдавшего
   страницу, потом у `serve.js` на том же хосте, порт 8779 или `?studio=<порт>`
   (`bases()`). Ответ с `ok: true` кешируется в `info`, адрес — в `base`. С `file://`
   запроса нет: `info = { none: true }`. Первый `check()` — через 2,5 с после
   `DOMContentLoaded`.
2. `fits(locale, engine)` решает, может ли сервер прочесть язык:

   | `engine` | Условие |
   |---|---|
   | `"elevenlabs"` | ключ ElevenLabs настроен (`info.elevenlabs.configured`) |
   | `"piper"` | у Piper есть голос этого языка (`piperReads()`: `ru`, `en`; таджикского нет) |
   | `"auto"` / не задан | одно из двух |

3. `speak(text, opts)`: `POST api/tts { text, mood, lang, engine }`. Движок, прочитавший
   фразу, — из заголовка `X-TTS-Engine`, причина пропуска ElevenLabs — из `X-TTS-Note`.
   Ответ декодируется `decodeAudioData` в `AudioBuffer`.
4. Для `crit` при ненулевом глитче буфер режется `rough()` (заикание и пропуски).
   На ElevenLabs — только при «heavy» и с силой 0,35.
5. `wire()` строит цепочку эффектов настроения:
   `AudioBufferSourceNode → эффекты → AnalyserNode → GainNode(volume) → voiceGain`.
6. Шина захватывается как `"sample"` с перебиванием, звук стартует, зовётся `onStart`.
   После `onended` цепочка звенит ещё `tail` секунд, затем `finish(h, true)` разбирает
   граф, отпускает шину и зовёт `onEnd(true)`.

Эффекты настроения. `g` — сила глитча из настроек: `off` 0, `subtle` 0,55, `heavy` 1.

| Настроение | Piper (`studio = false`) | ElevenLabs (`studio = true`) | Хвост |
|---|---|---|---|
| `crit` — паника | `playbackRate` 1,035 + дрожь LFO 6,5 Гц глубиной `0.012 + 0.022g`; highpass 170 Гц; тремоло: gain 0,82, LFO 9 Гц глубиной `0.12 + 0.2g`; `rough(g)` при `g > 0` | высота не трогается; тремоло: gain 0,92, LFO 9 Гц глубиной `0.03 + 0.06g`; `rough(0.35)` только при `g = 1` | 0,1 с |
| `loop` — петля | `playbackRate` 0,95; lowpass 3400 Гц; эхо 340 мс, обратная связь `0.36 + 0.14g`, влажность 0,42 | lowpass 6500 Гц; эхо 340 мс, обратная связь `0.24 + 0.14g`, влажность 0,28 | 2,2 с |
| `ok` — облегчение | high-shelf 3 кГц +2,5 дБ; «комната» 45 мс, обратная связь 0,2, влажность 0,18 | high-shelf +1,5 дБ; комната с влажностью 0,12 | 0,4 с |
| `neutral` | без эффектов | без эффектов | 0,1 с |

`playbackRate` у `AudioBufferSourceNode` меняет и темп, и высоту — поэтому на ElevenLabs его
не трогают.

Настроение выбирают двумя способами: полигон — по LUCIDITY (`moodOf()`), демка — по словам
реплики (`moodOfText()`).

| `moodOf(lucidity)` | Настроение |
|---|---|
| `null` / `undefined` | `neutral` |
| ≤ 25 | `crit` |
| 26–64 | `loop` |
| 65–84 | `neutral` |
| ≥ 85 | `ok` |

`moodOfText(text)` проверяет по порядку: два и больше `!` или слова боли и тревоги
(«больно», «стой», «помоги», «не могу», «задыха…», «умира…», «сбой», «рушит», «сминает»,
«ломает», «падаю», «страшно») → `crit`; слова облегчения («спасибо», «получилось», «дышу»,
«ясно», «стабил…», «тишина», «спокойн…») → `ok`; слова потерянного времени («снова»,
«опять», «петл…», «цикл», «по кругу», «время», «застрял», «забыла», «не помню») → `loop`;
иначе `neutral`. Облегчение проверяется раньше петли: «спасибо, я снова вижу» — это `ok`.
Словари только русские.

## Почему так, а не иначе

- **Эффекты и музыка синтезируются, а не лежат файлами.** Альтернатива — пачка коротких
  `.mp3`/`.wav`. В шапке файла сказано прямо: «every sound is synthesised, nothing is
  loaded». Выигрыш — ноль байт звука в сборке и ни одного запроса: всё работает с флешки
  и на слабом интернете у телефонов жюри. Вероятно, есть и вторая причина: чтобы файл шёл
  через шины Web Audio, его надо либо скачать `fetch` (с `file://` Chrome его не даст),
  либо пропустить через `MediaElementSource` (с `file://` Chrome отдаёт тишину — см.
  комментарий в [15-voice-media.js:17](../../js/core/15-voice-media.js#L17)). Синтез этих
  ограничений не знает.
- **Четыре шины, у голоса своя.** Альтернатива — одна общая громкость эффектов. В
  [09-alice-stream.js:291](../../js/presentation/09-alice-stream.js#L291) записан
  баг, который это чинит: голос считался по `volSfx`, ползунок «Голос» ничего не делал, а
  ползунок эффектов двигал Элис. По коду видно и практическую причину: голос несёт сюжет,
  его надо оставить громким, когда музыку и щелчки ведущий приглушил. Шины отдаются наружу
  (`getContext()`, `getVoiceNode()`), чтобы записи, длинные дорожки и нейроголос шли через
  тот же master и ползунок голоса двигал их вживую.
- **Флаг «эффекты выкл» гасит шину, а не только помощники.** `tone()` и `noise()` сами
  проверяют `sfxEnabled`, но гул комнаты подключён к `sfxGain` напрямую — и при выключенных
  эффектах продолжал гудеть на полной громкости (комментарий в `applyVolumes()`). Теперь
  `sfxGain = vol.sfx × флаг`.
- **Пока контекст стоит, петля музыки опрашивает, а не планирует.** Остановленный контекст
  замораживает `ctx.currentTime`, а таймер идёт по настенным часам. Без проверки каждый
  проход ставил бы новую копию петли на тот же `t0`, и после первого щелчка все копии
  заиграли бы разом — громкий размазанный хор, одна копия за каждые 13 с на загрузочном
  экране (комментарий в `playMusicLoop()`).
- **`const Audio` закрывает встроенный конструктор.** Объявление верхнего уровня в обычном
  скрипте попадает в общую лексическую область всех скриптов и перекрывает
  `window.Audio`: голое `Audio` в любом файле — движок, `new Audio()` бросит
  `TypeError: Audio is not a constructor`. Поэтому `<audio>` везде создаётся через
  `document.createElement("audio")` ([03-alice-voice.js:133](../../js/demo/03-alice-voice.js#L133),
  [09-alice-stream.js:530](../../js/presentation/09-alice-stream.js#L530),
  [15-voice-media.js:82](../../js/core/15-voice-media.js#L82)). Сам `window.Audio` остаётся
  родным конструктором: `const` верхнего уровня не становится свойством `window`.
  `studio.html` этот файл не подключает и пишет `new Audio(src)`. Почему движок назван
  именно так, в коде не записано; комментарий в `09` называет его «the inline SFX engine
  higher up» — вероятно, имя осталось с тех времён, когда всё было одним встроенным
  скриптом.
- **Арбитр голоса — отдельный объект в `01`.** Альтернатива — проверки «не говорит ли уже
  кто-то» в каждом движке. Не работает: `isAliceSpeaking()` из `09` видит только свой
  `<audio>` и возвращает `false`, пока говорит синтез речи (комментарий над `VoiceBus`).
  Объявлен в `01`, потому что ни от чего не зависит, а нужен всем ниже по порядку.
- **Запись всегда перебивает синтез.** «If we have her real voice for a line, the robot
  must not read it too». Поэтому `"speech"` не может перебить `"sample"`, а
  `AliceVoice.speak()` отказывается читать строку, для которой у дека есть запись
  (`aliceHasRecording()`).
- **Запись ищется по id и языку, а не по тексту.** Текст демки переведён на четыре языка и
  меняется с каждой правкой копирайта — поиск по строке молча терял бы все записи после
  первой правки (комментарий «RECORDED CLIPS»). Нет записи на текущем языке — синтез, а
  не русский дубль: «hearing the wrong language is worse than hearing the synth».
- **Синтез речи громкость считает сам.** У `speechSynthesis` нет `AudioNode`, его нельзя
  подключить к `voiceGain`; единственная ручка — `u.volume`, и она фиксируется при
  создании реплики. Отсюда `voiceVolume01()` — те же проценты master × voice, прочитанные
  руками, — и чтение громкости на каждый кусок, а не на строку.
- **Синтез режется на куски по 4–7 слов.** Три причины в комментариях: ритм «сломанного
  ИИ, который перезагружается» (у каждого куска свой разброс высоты и темпа); громкость
  ползунка слышна уже на следующем куске; и строгая очередь «одна реплика в полёте» вместо
  прежней схемы `cancel()` + N `speak()` в одной задаче. В Chrome `cancel()` асинхронен
  относительно очереди движка, и такая схема теряла или дублировала первую реплику —
  слушатель слышал строку дважды. Повторный вызов через полсекунды обрывал фразу на
  полуслове, а `onEnd` первой строки, сработав от `cancel()`, снимал класс `speaking`,
  пока говорила вторая. Номер эпохи отсекает запоздалые `onend`, задержка 60 мс — потому
  что «Chrome drops a speak() issued in the same task as cancel()».
- **Запись при остановленном контексте играет мимо графа.** `createMediaElementSource()`
  забирает выход элемента навсегда; на замороженном графе дубль ушёл бы в тишину без пути
  назад. Поэтому один раз — громкость самого элемента, следующая реплика — уже через граф
  (комментарий в `playClip()`).
- **Нейроголос стоит между записью и синтезом.** Строки без записи (реакции полигона,
  реплики демки на HARD) читает голос, на котором записана Элис, вместо «робота»
  операционной системы. `speak()` говорит «да» сразу, потому что ответ идёт 1–3 с; при
  отказе строка всё же уходит в синтез.
- **ElevenLabs обрабатывается слегка, Piper — сильно.** На ElevenLabs модель уже сыграла
  настроение тегами (`[panicked, breathless]` и т. п. — см. [server.md](server.md)), и
  «Milly has to stay Milly»: высоту не сдвигают, тремоло и эхо слабее, заикание — только
  при «heavy». Piper читает ровно, настроение ему достраивает браузер: сдвиг темпа и
  высоты, дрожь, фильтры, эхо.
- **Заикание вырезается в самих сэмплах.** В Web Audio нет узла «повтори эти 80 мс»
  (комментарий над `rough()`), поэтому буфер собирается заново из кусков.
- **Поиск сервера на соседнем порту.** Страницу может отдавать другой статический сервер
  на этой машине; тогда голос просят у `serve.js` на том же имени хоста, порт 8779.
  `serve.js` отвечает CORS-заголовками только на тот же хост (`corsFor()`,
  [serve.js:109](../../serve.js#L109)), так что чужой сайт ключ ElevenLabs не потратит.
- **Ответ `/api/tts/info` кешируется на страницу.** Один запрос вместо запроса перед каждой
  строкой; полигон при открытии спрашивает заново (`check(true)`), потому что сервер могли
  запустить или добавить ключ после загрузки страницы.

## Связи

**Берёт из общей области**

| Имя | Владелец | Кто здесь читает |
|---|---|---|
| `window.settingsState` (`sfxOn`, `volMaster`, `volVoice`, `locale`) | [11-settings.js:99](../../js/core/11-settings.js#L99) | `voiceVolume01()`, `currentLocale()` |
| `settingsState` (`voiceGlitch`, `locale`) | [11-settings.js:38](../../js/core/11-settings.js#L38) | `damage()`, `NeuralVoice.speak()` |
| `VOICE_CLIPS` | [00-voice-clips.js:20](../../js/core/00-voice-clips.js#L20) (перезаполняет `00-voice-sync.js`) | `clipSrc()` |
| `aliceHasRecording()` | [09-alice-stream.js:121](../../js/presentation/09-alice-stream.js#L121) | `AliceVoice.speak()` |
| `NeuralVoice` | `19-neural-voice.js` (загружается позже `03`) | `neuralFits()`, `stopNeural()`, `speakNeural()` |
| `Audio`, `VoiceBus`, `voiceVolume01` | `01-audio.js` | `03`, `19` |
| `GET /api/tts/info`, `POST /api/tts` | [serve.js:631](../../serve.js#L631), [serve.js:644](../../serve.js#L644) | `ask()`, `NeuralVoice.speak()` |

**Отдаёт**

| Имя | Кто пользуется |
|---|---|
| `Audio.playHover`, `playClick` | `11-settings.js` (делегирование наведения и щелчков), `06-demo.js`, `12-jury.js` |
| `Audio.playOpen`, `playClose` | `11`, `06`, `12`, `17-evidence.js`, `20-ai-sandbox.js`, `21-backstage.js` |
| `Audio.playGlitch`, `playTransition`, `playGhost` | `11`, `06`, `02-slides.js`, `16-jury-intro.js`, `18-voice-extras.js` |
| `Audio.setVolume`, `setMusicEnabled`, `setSfxEnabled` | `applySettings()` в `11`; `setMusicEnabled` ещё `06` (открытие и закрытие демки); `setVolume` и `getVolume` — `17` (приглушает музыку на время видео) |
| `Audio.stopMusic` | `11` (`transitionToTerminal()`, «KERNEL PANIC»), `16` |
| `Audio.startAmbient`, `stopAmbient`, `setAmbientIntensity` | `06` |
| `Audio.resume` | обработчик `audioUnlockOnce`, `03`, `09`, `15`, `18` |
| `Audio.getContext`, `getVoiceNode` | `03`, `09`, `15`, `19` |
| `Audio.isReady`, `isMusicEnabled`, `isSfxEnabled`, `getSfxNode`, `startMusic` | снаружи не используются (grep по `js/`, `index.html`, `studio.html`) |
| `VoiceBus.acquire`, `releaseIf` | `03`, `09`, `15`, `19` |
| `VoiceBus.stopAll` | `06`, `17`, `20` |
| `VoiceBus.busy`, `VoiceBus.who` | не используются |
| `voiceVolume01()` | `03`, `15` (`busVolume()`); в `09` своя копия — `aliceCurrentVolume()` |
| `AliceVoice.speak`, `available` | `06` (`speakAsAlice()` и проверки перед ним), `20` (запасной голос полигона) |
| `AliceVoice.stop` | `06` (`silenceTheDeck()`), `20` (`stopSpeech()`) |
| `AliceVoice.isSpeaking` | `20` (эквалайзер, `stopSpeech()`) |
| `AliceVoice.hasClip` | не используется |
| `NeuralVoice.speak`, `stop`, `level`, `moodOf`, `check`, `status`, `engine`, `note` | `20-ai-sandbox.js` |
| `NeuralVoice.fits`, `moodOfText`, `stop`, `speak` | `03` |
| `NeuralVoice.ready`, `engines`, `isSpeaking` | не используются |

## Константы и состояние

### `01-audio.js`, модуль `Audio` (IIFE)

| Имя | Значение / тип | Смысл | Кто пишет / кто читает |
|---|---|---|---|
| `Audio` | объект (IIFE) | Публичный API звука; перекрывает `window.Audio` | все файлы |
| `ctx` | `AudioContext \| null` | Единственный контекст страницы | пишет `ensureCtx()`; читают все функции модуля |
| `masterGain` | `GainNode \| null` | Общая громкость → `ctx.destination` | `ensureCtx()`, `applyVolumes()` |
| `musicGain` | `GainNode \| null` | Шина музыки | `applyVolumes()`, `stopMusic()`; в неё пишут `schedNote()`, `noiseWash()` |
| `sfxGain` | `GainNode \| null` | Шина эффектов и гула комнаты | `applyVolumes()`; `tone()`, `noise()`, `startAmbient()`; наружу `getSfxNode()` |
| `voiceGain` | `GainNode \| null` | Шина голоса Элис | `applyVolumes()`; наружу `getVoiceNode()` |
| `musicTimer` | id `setTimeout` \| `null` | Таймер следующей петли или опроса; `null` = музыка не запланирована | `playMusicLoop()`, `startMusic()`, `stopMusic()`; читает `setMusicEnabled()` |
| `musicEnabled` | `boolean`, `true` | Музыка разрешена | `setMusicEnabled()`; читают `applyVolumes()`, `playMusicLoop()`, `startMusic()`, `stopMusic()` |
| `sfxEnabled` | `boolean`, `true` | Эффекты разрешены | `setSfxEnabled()`; читают `applyVolumes()`, `tone()`, `noise()`, `play*`, `scheduleAmbEvent()` |
| `vol` | `{ master: 0.7, music: 0.55, sfx: 0.85, voice: 1.0 }` | Громкости 0..1 | `setVolume()`; `applyVolumes()`, `getVolume()`, `stopMusic()` |
| `ambGain` | `GainNode \| null` | Выход гула комнаты; не `null` = гул запущен | `startAmbient()`, `stopAmbient()`, `setAmbientIntensity()`; проверяют `ambEvent()`, таймер `scheduleAmbEvent()` |
| `ambOscA` | `OscillatorNode` | Пила 41,2 Гц | `startAmbient()`, `stopAmbient()` |
| `ambOscB` | `OscillatorNode` | Синус 41,9 Гц, уходит вверх с порчей | `startAmbient()`, `setAmbientIntensity()`, `stopAmbient()` |
| `ambFilter` | `BiquadFilterNode` | Lowpass 260 Гц, Q 6…15 | `startAmbient()`, `setAmbientIntensity()` |
| `ambTimer` | id `setTimeout` | Следующее событие «из темноты» | `scheduleAmbEvent()`, `stopAmbient()` |
| `ambLfo` | `OscillatorNode` 0,06 Гц | «Дыхание» — водит срез фильтра | `startAmbient()`, `stopAmbient()` |
| `ambLfoGain` | `GainNode` ×90 | Глубина LFO в герцах | `startAmbient()`, `stopAmbient()` |
| `ambIntensity` | `number` 0..1 | Порча мира | `setAmbientIntensity()`, `stopAmbient()` (сброс в 0); читают `ambEvent()`, `scheduleAmbEvent()` |

Числа внутри функций, на которых держится звук: `beat = 0.83`, `bar = beat × 4`, `loopMs = bar × 4 × 1000`,
таблица `chords` (бас и три ноты пэда на такт) и `mel` (пять нот мелодии) — локальные
константы `playMusicLoop()`. Опрос остановленного контекста — 500 мс.

### `01-audio.js`, `VoiceBus` и верхний уровень

| Имя | Значение / тип | Смысл | Кто пишет / кто читает |
|---|---|---|---|
| `VoiceBus` | объект (IIFE) | Арбитр «один голос Элис на страницу» | см. «Связи» |
| `owner` | `"sample" \| "speech" \| null` | Кто сейчас говорит | `acquire()`, `releaseIf()`, `stopAll()`; читают `busy()`, `who()` |
| `release` | `function \| null` | Функция остановки текущего владельца | `acquire()`, `releaseIf()`, `stopAll()` |
| `audioUnlockOnce` | IIFE | Разовая разблокировка контекста по жесту | выполняется при загрузке |
| `handler` | функция внутри `audioUnlockOnce` | Слушатель жеста | `window` (`pointerdown`, `keydown`, `touchstart`) |
| `voiceVolume01` | функция верхнего уровня | Громкость голоса для путей мимо графа | `03`, `15` |

### `03-alice-voice.js`, модуль `AliceVoice` (IIFE)

| Имя | Значение / тип | Смысл | Кто пишет / кто читает |
|---|---|---|---|
| `AliceVoice` | объект (IIFE) | Голос Элис в демке и запасной голос полигона | `06`, `20` |
| `synth` | `SpeechSynthesis \| null` | `window.speechSynthesis`, если есть | при загрузке; читают `pickVoice()`, `hardStop()`, `speakSynth()`, `available` |
| `cachedVoice` | `SpeechSynthesisVoice \| null` | Выбранный голос | `pickVoice()`; сбрасывает `onvoiceschanged` |
| `epoch` | `number`, 0 | Номер текущей строки синтеза | `hardStop()` (`++`); сравнивает `pump()`; запоминает `speakSynth()` |
| `queue` | `string[]` | Оставшиеся куски строки | `speakSynth()`, `pump()` (`shift`), `hardStop()` |
| `speaking` | `boolean` | Строка синтеза или нейроголоса в полёте | `speakSynth()`, `speakNeural()`, `pump()`, `hardStop()`; читают `isSpeaking()`, `speak()` |
| `currentText` | `string` | Текст строки в полёте — защита от повторного вызова | те же |
| `baseOpts` | `object \| null` | `opts` текущей строки синтеза (`pitch`, `rate`, `volume`, `lang`, `onStart`, `onEnd`) | `speakSynth()`, `pump()`, `hardStop()` |
| `startedThisLine` | `boolean` | `onStart` уже повешен на первый кусок | `pump()`, `hardStop()` |
| `clipAudio` | `HTMLAudioElement \| null` | Запись в полёте | `playClip()`, `stopClip()`, `finish`; читают `isSpeaking()`, `stop()` |
| `SRC_KEY` | `"__voiceSrc"` | Имя свойства на элементе, где лежит его `MediaElementSource` | `playClip()` |
| `neuralLine` | `number`, 0 | Номер строки нейроголоса; растёт на каждой новой строке и остановке | `stopNeural()`, `speakNeural()` |

### `19-neural-voice.js`, модуль `NeuralVoice` (IIFE)

| Имя | Значение / тип | Смысл | Кто пишет / кто читает |
|---|---|---|---|
| `NeuralVoice` | объект (IIFE) | Клиент `/api/tts` и эффекты настроения | `03`, `20` |
| `info` | ответ `/api/tts/info` \| `{ none: true }` \| `null` | Что умеет сервер: `elevenlabs { configured, voice, model, paused, why }`, `piper`, `piperVoices` (`{ ru, en }` → имя голоса), `moods` | `check()`; читают `eleven()`, `piper()`, `piperReads()`, `status` |
| `checking` | `Promise \| null` | Запрос `check()` в полёте — повторные вызовы ждут его | `check()` |
| `cur` | объект строки \| `null` | Текущая строка: `{ stopped, nodes, onEnd, src, an, fbuf, timer, playing, done }` | `speak()`, `finish()`, `stop()`; читают `level()`, `isSpeaking()` |
| `lastEngine` | `""`, `"elevenlabs"`, `"piper"` | Кто прочёл последнюю строку | `speak()`; наружу `engine` |
| `lastNote` | `string` | Почему ElevenLabs пропущен (из `X-TTS-Note`) | `speak()`; наружу `note` |
| `base` | `""` или `"http(s)://host:порт/"` | Где живёт `/api/tts`; `""` — сервер, отдавший страницу | `check()`; читает `speak()` |

Порог настроений `moodOf()` (25 / 64 / 84) и сила глитча `damage()` (0 / 0,55 / 1) — числа
внутри функций, см. «Как это работает».

`tools/doc-coverage.js` читает запятую в комментарии к `info` («/api/tts/info, or
{ none: true }») как второе объявление и требует имя `or`. Такой переменной нет.

## Функции

### `01-audio.js` — контекст и громкость

#### `ensureCtx()` → `AudioContext | null`
Создаёт контекст при первом вызове и собирает шины: `musicGain`, `sfxGain`, `voiceGain` →
`masterGain` → `ctx.destination`, громкости из `vol`. Повторный вызов возвращает тот же
контекст. Без `AudioContext`/`webkitAudioContext` — `null`. Зовут `resume()`,
`startMusic()`, `startAmbient()`, `getContext()`, `getSfxNode()`, `getVoiceNode()`
([01-audio.js:27](../../js/core/01-audio.js#L27)).

#### `resume()` → `undefined`
`ensureCtx()` и `ctx.resume()`, если контекст `suspended`. Промис `resume()` не ждёт.
Наружу — `Audio.resume`.

#### `applyVolumes()` → `undefined`
Пишет `vol` и флаги в `gain.value` четырёх шин (таблица в «Как это работает»). До
создания контекста ничего не делает — значения подхватит `ensureCtx()` из `vol`, но без
учёта флагов (см. «Подводные камни»).

#### `setVolume(kind, v01)` → `undefined`
`vol[kind] = clamp(v01, 0, 1)`, затем `applyVolumes()`. `kind` — `"master" | "music" |
"sfx" | "voice"`; другое имя добавит в `vol` новое поле и ни на что не повлияет. Зовут
`applySettings()` (11) и `17-evidence.js`.

#### `setMusicEnabled(b)` → `undefined`
Ставит `musicEnabled`, применяет громкости. `true` и `musicTimer === null` →
`startMusic()`; `false` → `stopMusic()`. Зовут `applySettings()` при каждом изменении
настроек и `06-demo.js` при входе в демку (`false`) и выходе (`true`, если музыка была
включена в настройках).

#### `setSfxEnabled(b)` → `undefined`
Ставит `sfxEnabled`, применяет громкости — `sfxGain` уходит в 0 вместе с гулом комнаты.

### `01-audio.js` — эффекты

#### `tone(freq, dur, gain, type, opts)` → `undefined`
Один осциллятор (`type` по умолчанию `"sine"`) с огибающей «4 мс вверх, экспонента вниз»
в `sfxGain`. `opts.sweep` — конечная частота экспоненциального глайда (не ниже 20 Гц).
Молчит без контекста и при выключенных эффектах.

#### `noise(dur, gain, lowpass, highpass)` → `undefined`
Буфер белого шума `dur` секунд (минимум 1 сэмпл), по желанию highpass и lowpass, гейн с
экспоненциальным спадом, выход в `sfxGain`. Буфер создаётся заново на каждый вызов.

#### `playHover()` → `undefined`
`tone(820, 0.05, 0.08, "sine")`. Наведение на кнопки меню (делегирование в `11`).

#### `playClick()` → `undefined`
Квадрат 620 Гц 40 мс + шум 100 мс в полосе 300–1200 Гц.

#### `playOpen()` → `undefined`
Два синуса со свипом вверх (420→760 и 560→880 Гц).

#### `playClose()` → `undefined`
Синус со свипом вниз 620→280 Гц.

#### `playGlitch(dur)` → `undefined`
Шесть шумовых всплесков со случайными длиной, громкостью и полосой, разнесённых
`setTimeout` на `dur / 6`. `dur` по умолчанию 0,5 с; `0` тоже даёт 0,5. Таймеры не
отменяются — глитч доигрывает, даже если эффекты выключили посередине (каждый всплеск
всё равно проверит `sfxEnabled` в `noise()`).

#### `playTransition(dur)` → `undefined`
Пила 70→1600 Гц за `dur` (по умолчанию 0,9 с) с горбом громкости на 40 % и шумовой
«ветер» в полосе 200–4000 Гц.

#### `playGhost()` → `undefined`
Тихий треугольник со случайным свипом вверх 1,4 с и шёпот шума 250–800 Гц. Зовут
`spawnGhost()` в `11` и катсцена `06`.

### `01-audio.js` — музыка

#### `schedNote(t, dur, freq, type, peak, attack, release, dest)` → `undefined`
Планирует одну ноту на момент `t` контекста: атака `min(attack, 0.4·dur)`, удержание,
экспонента к 0,0008, остановка через `dur + 0.05`. Выход — `dest` или `musicGain`.
Контекст не проверяет: зовётся только из `playMusicLoop()`.

#### `playMusicLoop()` → `undefined`
Один проход темы: 4 такта аккордов, мелодия, `noiseWash()`, затем `setTimeout` на себя за
200 мс до конца петли. Если контекст не `running`, только перезапускает себя через 500 мс.
Без контекста или при `musicEnabled === false` выходит, не трогая `musicTimer`.

#### `noiseWash(t, dur)` → `undefined`
Шумовая подложка на всю петлю: белый шум через однополюсный фильтр
`b = 0.97·b + 0.03·w` (в комментарии — «pink-ish»), lowpass 800 Гц, нарастание 1,5 с до
0,020, удержание, спад к концу. Буфер `sampleRate × 13,28 с` создаётся на каждую петлю.

#### `startMusic()` → `undefined`
`ensureCtx()`, сбрасывает `musicTimer` и при `musicEnabled` запускает `playMusicLoop()`.
Снаружи не вызывается: музыку включает `setMusicEnabled(true)`.

#### `stopMusic()` → `undefined`
Снимает таймер (`musicTimer = null`), уводит `musicGain` в 0,0005 за 0,8 с и через 900 мс
возвращает шине `vol.music × флаг`. Уже запланированные ноты текущей петли не
останавливаются (см. «Подводные камни»). `musicEnabled` не меняет. Зовут `11` (переход в
терминал, «KERNEL PANIC»), `16`, `setMusicEnabled(false)`.

### `01-audio.js` — гул комнаты

#### `startAmbient()` → `undefined`
Строит граф гула (два осциллятора, фильтр, LFO), поднимает громкость до 0,05 за 3,5 с и
запускает `scheduleAmbEvent()`. Если гул уже идёт (`ambGain` не `null`) — ничего.
Текущий `ambIntensity` при старте не применяется: частота и Q берутся базовые до
следующего `setAmbientIntensity()`. Зовёт `06` при пробуждении Нейкона в комнате.

#### `ambEvent()` → `undefined`
Одно событие «из темноты»: шумовая волна (45 %) или низкий щелчок, далёкий или близкий —
вероятность «далеко» `0.75 − 0.5·ambIntensity`. Громкость × `(1 + ambIntensity)`.

#### `scheduleAmbEvent()` → `undefined`
Ставит `ambTimer` на случайную паузу между `9000 − 7000·I` и `22000 − 17000·I` мс; по
таймеру — `ambEvent()` (если эффекты включены) и следующая постановка. Цепочка рвётся,
когда `ambGain` стал `null`.

#### `setAmbientIntensity(v)` → `undefined`
Запоминает `ambIntensity = clamp(v, 0, 1)` и, если гул идёт, плавно ведёт частоту
`ambOscB`, Q фильтра и громкость. Зовёт `06` на каждое изменение мира с
`w.corruption / 100` и с `0` перед катсценой.

#### `stopAmbient()` → `undefined`
Снимает таймер, уводит гейн в тишину за 1,2 с, через 1,4 с останавливает и отключает
осцилляторы и гейн. Ссылки обнуляет сразу, так что новый `startAmbient()` можно звать, не
дожидаясь затухания. Зовёт `close()` демки.

### `01-audio.js` — публичный объект `Audio`

Кроме функций выше, наружу отдаются короткие стрелки:

| Член | Что возвращает |
|---|---|
| `isReady()` | `ctx !== null` — контекст создан (не значит «играет») |
| `getVolume(k)` | `vol[k]` |
| `isMusicEnabled()` | `musicEnabled` |
| `isSfxEnabled()` | `sfxEnabled` |
| `getContext()` | `ensureCtx()`, затем `ctx` — создаёт контекст, если его нет |
| `getSfxNode()` | шина эффектов (создаёт контекст) |
| `getVoiceNode()` | шина голоса (создаёт контекст) |

### `01-audio.js` — разблокировка

#### `audioUnlockOnce()` (IIFE) → `undefined`
Выполняется при загрузке файла. Вешает `handler` на `window` в фазе захвата на
`pointerdown`, `keydown`, `touchstart`.

#### `handler()` → `undefined`
`Audio.resume()` и снятие всех трёх слушателей. Срабатывает один раз, на первое событие.

### `01-audio.js` — `VoiceBus`

#### `VoiceBus.acquire(who, stopFn, opts)` → `boolean`
Захват голоса по таблице из «Как это работает». При перебивании сначала обнуляет
владельца, потом зовёт его `release()` в `try` — поэтому `releaseIf()` изнутри старого
`release()` ничего не ломает. Проверка `owner !== who` в первом условии лишняя: при
`who === "speech"` и `owner === "sample"` она всегда истинна.

#### `VoiceBus.releaseIf(who)` → `undefined`
Обнуляет владельца, если он того же вида. Остановку не вызывает. Различает только вид,
не конкретного владельца.

#### `VoiceBus.stopAll()` → `undefined`
Обнуляет владельца и вызывает его остановку.

#### `VoiceBus.busy()` → `boolean`
Занята ли шина. Не используется.

#### `VoiceBus.who()` → `"sample" | "speech" | null`
Текущий владелец. Не используется.

### `01-audio.js` — громкость синтеза речи

#### `voiceVolume01()` → `number` 0..1
`window.settingsState`: при `sfxOn === false` — 0; иначе `volMaster/100 × volVoice/100`
(по умолчанию 70 и 100). Без настроек — 0,7. Зовут `volumeNow()` и путь записи мимо
графа в `03`, `busVolume()` в `15`.

### `03-alice-voice.js` — синтез речи

#### `pickVoice()` → `SpeechSynthesisVoice | null`
Возвращает `cachedVoice` или выбирает: первый голос с `lang` вида `ru-…`/`ru_…`, иначе
голос Microsoft/Google с `female` в имени, иначе первый в списке. Язык интерфейса не
учитывает. Пока браузер не отдал список голосов — `null` (реплика уйдёт голосом по
умолчанию).

#### `synth.onvoiceschanged` (анонимная) → `undefined`
Сбрасывает `cachedVoice` и выбирает заново, когда браузер догрузил голоса. Присваивается
свойством, а не `addEventListener`: чужой обработчик на том же событии будет перезаписан.

#### `volumeNow(o)` → `number` 0..1
`clamp(o.volume ?? 0.95) × voiceVolume01()`. Литералы `volume` у вызывающих — относительный
уровень строки, ползунок — шина.

#### `hardStop()` → `undefined`
Только движок: `epoch++`, очистка очереди и флагов, `synth.cancel()`. `VoiceBus` не трогает
— им занимается вызывающий. Это же `stopFn` при захвате `"speech"`.

#### `pump(myEpoch)` → `undefined`
Шаг очереди. Чужая эпоха — выход. Пустая очередь — конец строки: сброс флагов,
`VoiceBus.releaseIf("speech")`, `baseOpts.onEnd()`. Иначе создаёт
`SpeechSynthesisUtterance` для следующего куска (голос, язык, высота и темп с разбросом,
громкость на сейчас), на первый кусок вешает `onStart`, на `onend`/`onerror` — `pump` той
же эпохи. Исключение в `synth.speak()` тоже ведёт к следующему куску.

#### `speakSynth(str, opts)` → `boolean`
`false`, если `speechSynthesis` нет, шину не дали (говорит запись) или в строке нет слов.
Иначе: `stopNeural()`, захват `"speech"` с перебиванием, `hardStop()`, разбивка на куски,
`pump` через 60 мс, `true`. `opts`: `pitch`, `rate`, `volume`, `lang`, `onStart`, `onEnd`.

### `03-alice-voice.js` — записи

#### `currentLocale()` → `string`
`window.settingsState.locale` или `"ru"`.

#### `clipSrc(id)` → `string | null`
`VOICE_CLIPS[currentLocale()][id]` или `null`. На русский не откатывается.

#### `stopClip()` → `undefined`
Обнуляет `clipAudio`, ставит элемент на паузу и в начало. `onEnd` не зовёт и шину не
отпускает: `finish` после этого видит чужой `clipAudio` и молчит. Это `stopFn` записи в
`VoiceBus`.

#### `playClip(id, opts)` → `boolean`
`false`, если записи нет. Иначе захват `"sample"` с перебиванием, `hardStop()`, новый
`<audio>` через `document.createElement` (`preload = "auto"`), маршрут через граф или
громкостью элемента (см. «Как это работает»), `onplay` → `opts.onStart`, `play()`;
отказ `play()` → `finish`. Возвращает `true`, не дожидаясь начала звука. Нейроголос, если
он ещё качается, не останавливает (см. «Подводные камни»).

#### `finish()` (внутри `playClip`) → `undefined`
Конец записи (`onended`, `onerror`, отказ `play()`): если элемент всё ещё текущий —
`clipAudio = null`, `VoiceBus.releaseIf("sample")`, `opts.onEnd()`.

### `03-alice-voice.js` — нейроголос

#### `neuralFits()` → `boolean`
`NeuralVoice` загружен и `NeuralVoice.fits(currentLocale())` — сервер может прочесть этот
язык. До первого `check()` (2,5 с после загрузки) — `false`.

#### `stopNeural()` → `undefined`
`neuralLine++` (старые колбэки строки становятся чужими) и `NeuralVoice.stop()`.

#### `speakNeural(str, opts)` → `true`
`stopClip()`, `hardStop()`, `stopNeural()`, запоминает номер строки, ставит
`speaking`/`currentText` и зовёт `NeuralVoice.speak()` с `mood`, `lang`, `volume`
(по умолчанию 0,95), `onStart`. Свой `onEnd(natural)`: для своей строки сбрасывает флаги и
зовёт `opts.onEnd` только при естественном конце. Если `NeuralVoice.speak()` вернул
`false` для всё ещё своей строки — `speakSynth(str, opts)`, а если и тот не смог —
`opts.onEnd()`.

### `03-alice-voice.js` — публичный объект

#### `available` (геттер) → `boolean`
Есть `speechSynthesis` или `neuralFits()`. Наличие записей не учитывает.

#### `isSpeaking()` → `boolean`
`speaking || clipAudio` — строка синтеза или нейроголоса в полёте (включая время
ожидания ответа сервера) или играет запись.

#### `hasClip(id)` → `boolean`
Есть ли запись реплики на текущем языке. Не используется.

#### `speak(text, opts)` → `boolean`
Порядок решения — в «Как это работает». `opts`: `clip` (id записи), `mood`, `pitch`,
`rate`, `volume`, `lang`, `onStart`, `onEnd`. `false` означает «голоса не будет», но
причин пять: пустой текст, у дека есть запись этого текста, та же строка уже звучит,
синтеза нет, синтез не пустили поверх записи. `speakAsAlice()` в `06` на любой `false`
печатает «браузер не дал голос».

#### `stop()` → `undefined`
Останавливает все три пути: запись, нейроголос, синтез. Отпускает `"speech"` и, если
играла запись, `"sample"`. `onEnd` строки не зовётся.

### `19-neural-voice.js` — сервер

#### `served()` → `boolean`
Страница открыта по `http:` или `https:`.

#### `eleven()` → `boolean`
В `info` ключ ElevenLabs настроен (`elevenlabs.configured`). Пауза после ошибки
(`elevenlabs.paused`) не учитывается.

#### `piper()` → `boolean`
В `info` Piper найден (хотя бы с одним голосом).

#### `piperReads(locale)` → `boolean`
Piper найден и в `info.piperVoices` есть голос этого языка: `ru`, `en`. Таджикского голоса
у Piper нет, поэтому `tj` и `tj_col` — `false`.

#### `bases()` → `string[]`
Куда спрашивать: `""` (сервер страницы) и, если порт страницы не совпадает,
`протокол//хост:8779/` или порт из `?studio=<порт>`. Протокол берётся от страницы.

#### `ask(b)` → `Promise<object | null>`
`GET b + "api/tts/info"` без кеша; ответ с `ok: true` или `null` при любой ошибке.

#### `check(force)` → `Promise<boolean>`
Есть ли у сервера хоть один движок. Без `force` и с готовым `info` — сразу из кеша. Запрос
в полёте отдаётся повторным вызовам. С `file://` — `info = { none: true }`, `false`.
Иначе перебирает `bases()`, первый ответивший становится `base`; никто не ответил —
`info = { none: true }`.

#### `fits(locale, engine)` → `boolean`
Таблица в «Как это работает». `locale` по умолчанию `"ru"`.

### `19-neural-voice.js` — настроение и эффекты

#### `moodOf(lucidity)` → `"crit" | "loop" | "neutral" | "ok"`
Полосы LUCIDITY полигона: ≤25, ≤64, ≤84, выше.

#### `moodOfText(text)` → то же
Настроение по словам русской реплики и восклицательным знакам; облегчение раньше петли.

#### `damage()` → `0 | 0.55 | 1`
`settingsState.voiceGlitch`: `off` / `subtle` (и по умолчанию) / `heavy`.

#### `rough(ctx, buf, g)` → `AudioBuffer`
Заикание и пропуски, вырезанные в первом канале буфера. Точек `round(2 + 3g)`, между 15 и
85 % длины. В каждой точке кусок 70–120 мс повторяется 2 раза (3 — с вероятностью `g`) и
затем ещё раз в продолжении оригинала; с вероятностью `g/2` после повторов вставляется
тишина 30–70 мс. Возвращает новый моно-буфер.

#### `slice(a, b)` (внутри `rough`) → `Float32Array`
Копия куска `[a, b)` с линейными фейдами 4 мс на обоих концах.

#### `lfo(ctx, hz, depth, target, nodes)` → `undefined`
Осциллятор `hz` через гейн `depth` в `AudioParam` `target`; оба узла — в `nodes` для
разборки.

#### `wire(ctx, src, mood, g, studio, volume, nodes)` → `{ an, tail }`
Цепочка «источник → эффекты настроения → анализатор (`fftSize` 512, сглаживание 0,55) →
громкость → `Audio.getVoiceNode()`» (без `Audio` — `ctx.destination`). `studio` = строка
ElevenLabs. Возвращает анализатор и длину хвоста в секундах. Все созданные узлы — в
`nodes`.

#### `add(n)` (внутри `wire`) → `n`
Подключает узел за текущей головой цепочки и делает его головой.

#### `room(time, fb, wet)` (внутри `wire`) → `undefined`
Эхо: задержка `time` с обратной связью `fb`, влажный сигнал `wet` смешивается с сухим в
новом гейне, который становится головой.

### `19-neural-voice.js` — проигрывание

#### `speak(text, opts)` → `Promise<boolean>`
`opts`: `mood`, `lang`, `engine` (`"auto" | "elevenlabs" | "piper"`), `volume` (по
умолчанию 1), `onStart`, `onEnd(natural)`. `false` — нет текста, сервера, подходящего
движка, контекста, или запрос не удался; тогда ничего не играло и `onEnd` не зовётся.
`true` — голос начался или строку остановили, пока она готовилась. Порядок: `check()` →
`fits()` → `ctx.resume()` при необходимости → `stop()` прежней строки → `POST api/tts` →
заголовки → `decodeAudioData` → `rough()` для `crit` → `wire()` → захват `"sample"` →
`start()` → `onStart`. Шина захватывается только после ответа сервера.

#### `finish(h, natural)` → `undefined`
Разовый конец строки `h`: снимает таймер хвоста, останавливает источник, останавливает
и отключает все узлы из `h.nodes`. Если `h` — текущая строка: `cur = null` и
`VoiceBus.releaseIf("sample")`. Затем `h.onEnd(natural)`.

#### `stop()` → `undefined`
Помечает текущую строку `stopped` и завершает её с `natural = false`. Работает и пока
ответ сервера ещё не пришёл.

#### `level()` → `number` 0..1
RMS текущего звука по `getByteTimeDomainData`, в дБFS, шкала −48…0 → 0…1 — как
`VoiceMedia.level()`. Не играет — 0. Читает эквалайзер полигона каждый кадр.

#### Слушатель `DOMContentLoaded` → `undefined`
Через 2,5 с после загрузки — `check()`, чтобы демка знала о сервере до первой реплики.

#### Публичные геттеры и `isSpeaking()`

| Член | Что возвращает |
|---|---|
| `ready` | `eleven() \|\| piper()` |
| `engines` | `{ elevenlabs, piper }` — булевы |
| `status` | `{ served, elevenlabs: info.elevenlabs \| null, piper, piperVoices }` (`piperVoices` — `{}`, если сервер не ответил) — для выбора голоса в полигоне |
| `engine` | `lastEngine` |
| `note` | `lastNote` |
| `isSpeaking()` | строка готовится или играет (`cur` есть и не закончена) |

## DOM, классы, события, хранилище

| Что | Где | Подробности |
|---|---|---|
| `pointerdown`, `keydown`, `touchstart` на `window`, фаза захвата | `01`, `audioUnlockOnce` | Снимаются после первого срабатывания |
| `speechSynthesis.onvoiceschanged` | `03` | Присваивание свойства, перезаписывает чужой обработчик |
| `DOMContentLoaded` на `document` | `19` | `check()` через 2,5 с |
| `<audio>` вне документа | `03`, `playClip()` | Создаётся через `document.createElement("audio")`, в DOM не вставляется; на элементе свойство `__voiceSrc` (`SRC_KEY`) с его `MediaElementSource` |
| `GET api/tts/info` | `19`, `ask()` | `cache: "no-store"`; относительно страницы или `протокол//хост:8779/` |
| `POST api/tts` | `19`, `speak()` | JSON `{ text, mood, lang, engine }`; ответ — `audio/mpeg` (ElevenLabs) или `audio/wav` (Piper); заголовки `X-TTS-Engine`, `X-TTS-Note` (URI-кодирован). Серверная сторона — [server.md](server.md) |
| `?studio=<порт>` в адресе страницы | `19`, `bases()` | Порт `serve.js`, если страницу отдаёт другой сервер |
| `window.settingsState` | `01`, `03` (чтение) | `sfxOn`, `volMaster`, `volVoice`, `locale` |

`localStorage` не используется. CSS-классов эти файлы не ставят: класс `speaking` на окне
демки ставит и снимает `speakAsAlice()` в `06`. Флагов `window.*` не пишут.

## Подводные камни

- **`new Audio()` на странице не работает.** Голое `Audio` — движок. Второе объявление
  `Audio` верхнего уровня в любом файле — `SyntaxError`, и тот файл не выполнится.
  Проверка `typeof Audio !== "undefined"` всегда истинна (родной конструктор тоже
  определён), поэтому проверять надо метод: `Audio.getContext`. Прямые вызовы вроде
  `Audio.playOpen()` в `11` упадут, если `01-audio.js` убрать из `index.html`.
- **`stopMusic()` глушит только на 0,9 с.** Петля планируется целиком на 13,3 с вперёд, а
  ноты не запоминаются. Через 900 мс шина возвращает громкость, и недоигранная часть
  текущей петли звучит снова. По коду это должно быть слышно после перехода в терминал:
  тема затихает и через секунду доигрывает оставшиеся такты петли.
- **`setMusicEnabled(true)` после `stopMusic()` снова запускает тему.** `stopMusic()`
  обнуляет `musicTimer`, но `musicEnabled` оставляет `true`. Любой `applySettings()` в деке
  и закрытие демки (`06`, `close()`) зовут `setMusicEnabled(true)` — тема загрузочного
  меню начинается заново. `17-evidence.js` обходит это громкостью (комментарий там: «re-enabling
  would START the menu theme in the deck»). Состояния «включена, но остановлена» у движка нет.
- **`ensureCtx()` не учитывает флаги.** Шины создаются с `vol.*` без умножения на
  `musicEnabled`/`sfxEnabled`; флаги применит только следующий `applyVolumes()`. Сейчас
  безопасно: `applySettings()` при загрузке создаёт контекст через `startMusic()` и сразу
  применяет флаги.
- **Разблокировка срабатывает один раз.** Слушатели снимаются после первого события, даже
  если `resume()` не удался. По HTML-спецификации `touchstart` и `pointerdown` от касания
  активацией страницы не считаются (считается `touchend`/`pointerup`), так что на телефоне
  первое касание, вероятно, контекст не будит. Дальше его будят только голосовые пути
  (`03`, `09`, `15`, `18` зовут `Audio.resume()`); до них щелчки и музыка молчат.
  Проверить на телефоне.
- **`VoiceBus` различает вид, а не владельца.** Видом `"sample"` пользуются четыре
  движка (`03`, `09`, `15`, `19`). `releaseIf("sample")` от одного отпускает шину другого,
  не останавливая его. Пример: `NeuralVoice.stop()` во время запроса к серверу (`cur` уже
  есть) отпускает шину, которую держит длинная дорожка, и синтез может заговорить поверх.
- **`stopClip()` не отпускает шину.** В `speakNeural()` после оборванной записи шина
  остаётся за `"sample"`. Если нейроголос потом не смог, `speakSynth()` получает отказ от
  `acquire("speech")`, строка молча кончается (`onEnd`), и так же отказываются все
  следующие строки синтеза — пока кто-то не захватит `"sample"` или не позовёт `stopAll()`.
- **`playClip()` не останавливает нейроголос, который ещё качается.** `stopNeural()` там
  не вызывается. Когда ответ сервера придёт, `NeuralVoice` захватит шину с перебиванием,
  оборвёт запись и прочтёт старую строку. Тот же захват после сетевого ожидания может
  оборвать и длинную дорожку `VoiceMedia`, начатую за это время.
- **Запись демки с `file://` через граф.** `playClip()` не проверяет протокол, а
  `15-voice-media.js` проверяет: в Chrome `MediaElementSource` от локального файла отдаёт
  тишину. С `file://` и уже разбуженным контекстом запись реплики демки будет немой.
  Сейчас в `VOICE_CLIPS` нет ни одного `demo.*`, поэтому не проявляется.
- **Узлы записи не отключаются.** `playClip()` подключает `MediaElementSource` и гейн к
  `voiceGain` и никогда их не отключает — элемент и два узла на каждую реплику живут до
  закрытия страницы. В `09` то же самое уже чинили (`stopCurrentVoice()`). Защита
  `a[SRC_KEY]` срабатывать не может: элемент каждый раз новый.
- **«Эффекты выкл» глушит голос неодинаково.** `voiceVolume01()` при `sfxOn === false`
  возвращает 0 — синтез речи и запись мимо графа молчат. `voiceGain` флаг эффектов не
  учитывает — запись через граф и нейроголос звучат.
- **`AliceVoice.available` не знает о записях.** Вызывающие в `06` проверяют `available`
  перед `speakAsAlice()`. Браузер без `speechSynthesis` и без `serve.js` записи демки не
  сыграет, хотя `speak()` умеет играть их без синтеза. Нужный вызов — `hasClip(id)` — есть,
  но не используется.
- **`AliceVoice.speak()` нельзя заставить говорить синтезом.** Если `neuralFits()`, строка
  уйдёт в нейроголос. Полигон при выборе «WEB SPEECH» зовёт `AliceVoice.speak()` и
  получает ElevenLabs или Piper с подписью «WEB SPEECH»; при отказе нейроголоса в полигоне
  строка запрашивается у сервера второй раз.
- **Синтез всегда выбирает русский голос.** `pickVoice()` язык интерфейса не смотрит,
  `speakAsAlice()` и полигон `lang` не передают — в `en` английский текст читает русский
  голос с `u.lang = "ru-RU"`.
- **`moodOfText()` понимает только русский.** Реплики на `en`, `tj`, `tj_col` получают
  `crit` только за «!!», иначе `neutral`.
- **«Глитч голоса: выкл» не выключает настроение.** При `g = 0` пропадают заикание и
  часть глубины LFO, но тремоло, фильтры, эхо и сдвиг `playbackRate` у Piper остаются.
- **Кеш `info` вечный.** Если `serve.js` не ответил на первый `check()`, `info = { none: true }`
  до `check(true)` — его зовёт только полигон при открытии. Демка до этого говорит
  синтезом.
- **`ask("")` — относительный адрес.** `api/tts/info` считается от пути страницы; страница
  не в корне сервера спросит не тот адрес. Запасной адрес на :8779 берёт протокол
  страницы — со страницы по HTTPS он уйдёт на `https://хост:8779/`.
- **`NeuralVoice.speak()` ждёт `ctx.resume()`.** По спецификации Web Audio промис
  `resume()` без активации страницы откладывается до разрешения, так что строка до первого
  жеста может подвиснуть.
- **Фейды в `rough()` только на копиях.** Оригинал режется без фейда, поэтому на стыке
  «оригинал → копия» сигнал прыгает к нулю, а на стыке «копия/тишина → оригинал» — от нуля.
  Комментарий обещает, что «the cuts do not click», но защищены только края копий.
- **Порядок в `acquire()`.** Владелец обнуляется до вызова старой остановки. На этом
  держится то, что остановки (`stopCurrentVoice()`, `finish()` в `19`) могут сами звать
  `releaseIf()` без вреда. Не менять порядок.
- **Эпоха синтеза.** Любой новый путь, который останавливает синтез, должен идти через
  `hardStop()`: прямой `synth.cancel()` без `epoch++` даст `onerror` старого куска, и
  `pump()` продолжит строку.
