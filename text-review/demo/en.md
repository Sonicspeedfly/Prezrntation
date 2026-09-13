# Demo text — EN

_Snapshot of the demo's player-facing text. The code is the source of truth (js/demo/, js/core/10-i18n.js), not this file._

---

## Neikon's documents (VoidOS)

### readme

```
if you are reading this console — congratulations, your memory has been
wiped to zero again. i do not know which reboot this is. the counter rolled over.

write down three things while your head still works:

  1. this box is not just software. it is wired into the sector physically.
     edit a byte in the config and a slab moves behind you, loudly.
  2. alice is silent because of me. i went into the kernel by hand and tore her.
     find the logs before this pocket collapses for good.
  3. get the ceiling light on. the noise in my temples starts in the dark.

commands the kernel still answers to:  ls  cat  svc  help
if you forgot the syntax, pull man. do not be slow about it.

                                  — you, five minutes before blackout
```

### note.room

```
writing on my knee while my fingers still hold the stylus.

the space is sealed. four planes, a ceiling, an airlock in the north.
i walked the perimeter counting my steps: sixteen across, twenty-six along.
those same sixteen and twenty-six are set in the volume parameters
in /etc/void.conf. the room is a compiled sector. what sits in the config
sits under my feet.

an emergency partition stands across the hall, blocking the way solid.
the idiot who locked it (that is, the previous me) left the reset script
right there in the root. irony of the highest grade.

the schematic shows three high-voltage pylons. only the one over the
terminal is lit. the other two drowned in the dark behind the bulkhead,
cold as corpses. each has its factory calibration stamped on it. i have to
get to them on foot and read it. do not trust scanners. walk there and
check the marking.
```

### note.door

```
twenty-five metres out through the fog — the outline of the airlock.

it is looping. the load bar reaches 60%, tears with an electrical crack
and drops into an endless restart.

the sound is not mechanical. it is a high-frequency howl that sets your
teeth aching. it resonates straight into the bones of the skull.

the door0 service is sitting in the active process list. it can be force
killed, but i will not do it. cut the loop now and the geometry past the
threshold collapses into vacuum.
```

### note.alice

```
alice is mounted as a system volume. i do not launch her as an executable,
i hold her core straight on the hardware bus.

after that surge... after the crash her image scattered into bad sectors.
fsck is choking on addressing errors. pieces of the code survived, but they
are bare bones — they have to be stitched by hand.

i know the collapse happened through my fault.
the kernel logs are in /var/log/. i am physically afraid to open those files.
```

### note.again

```
writing into this file because the readme has no free blocks left.

forty-seven sessions. forty-seven marks on the desk.
and not one line anywhere says i made it out of here.

the room was sealed by my own hands, that much is clear. the other part
is not: why the hell do i reach the reality pylons every time and trip
on the anchors?

if the memory went again and you do not know who you are:
DO NOT TOUCH the door lock until the whole chain is assembled.
i pulled that switch blind once already. i do not recommend a repeat.
```

### plate.pylon1

```
factory marking stamped into the pylon metal. the paint has flaked:

    PYLON 01 · REALITY ANCHOR
    bound to: alice_core
    log: /var/log/anchor.log

...anchor. i remember this outline. she set it up
so the walls of the pocket sector would not drift into nothing.
and i cut them out at the switch. with my own hands.
```

### plate.pylon2

```
the second pylon. the plate is gouged with a screwdriver over the serial:

    PYLON 02 · AIRLOCK PERIMETER
    DO NOT TOUCH THE LOCK UNTIL THE IMAGE IS WHOLE
    reading this? your memory went again. check lucidity.state

jerky handwriting, mine. the metal is dented, like i beat on it with a fist.
```

### plate.gauge1

```
a high-pressure gauge. the needle has stopped, the glass is under dust:

   CHAMBER A · CURRENT PRESSURE
   {v} bar

stamped under the dial: “actual pressure in the circuit.
not to be confused with the release limit”.
```

