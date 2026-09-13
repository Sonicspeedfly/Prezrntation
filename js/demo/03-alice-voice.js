/* ============================================================
   TERMINAL: SHATTERED — alice voice
   ------------------------------------------------------------
   Speech-synthesis fallback for Alice when no recording fits.

   Part 3/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const AliceVoice = (function () {
        const synth = (typeof window !== "undefined" && window.speechSynthesis) ? window.speechSynthesis : null;
        let cachedVoice = null;

        function pickVoice() {
            if (!synth) return null;
            if (cachedVoice) return cachedVoice;
            const all = synth.getVoices ? synth.getVoices() : [];
            if (!all || !all.length) return null;
            // prefer russian, else any female/neutral
            cachedVoice =
                all.find(function (v) { return /ru[-_]/i.test(v.lang); }) ||
                all.find(function (v) { return /Microsoft|Google/i.test(v.name) && /female/i.test(v.name); }) ||
                all[0];
            return cachedVoice;
        }
        if (synth && typeof synth.onvoiceschanged !== "undefined") {
            synth.onvoiceschanged = function () { cachedVoice = null; pickVoice(); };
        }

        /* One queue, one epoch. Every new line bumps the epoch, so an
           `onend` belonging to a cancelled line cannot advance the new one.

           The old version fired `synth.cancel()` and then N synchronous
           `synth.speak()` calls in the SAME task. Chrome's cancel is
           asynchronous with respect to the engine queue, and that exact
           pattern either drops or duplicates the first utterance — which is
           what a listener hears as the line playing twice. It also had no
           re-entrancy guard at all, so two calls half a second apart would
           cancel and restart mid-word, and the first call's onEnd (attached
           only to the last chunk) fired from the cancel and stripped the
           `speaking` class while the second line was still talking. */
        let epoch = 0, queue = [], speaking = false, currentText = "";
        let baseOpts = null, startedThisLine = false;

        function volumeNow(o) {
            /* The literals at the call sites are a RELATIVE per-line mix
               level; the bus is the settings slider. Read at the moment the
               chunk is spoken — u.volume is fixed at construction and the
               spec offers no way to change it mid-utterance, so chunk
               granularity is as live as speech synthesis can be. */
            const asked = (o && o.volume != null) ? o.volume : 0.95;
            const bus   = (typeof voiceVolume01 === "function") ? voiceVolume01() : 1;
            return Math.max(0, Math.min(1, asked * bus));
        }
        function hardStop() {              // engine only — never touches VoiceBus
            epoch++; queue = []; speaking = false; currentText = "";
            baseOpts = null; startedThisLine = false;
            if (synth) { try { synth.cancel(); } catch (e) {} }
        }
        function pump(myEpoch) {
            if (myEpoch !== epoch) return;          // we were cancelled; stay dead
            if (!queue.length) {
                const done = baseOpts && baseOpts.onEnd;
                speaking = false; currentText = ""; baseOpts = null;
                if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("speech");
                if (done) { try { done(); } catch (e) {} }
                return;
            }
            const chunk = queue.shift();
            const voice = pickVoice();
            const u = new SpeechSynthesisUtterance(chunk);
            if (voice) u.voice = voice;
            u.lang   = (baseOpts.lang  || (voice && voice.lang) || "ru-RU");
            u.pitch  = Math.max(0.3, (baseOpts.pitch != null ? baseOpts.pitch : 0.45) + (Math.random() - 0.5) * 0.15);
            u.rate   = Math.max(0.5, (baseOpts.rate  != null ? baseOpts.rate  : 0.78) + (Math.random() - 0.5) * 0.10);
            u.volume = volumeNow(baseOpts);
            if (!startedThisLine && baseOpts.onStart) {
                startedThisLine = true; u.onstart = baseOpts.onStart;
            }
            u.onend   = function () { pump(myEpoch); };
            u.onerror = function () { pump(myEpoch); };
            try { synth.speak(u); } catch (e) { pump(myEpoch); }
        }

        return {
            available: !!synth,
            isSpeaking: function () { return speaking; },
            speak: function (text, opts) {
                if (!synth) return false;
                opts = opts || {};
                const str = String(text == null ? "" : text).trim();
                if (!str) return false;
                /* A real recording always wins. Web Speech is the last
                   resort, never a second voice on top of her own. */
                if (typeof aliceHasRecording === "function" && aliceHasRecording(str)) return false;
                // the same line already in flight is a duplicate call
                if (speaking && currentText === str) return false;
                // one voice at a time, across BOTH engines
                if (typeof VoiceBus !== "undefined"
                    && !VoiceBus.acquire("speech", hardStop, { interrupt: true })) return false;
                hardStop();
                // 4–8 word chunks → one utterance each, for the "broken AI
                // rebooting" cadence. Strictly sequential: exactly one
                // utterance outstanding at a time.
                const words = str.split(/\s+/).filter(Boolean);
                if (!words.length) {
                    if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("speech");
                    return false;
                }
                const chunks = [];
                while (words.length) chunks.push(words.splice(0, 4 + Math.floor(Math.random() * 4)).join(" "));
                baseOpts = opts; queue = chunks; speaking = true; currentText = str;
                const myEpoch = epoch;
                // Chrome drops a speak() issued in the same task as cancel().
                setTimeout(function () { pump(myEpoch); }, 60);
                return true;
            },
            stop: function () {
                hardStop();
                if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("speech");
            }
        };
    })();

    /* ============================================================
       DEMO GAME ENGINE
       ------------------------------------------------------------
       Small text-adventure powered by a command parser. State is
       tracked in `DG.state`; difficulty affects ghost rates, screen
       shake, voice, and the set of "tells" the hint panel will
       reveal. The same story exists in three depths:
         EASY   — half the story, gentle, no voice
         MEDIUM — most of the story, ghosts appear, harsher tone
         HARD   — full story, ghost on every wrong input, voice on
       ============================================================ */
    /* ============================================================
       VOID SCENE  —  first-person 3D opening of the demo
       ------------------------------------------------------------
       Neikon comes round on the floor of an empty space. Far off in
       the dark hangs a door that cannot decide whether it exists;
       ahead and to the right stands the terminal, and it is the only
       thing in this place still giving off light. The player walks
       there themselves and switches it on.

       Written directly against WebGL 1 with no library, because the
       whole pitch has to stay one offline bundle that opens from a
       QR code. That buys us four small programs:

         scene   — floor grid, solids, the door portal, the CRT face,
                   all branched on uKind so there is one pipeline
         glow    — additive camera-facing billboards (light bloom)
         dust    — additive GL_POINTS motes, for a sense of volume
         post    — one full-screen pass: barrel warp, RGB split,
                   scanlines, vignette, tear bands

       Lighting is faked but consistent: the floor shader takes the
       terminal and the door as two point lights and falls off from
       them, so the pool of light on the ground always matches where
       the glow actually is.
       ============================================================ */
