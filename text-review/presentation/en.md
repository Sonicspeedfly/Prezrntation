# Pitch deck — EN

_Six slides and speaker notes. Source of truth: js/presentation/02-slides.js._

---

## 1. CHALLENGE THE SYSTEM

_// autocomplete paralysis vs reverse-debugging under pressure_

**Autocomplete now writes code faster than a student can read it.** The coursework assembles itself out of suggestions, the project compiles on the first try, the diploma is defended. Then that same person meets their first `SIGSEGV` inside someone else's 40,000-line module — and has not one move to make. No gdb, no core dump, no hypothesis. They hit Tab and wait to be told.

We call this **autocomplete paralysis**: the skill of producing code is there, the skill of reading it is not. The opposite skill is **reverse-debugging under pressure** — take unfamiliar broken code, form a hypothesis, test it, don't panic. That is what the first job asks for, and what no university course hands out.

### // STATUS QUO :: HOW C++ IS TAUGHT TODAY

```
$ g++ student.cpp -o student
$ ./student
Segmentation fault (core dumped)
$ _
```

- task solved in 15 seconds — Tab, Tab, Enter
- nobody reads the stack trace: they regenerate the whole function
- "it compiled, so it works"
- the first real segfault lands in production, at 3 a.m.

### // TERMINAL: SHATTERED :: OUR WAY

```
$ ./vault_walk
[ heap ]  resident: 96 KB ─► 1.4 MB
[ panic ] heap exhausted :: bad_alloc
[ ALICE ] neikon... I'm drowning...
SIGSEGV  ::  segmentation fault
```

- an error is not "not accepted" — it breaks the room you are standing in
- the compiler answers with a line and a cause, not the word "fail"
- nobody to ask: the code is someone else's, and that someone is you before the amnesia
- you are not fixing a task, you are fixing the system that locks you out

**Next:** 01 — the numbers on the fundamentals gap · 02 — three difficulty modes and a live demo in this browser · 03 — Alice: local model, zero servers · 04 — reverse-debugging as a subject · 05 — money and roadmap.

### Speaker notes

#### speaker notes :: opening

**First line:** "Ask a junior to write a function — done in a minute. Hand them someone else's broken one — they sit and stare."

**Show the left pane:** this is all the feedback a student gets today. One line. No cause, no next step.

**Show the right one:** the same error in our build. The lights are out, the door is looping, and the compiler named the line and the cause.

**The thesis to take away:** we do not teach writing code — autocomplete already did that. We teach _reading_ someone else's broken code, the one skill autocomplete does not cover.

_If asked "how is this not a game for the sake of a game":_ slide 05, the university dashboard. Keep it ready.

---

## 2. THE DEATH OF FUNDAMENTAL KNOWLEDGE

_// DIAGNOSIS: an epidemic of dependence on code autogenerators_

**Code arrives faster than understanding forms.** Press Tab, get a working function. It builds, the tests are green, the assignment is accepted. The question "why does this work" was never asked once — and by the time it stops working, it is too late to ask and there is nobody to ask.

The core concepts students "know" from the textbook but never _feel_:

```
// glossary :: what lives inside the abyss
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │   POINTER    │   │ MEMORY LEAK  │   │     NULL     │
 │      ↓       │   │  ░░ → ▓▓██   │   │   void *0    │
 │   0xDEADBEEF │   │   ▒▒▓▓██▓▓   │   │   ───────►   │
 │   addr lost  │   │   void grows │   │    crash     │
 └──────────────┘   └──────────────┘   └──────────────┘
```

// "a leak? what leak? it ran fine…"
char* ptr = new char[1024];
// delete[] ptr; ← this line will never be written.
// MEMORY_LEAK : +1024 bytes per call · THE VOID expands.

### Speaker notes

#### speaker notes :: the diagnosis

**The caveat on the numbers — say it yourself, before the question:** this is our estimate from public surveys, not our own study. The order of magnitude matters; the precision does not.