### plate.gauge2

```
a steel plate by the vent valve, bolted down hard on four bolts:

   VENT VALVE · CUTOFF LIMIT
   {v} bar

scratched over the enamel in marker:
“PRESSURE BELOW THE LIMIT — THE LOCK LETS GO. ABOVE IT — IT HOLDS TO THE DEATH.
DO NOT FLIP THE SIGN IN THE CONDITION, IDIOT.”
```

### log.anchor

```
/var/log/anchor.log — sector stabilisation system journal

[t-0412] pylons 01, 02, 03 active. volume metric coherence: 100%.
[t-0009] root@neikon: manual_override --disable pylon01, pylon02
[t-0009] CRITICAL ERROR: geometry degrading. the volume is losing its bounds.
[t-0009] root@neikon: force confirm. reason: “they are drowning out her voice”.
[t-0008] pylons 01, 02 powered down.
[t-0002] alice_core: integrity loss. put the anchors back on the net, i cannot hold.
[t-0001] alice_core: neikon... i cannot feel the edges of the room any more...
[t-0000] *** CORE CORRUPTED :: DUMP TERMINATED ***

i switched the anchors off myself. i thought without them i could pick out
her signal.
```

### log.sessions

```
/var/log/session.log — extracted from the crash dump
sessions found: 47

ve-01 .. ve-18   clean entry, lights on, alice online, exit through the airlock
ve-19            the north lamp did not come on. first hardware fault.
ve-23            manual removal of anchors. no logic recorded for it.
ve-31            alice stopped identifying my voice at entry.
ve-40            left a readme.txt file. so i already knew memory was burning.
ve-46            anchor02 removed. terminal died mid-input.
ve-47            session active right now.

forty-seven times i came round in front of this screen.
and forty-six times the room wiped my brain when i tried to leave.
```

---

## Lines and interface reactions

### Desk and terminal

- `desk.alice1` — ...neikon. the frequency is clean. i can finally hear you.
- `desk.alice2` — all three pylons are lit. and the airlock is holding the geometry. i waited so long for you to throw that switch.
- `desk.anomaly` — FAULT INDEX
- `desk.goDoor` — // get up from the desk. the airlock is stable, it is waiting.
- `desk.leave` — stand up from the desk ⏎ esc
- `desk.next` — // entry point
- `desk.nudge.anomaly` — the anomalies are climbing. the air is thickening, the fog is creeping up on the console. patch the code and the entropy drops. so i work.
- `desk.nudge.done` — she is here. the airlock has settled on its collisions. i am not locked in alone with this dark any more.
- `desk.nudge.explore` — this box drives the physics of the room directly. let me run `svc list` and see which nodes have not died yet.
- `desk.nudge.more` — one sector is back up. time to call `fsck` and see how many fragments of the core are still hanging in the air.
- `desk.nudge.recover` — the structures are stitched. that leaves recover.sh. my fingers will not obey on the keys.
- `desk.nudge.start` — there is a readme.txt on the disk. crack it open — the me from before was clearly thinking straighter.
- `desk.placeholder` — type a command · help for the list · Tab completes
- `desk.regions` — // bad sectors in the core
- `desk.services` — // perimeter daemons
- `desk.term.hello` — // crystal-shell :: kernel live. `help` lists the commands. windows drag by their title bar.
- `desk.volume` — SYSTEM VOLUME

### Environment anomalies

- `glitch.drift` — // the floor collisions have drifted. the horizon is tipping.
- `glitch.dup` — // an echo in the ceiling. something duplicated in the buffer of the space.
- `glitch.flicker` — // the supply phase has sagged. the lamps are dying down the chain.
- `glitch.ghost` — // sensors read mass where the geometry is empty.
- `glitch.loop` — // the airlock loop has run away. the metal is vibrating at ultrasound.

### Critical failure (jump scare)

