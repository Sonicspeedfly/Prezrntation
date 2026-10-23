#!/bin/sh
# TERMINAL: SHATTERED - the launcher for macOS and Linux (start.bat on Windows):
# presentation, voice studio, Alice's voice (ElevenLabs / Piper), Ollama bridge,
# QR for the jury's phones. Piper is checked with a test phrase and fetched
# if missing before the server starts (Linux; there is no working macOS
# build). Help: README.md
cd "$(dirname "$0")" || exit 1
PORT="${1:-8779}"

if command -v node >/dev/null 2>&1; then
    # the server starts either way; this was the attempt for this run
    node tools/get-piper.js
    exec node serve.js "$PORT" --open --no-piper-download
fi

echo
echo "  Node.js not found. Install the LTS version from https://nodejs.org"
echo "  and run this file again."
echo
echo "  Without the server the presentation still opens from index.html,"
echo "  but the voice studio, Alice's voice and the QR link do not work."
echo
exit 1
