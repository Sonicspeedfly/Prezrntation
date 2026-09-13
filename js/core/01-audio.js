/* ============================================================
   TERMINAL: SHATTERED — audio
   ------------------------------------------------------------
   Web Audio engine — every sound is synthesised, nothing is loaded.

   Part 1/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    /* ============================================================
       AUDIO ENGINE  —  Web Audio API, fully synthesized.
       No external files. Activates on first user gesture.
       ============================================================ */
    const Audio = (() => {
        let ctx        = null;
        let masterGain = null;
        let musicGain  = null;
        let sfxGain    = null;
        let voiceGain  = null;   // dedicated bus for ALICE pre-recorded voice
        let musicTimer = null;
        let musicEnabled = true;
        let sfxEnabled   = true;
        // master, music, sfx, voice as 0..1
        let vol = { master: 0.7, music: 0.55, sfx: 0.85, voice: 1.0 };

        function ensureCtx() {
            if (ctx) return ctx;
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            masterGain = ctx.createGain(); masterGain.gain.value = vol.master;
            musicGain  = ctx.createGain(); musicGain.gain.value  = vol.music;
            sfxGain    = ctx.createGain(); sfxGain.gain.value    = vol.sfx;
            voiceGain  = ctx.createGain(); voiceGain.gain.value  = vol.voice;
            masterGain.connect(ctx.destination);
            musicGain.connect(masterGain);
            sfxGain.connect(masterGain);
            voiceGain.connect(masterGain);
            return ctx;
        }
        function resume() {
            ensureCtx();
            if (ctx && ctx.state === "suspended") ctx.resume();
        }
        function applyVolumes() {
            if (!ctx) return;
            masterGain.gain.value = vol.master;
            musicGain.gain.value  = vol.music * (musicEnabled ? 1 : 0);
            /* The sfx flag has to reach the bus, not just the helpers.
               tone() and noise() check `sfxEnabled` themselves, but the
               ambient room drone is a pair of oscillators wired straight to
               sfxGain — so turning UI SFX off used to leave the demo's drone
               running at full level. */
            sfxGain.gain.value    = vol.sfx * (sfxEnabled ? 1 : 0);
            voiceGain.gain.value  = vol.voice;
        }
        function setVolume(kind, v01) {
            vol[kind] = Math.max(0, Math.min(1, v01));
            applyVolumes();
        }
        function setMusicEnabled(b) {
            musicEnabled = !!b;
            applyVolumes();
            if (b && !musicTimer) startMusic();
            if (!b) stopMusic();
        }
        function setSfxEnabled(b) { sfxEnabled = !!b; applyVolumes(); }

        // ---------- SFX primitives ----------
        function tone(freq, dur, gain, type, opts) {
            if (!ctx || !sfxEnabled) return;
            opts = opts || {};
            const t0 = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = type || "sine";
            if (opts.sweep) {
                osc.frequency.setValueAtTime(freq, t0);
                osc.frequency.exponentialRampToValueAtTime(
                    Math.max(20, opts.sweep), t0 + dur);
            } else {
                osc.frequency.value = freq;
            }
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
            osc.connect(g).connect(sfxGain);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        }
        function noise(dur, gain, lowpass, highpass) {
            if (!ctx || !sfxEnabled) return;
            const t0 = ctx.currentTime;
            const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource(); src.buffer = buf;
            let node = src;
            if (highpass) {
                const hp = ctx.createBiquadFilter();
                hp.type = "highpass"; hp.frequency.value = highpass;
                node.connect(hp); node = hp;
            }
            if (lowpass) {
                const lp = ctx.createBiquadFilter();
                lp.type = "lowpass"; lp.frequency.value = lowpass;
                node.connect(lp); node = lp;
            }
            const g = ctx.createGain();
            g.gain.setValueAtTime(gain, t0);
            g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
            node.connect(g).connect(sfxGain);
            src.start(t0);
            src.stop(t0 + dur + 0.02);
        }

        function playHover()  { tone(820, 0.05, 0.08, "sine"); }
        function playClick()  {
            tone(620, 0.04, 0.16, "square");
            noise(0.10, 0.10, 1200, 300);
        }
        function playOpen()   {
            tone(420, 0.20, 0.10, "sine", { sweep: 760 });
            tone(560, 0.22, 0.07, "sine", { sweep: 880 });
        }
        function playClose()  {
            tone(620, 0.18, 0.10, "sine", { sweep: 280 });
        }
        function playGlitch(dur) {
            dur = dur || 0.5;
            if (!ctx || !sfxEnabled) return;
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    noise(0.10 + Math.random() * 0.10,
                          0.18 + Math.random() * 0.10,
                          400 + Math.random() * 4000,
                          80 + Math.random() * 600);
                }, i * (dur * 1000 / 6));
            }
        }
        function playTransition(dur) {
            dur = dur || 0.9;
            if (!ctx || !sfxEnabled) return;
            const t0 = ctx.currentTime;
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(70, t0);
            osc.frequency.exponentialRampToValueAtTime(1600, t0 + dur);
            g.gain.setValueAtTime(0, t0);
            g.gain.linearRampToValueAtTime(0.16, t0 + dur * 0.4);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
            osc.connect(g).connect(sfxGain);
            osc.start(t0);
            osc.stop(t0 + dur + 0.05);
            noise(dur * 0.85, 0.20, 4000, 200);
        }
        function playGhost() {
            // soft "memory surface" whisper-like sweep
            if (!ctx || !sfxEnabled) return;
            tone(180 + Math.random() * 60, 1.4, 0.05, "triangle",
                 { sweep: 240 + Math.random() * 120 });
            noise(0.9, 0.025, 800, 250);
        }

        // ---------- MUSIC: slow D-minor ambient ----------
        // 4 bars × ~3.33s ≈ 13.3s loop
        function schedNote(t, dur, freq, type, peak, attack, release, dest) {
            const osc = ctx.createOscillator();
            const g   = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(peak, t + Math.min(attack, dur * 0.4));
            g.gain.setValueAtTime(peak, t + Math.max(dur - release, attack));
            g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
            osc.connect(g).connect(dest || musicGain);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        }
        function playMusicLoop() {
            if (!ctx || !musicEnabled) return;
            /* A suspended context freezes ctx.currentTime while this timer
               keeps ticking on the wall clock. Every pass would schedule
               another whole loop at the same t0, and they would all fire
               together the moment the user's first click resumes us — a
               smeared, much louder chorus of the theme, one copy per 13s
               spent on the boot menu. Poll instead of stacking. */
            if (ctx.state !== "running") {
                if (musicTimer) clearTimeout(musicTimer);
                musicTimer = setTimeout(playMusicLoop, 500);
                return;
            }
            const beat = 0.83;          // sec / beat (≈ 72 BPM)
            const bar  = beat * 4;
            const t0   = ctx.currentTime + 0.05;

            // Dm – B♭ – F – Am  (i – VI – III – v, D-aeolian)
            const chords = [
                { bass:  73.42, pad: [146.83, 174.61, 220.00] }, // Dm
                { bass:  58.27, pad: [116.54, 146.83, 174.61] }, // B♭
                { bass:  87.31, pad: [174.61, 220.00, 261.63] }, // F
                { bass:  55.00, pad: [110.00, 130.81, 164.81] }  // Am
            ];
            chords.forEach((c, i) => {
                const t = t0 + i * bar;
                // bass drone
                schedNote(t, bar * 1.05, c.bass,        "triangle", 0.090, 0.45, 0.50);
                // sub bass octave for body
                schedNote(t, bar * 1.05, c.bass * 0.5,  "sine",     0.060, 0.6, 0.55);
                // soft pad triad
                c.pad.forEach((f, k) => schedNote(
                    t, bar * 1.02, f, "sine",
                    0.040 - k * 0.005, 0.75, 0.45));
            });

            // sparse melody on bars 0 + 2 + 3 (D5, F5, A5, F5, D5)
            const mel = [
                { bar: 0, beat: 0,   f: 587.33, d: 1.5 },
                { bar: 0, beat: 2.5, f: 698.46, d: 1.0 },
                { bar: 2, beat: 1,   f: 880.00, d: 1.5 },
                { bar: 3, beat: 0,   f: 698.46, d: 1.0 },
                { bar: 3, beat: 2,   f: 587.33, d: 2.0 }
            ];
            mel.forEach(m => {
                const t = t0 + m.bar * bar + m.beat * beat;
                schedNote(t, m.d * beat, m.f, "sine", 0.060, 0.04, 0.7);
                // faint shadow octave below
                schedNote(t, m.d * beat, m.f / 2, "triangle", 0.018, 0.04, 0.7);
            });

            // quiet noise wash, very low
            noiseWash(t0, bar * 4);

            // schedule next loop right before this one ends
            const loopMs = bar * 4 * 1000;
            musicTimer = setTimeout(playMusicLoop, loopMs - 200);
        }
        function noiseWash(t, dur) {
            if (!ctx) return;
            const len = Math.floor(ctx.sampleRate * dur);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const d = buf.getChannelData(0);
            // pink-ish via 1/f-ish weighting
            let b = 0;
            for (let i = 0; i < len; i++) {
                const w = Math.random() * 2 - 1;
                b = 0.97 * b + w * 0.03;
                d[i] = b;
            }
            const src = ctx.createBufferSource(); src.buffer = buf;
            const lp  = ctx.createBiquadFilter();
            lp.type = "lowpass"; lp.frequency.value = 800;
            const g   = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.020, t + 1.5);
            g.gain.setValueAtTime(0.020, t + dur - 1.5);
            g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
            src.connect(lp).connect(g).connect(musicGain);
            src.start(t); src.stop(t + dur);
        }
        function startMusic() {
            if (!ensureCtx()) return;
            if (musicTimer) clearTimeout(musicTimer);
            musicTimer = null;
            if (!musicEnabled) return;
            playMusicLoop();
        }
        function stopMusic() {
            if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
            if (musicGain && ctx) {
                const t = ctx.currentTime;
                musicGain.gain.cancelScheduledValues(t);
                musicGain.gain.setValueAtTime(musicGain.gain.value, t);
                musicGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.8);
                setTimeout(() => {
                    if (musicGain) musicGain.gain.value = vol.music * (musicEnabled ? 1 : 0);
                }, 900);
            }
        }


        /* ============================================================
           AMBIENT ROOM TONE  (the demo only)
           ------------------------------------------------------------
           Three layers:
             · a drone — two oscillators a hair apart, so they beat
               against each other; the beat widens with corruption
             · a slow filter sweep, so the room seems to breathe
             · sparse events out in the dark — a distant metal settle,
               closer and more often as the anomaly count climbs
           setAmbientIntensity(0..1) is driven by VoidOS corruption.
           ============================================================ */
        let ambGain = null, ambOscA = null, ambOscB = null, ambFilter = null;
        let ambTimer = null, ambLfo = null, ambLfoGain = null;
        let ambIntensity = 0;

        function startAmbient() {
            ensureCtx();
            if (!ctx || ambGain) return;

            ambGain = ctx.createGain();
            ambGain.gain.value = 0.0001;
            ambGain.connect(sfxGain);

            ambFilter = ctx.createBiquadFilter();
            ambFilter.type = "lowpass";
            ambFilter.frequency.value = 260;
            ambFilter.Q.value = 6;
            ambFilter.connect(ambGain);

            ambOscA = ctx.createOscillator();
            ambOscA.type = "sawtooth";
            ambOscA.frequency.value = 41.2;          // deep, felt more than heard
            ambOscB = ctx.createOscillator();
            ambOscB.type = "sine";
            ambOscB.frequency.value = 41.9;          // the beat between them
            ambOscA.connect(ambFilter);
            ambOscB.connect(ambFilter);

            /* the breath: a slow sweep of the filter cutoff */
            ambLfo = ctx.createOscillator();
            ambLfo.type = "sine";
            ambLfo.frequency.value = 0.06;
            ambLfoGain = ctx.createGain();
            ambLfoGain.gain.value = 90;
            ambLfo.connect(ambLfoGain);
            ambLfoGain.connect(ambFilter.frequency);

            ambOscA.start(); ambOscB.start(); ambLfo.start();
            ambGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3.5);
            scheduleAmbEvent();
        }

        /* one noise from out in the dark */
        function ambEvent() {
            if (!ctx || !ambGain) return;
            const far = Math.random() < (0.75 - ambIntensity * 0.5);  // closer when bad
            if (Math.random() < 0.45) {
                // metal settling — a filtered noise swell
                noise(far ? 1.1 : 0.55,
                      (far ? 0.020 : 0.055) * (1 + ambIntensity),
                      far ? 700 : 1800,
                      120);
            } else {
                // a structural tick, somewhere behind you
                tone(60 + Math.random() * 40, far ? 0.5 : 0.22,
                     (far ? 0.030 : 0.070) * (1 + ambIntensity), "triangle");
            }
        }

        function scheduleAmbEvent() {
            if (ambTimer) clearTimeout(ambTimer);
            // 9..22 s when calm, down to about 2..5 s when the count is high
            const lo = 9000 - ambIntensity * 7000;
            const hi = 22000 - ambIntensity * 17000;
            ambTimer = setTimeout(function () {
                if (!ambGain) return;
                if (sfxEnabled) ambEvent();
                scheduleAmbEvent();
            }, lo + Math.random() * (hi - lo));
        }

        function setAmbientIntensity(v) {
            ambIntensity = Math.max(0, Math.min(1, v || 0));
            if (!ctx || !ambOscB) return;
            const t = ctx.currentTime;
            // the two oscillators drift apart — the room goes slightly wrong
            ambOscB.frequency.setTargetAtTime(41.9 + ambIntensity * 3.4, t, 1.5);
            ambFilter.Q.setTargetAtTime(6 + ambIntensity * 9, t, 1.5);
            ambGain.gain.setTargetAtTime(0.05 + ambIntensity * 0.05, t, 2.0);
        }

        function stopAmbient() {
            if (ambTimer) { clearTimeout(ambTimer); ambTimer = null; }
            if (!ctx || !ambGain) return;
            const g = ambGain, a = ambOscA, b = ambOscB, l = ambLfo;
            const t = ctx.currentTime;
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
            setTimeout(function () {
                [a, b, l].forEach(function (o) { try { o.stop(); o.disconnect(); } catch (e) {} });
                try { g.disconnect(); } catch (e) {}
            }, 1400);
            ambGain = ambOscA = ambOscB = ambFilter = ambLfo = ambLfoGain = null;
            ambIntensity = 0;
        }

        return {
            resume, isReady: () => ctx !== null,
            setVolume, setMusicEnabled, setSfxEnabled,
            getVolume: (k) => vol[k],
            isMusicEnabled: () => musicEnabled,
            isSfxEnabled:   () => sfxEnabled,
            playHover, playClick, playOpen, playClose,
            playGlitch, playTransition, playGhost,
            startMusic, stopMusic,
            startAmbient, stopAmbient, setAmbientIntensity,
            // expose the underlying Web Audio graph so external sources
            // (e.g. ALICE voice MediaElementSource) can route through the
            // same master + voice gain pipeline and respect global volume.
            getContext:   () => { ensureCtx(); return ctx; },
            getSfxNode:   () => { ensureCtx(); return sfxGain; },
            getVoiceNode: () => { ensureCtx(); return voiceGain; }
        };
    })();

    // Activate audio on first user gesture (autoplay policy)
    (function audioUnlockOnce() {
        const handler = () => {
            Audio.resume();
            window.removeEventListener("pointerdown", handler, true);
            window.removeEventListener("keydown",     handler, true);
            window.removeEventListener("touchstart",  handler, true);
        };
        window.addEventListener("pointerdown", handler, true);
        window.addEventListener("keydown",     handler, true);
        window.addEventListener("touchstart",  handler, true);
    })();

    /* ============================================================
       VOICE BUS  —  one ALICE voice at a time, whichever engine.
       ------------------------------------------------------------
       Two engines can make her talk: the recorded samples in
       08-alice-lines.js (HTMLAudioElement → voiceGain) and the
       browser's speechSynthesis (03-alice-voice.js), which cannot be
       routed through Web Audio at all. Neither can see the other —
       `isAliceSpeaking()` only knows about the <audio> element and
       returns false while the synth is talking — so the floor is
       arbitrated here instead of by ad-hoc gates.

       A recorded sample always outranks speech synthesis: if we have
       her real voice for a line, the robot must not read it too.

       Declared in 01 because it depends on nothing and everything
       below it needs it at call time — see docs/ARCHITECTURE.md.
       ============================================================ */
    const VoiceBus = (() => {
        let owner   = null;    // "sample" | "speech" | null
        let release = null;    // the current owner's own stop routine
        return {
            acquire(who, stopFn, opts) {
                opts = opts || {};
                // speech never talks over a real recording
                if (owner && owner !== who && who === "speech" && owner === "sample") return false;
                if (owner) {
                    if (!opts.interrupt) return false;
                    const r = release;
                    owner = null; release = null;
                    if (r) { try { r(); } catch (e) {} }
                }
                owner = who; release = stopFn || null;
                return true;
            },
            releaseIf(who) {
                if (owner !== who) return;
                owner = null; release = null;
            },
            stopAll() {
                const r = release;
                owner = null; release = null;
                if (r) { try { r(); } catch (e) {} }
            },
            busy() { return owner !== null; },
            who()  { return owner; }
        };
    })();

    /* speechSynthesis output is produced by the platform speech engine, not
       by an AudioContext — there is no AudioNode for it, so it cannot be
       connected to voiceGain and `u.volume` is the only control there is.
       That is why it has to read the same percentages by hand. Called once
       per chunk, so dragging the slider is heard on the next chunk instead
       of only on the next line. */
    function voiceVolume01() {
        const s = (typeof window !== "undefined" && window.settingsState) ? window.settingsState : null;
        if (s && s.sfxOn === false) return 0;
        const m = (s && Number.isFinite(s.volMaster)) ? s.volMaster : 70;
        const v = (s && Number.isFinite(s.volVoice))  ? s.volVoice  : 100;
        return Math.max(0, Math.min(1, (m / 100) * (v / 100)));
    }

    /* ============================================================
       EMBEDDED ASSETS  —  base64 data URLs (offline, single file)
       Populated below with __ASSET_*__ tokens swapped at build time.
       ============================================================ */