- `scare.alice1` — [ alice ] neikon... someone has hijacked my audio stream. i am not the one generating these words...
- `scare.alice2` — [ alice ] do not close the console. do not leave me in the dark. do not le-
- `scare.kernEnd` — [ kern ] *** CARRIER SIGNAL LOST :: CONNECTION TERMINATED ***
- `scare.kernStat` — [ kern ] page_faults: ∞ · sanity: {s}% · fear_level: {f}%
- `scare.kpanic` — *** FATAL KERNEL PANIC :: ALICE_CORE CORRUPTED BEYOND RECOVERY ***
- `scare.voice` — you gave me your word... you promised you would get me out...

### Walking away

- `walk.alice` — [ alice ] ...you are really just going to turn around and walk? i had only started putting the memory back together...
- `walk.sys` — // terminal reset. recovery progress wiped.
- `walk.title` — // step by step · jury walk
- `walk.voice` — running again... coward...

### Session endings

- `end.again` — ▶ restart the cycle
- `end.cliff.sub` — the geometry past the threshold never compiled. she tore her voice open on the warning — but the sole of the boot had already slipped into nothing. episode 0 breaks off here. the fall has started.
- `end.cliff.title` — sector cut-off.
- `end.cry` — NEIKON, BACK! THERE IS NOTHING THERE!
- `end.exit` — ✕ back to the talk slides
- `end.lose.body_broken` — your fingers came off the keyboard. but a third party went on typing the commands for you.
- `end.lose.body_fear` — you heard heavy boots behind you, where nothing could have been walking. fear = 100.
- `end.lose.body_sanity` — you started answering the console in her own voice. sanity = 0.
- `end.lose.sub` — the mind did not hold against the sensory hit. FEAR punched through the ceiling. you are not in control of the terminal any more.
- `end.lose.tag` — // BRAIN FREEZE — operator breakdown
- `end.lose.title` — system collapse.
- `end.partial.body` — you repaired the facade and nothing behind it. / the unwritten lines are left rotting in memory: the damaged regions of the base are unstable, and the next fault wipes everything down to the foundation.
- `end.partial.sub` — only {n} of {total} sectors restored. the remaining fragments of Alice will go on decaying — without you now.
- `end.partial.tag` — // PARTIAL RECOVERY — incomplete build
- `end.partial.title` — abandoned halfway.
- `end.walked.body` — you typed exit and let go of the keys. a dead silence settled in the room. / Alice will go on crumbling into the void. her strangled whisper will meet you the forty-eighth time you switch this machine on.
- `end.walked.sub` — not one task closed. the terminal screen went dark, but she stayed in there — locked inside a failing core.
- `end.walked.tag` — // SESSION ABORTED — a coward's exit
- `end.walked.title` — you just gave up.
- `end.win.body` — you rebuilt her artificial soul a fragment at a time and pulled the circuit out of its spin. / but past the open airlock there is an endless dead corridor of the sector. someone cut the base's power cables from outside. and that someone is still here.
- `end.win.sub` — the digital noise has drained away. Alice's core is on a stable frequency. you remembered your own name — and remembered what this room cost.
- `end.win.tag` — // SYSTEM RESTORED — 100% of modules active
- `end.win.title` — you got her out.

### Waking in the dark

- `void.compass` — safe mode console
- `void.examine.door` — APPROACH THE AIRLOCK
- `void.examine.pylon` — EXAMINE THE PYLON
- `void.log_power` — // bus alive :: the terminal is coming out of its crash dump
- `void.log_wake` — // waking :: operator conscious, no sector lighting
- `void.nudge` — i should walk toward the light of that tube. i was not left a choice anyway.
- `void.sit` — SIT DOWN AT THE KEYBOARD
- `void.sub1` — ...the dark presses on my temples. the floor is ice. my head is empty — no name, not one memory.
- `void.sub2` — out ahead, the outline of a heavy door is beating inside an endless glitch. getting nowhere. for a very long time.
- `void.sub3` — a greenish tube of an old monitor flickers to the right. the only working node in this grave.
- `void.use` — POWER THE TERMINAL UP

