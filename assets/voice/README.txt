Recorded Alice lines go here, one folder per locale:

    assets/voice/ru/      assets/voice/en/
    assets/voice/tj/      assets/voice/tj_col/

File name = clip id + extension, e.g.  deck.slide01.mp3
Easiest way: the voice studio (start.bat -> http://localhost/studio.html):
"приложить файл" or "записать", then "сохранить в игру" puts the file here
under the right name and updates js/core/00-voice-clips.js by itself.

Files copied in by hand are picked up on the next start of start.bat.
The text to record, per line: studio -> "скачать спикер-лист".
For a flash drive without the server: studio -> "вшить записи (для флешки)".

A take only replaces the voice in the locale it sits in.
A file whose name is not a known clip id is reported and skipped.
