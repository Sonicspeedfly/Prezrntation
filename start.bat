@echo off
rem TERMINAL: SHATTERED - the one launcher: presentation, voice studio,
rem Alice's voice (ElevenLabs / Piper), Ollama bridge, QR for the jury's phones.
rem ASCII only: cmd.exe misreads Cyrillic in .bat files. Help: README.md
chcp 65001 >nul
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=8779

where node >nul 2>nul
if %errorlevel%==0 (
    rem Piper, the offline voice: test phrase if it is here, download if not.
    rem The server starts either way; this was the attempt for this run.
    node tools\get-piper.js
    node serve.js %PORT% --open --no-piper-download
    goto :end
)
echo.
echo   Node.js not found. Install the LTS version from https://nodejs.org
echo   and run this file again.
echo.
echo   Without the server the presentation still opens from index.html,
echo   but the voice studio, Alice's voice and the QR link do not work.
echo.

:end
pause