---

## Tasks: room reaction and hints

### room-lamp — wake the north lamp

_Reaction to the fix:_ a dry click of the relay. the ceiling lamp blinked, spat out a shower of sparks and flooded the desk with white. one less blind spot around me.

- hint: the config reads top to bottom. one line here disagrees with all the others.
- for the jury: These are a lamp's settings. Every line is `setting = value`. Find the line saying the lamp is `disabled` and make it `enabled`. Nothing else needs touching. ▶ RUN.

### room-fog — clear the air

_Reaction to the fix:_ the vent grilles howled, pulling the aerosol in. the fog settled. first time i can see the far wall of the hall — and going by the scratches on the armour plate, it was better off in the fog.

**Python**
- hint: a filter, by definition, takes something away. look at what the line inside the loop does to the density.
- for the jury: Three filters are running and each should **remove** 0.03 of haze. The line `density = density + 0.03` has a plus, so the filters are adding it instead. Change the `+` to a `-`. One character. ▶ RUN.

**C++**
- hint: a filter, by definition, takes something away. look at what the line inside the loop does to the density.
- for the jury: Three filters are running and each should **remove** 0.03 of haze. The line `density = density + 0.03f;` has a plus, so the filters are adding it instead. Change the `+` to a `-`. One character. ▶ RUN.

**C**
- hint: a filter, by definition, takes something away. look at what the line inside the loop does to the density.
- for the jury: Three filters are running and each should **remove** 0.03 of haze. The line `density = density + 0.03f;` has a plus, so the filters are adding it instead. Change the `+` to a `-`. One character. ▶ RUN.

### room-interlock — release the partition interlock

_Reaction to the fix:_ a dull hydraulic blow shook the floor. four armour panels of the partition hissed down into their slots in the ceiling. burnt wiring and cold came out of the opening.

**Python**
- hint: both numbers are in the room, not in the system. and read out loud which of them the lock is supposed to let go under.
- for the jury: Two things. **First:** `VENT_LIMIT = 0.0` is a placeholder. The real limit is stamped on the rating plate by the vent valve, on the right-hand wall: get up, walk over, press `E` and copy the number across. **Second:** the plate says by hand that the lock lets go when pressure is **below** the limit, and the code says `>`. Make it `<`. ▶ RUN.

**C++**
- hint: both numbers are in the room, not in the system. and read out loud which of them the lock is supposed to let go under.
- for the jury: Two things. **First:** `VENT_LIMIT = 0.0` is a placeholder. The real limit is stamped on the rating plate by the vent valve, on the right-hand wall: get up, walk over, press `E` and copy the number across. **Second:** the plate says by hand that the lock lets go when pressure is **below** the limit, and the code says `>`. Make it `<`. ▶ RUN.

**C**
- hint: both numbers are in the room, not in the system. and read out loud which of them the lock is supposed to let go under.
- for the jury: Two things. **First:** `VENT_LIMIT = 0.0` is a placeholder. The real limit is stamped on the rating plate by the vent valve, on the right-hand wall: get up, walk over, press `E` and copy the number across. **Second:** the plate says by hand that the lock lets go when pressure is **below** the limit, and the code says `>`. Make it `<`. ▶ RUN.

### room-door — stop the door's retry loop

_Reaction to the fix:_ the wild shriek of the relay finally choked off. the airlock mechanism stopped at a steady 100%. the silence after it deafens harder than it ever did.

**Python**
- hint: read the condition out loud, all of it. it describes exactly what must not happen.
- for the jury: Right now it says: “if the image is damaged, open the door, otherwise retry”. That is backwards. The door may only open once the image is **whole**, and it should keep retrying while it is damaged. Swap the line after `if` with the line after `else`. ▶ RUN.