**The main point:** the problem is not that students use AI. They should. The problem is that the one exercise that forced them to understand — debugging their own mistake — has disappeared.

**If there is a teacher in the room:** ask how much of their course goes to reading someone else's code. The answer is almost always none. That hole is where we stand.

Do not say "fear is the best teacher". Say: a consequence you can see sticks, a line in a console does not.

---

## 3. DIFFICULTY = THE PRICE YOU PAY

_// THE PLAYER DECIDES HOW MUCH THEY ARE READY TO KNOW._

**Difficulty ≠ chapter number.** It _does not grow with your level_ — the **player picks it before the start.** The same story, three different frames of perception. The deeper you go, the more detail you see — and the higher the price.

Each mode hands the player its own toolkit and its own set of fears:

```
// ascii :: what the player meets in each mode
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │       EASY       │   │      MEDIUM      │   │       HARD       │
 │      Python      │   │       C++        │   │        C         │
 │   hints are open │   │   hints are late │   │   no hints       │
 │   ── soft faults │   │   ▒▒ geometry    │   │   ╳╳ alice talks │
 │   ── no answers  │   │   ── half-truth  │   │   ── full ending │
 └──────────────────┘   └──────────────────┘   └──────────────────┘
```

// press it and try it **yourself** — this is _not a recording_, it is a small separate game running in the browser. you come round **in first person** in an empty space, walk to the terminal on your own feet, watch the OS boot — and only then start typing commands, with the phantoms coming for your mistakes.

if your device has TTS, Alice speaks out loud on HARD. on EASY/MEDIUM there is no voice — only text and glitches.

### Speaker notes

#### speaker notes :: how to play this on stage

**Hand over the mouse.** "This is not a recording and not a video. It is a game, already loaded in this browser. Who wants to try?"

One of the judges (or you) presses **▶ LAUNCH THE DEMO GAME**. The deck steps aside and a separate screen opens: difficulty select → _a first-person awakening in the void_ (a door glitching in the distance, the terminal glowing to the right) → the player walks over and switches it on → a full OS boot, kernel and graphical shell → and only now the command line. The player types commands. One wrong move and the screen tears, a phantom crawls out, and on HARD Alice's voice breaks apart through speech synthesis. That is the ludonarrative Carpenter wrote about.

**Do not click it yourself.** The whole effect rests on them being the ones who break it.

**What to show if time is short:** hit ▶ LAUNCH without fixing anything, and show that the compiler names the line and the cause while the room breaks in the shape of that error. Thirty seconds, the entire product.

_It runs offline._ If the venue's Wi-Fi dies, the demo will not notice.

---

## 4. ALICE_CORE :: AUTONOMOUS AI

_// QWEN2.5-CODER VIA LLAMA.CPP · $0 SERVERS · WORKS WITH NO WI-FI_

**Alice is not a script with timed lines, and not a wrapper over someone else's API.** She is _Qwen2.5-Coder_ in **GGUF** format, run through **llama.cpp** on the player's own machine. No keys, no account, no network.

Three consequences, and all three are about money and risk. **Server cost is $0:** inference runs on the player's CPU, the token bill never arrives, and the unit economics do not move with the number of players. **The demo does not depend on the venue:** a hackathon with no Wi-Fi, a filtered campus network, a judge's laptop with no connection — it behaves the same. **Student data never leaves the machine:** there is nothing for a university to sign off, because not one byte goes out.

```
// ascii :: nothing leaves — it all runs on the player's machine
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
```

// LUCIDITY 12% "0x00A... col... neikon... delete[]... I'm not... 0xDEAD..."
// LUCIDITY 45% "neikon, line 7 — there's a leak. the destructor is empty. do it."
// LUCIDITY 89% "...neikon. I remembered why I locked access to the kernel."

### Speaker notes

#### speaker notes :: architecture

**The numbers to say out loud:** Qwen2.5-Coder, GGUF Q4_K_M, 4–8 GB RAM, CPU with no GPU, latency 2–8 s, server cost zero.

