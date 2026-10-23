/* ============================================================
   TERMINAL: SHATTERED — demo
   ------------------------------------------------------------
   The playable demo: stages, window manager, desktop apps, repair pane.

   Part 6/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const DG = (function () {

        /* Locale-aware string lookup.  Delegates to the global `t()`
           defined alongside STRINGS; if for some reason it is not
           reachable yet (init race), fall back to the key itself. */
        function tx(key) {
            try {
                if (typeof t === "function") return t(key);
                if (typeof window !== "undefined"
                    && window.STRINGS
                    && window.settingsState
                    && window.STRINGS[window.settingsState.locale]
                    && window.STRINGS[window.settingsState.locale][key] != null) {
                    return window.STRINGS[window.settingsState.locale][key];
                }
            } catch (e) {}
            return key;
        }

        /* Pull a task field from i18n, as `demo.task.<id>.<field>`.
           Tries `strId` first, then the plain `id`: hints have to name
           real syntax and so exist once per language, while the title and
           Alice's line describe the room and are written once per task.
           Falls back to whatever is inline in the ladder table. */
        function taskField(task, field) {
            if (!task) return "";
            const ids = task.strId ? [task.strId, task.id] : [task.id];
            for (let i = 0; i < ids.length; i++) {
                const key = "demo.task." + ids[i] + "." + field;
                try {
                    if (typeof t === "function") {
                        const v = t(key);
                        if (v && v !== key) return v;
                    }
                    if (typeof window !== "undefined"
                        && window.STRINGS
                        && window.settingsState) {
                        const loc = window.STRINGS[window.settingsState.locale];
                        if (loc && loc[key] != null) return loc[key];
                    }
                } catch (e) {}
            }
            return task[field] || "";
        }

        /* per-difficulty knobs */
        const PROFILES = {
            /* `lang` used to name the language each difficulty played in —
               Python / C++ / Pure C. One ladder now serves all three, so the
               field was both dead and misleading and has been dropped; the
               editor takes its language tag from the task itself. */
            easy: {
                label:        "EASY",
                sanityDecay:  0.15,
                fearGainBad:  8,
                fearGainGood: -4,
                ghostChance:  0.18,
                shakeChance:  0.15,
                shakeHard:    false,
                voice:        false,
                hintStrength: 1.0,     // full hints
                bootDelay:    1800,
                endText:      "EASY-ending · ты ушёл, не разобравшись.",
                endSub:       "ты увидел половину сцены. на HARD спрятано в три раза больше — и голос Элис."
            },
            medium: {
                label:        "MEDIUM",
                sanityDecay:  0.35,
                fearGainBad:  16,
                fearGainGood: -3,
                ghostChance:  0.45,
                shakeChance:  0.50,
                shakeHard:    false,
                voice:        false,
                hintStrength: 0.65,    // some hints get garbled
                bootDelay:    2200,
                endText:      "MEDIUM-ending · ты увидел больше, но не всё.",
                endSub:       "часть архива Элис всё ещё закрыта. HARD пускает дальше."
            },
            hard: {
                label:        "HARD",
                sanityDecay:  0.60,
                fearGainBad:  28,
                fearGainGood: -2,
                ghostChance:  0.85,
                shakeChance:  0.90,
                shakeHard:    true,
                voice:        true,
                hintStrength: 0.32,    // hints are sparse and corrupted
                bootDelay:    2600,
                endText:      "HARD-ending · полная правда.",
                endSub:       "это та концовка, ради которой игра написана."
            }
        };

        /* Which anomaly a failed repair writes into the room. Chosen so the
           room breaks in the shape of the mistake: a loop that walks past
           its own range duplicates things, a condition that never lets go
           makes the door retry forever, a light told to stay off flickers,
           and anything that loses the room's record of itself makes the
           floor disagree with itself.

           Five kinds for six tasks, so one repeats -- `sessions` and
           `anchors` share `drift` on purpose: both are the room losing its
           grip on what it used to be. Documented in docs/GAME.md. */
        const TASK_GLITCH = {
            "room-lamp":     "flicker",
            "room-fog":      "ghost",
            "room-interlock": "dup",
            "room-door":     "loop",
            "room-sessions": "drift",
            "room-anchors":  "drift",
            "room-override": "loop"
        };

        /* ============================================================
           THE LADDER

           Difficulty picks the language, exactly as the difficulty screen
           promises: Python on EASY, C++ on MEDIUM, plain C on HARD. What
           it does not pick is how hard the *ideas* are. All three ladders
           ask the same seven questions in the same order, because the story
           depends on the room changing in the same way -- and because an
           off-by-one is an off-by-one whether it is written `range(1, 4)`
           or `panel = 1; panel < 4`. Nobody is asked to manage memory by
           hand on any difficulty.

           Two identities per task:
             `id`     the world identity. Quests, anomalies, /opt/room
                      paths and `world.repaired` all key off it, so it is
                      the same on every difficulty.
             `strId`  the localisation identity. Hints have to name real
                      syntax, so they differ per language. taskField()
                      prefers strId and falls back to id, which lets the
                      title and Alice's line be written once per task.

           Shape of the run: one config file to learn on, logic problems in
           the middle (one of which can only be solved by walking to the
           wall instruments), two story tasks carrying the twist, and an
           override that breaks the airlock open at the end.
           ============================================================ */
        /* ============================================================
           THE FAKE COMPILER
           ------------------------------------------------------------
           A failed repair used to say one of two sentences and a file
           name. No line, no column, no reason — on the one surface whose
           whole premise is a machine that answers you honestly. Worse, it
           lied in both directions: the branch-swap fix (which `room-door`
           *teaches* two tasks later) was reported as "the bug is still
           there", and a C build that reads past the end of its array was
           reported as "it compiles".

           So a failure is now an object, not a boolean:

             { line, col, severity: "error"|"warning",
               flag: "-Werror=array-bounds"|null,
               msg:  "array subscript is out of bounds",
               fn:   "main"|"<module>"|null,
               notes: [{line, col, msg}],
               run:   ["core: bind anchor01  ok", ...] }

           line/col are searched in the buffer the PLAYER is holding —
           never in task.code — so they stay right after any edit.

           Everything the pane prints is machine vocabulary and is NOT
           translated, same rule as ls/ps/dmesg (docs/ARCHITECTURE.md,
           "Локализация"). The plain-language explanation already has a
           home: the `?? для жюри` button.
           ============================================================ */

        /* Two digits, the way the gutter numbers its rows, so a diagnostic
           that says :06: points at the row marked 06. NOT called pad2 —
           07-deck.js already owns that global, and shadowing it is the
           exact trap docs/ARCHITECTURE.md warns about under "Голое имя
           функции, совпадающее с глобальным". */
        function edPad2(n) { return (n < 10 ? "0" : "") + n; }

        /* Match against code, not against the player's notes. Someone who
           comments the old line out instead of deleting it has fixed the
           bug; someone who writes the missing anchor names in a TODO has
           not. Block comments are blanked rather than removed so the line
           count — and therefore every diagnostic line number — is
           unchanged. `#` is only a comment on the Python ladder and in the
           room config; in C it would eat a preprocessor directive. */
        function stripComments(src, lang) {
            let s = String(src || "");
            s = s.replace(/\/\*[\s\S]*?\*\//g, function (m) {
                return m.replace(/[^\n]/g, " ");
            });
            s = s.replace(/\/\/[^\n]*/g, "");
            if (lang === "PYTHON" || lang === "ROOM-CFG") s = s.replace(/#[^\n]*/g, "");
            return s;
        }

        function findIn(code, re) {
            const lines = String(code || "").split("\n");
            const rx = new RegExp(re.source, (re.flags || "").replace("g", ""));
            for (let i = 0; i < lines.length; ++i) {
                const m = lines[i].match(rx);
                if (m) return { line: i + 1, col: m.index + 1, text: lines[i] };
            }
            return { line: 1, col: 1, text: lines[0] || "" };
        }

        function dg(raw, at, severity, flag, msg, extra) {
            const p = findIn(raw, at);
            const d = { line: p.line, col: p.col, text: p.text,
                        severity: severity, flag: flag || null, msg: msg };
            extra = extra || {};
            if (extra.fn)  d.fn  = extra.fn;
            if (extra.run) d.run = extra.run;
            if (extra.notes) {
                d.notes = extra.notes.map(function (n) {
                    const q = findIn(raw, n[0]);
                    return { line: q.line, col: q.col, msg: n[1] };
                });
            }
            return d;
        }

        /* The build command is not new data — it is already the first line
           of every task's success log, so a failed build echoes exactly the
           command a successful one would. */
        function buildCmd(task)  { return ((task.success && task.success[0]) || "$ build").replace(/^\$\s*/, ""); }
        function buildTool(task) { return buildCmd(task).split(/\s+/)[0]; }

        /* One renderer, two consumers: the pane under the editor and the
           terminal scrollback, so the reason survives closing the editor. */
        function diagLines(task, d) {
            const out  = [];
            const tool = buildTool(task);
            const at   = function (l, c) { return task.file + ":" + edPad2(l) + ":" + edPad2(c) + ": "; };
            out.push({ cls: "sev-cmd", text: "$ " + buildCmd(task) });

            if (tool === "python3") {
                /* Python has no static diagnostics — the honest shape is a
                   traceback with the real line, or a RuntimeWarning. */
                if (d.severity === "error") {
                    out.push({ cls: "sev-ctx",   text: "Traceback (most recent call last):" });
                    out.push({ cls: "sev-ctx",   text: '  File "' + task.file + '", line ' + d.line +
                                                       ", in " + (d.fn || "<module>") });
                    out.push({ cls: "sev-ctx",   text: "    " + String(d.text || "").trim() });
                    out.push({ cls: "sev-error", text: "RoomError: " + d.msg });
                } else {
                    out.push({ cls: "sev-warning",
                               text: task.file + ":" + d.line + ": RoomWarning: " + d.msg });
                }
            } else if (tool === "roomctl") {
                out.push({ cls: "sev-" + d.severity,
                           text: at(d.line, d.col) + d.severity + ": " + d.msg + " [roomctl]" });
            } else {                                   /* gcc / g++ */
                if (d.fn) out.push({ cls: "sev-ctx", text: task.file + ": In function '" + d.fn + "':" });
                out.push({ cls: "sev-" + d.severity,
                           text: at(d.line, d.col) + d.severity + ": " + d.msg +
                                 (d.flag ? " [" + d.flag + "]" : "") });
            }
            (d.notes || []).forEach(function (n) {
                out.push({ cls: "sev-note", text: at(n.line, n.col) + "note: " + n.msg });
            });
            if (d.severity === "error" && (tool === "gcc" || tool === "g++")) {
                out.push({ cls: "sev-error", text: "cc1: all warnings being treated as errors" });
                out.push({ cls: "sev-error", text: "make: *** [" + task.file + "] Error 1" });
            }
            (d.run || []).forEach(function (l) { out.push({ cls: "sev-run", text: l }); });
            return out;
        }

        /* ------------------------------------------------------------
           room-interlock — a semantic check, all three ladders.

           The rule is one sentence: RELEASE while the pressure is BELOW
           the vent limit, HOLD at the limit and above. That sentence has
           more than one correct spelling:

               if p <  L: release else: hold     <- canonical
               if p <= L: release else: hold
               if L >  p: release else: hold
               if p >  L: hold    else: release  <- branches swapped
               if p >= L: hold    else: release

           The old literal check knew only the first and told everyone else
           "the bug is still there" — which is the fix `room-door` asks for
           two tasks later. So read the snippet instead of matching it: pull
           the limit out of the assignment, pull (left, op, right) out of
           the condition, normalise it to pressure-first, and require the
           branch that runs on LOW pressure to be the release.

           NOTHING here may print the correct limit. It is rolled at boot
           and exists only on a plate in the room — docs/ARCHITECTURE.md,
           "Проверка, которой нет в таблице". The closure touches VoidOS
           only when ▶ is pressed, so the temporal-dead-zone rule holds.
           ------------------------------------------------------------ */
        function interlockCheck(d) {
            const q = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
            const P = "(?:" + q(d.press) + "\\s*\\(\\s*\\))";
            const CMP = new RegExp("(" + P + "|VENT_LIMIT)\\s*(<=|>=|<|>)\\s*(" + P + "|VENT_LIMIT)");
            const FLIP = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
            return function (src, raw) {
                const want    = VoidOS.world.gauges.vent;
                const chamber = VoidOS.world.gauges.pressure;

                /* --- 1. the number off the plate --- */
                if (/VENT_LIMIT\s*=\s*\d+\s*,\s*\d/.test(src)) {
                    return dg(raw, /VENT_LIMIT\s*=/, "error", "-Werror=room-literal",
                              "expected '.' in the vent limit, found ','");
                }
                const asg = src.match(/VENT_LIMIT\s*=\s*([+-]?\d+(?:\.\d+)?)\s*[fF]?/);
                if (!asg) {
                    return dg(raw, /VENT_LIMIT/, "error", "-Werror=room-literal",
                              "'VENT_LIMIT' is not assigned a number", { fn: d.fn });
                }
                const got = parseFloat(asg[1]);
                if (Math.abs(got) < 1e-9) {
                    return dg(raw, /VENT_LIMIT\s*=/, "error", "-Werror=room-placeholder",
                              "'VENT_LIMIT' is still the 0.0 placeholder", {
                        fn: d.fn,
                        run: ["interlock: no limit to compare against",
                              "interlock: safety refuses to arm. barrier stays up."] });
                }
                if (Math.abs(got - chamber) < 1e-6) {
                    return dg(raw, /VENT_LIMIT\s*=/, "error", "-Werror=room-literal",
                              "'VENT_LIMIT' holds the chamber reading, not the valve limit", {
                        fn: d.fn,
                        run: ["interlock: " + got.toFixed(1) +
                              " bar is what the manometer says; the plate is on the valve"] });
                }
                if (Math.abs(got - want) > 0.001) {
                    return dg(raw, /VENT_LIMIT\s*=/, "error", "-Werror=room-literal",
                              "'VENT_LIMIT' does not match the vent valve plate", {
                        fn: d.fn,
                        run: ["interlock: refusing a limit the valve never stamped"] });
                }

                /* --- 2. the comparison, normalised to pressure-first --- */
                const c = src.match(CMP);
                if (!c) {
                    return dg(raw, /\bif\b/, "error", "-Werror=room-logic",
                              "no comparison between the chamber pressure and 'VENT_LIMIT'",
                              { fn: d.fn });
                }
                const leftIsP  = c[1].indexOf("(") >= 0;
                const rightIsP = c[3].indexOf("(") >= 0;
                if (leftIsP === rightIsP) {
                    return dg(raw, CMP, "error", "-Werror=room-logic",
                              "comparison does not put the pressure against 'VENT_LIMIT'",
                              { fn: d.fn });
                }
                const op = leftIsP ? c[2] : FLIP[c[2]];
                const lowTakesThen = (op === "<" || op === "<=");

                /* --- 3. which call runs when the pressure is low --- */
                const after = src.slice(src.indexOf(c[0]) + c[0].length);
                const iRel  = after.indexOf(d.release);
                const iHold = after.indexOf(d.hold);
                if (iRel < 0 || iHold < 0) {
                    return dg(raw, /\bif\b/, "error", "-Werror=room-logic",
                              "'" + (iRel < 0 ? d.release : d.hold) +
                              "' is gone — there is a pressure with no branch",
                              { fn: d.fn });
                }
                if (lowTakesThen !== (iRel < iHold)) {
                    return dg(raw, CMP, "error", "-Werror=room-logic",
                              "interlock releases at or above the vent limit; the valve plate says below", {
                        fn: d.fn,
                        run: ["interlock: pressure " + chamber.toFixed(1) + " bar -> " + d.hold,
                              "interlock: barrier stays up"] });
                }
                return null;
            };
        }

        /* ------------------------------------------------------------
           room-anchors — semantic check, all three ladders.

           Two different mistakes, and the player has to be told which:

             * a name still missing from the list -> the volume comes up
               with a hole in it. A bad RESULT, not a bad build.
             * on C only, `count` and the length of active[] drifting apart
               -> core_bind(active[i]) walks off the end. That is a real
               out-of-bounds read and gcc names it exactly:
               [-Werror=array-bounds]. Report it as an error, not as
               "compiles but does not do the right thing".

           The bounds check runs BEFORE the missing-name check: a build that
           does not build has nothing to say about coherence.
           ------------------------------------------------------------ */
        const ANCHORS_NEED = ["anchor01", "anchor02", "anchor03"];

        function anchorsRun(bound) {
            const out = bound.map(function (a) { return "core: bind " + a + "  ok"; });
            const hit = bound.filter(function (a) { return ANCHORS_NEED.indexOf(a) >= 0; });
            const pct = Math.round(hit.length / ANCHORS_NEED.length * 100);
            const gone = ANCHORS_NEED.filter(function (a) { return bound.indexOf(a) < 0; });
            out.push("core: coherence " + pct + "% — " +
                     (gone.length ? "'" + gone.join("', '") + "' never bound" : "volume unstable"));
            return out;
        }

        function anchorsCheck(d) {
            return function (src, raw) {
                const m = src.match(d.listRe);
                if (!m) {
                    return dg(raw, new RegExp("\\b" + d.list + "\\b"), "error", "-Werror=room-decl",
                              "'" + d.list + "' is not initialised with a list of anchors",
                              { fn: d.fn });
                }
                const items = (m[1].match(/"[^"]*"|'[^']*'/g) || [])
                                .map(function (s) { return s.slice(1, -1).trim(); });

                if (d.count) {
                    const cm = src.match(new RegExp("\\b" + d.count + "\\s*=\\s*([^;\\n]+)"));
                    if (!cm) {
                        return dg(raw, new RegExp("\\b" + d.count + "\\b"), "error", "-Werror=room-decl",
                                  "'" + d.count + "' is not assigned a count", { fn: d.fn });
                    }
                    /* sizeof(active)/sizeof(active[0]) cannot desync — accept
                       it outright and skip the bound comparison. */
                    const derived = /sizeof\s*\(/.test(cm[1]);
                    const n = derived ? items.length : parseInt(cm[1], 10);
                    if (!derived && !isFinite(n)) {
                        return dg(raw, new RegExp("\\b" + d.count + "\\s*="), "error", "-Werror=room-decl",
                                  "'" + d.count + "' is not an integer", { fn: d.fn });
                    }
                    if (n > items.length) {
                        /* Anchor on the bind CALL, not on the bare name:
                           the file's own header comment mentions active[],
                           and findIn searches the raw buffer so the first
                           match would be that comment line. */
                        return dg(raw, new RegExp(d.bind + "\\s*\\(\\s*" + d.list + "\\s*\\["),
                                  "error", "-Werror=array-bounds",
                                  "array subscript is out of bounds", {
                            fn: d.fn,
                            notes: [
                              [d.listRe, "while referencing '" + d.list + "'"],
                              [new RegExp("\\b" + d.count + "\\s*="),
                               "'" + d.count + "' is " + n + ", '" + d.list + "' holds " +
                               items.length + (items.length === 1 ? " element" : " elements")]
                            ] });
                    }
                    if (n < items.length) {
                        return dg(raw, new RegExp("\\b" + d.count + "\\s*="), "warning", "-Wroom-bound",
                                  "'" + d.count + "' is " + n + " but '" + d.list + "' holds " +
                                  items.length + " elements — the loop stops early", {
                            fn: d.fn, run: anchorsRun(items.slice(0, n)) });
                    }
                }

                const missing = ANCHORS_NEED.filter(function (a) { return items.indexOf(a) < 0; });
                if (missing.length) {
                    return dg(raw, d.listRe, "warning", "-Wroom-coherence",
                              "'" + missing.join("', '") + "' never reaches '" + d.bind + "'",
                              { fn: d.fn, run: anchorsRun(items) });
                }
                return null;
            };
        }

        /* ------------------------------------------------------------
           room-door — which call sits on the damaged-image path.
           The old regex started at `image_is_damaged` and never looked
           left of it, so negating the condition — a correct fix — was
           failed as "the bug is still there".
           ------------------------------------------------------------ */
        function doorCheck(d) {
            return function (src, raw) {
                const c = src.match(/if\s*\(?\s*(!|not\s+)?\s*image_is_damaged\s*\(\s*\)/);
                if (!c) {
                    return dg(raw, /\bif\b/, "error", "-Werror=room-logic",
                              "nothing tests 'image_is_damaged'", { fn: d.fn });
                }
                const after  = src.slice(src.indexOf(c[0]) + c[0].length);
                const iOpen  = after.indexOf(d.open);
                const iRetry = after.indexOf(d.retry);
                if (iOpen < 0 || iRetry < 0) {
                    return dg(raw, /else/, "error", "-Werror=room-logic",
                              "no path holds the door; '" + (iOpen < 0 ? d.retry : d.open) +
                              "' is the only call left", { fn: d.fn });
                }
                const negated = !!c[1];
                const damagedOpens = negated ? (iRetry < iOpen) : (iOpen < iRetry);
                if (damagedOpens) {
                    return dg(raw, new RegExp(d.open.replace(".", "\\.") + "\\s*\\("),
                              "warning", "-Wroom-logic",
                              "'" + d.open + "' is on the damaged-image path", {
                        fn: d.fn,
                        run: ["door0: image damaged -> opening anyway",
                              "door0: reload -> damaged -> opening -> reload ...",
                              "doorctl: watchdog: door0 never settles"] });
                }
                return null;
            };
        }

        /* ------------------------------------------------------------
           room-override — does the loop push every key, and only keys
           that exist? The literal `i < 3` check rejected `i <= 2` and
           `i < count`, and the Python one rejected idiomatic
           `range(len(KEYS))`. Read the bound instead.
           ------------------------------------------------------------ */
        function overrideCheck(d) {
            return function (src, raw) {
                const m = src.match(d.listRe);
                const all = m ? (m[1].match(/"[^"]*"|'[^']*'/g) || []) : [];
                const n = all.length;
                /* python: range(a, b) | range(b);  c/c++: i = a; i < b | i <= b */
                const py = src.match(/range\s*\(\s*(?:(\d+)\s*,\s*)?([^)]+)\)/);
                const cc = src.match(/for\s*\([^;]*?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<=|<)\s*([^;]+);/);
                let lo = 0, hi = n;
                if (cc) {
                    lo = parseInt(cc[2], 10);
                    hi = /size\(\)|sizeof|count/.test(cc[4]) ? n
                       : parseInt(cc[4], 10) + (cc[3] === "<=" ? 1 : 0);
                } else if (py) {
                    lo = py[1] ? parseInt(py[1], 10) : 0;
                    hi = /len\s*\(/.test(py[2]) ? n : parseInt(py[2], 10);
                }
                if (!isFinite(lo) || !isFinite(hi)) return null;
                if (hi > n) {
                    return dg(raw, new RegExp(d.keys + "\\s*\\["), "error", "-Werror=array-bounds",
                              "array subscript " + (hi - 1) + " is above array bounds of '" +
                              d.decl + "[" + n + "]'", {
                        fn: d.fn, notes: [[d.listRe, "while referencing '" + d.keys + "'"]] });
                }
                if (lo > 0 || hi < n) {
                    const pushed = all.slice(lo, hi).map(function (s) { return s.slice(1, -1); });
                    return dg(raw, cc ? /for\s*\(/ : /range\s*\(/, "warning", "-Wroom-bound",
                              "loop covers " + (hi - lo) + " of " + n + " keys in '" + d.keys + "'", {
                        fn: d.fn,
                        run: pushed.map(function (k) { return "lock: key " + k + " accepted"; })
                             .concat(["lock: sequence rejected — expected " + n +
                                      " keys, got " + pushed.length, "door0: SEALED"]) });
                }
                return null;
            };
        }

        const LADDER_PY = [
            {
                id:      "room-lamp",
                tier:    "intro",
                lang:    "ROOM-CFG",
                file:    "/opt/room/lamp.cfg",
                code:
                    "# /opt/room/lamp.cfg — северный светильник\n" +
                    "\n" +
                    "id       = lamp1\n" +
                    "power    = disabled\n" +
                    "level    = 0.85\n" +
                    "warmup   = 1.2\n",
                must:    [/power\s*=\s*enabled\b/i],
                mustNot: [/power\s*=\s*disabled\b/i],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /power\s*=\s*disabled/i, "error", null,
                                  "'power' is 'disabled'; refusing to bring lamp1 up");
                    },
                    partial: function (raw) {
                        return dg(raw, /power\s*=\s*\S+/i, "error", null,
                                  "unknown value for key 'power'",
                                  { notes: [[/power\s*=/i, "valid values: enabled, disabled"]] });
                    }
                },
                success: [
                    "$ roomctl apply /opt/room/lamp.cfg",
                    "lamp1: power enabled, level 0.85",
                    "lamp1: up"
                ],
                effect:  { lamp: "lamp1", on: true }
            },
            {
                id:      "room-fog",
                strId:   "room-fog-py",   // hints name real syntax
                tier:    "mid",
                lang:    "PYTHON",
                file:    "/opt/room/fog.py",
                code:
                    "# /opt/room/fog.py — взвесь в объёме\n" +
                    "# три фильтра в строю, каждый должен убирать 0.03\n" +
                    "\n" +
                    "density = 0.11\n" +
                    "\n" +
                    "for f in filters.online():\n" +
                    "    density = density + 0.03\n" +
                    "\n" +
                    "room.set_fog(density)\n",
                must:    [/density\s*(?:-=|=\s*density\s*-)\s*0\.03/],
                mustNot: [/density\s*(?:\+=|=\s*density\s*\+)\s*0\.03/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /density\s*(?:\+=|=\s*density\s*\+)/, "warning", "-Wroom-filter",
                                  "filter adds to 'density'; a filter removes", { fn: "<module>",
                                  run: ["filter 1: +0.03", "filter 2: +0.03", "filter 3: +0.03",
                                        "fog: density 0.20 out of range [0.005, 0.140]",
                                        "room.set_fog: ValueError: density out of range"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /density\s*=\s*0?\.\d+f?/, "warning", "-Wroom-filter",
                                  "'density' is assigned a constant inside the filter loop; nothing is filtered",
                                  { fn: "<module>",
                                    run: ["filter 1: set 0.02", "filter 2: set 0.02", "filter 3: set 0.02",
                                          "fog: three filters ran and removed nothing"] });
                    }
                },
                success: [
                    "$ python3 /opt/room/fog.py",
                    "filter 1: -0.03",
                    "filter 2: -0.03",
                    "filter 3: -0.03",
                    "volume: density 0.02 — видно стены"
                ],
                effect:  { fog: 0.02 }
            },
            {
                id:      "room-interlock",
                strId:   "room-interlock-py",   // hints name real syntax
                tier:    "mid",
                lang:    "PYTHON",
                file:    "/opt/room/interlock.py",
                code:
                    "# /opt/room/interlock.py — предохранитель перегородки\n" +
                    "#\n" +
                    "# правило клапана (выбито на табличке в комнате):\n" +
                    "#     давление НИЖЕ предела продувки  -> замок ОТПУСКАЕТ\n" +
                    "#     на пределе и выше               -> замок ДЕРЖИТ\n" +
                    "#\n" +
                    "# сам предел в системе не хранится. он на табличке у клапана.\n" +
                    "\n" +
                    "VENT_LIMIT = 0.0\n" +
                    "\n" +
                    "if room.pressure() > VENT_LIMIT:\n" +
                    "    interlock.release()\n" +
                    "else:\n" +
                    "    interlock.hold()\n",
                /* The limit is rolled at boot and written down nowhere on
                   disk, so the check is assembled from world state at the
                   moment the player presses RUN — and never prints it. */
                check: interlockCheck({ press: "room.pressure",
                                        release: "interlock.release",
                                        hold: "interlock.hold", fn: "<module>" }),
                success: [
                    "$ python3 /opt/room/interlock.py",
                    "interlock: pressure below vent limit",
                    "interlock: released",
                    "barrier: 4 panels down",
                    "lamp2: up  (was shadowed by the barrier)"
                ],
                effect:  { barrier: 0, lamp: "lamp2", on: true, interlock: true }
            },
            {
                id:      "room-door",
                strId:   "room-door-py",   // hints name real syntax
                tier:    "mid",
                lang:    "PYTHON",
                file:    "/opt/room/doorctl.py",
                code:
                    "# /opt/room/doorctl.py — контроллер двери\n" +
                    "\n" +
                    "if image_is_damaged():\n" +
                    "    door.open()\n" +
                    "else:\n" +
                    "    door.retry()\n",
                check: doorCheck({ open: "door.open", retry: "door.retry", fn: "<module>" }),
                success: [
                    "$ python3 /opt/room/doorctl.py",
                    "door0: image damaged -> holding",
                    "door0: retry loop stopped"
                ],
                effect:  { door: "halted" }
            },
            {
                id:      "room-sessions",
                strId:   "room-sessions-py",   // hints name real syntax
                tier:    "story",
                lang:    "PYTHON",
                file:    "/opt/room/sessions.py",
                code:
                    "# /opt/room/sessions.py — журнал сеансов\n" +
                    "# каждый вход должен дописываться в конец списка\n" +
                    "\n" +
                    "history = []\n" +
                    "\n" +
                    "for s in vault.sessions():\n" +
                    "    history = [s]\n" +
                    "\n" +
                    "core.remember(history)\n",
                must:    [/history\.append\s*\(\s*s\s*\)/],
                mustNot: [/history\s*=\s*\[\s*s\s*\]/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /history\s*=\s*\[\s*s\s*\]/, "warning", "-Wroom-index",
                                  "'history' is rebound inside the loop; the previous value is discarded", { fn: "<module>",
                                  run: ["vault: 47 sessions on record",
                                        "core: history restored — 1 entry (46 overwritten)"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /history\s*=\s*\[\s*s\s*\]/, "error", "-Werror=room-index",
                                  "'history' is still rebound in the same loop", { fn: "<module>",
                                  notes: [[/history\s*\.\s*append\s*\(/, "the corrected write is here"]] });
                    }
                },
                success: [
                    "$ python3 /opt/room/sessions.py",
                    "vault: 47 sessions on record",
                    "core: history restored — 47 entries",
                    "core: earliest entry 've-01', latest 've-47'"
                ],
                effect:  { sessions: true }
            },
            {
                id:      "room-anchors",
                strId:   "room-anchors-py",   // hints name real syntax
                tier:    "story",
                lang:    "PYTHON",
                file:    "/opt/room/anchors.py",
                code:
                    "# /opt/room/anchors.py — привязка комнаты к ядру\n" +
                    "# alice_core держится на этих якорях\n" +
                    "\n" +
                    "active = [\"anchor03\"]\n" +
                    "\n" +
                    "for a in active:\n" +
                    "    core.bind(a)\n",
                check: anchorsCheck({ listRe: /active\s*=\s*\[([^\]]*)\]/, list: "active",
                                     count: null, bind: "core.bind", fn: "<module>" }),
                success: [
                    "$ python3 /opt/room/anchors.py",
                    "core: bind anchor01  ok",
                    "core: bind anchor02  ok",
                    "core: bind anchor03  ok",
                    "core: coherence 100% — volume stable"
                ],
                effect:  { anchors: true }
            },
            {
                id:      "room-override",
                strId:   "room-override-py",   // hints name real syntax
                tier:    "hard",
                lang:    "PYTHON",
                file:    "/opt/room/override.py",
                code:
                    "# /opt/room/override.py — аварийный сброс замка шлюза\n" +
                    "# замок принимает якоря по порядку. все три.\n" +
                    "\n" +
                    "KEYS = [\"anchor01\", \"anchor02\", \"anchor03\"]\n" +
                    "\n" +
                    "for i in range(1, len(KEYS)):\n" +
                    "    lock.push(KEYS[i])\n" +
                    "\n" +
                    "lock.commit()\n",
                check: overrideCheck({ keys: "KEYS", listRe: /KEYS\s*=\s*\[([^\]]*)\]/,
                                      decl: "list", fn: "<module>" }),
                success: [
                    "$ python3 /opt/room/override.py",
                    "lock: key anchor01 accepted",
                    "lock: key anchor02 accepted",
                    "lock: key anchor03 accepted",
                    "lock: sequence complete — protocol override",
                    "door0: OPEN"
                ],
                effect:  { unlocked: true }
            }
        ];

        const LADDER_CPP = [
            {
                id:      "room-lamp",
                tier:    "intro",
                lang:    "ROOM-CFG",
                file:    "/opt/room/lamp.cfg",
                code:
                    "# /opt/room/lamp.cfg — северный светильник\n" +
                    "\n" +
                    "id       = lamp1\n" +
                    "power    = disabled\n" +
                    "level    = 0.85\n" +
                    "warmup   = 1.2\n",
                must:    [/power\s*=\s*enabled\b/i],
                mustNot: [/power\s*=\s*disabled\b/i],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /power\s*=\s*disabled/i, "error", null,
                                  "'power' is 'disabled'; refusing to bring lamp1 up");
                    },
                    partial: function (raw) {
                        return dg(raw, /power\s*=\s*\S+/i, "error", null,
                                  "unknown value for key 'power'",
                                  { notes: [[/power\s*=/i, "valid values: enabled, disabled"]] });
                    }
                },
                success: [
                    "$ roomctl apply /opt/room/lamp.cfg",
                    "lamp1: power enabled, level 0.85",
                    "lamp1: up"
                ],
                effect:  { lamp: "lamp1", on: true }
            },
            {
                id:      "room-fog",
                strId:   "room-fog-cpp",   // hints name real syntax
                tier:    "mid",
                lang:    "C++",
                file:    "/opt/room/fog.cpp",
                code:
                    "// /opt/room/fog.cpp — взвесь в объёме\n" +
                    "// три фильтра в строю, каждый должен убирать 0.03\n" +
                    "\n" +
                    "float density = 0.11f;\n" +
                    "\n" +
                    "for (auto &f : filters.online()) {\n" +
                    "    density = density + 0.03f;\n" +
                    "}\n" +
                    "\n" +
                    "room.set_fog(density);\n",
                must:    [/density\s*(?:-=|=\s*density\s*-)\s*0\.03f?/],
                mustNot: [/density\s*(?:\+=|=\s*density\s*\+)\s*0\.03f?/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /density\s*(?:\+=|=\s*density\s*\+)/, "warning", "-Wroom-filter",
                                  "filter adds to 'density'; a filter removes", { fn: "main",
                                  run: ["filter 1: +0.03", "filter 2: +0.03", "filter 3: +0.03",
                                        "fog: density 0.20 out of range [0.005, 0.140]",
                                        "./fog: room_set_fog: Invalid argument"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /density\s*=\s*0?\.\d+f?/, "warning", "-Wroom-filter",
                                  "'density' is assigned a constant inside the filter loop; nothing is filtered",
                                  { fn: "main",
                                    run: ["filter 1: set 0.02", "filter 2: set 0.02", "filter 3: set 0.02",
                                          "fog: three filters ran and removed nothing"] });
                    }
                },
                success: [
                    "$ g++ -O2 /opt/room/fog.cpp -o fog && ./fog",
                    "filter 1: -0.03",
                    "filter 2: -0.03",
                    "filter 3: -0.03",
                    "volume: density 0.02 — видно стены"
                ],
                effect:  { fog: 0.02 }
            },
            {
                id:      "room-interlock",
                strId:   "room-interlock-cpp",   // hints name real syntax
                tier:    "mid",
                lang:    "C++",
                file:    "/opt/room/interlock.cpp",
                code:
                    "// /opt/room/interlock.cpp — предохранитель перегородки\n" +
                    "//\n" +
                    "// правило клапана (выбито на табличке в комнате):\n" +
                    "//     давление НИЖЕ предела продувки  -> замок ОТПУСКАЕТ\n" +
                    "//     на пределе и выше               -> замок ДЕРЖИТ\n" +
                    "//\n" +
                    "// сам предел в системе не хранится. он на табличке у клапана.\n" +
                    "\n" +
                    "float VENT_LIMIT = 0.0f;\n" +
                    "\n" +
                    "if (room.pressure() > VENT_LIMIT) {\n" +
                    "    interlock.release();\n" +
                    "} else {\n" +
                    "    interlock.hold();\n" +
                    "}\n",
                /* The limit is rolled at boot and written down nowhere on
                   disk, so the check is assembled from world state at the
                   moment the player presses RUN — and never prints it. */
                check: interlockCheck({ press: "room.pressure",
                                        release: "interlock.release",
                                        hold: "interlock.hold", fn: "main" }),
                success: [
                    "$ g++ -O2 /opt/room/interlock.cpp -o interlock && ./interlock",
                    "interlock: pressure below vent limit",
                    "interlock: released",
                    "barrier: 4 panels down",
                    "lamp2: up  (was shadowed by the barrier)"
                ],
                effect:  { barrier: 0, lamp: "lamp2", on: true, interlock: true }
            },
            {
                id:      "room-door",
                strId:   "room-door-cpp",   // hints name real syntax
                tier:    "mid",
                lang:    "C++",
                file:    "/opt/room/doorctl.cpp",
                code:
                    "// /opt/room/doorctl.cpp — контроллер двери\n" +
                    "\n" +
                    "if (image_is_damaged()) {\n" +
                    "    door.open();\n" +
                    "} else {\n" +
                    "    door.retry();\n" +
                    "}\n",
                check: doorCheck({ open: "door.open", retry: "door.retry", fn: "main" }),
                success: [
                    "$ g++ -O2 /opt/room/doorctl.cpp -o doorctl && ./doorctl",
                    "door0: image damaged -> holding",
                    "door0: retry loop stopped"
                ],
                effect:  { door: "halted" }
            },
            {
                id:      "room-sessions",
                strId:   "room-sessions-cpp",   // hints name real syntax
                tier:    "story",
                lang:    "C++",
                file:    "/opt/room/sessions.cpp",
                code:
                    "// /opt/room/sessions.cpp — журнал сеансов\n" +
                    "// каждый вход должен дописываться в конец вектора\n" +
                    "\n" +
                    "std::vector<Session> history;\n" +
                    "\n" +
                    "for (auto &s : vault.sessions()) {\n" +
                    "    history = { s };\n" +
                    "}\n" +
                    "\n" +
                    "core.remember(history);\n",
                must:    [/history\.push_back\s*\(\s*s\s*\)/],
                mustNot: [/history\s*=\s*\{\s*s\s*\}/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /history\s*=\s*\{\s*s\s*\}/, "warning", "-Wroom-index",
                                  "'history' is reassigned inside the loop; the previous contents are discarded", { fn: "main",
                                  run: ["vault: 47 sessions on record",
                                        "core: history restored — 1 entry (46 overwritten)"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /history\s*=\s*\{\s*s\s*\}/, "error", "-Werror=room-index",
                                  "'history' is still reassigned in the same loop", { fn: "main",
                                  notes: [[/history\s*\.\s*push_back\s*\(/, "the corrected write is here"]] });
                    }
                },
                success: [
                    "$ g++ -O2 /opt/room/sessions.cpp -o sessions && ./sessions",
                    "vault: 47 sessions on record",
                    "core: history restored — 47 entries",
                    "core: earliest entry 've-01', latest 've-47'"
                ],
                effect:  { sessions: true }
            },
            {
                id:      "room-anchors",
                strId:   "room-anchors-cpp",   // hints name real syntax
                tier:    "story",
                lang:    "C++",
                file:    "/opt/room/anchors.cpp",
                code:
                    "// /opt/room/anchors.cpp — привязка комнаты к ядру\n" +
                    "// alice_core держится на этих якорях\n" +
                    "\n" +
                    "std::vector<std::string> active = { \"anchor03\" };\n" +
                    "\n" +
                    "for (auto &a : active) {\n" +
                    "    core.bind(a);\n" +
                    "}\n",
                check: anchorsCheck({ listRe: /active\s*=\s*\{([^}]*)\}/, list: "active",
                                     count: null, bind: "core.bind", fn: "main" }),
                success: [
                    "$ g++ -O2 /opt/room/anchors.cpp -o anchors && ./anchors",
                    "core: bind anchor01  ok",
                    "core: bind anchor02  ok",
                    "core: bind anchor03  ok",
                    "core: coherence 100% — volume stable"
                ],
                effect:  { anchors: true }
            },
            {
                id:      "room-override",
                strId:   "room-override-cpp",   // hints name real syntax
                tier:    "hard",
                lang:    "C++",
                file:    "/opt/room/override.cpp",
                code:
                    "// /opt/room/override.cpp — аварийный сброс замка шлюза\n" +
                    "// замок принимает якоря по порядку. все три.\n" +
                    "\n" +
                    "std::vector<std::string> KEYS = { \"anchor01\", \"anchor02\", \"anchor03\" };\n" +
                    "\n" +
                    "for (size_t i = 1; i < KEYS.size(); ++i) {\n" +
                    "    lock.push(KEYS[i]);\n" +
                    "}\n" +
                    "\n" +
                    "lock.commit();\n",
                check: overrideCheck({ keys: "KEYS", listRe: /KEYS\s*=\s*\{([^}]*)\}/,
                                      decl: "std::string", fn: "main" }),
                success: [
                    "$ g++ -O2 /opt/room/override.cpp -o override && ./override",
                    "lock: key anchor01 accepted",
                    "lock: key anchor02 accepted",
                    "lock: key anchor03 accepted",
                    "lock: sequence complete — protocol override",
                    "door0: OPEN"
                ],
                effect:  { unlocked: true }
            }
        ];

        const LADDER_C = [
            {
                id:      "room-lamp",
                tier:    "intro",
                lang:    "ROOM-CFG",
                file:    "/opt/room/lamp.cfg",
                code:
                    "# /opt/room/lamp.cfg — северный светильник\n" +
                    "\n" +
                    "id       = lamp1\n" +
                    "power    = disabled\n" +
                    "level    = 0.85\n" +
                    "warmup   = 1.2\n",
                must:    [/power\s*=\s*enabled\b/i],
                mustNot: [/power\s*=\s*disabled\b/i],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /power\s*=\s*disabled/i, "error", null,
                                  "'power' is 'disabled'; refusing to bring lamp1 up");
                    },
                    partial: function (raw) {
                        return dg(raw, /power\s*=\s*\S+/i, "error", null,
                                  "unknown value for key 'power'",
                                  { notes: [[/power\s*=/i, "valid values: enabled, disabled"]] });
                    }
                },
                success: [
                    "$ roomctl apply /opt/room/lamp.cfg",
                    "lamp1: power enabled, level 0.85",
                    "lamp1: up"
                ],
                effect:  { lamp: "lamp1", on: true }
            },
            {
                id:      "room-fog",
                strId:   "room-fog-c",   // hints name real syntax
                tier:    "mid",
                lang:    "C",
                file:    "/opt/room/fog.c",
                code:
                    "/* /opt/room/fog.c — взвесь в объёме */\n" +
                    "/* три фильтра в строю, каждый должен убирать 0.03 */\n" +
                    "\n" +
                    "float density = 0.11f;\n" +
                    "\n" +
                    "for (int i = 0; i < filters_online(); i++) {\n" +
                    "    density = density + 0.03f;\n" +
                    "}\n" +
                    "\n" +
                    "room_set_fog(density);\n",
                must:    [/density\s*(?:-=|=\s*density\s*-)\s*0\.03f?/],
                mustNot: [/density\s*(?:\+=|=\s*density\s*\+)\s*0\.03f?/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /density\s*(?:\+=|=\s*density\s*\+)/, "warning", "-Wroom-filter",
                                  "filter adds to 'density'; a filter removes", { fn: "main",
                                  run: ["filter 1: +0.03", "filter 2: +0.03", "filter 3: +0.03",
                                        "fog: density 0.20 out of range [0.005, 0.140]",
                                        "./fog: room_set_fog: Invalid argument"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /density\s*=\s*0?\.\d+f?/, "warning", "-Wroom-filter",
                                  "'density' is assigned a constant inside the filter loop; nothing is filtered",
                                  { fn: "main",
                                    run: ["filter 1: set 0.02", "filter 2: set 0.02", "filter 3: set 0.02",
                                          "fog: three filters ran and removed nothing"] });
                    }
                },
                success: [
                    "$ gcc -O2 /opt/room/fog.c -o fog && ./fog",
                    "filter 1: -0.03",
                    "filter 2: -0.03",
                    "filter 3: -0.03",
                    "volume: density 0.02 — видно стены"
                ],
                effect:  { fog: 0.02 }
            },
            {
                id:      "room-interlock",
                strId:   "room-interlock-c",   // hints name real syntax
                tier:    "mid",
                lang:    "C",
                file:    "/opt/room/interlock.c",
                code:
                    "/* /opt/room/interlock.c — предохранитель перегородки */\n" +
                    "/*                                                       */\n" +
                    "/* правило клапана (выбито на табличке в комнате):        */\n" +
                    "/*    давление НИЖЕ предела продувки -> замок ОТПУСКАЕТ   */\n" +
                    "/*    на пределе и выше              -> замок ДЕРЖИТ      */\n" +
                    "/*                                                       */\n" +
                    "/* сам предел в системе не хранится. он на табличке.      */\n" +
                    "\n" +
                    "float VENT_LIMIT = 0.0f;\n" +
                    "\n" +
                    "if (room_pressure() > VENT_LIMIT) {\n" +
                    "    interlock_release();\n" +
                    "} else {\n" +
                    "    interlock_hold();\n" +
                    "}\n",
                /* The limit is rolled at boot and written down nowhere on
                   disk, so the check is assembled from world state at the
                   moment the player presses RUN — and never prints it. */
                check: interlockCheck({ press: "room_pressure",
                                        release: "interlock_release",
                                        hold: "interlock_hold", fn: "main" }),
                success: [
                    "$ gcc -O2 /opt/room/interlock.c -o interlock && ./interlock",
                    "interlock: pressure below vent limit",
                    "interlock: released",
                    "barrier: 4 panels down",
                    "lamp2: up  (was shadowed by the barrier)"
                ],
                effect:  { barrier: 0, lamp: "lamp2", on: true, interlock: true }
            },
            {
                id:      "room-door",
                strId:   "room-door-c",   // hints name real syntax
                tier:    "mid",
                lang:    "C",
                file:    "/opt/room/doorctl.c",
                code:
                    "/* /opt/room/doorctl.c — контроллер двери */\n" +
                    "\n" +
                    "if (image_is_damaged()) {\n" +
                    "    door_open();\n" +
                    "} else {\n" +
                    "    door_retry();\n" +
                    "}\n",
                check: doorCheck({ open: "door_open", retry: "door_retry", fn: "main" }),
                success: [
                    "$ gcc -O2 /opt/room/doorctl.c -o doorctl && ./doorctl",
                    "door0: image damaged -> holding",
                    "door0: retry loop stopped"
                ],
                effect:  { door: "halted" }
            },
            {
                id:      "room-sessions",
                strId:   "room-sessions-c",   // hints name real syntax
                tier:    "story",
                lang:    "C",
                file:    "/opt/room/sessions.c",
                code:
                    "/* /opt/room/sessions.c — журнал сеансов */\n" +
                    "/* каждый вход должен ложиться в свою ячейку */\n" +
                    "\n" +
                    "Session history[64];\n" +
                    "\n" +
                    "for (int i = 0; i < vault_sessions(); i++) {\n" +
                    "    history[0] = vault_session(i);\n" +
                    "}\n" +
                    "\n" +
                    "core_remember(history, vault_sessions());\n",
                must:    [/history\s*\[\s*i\s*\]\s*=/],
                mustNot: [/history\s*\[\s*0\s*\]\s*=/],
                diags: {
                    bug: function (raw) {
                        return dg(raw, /history\s*\[\s*0\s*\]\s*=/, "warning", "-Wroom-index",
                                  "array index is always 0 in a loop over 'i'", { fn: "main",
                                  run: ["vault: 47 sessions on record",
                                        "core: history restored — 1 entry (46 overwritten)"] });
                    },
                    partial: function (raw) {
                        return dg(raw, /history\s*\[\s*0\s*\]\s*=/, "error", "-Werror=room-index",
                                  "'history[0]' is still assigned in the same loop", { fn: "main",
                                  notes: [[/history\s*\[\s*i\s*\]\s*=/, "the corrected write is here"]] });
                    }
                },
                success: [
                    "$ gcc -O2 /opt/room/sessions.c -o sessions && ./sessions",
                    "vault: 47 sessions on record",
                    "core: history restored — 47 entries",
                    "core: earliest entry 've-01', latest 've-47'"
                ],
                effect:  { sessions: true }
            },
            {
                id:      "room-anchors",
                strId:   "room-anchors-c",   // hints name real syntax
                tier:    "story",
                lang:    "C",
                file:    "/opt/room/anchors.c",
                code:
                    "/* /opt/room/anchors.c — привязка комнаты к ядру */\n" +
                    "/* alice_core держится на этих якорях.            */\n" +
                    "/* active[] и count обязаны сходиться: цикл идёт  */\n" +
                    "/* по count, а читает из active[]. если count     */\n" +
                    "/* больше длины массива — core_bind() получит то, */\n" +
                    "/* что лежит за его концом.                       */\n" +
                    "\n" +
                    "const char *active[] = { \"anchor03\" };\n" +
                    "int count = 1;                 /* элементов в active[] */\n" +
                    "\n" +
                    "for (int i = 0; i < count; i++) {\n" +
                    "    core_bind(active[i]);\n" +
                    "}\n",
                check: anchorsCheck({ listRe: /active\s*\[\s*\]\s*=\s*\{([^}]*)\}/, list: "active",
                                     count: "count", bind: "core_bind", fn: "main" }),
                success: [
                    "$ gcc -O2 /opt/room/anchors.c -o anchors && ./anchors",
                    "core: bind anchor01  ok",
                    "core: bind anchor02  ok",
                    "core: bind anchor03  ok",
                    "core: coherence 100% — volume stable"
                ],
                effect:  { anchors: true }
            },
            {
                id:      "room-override",
                strId:   "room-override-c",   // hints name real syntax
                tier:    "hard",
                lang:    "C",
                file:    "/opt/room/override.c",
                code:
                    "/* /opt/room/override.c — аварийный сброс замка шлюза */\n" +
                    "/* замок принимает якоря по порядку. все три. */\n" +
                    "\n" +
                    "const char *KEYS[] = { \"anchor01\", \"anchor02\", \"anchor03\" };\n" +
                    "\n" +
                    "for (int i = 0; i < 2; i++) {\n" +
                    "    lock_push(KEYS[i]);\n" +
                    "}\n" +
                    "\n" +
                    "lock_commit();\n",
                check: overrideCheck({ keys: "KEYS", listRe: /KEYS\s*\[\s*\]\s*=\s*\{([^}]*)\}/,
                                      decl: "const char *", fn: "main" }),
                success: [
                    "$ gcc -O2 /opt/room/override.c -o override && ./override",
                    "lock: key anchor01 accepted",
                    "lock: key anchor02 accepted",
                    "lock: key anchor03 accepted",
                    "lock: sequence complete — protocol override",
                    "door0: OPEN"
                ],
                effect:  { unlocked: true }
            }
        ];

        /* EASY / MEDIUM / HARD -> Python / C++ / C. */
        const TASKS_BY_DIFF = {
            easy:   LADDER_PY,
            medium: LADDER_CPP,
            hard:   LADDER_C
        };

        const BOOT_LINES = [
            ["sys",  "[ boot ] /dev/alice ........................ mounted"],
            ["sys",  "[ boot ] tty :: VT102 emulation ............ ok"],
            ["sys",  "[ boot ] llama.cpp :: Qwen2.5-Coder Q4_K_M . LOADING"],
            ["warn", "[ warn ] Qwen weights checksum mismatch (3 bytes)"],
            ["sys",  "[ boot ] piper TTS profile ru-RU ............ ok"],
            ["bad",  "[ !! ] uplink → cloud :: REFUSED (intended; offline mode)"],
            ["ok",   "[ boot ] terminal ready"]
        ];

        /* ASCII ghost templates — picked at random, painted in a random
           corner of the scene. Width-fixed monospace so they stay
           ghost-shaped even on weird zooms. */
        const GHOSTS = [
            "  _____\n /     \\\n| () () |\n \\  ^  /\n  |||||\n  |||||",
            "   ___\n  /   \\\n /     \\\n| @   @ |\n|   _   |\n \\_____/",
            "  ▄▄▄▄▄\n ▐ ●  ● ▌\n  ▀▀▀▀▀\n   ║║║\n   ╩╩╩",
            " /\\_/\\\n( ╳ ╳ )\n >   <\n  ~~~",
            "  ╔═══╗\n  ║ ▓ ║\n  ║░░░║\n  ╚═══╝\n   ███"
        ];

        /* engine state */
        const state = {
            stage:    "boot",
            diff:     "easy",
            profile:  PROFILES.easy,
            sanity:   100,
            fear:     0,
            /* The old text adventure scored a dozen command categories here.
               The shell in VoidOS is a real shell — what it types is not a
               menu choice — so the only thing still worth counting is how
               many repairs landed. Distance walked comes from the scene. */
            progress: { tasksSolved: 0 },
            history:  [],         // command history for ↑/↓ recall
            historyIdx: -1,
            decayTimer: null,
            ended:    false,
            // editor state
            tasks:    [],         // tasks for the chosen difficulty
            taskIdx:  0,
            edOpen:   false,
            edHintShown: false,
            // repair pane state
            hintMode: "normal"    // "normal" | "jury" — verbosity of repair hints
        };

        /* ---- DOM refs (resolved at init) ---- */
        let elRoot, elClose, elBootLines, elEndTitle, elEndSub, elEndLog,
            elRestart, elExitEnd,
            elEditor, elEdLang, elEdFile, elEdTag, elEdTitle, elEdHint,
            elEdArea, elEdGutter, elEdStatus, elEdRun, elEdReset, elEdHintBtn,
            elEdHintNoobBtn, elEdClose,
            elEdOut, elEdOutHead, elEdOutCmd,
            /* the desk: VoidOS worked from the chair */
            elDesk, elTermOut, elTermIn, elTermForm, elTermPs, elDeskLeave,
            elDock, elWinLayer, elDeskClock, elDeskNudgeText,
            elMeterVolumeVal, elMeterAnomalyVal,
            /* void stage (3D awakening) */
            elVoidCanvas, elVoidLids, elVoidSub, elVoidHelp, elVoidCompass,
            elVoidDist, elVoidUse, elVoidTouch, elVoidStick, elVoidLook, elVoidObjective,
            /* os boot stage */
            elOsRoot, elOsPost, elOsKernel, elOsStatus, elOsProgress,
            elOsClock, elOsWin, elOsWinBody, elOsSkip;

        function $(sel) { return elRoot.querySelector(sel); }

        function init() {
            elRoot       = document.getElementById("demoGame");
            if (!elRoot) return;
            elClose      = document.getElementById("dgClose");
            elDesk           = elRoot.querySelector(".dg-desk");
            elTermOut        = document.getElementById("dgTermOut");
            elTermIn         = document.getElementById("dgTermIn");
            elTermForm       = document.getElementById("dgTermForm");
            elTermPs         = document.getElementById("dgTermPs");
            elDeskLeave      = document.getElementById("dgDeskLeave");
            elDock           = document.getElementById("dgDock");
            elWinLayer       = document.getElementById("dgWinLayer");
            elDeskClock      = document.getElementById("dgDeskClock");
            elDeskNudgeText  = document.getElementById("dgDeskNudgeText");
            if (elDock) {
                elDock.querySelectorAll("[data-app]").forEach(function (b) {
                    b.addEventListener("click", function () {
                        launchApp(b.getAttribute("data-app"));
                    });
                });
            }
            elMeterVolumeVal = document.getElementById("dgMeterVolumeVal");
            elMeterAnomalyVal= document.getElementById("dgMeterAnomalyVal");
            elBootLines  = document.getElementById("dgBootLines");
            elEndTitle   = document.getElementById("dgEndTitle");
            elEndSub     = document.getElementById("dgEndSub");
            elEndLog     = document.getElementById("dgEndLog");
            elRestart    = document.getElementById("dgRestart");
            elExitEnd    = document.getElementById("dgExitEnd");
            // editor
            elEditor     = document.getElementById("dgEditor");
            elEdLang     = document.getElementById("dgEdLang");
            elEdFile     = document.getElementById("dgEdFile");
            elEdTag      = document.getElementById("dgEdTag");
            elEdTitle    = document.getElementById("dgEdTitle");
            elEdHint     = document.getElementById("dgEdHint");
            elEdArea     = document.getElementById("dgEdArea");
            elEdGutter   = document.getElementById("dgEdGutter");
            elEdStatus   = document.getElementById("dgEdStatus");
            elEdRun      = document.getElementById("dgEdRun");
            elEdReset    = document.getElementById("dgEdReset");
            elEdHintBtn  = document.getElementById("dgEdHintBtn");
            elEdHintNoobBtn = document.getElementById("dgEdHintNoobBtn");
            elEdClose    = document.getElementById("dgEdClose");
            elEdOut      = document.getElementById("dgEdOut");
            elEdOutHead  = document.getElementById("dgEdOutHead");
            elEdOutCmd   = document.getElementById("dgEdOutCmd");

            /* --- void (3D) stage --- */
            elVoidCanvas  = document.getElementById("dgVoidCanvas");
            elVoidLids    = document.getElementById("dgVoidLids");
            elVoidSub     = document.getElementById("dgVoidSub");
            elVoidHelp    = document.getElementById("dgVoidHelp");
            elVoidCompass = document.getElementById("dgVoidCompass");
            elVoidDist    = document.getElementById("dgVoidDist");
            elVoidObjective = document.getElementById("dgVoidObjective");
            elVoidUse     = document.getElementById("dgVoidUse");
            elVoidTouch   = document.getElementById("dgVoidTouch");
            elVoidStick   = document.getElementById("dgVoidStick");
            elVoidLook    = document.getElementById("dgVoidLook");
            if (elVoidUse)  elVoidUse.addEventListener("click", function () { VoidScene.interact(); });
            wireVoidTouch();

            /* --- OS boot stage --- */
            elOsRoot     = elRoot.querySelector(".dg-os");
            elOsPost     = document.getElementById("dgOsPost");
            elOsKernel   = document.getElementById("dgOsKernel");
            elOsStatus   = document.getElementById("dgOsStatus");
            elOsProgress = document.getElementById("dgOsProgress");
            elOsClock    = document.getElementById("dgOsClock");
            elOsWin      = document.getElementById("dgOsWin");
            elOsWinBody  = document.getElementById("dgOsWinBody");
            elOsSkip     = document.getElementById("dgOsSkip");
            if (elOsSkip) elOsSkip.addEventListener("click", skipOsBoot);

            if (elClose)   elClose.addEventListener("click", close);
            if (elRestart) elRestart.addEventListener("click", function () { gotoStage("diff"); });
            if (elExitEnd) elExitEnd.addEventListener("click", close);

            elRoot.querySelectorAll(".dg-diff-card").forEach(function (b) {
                b.addEventListener("click", function () { startGame(b.getAttribute("data-diff")); });
            });
            if (elDeskLeave) elDeskLeave.addEventListener("click", standUp);


            // editor wiring
            if (elEdClose) elEdClose.addEventListener("click", closeEditor);
            if (elEdRun)   elEdRun.addEventListener("click", runEditor);
            if (elEdReset) elEdReset.addEventListener("click", resetEditor);
            if (elEdHintBtn) elEdHintBtn.addEventListener("click", function () { showEditorHint("tech"); });
            if (elEdHintNoobBtn) elEdHintNoobBtn.addEventListener("click", function () { showEditorHint("noob"); });
            if (elEdArea)  elEdArea.addEventListener("input", refreshGutter);
            if (elEdArea)  elEdArea.addEventListener("scroll", function () {
                if (elEdGutter) elEdGutter.scrollTop = elEdArea.scrollTop;
            });
            if (elEdArea)  elEdArea.addEventListener("keydown", function (e) {
                // editor own hotkeys
                // (same reason as the prompt: this event must not reach the
                //  document handler, which would read a stale stage and exit)
                if (e.key === "Escape") {
                    e.preventDefault(); e.stopPropagation(); closeEditor(); return;
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "s")) {
                    e.preventDefault(); runEditor(); return;
                }
                if (e.key === "Tab") {
                    // insert 4 spaces, do not jump focus
                    e.preventDefault();
                    const ta = elEdArea;
                    const start = ta.selectionStart, end = ta.selectionEnd;
                    ta.value = ta.value.slice(0, start) + "    " + ta.value.slice(end);
                    ta.selectionStart = ta.selectionEnd = start + 4;
                    refreshGutter();
                }
            });

            /* ESC unwinds one layer at a time — it must never drop the whole
               demo from inside the OS, because the way back in is a full
               replay of the intro. Order: repair pane → window → desk → out. */
            /* A stray Ctrl+P anywhere inside the demo opens the browser's
               print dialog — a modal that freezes the presentation until
               someone finds the Cancel button. Inside a game there is
               nothing to print, so we swallow it; the terminal binds it to
               history like a real shell does. */
            document.addEventListener("keydown", function (e) {
                if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "p"
                    && elRoot.classList.contains("open")) {
                    e.preventDefault();
                    return;
                }
                if (e.key !== "Escape") return;
                if (!elRoot.classList.contains("open")) return;
                if (state.edOpen) { e.preventDefault(); closeEditor(); return; }
                if (state.stage === "desk") {
                    e.preventDefault();
                    // a focused window closes first, then the player stands up
                    if (!WM.closeTop()) standUp();
                    return;
                }
                // ESC that just handed the mouse back from pointer lock is
                // the player asking for their cursor, not for the exit.
                if (Date.now() - voidUnlockAt < 500) return;
                // ...and an ESC arriving right after standing up is the tail
                // of that same keypress, not a request to leave the demo.
                if (Date.now() - stoodUpAt < 600) return;
                close();
            });
        }

        /* Everything that can make noise on the slide deck, in one place, so
           entering and leaving the demo cannot forget a channel. */
        function silenceTheDeck() {
            /* Through the bus first, so neither engine can be forgotten. */
            try { if (typeof VoiceBus !== "undefined") VoiceBus.stopAll(); } catch (e) {}
            try { if (typeof stopCurrentVoice === "function") stopCurrentVoice(); } catch (e) {}
            try { if (typeof AliceVoice !== "undefined") AliceVoice.stop(); } catch (e) {}
            try {
                document.querySelectorAll("audio").forEach(function (a) {
                    try { a.pause(); a.currentTime = 0; } catch (e) {}
                });
            } catch (e) {}
        }

        function open(source) {
            if (!elRoot) init();
            if (!elRoot) return;
            elRoot.classList.add("open");
            elRoot.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            // Block the slide deck from reacting while we're inside the demo:
            // its keyboard handler and ambient-Alice loop both check this flag.
            window.__demoActive = true;
            // Cut off every channel the slide deck could still be talking on:
            // the audio element, speech synthesis, and — as a backstop — any
            // <audio> the stream module has already lost the handle to.
            silenceTheDeck();
            // Pause the slide-deck ambient music so it doesn't argue with
            // the demo's audio cues. Save prior state to restore on close.
            try {
                state.musicWasOn = !!(window.settingsState && window.settingsState.musicOn);
                if (typeof Audio !== "undefined" && Audio.setMusicEnabled) Audio.setMusicEnabled(false);
            } catch (e) {}
            // Also gag the Alice ambient chatter loop while playing.
            state.chatterWasOn = (window.__chatterEnabled !== false);
            window.__chatterEnabled = false;
            gotoStage("boot");
        }

        function close() {
            if (!elRoot) return;
            elRoot.classList.remove(
                "open", "shake", "shake-hard", "speaking",
                "fearpulse", "fearbreach", "bad-ending", "fear-100"
            );
            elRoot.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
            window.__demoActive = false;
            // Restore slide-deck audio + chatter to whatever the user had.
            try {
                if (typeof Audio !== "undefined" && Audio.setMusicEnabled) {
                    Audio.setMusicEnabled(state.musicWasOn !== false);
                }
            } catch (e) {}
            if (state.chatterWasOn !== false) {
                window.__chatterEnabled = true;
            }
            try { Audio.stopAmbient(); } catch (e) {}
            if (state.decayTimer) { clearInterval(state.decayTimer); state.decayTimer = null; }
            if (state.fearTimer)  { clearInterval(state.fearTimer);  state.fearTimer  = null; }
            // Closing mid-intro must also kill the render loop and the boot
            // timeline — otherwise they keep running behind the slide deck.
            // Leaving from the desk has to put the player back on his feet in
            // the scene's own state too: `close()` never routes through
            // gotoStage, so without this the next run opened with the camera
            // still in the chair, sliding toward a stand pose that belonged to
            // a session that no longer existed.
            try { VoidScene.sit(false); VoidScene.rearm(); } catch (e) {}
            stopVoidStage();
            stopOsBoot();
            /* close() used to stop speech but not a recorded line — one call
               that cannot forget a channel is the whole point of this. */
            silenceTheDeck();
        }

        function gotoStage(name) {
            // Leaving the 3D scene or the OS boot must tear their timers and
            // their render loop down, or a skipped intro keeps burning a
            // requestAnimationFrame under the terminal for the whole session.
            if (state.stage === "desk" && name !== "desk") {
                try { VoidScene.sit(false); VoidScene.rearm(); } catch (e) {}
                arrivedHandled = false;
            }
            /* `osboot` counts as staying in the room: the boot screen is what
               the player sees *while sitting down*, and the scene has to
               survive it. Tearing it down here cost us both the live room
               behind the terminal (it froze on its last frame) and the
               player's position — coming back up re-ran start(), which
               replays the wake-up cinematic and drops him at the spawn
               point on the far side of the room. */
            if (state.stage === "void" && name !== "void"
                && name !== "desk" && name !== "osboot") stopVoidStage();
            if (state.stage === "osboot" && name !== "osboot") stopOsBoot();

            state.stage = name;
            elRoot.querySelectorAll(".dg-stage").forEach(function (s) {
                const id = s.getAttribute("data-stage");
                // the void stays lit behind the desk so the player can catch a
                // pylon coming on, or something walking in, while they type
                s.classList.toggle("on", id === name || (name === "desk" && id === "void"));
            });
            if (elRoot) elRoot.classList.toggle("at-desk", name === "desk");
            // The demo-jury checklist is gated by this attribute (CSS only
            // shows it during the "game" stage). Keeping it on the root
            // also makes the stage trivially debuggable from devtools.
            if (elRoot) elRoot.setAttribute("data-stage", name);
            emitJury("stage", { stage: name });
            if (name === "boot") runBootSequence();
            else if (name === "diff") { /* nothing — buttons drive next step */ }
            else if (name === "void") {
                // the wake-up is a one-time cinematic; coming back from the
                // desk just picks the room up where it was left
                if (voidActive) resumeVoidStage(); else runVoidStage();
            }
            else if (name === "osboot") runOsBoot();
            else if (name === "desk") {
                try { VoidScene.sit(true); } catch (e) {}
                // the shell hands you a terminal, exactly as it did at boot
                openTerminalApp();
                refreshDeskPanels();
                updateDeskPrompt();
                paintMonitor();
                // On a touch device, focusing the prompt right away throws the
                // on-screen keyboard over the scene before the player has read
                // anything — let them tap the prompt when they're ready.
                const skipFocus = typeof window.__dgSkipAutofocus === "function"
                    && window.__dgSkipAutofocus();
                if (!skipFocus) setTimeout(function () { if (elTermIn) elTermIn.focus(); }, 260);
            }
            else if (name === "end")  { /* end-stage already populated */ }
        }

        function runBootSequence() {
            if (!elBootLines) return;
            elBootLines.innerHTML = "";
            let i = 0;
            const tick = function () {
                if (i >= BOOT_LINES.length) {
                    setTimeout(function () { gotoStage("diff"); }, 300);
                    return;
                }
                const entry = BOOT_LINES[i++];
                const ln = document.createElement("span");
                ln.className = "ln " + entry[0];
                ln.textContent = entry[1];
                elBootLines.appendChild(ln);
                setTimeout(tick, 240 + Math.random() * 140);
            };
            setTimeout(tick, 380);
            // quick boot glitch
            if (typeof Audio !== "undefined" && Audio.playGlitch) {
                try { Audio.playGlitch(0.6); } catch (e) {}
            }
        }

        function startGame(diff) {
            const prof = Object.assign({}, PROFILES[diff] || PROFILES.easy);

            // Pull the global "hints" setting from the slide deck and let
            // it override hintStrength for this run. off → never show
            // hints, rare → 25%, full → 100%.
            const sg = (typeof window.settingsState !== "undefined") ? window.settingsState : null;
            if (sg) {
                if (sg.hints === "off")  prof.hintStrength = 0;
                if (sg.hints === "rare") prof.hintStrength = Math.min(prof.hintStrength, 0.35);
                if (sg.hints === "full") prof.hintStrength = 1.0;
            }

            state.diff     = diff;
            state.profile  = prof;
            state.sanity   = 100;
            state.fear     = 0;
            state.progress = { tasksSolved: 0 };
            state.history  = [];
            state.historyIdx = -1;
            state.ended    = false;
            // load tasks for this difficulty
            state.tasks    = (TASKS_BY_DIFF[diff] || []).slice();
            state.taskIdx  = 0;
            state.edOpen   = false;
            // reset the jury walkthrough to the very first step
            state.walkStep = "help";
            state.edHintShown = false;
            state.osBooted = false;
            state.endingPlayed = false;
            try { WM.closeAll(); } catch (e) {}
            elTermOut = elTermIn = elTermForm = elTermPs = null;
            deskHistory = []; deskHistIdx = -1;

            /* boot the machine the player will actually be living in */
            wireVoidOs();
            VoidOS.boot(diff, state.tasks);
            /* A replay starts from a fresh world but the scene still holds
               the last run's geometry, and boot() emits nothing to correct
               it. Sync once, up front. */
            try { pushWorldToScene(); } catch (e) {}
            // make sure editor is hidden between runs
            if (elEditor) elEditor.classList.remove("open", "solved");
            // clear any horror classes from a previous failed run
            if (elRoot) {
                elRoot.classList.remove(
                    "bad-ending", "fear-100", "fearpulse", "fearbreach",
                    "shake", "shake-hard", "speaking"
                );
            }
            refreshDeskPanels();
            updateDeskPrompt();

            // The run opens in the void: Neikon wakes on the floor, walks to
            // the terminal, boots it, and only then sits down to VoidOS.
            gotoStage("void");
        }

        function flashEditorGlitch() {
            if (!elEditor) return;
            elEditor.classList.add("possessed");
            setTimeout(function () {
                if (elEditor) elEditor.classList.remove("possessed");
            }, 240);
        }

        /* ============================================================
           VOID STAGE CONTROLLER
           ------------------------------------------------------------
           Owns everything around the 3D scene that is not the 3D scene:
           the eyelid wipe, the wake-up subtitles, the control legend,
           the waypoint chevron, the touch stick and the interact prompt.
           VoidScene itself only knows about geometry and input vectors.
           ============================================================ */
        let voidTimers = [];
        let voidActive = false;

        function voidClearTimers() {
            voidTimers.forEach(clearTimeout);
            voidTimers = [];
        }
        function voidLater(fn, ms) { voidTimers.push(setTimeout(fn, ms)); }

        /* How hard the scene is allowed to tear itself apart. Difficulty
           sets the ceiling; the deck's own video settings can only lower
           it, and epilepsy-safe mode clamps it near flat. */
        function voidGlitchAmount() {
            const byDiff = { easy: 0.35, medium: 0.7, hard: 1.0 };
            let g = byDiff[state.diff] != null ? byDiff[state.diff] : 0.6;
            const sg = window.settingsState || {};
            if (sg.glitch === "off") g = Math.min(g, 0.15);
            if (sg.epilepsy === "on") g = Math.min(g, 0.2);
            try {
                if (window.matchMedia
                    && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    g = Math.min(g, 0.2);
                }
            } catch (e) {}
            return g;
        }

        function isTouchDevice() {
            try {
                return window.matchMedia("(hover: none) and (pointer: coarse)").matches
                    || ("ontouchstart" in window && window.innerWidth <= 900);
            } catch (e) { return false; }
        }

        function runVoidStage() {
            if (!elVoidCanvas || !VoidScene.supported()) {
                // No WebGL (old device, blocked driver) — the pitch must not
                // dead-end here, so hand straight over to the OS boot.
                gotoStage("osboot");
                return;
            }
            voidClearTimers();
            voidActive = true;
            arrivedHandled = false;

            const sg = window.settingsState || {};
            if (elVoidLids) elVoidLids.style.setProperty("--lid", "0");
            if (elVoidUse)  elVoidUse.classList.remove("on");
            if (elVoidHelp) elVoidHelp.classList.remove("on");
            if (elVoidCompass) elVoidCompass.classList.remove("on");
            if (elVoidSub)  elVoidSub.textContent = "";
            if (elVoidTouch) elVoidTouch.classList.toggle("on", isTouchDevice());
            if (elVoidHelp) {
                const k = elVoidHelp.querySelector(".k");
                if (k) k.innerHTML = tx(isTouchDevice() ? "demo.void.help_touch_html"
                                                       : "demo.void.help_html");
            }

            const started = VoidScene.start(elVoidCanvas, {
                glitch:   voidGlitchAmount(),
                scan:     sg.crt === "off" ? 0 : (sg.crt === "dim" ? 0.45 : 1),
                vignette: sg.vignette === "off" ? 0.25 : 1,
                onWake:   onVoidWake,
                onMove:   onVoidMove,
                onArrive: onVoidArrive,
                onLock:   onVoidLock,
                onInteract: onVoidExamine
            });
            if (!started) { gotoStage("osboot"); return; }

            /* --- the wake-up beat, in lockstep with VoidScene's camera --- */
            const blink = function (open, ms) {
                voidLater(function () {
                    if (elVoidLids) elVoidLids.style.setProperty("--lid", String(open));
                }, ms);
            };
            blink(0.00, 0);
            blink(0.28, 620);      // first crack of light
            blink(0.02, 980);
            blink(0.55, 1320);     // half-open, still swimming
            blink(0.12, 1680);
            blink(1.00, 2050);     // properly awake

            voidSay("demo.void.sub1", 1500, 6000);
            voidSay("demo.void.sub2", 8100, 6000);
            voidSay("demo.void.sub3", 14700, 6000);

            voidLater(function () {
                if (elVoidHelp) elVoidHelp.classList.add("on");
                if (elVoidCompass) elVoidCompass.classList.add("on");
                if (elVoidObjective) elVoidObjective.classList.add("on");
                syncQuestGuide();
            }, 17000);

            /* If nobody has moved after a while, nudge harder — the jury is
               not necessarily a gamer and should never feel stuck. */
            voidLater(function () {
                if (voidActive && !arrivedHandled && voidBestDist > 6.5) {
                    voidSay("demo.void.nudge", 0, 4200);
                    if (elVoidCompass) elVoidCompass.classList.add("urge");
                }
            }, 22000);

            try { Audio.playGlitch(); Audio.startAmbient(); } catch (e) {}
            logEvent("sys", tx("demo.void.log_wake"));
        }

        /* Returning to the void after sitting: no eyelids, no camera reset,
           no "you wake up" lines — just hand the controls back and re-point
           the chevron at whatever the investigation now wants. */
        function resumeVoidStage() {
            voidClearTimers();                       // no stale wake-up lines
            if (elVoidLids)      elVoidLids.style.setProperty("--lid", "1");
            if (elVoidHelp)      elVoidHelp.classList.add("on");
            if (elVoidCompass)   elVoidCompass.classList.add("on");
            if (elVoidObjective) elVoidObjective.classList.add("on");
            if (elVoidSub)       elVoidSub.classList.remove("on", "plate");
            syncQuestGuide();
        }

        function voidSay(key, delay, hold) {
            voidLater(function () {
                if (!elVoidSub || !voidActive) return;
                elVoidSub.textContent = tx(key);
                elVoidSub.classList.add("on");
                voidLater(function () {
                    if (elVoidSub) elVoidSub.classList.remove("on");
                }, hold);
            }, delay);
        }

        let voidBestDist = 999;
        let arrivedHandled = false;
        /* Esc is how the browser gives the mouse back during pointer lock —
           and it is also how you leave the demo. Remember when the lock was
           released so the same keypress doesn't do both. */
        let voidUnlockAt = 0;

        function onVoidLock(on) {
            if (!on) voidUnlockAt = Date.now();
            if (elVoidHelp) elVoidHelp.classList.toggle("locked", on);
        }

        function onVoidWake(t, wake) {
            if (!elVoidCanvas) return;
            // the canvas itself carries the "eyes not focusing yet" haze
            elVoidCanvas.style.opacity = String(0.15 + 0.85 * wake);
        }

        function onVoidMove(dist, bearing, target) {
            voidBestDist = Math.min(voidBestDist, dist);
            if (elVoidDist) elVoidDist.textContent = dist.toFixed(1) + " m";
            const near = (typeof target !== "undefined" && target) ? target : null;
            const inReach = !!near;
            if (elVoidUse && near) {
                const key = near.id === "terminal"
                    ? (state.osBooted ? "demo.void.sit" : "demo.void.use")
                    : ("demo.void.examine." + (near.id === "door" ? "door" : "pylon"));
                const lbl = elVoidUse.querySelector("[data-i18n]");
                if (lbl && lbl.getAttribute("data-i18n") !== key) {
                    lbl.setAttribute("data-i18n", key);
                    lbl.textContent = tx(key);
                }
            }
            if (elVoidCompass) {
                const arrow = elVoidCompass.querySelector(".arrow");
                if (arrow) arrow.style.transform = "rotate(" + (-bearing * 180 / Math.PI) + "deg)";
                elVoidCompass.classList.toggle("near", dist < 4);
                // Once you are close enough to press the button, the waypoint
                // has done its job — and on a phone the two share a slot.
                elVoidCompass.classList.toggle("on", !inReach);
            }
            if (elVoidUse) elVoidUse.classList.toggle("on", inReach);
        }

        function onVoidArrive() {
            if (arrivedHandled) return;
            arrivedHandled = true;
            // second and later visits: the machine is already up, just sit down
            if (state.osBooted) {
                if (elVoidUse) elVoidUse.classList.remove("on");
                gotoStage("desk");
                return;
            }
            if (elVoidUse) elVoidUse.classList.remove("on");
            if (elVoidCompass) elVoidCompass.classList.remove("on", "urge");
            if (elVoidHelp) elVoidHelp.classList.remove("on");
            if (elVoidLids) elVoidLids.style.setProperty("--lid", "0.0");
            try { Audio.playGlitch(); } catch (e) {}
            logEvent("ok", tx("demo.void.log_power"));
            state.osBooted = true;
            voidLater(function () { gotoStage("osboot"); }, 720);
        }

        /* The player walked up to something out in the void and pressed E.
           VoidOS decides what that means; we surface it as a subtitle and
           leave a copy in the terminal so it is not lost when they sit. */
        function onVoidExamine(id) {
            const res = VoidOS.examine(id);
            if (!res) return;
            try { Audio.playClick(); } catch (e) {}
            if (res.lines && res.lines.length) {
                showVoidText(res.lines);
                deskPrint(res.cls || "out", ["", "// " + id, ""].concat(res.lines));
            }
            syncQuestGuide();
        }

        /* A longer read-out in the void: the subtitle line can only hold a
           sentence, so a plate is shown as a small panel the player
           dismisses by walking away. */
        let voidTextTimer = null;
        function showVoidText(lines) {
            if (!elVoidSub) return;
            if (voidTextTimer) clearTimeout(voidTextTimer);
            elVoidSub.textContent = [].concat(lines).join("\n");
            elVoidSub.classList.add("on", "plate");
            voidTextTimer = setTimeout(function () {
                if (elVoidSub) elVoidSub.classList.remove("on", "plate");
            }, 9000 + lines.length * 400);
        }

        /* keep the chevron, the reachable targets and the objective line
           in step with wherever the investigation currently is */
        function syncQuestGuide() {
            const w = VoidOS.world;
            try {
                VoidScene.setGuide(VoidOS.questWhere());
                // a pylon is only worth walking to once there is light on it
                VoidScene.setInteractable("pylon1", !!w.lamps.lamp1);
                VoidScene.setInteractable("pylon2", !!w.lamps.lamp2);
                // the wall instruments need the same thing: an unpowered
                // dial in an unlit room is a disc of cold glass
                VoidScene.setInteractable("gauge1", !!w.lamps.lamp1);
                VoidScene.setInteractable("gauge2", !!w.lamps.lamp1);
                VoidScene.setInteractable("door", true);
            } catch (e) {}
            if (elVoidObjective) elVoidObjective.textContent = VoidOS.questObjective();
        }

        function stopVoidStage() {
            voidActive = false;
            voidClearTimers();
            voidBestDist = 999;
            try { VoidScene.stop(); } catch (e) {}
            if (elVoidCanvas) elVoidCanvas.style.opacity = "";
        }

        /* ---- virtual stick + look pad (touch) ---- */
        function wireVoidTouch() {
            if (!elVoidStick || !elVoidLook) return;
            let stickId = null, cx = 0, cy = 0;
            const knob = elVoidStick.querySelector("i");
            const R = 46;

            const stickStart = function (e) {
                const tch = e.changedTouches[0];
                stickId = tch.identifier;
                const r = elVoidStick.getBoundingClientRect();
                cx = r.left + r.width / 2; cy = r.top + r.height / 2;
                elVoidStick.classList.add("live");
                e.preventDefault();
            };
            const stickMove = function (e) {
                if (stickId === null) return;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const tch = e.changedTouches[i];
                    if (tch.identifier !== stickId) continue;
                    let dx = tch.clientX - cx, dy = tch.clientY - cy;
                    const d = Math.hypot(dx, dy);
                    if (d > R) { dx = dx / d * R; dy = dy / d * R; }
                    if (knob) knob.style.transform = "translate(" + dx + "px," + dy + "px)";
                    VoidScene.setMove(-dy / R, dx / R);
                    e.preventDefault();
                }
            };
            const stickEnd = function (e) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier !== stickId) continue;
                    stickId = null;
                    elVoidStick.classList.remove("live");
                    if (knob) knob.style.transform = "";
                    VoidScene.setMove(0, 0);
                }
            };
            elVoidStick.addEventListener("touchstart", stickStart, { passive: false });
            elVoidStick.addEventListener("touchmove",  stickMove,  { passive: false });
            elVoidStick.addEventListener("touchend",   stickEnd);
            elVoidStick.addEventListener("touchcancel", stickEnd);

            let lookId = null, lx = 0, ly = 0;
            elVoidLook.addEventListener("touchstart", function (e) {
                const tch = e.changedTouches[0];
                lookId = tch.identifier; lx = tch.clientX; ly = tch.clientY;
                e.preventDefault();
            }, { passive: false });
            elVoidLook.addEventListener("touchmove", function (e) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const tch = e.changedTouches[i];
                    if (tch.identifier !== lookId) continue;
                    VoidScene.addLook((tch.clientX - lx) * 0.0055, (tch.clientY - ly) * 0.0055);
                    lx = tch.clientX; ly = tch.clientY;
                    e.preventDefault();
                }
            }, { passive: false });
            const lookEnd = function (e) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === lookId) lookId = null;
                }
            };
            elVoidLook.addEventListener("touchend", lookEnd);
            elVoidLook.addEventListener("touchcancel", lookEnd);
        }

        /* ============================================================
           OS BOOT STAGE
           ------------------------------------------------------------
           What the terminal does once Neikon switches it on: open
           firmware POST → a Linux-style kernel ring buffer → a
           graphical splash → a desktop shell that opens the Terminal
           app by itself and hands the session to the game stage.

           Kernel and firmware text stays in English on purpose — that
           is what a real ring buffer looks like on any machine in any
           country. Only the human-facing chrome is localised.
           ============================================================ */
        const OS_POST = [
            "CRYSTALCORE OPEN FIRMWARE  v2.31-void   (c) 2027",
            "",
            "CPU0: NEIKON-RISC  8 core  @ ?.??GHz        [ UNSTABLE ]",
            "MEM : 0x00000000-0xFFFFFFFF   8192 MiB      [ 3 BAD BLOCKS ]",
            "NVME0: alice_core.img    1.4 TiB            [ CORRUPTED ]",
            "TTY0: /dev/alice                            [ PRESENT ]",
            "",
            "no keyboard detected — falling back to void input",
            "booting /boot/vmlinuz-6.9.0-alice ..."
        ];

        const OS_KERNEL = [
            ["0.000000", "Linux version 6.9.0-alice (neikon@void) #1 SMP PREEMPT_DYNAMIC", ""],
            ["0.000318", "Command line: root=/dev/alice ro quiet splash void.recover=1", ""],
            ["0.004102", "BIOS-provided physical RAM map: 3 regions unreadable", "warn"],
            ["0.041233", "Memory: 8192M available, 96M reserved for ALICE_CORE", ""],
            ["0.088401", "ACPI: no tables found — this machine does not exist", "warn"],
            ["0.132900", "Detected 8 CPU cores, clock source drifting", "warn"],
            ["0.402118", "devtmpfs: mounted", "ok"],
            ["0.559034", "crystalfs: mounting /dev/alice on / ...", ""],
            ["0.741260", "crystalfs: journal replay: 41 orphaned inodes recovered", "ok"],
            ["0.998145", "alice_core: loading personality state ...", ""],
            ["1.203771", "alice_core: lucidity checksum MISMATCH (0xDEAD != 0xC0DE)", "bad"],
            ["1.204002", "alice_core: continuing in degraded mode", "warn"],
            ["1.377918", "snd_void: audio bus up, 1 sink (piper-tts)", "ok"],
            ["1.601234", "voidnet: no carrier — offline by design", "ok"],
            ["1.884560", "systemd-alice[1]: Starting Crystal Display Manager ...", ""],
            ["2.114872", "systemd-alice[1]: Started Memory Leak Watchdog", "ok"],
            ["2.339015", "systemd-alice[1]: FAILED to start Reality Anchor Service", "bad"],
            ["2.339918", "systemd-alice[1]: Dependency failed for host_layer.target", "warn"],
            ["2.660440", "crystal-shell: compositor up (software, no gpu)", "ok"],
            ["2.884001", "systemd-alice[1]: Reached target Graphical Interface.", "ok"]
        ];

        const OS_SPLASH_STEPS = [
            "demo.os.step.fs",
            "demo.os.step.session",
            "demo.os.step.shell",
            "demo.os.step.alice"
        ];

        const OS_SHELL_TYPE = [
            { txt: "neikon@void:~$ ", cls: "ps" },
            { txt: "alice --recover --tty /dev/alice", cls: "cmd", type: true },
            { txt: "", cls: "" },
            { txt: "[ alice ] link established. lucidity 47.3%.", cls: "ai" },
            { txt: "[ alice ] ...neikon? is that you?", cls: "ai" },
            { txt: "", cls: "" },
            { txt: "handing over to /bin/ash ...", cls: "sys" }
        ];

        let osTimers = [];
        function osClear() { osTimers.forEach(clearTimeout); osTimers = []; }
        function osLater(fn, ms) { osTimers.push(setTimeout(fn, ms)); }

        function osPhase(name) {
            if (!elOsRoot) return;
            elOsRoot.querySelectorAll(".dg-os-phase").forEach(function (p) {
                p.classList.toggle("on", p.getAttribute("data-phase") === name);
            });
        }

        function runOsBoot() {
            if (!elOsRoot) { gotoStage("desk"); return; }
            osClear();
            osSkipped = false;

            if (elOsPost)    elOsPost.textContent = "";
            if (elOsKernel)  elOsKernel.textContent = "";
            if (elOsWinBody) elOsWinBody.innerHTML = "";
            if (elOsWin)     elOsWin.classList.remove("on");
            if (elOsProgress) elOsProgress.style.width = "0%";
            osPhase("post");
            logEvent("sys", tx("demo.os.log_boot"));

            /* ---- phase 1 :: firmware POST ---- */
            let i = 0;
            const postTick = function () {
                if (osSkipped) return;
                if (i >= OS_POST.length) { osLater(kernelPhase, 380); return; }
                elOsPost.textContent += OS_POST[i++] + "\n";
                osLater(postTick, 110 + Math.random() * 90);
            };
            postTick();

            /* ---- phase 2 :: kernel ring buffer ---- */
            const kernelPhase = function () {
                if (osSkipped) return;
                osPhase("kernel");
                let k = 0;
                const tick = function () {
                    if (osSkipped) return;
                    if (k >= OS_KERNEL.length) { osLater(splashPhase, 520); return; }
                    const row = OS_KERNEL[k++];
                    const ln = document.createElement("span");
                    ln.className = "kl " + (row[2] || "");
                    ln.textContent = "[ " + ("      " + row[0]).slice(-10) + "] " + row[1];
                    elOsKernel.appendChild(ln);
                    elOsKernel.parentNode.scrollTop = elOsKernel.parentNode.scrollHeight;
                    osLater(tick, 105 + Math.random() * 80);
                };
                tick();
            };

            /* ---- phase 3 :: graphical splash ---- */
            const splashPhase = function () {
                if (osSkipped) return;
                osPhase("splash");
                let s = 0;
                const total = OS_SPLASH_STEPS.length;
                const tick = function () {
                    if (osSkipped) return;
                    if (s >= total) { osLater(shellPhase, 480); return; }
                    if (elOsStatus) elOsStatus.textContent = tx(OS_SPLASH_STEPS[s]);
                    if (elOsProgress) elOsProgress.style.width = Math.round(((s + 1) / total) * 100) + "%";
                    s++;
                    osLater(tick, 620);
                };
                tick();
            };

            /* ---- phase 4 :: desktop shell ---- */
            const shellPhase = function () {
                if (osSkipped) return;
                osPhase("shell");
                if (elOsClock) {
                    const d = new Date();
                    elOsClock.textContent = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                }
                osLater(function () {
                    if (osSkipped) return;
                    if (elOsWin) elOsWin.classList.add("on");
                    osLater(typeShell, 480);
                }, 700);
            };

            /* the shell types its own first command, then we are in the game */
            const typeShell = function () {
                if (osSkipped) return;
                let li = 0;
                const nextLine = function () {
                    if (osSkipped) return;
                    if (li >= OS_SHELL_TYPE.length) {
                        osLater(function () { if (!osSkipped) gotoStage("desk"); }, 900);
                        return;
                    }
                    const item = OS_SHELL_TYPE[li++];
                    const span = document.createElement("span");
                    span.className = "ol " + (item.cls || "");
                    elOsWinBody.appendChild(span);
                    if (!item.type) {
                        span.textContent = item.txt;
                        elOsWinBody.scrollTop = elOsWinBody.scrollHeight;
                        osLater(nextLine, item.txt ? 460 : 160);
                        return;
                    }
                    let c = 0;
                    const typeTick = function () {
                        if (osSkipped) return;
                        span.textContent = item.txt.slice(0, ++c);
                        elOsWinBody.scrollTop = elOsWinBody.scrollHeight;
                        if (c < item.txt.length) osLater(typeTick, 42);
                        else osLater(nextLine, 560);
                    };
                    typeTick();
                };
                nextLine();
            };
        }

        let osSkipped = false;
        function skipOsBoot() {
            osSkipped = true;
            osClear();
            gotoStage("desk");
        }
        function stopOsBoot() { osSkipped = true; osClear(); }

        /* ------------------------------------------------------------ */
        /*  RENDERING                                                   */
        /* ------------------------------------------------------------ */
        /* ------------------------------------------------------------ */
        /*  JURY / EVENT FAN-OUT                                        */
        /* ------------------------------------------------------------ */
        function emitJury(type, extra) {
            try {
                const detail = Object.assign({
                    type:       type,
                    stage:      state.stage,
                    diff:       state.diff,
                    corruption: VoidOS.world.corruption,
                    repaired:   Object.keys(VoidOS.world.repaired || {}).length,
                    totalTasks: state.tasks.length
                }, extra || {});
                window.dispatchEvent(new CustomEvent("dg:event", { detail: detail }));
            } catch (e) { /* ignore */ }
        }
        function logEvent(cls, text) {
            emitJury("log", { cls: cls, text: text });
        }

        /* ------------------------------------------------------------ */
        /*  HORROR PRIMITIVES                                           */
        /*  Kept from the old demo, but nothing scripts them any more —  */
        /*  they fire off the anomaly count, which the player raises     */
        /*  themselves by breaking things.                               */
        /* ------------------------------------------------------------ */
        function shake(hard) {
            if (!elRoot) return;
            elRoot.classList.remove("shake", "shake-hard");
            void elRoot.offsetWidth; // force reflow → restart animation
            elRoot.classList.add(hard ? "shake-hard" : "shake");
            setTimeout(function () { elRoot.classList.remove("shake", "shake-hard"); }, 800);
        }
        function spawnGhost() {
            const host = elDesk && elDesk.classList.contains("on") ? elDesk : elRoot;
            if (!host) return;
            const g = document.createElement("pre");
            g.className = "dg-ghost";
            g.textContent = GHOSTS[Math.floor(Math.random() * GHOSTS.length)];
            g.style.left = (8 + Math.random() * 60) + "%";
            g.style.top  = (10 + Math.random() * 55) + "%";
            g.style.fontSize = (10 + Math.random() * 6).toFixed(0) + "px";
            host.appendChild(g);
            setTimeout(function () { g.remove(); }, 1500);
        }

        /* ============================================================
           WINDOW MANAGER  —  the graphical half of VoidOS
           ------------------------------------------------------------
           Everything the shell can do, the mouse can do too. A juror who
           has never opened a terminal can light a pylon from the Система
           window; a programmer can type `svc start lamp1`. Both go
           through the same VoidOS calls, so the room answers identically.

           Windows drag by their title bar, raise on click, close on ✕ or
           Escape. On a phone they tile full-screen instead — dragging a
           400 px window around a 375 px screen helps nobody.
           ============================================================ */
        const WM = (function () {
            const open = {};           // app id -> { el, body }
            let zTop = 10;
            let layer = null;

            function isPhone() {
                try { return window.matchMedia("(max-width: 820px)").matches; }
                catch (e) { return false; }
            }

            function raise(id) {
                const w = open[id];
                if (!w) return;
                w.el.style.zIndex = String(++zTop);
                Object.keys(open).forEach(function (k) {
                    open[k].el.classList.toggle("focused", k === id);
                });
                syncDock();
            }

            function close(id) {
                const w = open[id];
                if (!w) return false;
                w.el.remove();
                delete open[id];
                syncDock();
                return true;
            }

            /* Escape closes the top-most window; returns false when there is
               nothing left, so the caller knows to stand up instead. */
            function closeTop() {
                let best = null, bz = -1;
                Object.keys(open).forEach(function (k) {
                    const z = parseInt(open[k].el.style.zIndex || "0", 10);
                    if (z > bz) { bz = z; best = k; }
                });
                if (!best) return false;
                close(best);
                return true;
            }

            function syncDock() {
                if (!elDock) return;
                elDock.querySelectorAll("[data-app]").forEach(function (b) {
                    b.classList.toggle("active", !!open[b.getAttribute("data-app")]);
                });
            }

            function drag(win, handle) {
                let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
                handle.addEventListener("pointerdown", function (e) {
                    if (isPhone()) return;
                    if (e.target.closest(".win-close")) return;
                    on = true;
                    sx = e.clientX; sy = e.clientY;
                    ox = win.offsetLeft; oy = win.offsetTop;
                    handle.setPointerCapture(e.pointerId);
                    win.classList.add("dragging");
                });
                handle.addEventListener("pointermove", function (e) {
                    if (!on) return;
                    const r = layer.getBoundingClientRect();
                    let nx = ox + (e.clientX - sx);
                    let ny = oy + (e.clientY - sy);
                    // keep at least a strip of the title bar reachable
                    nx = Math.max(-win.offsetWidth + 90, Math.min(r.width - 90, nx));
                    ny = Math.max(0, Math.min(r.height - 34, ny));
                    win.style.left = nx + "px";
                    win.style.top  = ny + "px";
                });
                const end = function (e) {
                    if (!on) return;
                    on = false;
                    win.classList.remove("dragging");
                    try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
                };
                handle.addEventListener("pointerup", end);
                handle.addEventListener("pointercancel", end);
            }

            function spawn(id, title, cls) {
                layer = layer || document.getElementById("dgWinLayer");
                if (!layer) return null;
                if (open[id]) { raise(id); return open[id]; }

                const win = document.createElement("div");
                win.className = "os-window " + (cls || "");
                win.setAttribute("data-app", id);

                const bar = document.createElement("div");
                bar.className = "os-win-bar";
                bar.innerHTML = '<span class="os-dots"><i></i><i></i><i></i></span>'
                              + '<span class="os-win-title"></span>';
                bar.querySelector(".os-win-title").textContent = title;
                const x = document.createElement("button");
                x.type = "button";
                x.className = "win-close";
                x.setAttribute("aria-label", "close");
                x.textContent = "✕";
                x.addEventListener("click", function () { close(id); });
                bar.appendChild(x);

                const body = document.createElement("div");
                body.className = "os-win-body";

                win.appendChild(bar);
                win.appendChild(body);
                layer.appendChild(win);

                if (!isPhone()) {
                    // cascade so a second window never lands exactly on the first
                    const n = Object.keys(open).length;
                    win.style.left = (60 + n * 34) + "px";
                    win.style.top  = (56 + n * 28) + "px";
                }
                win.addEventListener("pointerdown", function () { raise(id); });
                drag(win, bar);

                open[id] = { el: win, body: body };
                raise(id);
                try { Audio.playOpen(); } catch (e) {}
                return open[id];
            }

            function closeAll() {
                Object.keys(open).forEach(close);
                zTop = 10;
            }
            function get(id) { return open[id]; }

            return { spawn: spawn, close: close, closeTop: closeTop,
                     closeAll: closeAll, raise: raise, get: get, syncDock: syncDock };
        })();

        /* ---------- apps ------------------------------------------- */
        function appTitle(id) { return tx("demo.app." + id); }

        function launchApp(id) {
            if (id === "terminal") return openTerminalApp();
            if (id === "files")    return openFilesApp();
            if (id === "editor")   return openEditorApp(null);
            if (id === "system")   return openSystemApp();
            if (id === "logs")     return openLogsApp();
            if (id === "alice")    return openAliceApp();
        }

        /* --- Terminal ------------------------------------------------ */
        function openTerminalApp() {
            const w = WM.spawn("terminal", appTitle("terminal"), "app-terminal");
            if (!w) return;
            if (w.body.dataset.built) { if (elTermIn) elTermIn.focus(); return; }
            w.body.dataset.built = "1";
            w.body.innerHTML =
                '<div class="desk-out" id="dgTermOut" aria-live="polite"></div>' +
                '<form class="desk-in" id="dgTermForm" autocomplete="off" onsubmit="return false;">' +
                '<span class="ps" id="dgTermPs">neikon@void:~$</span>' +
                '<input class="desk-input" id="dgTermIn" type="text" autocomplete="off" ' +
                'autocapitalize="off" spellcheck="false" maxlength="120"></form>';
            elTermOut  = document.getElementById("dgTermOut");
            elTermIn   = document.getElementById("dgTermIn");
            elTermForm = document.getElementById("dgTermForm");
            elTermPs   = document.getElementById("dgTermPs");
            elTermIn.placeholder = tx("demo.desk.placeholder");
            elTermForm.addEventListener("submit", deskSubmit);
            elTermIn.addEventListener("keydown", onDeskKey);
            updateDeskPrompt();
            deskPrint("sys", [tx("demo.desk.term.hello")]);
            const skip = typeof window.__dgSkipAutofocus === "function" && window.__dgSkipAutofocus();
            if (!skip) setTimeout(function () { elTermIn.focus(); }, 120);
        }

        /* --- Files :: browse the volume, open what you find ---------- */
        let filesCwd = "/home/neikon";
        function openFilesApp(path) {
            const w = WM.spawn("files", appTitle("files"), "app-files");
            if (!w) return;
            if (path) filesCwd = path;
            renderFiles(w.body);
        }
        function renderFiles(body) {
            const listing = VoidOS.list(filesCwd);
            body.innerHTML = "";

            const bar = document.createElement("div");
            bar.className = "fm-bar";
            const up = document.createElement("button");
            up.type = "button"; up.className = "fm-up"; up.textContent = "↑";
            up.addEventListener("click", function () {
                filesCwd = filesCwd.replace(/\/[^/]+$/, "") || "/";
                renderFiles(body);
            });
            const crumb = document.createElement("span");
            crumb.className = "fm-path";
            crumb.textContent = filesCwd;
            bar.appendChild(up); bar.appendChild(crumb);
            body.appendChild(bar);

            const list = document.createElement("ul");
            list.className = "fm-list";
            (listing || []).forEach(function (row) {
                const li = document.createElement("li");
                li.className = "fm-row " + row.kind + (row.broken ? " broken" : "");
                li.innerHTML = '<span class="ic">' + (row.kind === "dir" ? "▸" : (row.kind === "dev" ? "◈" : "▤")) + '</span>'
                             + '<span class="nm"></span>'
                             + '<span class="mt">' + (row.broken ? "CORRUPT" : row.meta) + '</span>';
                li.querySelector(".nm").textContent = row.name;
                li.addEventListener("click", function () {
                    if (row.kind === "dir") {
                        filesCwd = row.path;
                        renderFiles(body);
                    } else if (row.taskId) {
                        VoidOS.exec("edit " + row.path);
                    } else {
                        openEditorApp(row.path);
                    }
                });
                list.appendChild(li);
            });
            if (!listing || !listing.length) {
                const li = document.createElement("li");
                li.className = "fm-empty";
                li.textContent = "(empty)";
                list.appendChild(li);
            }
            body.appendChild(list);
        }

        /* --- Notepad :: read, and write where the volume allows ------ */
        function openEditorApp(path) {
            const w = WM.spawn("editor", appTitle("editor"), "app-editor");
            if (!w) return;
            const file = path ? VoidOS.readFile(path) : null;
            w.body.innerHTML = "";

            const head = document.createElement("div");
            head.className = "np-bar";
            head.innerHTML = '<span class="np-path"></span>';
            head.querySelector(".np-path").textContent = path || tx("demo.app.editor.empty");
            w.body.appendChild(head);

            const ta = document.createElement("textarea");
            ta.className = "np-area";
            ta.spellcheck = false;
            ta.value = file ? file.body : "";
            ta.readOnly = !file || file.readonly;
            w.body.appendChild(ta);

            const foot = document.createElement("div");
            foot.className = "np-foot";
            const status = document.createElement("span");
            status.className = "np-status";
            status.textContent = !file ? tx("demo.app.editor.pick")
                               : (file.readonly ? tx("demo.app.editor.ro") : tx("demo.app.editor.rw"));
            foot.appendChild(status);
            if (file && !file.readonly) {
                const save = document.createElement("button");
                save.type = "button"; save.className = "np-save";
                save.textContent = tx("demo.app.editor.save");
                save.addEventListener("click", function () {
                    const res = VoidOS.writeFile(path, ta.value);
                    status.textContent = res;
                    refreshDeskPanels();
                });
                foot.appendChild(save);
            }
            w.body.appendChild(foot);
        }

        /* --- Система :: the room, as controls -------------------------
           This is the window that makes the pitch land with a non-coder:
           the same services the shell exposes, but as switches, and the
           fog as a slider. Flip one and the void changes behind you. */
        function openSystemApp() {
            const w = WM.spawn("system", appTitle("system"), "app-system");
            if (!w) return;
            renderSystem(w.body);
        }
        function renderSystem(body) {
            const world = VoidOS.world;
            body.innerHTML = "";

            const svcWrap = document.createElement("div");
            svcWrap.className = "sys-block";
            svcWrap.innerHTML = '<span class="ttl">' + tx("demo.desk.services") + "</span>";
            [["lamp0", world.lamps.lamp0], ["lamp1", world.lamps.lamp1], ["lamp2", world.lamps.lamp2]]
                .forEach(function (row) {
                    const line = document.createElement("div");
                    line.className = "sys-row";
                    line.innerHTML = '<b>' + row[0] + '</b><i class="' + (row[1] ? "up" : "down") + '">'
                                   + (row[1] ? "UP" : "DOWN") + "</i>";
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.textContent = row[1] ? tx("demo.sys.stop") : tx("demo.sys.start");
                    btn.addEventListener("click", function () {
                        VoidOS.exec("svc " + (row[1] ? "stop" : "start") + " " + row[0]);
                        renderSystem(body);
                    });
                    line.appendChild(btn);
                    svcWrap.appendChild(line);
                });

            const doorLine = document.createElement("div");
            doorLine.className = "sys-row";
            doorLine.innerHTML = '<b>door0</b><i class="' +
                (world.door === "open" ? "up" : (world.door === "loop" ? "loop" : "down")) + '">' +
                (world.door === "loop" ? "LOOPING" : world.door.toUpperCase()) + "</i>";
            const dbtn = document.createElement("button");
            dbtn.type = "button";
            dbtn.textContent = world.door === "loop" ? tx("demo.sys.halt") : tx("demo.sys.retry");
            dbtn.addEventListener("click", function () {
                VoidOS.exec("svc " + (world.door === "loop" ? "stop" : "restart") + " door0");
                renderSystem(body);
            });
            doorLine.appendChild(dbtn);
            svcWrap.appendChild(doorLine);
            body.appendChild(svcWrap);

            const fog = document.createElement("div");
            fog.className = "sys-block";
            fog.innerHTML = '<span class="ttl">' + tx("demo.sys.fog") + "</span>";
            const slider = document.createElement("input");
            slider.type = "range"; slider.min = "5"; slider.max = "140"; slider.step = "1";
            slider.value = String(Math.round(world.fog * 1000));
            slider.className = "sys-slider";
            const val = document.createElement("span");
            val.className = "sys-val";
            val.textContent = world.fog.toFixed(3);
            slider.addEventListener("input", function () {
                const v = (parseInt(slider.value, 10) / 1000);
                val.textContent = v.toFixed(3);
                VoidOS.exec("set fog.density " + v);
            });
            fog.appendChild(slider);
            fog.appendChild(val);
            body.appendChild(fog);

            const dmg = document.createElement("div");
            dmg.className = "sys-block";
            dmg.innerHTML = '<span class="ttl">' + tx("demo.desk.regions") + "</span>";
            (world.tasks || []).forEach(function (t) {
                const done = !!world.repaired[t.id];
                const line = document.createElement("div");
                line.className = "sys-row";
                line.innerHTML = '<b>' + (done ? "✓" : "✕") + "</b><i class='" + (done ? "up" : "down") + "'>"
                               + t.file + "</i>";
                if (!done) {
                    const rb = document.createElement("button");
                    rb.type = "button";
                    rb.textContent = tx("demo.sys.repair");
                    rb.addEventListener("click", function () { VoidOS.exec("edit " + t.file); });
                    line.appendChild(rb);
                }
                dmg.appendChild(line);
            });
            body.appendChild(dmg);

            const an = document.createElement("div");
            an.className = "sys-block anomaly";
            an.innerHTML = '<span class="ttl">' + tx("demo.desk.anomaly") + "</span>"
                         + '<div class="sys-meter"><i style="width:' +
                           Math.min(100, world.corruption / 45 * 100) + '%"></i></div>'
                         + '<span class="sys-val">' + Math.round(world.corruption) + " / 45</span>";
            body.appendChild(an);
        }

        /* --- Журналы -------------------------------------------------- */
        function openLogsApp() {
            const w = WM.spawn("logs", appTitle("logs"), "app-logs");
            if (!w) return;
            renderLogs(w.body);
        }
        function renderLogs(body) {
            body.innerHTML = "";
            ["/var/log/kern.log", "/var/log/alice.log", "/var/log/anomaly.log"].forEach(function (p) {
                const f = VoidOS.readFile(p);
                const block = document.createElement("div");
                block.className = "log-block";
                const h = document.createElement("span");
                h.className = "ttl"; h.textContent = p;
                const pre = document.createElement("pre");
                pre.textContent = f ? f.body : "(missing)";
                block.appendChild(h); block.appendChild(pre);
                body.appendChild(block);
            });
        }

        /* --- ALICE ---------------------------------------------------- */
        function openAliceApp() {
            const w = WM.spawn("alice", appTitle("alice"), "app-alice");
            if (!w) return;
            renderAlice(w.body);
        }
        function renderAlice(body) {
            const alive = VoidOS.world.aliceState === "alive";
            body.innerHTML = "";
            const box = document.createElement("div");
            box.className = "alice-app " + (alive ? "alive" : "dead");
            if (!alive) {
                box.innerHTML = '<p class="err">/dev/alice — NO CARRIER</p>'
                              + '<p class="sub">' + tx("demo.app.alice.dead") + "</p>";
            } else {
                box.innerHTML = '<p class="ok">/dev/alice — LINK UP · lucidity 89%</p>'
                              + '<p class="line">' + tx("demo.desk.alice1") + "</p>"
                              + '<p class="line">' + tx("demo.desk.alice2") + "</p>";
            }
            body.appendChild(box);
        }

        /* --- keep every open window honest about the world ----------- */
        function refreshApps() {
            const f = WM.get("files");   if (f) renderFiles(f.body);
            const s = WM.get("system");  if (s) renderSystem(s.body);
            const l = WM.get("logs");    if (l) renderLogs(l.body);
            const a = WM.get("alice");   if (a) renderAlice(a.body);
        }

        /* ------------------------------------------------------------ */
        /*  THE DESK  —  VoidOS, worked from the chair                  */
        /* ------------------------------------------------------------ */
        let deskHistory = [], deskHistIdx = -1;

        function deskPrint(cls, lines) {
            if (!elTermOut) return;
            [].concat(lines).forEach(function (text) {
                const ln = document.createElement("span");
                ln.className = "tl " + (cls || "out");
                ln.textContent = text;
                elTermOut.appendChild(ln);
            });
            elTermOut.scrollTop = elTermOut.scrollHeight;
            paintMonitor();
        }

        function deskEcho(line) {
            if (!elTermOut) return;
            const ln = document.createElement("span");
            ln.className = "tl echo";
            ln.textContent = VoidOS.cwd().replace("/home/neikon", "~") + " $ " + line;
            elTermOut.appendChild(ln);
            elTermOut.scrollTop = elTermOut.scrollHeight;
        }

        function deskSubmit(e) {
            if (e) e.preventDefault();
            if (!elTermIn) return;
            const raw = elTermIn.value;
            elTermIn.value = "";
            if (!raw.trim()) return;
            deskHistory.push(raw);
            deskHistIdx = deskHistory.length;
            deskEcho(raw);

            const res = VoidOS.exec(raw);
            if (res.signal === "clear") { elTermOut.innerHTML = ""; paintMonitor(); return; }
            if (res.signal === "exit")  { standUp(); return; }
            if (res.signal === "look")  { standUp(); return; }
            if (res.lines && res.lines.length) deskPrint(res.cls, res.lines);
            else paintMonitor();
            updateDeskPrompt();
            refreshDeskPanels();
        }

        function updateDeskPrompt() {
            if (elTermPs) elTermPs.textContent =
                "neikon@void:" + VoidOS.cwd().replace("/home/neikon", "~") + "$";
        }

        function deskHistoryStep(delta) {
            if (!deskHistory.length) return;
            deskHistIdx = Math.max(0, Math.min(deskHistory.length, deskHistIdx + delta));
            elTermIn.value = deskHistory[deskHistIdx] || "";
        }

        function onDeskKey(e) {
            const ctrl = e.ctrlKey || e.metaKey;

            /* Readline bindings, because anyone who has used a shell reaches
               for them without thinking. Ctrl+P especially: unhandled, the
               browser answers it with the print dialog, which is a modal
               window landing on top of a live pitch. */
            if (ctrl && e.key.toLowerCase() === "p") { e.preventDefault(); deskHistoryStep(-1); return; }
            if (ctrl && e.key.toLowerCase() === "n") { e.preventDefault(); deskHistoryStep(+1); return; }

            if (e.key === "ArrowUp")   { e.preventDefault(); deskHistoryStep(-1); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); deskHistoryStep(+1); return; }
            if (e.key === "Tab") {
                e.preventDefault();
                const val = elTermIn.value;
                const parts = val.split(/\s+/);
                const last = parts[parts.length - 1] || "";
                const opts = parts.length <= 1
                    ? VoidOS.complete(last)
                    : VoidOS.pathComplete(last);
                if (opts.length === 1) {
                    parts[parts.length - 1] = opts[0];
                    elTermIn.value = parts.join(" ") + (parts.length <= 1 ? " " : "");
                } else if (opts.length > 1) {
                    deskPrint("sys", "  " + opts.join("   "));
                }
                return;
            }
            if (e.key === "Escape") {
                /* stopPropagation is load-bearing, not decoration. The
                   prompt has focus during play, so a real Escape bubbles
                   from here up to the document-level handler — which reads
                   `state.stage`, finds it is no longer "desk" because this
                   line just changed it, falls through its last branch and
                   closes the whole demo. The player asked to stand up and
                   got thrown back to the slide deck. Let the event die
                   here. */
                e.preventDefault();
                e.stopPropagation();
                standUp();
                return;
            }

            /* --- line editing, readline-style --- */
            const el = elTermIn;
            const caret = el.selectionStart;
            if (ctrl) {
                const k = e.key.toLowerCase();
                if (k === "l") {                       // clear the screen
                    e.preventDefault();
                    elTermOut.innerHTML = "";
                    paintMonitor();
                    return;
                }
                if (k === "c") {                       // abandon this line
                    if (!el.value) return;             // empty line: let copy work
                    e.preventDefault();
                    deskEcho(el.value + "^C");
                    el.value = "";
                    deskHistIdx = deskHistory.length;
                    return;
                }
                if (k === "a") { e.preventDefault(); el.setSelectionRange(0, 0); return; }
                if (k === "e") { e.preventDefault(); el.setSelectionRange(el.value.length, el.value.length); return; }
                if (k === "u") {                       // kill to start of line
                    e.preventDefault();
                    el.value = el.value.slice(caret);
                    el.setSelectionRange(0, 0);
                    return;
                }
                if (k === "k") {                       // kill to end of line
                    e.preventDefault();
                    el.value = el.value.slice(0, caret);
                    return;
                }
                if (k === "w") {                       // kill the word behind the caret
                    e.preventDefault();
                    const head = el.value.slice(0, caret).replace(/\s*\S+\s*$/, "");
                    const tail = el.value.slice(caret);
                    el.value = head + tail;
                    el.setSelectionRange(head.length, head.length);
                    return;
                }
                if (k === "d") {                       // EOF on an empty line = stand up
                    if (el.value) return;
                    e.preventDefault();
                    standUp();
                    return;
                }
            }
            if (e.key === "Home") { e.preventDefault(); el.setSelectionRange(0, 0); return; }
            if (e.key === "End")  { e.preventDefault(); el.setSelectionRange(el.value.length, el.value.length); return; }
        }

        /* --- live side panels: services + damaged regions --- */
        function refreshDeskPanels() {
            const w = VoidOS.world;
            if (elMeterVolumeVal) {
                const dmg = (state.tasks || []).filter(function (t) { return !w.repaired[t.id]; }).length;
                elMeterVolumeVal.textContent = dmg ? ("degraded · " + dmg) : "clean";
                elMeterVolumeVal.className = dmg ? "bad" : "ok";
            }
            if (elMeterAnomalyVal) {
                elMeterAnomalyVal.textContent = Math.round(w.corruption) + " / 45";
                elMeterAnomalyVal.className = w.corruption > 44 ? "bad"
                                            : (w.corruption > 20 ? "warn" : "ok");
            }
            if (elDeskNudgeText) elDeskNudgeText.textContent = deskNudge();
            if (elDeskClock) {
                const d = new Date();
                elDeskClock.textContent =
                    ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
            }
            refreshApps();
        }

        /* A single sentence of orientation that follows the player's real
           progress. It never names the solution — it points at the tool. */
        function deskNudge() {
            /* the investigation owns the hint line now — one objective,
               phrased as Neikon thinking, never as a quest marker */
            const obj = VoidOS.questObjective();
            if (obj && obj !== "—") return obj;
            const w = VoidOS.world;
            if (w.aliceState === "alive")            return tx("demo.desk.nudge.done");
            if (VoidOS.allRepaired())                return tx("demo.desk.nudge.recover");
            if (Object.keys(w.repaired).length)      return tx("demo.desk.nudge.more");
            if (w.corruption > 30)                   return tx("demo.desk.nudge.anomaly");
            if (w.visited["/home/neikon/readme.txt"]) return tx("demo.desk.nudge.explore");
            return tx("demo.desk.nudge.start");
        }

        /* --- the monitor across the room shows this session --- */
        let monCanvas = null, monCtx = null;
        function ensureMonitor() {
            if (monCanvas) return;
            monCanvas = document.createElement("canvas");
            monCanvas.width = 384; monCanvas.height = 288;
            monCtx = monCanvas.getContext("2d");
            try { VoidScene.setScreen(monCanvas); } catch (e) {}
        }
        function paintMonitor() {
            ensureMonitor();
            if (!monCtx) return;
            const w = VoidOS.world;
            const cor = Math.min(1, w.corruption / 100);
            monCtx.fillStyle = "#02090c";
            monCtx.fillRect(0, 0, 384, 288);
            monCtx.font = "13px 'Courier New', monospace";
            monCtx.textBaseline = "top";

            monCtx.fillStyle = cor > 0.45 ? "#ff5a5a" : "#5be7ff";
            monCtx.fillText("neikon@void:" + VoidOS.cwd().replace("/home/neikon", "~"), 10, 10);
            monCtx.fillStyle = "rgba(120,170,190,0.5)";
            monCtx.fillRect(10, 28, 364, 1);

            monCtx.fillStyle = "#cfe9f2";
            monCtx.fillText("$ " + (w.lastLine || "").slice(0, 40), 10, 40);

            monCtx.fillStyle = cor > 0.45 ? "rgba(255,140,140,0.9)" : "rgba(140,220,235,0.85)";
            (w.lastOut || []).slice(-6).forEach(function (l, i) {
                monCtx.fillText(String(l).slice(0, 42), 10, 64 + i * 18);
            });

            monCtx.fillStyle = cor > 0.45 ? "#ff5a5a" : "#6effb3";
            monCtx.fillText("anomaly " + Math.round(w.corruption) + "/45", 10, 262);
            try { VoidScene.refreshScreen(); } catch (e) {}
        }

        /* --- sitting down / standing up --- */
        function sitDown() {
            if (state.stage === "desk") return;
            gotoStage("desk");
        }
        let stoodUpAt = 0;
        function standUp() {
            if (state.stage !== "desk") return;
            stoodUpAt = Date.now();
            gotoStage("void");
        }

        /* --- VoidOS → world, sound, panels --- */

        /* The single seam between the operating system and the renderer.
           Every field the scene is allowed to know has to be listed here;
           leave one out and the room keeps rendering a stale copy of
           itself, which is how the barrier managed to stay invisible while
           the world underneath it was changing correctly. */
        function pushWorldToScene() {
            const w = VoidOS.world;
            VoidScene.setWorld({
                fog: w.fog, corruption: w.corruption, door: w.door,
                lamps: w.lamps, alice: w.aliceState === "alive",
                glitches: w.glitches, room: w.room
            });
        }

        let osWired = false;
        function wireVoidOs() {
            if (osWired) return;
            osWired = true;
            VoidOS.onChange(function (kind, data) {
                const w = VoidOS.world;
                try {
                    pushWorldToScene();
                } catch (e) {}

                if (kind === "world") {
                    // every change to the room gets a sound, because the room
                    // is the only feedback channel the player has out there
                    if (data.what === "lamp") {
                        try { data.on ? Audio.playOpen() : Audio.playClose(); } catch (e) {}
                        logEvent(data.on ? "ok" : "warn", "svc " + data.id + " -> " + (data.on ? "up" : "down"));
                    } else if (data.what === "door") {
                        try { Audio.playTransition(0.5); } catch (e) {}
                        logEvent("warn", "door0 -> " + data.state);
                    } else if (data.what === "alice") {
                        try { Audio.playOpen(); } catch (e) {}
                    }
                }
                try { Audio.setAmbientIntensity(w.corruption / 100); } catch (e) {}
                if (kind === "corruption" && data.delta > 0) {
                    try { Audio.playGlitch(0.5 + data.delta / 30); } catch (e) {}
                    if (w.corruption > 30) shake(w.corruption > 60);
                    if (w.corruption > 45 && Math.random() < 0.6) spawnGhost();
                    if (data.reason) logEvent("bad", data.reason);
                    if (w.corruption >= 100) endRun("lose", { reason: "anomaly" });
                }
                if (kind === "glitch") {
                    if (data.kind === "cleared") {
                        logEvent("ok", "geometry :: restored after " + data.cause);
                    } else {
                        try { Audio.playGlitch(1.0); } catch (e) {}
                        shake(true);
                        logEvent("bad", "geometry :: " + data.kind + " (" + data.cause + ")");
                    }
                }
                if (kind === "quest") {
                    syncQuestGuide();
                    if (elVoidObjective) elVoidObjective.textContent = data.objective;
                    try { Audio.playOpen(); } catch (e) {}
                    logEvent("ok", "objective :: " + data.next);
                }
                if (kind === "remember") {
                    showVoidText([data.line]);
                    deskPrint("ai", [data.line]);
                }
                if (kind === "doorOpen") {
                    logEvent("ok", "door0 :: opened by hand");
                    playEnding();
                }
                if (kind === "edit") {
                    const task = (state.tasks || []).filter(function (t) { return t.id === data.taskId; })[0];
                    if (task) openEditor(task);
                }
                if (kind === "recover") {
                    runRecovery();
                }
                refreshDeskPanels();
                paintMonitor();
            });
        }

        /* The header of the end-of-run report, shared by both endings.
           Two of these numbers used to be nonsense: `steps` was a counter
           from the old text adventure that nothing has incremented since
           the demo became a room you walk through, and `commands hit`
           printed the *names* of the progress fields — a juror was shown
           the literal word "tasksSolved". Both now come from what actually
           happened during the run. */
        function reportBeats(prof) {
            let paces = 0;
            try { paces = Math.round(VoidScene.walked() / 0.75); } catch (e) {}
            const beats = [];
            beats.push(tx("demo.report.title")  + prof.label);
            beats.push(tx("demo.report.steps")  + paces);
            beats.push(tx("demo.report.tasks")  + state.taskIdx + " / " + state.tasks.length);
            beats.push(tx("demo.report.sanity") + Math.round(state.sanity));
            beats.push(tx("demo.report.fear")   + Math.round(state.fear));
            beats.push(tx("demo.report.cmds")   + deskHistory.length);
            beats.push("");
            return beats;
        }

        /* the payoff: Alice rebuilt, the room answers all at once */
        function runRecovery() {
            VoidOS.aliceAlive();
            try { Audio.playTransition(1.2); } catch (e) {}
            deskPrint("ok", [
                "recover.sh: regions verified.",
                "recover.sh: rebuilding image ... done.",
                "svc: alice up."
            ]);
            setTimeout(function () {
                deskPrint("ai", [tx("demo.desk.alice1"), tx("demo.desk.alice2")]);
                if (state.profile && state.profile.voice) {
                    speakAsAlice(tx("demo.desk.alice1"), { pitch: 1.0, rate: 0.92 });
                }
            }, 900);
            /* Getting her back is not the ending any more — the door is.
               Hand the player their feet back and let them walk to it. */
            setTimeout(function () {
                deskPrint("sys", [tx("demo.desk.goDoor")]);
                syncQuestGuide();
            }, 2600);
        }


        /* ============================================================
           THE ENDING
           ------------------------------------------------------------
           He walks through the door under his own name for the first
           time in the episode — and the camera stops being his. Alice
           sees the drop about half a second before he does, which is
           exactly not enough time.
           ============================================================ */
        function playEnding() {
            if (state.endingPlayed) return;
            state.endingPlayed = true;

            /* strip the HUD: no compass, no objective, no prompts */
            [elVoidUse, elVoidCompass, elVoidHelp, elVoidObjective].forEach(function (el) {
                if (el) el.classList.remove("on");
            });
            if (elVoidSub) elVoidSub.classList.remove("plate");
            if (elVoidTouch) elVoidTouch.classList.remove("on");

            try { Audio.setAmbientIntensity(0); } catch (e) {}

            VoidScene.playCutscene({
                onBeat: function (name) {
                    if (name === "threshold") {
                        try { Audio.playTransition(0.8); } catch (e) {}
                    }
                    if (name === "edge") {
                        /* The room shows him the break a second before he
                           takes it — one low jolt, no words. Alice's line
                           still lands on `cry`, half a second too late. */
                        try { Audio.playGlitch(0.5); } catch (e) {}
                        shake(false);
                        logEvent("bad", "sector :: floor plate absent beyond door0");
                    }
                    if (name === "cry") {
                        /* the one line she gets out in time */
                        const line = tx("demo.end.cry");
                        showVoidText([line]);
                        if (elVoidSub) elVoidSub.classList.add("cry");
                        try { Audio.playGlitch(1.4); } catch (e) {}
                        /* Voice is a HARD-only feature (docs/GAME.md, and
                           PROFILES sets voice:false on easy/medium). Every
                           other speakAsAlice call site checks it; this one
                           did not, so the loudest line in the demo spoke on
                           every difficulty — at a hardcoded full scale. */
                        if (state.profile && state.profile.voice && AliceVoice && AliceVoice.available) {
                            try { speakAsAlice(line, { pitch: 1.35, rate: 1.15, volume: 1, clip: "demo.end.cry" }); } catch (e) {}
                        }
                        logEvent("bad", "alice :: " + line);
                    }
                    if (name === "fall") {
                        shake(true);
                        try { Audio.playGhost(); } catch (e) {}
                    }
                    if (name === "black") {
                        if (elVoidSub) elVoidSub.classList.remove("on", "cry");
                    }
                },
                onDone: function () {
                    stopVoidStage();
                    endRun("cliff", {});
                }
            });
        }

        /* --- editor mechanics --- */
        function openEditor(task) {
            if (!elEditor || !task) return;
            state.edOpen = true;
            /* Remember WHICH task is on screen. `edit <path>` opens any
               region, but every editor function used to read
               state.tasks[state.taskIdx] — so opening a region out of order
               showed one file and graded another. Invisible while a failure
               was just "[ fail ] try again"; the build pane names the file,
               so it would have named the wrong one. */
            state.edTask = task;
            state.edHintShown = false;
            if (elEdLang)   elEdLang.textContent = task.lang;
            if (elEdFile)   elEdFile.textContent = task.file;
            if (elEdTag)    elEdTag.textContent  = "task " +
                (Math.max(0, state.tasks.indexOf(task)) + 1) + "/" + state.tasks.length;
            if (elEdTitle)  elEdTitle.textContent = taskField(task, "title");
            if (elEdHint)   elEdHint.innerHTML = '<span style="opacity:0.55">' + tx("demo.ed.hintPrompt_html") + "</span>";
            if (elEdArea)   elEdArea.value = task.code;
            if (elEdStatus) {
                elEdStatus.className = "ed-status";
                elEdStatus.textContent = tx("demo.ed.statusIdle");
            }
            clearDiagnostics();
            refreshGutter();
            elEditor.classList.add("open");
            elEditor.classList.remove("solved", "failed");
            elEditor.setAttribute("aria-hidden", "false");
            // Same reasoning as the desk prompt: on touch, let the player
            // read the task + hint before the keyboard covers half the sheet.
            if (!(typeof window.__dgSkipAutofocus === "function" && window.__dgSkipAutofocus())) {
                setTimeout(function () { if (elEdArea) elEdArea.focus(); }, 320);
            }
            deskPrint("sys", tx("demo.ed.openLine") + task.file + "  // " + taskField(task, "title"));
        }

        function closeEditor() {
            if (!elEditor) return;
            state.edOpen = false;
            state.edTask = null;
            elEditor.classList.remove("open", "solved");
            elEditor.setAttribute("aria-hidden", "true");
            if (elTermIn && !(typeof window.__dgSkipAutofocus === "function"
                              && window.__dgSkipAutofocus())) {
                elTermIn.focus();
            }
        }

        function resetEditor() {
            if (!state.edOpen) return;
            const task = state.edTask || state.tasks[state.taskIdx];
            if (!task) return;
            if (elEdArea) elEdArea.value = task.code;
            if (elEdStatus) {
                elEdStatus.className = "ed-status";
                elEdStatus.textContent = tx("demo.ed.statusReset");
            }
            clearDiagnostics();
            refreshGutter();
        }

        function showEditorHint(mode) {
            if (!state.edOpen) return;
            if (mode) emitJury("hint", { mode: mode });
            const task = state.edTask || state.tasks[state.taskIdx];
            if (!task) return;
            // pick the requested variant; fall back to whatever exists
            const isNoob = (mode === "noob")
                || (!mode && (window.settingsState && window.settingsState.hintMode === "noob"));
            const body = isNoob ? (taskField(task, "hintNoob") || taskField(task, "hint") || tx("demo.ed.noHint"))
                                : (taskField(task, "hint")     || taskField(task, "hintNoob") || tx("demo.ed.noHint"));
            const label = isNoob
                ? '<strong style="color:var(--cyan)">'  + tx("demo.ed.labelJury") + '</strong> '
                : '<strong style="color:var(--amber)">' + tx("demo.ed.labelTech") + '</strong> ';
            state.edHintShown = true;
            if (elEdHint) elEdHint.innerHTML = label + body;
            state.edHintShown = true;
        }

        function refreshGutter() {
            if (!elEdArea || !elEdGutter) return;
            // The textarea uses `white-space: pre`, so visual line == \n count.
            // We match line-for-line — no soft-wrap math needed.
            const lines = (elEdArea.value || "").split("\n").length;
            let g = "";
            for (let i = 1; i <= lines; ++i) g += (i < 10 ? "0" + i : "" + i) + "\n";
            elEdGutter.textContent = g;
            // keep gutter scroll in sync with textarea so numbers stay glued
            // to the same rows even when the user scrolls the code area
            elEdGutter.scrollTop = elEdArea.scrollTop;
        }

        function clearDiagnostics() {
            if (elEdOut)     { elEdOut.innerHTML = ""; elEdOut.classList.remove("on"); }
            if (elEdOutHead) elEdOutHead.classList.remove("on");
            if (elEdOutCmd)  elEdOutCmd.textContent = "";
        }

        function renderDiagnostics(task, d) {
            if (!elEdOut) return;
            elEdOut.innerHTML = "";
            diagLines(task, d).forEach(function (l) {
                const s = document.createElement("span");
                s.className = "ed-out-line " + l.cls;
                s.textContent = l.text;
                elEdOut.appendChild(s);
            });
            elEdOut.classList.add("on");
            elEdOut.scrollTop = 0;
            if (elEdOutHead) elEdOutHead.classList.add("on");
            if (elEdOutCmd)  elEdOutCmd.textContent = task.file + ":" + edPad2(d.line);
            if (elEditor) {
                elEditor.classList.add("failed");
                setTimeout(function () { if (elEditor) elEditor.classList.remove("failed"); }, 900);
            }
        }

        function runEditor() {
            if (!state.edOpen) return;
            const task = state.edTask || state.tasks[state.taskIdx];
            if (!task) return;
            const code = (elEdArea.value || "");

            const fail = function (msg) {
                if (elEdStatus) {
                    elEdStatus.className = "ed-status bad";
                    elEdStatus.textContent = msg;
                }
            };
            const okay = function (msg) {
                if (elEdStatus) {
                    elEdStatus.className = "ed-status ok";
                    elEdStatus.textContent = msg;
                }
            };

            /* Matched against code, not against the player's notes. */
            const src = stripComments(code, task.lang);

            /* A task may ship `check(src, raw)`: it returns null when the
               code is right, and a located diagnostic when it is not. The
               tasks that still use the regex triple get theirs wrapped, so
               whichever pattern tripped still produces a line number.

               `check` also replaces the old `mustFrom` for room-interlock.
               The invariant it defended is unchanged: the vent limit is
               rolled at boot, read out of world state at the moment ▶ is
               pressed, and never printed anywhere — see
               docs/ARCHITECTURE.md, "Проверка, которой нет в таблице". */
            let diag = null;
            if (typeof task.check === "function") {
                try { diag = task.check(src, code) || null; }
                catch (e) {
                    diag = dg(code, /^/, "error", null, "internal compiler error", { fn: "main" });
                }
            } else {
                for (let i = 0; i < (task.mustNot || []).length && !diag; ++i) {
                    if (task.mustNot[i].test(src)) {
                        diag = (task.diags && task.diags.bug)
                             ? task.diags.bug(code, src)
                             : dg(code, task.mustNot[i], "error", null,
                                  "the reported defect is still present");
                    }
                }
                const must = task.must || [];
                for (let i = 0; i < must.length && !diag; ++i) {
                    if (!must[i].test(src)) {
                        diag = (task.diags && task.diags.partial)
                             ? task.diags.partial(code, src)
                             : dg(code, /^/, "error", null,
                                  "the fix does not do what the file asks for");
                    }
                }
            }

            if (diag) {
                fail(tx(diag.severity === "warning" ? "demo.ed.failRun" : "demo.ed.failBuild"));
                renderDiagnostics(task, diag);
                onTaskFailed(task, diag);
                return;
            }
            clearDiagnostics();
            okay(tx("demo.ed.okBuild") + task.lang);
            onTaskSolved(task);
        }

        function onTaskFailed(task, diag) {
            const prof = state.profile;
            deskPrint("bad", tx("demo.ed.buildFail") + task.file);
            /* The same lines the pane under the editor shows, so the
               scrollback keeps the reason and the player can re-read it
               after the editor is closed. Machine vocabulary, untranslated,
               same rule as ls/ps/dmesg (docs/ARCHITECTURE.md).

               The generic "check your fix" line only prints when there is
               genuinely nothing to say. A blind sentence on top of a real
               diagnostic is the plaque this replaced. */
            if (diag) {
                diagLines(task, diag).forEach(function (l) { deskPrint("bad", l.text); });
            } else {
                deskPrint("bad", tx("demo.ed.buildFailHint"));
            }
            logEvent("bad", "compile FAIL :: " + task.id +
                     (diag ? " :: " + task.file + ":" + edPad2(diag.line) + ": " + diag.msg : ""));
            VoidOS.repairFailed(task.id);
            /* the room takes the damage the bug describes */
            const kind = TASK_GLITCH[task.id];
            if (kind && VoidOS.spawnGlitch(kind, task.id)) {
                deskPrint("bad", [tx("demo.glitch." + kind)]);
            }
            shake(prof.shakeHard);
            if (Math.random() < prof.ghostChance) spawnGhost();
            if (Math.random() < prof.ghostChance * 0.5) spawnGhost();
            if (typeof Audio !== "undefined" && Audio.playGlitch) {
                try { Audio.playGlitch(0.9); } catch (e) {}
            }
        }

        function onTaskSolved(task) {
            const prof = state.profile;
            elEditor.classList.add("solved");
            // print the simulated success log into the main screen
            deskPrint("ok", tx("demo.ed.buildOk") + task.file + "  ::  ok");
            (task.success || []).forEach(function (l) { deskPrint("sys", l); });
            deskPrint("lore", taskField(task, "lore") || tx("demo.ed.loreFallback"));
            logEvent("ok", "solved :: " + task.id);
            VoidOS.repairDone(task.id, task.file);
            /* and the room answers */
            VoidOS.applyEffect(task.effect);
            state.progress.tasksSolved++;
            /* Count what the world says is repaired rather than blindly
               stepping the pointer. `edit <path>` lets a region be solved
               out of order — docs/GAME.md says the quest chain deliberately
               skips ahead — and `state.taskIdx++` would then have counted a
               task the player never touched, both in the end-of-run report
               and in the "everything is clean" check. */
            state.taskIdx = state.tasks.filter(function (t) {
                return !!VoidOS.world.repaired[t.id];
            }).length;
            // walkthrough — first successful compile = "compile", second = "compile2"

            emitJury("task_solved", { taskId: task.id, solved: state.progress.tasksSolved });

            // Alice reacts to the fix (voice only on HARD) — localized
            const line = tx("demo.ed.aliceSolved_" + state.diff);
            if (prof.voice && AliceVoice.available) {
                speakAsAlice(line, { pitch: 0.40, rate: 0.70, clip: "demo.solved." + state.diff });
            } else {
                deskPrint("ai", "[ alice ] " + line);
            }

            if (state.taskIdx >= state.tasks.length) {
                deskPrint("ok", tx("demo.ed.allDone"));
                deskPrint("ok", [tx("demo.ed.allDoneHint_plain")]);
            } else {
                deskPrint("sys", tx("demo.ed.nextHint"));
                deskPrint("sys", [tx("demo.ed.nextHint_plain")]);
            }
            // auto-close editor after solving so player sees the success log
            setTimeout(function () {
                if (state.edOpen) closeEditor();
            }, 1200);
        }

        /* ------------------------------------------------------------ */
        /*  ALICE VOICE                                                 */
        /* ------------------------------------------------------------ */
        function speakAsAlice(text, opts) {
            elRoot.classList.add("speaking");
            if (typeof Audio !== "undefined" && Audio.playGlitch) {
                try { Audio.playGlitch(1.6); } catch (e) {}
            }
            const o = Object.assign({}, opts || {});
            const userOnEnd = o.onEnd;
            o.onEnd = function () { elRoot.classList.remove("speaking"); if (userOnEnd) userOnEnd(); };
            const ok = AliceVoice.speak(text, o);
            if (!ok) {
                elRoot.classList.remove("speaking");
                deskPrint("warn", "[ tts ] браузер не дал голос. читаю про себя:");
                deskPrint("ai",   "[ alice ] " + text);
            }
        }


        /* ------------------------------------------------------------ */
        /*  END RUN                                                     */
        /* ------------------------------------------------------------ */
        function endRun(result, opts) {
            /* The run ends once. `state.ended` was written but never read,
               and corruption is clamped at 100 in VoidOS while still emitting
               a delta on every later corrupt() call — so the onChange branch
               that watches for >= 100 re-entered here on every further
               anomaly and replayed the whole scare: more ghosts, more shakes,
               and ALICE's line starting again on top of itself. That is the
               "her phrase plays twice" report. */
            if (state.ended) return;
            opts = opts || {};
            state.ended = true;
            emitJury("end", { result: result });
            if (state.decayTimer) { clearInterval(state.decayTimer); state.decayTimer = null; }
            if (state.fearTimer)  { clearInterval(state.fearTimer);  state.fearTimer  = null; }
            const prof = state.profile;
            // five results now: "win" (all tasks + healthy), "partial" (some
            // tasks fixed but bailed early), "walked_away" (exit / no tasks),
            // "lose" (sanity/fear blew up), "abandoned" (closed early).
            const cliff = result === "cliff";
            const won   = result === "win" || cliff;
            const half  = result === "partial";
            const walk  = result === "walked_away";
            const lost  = result === "lose";

            // For losing endings we run a heavy scare sequence BEFORE the
            // end stage shows — the right meter actually punishes the player
            // visually for letting it climb.
            if (lost) {
                playBadEndingScare(opts.reason || "broken");
            } else if (walk) {
                playWalkAwayScare();
            }

            // Remember last result for live re-render on locale change
            state.lastEnd = { result: result, opts: opts };

            const showEndStage = function () {
                if (elEndTitle) {
                    let title;
                    if (cliff)      title = tx("demo.end.cliff.title");
                    else if (won)   title = tx("demo.end.win.title");
                    else if (half)  title = tx("demo.end.partial.title");
                    else if (walk)  title = tx("demo.end.walked.title");
                    else            title = tx("demo.end.lose.title");
                    elEndTitle.textContent = title;
                    elEndTitle.parentElement.classList.toggle("win",  won);
                    elEndTitle.parentElement.classList.toggle("lose", !won);
                }
                if (elEndSub) {
                    let sub;
                    if (cliff)      sub = tx("demo.end.cliff.sub");
                    else if (won)   sub = tx("demo.end.win.sub");
                    else if (half)  sub = tx("demo.end.partial.sub")
                                          .replace("{n}",     String(state.taskIdx))
                                          .replace("{total}", String(state.tasks.length));
                    else if (walk)  sub = tx("demo.end.walked.sub");
                    else            sub = tx("demo.end.lose.sub");
                    elEndSub.textContent = sub;
                }
                if (elEndLog) {
                    const beats = reportBeats(prof);
                    if (won) {
                        beats.push(tx("demo.end.win.tag"));
                        beats.push(tx("demo.end.win.body"));
                    } else if (half) {
                        beats.push(tx("demo.end.partial.tag"));
                        beats.push(tx("demo.end.partial.body"));
                    } else if (walk) {
                        beats.push(tx("demo.end.walked.tag"));
                        beats.push(tx("demo.end.walked.body"));
                    } else {
                        beats.push(tx("demo.end.lose.tag"));
                        if (opts.reason === "fear")        beats.push(tx("demo.end.lose.body_fear"));
                        else if (opts.reason === "sanity") beats.push(tx("demo.end.lose.body_sanity"));
                        else                               beats.push(tx("demo.end.lose.body_broken"));
                    }
                    elEndLog.textContent = beats.join("\n");
                }
                gotoStage("end");
            };

            // For losing endings we wait for the scare to play out a bit
            // before flipping to the end stage so the player feels the
            // crash, not just sees a screen.
            if (lost) setTimeout(showEndStage, 1900);
            else      showEndStage();
        }

        /* ------------------------------------------------------------ */
        /*  BAD-ENDING SCARE                                            */
        /*  Triggered when sanity hits 0 or fear hits 100. Heavier than */
        /*  anything else in the demo — multiple ghosts, deep red       */
        /*  flashes, full-screen shake, optional whisper on HARD.       */
        /* ------------------------------------------------------------ */
        function playBadEndingScare(reason) {
            if (!elRoot) return;
            elRoot.classList.add("bad-ending");
            elRoot.classList.add("fear-100");
            // flood the room with ghosts — 6 in a quarter-second burst
            try {
                for (let i = 0; i < 6; ++i) {
                    setTimeout(spawnGhost, i * 60 + Math.random() * 80);
                }
            } catch (e) {}
            // hard shake + repeated glitch bursts
            shake(true);
            try { Audio.playGlitch(1.6); } catch (e) {}
            setTimeout(function () { shake(true); try { Audio.playGlitch(1.2); } catch (e) {} }, 280);
            setTimeout(function () { shake(true); try { Audio.playGlitch(1.6); } catch (e) {} }, 620);
            setTimeout(function () { shake(true); try { Audio.playGlitch(0.9); } catch (e) {} }, 1100);
            // floor the terminal with horror printouts (translated)
            deskPrint("bad", tx("demo.scare.kpanic"));
            deskPrint("bad", tx("demo.scare.alice1"));
            deskPrint("bad", tx("demo.scare.kernStat")
                            .replace("{s}", String(Math.round(state.sanity)))
                            .replace("{f}", String(Math.round(state.fear))));
            setTimeout(function () { deskPrint("bad", tx("demo.scare.alice2"));  }, 700);
            setTimeout(function () { deskPrint("bad", tx("demo.scare.kernEnd")); }, 1200);
            // HARD only: heavy whisper through speech synthesis
            if (state.profile && state.profile.voice && AliceVoice && AliceVoice.available) {
                try {
                    speakAsAlice(tx("demo.scare.voice"), { pitch: 0.25, rate: 0.6, volume: 0.8, clip: "demo.scare.voice" });
                } catch (e) {}
            }
        }

        function playWalkAwayScare() {
            if (!elRoot) return;
            // a smaller "ghost of regret" — three slow ghosts, no shake,
            // a single low whisper if voice is enabled. We want it to feel
            // *quiet* and *cold*, not loud.
            try {
                setTimeout(spawnGhost, 60);
                setTimeout(spawnGhost, 360);
                setTimeout(spawnGhost, 720);
            } catch (e) {}
            deskPrint("warn", tx("demo.walk.alice"));
            deskPrint("sys",  tx("demo.walk.sys"));
            if (state.profile && state.profile.voice && AliceVoice && AliceVoice.available) {
                try { speakAsAlice(tx("demo.walk.voice"), { pitch: 0.42, rate: 0.7, volume: 0.7, clip: "demo.walk.voice" }); } catch (e) {}
            }
        }

        /* boot the engine */
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", init);
        } else {
            init();
        }

        /* Live re-render of every dynamic demo string when the slide-deck
           locale changes (applyLocale() in the deck calls this).  Static
           HTML labels are already updated by applyLocale() via the
           data-i18n attributes; here we cover the runtime-set strings:
           - the HUD hint text
           - the input placeholder (already handled by data-i18n-placeholder
             but we double-check in case the DOM mutation missed it)
           - the end-stage title/sub/log if we are currently on it
           - the prompt placeholder
           - any boot-stage lines (only matters during the 2-sec boot
             window; for completeness we just clear and reinject) */
        function syncLocale() {
            try {
                // The filesystem is the script, so switching language has to
                // rewrite the files themselves — otherwise the player flips to
                // Tajik and readme.txt is still talking to them in Russian.
                try { VoidOS.relocalize(); } catch (e) { /* not booted yet */ }
                refreshDeskPanels();
                // Refresh input placeholder defensively.
                if (elTermIn) elTermIn.placeholder = tx("demo.desk.placeholder");
                // If the editor is open, refresh task title & default hint
                // line so they switch language without the player having to
                // reopen the editor.
                if (state.edOpen) {
                    const task = state.tasks[state.taskIdx];
                    if (task) {
                        if (elEdTitle) elEdTitle.textContent = taskField(task, "title");
                        // Re-render whichever hint variant is currently shown
                        if (state.edHintShown) {
                            showEditorHint();
                        } else if (elEdHint) {
                            elEdHint.innerHTML = '<span style="opacity:0.55">' + tx("demo.ed.hintPrompt_html") + "</span>";
                        }
                    }
                }
                // If we are on the end stage, re-render the result panel in
                // the new locale without re-running the scare.
                if (state.stage === "end" && state.lastEnd) {
                    const r = state.lastEnd.result;
                    const o = state.lastEnd.opts || {};
                    /* `cliff` has to be re-derived here — this runs inside
                       syncLocale, not inside endRun, so nothing from that
                       scope is visible. */
                    const cliff = r === "cliff";
                    const won  = r === "win" || cliff;
                    const half = r === "partial";
                    const walk = r === "walked_away";
                    if (elEndTitle) {
                        let title;
                        if (cliff)      title = tx("demo.end.cliff.title");
                        else if (won)   title = tx("demo.end.win.title");
                        else if (half)  title = tx("demo.end.partial.title");
                        else if (walk)  title = tx("demo.end.walked.title");
                        else            title = tx("demo.end.lose.title");
                        elEndTitle.textContent = title;
                    }
                    if (elEndSub) {
                        let sub;
                        if (cliff)      sub = tx("demo.end.cliff.sub");
                        else if (won)   sub = tx("demo.end.win.sub");
                        else if (half)  sub = tx("demo.end.partial.sub")
                                              .replace("{n}",     String(state.taskIdx))
                                              .replace("{total}", String(state.tasks.length));
                        else if (walk)  sub = tx("demo.end.walked.sub");
                        else            sub = tx("demo.end.lose.sub");
                        elEndSub.textContent = sub;
                    }
                    if (elEndLog) {
                        const prof = state.profile;
                        const beats = reportBeats(prof);
                        if (won)        { beats.push(tx("demo.end.win.tag"));     beats.push(tx("demo.end.win.body")); }
                        else if (half)  { beats.push(tx("demo.end.partial.tag")); beats.push(tx("demo.end.partial.body")); }
                        else if (walk)  { beats.push(tx("demo.end.walked.tag"));  beats.push(tx("demo.end.walked.body")); }
                        else {
                            beats.push(tx("demo.end.lose.tag"));
                            if (o.reason === "fear")        beats.push(tx("demo.end.lose.body_fear"));
                            else if (o.reason === "sanity") beats.push(tx("demo.end.lose.body_sanity"));
                            else                            beats.push(tx("demo.end.lose.body_broken"));
                        }
                        elEndLog.textContent = beats.join("\n");
                    }
                }
            } catch (e) { /* ignore */ }
        }

        return {
            open:  open,
            close: close,
            syncSettings: function () { /* the quick-fx mirror lived in the old HUD */ },
            syncLocale:   syncLocale
        };
    })();

    window.__openDemoGame  = DG.open;
    window.__closeDemoGame = DG.close;
    window.__demoSyncSettings = DG.syncSettings;
    window.__demoSyncLocale   = DG.syncLocale;
    /* legacy hooks (anything still calling the old playground API
       just opens the new demo so nothing breaks) */
    window.__runLeakDemo   = function () { DG.open(); };
    window.__resetLeakDemo = function () { /* no-op */ };
    window.__runPlayground = function () { DG.open(); };
    window.__resetPlayground = function () { /* no-op */ };
    window.__pgTab         = function () { /* no-op */ };
    window.__pgVoiceToggle = function () { /* no-op */ };

    /* ============================================================
       SLIDE ROUTER
       ============================================================ */
    const stageEl   = document.getElementById("stage");
