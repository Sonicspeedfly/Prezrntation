/* ============================================================
   TERMINAL: SHATTERED — live voice sync
   ------------------------------------------------------------
   When the deck is served by serve.js, takes saved in the voice
   studio reach a page that is already open — no reload. The
   tables are refreshed on load, whenever the tab comes back into
   view, and on every language switch (10-i18n.js applyLocale
   calls voiceSync), so picking a language pulls in whatever has
   been recorded for it by then.

   VOICE_CLIPS and VOICE_TEXT are consts declared by the two
   generated files loaded just before this one, JURY_CUES by
   14-jury-cues.js further down; all three are refilled in place,
   never reassigned. JURY_CUES does not exist yet when this file
   runs, but the refill happens after DOMContentLoaded, when it does.

   Opened from file:// or from any other static server, the
   request simply fails and the generated files stay in charge —
   which is exactly the offline behaviour the deck had before.

   Part 0 of the deck's script, loaded first by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    function voiceSyncRefill(target, src) {
        if (!target || typeof target !== "object") return;
        Object.keys(target).forEach(function (k) { delete target[k]; });
        Object.keys(src || {}).forEach(function (k) { target[k] = src[k]; });
    }

    let voiceSyncInFlight = null;

    function voiceSync() {
        if (typeof location === "undefined" || !/^https?:$/.test(location.protocol)) return null;
        if (typeof fetch !== "function") return null;
        if (voiceSyncInFlight) return voiceSyncInFlight;
        voiceSyncInFlight = fetch("api/voice/manifest", { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (j) {
                if (!j || !j.ok) return false;
                if (typeof VOICE_CLIPS !== "undefined") voiceSyncRefill(VOICE_CLIPS, j.clips);
                if (typeof VOICE_TEXT  !== "undefined") voiceSyncRefill(VOICE_TEXT,  j.text);
                /* jury-intro subtitles (14-jury-cues.js), retimed by serve.js
                   whenever a new act take or script lands in the studio */
                if (typeof JURY_CUES   !== "undefined" && j.cues) voiceSyncRefill(JURY_CUES, j.cues);
                return true;
            })
            .catch(function () { return false; })
            .then(function (ok) { voiceSyncInFlight = null; return ok; });
        return voiceSyncInFlight;
    }

    if (typeof document !== "undefined") {
        document.addEventListener("DOMContentLoaded", function () { voiceSync(); });
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") voiceSync();
        });
    }