**Why this is not just "we saved on the API":** running locally removes three risks at once — the token bill, someone else's service going down during the pitch, and getting approval to send student data outside. For a university the third one is often what decides it.

**The honest boundary — say it yourself:** the browser demo you were just clicking does not run the LLM. That build is deterministic logic and recorded voice. The local model is the desktop build; the browser version exists so it can be opened from a QR code with no install.

**If asked about the audio:** Web Audio, one master bus, lines cut by filters and dropouts driven by world state. The voice is Piper, 20 MB, offline.

---

## 5. THE TERMINAL FIGHTS BACK

_// HACK YOUR OWN DEFENCE CODE_

**The terminal is not a tool. It is an adversary.** Before the amnesia, Neikon locked the critical modules himself. Now his own code _will not let him in_, the comments lie, and the variable names mean nothing.

That is **reverse-debugging**: not "write a function", but get into someone else's system with no documentation, work out what it actually does, and fix it without breaking the rest. Every internship starts here — and no course teaches it.

// [VOID_CORRUPTED] recovered from neikon's old logs
bool verifyAccess(const char* token) {
 unsigned int hash = 0xDEAD;
 while (*token)
 hash ^= (hash << 5) + (*token++) + (hash >> 2);
 return hash == getExpectedHash(); // ← this function does not exist.
}
// TASK: implement getExpectedHash() so that Alice gets through.

### Speaker notes

#### speaker notes :: translating this for the jury

**Do not say** "an amnesiac hero hacks his own code" — that sounds like a plot summary. **Say:** "we train reading someone else's legacy — the skill the first job starts with and the curriculum does not have."

**The example that lands:** the fuse task. The number exists only on a plate in the room, it is regenerated on every run, and it is in no file. It cannot be guessed, there is nobody to ask, and generating it is out of the question. You have to get up and read the gauge.

**On the amnesia — one sentence:** it is how we make "someone else's code" your own. The excuse "they gave me a bad project" is gone.

---

## 6. ROADMAP & BUSINESS

_// KICKSTARTER $18,000 · B2C EPISODES · B2B DASHBOARD FOR UNIVERSITIES_

**Two revenue lines out of one product.** Retail pays for the story; the university pays for what the dashboard shows. The student's episode and the teacher's report are built from the same events: which error was made, how many attempts a region took, whether the hint was opened.

### // B2B :: DEBUGGING METRICS DASHBOARD — what the university pays for

// the number = the group's average accuracy on that topic at the end of the episode. The teacher sees where it dropped and assigns a module. This is what no trainer gives: not "solved / not solved", but _how many attempts and what class of error_.

### // scan & play yourself

After the talk the jury scans the code — and within 30 seconds they are clicking through the slides themselves, switching the locale RU / EN / TJ, hitting ▶ RUN in the playground and hearing Alice fall apart.

You don't have to convince them with words — let them _live through_ what you have just described. terminal-shattered.crystalcore.studio

// final.txt
WE ARE NOT BUILDING A TEXTBOOK.
WE ARE BUILDING SURVIVAL.

// TERMINAL: SHATTERED :: NEIKON & ALICE :: 2026 — 2027
// CrystalCore Studio

### Speaker notes

#### speaker notes :: money

**Three numbers to say out loud:** Kickstarter — **$18,000** for EP. 0 and EP. 1, eight months; breakeven — 2,500 copies per episode; server cost — zero, because the model runs on the player's machine.

**Where the $18,000 goes:** voice acting and sound, an artist for the EP. 1 rooms, eight months of work for two people. Have the breakdown ready — they ask almost every time.

**B2B in one sentence:** "The game is free for the university. They pay for the debugging-metrics dashboard — for seeing where the group got stuck, not just who reached the end."

**Why the free license is strategy, not generosity:** it removes procurement. A teacher can put the module in next week, with no budget. The money comes later, and from the faculty level.

**If asked about risk:** the main one is that the university does not buy the dashboard and retail does not pay back the episode. Answer straight: EP. 0 is free and exists to test exactly that, before we spend anyone else's money.


