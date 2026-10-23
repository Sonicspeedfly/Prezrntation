/* ============================================================
   TERMINAL: SHATTERED — alice stream
   ------------------------------------------------------------
   The live Alice channel on the slide deck: chat stream, voice playback, glitch profiles.

   Part 9/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    /* the two with human words in them are i18n keys (10-i18n.js) */
    const CMD_HINTS = [
        "alice --whisper",
        "ps aux | grep void",
        "cat /proc/alice/mood",
        { i18n: "alice.cmd.memories" },
        "gdb ./neikon core",
        "valgrind ./reality",
        "tail -f /var/log/sanity.log",
        "kill -9 $(pidof fear)",
        { i18n: "alice.cmd.here" },
    ];

    const stream  = document.getElementById("aliceStream");
    const fakeCmd = document.getElementById("fakeCmd");
    const MAX_LINES = 4;

    /* ---------- helpers shared by chat + voice -------------------- */

    function ts() {
        const d = new Date();
        return "[" + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "]";
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;",
            '"': "&quot;", "'": "&#39;"
        }[c]));
    }

    /* push one line into the chat stream, return the <div> for further fx */
    function pushAliceLine(text, opts = {}) {
        const line = document.createElement("div");
        line.className = "alice-line" + (opts.glitch ? " glitch" : "");
        line.innerHTML =
            '<span class="prefix">' + ts() + '</span>' +
            '<span class="name">alice@core ::</span>' +
            '<span class="msg">' + escapeHtml(text) + '</span>';
        stream.appendChild(line);
        requestAnimationFrame(() => line.classList.add("show"));
        while (stream.children.length > MAX_LINES) {
            stream.removeChild(stream.firstChild);
        }
        packets += 1;
        packetsEl.textContent = packets;
        return line;
    }

    /* ---------- voice playback ----------------------------------- */

    // Gating: voice lines must stay silent inside the boot menu and the
    // fake-loading screen. transitionToTerminal() flips this to true the
    // moment the CRT terminal becomes the active surface.
    let pitchTerminalActive = false;
    window.__pitchActive = false; // mirror for external diagnostics

    function setPitchTerminalActive(v) {
        pitchTerminalActive = !!v;
        window.__pitchActive = pitchTerminalActive;
        if (!pitchTerminalActive) stopCurrentVoice();
    }

    // One voice line at a time; its Web Audio FX graph travels with it.
    let currentVoiceAudio  = null;
    let currentVoiceGraph  = null;   // { source, filters[], gain } if FX active
    let voiceGlitchTimer   = null;   // filter / tremolo curve scheduler
    let voicePitchTimer    = null;   // playbackRate drift
    let voiceVolumeWatcher = null;   // chatter-mute / sfx-mute heartbeat
    let voiceGlitchTarget  = null;   // chat line element currently glitching
    let voiceDropTimer     = null;   // rare gain-dip dropouts (heavy mode)

    // MediaElementAudioSourceNode can only be created once per <audio>
    // element. Cache them on the element via a sentinel property to avoid
    // re-creation if the audio is reused.
    const VOICE_SRC_KEY = "__aliceMediaSrc";

    /* ------------------------------------------------------------------
       The single authority on "is there a real recording of this line".
       Web Speech (03-alice-voice.js) is only allowed to open its mouth
       when this says no — a recorded sample and the synth must never both
       carry the same words.

       As the data stands this returns false for every line the demo speaks
       (the recordings cover the slide deck only), so it changes nothing
       today. Its value is that the rule becomes structural: the day someone
       records demo.end.cry and drops it into 08-alice-lines.js, the speech
       path shuts itself off instead of doubling up.
       ------------------------------------------------------------------ */
    let _aliceRecIndex = null;
    function _aliceRecKey(s) {
        return String(s == null ? "" : s)
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[«»"'`.,!?…:;()\-—–]/g, "")
            .trim();
    }
    function aliceRecordingFor(text) {
        if (!_aliceRecIndex) {
            _aliceRecIndex = Object.create(null);
            const add = function (p) {
                if (!p || !p.text || !p.audio) return;
                if (/^PLACEHOLDER_BASE64/.test(p.audio)) return;
                _aliceRecIndex[_aliceRecKey(p.text)] = p;
            };
            try { Object.keys(ALICE_STORY_LINES).forEach(function (k) { add(ALICE_STORY_LINES[k]); }); } catch (e) {}
            try { ALICE_BG_LINES.forEach(add); } catch (e) {}
        }
        return _aliceRecIndex[_aliceRecKey(text)] || null;
    }
    function aliceHasRecording(text) { return !!aliceRecordingFor(text); }

    /* ============================================================
       DROPPED-IN TAKES AND TRANSLATIONS
       ------------------------------------------------------------
       A line can be replaced from outside the source: record or attach
       a take in the voice studio (or drop a file at
       assets/voice/<locale>/<id>.<ext> and restart start.bat), and it
       plays instead of the Russian take baked into 08-alice-lines.js.
       Translations are typed in the studio too → VOICE_TEXT. See
       voice/README.md.

       Ids are stamped onto the line objects once, below, so the
       lookup needs no extra argument threaded through every call
       site — and so a line keeps its identity when its text is
       rewritten, which matching on the string could not do.
       ============================================================ */
    (function stampVoiceIds() {
        try {
            Object.keys(ALICE_STORY_LINES).forEach(function (k) {
                ALICE_STORY_LINES[k].voiceId = "deck.slide" + k.replace("SLIDE_", "");
            });
        } catch (e) {}
        try {
            ALICE_BG_LINES.forEach(function (l, i) {
                l.voiceId = "deck.bg" + (i + 1 < 10 ? "0" : "") + (i + 1);
            });
        } catch (e) {}
    })();

    /* ============================================================
       DECK VOICE, LOADED IN THE BACKGROUND
       ------------------------------------------------------------
       08-alice-lines.js carries only the text now; the sixteen takes
       arrive later in 08b-alice-audio.js (1.7 MB). Kept out of
       index.html on purpose: as a deferred script it held the whole
       chain — no button on the page worked until it had downloaded,
       which on a 1 Mbit/s mobile link was about seventeen seconds.

       Until it lands, lines play as text only — the path a line with
       no recording already took. aliceAudioArrived() attaches the takes
       and drops the recording index, which was built from text-only
       objects and would otherwise go on reporting "no recording".

       Started ~1.2 s after load, or by the jury intro once its first
       act is buffered (that act is what the room hears first, so it
       gets the link to itself), or on entering the deck at the latest.
       ============================================================ */
    let aliceAudioState = "idle";      // idle | loading | ready | failed
    function loadAliceAudio() {
        warmDeckTakes();
        /* a language with its own take for every line never plays the
           Russian bundle: 1.7 MB of dead weight on a thin link */
        if (!deckNeedsBaked()) return;
        if (aliceAudioState === "loading" || aliceAudioState === "ready") return;
        aliceAudioState = "loading";
        const s = document.createElement("script");
        s.src = "js/presentation/08b-alice-audio.js";
        s.async = true;
        s.onerror = function () {
            aliceAudioState = "failed";
            s.remove();
            setTimeout(function () { if (aliceAudioState === "failed") { aliceAudioState = "idle"; loadAliceAudio(); } }, 8000);
        };
        document.head.appendChild(s);
    }
    function aliceAudioArrived() {
        const A = window.ALICE_AUDIO || {};
        const attach = function (p) { if (p && p.voiceId && A[p.voiceId]) p.audio = A[p.voiceId]; };
        try { Object.keys(ALICE_STORY_LINES).forEach(function (k) { attach(ALICE_STORY_LINES[k]); }); } catch (e) {}
        try { ALICE_BG_LINES.forEach(attach); } catch (e) {}
        _aliceRecIndex = null;
        aliceAudioState = "ready";
    }
    if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", function () {
            setTimeout(function () {
                /* the jury intro asks for the link first; it calls loadAliceAudio itself */
                if (!window.__juryIntroHoldsLink) loadAliceAudio();
            }, 1200);
        });
    }

    function voiceLocale() {
        const s = (typeof settingsState !== "undefined") ? settingsState : null;
        return (s && s.locale) || "ru";
    }
    function deckLines() {
        const out = [];
        try { Object.keys(ALICE_STORY_LINES).forEach(function (k) { out.push(ALICE_STORY_LINES[k]); }); } catch (e) {}
        try { ALICE_BG_LINES.forEach(function (l) { out.push(l); }); } catch (e) {}
        return out;
    }
    /* Own recording for this line in this locale, else null. Never falls
       through to another language: the wrong voice is worse than none. */
    function voiceClipUrl(phraseObj) {
        if (!phraseObj || !phraseObj.voiceId) return null;
        if (typeof VOICE_CLIPS === "undefined" || !VOICE_CLIPS) return null;
        const byLoc = VOICE_CLIPS[voiceLocale()];
        return (byLoc && byLoc[phraseObj.voiceId]) || null;
    }
    function voiceClipFor(phraseObj) {
        const url = voiceClipUrl(phraseObj);
        return (url && deckWarm[url]) || url;
    }
    /* Whether any line would still play the baked Russian take. */
    function deckNeedsBaked() {
        return deckLines().some(function (p) { return !voiceClipUrl(p) && voiceTextFor(p) === p.text; });
    }

    /* The takes of the current language, downloaded one at a time in the
       background — the same job the Russian bundle does for Russian.
       Fetched on demand instead, a line on a weak link showed its text
       and stayed silent while its file crawled in. Started wherever the
       bundle would be (loadAliceAudio) and again on a language switch;
       a take re-recorded in the studio gets a new ?v= and is fetched anew. */
    const deckWarm  = {};              // take url -> blob: url
    const deckTried = {};              // take url -> true once attempted
    let deckWarming = false;
    function warmDeckTakes() {
        if (deckWarming || typeof fetch !== "function") return;
        if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return;
        const wanted = function () {
            return deckLines().map(voiceClipUrl).filter(function (u) { return u && !/^data:/.test(u) && !deckTried[u]; });
        };
        if (!wanted().length) return;
        deckWarming = true;
        (function next() {
            /* the jury intro wants the link: pause, releaseLink() resumes us */
            if (window.__juryIntroHoldsLink) { deckWarming = false; return; }
            const url = wanted()[0];   // re-read every time: the language may change mid-way
            if (!url) { deckWarming = false; return; }
            deckTried[url] = true;
            fetch(url)
                .then(function (r) { return r.ok ? r.blob() : null; })
                .then(function (b) { if (b) deckWarm[url] = URL.createObjectURL(b); })
                .catch(function () {})
                .then(next);
        })();
    }
    /* Translated subtitle if one exists, otherwise the Russian base. */
    function voiceTextFor(phraseObj) {
        if (!phraseObj) return "";
        const id = phraseObj.voiceId;
        if (id && typeof VOICE_TEXT !== "undefined" && VOICE_TEXT) {
            const byLoc = VOICE_TEXT[voiceLocale()];
            if (byLoc && byLoc[id]) return byLoc[id];
        }
        return phraseObj.text;
    }
    /* What to feed the <audio> element: a take recorded for this locale
       wins; then the baked-in Russian take, but only while the subtitle is
       still Russian too — under a translated subtitle it would be the wrong
       language; then nothing, and the line is text only. */
    function voiceSrcFor(phraseObj) {
        const own = voiceClipFor(phraseObj);
        if (own) return own;
        if (!phraseObj || voiceTextFor(phraseObj) !== phraseObj.text) return null;
        if (phraseObj.audio && aliceRecordingFor(phraseObj.text))
            return "data:audio/mpeg;base64," + phraseObj.audio;
        return null;
    }

    function alicePlaybackAllowed() {
        if (window.__chatterEnabled === false) return false;
        if (typeof settingsState !== "undefined" && settingsState.sfxOn === false) return false;
        return true;
    }

    function aliceCurrentVolume() {
        /* Must mirror the graph path exactly: master × VOICE. Using volSfx
           here made the "Voice" slider a no-op whenever the Web Audio graph
           was unavailable, and made the SFX slider move her instead. */
        const s = (typeof settingsState !== "undefined") ? settingsState : null;
        const master = (s && Number.isFinite(s.volMaster)) ? s.volMaster : 100;
        const voice  = (s && Number.isFinite(s.volVoice))  ? s.volVoice  : 100;
        return Math.max(0, Math.min(1, (master / 100) * (voice / 100)));
    }

    function stopCurrentVoice() {
        if (voiceGlitchTimer)   { clearInterval(voiceGlitchTimer);   voiceGlitchTimer   = null; }
        if (voicePitchTimer)    { clearInterval(voicePitchTimer);    voicePitchTimer    = null; }
        if (voiceVolumeWatcher) { clearInterval(voiceVolumeWatcher); voiceVolumeWatcher = null; }
        if (voiceDropTimer)     { clearTimeout(voiceDropTimer);      voiceDropTimer     = null; }
        if (voiceGlitchTarget)  { voiceGlitchTarget.classList.remove("glitch"); voiceGlitchTarget = null; }
        if (currentVoiceGraph) {
            /* Disconnect the WHOLE chain, not just the tail gain. The "bg"
               profile contains a delay->fbk->delay cycle, and a node in a
               cycle is never collected while it stays connected — that was
               one live feedback loop, plus a detached <audio> element, per
               line, for the life of the page. */
            try { currentVoiceGraph.gain.disconnect(); } catch (e) {}
            try { currentVoiceGraph.source.disconnect(); } catch (e) {}
            (currentVoiceGraph.filters || []).forEach(function (n) {
                try { n.disconnect(); } catch (e) {}
            });
            currentVoiceGraph = null;
        }
        if (currentVoiceAudio) {
            try { currentVoiceAudio.pause(); } catch (e) { /* noop */ }
            currentVoiceAudio.src = "";
            currentVoiceAudio = null;
        }
        if (typeof VoiceBus !== "undefined") VoiceBus.releaseIf("sample");
    }

    function isAliceSpeaking() {
        return !!(currentVoiceAudio && !currentVoiceAudio.ended && !currentVoiceAudio.paused);
    }

    /* ---------- per-channel FX presets --------------------------- */

    // Channel "bg"     : distant whisper — hard low-pass, mids notched out,
    //                    tiny feedback delay so the line feels like it's
    //                    coming from another room. Heavy gain reduction.
    // Channel "story"  : broken-radio — narrow band-pass with a resonant
    //                    mid bump and a soft waveshaper saturation so
    //                    consonants get crunchy. Still intelligible.
    //
    // glitch is *separate* from the channel profile — see GLITCH_PROFILES.
    // No currentTime jumps anywhere: they shred intelligibility.
    const VOICE_PROFILES = {
        bg: {
            gainMul:       0.32,   // quiet — actual whisper level vs full voice
            pitchBase:     0.95,   // slightly tired/drag-y
            buildGraph: function (ctx) {
                // Pre-shape: shave bottom rumble, kill highs, notch the
                // "chest" register so the voice feels thinned out.
                const hp = ctx.createBiquadFilter();
                hp.type = "highpass"; hp.frequency.value = 240; hp.Q.value = 0.7;
                const lp = ctx.createBiquadFilter();
                lp.type = "lowpass";  lp.frequency.value = 1250; lp.Q.value = 0.7;
                const notch = ctx.createBiquadFilter();
                notch.type = "peaking"; notch.frequency.value = 550;
                notch.Q.value = 0.9; notch.gain.value = -6;
                const hiCut = ctx.createBiquadFilter();
                hiCut.type = "highshelf"; hiCut.frequency.value = 3000;
                hiCut.gain.value = -18;

                // Send the dry signal AND a small slap-back delay (~90 ms,
                // 28% feedback) so it sounds like the voice is bouncing
                // off walls in a far room. We do this with two parallel
                // branches that meet at a merge gain.
                const merge = ctx.createGain(); merge.gain.value = 1.0;
                const dry   = ctx.createGain(); dry.gain.value   = 0.85;
                const delay = ctx.createDelay(0.5);
                delay.delayTime.value = 0.09;
                const fbk   = ctx.createGain(); fbk.gain.value   = 0.28;
                const wet   = ctx.createGain(); wet.gain.value   = 0.45;

                hp.connect(lp).connect(notch).connect(hiCut);
                // dry path
                hiCut.connect(dry).connect(merge);
                // wet path with feedback
                hiCut.connect(delay);
                delay.connect(fbk).connect(delay);   // tiny resonance
                delay.connect(wet).connect(merge);

                return {
                    input:  hp,
                    output: merge,
                    nodes:  [hp, lp, notch, hiCut, dry, delay, fbk, wet, merge],
                    // expose the mid filter so the glitch driver can wobble it
                    wobble: lp
                };
            }
        },
        story: {
            gainMul:       0.95,   // close to full — louder than BG
            pitchBase:     1.00,
            buildGraph: function (ctx) {
                // AM radio band: tight high-pass + low-pass, resonant mid
                // bump, plus a gentle WaveShaper for that broken-speaker
                // crunch on hard consonants.
                const hp = ctx.createBiquadFilter();
                hp.type = "highpass"; hp.frequency.value = 380; hp.Q.value = 0.8;
                const lp = ctx.createBiquadFilter();
                lp.type = "lowpass";  lp.frequency.value = 2800; lp.Q.value = 0.7;
                const peak = ctx.createBiquadFilter();
                peak.type = "peaking"; peak.frequency.value = 1600;
                peak.Q.value = 2.0; peak.gain.value = 5;

                // Soft saturator: tanh-ish curve, fairly gentle so words
                // stay readable but consonants get a metallic edge.
                const shaper = ctx.createWaveShaper();
                const n = 1024, curve = new Float32Array(n);
                const amt = 0.35;
                for (let i = 0; i < n; i++) {
                    const x = (i / (n - 1)) * 2 - 1;
                    curve[i] = Math.tanh(x * (1 + amt * 4)) / Math.tanh(1 + amt * 4);
                }
                shaper.curve = curve;
                shaper.oversample = "2x";

                // Tiny make-up gain after saturation so output level
                // matches the clean path.
                const post = ctx.createGain(); post.gain.value = 0.92;

                hp.connect(lp).connect(peak).connect(shaper).connect(post);
                return {
                    input:  hp,
                    output: post,
                    nodes:  [hp, lp, peak, shaper, post],
                    wobble: peak
                };
            }
        }
    };

    /* ---------- glitch intensity (driven by settings) ------------ */

    // The user sets this in settings: "off" / "subtle" / "heavy".
    // Glitch never breaks intelligibility: it only modulates filter
    // frequency, gain, and (on heavy) inserts very short drop-outs.
    // It DOES NOT seek currentTime. Ever.
    const GLITCH_PROFILES = {
        off: {
            wobbleDepth:    0,     // fraction of base frequency
            wobbleHz:       0,     // LFO rate, Hz
            tremoloDepth:   0,
            tremoloHz:      0,
            pitchJitter:    0,
            dropoutEveryMs: 0,     // 0 = disabled
            dropoutLenMs:   0
        },
        subtle: {
            wobbleDepth:    0.10,
            wobbleHz:       0.45,
            tremoloDepth:   0.06,
            tremoloHz:      0.30,
            pitchJitter:    0.012,
            dropoutEveryMs: 0,
            dropoutLenMs:   0
        },
        heavy: {
            wobbleDepth:    0.25,
            wobbleHz:       0.9,
            tremoloDepth:   0.15,
            tremoloHz:      0.6,
            pitchJitter:    0.025,
            dropoutEveryMs: 4200,
            dropoutLenMs:   95
        }
    };

    function currentGlitchProfile() {
        const lvl = (typeof settingsState !== "undefined" && settingsState.voiceGlitch)
            ? settingsState.voiceGlitch : "subtle";
        return GLITCH_PROFILES[lvl] || GLITCH_PROFILES.subtle;
    }

    /**
     * Play one ALICE phrase.
     * @param {{text:string,audio:string}} phraseObj
     * @param {{channel?:string, forceGlitch?:boolean}|boolean} opts
     *   - opts.channel: "bg" | "story" (defaults to "bg")
     *   - opts.forceGlitch: legacy flag (no longer used; glitch level is
     *     read from settings). Kept to stay backward-compatible with old
     *     call sites that may still pass it.
     */
    function playAliceVoice(phraseObj, opts) {
        if (!phraseObj || !phraseObj.text) return null;
        if (window.__chatterEnabled === false) return null;
        /* a long track (jury intro, voice test, the extra, the evidence
           video) owns the room: a deck line here would also take the
           VoiceBus with interrupt and cut that track off mid-sentence */
        if (window.__voiceMediaHold) return null;

        // while the demo overlay is active, the slide-deck's Alice has to
        // stay completely silent — otherwise her chatter fights the game's
        // own audio (compile sounds, ghosts, voice on HARD).
        if (window.__demoActive) return null;

        // boot-menu / fake-loading gate: chat stays completely silent until
        // the CRT terminal is the active surface
        if (!pitchTerminalActive) return null;

        const o = (typeof opts === "object" && opts !== null) ? opts
                : (opts === true ? { forceGlitch: true } : {});
        const channel  = o.channel === "story" ? "story" : "bg";
        const profile  = VOICE_PROFILES[channel];
        const glitchP  = currentGlitchProfile();
        const glitchOn = glitchP.wobbleDepth > 0 || glitchP.tremoloDepth > 0
                       || glitchP.pitchJitter > 0 || glitchP.dropoutEveryMs > 0;

        const subtitle = voiceTextFor(phraseObj);

        // SFX muted but chatter is on → still surface the text, skip audio
        if (typeof settingsState !== "undefined" && settingsState.sfxOn === false) {
            return pushAliceLine(subtitle, { glitch: glitchOn });
        }

        if (isAliceSpeaking()) return null;

        const lineEl = pushAliceLine(subtitle, { glitch: glitchOn });

        const voiceSrc = voiceSrcFor(phraseObj);
        if (!voiceSrc) {
            return lineEl;   // nothing recorded for this line here: text only
        }
        // one voice at a time, across both engines — a sample outranks speech
        if (typeof VoiceBus !== "undefined"
            && !VoiceBus.acquire("sample", stopCurrentVoice, { interrupt: true })) return lineEl;

        // NOTE: the inline SFX engine higher up shadows the native `Audio`
        // constructor with a Web-Audio wrapper. Build the HTMLAudioElement via
        // createElement so we always hit the DOM-level audio playback path.
        let audio;
        try {
            audio = document.createElement("audio");
            audio.src = voiceSrc;
        } catch (e) {
            return lineEl;
        }
        audio.preload = "auto";
        audio.playbackRate = profile.pitchBase;

        currentVoiceAudio = audio;
        voiceGlitchTarget = glitchOn ? lineEl : null;

        // Try to route through the Web Audio graph for channel-specific FX.
        // If the context isn't ready (rare — boot menu plays a click that
        // unlocks it long before we get here), fall back to direct volume.
        let usingGraph = false;
        let chainRef   = null;
        let   ctx       = (typeof Audio !== "undefined" && Audio.getContext)   ? Audio.getContext()   : null;
        const voiceNode = (typeof Audio !== "undefined" && Audio.getVoiceNode) ? Audio.getVoiceNode() : null;
        /* createMediaElementSource() hijacks this element's output for good.
           On a suspended context the graph is frozen, so the line would play
           into silence with no way back — ask for a resume, and only take the
           graph path once the context is genuinely running. Audio.resume() is
           async, so this once we take the audible element-volume path and the
           next line gets the graph. */
        if (ctx && ctx.state !== "running") {
            try { Audio.resume(); } catch (e) {}
        }
        if (ctx && ctx.state !== "running") ctx = null;
        if (ctx && voiceNode) {
            try {
                /* Build the FX chain FIRST: it can throw, and capturing the
                   element before that leaves it owned by an orphan source
                   node, where setting audio.volume in the fallback below
                   achieves nothing and the line is simply silent. */
                const chain = profile.buildGraph(ctx);
                const g     = ctx.createGain();
                g.gain.value = profile.gainMul;
                let src = audio[VOICE_SRC_KEY];
                if (!src) {
                    src = ctx.createMediaElementSource(audio);
                    audio[VOICE_SRC_KEY] = src;
                }
                src.connect(chain.input);
                chain.output.connect(g).connect(voiceNode);
                // Element itself must stay at full so the graph sees the raw signal.
                audio.volume = 1.0;
                chainRef = chain;
                currentVoiceGraph = { source: src, filters: chain.nodes, gain: g, wobble: chain.wobble };
                usingGraph = true;
            } catch (e) {
                // graph build failed — fall back
                currentVoiceGraph = null;
            }
        }
        if (!usingGraph) {
            // No Web Audio → best-effort direct volume so we still produce sound.
            audio.volume = aliceCurrentVolume() * profile.gainMul;
            voiceVolumeWatcher = setInterval(() => {
                if (!currentVoiceAudio) { clearInterval(voiceVolumeWatcher); voiceVolumeWatcher = null; return; }
                if (!alicePlaybackAllowed()) { stopCurrentVoice(); return; }
                currentVoiceAudio.volume = aliceCurrentVolume() * profile.gainMul;
            }, 200);
        } else {
            // Volume changes flow through master/voiceGain automatically.
            // We only need a heartbeat to react to chatter/sfx mute toggles.
            voiceVolumeWatcher = setInterval(() => {
                if (!currentVoiceAudio) { clearInterval(voiceVolumeWatcher); voiceVolumeWatcher = null; return; }
                if (!alicePlaybackAllowed()) { stopCurrentVoice(); return; }
            }, 200);
        }

        const cleanup = () => {
            // Guard: only tear down globals if they still belong to *this*
            // audio element. When a story line interrupts a BG line, the
            // old element's "error" event (fired by `src = ""`) can race
            // ahead and would otherwise clobber the freshly-built graph.
            if (currentVoiceAudio !== audio) return;
            if (voiceGlitchTimer)   { clearInterval(voiceGlitchTimer);   voiceGlitchTimer   = null; }
            if (voicePitchTimer)    { clearInterval(voicePitchTimer);    voicePitchTimer    = null; }
            if (voiceVolumeWatcher) { clearInterval(voiceVolumeWatcher); voiceVolumeWatcher = null; }
            if (voiceDropTimer)     { clearTimeout(voiceDropTimer);      voiceDropTimer     = null; }
            if (voiceGlitchTarget)  { voiceGlitchTarget.classList.remove("glitch"); voiceGlitchTarget = null; }
            if (currentVoiceGraph) {
                try { currentVoiceGraph.gain.disconnect(); } catch (e) {}
                try { currentVoiceGraph.source.disconnect(); } catch (e) {}
                (currentVoiceGraph.filters || []).forEach(function (n) {
                    try { n.disconnect(); } catch (e) {}
                });
                currentVoiceGraph = null;
            }
            currentVoiceAudio = null;
        };

        // A take whose cold load fails gets one more try, fetched into a
        // blob: URL and put on the SAME element, so the FX chain and the
        // glitch timers stay. Seen on the presenter's Chrome with a
        // download helper that hooks media requests on http pages (never
        // on file://): the line showed its text and stayed silent. The
        // failure reports twice — "error" and the rejected play() — and
        // counts once. One retry per line; none after she has started,
        // none for data:/blob: sources, which never touch the network.
        let started = false, retried = false, failedSrc = "";
        const retryOrEnd = (err) => {
            if (currentVoiceAudio !== audio) return;
            if (err && err.name === "AbortError") return;             // our own src swap or a stop
            if (err && err.name === "NotAllowedError") return cleanup(); // needs a gesture: a retry will not help
            if (audio.src === failedSrc) return;
            failedSrc = audio.src;
            if (started || retried || /^(data|blob):/.test(voiceSrc) || typeof fetch !== "function") return cleanup();
            retried = true;
            try { console.warn("[AliceVoice] " + voiceSrc + " не загрузился — повтор через fetch"); } catch (e) {}
            fetch(voiceSrc, { cache: "no-store" })
                .then(r => r.ok ? r.blob() : null)
                .then(b => {
                    if (currentVoiceAudio !== audio) return;
                    if (!b) return cleanup();
                    audio.src = deckWarm[voiceSrc] = URL.createObjectURL(b);
                    const p2 = audio.play();
                    if (p2 && typeof p2.catch === "function") p2.catch(retryOrEnd);
                })
                .catch(() => { if (currentVoiceAudio === audio) cleanup(); });
        };
        audio.addEventListener("playing", () => { started = true; }, { once: true });
        audio.addEventListener("ended", cleanup, { once: true });
        audio.addEventListener("error", () => retryOrEnd());
        audio.addEventListener("pause", () => { if (audio.ended) cleanup(); });

        // ---------- glitch driver (intelligibility-safe) -----------
        //
        // No seeks. Instead:
        //   1. filter wobble: gently sweep the mid filter freq with an LFO
        //   2. tremolo:        slowly modulate the per-line gain node
        //   3. pitch jitter:   tiny playbackRate drift
        //   4. dropouts:       (heavy only) short ~95ms gain dips every few s
        //
        // CSS line-glitch is re-triggered alongside so the text matches.

        if (glitchOn && usingGraph && chainRef && chainRef.wobble) {
            const baseFreq = chainRef.wobble.frequency.value;
            const depthHz  = baseFreq * glitchP.wobbleDepth;
            const rateHz   = glitchP.wobbleHz;
            const gainNode = currentVoiceGraph.gain;
            const baseGain = gainNode.gain.value;
            const tremDepth = baseGain * glitchP.tremoloDepth;
            const tremHz    = glitchP.tremoloHz;
            const tStart    = ctx.currentTime;

            // Schedule a long-running LFO on filter freq and per-gain via
            // setValueCurveAtTime in 4-second chunks. We re-schedule from a
            // single setInterval so the curves keep going for whole phrases.
            let chunkIdx = 0;
            const scheduleChunk = () => {
                if (!currentVoiceAudio || currentVoiceAudio.ended || currentVoiceAudio.paused) return;
                const now = ctx.currentTime;
                const dur = 4.0;
                const N   = 64;
                const freqCurve = new Float32Array(N);
                const gainCurve = new Float32Array(N);
                for (let i = 0; i < N; i++) {
                    const t   = i / (N - 1);
                    const phF = 2 * Math.PI * rateHz * (dur * (chunkIdx + t)) + 0.7;
                    const phG = 2 * Math.PI * tremHz * (dur * (chunkIdx + t)) + 1.3;
                    freqCurve[i] = Math.max(50, baseFreq + Math.sin(phF) * depthHz);
                    gainCurve[i] = Math.max(0, baseGain - tremDepth * (0.5 - 0.5 * Math.cos(phG)));
                }
                try {
                    chainRef.wobble.frequency.cancelScheduledValues(now);
                    chainRef.wobble.frequency.setValueCurveAtTime(freqCurve, now, dur);
                    gainNode.gain.cancelScheduledValues(now);
                    gainNode.gain.setValueCurveAtTime(gainCurve, now, dur);
                } catch (e) { /* ignore overlapping-curve races */ }
                chunkIdx++;
            };
            scheduleChunk();
            voiceGlitchTimer = setInterval(scheduleChunk, 3900);
        } else if (glitchOn && usingGraph && chainRef) {
            // No wobble target on the chain — still drive a CSS-only glitch
            // so the text stays in horror mode.
            voiceGlitchTimer = setInterval(() => {
                if (lineEl) {
                    lineEl.classList.remove("glitch");
                    void lineEl.offsetWidth;
                    lineEl.classList.add("glitch");
                }
            }, 800 + Math.random() * 600);
        }

        // playbackRate jitter — subtle drift only. Never large enough to
        // make speech unintelligible. Tied to glitch intensity.
        if (glitchP.pitchJitter > 0) {
            voicePitchTimer = setInterval(() => {
                if (!currentVoiceAudio || currentVoiceAudio.ended || currentVoiceAudio.paused) return;
                const j = (Math.random() * 2 - 1) * glitchP.pitchJitter;
                currentVoiceAudio.playbackRate = Math.max(0.7, Math.min(1.4, profile.pitchBase + j));
            }, 320 + Math.random() * 280);
        }

        // Rare drop-outs — only on "heavy". Implemented as a quick gain dip
        // on the per-line gain node (NOT a seek), so playback continues
        // underneath and the listener catches the next word cleanly.
        if (glitchP.dropoutEveryMs > 0 && usingGraph) {
            const dropFn = () => {
                if (!currentVoiceAudio || currentVoiceAudio.ended || currentVoiceAudio.paused) return;
                const gn = currentVoiceGraph && currentVoiceGraph.gain;
                if (!gn) return;
                const now  = ctx.currentTime;
                const lenS = glitchP.dropoutLenMs / 1000;
                try {
                    const cur = gn.gain.value;
                    gn.gain.setValueAtTime(cur,       now);
                    gn.gain.linearRampToValueAtTime(0, now + 0.008);
                    gn.gain.setValueAtTime(0,         now + lenS - 0.008);
                    gn.gain.linearRampToValueAtTime(cur, now + lenS);
                } catch (e) { /* ignore */ }
            };
            const armDrop = () => {
                dropFn();
                if (voiceDropTimer) clearTimeout(voiceDropTimer);
                voiceDropTimer = setTimeout(armDrop,
                    glitchP.dropoutEveryMs * (0.7 + Math.random() * 0.6));
            };
            voiceDropTimer = setTimeout(armDrop,
                glitchP.dropoutEveryMs * (0.7 + Math.random() * 0.6));
        }

        const p = audio.play();
        if (p && typeof p.catch === "function") p.catch(retryOrEnd);

        return lineEl;
    }

    /* ---------- chat loops --------------------------------------- */

    /* main alice loop — random BG whisper every 2.5–5s once the
       terminal is active. Stays a no-op (just reschedules) inside
       the boot menu / loading screen. */
    function aliceLoop() {
        const next = 2500 + Math.random() * 2500;
        if (pitchTerminalActive
            && !window.__demoActive
            && window.__chatterEnabled !== false
            && !isAliceSpeaking()
            && ALICE_BG_LINES.length) {
            const phraseObj = ALICE_BG_LINES[Math.floor(Math.random() * ALICE_BG_LINES.length)];
            playAliceVoice(phraseObj, { channel: "bg" });
        }
        setTimeout(aliceLoop, next);
    }

    /* react to slide changes with the matching story line — louder,
       always glitched, processed through the "broken radio" graph. */
    function aliceReact(slide) {
        if (!slide || !slide.id) return;
        if (!pitchTerminalActive) return;
        const phraseObj = ALICE_STORY_LINES[slide.id];
        if (!phraseObj) return;
        // story lines win — interrupt any background line in flight
        if (isAliceSpeaking()) stopCurrentVoice();
        playAliceVoice(phraseObj, { channel: "story", forceGlitch: true });
    }

    /* fake command-line teaser at the bottom — types & deletes */
    let cmdIdx = 0, charIdx = 0, deleting = false;
    function fakeCmdLoop() {
        const h = CMD_HINTS[cmdIdx];
        const cmd = typeof h === "string" ? h : t(h.i18n);
        if (!deleting) {
            charIdx++;
            fakeCmd.textContent = cmd.slice(0, charIdx);
            if (charIdx >= cmd.length) {
                deleting = true;
                setTimeout(fakeCmdLoop, 1400);
                return;
            }
        } else {
            charIdx--;
            fakeCmd.textContent = cmd.slice(0, charIdx);
            if (charIdx <= 0) {
                deleting = false;
                cmdIdx = (cmdIdx + 1) % CMD_HINTS.length;
            }
        }
        setTimeout(fakeCmdLoop, deleting ? 35 : 80 + Math.random() * 60);
    }
    /* ============================================================
       BOOT
       ============================================================ */
    function boot() {
        renderSlide(0, { silent: true });

        // initial alice lines, staggered, so chat is never empty;
        // read at push time, after the saved language is applied
        ["alice.open1", "alice.open2", "alice.open3"].forEach((key, i) => {
            setTimeout(() => pushAliceLine(t(key), { glitch: i === 1 }), 350 + i * 700);
        });

        setTimeout(aliceLoop, 3500);
        setTimeout(fakeCmdLoop, 600);
    }

    /* ============================================================
       BOOT MENU  —  pre-CRT friendly title screen
       ============================================================ */
    const bootscreen   = document.getElementById("bootscreen");
    const bootOverload = document.getElementById("bootOverload");
    const bootRain     = document.getElementById("bootRain");
    const bootMenu     = document.getElementById("bootMenu");
    const popupBack    = document.getElementById("bootPopupBack");
    const popupTitle   = document.getElementById("bootPopupTitle");
    const popupBody    = document.getElementById("bootPopupBody");
    const popupClose   = document.getElementById("bootPopupClose");

    // The studio mark is static markup now — assets/brand-mark.svg and
    // assets/brand-wordmark.svg, animated by CSS inside those files.
    // Nothing to wire up here, and ASSETS.logo is no longer used.

    // build rain particles
    (function buildRain() {
        const n = 28;
        for (let i = 0; i < n; i++) {
            const s = document.createElement("span");
            s.style.left              = Math.random() * 100 + "%";
            s.style.animationDuration = (2.5 + Math.random() * 3.5) + "s";
            s.style.animationDelay    = (-Math.random() * 4) + "s";
            s.style.opacity           = (0.25 + Math.random() * 0.5).toFixed(2);
            s.style.height            = (10 + Math.random() * 22) + "px";
            bootRain.appendChild(s);
        }
    })();

    /* ============================================================
       I18N — string table + locale switcher
       ------------------------------------------------------------
       Static UI strings (menu / topbar / popups / settings) live in
       10-i18n.js, keyed by stable IDs. The current locale is driven
       by settingsState.locale ("ru" | "en" | "tj" | "tj_col"). Slides
       have their own per-locale arrays (SLIDES_BY_LOCALE). Alice's
       deck lines speak the take recorded for the locale with its
       translated text, else the Russian take with the Russian text —
       the text always matches the voice (voiceSrcFor above).
       ============================================================ */