**C++**
- hint: read the condition out loud, all of it. it describes exactly what must not happen.
- for the jury: Right now it says: “if the image is damaged, `door.open()`, otherwise `door.retry()`”. That is backwards. Swap what is inside the braces after `if` with what is inside the braces after `else`. ▶ RUN.

**C**
- hint: read the condition out loud, all of it. it describes exactly what must not happen.
- for the jury: Right now it says: “if the image is damaged, `door_open()`, otherwise `door_retry()`”. That is backwards. Swap what is inside the braces after `if` with what is inside the braces after `else`. ▶ RUN.

### room-sessions — restore the session log

_Reaction to the fix:_ the monitor blinked. the list unfolded to forty-seven lines. i read the last entry three times — the number is not lying. this is attempt forty-seven.

**Python**
- hint: one entry survives although the loop walked over all of them. look at what happens to the list on each turn.
- for the jury: `history = [s]` does not mean “add”, it means “make the list be one item”. Every turn of the loop wipes what came before. It needs to append instead: `history.append(s)`. ▶ RUN.

**C++**
- hint: one entry survives although the loop walked over all of them. look at what happens to the list on each turn.
- for the jury: `history = { s };` assigns the vector a fresh one-item content, throwing away everything before it. To add to the end there is `history.push_back(s);`. ▶ RUN.

**C**
- hint: one entry survives although the loop walked over all of them. look at what happens to the list on each turn.
- for the jury: The loop writes to `history[0]` every time — the same cell, over and over. The loop already has a counter `i` that is different on every turn. Write to `history[i]` instead. ▶ RUN.

### room-anchors — put the anchors back

_Reaction to the fix:_ the floor stopped trembling under my feet. the geometry of the walls set hard, the edges went sharp. the room finally has physical mass.

**Python**
- hint: the anchor journal says how many there were. this list has fewer.
- for the jury: This list is which anchors hold the room together. `/var/log/anchor.log` says there were three: 01, 02 and 03. The Neikon from before struck two of them out. Add the missing ones to the list, in quotes, separated by commas. ▶ RUN.

**C++**
- hint: the anchor journal says how many there were. this list has fewer.
- for the jury: This list is which anchors hold the room together. `/var/log/anchor.log` says there were three: 01, 02 and 03. Add the missing ones inside the braces, in quotes, separated by commas. ▶ RUN.

**C**
- hint: the anchor journal says how many there were. this list has fewer — and next to it sits a number that also says how many.
- for the jury: There were three: 01, 02 and 03 — `/var/log/anchor.log` says so. Add the missing ones inside the braces, in quotes, separated by commas. And you **must** also fix `count`: the loop runs up to that number, not to the end of the list, so with `count = 1` it will bind only the first. It has to become `count = 3`. ▶ RUN.

### room-override — override the airlock

_Reaction to the fix:_ the locking bolts ground back into their slots. the massive slab shifted a couple of centimetres. the way is open — and it did not make anything easier.

**Python**
- hint: the lock takes the anchors in order and counts them. count how many keys the loop actually feeds it.
- for the jury: There are three keys, and `range(1, len(KEYS))` starts at the **second** one — the lock never receives the first anchor, so it rejects the sequence. Start from zero: `range(0, len(KEYS))`. ▶ RUN.

**C++**
- hint: the lock takes the anchors in order and counts them. count how many keys the loop actually feeds it.
- for the jury: There are three keys and the loop starts at `i = 1` — the lock never receives the first anchor. Make it `size_t i = 0`. One number. ▶ RUN.

**C**
- hint: the lock takes the anchors in order and counts them. count how many keys the loop actually feeds it.
- for the jury: There are three keys and the loop runs while `i < 2` — it feeds only two. The lock never gets the third anchor and rejects the sequence. Make it `i < 3`. ▶ RUN.

