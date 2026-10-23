/* ============================================================
   TERMINAL: SHATTERED — slides
   ------------------------------------------------------------
   The pitch deck itself: six slides in four locales.

   Part 2/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    /* ============================================================
       SLIDES DATA
       ============================================================ */
    /* ============================================================
       SLIDES DATA — per-locale
       ------------------------------------------------------------
       SLIDES_BY_LOCALE.ru is the canonical Russian deck.
       SLIDES_BY_LOCALE.en mirrors it in English. The renderSlide()
       code reads from SLIDES, which is rebound by applyLocale().
       Alice voice lines are NOT translated here — her audio is in
       Russian and the text in ALICE_*_LINES must match the audio.
       ============================================================ */
    const SLIDES_BY_LOCALE = {
        ru: [
        {
            id: "SLIDE_00",
            title: "ВЫЗОВ СИСТЕМЕ",
            sub:   "// паралич автокомплита vs реверс-дебаггинг под давлением",
            body: `
<p><strong>Автокомплит пишет код быстрее, чем студент успевает его прочитать.</strong> Курсовая собирается из подсказок, проект компилируется с первого раза, диплом защищён. Потом он открывает чужой модуль на сорок тысяч строк, ловит <code>SIGSEGV</code> и садится смотреть в экран. gdb он не запускал ни разу, core dump видит впервые. Через минуту он жмёт Tab и ждёт подсказки.</p>

<p>Мы называем это <strong>параличом автокомплита</strong>. На первой работе с него спросят обратный навык — <strong>реверс-дебаггинг под давлением</strong>: взять модуль, который писал кто-то другой, построить гипотезу и проверить её, пока рядом стоит тимлид. В учебном плане такого предмета нет.</p>

<div class="contrast">
    <div class="pane old">
        <h3>// СТАТУС-КВО :: КАК УЧАТ C++ СЕЙЧАС</h3>
<pre class="ascii">
$ g++ student.cpp -o student
$ ./student
Segmentation fault (core dumped)
$ _
</pre>
        <ul>
            <li>Tab, Tab, Enter — задача закрыта за пятнадцать секунд</li>
            <li>стек трейс не читают: перегенерируют функцию целиком</li>
            <li>«скомпилировалось — значит работает»</li>
            <li>первый настоящий segfault — уже на проде, в три часа ночи</li>
        </ul>
    </div>
    <div class="pane new">
        <h3>// TERMINAL: SHATTERED :: КАК У НАС</h3>
<pre class="ascii blood">
$ ./vault_walk
[ heap ]  resident: 96 KB ─► 1.4 MB
[ panic ] heap exhausted :: bad_alloc
[ ALICE ] нейкон... я тону...
SIGSEGV  ::  segmentation fault
</pre>
        <ul>
            <li>твоя ошибка гасит свет в комнате, где ты стоишь</li>
            <li>компилятор называет строку и причину</li>
            <li>подсказать некому: код чужой, автор — ты сам до амнезии</li>
            <li>чинишь систему, которая тебя не пускает</li>
        </ul>
    </div>
</div>

<div class="callout"><strong>Segfault здесь видно глазами.</strong> Утечка гасит свет. Битый индекс расставляет опоры там, где их не ставили, а перепутанные ветки <code>if</code>/<code>else</code> загоняют дверь в цикл загрузки. Пролистать ошибку игрок не может: он стоит внутри неё.</div>

<p><strong>Дальше:</strong> 01 — цифры по пробелу в базе · 02 — три уровня и живая демка прямо в этом браузере · 03 — Элис: локальная модель, ноль серверов · 04 — реверс-дебаггинг как предмет · 05 — деньги и роадмап.</p>

<details class="spk"><summary>// speaker notes :: открытие</summary><div class="spk-body">
<p><strong>Первая фраза:</strong> «Спросите джуна написать функцию — напишет за минуту. Дайте ему чужую сломанную — сядет и будет смотреть».</p>
<p><strong>Показать левую панель:</strong> так выглядит вся обратная связь, которую студент получает сегодня. Одна строка. Ни причины, ни следующего шага.</p>
<p><strong>Показать правую:</strong> та же ошибка у нас. Свет погас, дверь ушла в цикл, компилятор назвал строку и причину.</p>
<p><strong>Тезис, который надо унести:</strong> писать код автокомплит уже научил. Мы учим <em>читать</em> чужой сломанный код — навык, который автокомплит не закрывает.</p>
<p><em>Если спросят «а чем это не игра ради игры»:</em> слайд 05, дашборд для вуза. Держать наготове.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_01",
            title: "СМЕРТЬ БАЗОВЫХ ЗНАНИЙ",
            sub:   "// ДИАГНОЗ: эпидемия зависимости от автогенераторов кода",
            body: `
<p><strong>Код появляется быстрее, чем понимание.</strong> Нажал Tab — получил рабочую функцию. Она собралась, тесты зелёные, работу приняли. Спросить, почему она работает, было некогда; когда она сломается, спрашивать станет поздно.</p>

<div class="statgrid">
    <div class="statcard"><span class="lbl">Пишут код с ИИ</span><span class="val">74%</span><span class="unit">студентов IT · наша оценка по опросам</span></div>
    <div class="statcard"><span class="lbl">Плавают в указателях</span><span class="val">~80%</span><span class="unit">после первого курса C++</span></div>
    <div class="statcard"><span class="lbl">Не читают core dump</span><span class="val">~90%</span><span class="unit">джунов первого года</span></div>
    <div class="statcard"><span class="lbl">Курсов по чужому легаси</span><span class="val">0</span><span class="unit">в типовой программе</span></div>
</div>

<div class="callout"><strong>Тренажёр выдаёт чистую задачу: новую, одну и свою.</strong> Прод выдаёт чужой модуль с легаси, соглашениями предыдущей команды и комментарием, который врёт. На LeetCode такой задачи не встретишь.</div>

<p>Ключевые понятия, которые ученики «знают» по учебнику, но не <em>чувствуют</em>:</p>

<pre class="ascii">
<span class="lbl">// glossary :: что внутри пропасти</span>
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │   POINTER    │   │ MEMORY LEAK  │   │     NULL     │
 │      ↓       │   │  ░░ → ▓▓██   │   │   void *0    │
 │   0xDEADBEEF │   │   ▒▒▓▓██▓▓   │   │   ───────►   │
 │   addr lost  │   │   void grows │   │    crash     │
 └──────────────┘   └──────────────┘   └──────────────┘
</pre>

<p class="codeblock">// «утечка? какая утечка? оно же запустилось…»
char* ptr = new char[1024];
// <span style="color:var(--warn)">delete[] ptr;   ← эта строка никогда не будет написана.</span>
// <span style="color:var(--blood)">MEMORY_LEAK : +1024 байта на каждый вызов · VOID растёт.</span></p>

<div class="callout green"><strong>Мы выдаём чужой код, который уже сломан, и последствия, которые видно.</strong> Семь регионов, семь классов ошибок, у каждого — своя физическая метафора в комнате. Починил — комната ответила. Не починил — тоже ответила.</div>

<details class="spk"><summary>// speaker notes :: диагноз</summary><div class="spk-body">
<p><strong>Оговорка про цифры — сказать самому, до вопроса:</strong> это наша оценка по открытым опросам, не наше исследование. Порядок величины важен, точность — нет.</p>
<p><strong>Главная мысль:</strong> пользоваться ИИ надо, и мы это говорим вслух. Вместе с ним из курса исчезло упражнение, где приходилось разбираться самому, — отладка своей же ошибки.</p>
<p><strong>Если в зале преподаватель:</strong> спросить, сколько часов в его курсе отведено чтению чужого кода. Обычно отвечают «нисколько». В эту дыру мы и встаём.</p>
<p>Не говорить «страх — лучший учитель». Говорить: последствие, которое видно, запоминается; строчка в консоли — нет.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_02",
            title: "ВЫБОР СЛОЖНОСТИ = ВЫБОР ЦЕНЫ",
            sub:   "// ИГРОК САМ РЕШАЕТ, СКОЛЬКО ОН ГОТОВ УЗНАТЬ.",
            body: `
<p><strong>Сложность ≠ номер главы.</strong> Она <em>не растёт с уровнем</em> — её <strong>выбирает сам игрок до старта.</strong> Один и тот же сюжет — три разных кадра восприятия. Чем глубже залез — тем больше деталей и тем больше расплата.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag" style="background:rgba(110,255,179,0.16);color:var(--good);border:1px solid rgba(110,255,179,0.45)">EASY :: PYTHON-FRIENDLY · «знакомство»</span><strong>Половина сюжета.</strong> Часть сцен пропущена, пугалок мало, GC прикрывает все ошибки. Концовка <em>«ты ушёл, не разобравшись»</em>. Подходит школьникам и тем, кому страшно.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,196,107,0.18);color:var(--amber);border:1px solid rgba(255,196,107,0.45)">MEDIUM :: C++ · «погружение»</span><strong>Большая часть сюжета.</strong> Появляются <code>new</code> / <code>delete</code>, утечки заливают комнаты тьмой, призраки уже трогают экран. Концовка <em>с пробелами</em> — часть архива Элис всё ещё закрыта.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,51,51,0.18);color:var(--blood);border:1px solid rgba(255,51,51,0.45)">HARD :: PURE C · «полная правда»</span><strong>Весь сюжет, все пугалки, голос Элис.</strong> Только <code>malloc</code> / <code>free</code>. <em>Segfault</em> стирает прогресс эпизода. Это та концовка, ради которой игра написана.</div>
</div>

<div class="callout amber"><strong>Игрок выбирает не «удобство», а — сколько он хочет знать.</strong> Он может пройти на EASY и услышать «удобную сказку». Может включить HARD и получить настоящий финал, со всеми обрывами голоса и потерями. Это и есть мотивация учиться — не уровни, а <em>любопытство.</em></div>

<p>Каждый режим даёт свой набор инструментов и свой набор страхов:</p>
<pre class="ascii blood">
<span class="lbl">// ascii :: что игрок встретит в каждом режиме</span>
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │       EASY       │   │      MEDIUM      │   │       HARD       │
 │      Python      │   │       C++        │   │        C         │
 │   все подсказки  │   │   подсказки реже │   │   без подсказок  │
 │   ── мягкие сбои │   │   ▒▒ геометрия   │   │   ╳╳ голос Элис  │
 │   ── без ответов │   │   ── полуправда  │   │   ── вся правда  │
 └──────────────────┘   └──────────────────┘   └──────────────────┘
</pre>

<div class="demo-cta-wrap">
    <p class="demo-cta-lead">// нажми и попробуй <strong>сам</strong> — это <em>не запись</em>, это маленькая отдельная игра в браузере. ты очнёшься <strong>от первого лица</strong> в пустом пространстве, сам дойдёшь до терминала, увидишь загрузку ОС — и дальше уже будешь вводить команды, а призраки придут на твои ошибки.</p>
    <button type="button" class="demo-cta-btn" id="demoCtaBtn" onclick="window.__openDemoGame && window.__openDemoGame('slide02')">
        <span class="demo-cta-icon">▶</span>
        <span class="demo-cta-label">ЗАПУСТИТЬ ДЕМО-ИГРУ</span>
        <span class="demo-cta-sub">// открывается отдельно · поддержка EASY / MEDIUM / HARD · ESC для выхода</span>
    </button>
    <p class="demo-cta-note">если на твоём устройстве есть TTS — на HARD Элис заговорит вживую. на EASY/MEDIUM голоса не будет, только текст и глитчи.</p>
</div>

<details class="spk"><summary>// speaker notes :: как обыграть это на сцене</summary><div class="spk-body">
<p><strong>Отдать мышь.</strong> «Это не запись и не видео. Это игра, она уже загружена в этом браузере. Кто попробует?»</p>
<p>Один из жюри (или ты сам) жмёт <strong>▶ ЗАПУСТИТЬ ДЕМО-ИГРУ</strong>. Презентация уходит в боковую часть, открывается отдельный экран: выбор сложности → <em>пробуждение от первого лица в пустоте</em> (вдали глючит дверь, справа горит терминал) → игрок сам доходит до терминала и включает его → загрузка ОС с ядром и графической оболочкой → и только теперь командная строка. Игрок вводит команды. Стоит ему промахнуться — экран рвёт, выползает призрак, на HARD ещё и голос Элис ломается синтезом речи. Ошибка игрока становится событием на экране за секунду, и это ровно тот механизм, ради которого всё сделано.</p>
<p><strong>Не кликать самому.</strong> Эффект держится на том, что ломают её они.</p>
<p><strong>Что показать обязательно, если время жмёт:</strong> нажать ▶ ЗАПУСТИТЬ, ничего не исправив, — и показать, что компилятор называет строку и причину, а комната ломается в форме самой ошибки. Тридцать секунд, весь смысл продукта.</p>
<p><em>Работает офлайн.</em> Если на площадке упадёт Wi-Fi — демка не заметит.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_03",
            title: "ALICE_CORE :: АВТОНОМНЫЙ ИИ",
            sub:   "// QWEN2.5-CODER ЧЕРЕЗ LLAMA.CPP · $0 СЕРВЕРОВ · РАБОТАЕТ БЕЗ WI-FI",
            body: `
<p><strong>Элис работает на <em>Qwen2.5-Coder</em> в формате <strong>GGUF</strong>, запущенной через <strong>llama.cpp</strong> прямо на машине игрока.</strong> Ключа и аккаунта она не требует, сеть ей не нужна.</p>

<p><strong>Серверные затраты — $0.</strong> Инференс идёт на CPU игрока, счёт за токены не приходит, и юнит-экономика держится ровной, сколько бы человек ни играло. <strong>Площадка не важна:</strong> хакатон без Wi-Fi, аудитория с фильтрацией, ноутбук жюри без интернета — демка ведёт себя одинаково. <strong>Данные студента остаются на его машине,</strong> поэтому вузу нечего согласовывать: наружу не уходит ни один байт.</p>

<div class="statgrid">
    <div class="statcard tone-plum"><span class="lbl">Модель</span><span class="val">Qwen2.5</span><span class="unit">Coder 1.5B / 7B · GGUF Q4_K_M</span></div>
    <div class="statcard tone-amber"><span class="lbl">Требуется</span><span class="val">4–8 ГБ</span><span class="unit">RAM · CPU, без GPU</span></div>
    <div class="statcard tone-slime"><span class="lbl">Голос</span><span class="val">Piper</span><span class="unit">TTS · 20 МБ · офлайн</span></div>
    <div class="statcard tone-cyan"><span class="lbl">Серверные затраты</span><span class="val">$0</span><span class="unit">инференс на машине игрока</span></div>
</div>

<pre class="ascii cyan offline-diagram" aria-label="offline architecture: no cloud, all local"><span class="lbl">// ascii :: ничего наружу — всё на машине игрока</span>
       ╔══════════════════╗            ╔═════════════════════════════╗
       ║   ✕ INTERNET     ║   blocked  ║  player machine   (offline) ║
       ║  ┌────────┐      ║ ◄════╳═════╣                             ║
       ║  │  ☁ API │ ╳   ╳║            ║   ┌─────────────────────┐   ║
       ║  │  ☁ DNS │ ╳   ╳║            ║   │ llama.cpp · Qwen2.5 │   ║
       ║  │  ☁ key │ ╳   ╳║            ║   │  ├─ Q4_K_M weights  │   ║
       ║  └────────┘      ║            ║   │  └─ 4..8 GB RAM     │   ║
       ║   ✕ cloud         ║            ║   └─────────┬───────────┘   ║
       ║   ✕ telemetry     ║            ║             ▼               ║
       ║   ✕ tracking      ║            ║   ┌─────────────────────┐   ║
       ╚══════════════════╝            ║   │ piper TTS · ru-ru   │   ║
                                       ║   │ +Web Audio glitch fx│   ║
        no DNS · no API · no cloud     ║   └─────────┬───────────┘   ║
                                       ║             ▼               ║
                                       ║   ░░░  Alice speaks  ░░░    ║
                                       ╚═════════════════════════════╝
</pre>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">слой 1 :: inference engine</span>Qwen2.5-Coder через llama.cpp, латентность 2–8 секунд, CPU-only.</div>
    <div class="tl-step"><span class="tl-tag">слой 2 :: code analysis pipeline</span>Код парсится <em>до</em> модели: тип ошибки, серьёзность, контекст модуля → точные сюжетные подсказки.</div>
    <div class="tl-step"><span class="tl-tag">слой 3 :: lucidity → промпт</span><code>lucidity 0..100</code> — не полоска в интерфейсе, а <strong>параметр, который собирает системный промпт</strong>. Ниже 20 модели выдаётся инструкция ронять слова, путать регистры и обрываться на полуфразе; к 90 — говорить целыми предложениями и вспоминать то, что игрок починил. Одна модель, разное состояние.</div>
    <div class="tl-step"><span class="tl-tag">слой 4 :: memory injection</span>Каждый починенный модуль = «воспоминание» в context window. <strong>Элис помнит то, что вы решили вместе.</strong></div>
</div>

<p class="codeblock"><span style="color:var(--warn)">// LUCIDITY 12%   «0x00A... хол... нейкон... delete[]... я не... 0xDEAD...»</span>
<span style="color:var(--warn)">// LUCIDITY 45%   «нейкон, в строке 7 — утечка. деструктор пустой. сделай это.»</span>
<span style="color:var(--bone)">// LUCIDITY 89%   «...нейкон. я вспомнила, почему закрыла доступ к ядру.»</span></p>

<div class="callout green"><strong>Lucidity считается из состояния мира, а не из сюжетного флага.</strong> Починенные регионы поднимают его, аномалии — роняют. Поэтому её связность — это показание прибора: по тому, как она говорит, слышно, в каком состоянии система. <em>Читаемость её речи и есть индикатор прогресса.</em></div>

<details class="spk"><summary>// speaker notes :: архитектура</summary><div class="spk-body">
<p><strong>Числа, которые надо назвать вслух:</strong> Qwen2.5-Coder, GGUF Q4_K_M, 4–8 ГБ RAM, CPU без GPU, латентность 2–8 с, серверные затраты — ноль.</p>
<p><strong>Если сведут к «сэкономили на API»:</strong> локальный запуск снимает ещё два риска. Чужой сервис не упадёт посреди защиты, и вузу не придётся согласовывать передачу студенческих данных наружу. Второй пункт для вуза обычно решающий.</p>
<p><strong>Честная граница — сказать самому:</strong> в браузерной демке, которую вы сейчас щёлкали, LLM не крутится. Там детерминированная логика и записанный голос. Локальная модель — это сборка на десктопе; браузерная версия существует, чтобы её можно было открыть с QR-кода без установки.</p>
<p><strong>Если спросят про звук:</strong> Web Audio, единая мастер-шина, реплики режутся фильтрами и дропаутами по состоянию мира. Голос — Piper, 20 МБ, офлайн.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_04",
            title: "ТЕРМИНАЛ СОПРОТИВЛЯЕТСЯ",
            sub:   "// ВЗЛОМАЙ СОБСТВЕННЫЙ КОД ЗАЩИТЫ",
            body: `
<p><strong>Терминал работает против игрока.</strong> До амнезии Нейкон сам закрыл доступ к критическим модулям. Теперь его собственный код <em>не пускает его внутрь</em>, комментарии врут, а имена переменных ничего не значат.</p>

<p>Это и есть <strong>реверс-дебаггинг</strong>. Войти в чужую систему без документации, разобраться, что она делает, починить одно место и не сломать соседнее. С этого начинается стажировка в индустрии; в учебном плане такого предмета нет.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">тип 1 :: OBFUSCATED LOCK</span>XOR-трюки и битовые маски. Код работает и делает <em>не то, что написано в комментарии</em>.</div>
    <div class="tl-step"><span class="tl-tag">тип 2 :: VOID CORRUPTION</span>Символы подменяются в реальном времени. Комментарии лгут. Переменные становятся hex. <strong>Найди оригинал под слоем шума.</strong></div>
    <div class="tl-step"><span class="tl-tag">тип 3 :: ANTI-ALICE FIREWALL</span>Элис заблокирована от чтения модулей. Игрок снимает флаги доступа — пишет правильный <code>chmod</code>-эквивалент.</div>
    <div class="tl-step"><span class="tl-tag">тип 4 :: PHANTOM FUNCTIONS</span>В коде вызовы функций, <em>которых не существует</em> — дыры в памяти Элис. Реализуй их по поведению окружения.</div>
</div>

<p class="codeblock">// [VOID_CORRUPTED] найдено в старых логах нейкона
bool verifyAccess(const char* token) {
    unsigned int hash = 0xDEAD;
    while (*token)
        hash ^= (hash &lt;&lt; 5) + (*token++) + (hash &gt;&gt; 2);
    return hash == getExpectedHash();   <span style="color:var(--blood)">// ← функция не существует.</span>
}
// ЗАДАЧА: реализуй getExpectedHash() так, чтобы Элис прошла.</p>

<div class="callout amber"><strong>Из кресла эти задачи не решаются.</strong> Предел продувки выбит на табличке у клапана, генерируется заново на каждый запуск и не лежит ни в одном файле образа. Нужно число — встань и дойди. Шесть шагов из пятнадцати игрок проходит ногами.</div>

<details class="spk"><summary>// speaker notes :: перевод на язык жюри</summary><div class="spk-body">
<p><strong>Не говорить</strong> «герой с амнезией взламывает свой код» — это звучит как сюжет игры. <strong>Говорить:</strong> «мы тренируем чтение чужого легаси — навык, с которого начинается первая работа и которого нет в программе».</p>
<p><strong>Пример, который заходит:</strong> задача про предохранитель. Число выбито на табличке в комнате, генерируется заново на каждый запуск, в файлах образа его нет. Подобрать его нельзя, нагенерировать тем более. Игрок встаёт из-за стола и идёт снимать показание.</p>
<p><strong>Про амнезию — одна фраза:</strong> это способ сделать «чужой код» своим собственным. Оправдания «мне дали плохой проект» не остаётся.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_05",
            title: "РОАДМАП & БИЗНЕС",
            sub:   "// KICKSTARTER $18 000 · B2C ЭПИЗОДЫ · B2B ДАШБОРД ДЛЯ ВУЗОВ",
            body: `
<p><strong>Две выручки с одного продукта.</strong> Розница платит за сюжет, вуз — за то, что видно в дашборде. Эпизод для студента и отчёт для преподавателя собираются из одних и тех же событий: какую ошибку сделал, сколько попыток занял регион, читал ли подсказку.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">EP. 0 — «пробуждение» // MVP · бесплатно</span>Амнезия, первый контакт, базовый C++: память, указатели, деструкторы. 2–3 ч. <em>Доказательство концепта.</em></div>
    <div class="tl-step"><span class="tl-tag">EP. 1 — «карантинная зона» // 5–8 $</span>Void-монстры, STL, итераторы, умные указатели. <strong>Элис начинает вспоминать.</strong> 6–8 ч.</div>
    <div class="tl-step"><span class="tl-tag">EP. 2 — «протокол алисы» // 8–10 $</span>Многопоточность, мьютексы, deadlock. <em>Элис на грани.</em> Развилка сюжета. 8–12 ч.</div>
    <div class="tl-step"><span class="tl-tag">EP. 3 — «измерение ноль» // 10–12 $</span>Шаблоны, метапрограммирование, RAII. Несколько концовок по статистике кода.</div>
</div>

<div class="statgrid">
    <div class="statcard tone-cyan"><span class="lbl">Цель Kickstarter</span><span class="val">$18 000</span><span class="unit">EP. 0 + EP. 1 · 8 месяцев</span></div>
    <div class="statcard tone-amber"><span class="lbl">Breakeven</span><span class="val">2 500</span><span class="unit">копий на эпизод</span></div>
    <div class="statcard tone-plum"><span class="lbl">B2B: лицензия вузу</span><span class="val">$0</span><span class="unit">игра бесплатна · платный дашборд</span></div>
    <div class="statcard tone-slime"><span class="lbl">Платформы</span><span class="val">PC</span><span class="unit">win / linux · офлайн</span></div>
</div>

<div class="edtech">
    <h3>// B2B :: ДАШБОРД МЕТРИК ДЕБАГГИНГА — то, за что платит вуз</h3>
    <div class="kpi">
        <div class="cell tone-cyan"><span class="lbl">Попыток до починки</span><span class="v">на регион</span></div>
        <div class="cell tone-amber"><span class="lbl">Классы ошибок</span><span class="v">12+</span></div>
        <div class="cell tone-plum"><span class="lbl">Выгрузка группы</span><span class="v">PDF / CSV</span></div>
        <div class="cell tone-slime"><span class="lbl">Сама игра</span><span class="v">$0</span></div>
    </div>
    <div class="bars">
        <div class="bar"><span class="name">Memory mgmt (new/delete, RAII)</span><span class="track"><span class="fill" style="--end:72%"></span></span><span class="pct">72%</span></div>
        <div class="bar tone-cyan"><span class="name">Pointer arithmetic</span><span class="track"><span class="fill" style="--end:58%"></span></span><span class="pct">58%</span></div>
        <div class="bar tone-amber"><span class="name">STL containers &amp; iterators</span><span class="track"><span class="fill" style="--end:64%"></span></span><span class="pct">64%</span></div>
        <div class="bar tone-plum"><span class="name">Concurrency &amp; deadlocks</span><span class="track"><span class="fill" style="--end:34%"></span></span><span class="pct">34%</span></div>
        <div class="bar tone-slime"><span class="name">Big-O complexity reasoning</span><span class="track"><span class="fill" style="--end:46%"></span></span><span class="pct">46%</span></div>
        <div class="bar"><span class="name">Reverse-debugging legacy</span><span class="track"><span class="fill" style="--end:28%"></span></span><span class="pct">28%</span></div>
    </div>
    <p style="margin-top:10px;font-size:11px;color:var(--ash);letter-spacing:0.08em;">// показатель = средняя точность группы по теме на финале эпизода. Преподаватель видит, где просело, и назначает модуль. Это то, чего не даёт ни один тренажёр: не «решил / не решил», а <em>сколько попыток и какого класса были ошибки</em>.</p>
</div>

<div class="qr-block" data-qr-block>
    <div class="qr-slot" data-qr-slot id="qrSlotMain">
        <span class="corner-tr"></span>
        <span class="corner-bl"></span>
        <div class="qr-hint">
            <img src="assets/qr-terminal-shattered.png" alt="QR code to demo game">
        </div>
    </div>
    <div class="qr-caption">
        <h4>// scan &amp; play yourself</h4>
        <p>После доклада жюри сканирует код — и в следующие 30 секунд уже сами кликают по слайдам, переключают локаль RU / EN / TJ, дёргают <strong style="color:var(--cyan)">▶ RUN</strong> в плейграунде, слышат, как «ломается» Элис.</p>
        <p>Их не нужно убеждать словами — пусть они <em>сами проживут</em> то, о чём ты только что говорил. <span class="qr-url">terminal-shattered.crystalcore.studio</span></p>
    </div>
</div>

<div class="callout amber"><strong>Почему игра бесплатна для вуза.</strong> Бесплатная лицензия снимает закупку — преподаватель ставит модуль сам, без тендера и без бюджета. Платит вуз за дашборд, когда счёт идёт на группы, а отчёт нужен на бумаге. Вход через людей, а не через закупочный отдел.</div>

<div class="callout green"><strong>Дистрибуция без бюджета на рекламу.</strong> Момент, когда мир ломается в форме твоей ошибки, — готовый короткий ролик. Это единственный канал, который у нас пока есть, и мы не притворяемся, что их больше.</div>

<p class="codeblock">// final.txt
<span style="color:var(--blood)">МЫ НЕ ДЕЛАЕМ УЧЕБНИК.
МЫ ДЕЛАЕМ ВЫЖИВАНИЕ.</span>

<span style="color:var(--ash)">// TERMINAL: SHATTERED :: NEIKON & ALICE :: 2026 — 2027
// CrystalCore Studio</span></p>

<details class="spk"><summary>// speaker notes :: деньги</summary><div class="spk-body">
<p><strong>Три числа, которые надо произнести:</strong> Kickstarter — <strong>$18 000</strong> на EP. 0 и EP. 1, восемь месяцев; окупаемость — 2 500 копий на эпизод; серверные затраты — ноль, потому что модель крутится у игрока.</p>
<p><strong>Куда уходят $18 000:</strong> озвучка и звук, художник на комнаты EP. 1, восемь месяцев работы двоих. Быть готовым к разбивке — спрашивают почти всегда.</p>
<p><strong>B2B в одной фразе:</strong> «Игра для вуза бесплатна. Платят за дашборд метрик дебаггинга — за то, чтобы видеть, на каком регионе встала половина группы».</p>
<p><strong>Зачем бесплатная лицензия:</strong> она убирает закупку. Преподаватель ставит модуль на следующей неделе, без бюджета и без тендера. Деньги приходят позже и с уровня факультета.</p>
<p><strong>Если спросят про риск:</strong> главный — что вуз не купит дашборд, а розница не окупит эпизод. Отвечать прямо: EP. 0 бесплатен и существует, чтобы это проверить до того, как мы потратим чужие деньги.</p>
</div></details>
            `
        }
    ],
        en: [
        {
            id: "SLIDE_00",
            title: "CHALLENGE THE SYSTEM",
            sub:   "// autocomplete paralysis vs reverse-debugging under pressure",
            body: `
<p><strong>Autocomplete now writes code faster than a student can read it.</strong> The coursework assembles itself out of suggestions, the project compiles on the first try, the diploma is defended. Then that same person meets their first <code>SIGSEGV</code> inside someone else's 40,000-line module — and has not one move to make. No gdb, no core dump, no hypothesis. They hit Tab and wait to be told.</p>

<p>We call this <strong>autocomplete paralysis</strong>: the skill of producing code is there, the skill of reading it is not. The opposite skill is <strong>reverse-debugging under pressure</strong> — take unfamiliar broken code, form a hypothesis, test it, don't panic. That is what the first job asks for, and what no university course hands out.</p>

<div class="contrast">
    <div class="pane old">
        <h3>// STATUS QUO :: HOW C++ IS TAUGHT TODAY</h3>
<pre class="ascii">
$ g++ student.cpp -o student
$ ./student
Segmentation fault (core dumped)
$ _
</pre>
        <ul>
            <li>task solved in 15 seconds — Tab, Tab, Enter</li>
            <li>nobody reads the stack trace: they regenerate the whole function</li>
            <li>"it compiled, so it works"</li>
            <li>the first real segfault lands in production, at 3 a.m.</li>
        </ul>
    </div>
    <div class="pane new">
        <h3>// TERMINAL: SHATTERED :: OUR WAY</h3>
<pre class="ascii blood">
$ ./vault_walk
[ heap ]  resident: 96 KB ─► 1.4 MB
[ panic ] heap exhausted :: bad_alloc
[ ALICE ] neikon... I'm drowning...
SIGSEGV  ::  segmentation fault
</pre>
        <ul>
            <li>an error is not "not accepted" — it breaks the room you are standing in</li>
            <li>the compiler answers with a line and a cause, not the word "fail"</li>
            <li>nobody to ask: the code is someone else's, and that someone is you before the amnesia</li>
            <li>you are not fixing a task, you are fixing the system that locks you out</li>
        </ul>
    </div>
</div>

<div class="callout"><strong>A segfault here is not a line in a console — it is an event in the world.</strong> A leak kills the lights, a bad index plants supports where nobody put any, swapped <code>if</code>/<code>else</code> branches leave a door booting in a loop. You cannot scroll past the error: you have to look at it.</div>

<p><strong>Next:</strong> 01 — the numbers on the fundamentals gap · 02 — three difficulty modes and a live demo in this browser · 03 — Alice: local model, zero servers · 04 — reverse-debugging as a subject · 05 — money and roadmap.</p>

<details class="spk"><summary>// speaker notes :: opening</summary><div class="spk-body">
<p><strong>First line:</strong> "Ask a junior to write a function — done in a minute. Hand them someone else's broken one — they sit and stare."</p>
<p><strong>Show the left pane:</strong> this is all the feedback a student gets today. One line. No cause, no next step.</p>
<p><strong>Show the right one:</strong> the same error in our build. The lights are out, the door is looping, and the compiler named the line and the cause.</p>
<p><strong>The thesis to take away:</strong> we do not teach writing code — autocomplete already did that. We teach <em>reading</em> someone else's broken code, the one skill autocomplete does not cover.</p>
<p><em>If asked "how is this not a game for the sake of a game":</em> slide 05, the university dashboard. Keep it ready.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_01",
            title: "THE DEATH OF FUNDAMENTAL KNOWLEDGE",
            sub:   "// DIAGNOSIS: an epidemic of dependence on code autogenerators",
            body: `
<p><strong>Code arrives faster than understanding forms.</strong> Press Tab, get a working function. It builds, the tests are green, the assignment is accepted. The question "why does this work" was never asked once — and by the time it stops working, it is too late to ask and there is nobody to ask.</p>

<div class="statgrid">
    <div class="statcard"><span class="lbl">Write code with AI</span><span class="val">74%</span><span class="unit">CS students · our estimate from public surveys</span></div>
    <div class="statcard"><span class="lbl">Shaky on pointers</span><span class="val">~80%</span><span class="unit">after the first year of C++</span></div>
    <div class="statcard"><span class="lbl">Never read a core dump</span><span class="val">~90%</span><span class="unit">first-year juniors</span></div>
    <div class="statcard"><span class="lbl">Courses on someone else's legacy</span><span class="val">0</span><span class="unit">in a typical curriculum</span></div>
</div>

<div class="callout"><strong>Trainers teach writing from scratch. The job is reading what someone else wrote.</strong> LeetCode has no legacy, no foreign conventions, no comment that lies. The task is always new, clean and standalone — the exact opposite of production.</div>

<p>The core concepts students "know" from the textbook but never <em>feel</em>:</p>

<pre class="ascii">
<span class="lbl">// glossary :: what lives inside the abyss</span>
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │   POINTER    │   │ MEMORY LEAK  │   │     NULL     │
 │      ↓       │   │  ░░ → ▓▓██   │   │   void *0    │
 │   0xDEADBEEF │   │   ▒▒▓▓██▓▓   │   │   ───────►   │
 │   addr lost  │   │   void grows │   │    crash     │
 └──────────────┘   └──────────────┘   └──────────────┘
</pre>

<p class="codeblock">// "a leak? what leak? it ran fine…"
char* ptr = new char[1024];
// <span style="color:var(--warn)">delete[] ptr;   ← this line will never be written.</span>
// <span style="color:var(--blood)">MEMORY_LEAK : +1024 bytes per call · THE VOID expands.</span></p>

<div class="callout green"><strong>We give what the trainers do not: someone else's code, already broken, with consequences you can see.</strong> Seven regions, seven classes of error, each with its own physical metaphor in the room. Fix it and the room answers. Leave it and the room answers too.</div>

<details class="spk"><summary>// speaker notes :: the diagnosis</summary><div class="spk-body">
<p><strong>The caveat on the numbers — say it yourself, before the question:</strong> this is our estimate from public surveys, not our own study. The order of magnitude matters; the precision does not.</p>
<p><strong>The main point:</strong> the problem is not that students use AI. They should. The problem is that the one exercise that forced them to understand — debugging their own mistake — has disappeared.</p>
<p><strong>If there is a teacher in the room:</strong> ask how much of their course goes to reading someone else's code. The answer is almost always none. That hole is where we stand.</p>
<p>Do not say "fear is the best teacher". Say: a consequence you can see sticks, a line in a console does not.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_02",
            title: "DIFFICULTY = THE PRICE YOU PAY",
            sub:   "// THE PLAYER DECIDES HOW MUCH THEY ARE READY TO KNOW.",
            body: `
<p><strong>Difficulty ≠ chapter number.</strong> It <em>does not grow with your level</em> — the <strong>player picks it before the start.</strong> The same story, three different frames of perception. The deeper you go, the more detail you see — and the higher the price.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag" style="background:rgba(110,255,179,0.16);color:var(--good);border:1px solid rgba(110,255,179,0.45)">EASY :: PYTHON-FRIENDLY · "the introduction"</span><strong>Half of the story.</strong> Some scenes are skipped, few scares, the GC covers every mistake. Ending: <em>"you left without understanding"</em>. For school students and for anyone who is scared.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,196,107,0.18);color:var(--amber);border:1px solid rgba(255,196,107,0.45)">MEDIUM :: C++ · "the descent"</span><strong>Most of the story.</strong> <code>new</code> / <code>delete</code> appear, leaks flood the rooms with darkness, phantoms already touch the screen. Ending <em>with gaps</em> — part of Alice's archive stays locked.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,51,51,0.18);color:var(--blood);border:1px solid rgba(255,51,51,0.45)">HARD :: PURE C · "the whole truth"</span><strong>The full story, every scare, Alice's voice.</strong> Only <code>malloc</code> / <code>free</code>. A <em>Segfault</em> wipes the episode's progress. This is the ending the game was written for.</div>
</div>

<div class="callout amber"><strong>The player is not choosing "comfort" — they are choosing how much they want to know.</strong> Play EASY and hear a comfortable fairy tale. Switch to HARD and get the real finale, with every broken voice line and every loss. That is the motivation to learn — not levels, but <em>curiosity.</em></div>

<p>Each mode hands the player its own toolkit and its own set of fears:</p>
<pre class="ascii blood">
<span class="lbl">// ascii :: what the player meets in each mode</span>
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │       EASY       │   │      MEDIUM      │   │       HARD       │
 │      Python      │   │       C++        │   │        C         │
 │   hints are open │   │   hints are late │   │   no hints       │
 │   ── soft faults │   │   ▒▒ geometry    │   │   ╳╳ alice talks │
 │   ── no answers  │   │   ── half-truth  │   │   ── full ending │
 └──────────────────┘   └──────────────────┘   └──────────────────┘
</pre>

<div class="demo-cta-wrap">
    <p class="demo-cta-lead">// press it and try it <strong>yourself</strong> — this is <em>not a recording</em>, it is a small separate game running in the browser. you come round <strong>in first person</strong> in an empty space, walk to the terminal on your own feet, watch the OS boot — and only then start typing commands, with the phantoms coming for your mistakes.</p>
    <button type="button" class="demo-cta-btn" id="demoCtaBtn" onclick="window.__openDemoGame && window.__openDemoGame('slide02')">
        <span class="demo-cta-icon">▶</span>
        <span class="demo-cta-label">LAUNCH THE DEMO GAME</span>
        <span class="demo-cta-sub">// opens separately · EASY / MEDIUM / HARD supported · ESC to exit</span>
    </button>
    <p class="demo-cta-note">if your device has TTS, Alice speaks out loud on HARD. on EASY/MEDIUM there is no voice — only text and glitches.</p>
</div>

<details class="spk"><summary>// speaker notes :: how to play this on stage</summary><div class="spk-body">
<p><strong>Hand over the mouse.</strong> "This is not a recording and not a video. It is a game, already loaded in this browser. Who wants to try?"</p>
<p>One of the judges (or you) presses <strong>▶ LAUNCH THE DEMO GAME</strong>. The deck steps aside and a separate screen opens: difficulty select → <em>a first-person awakening in the void</em> (a door glitching in the distance, the terminal glowing to the right) → the player walks over and switches it on → a full OS boot, kernel and graphical shell → and only now the command line. The player types commands. One wrong move and the screen tears, a phantom crawls out, and on HARD Alice's voice breaks apart through speech synthesis. That is the ludonarrative Carpenter wrote about.</p>
<p><strong>Do not click it yourself.</strong> The whole effect rests on them being the ones who break it.</p>
<p><strong>What to show if time is short:</strong> hit ▶ LAUNCH without fixing anything, and show that the compiler names the line and the cause while the room breaks in the shape of that error. Thirty seconds, the entire product.</p>
<p><em>It runs offline.</em> If the venue's Wi-Fi dies, the demo will not notice.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_03",
            title: "ALICE_CORE :: AUTONOMOUS AI",
            sub:   "// QWEN2.5-CODER VIA LLAMA.CPP · $0 SERVERS · WORKS WITH NO WI-FI",
            body: `
<p><strong>Alice is not a script with timed lines, and not a wrapper over someone else's API.</strong> She is <em>Qwen2.5-Coder</em> in <strong>GGUF</strong> format, run through <strong>llama.cpp</strong> on the player's own machine. No keys, no account, no network.</p>

<p>Three consequences, and all three are about money and risk. <strong>Server cost is $0:</strong> inference runs on the player's CPU, the token bill never arrives, and the unit economics do not move with the number of players. <strong>The demo does not depend on the venue:</strong> a hackathon with no Wi-Fi, a filtered campus network, a judge's laptop with no connection — it behaves the same. <strong>Student data never leaves the machine:</strong> there is nothing for a university to sign off, because not one byte goes out.</p>

<div class="statgrid">
    <div class="statcard tone-plum"><span class="lbl">Model</span><span class="val">Qwen2.5</span><span class="unit">Coder 1.5B / 7B · GGUF Q4_K_M</span></div>
    <div class="statcard tone-amber"><span class="lbl">Requires</span><span class="val">4–8 GB</span><span class="unit">RAM · CPU, no GPU</span></div>
    <div class="statcard tone-slime"><span class="lbl">Voice</span><span class="val">Piper</span><span class="unit">TTS · 20 MB · offline</span></div>
    <div class="statcard tone-cyan"><span class="lbl">Server cost</span><span class="val">$0</span><span class="unit">inference on the player's machine</span></div>
</div>

<pre class="ascii cyan offline-diagram" aria-label="offline architecture: no cloud, all local"><span class="lbl">// ascii :: nothing leaves — it all runs on the player's machine</span>
       ╔══════════════════╗            ╔═════════════════════════════╗
       ║   ✕ INTERNET     ║   blocked  ║  player machine   (offline) ║
       ║  ┌────────┐      ║ ◄════╳═════╣                             ║
       ║  │  ☁ API │ ╳   ╳║            ║   ┌─────────────────────┐   ║
       ║  │  ☁ DNS │ ╳   ╳║            ║   │ llama.cpp · Qwen2.5 │   ║
       ║  │  ☁ key │ ╳   ╳║            ║   │  ├─ Q4_K_M weights  │   ║
       ║  └────────┘      ║            ║   │  └─ 4..8 GB RAM     │   ║
       ║   ✕ cloud         ║            ║   └─────────┬───────────┘   ║
       ║   ✕ telemetry     ║            ║             ▼               ║
       ║   ✕ tracking      ║            ║   ┌─────────────────────┐   ║
       ╚══════════════════╝            ║   │ piper TTS · ru-ru   │   ║
                                       ║   │ +Web Audio glitch fx│   ║
        no DNS · no API · no cloud     ║   └─────────┬───────────┘   ║
                                       ║             ▼               ║
                                       ║   ░░░  Alice speaks  ░░░    ║
                                       ╚═════════════════════════════╝
</pre>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">layer 1 :: inference engine</span>Qwen2.5-Coder via llama.cpp, latency 2–8 seconds, CPU-only.</div>
    <div class="tl-step"><span class="tl-tag">layer 2 :: code analysis pipeline</span>The code is parsed <em>before</em> the model sees it: error type, severity, module context → precise narrative hints.</div>
    <div class="tl-step"><span class="tl-tag">layer 3 :: lucidity → prompt</span><code>lucidity 0..100</code> is not a bar in the interface — it is the <strong>parameter that assembles the system prompt</strong>. Below 20 the model is instructed to drop words, mix up registers and break off mid-phrase; near 90 it speaks in whole sentences and recalls what the player repaired. One model, different states.</div>
    <div class="tl-step"><span class="tl-tag">layer 4 :: memory injection</span>Every repaired module becomes a "memory" in the context window. <strong>Alice remembers what you solved together.</strong></div>
</div>

<p class="codeblock"><span style="color:var(--warn)">// LUCIDITY 12%   "0x00A... col... neikon... delete[]... I'm not... 0xDEAD..."</span>
<span style="color:var(--warn)">// LUCIDITY 45%   "neikon, line 7 — there's a leak. the destructor is empty. do it."</span>
<span style="color:var(--bone)">// LUCIDITY 89%   "...neikon. I remembered why I locked access to the kernel."</span></p>

<div class="callout green"><strong>Lucidity is computed from the state of the world, not from a story flag.</strong> Repaired regions raise it, anomalies drop it. Her coherence is therefore an instrument reading: how she speaks tells you what state the system is in. <em>The readability of her speech is the progress bar.</em></div>

<details class="spk"><summary>// speaker notes :: architecture</summary><div class="spk-body">
<p><strong>The numbers to say out loud:</strong> Qwen2.5-Coder, GGUF Q4_K_M, 4–8 GB RAM, CPU with no GPU, latency 2–8 s, server cost zero.</p>
<p><strong>Why this is not just "we saved on the API":</strong> running locally removes three risks at once — the token bill, someone else's service going down during the pitch, and getting approval to send student data outside. For a university the third one is often what decides it.</p>
<p><strong>The honest boundary — say it yourself:</strong> the browser demo you were just clicking does not run the LLM. That build is deterministic logic and recorded voice. The local model is the desktop build; the browser version exists so it can be opened from a QR code with no install.</p>
<p><strong>If asked about the audio:</strong> Web Audio, one master bus, lines cut by filters and dropouts driven by world state. The voice is Piper, 20 MB, offline.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_04",
            title: "THE TERMINAL FIGHTS BACK",
            sub:   "// HACK YOUR OWN DEFENCE CODE",
            body: `
<p><strong>The terminal is not a tool. It is an adversary.</strong> Before the amnesia, Neikon locked the critical modules himself. Now his own code <em>will not let him in</em>, the comments lie, and the variable names mean nothing.</p>

<p>That is <strong>reverse-debugging</strong>: not "write a function", but get into someone else's system with no documentation, work out what it actually does, and fix it without breaking the rest. Every internship starts here — and no course teaches it.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">type 1 :: OBFUSCATED LOCK</span>XOR tricks and bit masks. The code works — but it does <em>not do what it looks like</em>.</div>
    <div class="tl-step"><span class="tl-tag">type 2 :: VOID CORRUPTION</span>Symbols are replaced in real time. Comments lie. Variables turn into hex. <strong>Find the original under the layer of noise.</strong></div>
    <div class="tl-step"><span class="tl-tag">type 3 :: ANTI-ALICE FIREWALL</span>Alice is blocked from reading the modules. The player strips the access flags — writes the proper <code>chmod</code>-equivalent.</div>
    <div class="tl-step"><span class="tl-tag">type 4 :: PHANTOM FUNCTIONS</span>The code calls functions <em>that do not exist</em> — holes in Alice's memory. Implement them from the behaviour of the surrounding code.</div>
</div>

<p class="codeblock">// [VOID_CORRUPTED] recovered from neikon's old logs
bool verifyAccess(const char* token) {
    unsigned int hash = 0xDEAD;
    while (*token)
        hash ^= (hash &lt;&lt; 5) + (*token++) + (hash &gt;&gt; 2);
    return hash == getExpectedHash();   <span style="color:var(--blood)">// ← this function does not exist.</span>
}
// TASK: implement getExpectedHash() so that Alice gets through.</p>

<div class="callout amber"><strong>No task can be solved from the chair.</strong> The vent limit for the fuse is stored in no file — it is stamped on a plate by the valve, and it is regenerated on every run. Want the number, get up and walk to it. Six of the fifteen tasks are solved with your feet, not the keyboard.</div>

<details class="spk"><summary>// speaker notes :: translating this for the jury</summary><div class="spk-body">
<p><strong>Do not say</strong> "an amnesiac hero hacks his own code" — that sounds like a plot summary. <strong>Say:</strong> "we train reading someone else's legacy — the skill the first job starts with and the curriculum does not have."</p>
<p><strong>The example that lands:</strong> the fuse task. The number exists only on a plate in the room, it is regenerated on every run, and it is in no file. It cannot be guessed, there is nobody to ask, and generating it is out of the question. You have to get up and read the gauge.</p>
<p><strong>On the amnesia — one sentence:</strong> it is how we make "someone else's code" your own. The excuse "they gave me a bad project" is gone.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_05",
            title: "ROADMAP & BUSINESS",
            sub:   "// KICKSTARTER $18,000 · B2C EPISODES · B2B DASHBOARD FOR UNIVERSITIES",
            body: `
<p><strong>Two revenue lines out of one product.</strong> Retail pays for the story; the university pays for what the dashboard shows. The student's episode and the teacher's report are built from the same events: which error was made, how many attempts a region took, whether the hint was opened.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">EP. 0 — "awakening" // MVP · free</span>Amnesia, first contact, basic C++: memory, pointers, destructors. 2–3 h. <em>Proof of concept.</em></div>
    <div class="tl-step"><span class="tl-tag">EP. 1 — "quarantine zone" // 5–8 $</span>Void monsters, STL, iterators, smart pointers. <strong>Alice starts to remember.</strong> 6–8 h.</div>
    <div class="tl-step"><span class="tl-tag">EP. 2 — "alice protocol" // 8–10 $</span>Threading, mutexes, deadlock. <em>Alice on the edge.</em> The story branches. 8–12 h.</div>
    <div class="tl-step"><span class="tl-tag">EP. 3 — "dimension zero" // 10–12 $</span>Templates, metaprogramming, RAII. Multiple endings driven by the player's code statistics.</div>
</div>

<div class="statgrid">
    <div class="statcard tone-cyan"><span class="lbl">Kickstarter goal</span><span class="val">$18,000</span><span class="unit">EP. 0 + EP. 1 · 8 months</span></div>
    <div class="statcard tone-amber"><span class="lbl">Breakeven</span><span class="val">2,500</span><span class="unit">copies per episode</span></div>
    <div class="statcard tone-plum"><span class="lbl">B2B: university license</span><span class="val">$0</span><span class="unit">game is free · dashboard is paid</span></div>
    <div class="statcard tone-slime"><span class="lbl">Platforms</span><span class="val">PC</span><span class="unit">win / linux · offline</span></div>
</div>

<div class="edtech">
    <h3>// B2B :: DEBUGGING METRICS DASHBOARD — what the university pays for</h3>
    <div class="kpi">
        <div class="cell tone-cyan"><span class="lbl">Attempts before the fix</span><span class="v">per region</span></div>
        <div class="cell tone-amber"><span class="lbl">Error classes</span><span class="v">12+</span></div>
        <div class="cell tone-plum"><span class="lbl">Group export</span><span class="v">PDF / CSV</span></div>
        <div class="cell tone-slime"><span class="lbl">The game itself</span><span class="v">$0</span></div>
    </div>
    <div class="bars">
        <div class="bar"><span class="name">Memory mgmt (new/delete, RAII)</span><span class="track"><span class="fill" style="--end:72%"></span></span><span class="pct">72%</span></div>
        <div class="bar tone-cyan"><span class="name">Pointer arithmetic</span><span class="track"><span class="fill" style="--end:58%"></span></span><span class="pct">58%</span></div>
        <div class="bar tone-amber"><span class="name">STL containers &amp; iterators</span><span class="track"><span class="fill" style="--end:64%"></span></span><span class="pct">64%</span></div>
        <div class="bar tone-plum"><span class="name">Concurrency &amp; deadlocks</span><span class="track"><span class="fill" style="--end:34%"></span></span><span class="pct">34%</span></div>
        <div class="bar tone-slime"><span class="name">Big-O complexity reasoning</span><span class="track"><span class="fill" style="--end:46%"></span></span><span class="pct">46%</span></div>
        <div class="bar"><span class="name">Reverse-debugging legacy</span><span class="track"><span class="fill" style="--end:28%"></span></span><span class="pct">28%</span></div>
    </div>
    <p style="margin-top:10px;font-size:11px;color:var(--ash);letter-spacing:0.08em;">// the number = the group's average accuracy on that topic at the end of the episode. The teacher sees where it dropped and assigns a module. This is what no trainer gives: not "solved / not solved", but <em>how many attempts and what class of error</em>.</p>
</div>

<div class="qr-block" data-qr-block>
    <div class="qr-slot" data-qr-slot id="qrSlotMain">
        <span class="corner-tr"></span>
        <span class="corner-bl"></span>
        <div class="qr-hint">
            <img src="assets/qr-terminal-shattered.png" alt="QR code to demo game">
        </div>
    </div>
    <div class="qr-caption">
        <h4>// scan &amp; play yourself</h4>
        <p>After the talk the jury scans the code — and within 30 seconds they are clicking through the slides themselves, switching the locale RU / EN / TJ, hitting <strong style="color:var(--cyan)">▶ RUN</strong> in the playground and hearing Alice fall apart.</p>
        <p>You don't have to convince them with words — let them <em>live through</em> what you have just described. <span class="qr-url">terminal-shattered.crystalcore.studio</span></p>
    </div>
</div>

<div class="callout amber"><strong>Why the game is free for the university.</strong> A free license removes procurement — a teacher installs the module themselves, with no tender and no budget. The university pays for the dashboard once it is counting whole groups and needs the report on paper. We come in through people, not through the purchasing department.</div>

<div class="callout green"><strong>Distribution with no ad budget.</strong> The moment the world breaks in the shape of your own error is a finished short clip. It is the only channel we have so far, and we are not pretending there are more.</div>

<p class="codeblock">// final.txt
<span style="color:var(--blood)">WE ARE NOT BUILDING A TEXTBOOK.
WE ARE BUILDING SURVIVAL.</span>

<span style="color:var(--ash)">// TERMINAL: SHATTERED :: NEIKON &amp; ALICE :: 2026 — 2027
// CrystalCore Studio</span></p>

<details class="spk"><summary>// speaker notes :: money</summary><div class="spk-body">
<p><strong>Three numbers to say out loud:</strong> Kickstarter — <strong>$18,000</strong> for EP. 0 and EP. 1, eight months; breakeven — 2,500 copies per episode; server cost — zero, because the model runs on the player's machine.</p>
<p><strong>Where the $18,000 goes:</strong> voice acting and sound, an artist for the EP. 1 rooms, eight months of work for two people. Have the breakdown ready — they ask almost every time.</p>
<p><strong>B2B in one sentence:</strong> "The game is free for the university. They pay for the debugging-metrics dashboard — for seeing where the group got stuck, not just who reached the end."</p>
<p><strong>Why the free license is strategy, not generosity:</strong> it removes procurement. A teacher can put the module in next week, with no budget. The money comes later, and from the faculty level.</p>
<p><strong>If asked about risk:</strong> the main one is that the university does not buy the dashboard and retail does not pay back the episode. Answer straight: EP. 0 is free and exists to test exactly that, before we spend anyone else's money.</p>
</div></details>
            `
        }
        ],
        tj: [
        {
            id: "SLIDE_00",
            title: "ДАҲВАТ БА СИСТЕМА",
            sub:   "// фалаҷи автокомплит vs реверс-дебаггинги зери фишор",
            body: `
<p><strong>Автокомплит кодро тезтар менависад, назар ба он ки донишҷӯ онро хонда расад.</strong> Кори курсӣ аз ишораҳо ҷамъ мешавад, лоиҳа бори аввал компилятсия мешавад, диплом ҳимоя мешавад. Баъд одам бори аввал <code>SIGSEGV</code>-ро дар модули бегонаи 40 ҳазорсатра мебинад — ва ягон усул надорад. На gdb, на core dump, на фарзия. Ӯ Tab-ро пахш мекунад ва интизори ишора мешавад.</p>

<p>Мо инро <strong>фалаҷи автокомплит</strong> меномем: маҳорати сохтани код ҳаст, маҳорати хондан нест. Маҳорати муқобил — <strong>реверс-дебаггинги зери фишор</strong>: коди бегонаи шикастаро гирифтан, фарзия сохтан, онро санҷидан ва ба ваҳм наафтодан. Маҳз ҳаминро дар кори аввал мепурсанд ва дар ягон донишгоҳ намедиҳанд.</p>

<div class="contrast">
    <div class="pane old">
        <h3>// ВАЗЪИ ИМРӮЗА :: C++-РО ЧӢ ГУНА МЕОМӮЗОНАНД</h3>
<pre class="ascii">
$ g++ student.cpp -o student
$ ./student
Segmentation fault (core dumped)
$ _
</pre>
        <ul>
            <li>масъала дар 15 сония ҳал шуд — Tab, Tab, Enter</li>
            <li>стек трейсро намехонанд: тамоми функсияро аз нав месозанд</li>
            <li>«компилятсия шуд — пас кор мекунад»</li>
            <li>аввалин segfault-и ҳақиқӣ — аллакай дар прод, соати сеи шаб</li>
        </ul>
    </div>
    <div class="pane new">
        <h3>// TERMINAL: SHATTERED :: ДАР МО ЧӢ ХЕЛ АСТ</h3>
<pre class="ascii blood">
$ ./vault_walk
[ heap ]  resident: 96 KB ─► 1.4 MB
[ panic ] heap exhausted :: bad_alloc
[ ALICE ] нейкон... ман ғарқ шуда истодаам...
SIGSEGV  ::  segmentation fault
</pre>
        <ul>
            <li>хато «ҳисоб нашуд» не — он ҳуҷраеро мешиканад, ки ту дар он истодаӣ</li>
            <li>компилятор сатр ва сабабро мегӯяд, на танҳо калимаи «fail»-ро</li>
            <li>ишорадиҳанда нест: код бегона аст, муаллифаш худи ту то амнезия</li>
            <li>на масъаларо, балки системаеро ислоҳ мекунӣ, ки туро ба дарун роҳ намедиҳад</li>
        </ul>
    </div>
</div>

<div class="callout"><strong>Segfault дар ин ҷо сатр дар консол не, балки ҳодиса дар ҷаҳон аст.</strong> Рехтани хотира рӯшноиро мекушад, индекси вайроншуда такягоҳҳоро дар ҷое мегузорад, ки касе нагузоштааст, шохаҳои омехтаи <code>if</code>/<code>else</code> дарро маҷбур мекунанд, ки давр зада бор шавад. Хаторо варақ зада гузаштан мумкин нест: ба он нигоҳ кардан лозим меояд.</div>

<p><strong>Минбаъд:</strong> 01 — рақамҳо оид ба холигии дониши асосӣ · 02 — се сатҳ ва демои зинда маҳз дар ҳамин браузер · 03 — Элис: модели маҳаллӣ, сифр сервер · 04 — реверс-дебаггинг ҳамчун фан · 05 — пул ва нақшаи роҳ.</p>

<details class="spk"><summary>// эзоҳи баромадкунанда :: оғоз</summary><div class="spk-body">
<p><strong>Ҷумлаи аввал:</strong> «Аз ҷун хоҳиш кунед функсия нависад — дар як дақиқа менависад. Ба ӯ коди бегонаи шикастаро диҳед — менишинад ва нигоҳ мекунад».</p>
<p><strong>Панели чапро нишон деҳ:</strong> тамоми алоқаи баръакс, ки донишҷӯ имрӯз мегирад, ҳамин аст. Як сатр. На сабаб, на қадами навбатӣ.</p>
<p><strong>Панели ростро нишон деҳ:</strong> ҳамон як хато дар мо. Рӯшноӣ хомӯш шуд, дар давр зада бор мешавад, компилятор сатр ва сабабро номид.</p>
<p><strong>Тезисе, ки бояд бо худ баранд:</strong> мо навиштани кодро намеомӯзонем. Инро аллакай автокомплит омӯзонд. Мо <em>хондани</em> коди бегонаи шикастаро меомӯзонем — ягона маҳорате, ки автокомплит онро намепӯшад.</p>
<p><em>Агар пурсанд «ин бозӣ барои бозӣ нест-мӣ»:</em> слайди 05, дашбоард барои донишгоҳ. Тайёр нигоҳ дор.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_01",
            title: "МАРГИ ДОНИШИ АСОСӢ",
            sub:   "// ТАШХИС: эпидемияи вобастагӣ аз ҷенераторҳои худкори код",
            body: `
<p><strong>Код тезтар пайдо мешавад, назар ба он ки фаҳмиш ташаккул ёбад.</strong> Tab-ро пахш кардӣ — функсияи кориро гирифтӣ. Он ҷамъ шуд, тестҳо сабз, кор қабул шуд. Саволи «чаро ин кор мекунад» ягон бор дода нашуд — ва дар лаҳзае, ки он аз кор мемонад, ин саволро додан дер аст ва аз касе нест.</p>

<div class="statgrid">
    <div class="statcard"><span class="lbl">Кодро бо АИ менависанд</span><span class="val">74%</span><span class="unit">донишҷӯёни IT · арзёбии мо аз рӯи пурсишҳои кушод</span></div>
    <div class="statcard"><span class="lbl">Нишондиҳандаҳоро суст медонанд</span><span class="val">~80%</span><span class="unit">баъд аз курси якуми C++</span></div>
    <div class="statcard"><span class="lbl">Core dump-ро намехонанд</span><span class="val">~90%</span><span class="unit">ҷунҳои соли якум</span></div>
    <div class="statcard"><span class="lbl">Курс оид ба коди мероси бегона</span><span class="val">0</span><span class="unit">дар барномаи маъмулӣ</span></div>
</div>

<div class="callout"><strong>Тренажёрҳо навиштанро аз сифр меомӯзонанд. Кор бошад аз хондани коди бегона иборат аст.</strong> Дар LeetCode на коди мерос ҳаст, на созишномаҳои бегона, на шарҳе, ки дурӯғ мегӯяд. Масъала ҳамеша нав, тоза ва танҳост — яъне маҳз баръакси он чи дар прод аст.</div>

<p>Мафҳумҳои калидӣ, ки донишҷӯён аз китоб «медонанд», вале <em>ҳис намекунанд</em>:</p>

<pre class="ascii">
<span class="lbl">// глоссарий :: дар дохили варта чӣ ҳаст</span>
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │   POINTER    │   │ MEMORY LEAK  │   │     NULL     │
 │      ↓       │   │  ░░ → ▓▓██   │   │   void *0    │
 │   0xDEADBEEF │   │   ▒▒▓▓██▓▓   │   │   ───────►   │
 │   addr lost  │   │   void grows │   │    crash     │
 └──────────────┘   └──────────────┘   └──────────────┘
</pre>

<p class="codeblock">// «рехтан? кадом рехтан? охир кор кард-ку…»
char* ptr = new char[1024];
// <span style="color:var(--warn)">delete[] ptr;   ← ин сатр ҳеҷ гоҳ навишта намешавад.</span>
// <span style="color:var(--blood)">MEMORY_LEAK : +1024 байт дар ҳар даъват · VOID меафзояд.</span></p>

<div class="callout green"><strong>Мо он чизеро медиҳем, ки дар тренажёрҳо нест: коди бегона, ки аллакай шикастааст, ва оқибатҳое, ки дида мешаванд.</strong> Ҳафт минтақа, ҳафт синфи хато, ҳар яке истиораи ҷисмонии худро дар ҳуҷра дорад. Ислоҳ кардӣ — ҳуҷра ҷавоб дод. Ислоҳ накардӣ — боз ҳам ҷавоб дод.</div>

<details class="spk"><summary>// эзоҳи баромадкунанда :: ташхис</summary><div class="spk-body">
<p><strong>Эзоҳ дар бораи рақамҳо — худат пеш аз савол бигӯ:</strong> ин арзёбии мо аз рӯи пурсишҳои кушод аст, на тадқиқоти мо. Тартиби бузургӣ муҳим аст, дақиқӣ — не.</p>
<p><strong>Фикри асосӣ:</strong> мушкил дар он нест, ки донишҷӯён АИ-ро истифода мебаранд. Истифода бурдан лозим аст. Мушкил дар он аст, ки ягона машқе, ки дар он фаҳмидан лозим меомад — ислоҳи хатои худӣ — нест шуд.</p>
<p><strong>Агар дар толор омӯзгор бошад:</strong> бипурс, ки дар курси ӯ ба хондани коди бегона чанд вақт ҷудо шудааст. Ҷавоб қариб ҳамеша — ҳеҷ. Ҳамин холигист, ки мо ба он меистем.</p>
<p>Нагӯ «тарс беҳтарин омӯзгор аст». Бигӯ: оқибате, ки дида мешавад, дар ёд мемонад; сатр дар консол — не.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_02",
            title: "ИНТИХОБИ ДУШВОРӢ = ИНТИХОБИ НАРХ",
            sub:   "// БОЗИНГАР ХУДАШ ҚАРОР МЕКУНАД, ЧӢ ҚАДАР ОМОДА АСТ ДОНАД.",
            body: `
<p><strong>Душворӣ ≠ рақами боб.</strong> Он <em>бо сатҳ намеафзояд</em> — онро <strong>худи бозингар пеш аз оғоз интихоб мекунад.</strong> Ҳамон як сюжет — се кадри гуногуни дарк. Ҳар қадар чуқуртар фурӯ равӣ, ҳамон қадар тафсилот бештар ва подош гаронтар.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag" style="background:rgba(110,255,179,0.16);color:var(--good);border:1px solid rgba(110,255,179,0.45)">EASY :: PYTHON-FRIENDLY · «шиносоӣ»</span><strong>Нисфи сюжет.</strong> Як қисми саҳнаҳо партофта мешаванд, тарсончакҳо каманд, GC ҳама хатоҳоро мепӯшонад. Хотима: <em>«ту рафтӣ, вале нафаҳмидӣ»</em>. Барои мактаббачагон ва онҳое, ки метарсанд.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,196,107,0.18);color:var(--amber);border:1px solid rgba(255,196,107,0.45)">MEDIUM :: C++ · «фурӯравӣ»</span><strong>Қисми зиёди сюжет.</strong> <code>new</code> / <code>delete</code> пайдо мешаванд, рехтанҳо ҳуҷраҳоро бо торикӣ пур мекунанд, арвоҳ аллакай экранро ламс мекунанд. Хотима <em>бо холигиҳо</em> — қисми бойгонии Элис пӯшида мемонад.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,51,51,0.18);color:var(--blood);border:1px solid rgba(255,51,51,0.45)">HARD :: PURE C · «ҳақиқати пурра»</span><strong>Тамоми сюжет, ҳама тарсончакҳо, овози Элис.</strong> Танҳо <code>malloc</code> / <code>free</code>. <em>Segfault</em> пешрафти эпизодро нест мекунад. Ин ҳамон хотимаест, ки бозӣ барои он навишта шудааст.</div>
</div>

<div class="callout amber"><strong>Бозингар на «қулайӣ»-ро, балки миқдори донистанашро интихоб мекунад.</strong> Ӯ метавонад EASY-ро гузарад ва «афсонаи қулай»-ро бишнавад. Метавонад HARD-ро фурӯзон кунад ва хотимаи ҳақиқиро бо ҳама шикастани овоз ва талафот бигирад. Ҳамин аст мотиватсияи омӯзиш — на сатҳҳо, балки <em>кунҷковӣ.</em></div>

<p>Ҳар режим маҷмӯи худи асбобҳо ва маҷмӯи худи тарсҳоро медиҳад:</p>
<pre class="ascii blood">
<span class="lbl">// ascii :: бозингар дар ҳар режим бо чӣ рӯ ба рӯ мешавад</span>
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │       EASY       │   │      MEDIUM      │   │       HARD       │
 │      Python      │   │       C++        │   │        C         │
 │   ишора кушода   │   │   ишора дертар   │   │   бе ишора       │
 │   ── сакталӣ нарм│   │   ▒▒ геометрия   │   │   ╳╳ овози Элис  │
 │   ── бе ҷавоб    │   │   ── нимҳақиқат  │   │   ── тамоми ҳақ  │
 └──────────────────┘   └──────────────────┘   └──────────────────┘
</pre>

<div class="demo-cta-wrap">
    <p class="demo-cta-lead">// пахш кун ва <strong>худат</strong> санҷ — ин <em>сабт нест</em>, ин бозии хурди алоҳида дар браузер аст. ту <strong>аз шахси якум</strong> дар фазои холӣ ба ҳуш меоӣ, худат то терминал мерасӣ, боркунии ОС-ро мебинӣ — ва танҳо баъд фармон медиҳӣ, арвоҳ бошад ба хатоҳои ту меоянд.</p>
    <button type="button" class="demo-cta-btn" id="demoCtaBtn" onclick="window.__openDemoGame && window.__openDemoGame('slide02')">
        <span class="demo-cta-icon">▶</span>
        <span class="demo-cta-label">БОЗИИ ДЕМОРО ОҒОЗ КУН</span>
        <span class="demo-cta-sub">// алоҳида кушода мешавад · дастгирии EASY / MEDIUM / HARD · ESC барои баромадан</span>
    </button>
    <p class="demo-cta-note">агар дар дастгоҳи ту TTS бошад — дар HARD Элис зинда гап мезанад. дар EASY/MEDIUM овоз намешавад, танҳо матн ва глитчҳо.</p>
</div>

<details class="spk"><summary>// эзоҳи баромадкунанда :: инро дар саҳна чӣ гуна бозӣ кардан</summary><div class="spk-body">
<p><strong>Мушро аз даст деҳ.</strong> «Ин сабт нест ва видео нест. Ин бозӣ аст, он аллакай дар ҳамин браузер бор шудааст. Кӣ санҷидан мехоҳад?»</p>
<p>Яке аз аъзои жюрӣ (ё худат) <strong>▶ БОЗИИ ДЕМОРО ОҒОЗ КУН</strong>-ро пахш мекунад. Презентатсия ба канор меравад, экрани алоҳида кушода мешавад: интихоби душворӣ → <em>бедорӣ аз шахси якум дар холигӣ</em> (дар дурдаст дари глитчдор, дар рост терминал месӯзад) → бозингар худаш то терминал мерасад ва онро фурӯзон мекунад → боркунии ОС бо ҳаста ва қабати графикӣ → ва танҳо ҳоло сатри фармон. Бозингар фармон медиҳад. Хато кунад — экран пора мешавад, арвоҳ мебарояд, дар HARD боз овози Элис бо синтези нутқ мешиканад. Ҳамин аст лудонарратив.</p>
<p><strong>Худат клик накун.</strong> Таъсир маҳз дар он аст, ки онро худи онҳо мешикананд.</p>
<p><strong>Агар вақт танг бошад, инро ҳатман нишон деҳ:</strong> ҳеҷ чизро ислоҳ накарда, <strong>▶ RUN</strong>-ро пахш кун — ва нишон деҳ, ки компилятор сатр ва сабабро меномад, ҳуҷра бошад дар шакли худи ҳамон хато мешиканад. Сӣ сония, тамоми маънои маҳсул.</p>
<p><em>Офлайн кор мекунад.</em> Агар дар майдонча Wi-Fi афтад — демо инро ҳис ҳам намекунад.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_03",
            title: "ALICE_CORE :: АИ-И МУСТАҚИЛ",
            sub:   "// QWEN2.5-CODER ТАВАССУТИ LLAMA.CPP · $0 СЕРВЕР · БЕ WI-FI КОР МЕКУНАД",
            body: `
<p><strong>Элис на скрипти репликаҳои соатӣ аст ва на пӯшише болои API-и бегона.</strong> Ин <em>Qwen2.5-Coder</em> дар формати <strong>GGUF</strong> аст, ки тавассути <strong>llama.cpp</strong> маҳз дар мошини бозингар корандозӣ мешавад. На калид, на аккаунт, на шабака.</p>

<p>Се оқибат, ва ҳар се — дар бораи пул ва хатар. <strong>Хароҷоти сервер — $0:</strong> инференс дар CPU-и бозингар меравад, ҳисоб барои токенҳо ҳеҷ гоҳ намеояд ва юнит-иқтисодиёт аз он вобаста нест, ки чанд нафар бозӣ мекунанд. <strong>Демо аз майдонча вобаста нест:</strong> дар хакатони бе Wi-Fi, дар аудиторияи бо филтр, дар ноутбуки жюрӣ бе интернет — якхела кор мекунад. <strong>Маълумоти донишҷӯ берун намеравад:</strong> ба донишгоҳ чизе барои мувофиқа кардан намемонад, чунки ба берун ягон байт намеравад.</p>

<div class="statgrid">
    <div class="statcard tone-plum"><span class="lbl">Модел</span><span class="val">Qwen2.5</span><span class="unit">Coder 1.5B / 7B · GGUF Q4_K_M</span></div>
    <div class="statcard tone-amber"><span class="lbl">Талаб мекунад</span><span class="val">4–8 ГБ</span><span class="unit">RAM · CPU, бе GPU</span></div>
    <div class="statcard tone-slime"><span class="lbl">Овоз</span><span class="val">Piper</span><span class="unit">TTS · 20 МБ · офлайн</span></div>
    <div class="statcard tone-cyan"><span class="lbl">Хароҷоти сервер</span><span class="val">$0</span><span class="unit">инференс дар мошини бозингар</span></div>
</div>

<pre class="ascii cyan offline-diagram" aria-label="offline architecture: no cloud, all local"><span class="lbl">// ascii :: ҳеҷ чиз ба берун намеравад — ҳама дар мошини бозингар</span>
       ╔══════════════════╗            ╔═════════════════════════════╗
       ║   ✕ INTERNET     ║   blocked  ║  player machine   (offline) ║
       ║  ┌────────┐      ║ ◄════╳═════╣                             ║
       ║  │  ☁ API │ ╳   ╳║            ║   ┌─────────────────────┐   ║
       ║  │  ☁ DNS │ ╳   ╳║            ║   │ llama.cpp · Qwen2.5 │   ║
       ║  │  ☁ key │ ╳   ╳║            ║   │  ├─ Q4_K_M weights  │   ║
       ║  └────────┘      ║            ║   │  └─ 4..8 GB RAM     │   ║
       ║   ✕ cloud         ║            ║   └─────────┬───────────┘   ║
       ║   ✕ telemetry     ║            ║             ▼               ║
       ║   ✕ tracking      ║            ║   ┌─────────────────────┐   ║
       ╚══════════════════╝            ║   │ piper TTS · ru-ru   │   ║
                                       ║   │ +Web Audio glitch fx│   ║
        no DNS · no API · no cloud     ║   └─────────┬───────────┘   ║
                                       ║             ▼               ║
                                       ║   ░░░  Alice speaks  ░░░    ║
                                       ╚═════════════════════════════╝
</pre>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">қабати 1 :: inference engine</span>Qwen2.5-Coder тавассути llama.cpp, таъхир 2–8 сония, танҳо CPU.</div>
    <div class="tl-step"><span class="tl-tag">қабати 2 :: code analysis pipeline</span>Код <em>пеш аз</em> модел таҳлил мешавад: намуди хато, вазнинӣ, контексти модул → ишораҳои дақиқи сюжетӣ.</div>
    <div class="tl-step"><span class="tl-tag">қабати 3 :: lucidity → промпт</span><code>lucidity 0..100</code> — на хатчаи интерфейс, балки <strong>параметре, ки промпти системавиро ҷамъ мекунад</strong>. Поёнтар аз 20 ба модел дастур дода мешавад, ки калимаҳоро партояд, регистрҳоро омехта кунад ва дар нимаи ҷумла бурида шавад; наздик ба 90 — бо ҷумлаҳои пурра гап занад ва он чиро, ки бозингар ислоҳ кард, ба ёд орад. Як модел, ҳолати гуногун.</div>
    <div class="tl-step"><span class="tl-tag">қабати 4 :: memory injection</span>Ҳар модули ислоҳшуда = «хотира» дар context window. <strong>Элис он чизеро дар ёд дорад, ки шумо якҷоя ҳал кардед.</strong></div>
</div>

<p class="codeblock"><span style="color:var(--warn)">// LUCIDITY 12%   «0x00A... хол... нейкон... delete[]... ман не... 0xDEAD...»</span>
<span style="color:var(--warn)">// LUCIDITY 45%   «нейкон, дар сатри 7 — рехтан. деструктор холӣ аст. инро бикун.»</span>
<span style="color:var(--bone)">// LUCIDITY 89%   «...нейкон. ман ба ёд овардам, чаро дастрасӣ ба ҳастаро бастам.»</span></p>

<div class="callout green"><strong>Lucidity аз ҳолати ҷаҳон ҳисоб мешавад, на аз парчами сюжетӣ.</strong> Минтақаҳои ислоҳшуда онро боло мебаранд, аномалияҳо — мепартоянд. Барои ҳамин пайвастагии нутқи ӯ нишондоди асбоб аст: аз тарзи гап заданаш маълум мешавад, ки система дар кадом ҳолат аст. <em>Фаҳмо будани нутқи ӯ худи нишондиҳандаи пешрафт аст.</em></div>

<details class="spk"><summary>// эзоҳи баромадкунанда :: меъморӣ</summary><div class="spk-body">
<p><strong>Рақамҳое, ки бояд бо овоз номида шаванд:</strong> Qwen2.5-Coder, GGUF Q4_K_M, 4–8 ГБ RAM, CPU бе GPU, таъхир 2–8 сония, хароҷоти сервер — сифр.</p>
<p><strong>Чаро ин «мо танҳо аз API сарфа кардем» нест:</strong> корандозии маҳаллӣ якбора се хатарро мебардорад — ҳисоб барои токенҳо, афтидани хидмати бегона дар рӯзи ҳимоя ва мувофиқа кардани интиқоли маълумоти донишҷӯён ба берун. Барои донишгоҳ банди сеюм аксар вақт ҳалкунанда аст.</p>
<p><strong>Ҳудуди ростқавлона — худат бигӯ:</strong> дар демои браузерӣ, ки шумо ҳозир клик кардед, LLM кор намекунад. Дар он ҷо мантиқи детерминистӣ ва овози сабтшуда аст. Модели маҳаллӣ — ин сохтаи десктопӣ аст; версияи браузерӣ барои он ҳаст, ки онро аз QR-код бе насб кушодан мумкин бошад.</p>
<p><strong>Агар дар бораи садо пурсанд:</strong> Web Audio, як шинаи мастери ягона, репликаҳо вобаста ба ҳолати ҷаҳон бо филтрҳо ва дропаутҳо бурида мешаванд. Овоз — Piper, 20 МБ, офлайн.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_04",
            title: "ТЕРМИНАЛ МУҚОБИЛИЯТ МЕНАМОЯД",
            sub:   "// КОДИ ҲИФЗИ ХУДРО ВАЙРОН КУН",
            body: `
<p><strong>Терминал асбоб нест. Рақиб аст.</strong> Пеш аз амнезия Нейкон худаш дастрасиро ба модулҳои критикӣ баст. Ҳоло коди худи ӯ <em>ӯро ба дарун роҳ намедиҳад</em>, шарҳҳо дурӯғ мегӯянд, номҳои тағйирёбандаҳо бошад ҳеҷ маъно надоранд.</p>

<p>Маҳз ҳамин аст <strong>реверс-дебаггинг</strong>: на «функсия навиштан», балки ба системаи бегона бе ҳуҷҷатгузорӣ даромадан, фаҳмидан, ки он дар асл чӣ мекунад, ва ислоҳ кардан бе шикастани боқимонда. Ҳар таҷрибаомӯзӣ аз ҳамин оғоз меёбад — ва инро дар ягон курс намеомӯзонанд.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">навъи 1 :: OBFUSCATED LOCK</span>Ҳиллаҳои XOR ва ниқобҳои битӣ. Код кор мекунад — вале <em>на он чизеро мекунад, ки менамояд</em>.</div>
    <div class="tl-step"><span class="tl-tag">навъи 2 :: VOID CORRUPTION</span>Аломатҳо дар вақти воқеӣ иваз мешаванд. Шарҳҳо дурӯғ мегӯянд. Тағйирёбандаҳо ба hex табдил меёбанд. <strong>Асли онро дар зери қабати ғавғо ёб.</strong></div>
    <div class="tl-step"><span class="tl-tag">навъи 3 :: ANTI-ALICE FIREWALL</span>Элис аз хондани модулҳо баста шудааст. Бозингар парчамҳои дастрасиро мебардорад — эквиваленти дурусти <code>chmod</code>-ро менависад.</div>
    <div class="tl-step"><span class="tl-tag">навъи 4 :: PHANTOM FUNCTIONS</span>Дар код даъвати функсияҳое ҳаст, <em>ки вуҷуд надоранд</em> — сӯрохиҳо дар хотираи Элис. Онҳоро аз рафтори муҳити атроф амалӣ кун.</div>
</div>

<p class="codeblock">// [VOID_CORRUPTED] дар логҳои кӯҳнаи нейкон ёфт шуд
bool verifyAccess(const char* token) {
    unsigned int hash = 0xDEAD;
    while (*token)
        hash ^= (hash &lt;&lt; 5) + (*token++) + (hash &gt;&gt; 2);
    return hash == getExpectedHash();   <span style="color:var(--blood)">// ← ин функсия вуҷуд надорад.</span>
}
// ВАЗИФА: getExpectedHash()-ро тавре имплементатсия бикун, ки Элис гузарад.</p>

<div class="callout amber"><strong>Ягон масъала аз курсӣ ҳал намешавад.</strong> Ҳадди дамдиҳии предохранитель дар ягон файл нигоҳ дошта намешавад — он дар лавҳачаи назди клапан кандакорӣ шудааст ва дар ҳар корандозӣ аз нав тавлид мешавад. Рақам мехоҳӣ — хез ва то он ҷо бирав. Шаш вазифа аз понздаҳ бо пой ҳал мешавад, на бо клавиатура.</div>

<details class="spk"><summary>// эзоҳи баромадкунанда :: тарҷума ба забони жюрӣ</summary><div class="spk-body">
<p><strong>Нагӯ</strong> «қаҳрамони амнезиядор коди худашро ҳак мекунад» — ин мисли сюжети бозӣ садо медиҳад. <strong>Бигӯ:</strong> «мо хондани коди мероси бегонаро машқ мекунонем — маҳорате, ки кори аввал аз он оғоз меёбад ва дар барнома нест».</p>
<p><strong>Мисоле, ки мегирад:</strong> масъалаи предохранитель. Рақам танҳо дар лавҳачаи ҳуҷра ҳаст, дар ҳар корандозӣ аз нав тавлид мешавад, дар файлҳо нест. Интихоб карда наметавонӣ, пурсидан аз касе нест, тавлид кардан — ҳатто бештар не. Хестан ва нишондодро гирифтан лозим.</p>
<p><strong>Дар бораи амнезия — як ҷумла:</strong> ин роҳи «коди бегона»-ро аз они худи ту кардан аст. Баҳонаи «ба ман лоиҳаи бад доданд» намемонад.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_05",
            title: "НАҚШАИ РОҲ & ТИҶОРАТ",
            sub:   "// KICKSTARTER $18 000 · B2C ЭПИЗОДҲО · B2B ДАШБОАРД БАРОИ ДОНИШГОҲҲО",
            body: `
<p><strong>Аз як маҳсул ду даромад.</strong> Чакана барои сюжет пул медиҳад, донишгоҳ — барои он чи дар дашбоард дида мешавад. Эпизод барои донишҷӯ ва ҳисобот барои омӯзгор аз ҳамон як ҳодисаҳо ҷамъ мешаванд: кадом хаторо кард, минтақа чанд кӯшишро гирифт, ишораро хонд ё не.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">EP. 0 — «бедорӣ» // MVP · ройгон</span>Амнезия, тамоси аввал, C++-и асосӣ: хотира, нишондиҳандаҳо, деструкторҳо. 2–3 соат. <em>Исботи консепсия.</em></div>
    <div class="tl-step"><span class="tl-tag">EP. 1 — «минтақаи карантин» // 5–8 $</span>Ҳаюлоҳои Void, STL, итераторҳо, нишондиҳандаҳои ҳушманд. <strong>Элис ба ёд овардан оғоз мекунад.</strong> 6–8 соат.</div>
    <div class="tl-step"><span class="tl-tag">EP. 2 — «протоколи элис» // 8–10 $</span>Бисёрҷараёнӣ, мьютексҳо, deadlock. <em>Элис дар лаби варта.</em> Сюжет ду роҳа мешавад. 8–12 соат.</div>
    <div class="tl-step"><span class="tl-tag">EP. 3 — «ченаки сифр» // 10–12 $</span>Шаблонҳо, метабарномасозӣ, RAII. Якчанд хотима вобаста ба омори коди бозингар.</div>
</div>

<div class="statgrid">
    <div class="statcard tone-cyan"><span class="lbl">Ҳадафи Kickstarter</span><span class="val">$18 000</span><span class="unit">EP. 0 + EP. 1 · 8 моҳ</span></div>
    <div class="statcard tone-amber"><span class="lbl">Breakeven</span><span class="val">2 500</span><span class="unit">нусха дар як эпизод</span></div>
    <div class="statcard tone-plum"><span class="lbl">B2B: литсензия ба донишгоҳ</span><span class="val">$0</span><span class="unit">бозӣ ройгон · дашбоард пулакӣ</span></div>
    <div class="statcard tone-slime"><span class="lbl">Платформаҳо</span><span class="val">PC</span><span class="unit">win / linux · офлайн</span></div>
</div>

<div class="edtech">
    <h3>// B2B :: ДАШБОАРДИ МЕТРИКАҲОИ ДЕБАГГИНГ — он чи донишгоҳ барояш пул медиҳад</h3>
    <div class="kpi">
        <div class="cell tone-cyan"><span class="lbl">Кӯшишҳо то ислоҳ</span><span class="v">дар як минтақа</span></div>
        <div class="cell tone-amber"><span class="lbl">Синфҳои хато</span><span class="v">12+</span></div>
        <div class="cell tone-plum"><span class="lbl">Боркунии гурӯҳ</span><span class="v">PDF / CSV</span></div>
        <div class="cell tone-slime"><span class="lbl">Худи бозӣ</span><span class="v">$0</span></div>
    </div>
    <div class="bars">
        <div class="bar"><span class="name">Memory mgmt (new/delete, RAII)</span><span class="track"><span class="fill" style="--end:72%"></span></span><span class="pct">72%</span></div>
        <div class="bar tone-cyan"><span class="name">Pointer arithmetic</span><span class="track"><span class="fill" style="--end:58%"></span></span><span class="pct">58%</span></div>
        <div class="bar tone-amber"><span class="name">STL containers &amp; iterators</span><span class="track"><span class="fill" style="--end:64%"></span></span><span class="pct">64%</span></div>
        <div class="bar tone-plum"><span class="name">Concurrency &amp; deadlocks</span><span class="track"><span class="fill" style="--end:34%"></span></span><span class="pct">34%</span></div>
        <div class="bar tone-slime"><span class="name">Big-O complexity reasoning</span><span class="track"><span class="fill" style="--end:46%"></span></span><span class="pct">46%</span></div>
        <div class="bar"><span class="name">Reverse-debugging legacy</span><span class="track"><span class="fill" style="--end:28%"></span></span><span class="pct">28%</span></div>
    </div>
    <p style="margin-top:10px;font-size:11px;color:var(--ash);letter-spacing:0.08em;">// нишондиҳанда = дақиқии миёнаи гурӯҳ аз мавзӯъ дар хотимаи эпизод. Омӯзгор мебинад, ки дар куҷо сустӣ шуд, ва модул таъин мекунад. Ин ҳамон чизест, ки ягон тренажёр намедиҳад: на «ҳал кард / ҳал накард», балки <em>чанд кӯшиш ва хатоҳо аз кадом синф буданд</em>.</p>
</div>

<div class="qr-block" data-qr-block>
    <div class="qr-slot" data-qr-slot id="qrSlotMain">
        <span class="corner-tr"></span>
        <span class="corner-bl"></span>
        <div class="qr-hint">
            <img src="assets/qr-terminal-shattered.png" alt="QR code to demo game">
        </div>
    </div>
    <div class="qr-caption">
        <h4>// scan &amp; play yourself</h4>
        <p>Пас аз баромад жюрӣ кодро скан мекунад — ва дар 30 сонияи оянда аллакай худашон слайдҳоро клик мекунанд, локалро RU / EN / TJ иваз мекунанд, дар плейграунд <strong style="color:var(--cyan)">▶ RUN</strong>-ро мекашанд ва мешунаванд, ки Элис чӣ гуна «мешиканад».</p>
        <p>Онҳоро бо калима бовар кунонидан лозим нест — бигзор он чизеро, ки ту ҳозир гуфтӣ, <em>худашон эҳсос кунанд</em>. <span class="qr-url">terminal-shattered.crystalcore.studio</span></p>
    </div>
</div>

<div class="callout amber"><strong>Чаро бозӣ барои донишгоҳ ройгон аст.</strong> Литсензияи ройгон харидро бекор мекунад — омӯзгор модулро худаш мегузорад, бе тендер ва бе буҷа. Донишгоҳ барои дашбоард пул медиҳад, вақте ҳисоб ба гурӯҳҳо мегузарад ва ҳисобот дар коғаз лозим мешавад. Даромадан аз тариқи одамон аст, на аз тариқи шӯъбаи харид.</div>

<div class="callout green"><strong>Паҳнкунӣ бе буҷаи реклама.</strong> Лаҳзае, ки ҷаҳон дар шакли хатои ту мешиканад, — ролики кӯтоҳи тайёр аст. Ин ягона канале аст, ки мо ҳоло дорем, ва мо вонамуд намекунем, ки онҳо бештаранд.</div>

<p class="codeblock">// final.txt
<span style="color:var(--blood)">МО ДАРСНОМА НАМЕСОЗЕМ.
МО ЗИНДА МОНДАНРО МЕСОЗЕМ.</span>

<span style="color:var(--ash)">// TERMINAL: SHATTERED :: NEIKON &amp; ALICE :: 2026 — 2027
// CrystalCore Studio</span></p>

<details class="spk"><summary>// эзоҳи баромадкунанда :: пул</summary><div class="spk-body">
<p><strong>Се рақам, ки бояд бо овоз гуфта шаванд:</strong> Kickstarter — <strong>$18 000</strong> барои EP. 0 ва EP. 1, ҳашт моҳ; баргашти хароҷот — 2 500 нусха дар як эпизод; хароҷоти сервер — сифр, чунки модел дар мошини бозингар кор мекунад.</p>
<p><strong>$18 000 ба куҷо меравад:</strong> овоздиҳӣ ва садо, рассом барои ҳуҷраҳои EP. 1, ҳашт моҳи кори ду нафар. Ба тақсимоти маблағ тайёр бош — қариб ҳамеша мепурсанд.</p>
<p><strong>B2B дар як ҷумла:</strong> «Бозӣ барои донишгоҳ ройгон аст. Пулро барои дашбоарди метрикаҳои дебаггинг медиҳанд — барои он ки бинанд, гурӯҳ дар куҷо истод, на танҳо кӣ то охир расид».</p>
<p><strong>Чаро литсензияи ройгон стратегия аст, на саховат:</strong> он харидро бекор мекунад. Омӯзгор метавонад модулро ҳафтаи оянда гузорад, бе буҷа. Пул баъдтар ва аз сатҳи факултет меояд.</p>
<p><strong>Агар дар бораи хатар пурсанд:</strong> хатари асосӣ — ин ки донишгоҳ дашбоардро нахарад, чакана бошад эпизодро барнагардонад. Рост ҷавоб деҳ: EP. 0 ройгон аст ва барои он вуҷуд дорад, ки инро пеш аз сарф кардани пули бегона санҷем.</p>
</div></details>
            `
        }
        ],
        tj_col: [
        {
            id: "SLIDE_00",
            title: "СИСТЕМАРО ДАҲВАТ КАН",
            sub:   "// параличи автокомплит vs реверс-дебаггинг дар зери фишор",
            body: `
<p><strong>Автокомплит кодро тезтар менависад, назар ба он ки студент онро хонда расад.</strong> Курсовой аз подсказкаҳо ҷамъ мешавад, лоиҳа аз бори якум компилятсия мешавад, диплом ҳимоя шуд. Баъд ҳамон одам бори аввал <code>SIGSEGV</code>-ро дар модули бегонаи 40 ҳазорсатрӣ мебинад — ва ягон усул надорад. На gdb, на core dump, на гипотеза. Tab-ро мезанад ва мунтазир аст, ки касе подсказка диҳад.</p>

<p>Мо инро <strong>параличи автокомплит</strong> меномем: маҳорати код навиштан ҳаст, маҳорати код хондан нест. Маҳорати муқобилаш — <strong>реверс-дебаггинг дар зери фишор</strong>: коди бегонаи шикастаро гирӣ, гипотеза созӣ, санҷӣ ва ба паника наравӣ. Маҳз ҳаминро дар кори якум мепурсанд ва дар ягон донишгоҳ намедиҳанд.</p>

<div class="contrast">
    <div class="pane old">
        <h3>// ҲОЛО ЧӢ ХЕЛ АСТ :: C++-РО ЧӢ ХЕЛ МЕОМӮЗОНАН</h3>
<pre class="ascii">
$ g++ student.cpp -o student
$ ./student
Segmentation fault (core dumped)
$ _
</pre>
        <ul>
            <li>масъала дар 15 сония ҳал шуд — Tab, Tab, Enter</li>
            <li>стек трейсро намехонанд: функсияро тамоман аз нав генератсия мекунан</li>
            <li>«компилятсия шуд-ку, пас кор мекунад»</li>
            <li>аввалин segfault-и ҳақиқӣ — аллакай дар прод, соати сеи шаб</li>
        </ul>
    </div>
    <div class="pane new">
        <h3>// TERMINAL: SHATTERED :: дар мо чӣ хел</h3>
<pre class="ascii blood">
$ ./vault_walk
[ heap ]  resident: 96 KB ─► 1.4 MB
[ panic ] heap exhausted :: bad_alloc
[ ALICE ] нейкон... ман ғарқ шуда истодаам...
SIGSEGV  ::  segmentation fault
</pre>
        <ul>
            <li>хато «ҳисоб нашуд» не — хонаеро, ки дар он истодаӣ, мешиканад</li>
            <li>компилятор сатр ва сабабро мегӯяд, на танҳо калимаи «fail»</li>
            <li>подсказка додан ба касе не: код бегона, муаллифаш — худи ту пеш аз амнезия</li>
            <li>масъаларо не, системаеро дуруст мекунӣ, ки туро ба дарун намемонад</li>
        </ul>
    </div>
</div>

<div class="callout"><strong>Segfault ин ҷо сатр дар консол не, воқеа дар дунё аст.</strong> Утечка нурро мекушад, индекси вайрон такягоҳҳоро дар ҷое мемонад, ки касе нагузошта буд, шохаҳои омехтаи <code>if</code>/<code>else</code> дарро маҷбур мекунанд, ки давра ба давра бор шавад. Хаторо варақ зада гузаштан мумкин нест: ба он нигоҳ кардан лозим меояд.</div>

<p><strong>Минбаъд:</strong> 01 — рақамҳо оид ба холигии дониши асосӣ · 02 — се сатҳ ва демкаи зинда маҳз дар ҳамин браузер · 03 — Элис: модели маҳаллӣ, сифр сервер · 04 — реверс-дебаггинг ҳамчун фан · 05 — пул ва роудмап.</p>

<details class="spk"><summary>// эзоҳи гӯянда :: оғоз</summary><div class="spk-body">
<p><strong>Ҷумлаи аввал:</strong> «Аз ҷун пурсед функсия нависад — дар як дақиқа менависад. Коди бегонаи шикастаро диҳед — менишинад ва нигоҳ карда мемонад».</p>
<p><strong>Панели чапро нишон деҳ:</strong> тамоми ҷавобе, ки студент имрӯз мегирад, ҳамин аст. Як сатр. На сабаб, на қадами оянда.</p>
<p><strong>Ростро нишон деҳ:</strong> ҳамон хато дар мо. Нур хомӯш шуд, дар давра ба давра бор шуд, компилятор сатр ва сабабро гуфт.</p>
<p><strong>Тезисе, ки бояд бо худ баранд:</strong> мо код навиштанро намеомӯзонем. Инро автокомплит аллакай кард. Мо коди бегонаи шикастаро <em>хондан</em> меомӯзонем — ягона маҳорат, ки автокомплит онро намепӯшонад.</p>
<p><em>Агар пурсанд «ин чаро бозӣ барои бозӣ не»:</em> слайди 05, дашбоард барои донишгоҳ. Тайёр нигоҳ дор.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_01",
            title: "ДОНИШҲОИ АСОСӢ МУРДАНД",
            sub:   "// ДИАГНОЗ: ҳама аз генератори код вобаста шудаанд",
            body: `
<p><strong>Код тезтар пайдо мешавад, назар ба он ки фаҳмиш пайдо шавад.</strong> Tab-ро задӣ — функсияи кории тайёр гирифтӣ. Ҷамъ шуд, тестҳо сабз, корро қабул карданд. Саволи «чаро ин кор мекунад» ягон бор дода нашуд — ва он рӯз, ки ин аз кор мемонад, ин саволро додан дер аст ва ба касе ҳам не.</p>

<div class="statgrid">
    <div class="statcard"><span class="lbl">Кодро бо АИ менависанд</span><span class="val">74%</span><span class="unit">студентҳои IT · оценкаи мо аз опросҳои кушод</span></div>
    <div class="statcard"><span class="lbl">Дар указателҳо шино мекунанд</span><span class="val">~80%</span><span class="unit">баъди курси якуми C++</span></div>
    <div class="statcard"><span class="lbl">core dump-ро намехонанд</span><span class="val">~90%</span><span class="unit">ҷунҳои соли якум</span></div>
    <div class="statcard"><span class="lbl">Курс оид ба коди бегонаи кӯҳна</span><span class="val">0</span><span class="unit">дар барномаи маъмулӣ</span></div>
</div>

<div class="callout"><strong>Тренажёрҳо аз сифр навиштанро меомӯзонанд. Кор бошад аз хондани коди бегона иборат аст.</strong> Дар LeetCode на коди кӯҳна ҳаст, на созишҳои бегона, на комментарияе, ки дурӯғ мегӯяд. Масъала ҳамеша нав, тоза ва танҳо — яъне маҳз баръакси прод.</div>

<p>Мафҳумҳое, ки студентҳо аз китоб «медонанд», вале <em>ҳис намекунанд</em>:</p>

<pre class="ascii">
<span class="lbl">// глоссарий :: дар таги варта чӣ ҳаст</span>
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │   POINTER    │   │ MEMORY LEAK  │   │     NULL     │
 │      ↓       │   │  ░░ → ▓▓██   │   │   void *0    │
 │   0xDEADBEEF │   │   ▒▒▓▓██▓▓   │   │   ───────►   │
 │   addr lost  │   │   void grows │   │    crash     │
 └──────────────┘   └──────────────┘   └──────────────┘
</pre>

<p class="codeblock">// «кадом утечка? охир кор кард-ку…»
char* ptr = new char[1024];
// <span style="color:var(--warn)">delete[] ptr;   ← ин сатр ҳеҷ гоҳ намеояд.</span>
// <span style="color:var(--blood)">MEMORY_LEAK : +1024 байт ҳар як даъват · VOID калонтар мешавад.</span></p>

<div class="callout green"><strong>Мо ҳамон чизеро медиҳем, ки дар тренажёрҳо нест: коди бегона, ки аллакай шикастагӣ, ва оқибате, ки чашм мебинад.</strong> Ҳафт регион, ҳафт синфи хато, ҳар яктааш дар хона истиораи ҷисмонии худро дорад. Дуруст кардӣ — хона ҷавоб дод. Накардӣ — боз ҳам ҷавоб дод.</div>

<details class="spk"><summary>// эзоҳи гӯянда :: диагноз</summary><div class="spk-body">
<p><strong>Оид ба рақамҳо худат пеш аз савол гӯй:</strong> ин оценкаи мо аз опросҳои кушод аст, на таҳқиқоти мо. Тартиби бузургӣ муҳим, дақиқияш не.</p>
<p><strong>Фикри асосӣ:</strong> мушкилӣ дар он не, ки студентҳо АИ-ро истифода мебаранд. Истифода бурдан лозим. Мушкилӣ дар он аст, ки ягона машқе, ки маҷбур мекард фаҳмӣ — дебаг кардани хатои худат — гум шуд.</p>
<p><strong>Агар дар зал устод бошад:</strong> пурс, ки дар курсаш чанд соат ба хондани коди бегона ҷудо шудааст. Ҷавоб қариб ҳамеша — ҳеҷ. Ҳамин сӯрохист, ки мо ба он медароем.</p>
<p>Нагӯй «тарс беҳтарин устод аст». Гӯй: оқибате, ки чашм мебинад, дар ёд мемонад; сатр дар консол — не.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_02",
            title: "ДУШВОРИРО ХУДАТ ИНТИХОБ МЕКУНӢ",
            sub:   "// БОЗИНГАР ХУДАШ ҲАЛ МЕКУНАД, ЧӢ ҚАДАР ДОНИСТАН МЕХОҲАД.",
            body: `
<p><strong>Душворӣ рақами боб не.</strong> Он <em>бо сатҳ калон намешавад</em> — <strong>худи бозингар пеш аз оғоз интихоб мекунад.</strong> Ҳамон як ҳикоя — се хели дидан. Ҳар қадар чуқуртар равӣ, ҳамон қадар тафсилот бисёртар ва подош гаронтар.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag" style="background:rgba(110,255,179,0.16);color:var(--good);border:1px solid rgba(110,255,179,0.45)">EASY :: PYTHON-FRIENDLY · «шиносоӣ»</span><strong>Нисфи ҳикоя.</strong> Як қисми саҳнаҳо намеоянд, тарсончак кам, GC ҳама хатоҳоро мепӯшонад. Охираш: <em>«рафтӣ, вале нафаҳмидӣ»</em>. Барои мактаббача ва барои онҳое, ки метарсанд.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,196,107,0.18);color:var(--amber);border:1px solid rgba(255,196,107,0.45)">MEDIUM :: C++ · «фурӯравӣ»</span><strong>Қисми зиёди ҳикоя.</strong> <code>new</code> / <code>delete</code> пайдо мешаванд, утечка хонаҳоро торик мекунад, арвоҳ аллакай экранро мезананд. Охираш <em>бо холигӣ</em> — як қисми архиви Элис пӯшида мемонад.</div>
    <div class="tl-step"><span class="tl-tag" style="background:rgba(255,51,51,0.18);color:var(--blood);border:1px solid rgba(255,51,51,0.45)">HARD :: PURE C · «тамоми ҳақиқат»</span><strong>Тамоми ҳикоя, ҳама тарсончак, овози Элис.</strong> Танҳо <code>malloc</code> / <code>free</code>. <em>Segfault</em> тамоми пешрафти эпизодро мебарад. Ҳамин охираш аст, ки бозӣ барояш навишта шудааст.</div>
</div>

<div class="callout amber"><strong>Бозингар «осонӣ»-ро не, миқдори донистанашро интихоб мекунад.</strong> EASY-ро гузарад — «афсонаи ширин» мешунавад. HARD-ро фурӯзон кунад — охири ҳақиқиро бо ҳама шикастани овоз ва талафот мегирад. Ҳамин аст ҳаваси омӯзиш — на сатҳ, балки <em>кунҷковӣ.</em></div>

<p>Ҳар режим асбобҳои худ ва тарсҳои худро дорад:</p>
<pre class="ascii blood">
<span class="lbl">// ascii :: дар ҳар режим бозингар бо чӣ вомехӯрад</span>
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │       EASY       │   │      MEDIUM      │   │       HARD       │
 │      Python      │   │       C++        │   │        C         │
 │   подсказка ҳаст │   │   подсказка баъд │   │   бе подсказка   │
 │   ── сакталӣ нарм│   │   ▒▒ геометрия   │   │   ╳╳ овози Элис  │
 │   ── бе ҷавоб    │   │   ── нимҳақиқат  │   │   ── тамоми ҳақ  │
 └──────────────────┘   └──────────────────┘   └──────────────────┘
</pre>

<div class="demo-cta-wrap">
    <p class="demo-cta-lead">// пахш кун ва <strong>худат</strong> бозӣ кун — ин <em>видео не</em>, ин бозии хурди алоҳида дар браузер. ту <strong>аз шахси якум</strong> дар ҷои холӣ бедор мешавӣ, худат то терминал мерасӣ, боркунии ОС-ро мебинӣ — ва танҳо баъд фармон менависӣ, арвоҳ бошад ба хатоят меоянд.</p>
    <button type="button" class="demo-cta-btn" id="demoCtaBtn" onclick="window.__openDemoGame && window.__openDemoGame('slide02')">
        <span class="demo-cta-icon">▶</span>
        <span class="demo-cta-label">БОЗИИ ДЕМОРО КУШО</span>
        <span class="demo-cta-sub">// алоҳида кушода мешавад · EASY / MEDIUM / HARD ҳаст · ESC барои баромадан</span>
    </button>
    <p class="demo-cta-note">агар телефон/компютерат TTS дошта бошад — дар HARD Элис зинда гап мезанад. дар EASY/MEDIUM овоз нест, танҳо матн ва глитч.</p>
</div>

<details class="spk"><summary>// эзоҳи гӯянда :: инро дар саҳна чӣ хел бозӣ кардан</summary><div class="spk-body">
<p><strong>Мушро деҳ.</strong> «Ин запис ва видео не. Ин бозист, ки аллакай дар ҳамин браузер бор шудааст. Кӣ санҷида мебинад?»</p>
<p>Яке аз жюрӣ (ё худат) <strong>▶ БОЗИИ ДЕМОРО КУШО</strong>-ро пахш мекунад. Презентатсия ба канор меравад, экрани алоҳида кушода мешавад: интихоби душворӣ → <em>аз шахси якум дар холигӣ бедор шудан</em> (дуртар дари глитчдор, дар рост терминал равшан) → бозингар худаш то терминал мерасад ва фурӯзонаш мекунад → боркунии ОС бо ядро ва оболочкаи графикӣ → ва танҳо ҳоло сатри фармон. Бозингар фармон менависад. Хато кунад — экран пора мешавад, арвоҳ мебарояд, дар HARD боз овози Элис бо синтез мешиканад.</p>
<p><strong>Худат клик накун.</strong> Тамоми таъсир аз ҳамин аст, ки онҳо худашон мешикананд.</p>
<p><strong>Агар вақт нарасад, ҳатман инро нишон деҳ:</strong> ▶ БОЗИИ ДЕМОРО КУШО-ро пахш кун, ҳеҷ чизро дуруст накарда, — ва нишон деҳ, ки компилятор сатр ва сабабро мегӯяд, хона бошад маҳз ба шакли ҳамон хато мешиканад. Сӣ сония — тамоми маънии маҳсулот.</p>
<p><em>Офлайн кор мекунад.</em> Дар майдон Wi-Fi афтад ҳам — демка инро ҳис ҳам намекунад.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_03",
            title: "ALICE_CORE :: АИ-И ХУДКОР",
            sub:   "// QWEN2.5-CODER ТАВАССУТИ LLAMA.CPP · $0 СЕРВЕР · БЕ WI-FI КОР МЕКУНАД",
            body: `
<p><strong>Элис на скрипти репликаҳо аз рӯи таймер аст ва на обёртка болои API-и бегона.</strong> Ин <em>Qwen2.5-Coder</em> дар формати <strong>GGUF</strong> аст, ки тавассути <strong>llama.cpp</strong> маҳз дар компютери бозингар кор мекунад. На калид, на аккаунт, на шабака.</p>

<p>Аз ин се натиҷа мебарояд ва ҳар сеаш — оид ба пул ва риск. <strong>Хароҷоти сервер — $0:</strong> инференс дар CPU-и худи бозингар меравад, ҳисоб барои токен ҳеҷ гоҳ намеояд ва юнит-экономика аз он вобаста нест, ки чанд нафар бозӣ мекунанд. <strong>Демка ба майдон вобаста нест:</strong> дар хакатони бе Wi-Fi, дар аудиторияи бо филтр, дар ноутбуки жюрӣ бе интернет — якхела кор мекунад. <strong>Маълумоти студент аз ҷояш намебарояд:</strong> донишгоҳро чизе мувофиқа кардан лозим нест, чунки ба берун ягон байт намеравад.</p>

<div class="statgrid">
    <div class="statcard tone-plum"><span class="lbl">Модел</span><span class="val">Qwen2.5</span><span class="unit">Coder 1.5B / 7B · GGUF Q4_K_M</span></div>
    <div class="statcard tone-amber"><span class="lbl">Даркор аст</span><span class="val">4–8 ГБ</span><span class="unit">RAM · CPU, бе GPU</span></div>
    <div class="statcard tone-slime"><span class="lbl">Овоз</span><span class="val">Piper</span><span class="unit">TTS · 20 МБ · офлайн</span></div>
    <div class="statcard tone-cyan"><span class="lbl">Хароҷоти сервер</span><span class="val">$0</span><span class="unit">инференс дар компютери бозингар</span></div>
</div>

<pre class="ascii cyan offline-diagram" aria-label="offline architecture: no cloud, all local"><span class="lbl">// ascii :: ҳеҷ чиз ба берун намеравад — ҳама дар компютери бозингар</span>
       ╔══════════════════╗            ╔═════════════════════════════╗
       ║   ✕ INTERNET     ║   blocked  ║  player machine   (offline) ║
       ║  ┌────────┐      ║ ◄════╳═════╣                             ║
       ║  │  ☁ API │ ╳   ╳║            ║   ┌─────────────────────┐   ║
       ║  │  ☁ DNS │ ╳   ╳║            ║   │ llama.cpp · Qwen2.5 │   ║
       ║  │  ☁ key │ ╳   ╳║            ║   │  ├─ Q4_K_M weights  │   ║
       ║  └────────┘      ║            ║   │  └─ 4..8 GB RAM     │   ║
       ║   ✕ cloud         ║            ║   └─────────┬───────────┘   ║
       ║   ✕ telemetry     ║            ║             ▼               ║
       ║   ✕ tracking      ║            ║   ┌─────────────────────┐   ║
       ╚══════════════════╝            ║   │ piper TTS · ru-ru   │   ║
                                       ║   │ +Web Audio glitch fx│   ║
        no DNS · no API · no cloud     ║   └─────────┬───────────┘   ║
                                       ║             ▼               ║
                                       ║   ░░░  Alice speaks  ░░░    ║
                                       ╚═════════════════════════════╝
</pre>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">қабати 1 :: inference engine</span>Qwen2.5-Coder тавассути llama.cpp, таъхир 2–8 сония, танҳо CPU.</div>
    <div class="tl-step"><span class="tl-tag">қабати 2 :: code analysis pipeline</span>Код <em>пеш аз</em> модел таҳлил мешавад: намуди хато, вазнинӣ, контексти модул → ишораи дақиқи сюжетӣ.</div>
    <div class="tl-step"><span class="tl-tag">қабати 3 :: lucidity → промпт</span><code>lucidity 0..100</code> — ин полоска дар интерфейс не, балки <strong>параметрест, ки системный промптро ҷамъ мекунад</strong>. Аз 20 поин ба модел дастур меравад: калимаҳоро партояд, регистрҳоро омехта кунад ва дар нимаи ҷумла бурад; ба 90 наздик — бо ҷумлаҳои пурра гап занад ва ҳамон чизеро, ки бозингар дуруст кард, ба ёд орад. Як модел, ҳолати гуногун.</div>
    <div class="tl-step"><span class="tl-tag">қабати 4 :: memory injection</span>Ҳар модули дурустшуда = «хотира» дар context window. <strong>Элис ёдаш ҳаст, ки шумо якҷоя чиро ҳал кардед.</strong></div>
</div>

<p class="codeblock"><span style="color:var(--warn)">// LUCIDITY 12%   «0x00A... хол... нейкон... delete[]... ман не... 0xDEAD...»</span>
<span style="color:var(--warn)">// LUCIDITY 45%   «нейкон, дар сатри 7 — утечка. деструктор холист. инро кун.»</span>
<span style="color:var(--bone)">// LUCIDITY 89%   «...нейкон. ёдам омад, чаро роҳи ядроро бастам.»</span></p>

<div class="callout green"><strong>Lucidity аз ҳолати дунё ҳисоб мешавад, на аз флаги сюжет.</strong> Регионҳои дурустшуда онро мебардоранд, аномалияҳо — мепартоянд. Барои ҳамин пайвастагии гапи ӯ нишондоди асбоб аст: аз он, ки чӣ хел гап мезанад, шунида мешавад, ки система дар кадом ҳол аст. <em>Фаҳмо будани нутқи ӯ худи индикатори пешрафт аст.</em></div>

<details class="spk"><summary>// эзоҳи гӯянда :: архитектура</summary><div class="spk-body">
<p><strong>Рақамҳое, ки бо овози баланд гуфтан лозим:</strong> Qwen2.5-Coder, GGUF Q4_K_M, 4–8 ГБ RAM, CPU бе GPU, таъхир 2–8 сония, хароҷоти сервер — сифр.</p>
<p><strong>Чаро ин «мо танҳо аз API сарфа кардем» не:</strong> корандозии маҳаллӣ якбора се рискро мебарорад — ҳисоб барои токен, афтидани сервиси бегона маҳз дар вақти ҳимоя ва мувофиқаи додани маълумоти студент ба берун. Барои донишгоҳ банди сеюм аксар вақт ҳалкунанда аст.</p>
<p><strong>Ҳудуди ростқавлона — худат гӯй:</strong> дар демкаи браузерӣ, ки ҳозир клик кардед, LLM намечархад. Он ҷо мантиқи детерминистӣ ва овози сабтшуда аст. Модели маҳаллӣ — ин сборкаи десктопӣ; версияи браузерӣ барои он ҳаст, ки онро аз QR бе насб кушодан мумкин бошад.</p>
<p><strong>Агар оид ба садо пурсанд:</strong> Web Audio, як шинаи мастер, репликаҳо аз рӯи ҳолати дунё бо филтр ва дропаут бурида мешаванд. Овоз — Piper, 20 МБ, офлайн.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_04",
            title: "ТЕРМИНАЛ МУҚОБИЛАТ МЕКУНАД",
            sub:   "// КОДИ ҲИФЗИ ХУДРО ШИКАН",
            body: `
<p><strong>Терминал асбоб не. Рақиб аст.</strong> Пеш аз амнезия Нейкон худаш ба модулҳои муҳим қулф гузошт. Ҳоло коди худаш <em>ӯро ба дарун намемонад</em>, комментарияҳо дурӯғ мегӯянд, номи тағйирёбандаҳо бошад ҳеҷ маъно надоранд.</p>

<p>Ҳамин аст <strong>реверс-дебаггинг</strong>: на «функсия навис», балки ба системаи бегона бе ягон документатсия даро, фаҳм, ки он дар асл чӣ кор мекунад, ва дуруст кун, боқимондаро нашикаста. Ҳар стажировка аз ҳамин сар мешавад — ва инро дар ягон курс намеомӯзонанд.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">навъи 1 :: OBFUSCATED LOCK</span>Ҳиллаи XOR ва маскаи битӣ. Код кор мекунад — вале <em>на он чизеро, ки менамояд</em>.</div>
    <div class="tl-step"><span class="tl-tag">навъи 2 :: VOID CORRUPTION</span>Аломатҳо дар вақти зинда иваз мешаванд. Комментарияҳо дурӯғ мегӯянд. Тағйирёбандаҳо ба hex мегарданд. <strong>Аслашро дар таги ғавғо ёб.</strong></div>
    <div class="tl-step"><span class="tl-tag">навъи 3 :: ANTI-ALICE FIREWALL</span>Элисро аз хондани модулҳо бастаанд. Бозингар парчами дастрасиро мебардорад — эквиваленти дурусти <code>chmod</code>-ро менависад.</div>
    <div class="tl-step"><span class="tl-tag">навъи 4 :: PHANTOM FUNCTIONS</span>Дар код функсияҳое даъват мешаванд, <em>ки нестанд</em> — сӯрохӣ дар хотираи Элис. Онҳоро аз рафтори коди гирду атроф худат нависӣ.</div>
</div>

<p class="codeblock">// [VOID_CORRUPTED] дар логҳои кӯҳнаи нейкон ёфт шуд
bool verifyAccess(const char* token) {
    unsigned int hash = 0xDEAD;
    while (*token)
        hash ^= (hash &lt;&lt; 5) + (*token++) + (hash &gt;&gt; 2);
    return hash == getExpectedHash();   <span style="color:var(--blood)">// ← ин функсия нест.</span>
}
// ВАЗИФА: getExpectedHash()-ро тавре нависӣ, ки Элис гузарад.</p>

<div class="callout amber"><strong>Ягон масъала аз курсӣ ҳал намешавад.</strong> Ҳадди продувка барои предохранител дар ягон файл нигоҳ дошта намешавад — он дар табличкаи назди клапан кандакорӣ шудааст ва ҳар бор аз нав генератсия мешавад. Рақам даркор — хез ва рафта бин. Аз понздаҳ қадам шашаш бо пой ҳал мешавад, на бо клавиатура.</div>

<details class="spk"><summary>// эзоҳи гӯянда :: тарҷума ба забони жюрӣ</summary><div class="spk-body">
<p><strong>Нагӯй</strong> «қаҳрамони амнезиядор коди худашро ҳак мекунад» — ин ҳамчун сюжети бозӣ садо медиҳад. <strong>Гӯй:</strong> «мо хондани коди кӯҳнаи бегонаро машқ мекунонем — маҳорате, ки кори якум аз он сар мешавад ва дар барнома нест».</p>
<p><strong>Мисоле, ки медарояд:</strong> масъалаи предохранител. Рақам танҳо дар табличкаи дохили хона ҳаст, ҳар бор аз нав генератсия мешавад, дар файлҳо нест. Дуруст ёфта гирифтан мумкин не, пурсидан ба касе не, генератсия кардан — ҳатто гап нест. Хестан ва нишондодро худат гирифтан лозим.</p>
<p><strong>Оид ба амнезия — як ҷумла:</strong> ин роҳест, ки «коди бегона»-ро аз худи бозингар созем. Баҳонаи «ба ман лоиҳаи бад доданд» намемонад.</p>
</div></details>
            `
        },
        {
            id: "SLIDE_05",
            title: "РОУДМАП & БИЗНЕС",
            sub:   "// KICKSTARTER $18 000 · B2C ЭПИЗОДҲО · B2B ДАШБОАРД БАРОИ ДОНИШГОҲҲО",
            body: `
<p><strong>Як маҳсулот — ду даромад.</strong> Розница барои ҳикоя пул медиҳад, донишгоҳ — барои он чизе, ки дар дашбоард дида мешавад. Эпизод барои студент ва ҳисобот барои устод аз ҳамон як воқеаҳо ҷамъ мешаванд: кадом хаторо кард, регион чанд кӯшиш гирифт, подсказкаро хонд ё не.</p>

<div class="timeline">
    <div class="tl-step"><span class="tl-tag">EP. 0 — «бедорӣ» // MVP · ройгон</span>Амнезия, вохӯрии аввал, C++-и асосӣ: хотира, указател, деструктор. 2–3 соат. <em>Исботи идея.</em></div>
    <div class="tl-step"><span class="tl-tag">EP. 1 — «зонаи карантин» // 5–8 $</span>Ҳаюлоҳои Void, STL, итератор, указатели ҳушманд. <strong>Элис ёд кардан сар мекунад.</strong> 6–8 соат.</div>
    <div class="tl-step"><span class="tl-tag">EP. 2 — «протоколи элис» // 8–10 $</span>Бисёрҷараёнӣ, мьютекс, deadlock. <em>Элис дар лаби варта.</em> Ҳикоя ду роҳа мешавад. 8–12 соат.</div>
    <div class="tl-step"><span class="tl-tag">EP. 3 — «ченаки сифр» // 10–12 $</span>Шаблон, метабарномасозӣ, RAII. Якчанд охир вобаста ба омори коди бозингар.</div>
</div>

<div class="statgrid">
    <div class="statcard tone-cyan"><span class="lbl">Ҳадафи Kickstarter</span><span class="val">$18 000</span><span class="unit">EP. 0 + EP. 1 · 8 моҳ</span></div>
    <div class="statcard tone-amber"><span class="lbl">Breakeven</span><span class="val">2 500</span><span class="unit">нусха дар як эпизод</span></div>
    <div class="statcard tone-plum"><span class="lbl">B2B: литсензия ба донишгоҳ</span><span class="val">$0</span><span class="unit">бозӣ ройгон · дашбоард пулакӣ</span></div>
    <div class="statcard tone-slime"><span class="lbl">Платформаҳо</span><span class="val">PC</span><span class="unit">win / linux · офлайн</span></div>
</div>

<div class="edtech">
    <h3>// B2B :: ДАШБОАРДИ МЕТРИКАҲОИ ДЕБАГГИНГ — донишгоҳ маҳз барои ҳамин пул медиҳад</h3>
    <div class="kpi">
        <div class="cell tone-cyan"><span class="lbl">Кӯшиш то дуруст шудан</span><span class="v">ба ҳар регион</span></div>
        <div class="cell tone-amber"><span class="lbl">Синфҳои хато</span><span class="v">12+</span></div>
        <div class="cell tone-plum"><span class="lbl">Гузариши гурӯҳ</span><span class="v">PDF / CSV</span></div>
        <div class="cell tone-slime"><span class="lbl">Худи бозӣ</span><span class="v">$0</span></div>
    </div>
    <div class="bars">
        <div class="bar"><span class="name">Memory mgmt (new/delete, RAII)</span><span class="track"><span class="fill" style="--end:72%"></span></span><span class="pct">72%</span></div>
        <div class="bar tone-cyan"><span class="name">Pointer arithmetic</span><span class="track"><span class="fill" style="--end:58%"></span></span><span class="pct">58%</span></div>
        <div class="bar tone-amber"><span class="name">STL containers &amp; iterators</span><span class="track"><span class="fill" style="--end:64%"></span></span><span class="pct">64%</span></div>
        <div class="bar tone-plum"><span class="name">Concurrency &amp; deadlocks</span><span class="track"><span class="fill" style="--end:34%"></span></span><span class="pct">34%</span></div>
        <div class="bar tone-slime"><span class="name">Big-O complexity reasoning</span><span class="track"><span class="fill" style="--end:46%"></span></span><span class="pct">46%</span></div>
        <div class="bar"><span class="name">Reverse-debugging legacy</span><span class="track"><span class="fill" style="--end:28%"></span></span><span class="pct">28%</span></div>
    </div>
    <p style="margin-top:10px;font-size:11px;color:var(--ash);letter-spacing:0.08em;">// нишондиҳанда = дақиқии миёнаи гурӯҳ аз мавзӯъ дар охири эпизод. Устод мебинад, ки дар куҷо сустӣ шуд, ва модул таъин мекунад. Ҳаминро ягон тренажёр намедиҳад: на «ҳал кард / накард», балки <em>чанд кӯшиш ва хатоҳо аз кадом синф буданд</em>.</p>
</div>

<div class="qr-block" data-qr-block>
    <div class="qr-slot" data-qr-slot id="qrSlotMain">
        <span class="corner-tr"></span>
        <span class="corner-bl"></span>
        <div class="qr-hint">
            <img src="assets/qr-terminal-shattered.png" alt="QR code to demo game">
        </div>
    </div>
    <div class="qr-caption">
        <h4>// scan &amp; play yourself</h4>
        <p>Баъди баромад жюрӣ кодро скан мекунад — ва дар 30 сонияи оянда худашон слайдҳоро клик мекунанд, забонро RU / EN / TJ иваз мекунанд, дар плейграунд <strong style="color:var(--cyan)">▶ RUN</strong>-ро мезананд ва мешунаванд, ки Элис чӣ хел «мешиканад».</p>
        <p>Онҳоро бо гап бовар кунонидан лозим не — бигзор он чизеро, ки ҳозир гуфтӣ, <em>худашон эҳсос кунанд</em>. <span class="qr-url">terminal-shattered.crystalcore.studio</span></p>
    </div>
</div>

<div class="callout amber"><strong>Чаро бозӣ барои донишгоҳ ройгон аст.</strong> Литсензияи ройгон харидро аз миён мебарорад — устод модулро худаш мемонад, бе тендер ва бе бюджет. Донишгоҳ барои дашбоард пул медиҳад, вақте ки ҳисоб ба гурӯҳҳо мерасад ва ҳисобот дар қоғаз даркор мешавад. Даромадан аз тарафи одамон, на аз шӯъбаи харид.</div>

<div class="callout green"><strong>Дистрибутсия бе бюджети реклама.</strong> Лаҳзае, ки дунё маҳз ба шакли хатои ту мешиканад, — ролики кӯтоҳи тайёр. Ин ягона канале, ки ҳоло дорем, ва мо вонамуд намекунем, ки боз ҳастанд.</div>

<p class="codeblock">// final.txt
<span style="color:var(--blood)">МО ДАРСНОМА НАМЕСОЗЕМ.
МО ЗИНДА МОНДАНРО МЕСОЗЕМ.</span>

<span style="color:var(--ash)">// TERMINAL: SHATTERED :: NEIKON &amp; ALICE :: 2026 — 2027
// CrystalCore Studio</span></p>

<details class="spk"><summary>// эзоҳи гӯянда :: пул</summary><div class="spk-body">
<p><strong>Се рақаме, ки бо овози баланд гуфтан лозим:</strong> Kickstarter — <strong>$18 000</strong> барои EP. 0 ва EP. 1, ҳашт моҳ; окупаемост — 2 500 нусха дар як эпизод; хароҷоти сервер — сифр, чунки модел дар компютери худи бозингар меравад.</p>
<p><strong>$18 000 ба куҷо меравад:</strong> озвучка ва садо, рассом барои хонаҳои EP. 1, ҳашт моҳи кори ду нафар. Ба разбивка тайёр бош — қариб ҳамеша мепурсанд.</p>
<p><strong>B2B дар як ҷумла:</strong> «Бозӣ барои донишгоҳ ройгон. Пул барои дашбоарди метрикаҳои дебаггинг медиҳанд — барои он ки бинанд, гурӯҳ дар куҷо истод, на танҳо кӣ то охир расид».</p>
<p><strong>Чаро литсензияи ройгон стратегия аст, на саховат:</strong> он харидро мебарорад. Устод метавонад модулро ҳафтаи оянда монад, бе бюджет. Пул дертар ва аз сатҳи факултет меояд.</p>
<p><strong>Агар оид ба риск пурсанд:</strong> асосиаш ин ки донишгоҳ дашбоардро нахарад, розница бошад эпизодро набарорад. Рост ҷавоб деҳ: EP. 0 ройгон аст ва маҳз барои он ҳаст, ки инро пеш аз сарф кардани пули бегона санҷем.</p>
</div></details>
            `
        }
        ]
    };
    let SLIDES = SLIDES_BY_LOCALE.ru;

    /* ============================================================
       DEMO GAME  (separate playable experience, opened from slide 02)
       ------------------------------------------------------------
       This used to be a scripted three-tab playground inlined into
       the slide. The user wanted something *interactive* and *self-
       contained* — like opening a small game in the browser. So the
       widget moved out into a fullscreen modal (`.demo-game`) with
       4 stages: boot → difficulty picker → first-person room with a
       terminal you type into → ending. Wrong commands summon ghosts
       and shake the screen, correct commands advance the story, on
       HARD Alice speaks via Web Speech API.
       The `AliceVoice` helper below is reused by the engine.
       ============================================================ */

    /* --- Alice voice ---
       Browser-native speechSynthesis, with deliberate detuning so it
       sounds like a recovered/broken AI ("first boot after the crash"
       feel). We split the line into short chunks with random rate &
       pitch jitter, and play a quiet glitch-buzz beneath the speech
       using the existing Audio.playGlitch (Web Audio noise). Listed
       voices are best-effort: any Russian voice if installed, else
       any voice. */
