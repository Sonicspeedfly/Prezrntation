/* ============================================================
   TERMINAL: SHATTERED — void os
   ------------------------------------------------------------
   VoidOS — the filesystem that *is* the level, plus its shell and its four languages.

   Part 5/13 of the deck's script, loaded in order by index.html.
   These are classic scripts sharing one global lexical scope —
   see docs/ARCHITECTURE.md before moving anything between files.
   ============================================================ */

    const OS_TEXT_BY_LOCALE = {
    ru: {
"readme":
"neikon@void — прочитай это первым\n" +
"==================================\n" +
"\n" +
"ты снова всё забыл. я оставил это там, где ты об это споткнёшься.\n" +
"\n" +
"  help            что умеет эта оболочка\n" +
"  ls / cd / cat   осмотреть диск\n" +
"  svc list        что запущено, а что мертво\n" +
"  fsck            что сломано\n" +
"  man <тема>      подробное объяснение любой команды выше\n" +
"\n" +
"машина И ЕСТЬ комната. поменяешь здесь ключ — выйди наружу\n" +
"и посмотри, что с ней стало.\n" +
"\n" +
"                                        — ты, некоторое время назад",

"note.room":
"пробую записывать, пока помню.\n" +
"\n" +
"комната закрытая. четыре стены, потолок, дверь в северной.\n" +
"я обошёл её по периметру и считал: шестнадцать поперёк, двадцать шесть\n" +
"вдоль. те же числа стоят в конфиге тома. одно число, записанное\n" +
"дважды: сначала в стенах, потом в файле.\n" +
"\n" +
"поперёк комнаты стоит перегородка, четыре панели. кто её поднял,\n" +
"тот и оставил скрипт, которым она опускается. смешно.\n" +
"\n" +
"в конфиге отмечены три опоры. горит одна — над этим столом.\n" +
"две другие где-то там, холодные. на каждой должна быть табличка,\n" +
"я такие ставил. если зажечь опору и дойти до неё — можно прочитать.\n" +
"\n" +
"дойти. не посмотреть с места. дойти.",

"note.door":
"метрах в двадцати пяти отсюда, за столом, есть дверь.\n" +
"она никогда не догружается. доходит до тех же 60%, рвёт себя\n" +
"на части и начинает заново. звук при этом такой, будто железо\n" +
"тащат по железу.\n" +
"\n" +
"door0 — это служба. службы можно останавливать. я не стал:\n" +
"она ломится наружу уже год, и мне не хочется знать, к чему.\n" +
"может, ты смелее.",

"note.alice":
"элис — том. я её не запускаю, я её монтирую.\n" +
"\n" +
"когда хранилище легло, удар приняла её копия. fsck говорит, что три\n" +
"области не читаются. две из них — исходники, которые ещё как-то\n" +
"компилируются; третья — сам образ, и он пересоберётся из первых двух,\n" +
"как только те станут чистыми.\n" +
"\n" +
"recover.sh делает последний шаг. он откажется, пока fsck не замолчит.",

"conf":
"# дескриптор тома crystalfs :: /etc/void.conf\n" +
"# этот файл — и есть комната. правь командой `set <ключ> <значение>`.\n" +
"\n" +
"fog.density   = 0.11         # 0.005 прозрачно .. 0.140 вслепую\n" +
"lamp.lamp0    = on           # пилон над столом (этот терминал)\n" +
"lamp.lamp1    = off          # северный пилон\n" +
"lamp.lamp2    = off          # дальний пилон, рядом с door0\n" +
"door.door0    = loop         # loop | halted | open\n" +
"\n" +
"room.width    = 16           # ширина комнаты, 10..40\n" +
"room.depth    = 26           # глубина, 12..60\n" +
"room.barrier  = 4            # панелей перегородки стоит, 0..4\n" +
"\n" +
"# anomaly.threshold читает сторожевой таймер. не поднимай его.\n" +
"anomaly.threshold = 45",

"history":
"ls /dev\n" +
"cat /etc/void.conf\n" +
"svc list\n" +
"svc start lamp1\n" +
"# сработало. там, снаружи, стоит пилон. я видел, как он зажёгся.\n" +
"set fog.density 0.02\n" +
"# после этого стало видно дверь. лучше бы не было.\n" +
"fsck /dev/alice\n" +
"# один исходник я вычистил. потом мимо стола что-то прошло,\n" +
"# и я перестал записывать.",

"man.svc":
"SVC(1)                    менеджер служб void\n\n" +
"  svc list              показать все службы и их состояние\n" +
"  svc start <имя>       поднять службу\n" +
"  svc stop <имя>        остановить службу\n" +
"  svc restart <имя>     остановить, потом запустить\n\n" +
"Службы в этой комнате — это железо. lamp1 и lamp2 — пилоны,\n" +
"стоящие в темноте. door0 — та самая дверь. alice руками не\n" +
"поднимается — смотри `man recover`.",

"man.set":
"SET(1)                    редактор дескриптора тома\n\n" +
"  set <ключ> <значение>  записать ключ в /etc/void.conf и сразу\n" +
"                         применить его к работающему тому\n\n" +
"Ключи лежат в /etc/void.conf. Прочитай его. fog.density принимает\n" +
"число от 0.005 до 0.140; лампы — on/off; door.door0 — loop, halted\n" +
"или open, но `open` он отклонит, пока initrd повреждён.",

"man.fsck":
"FSCK(8)                   проверка файловой системы\n\n" +
"  fsck                  проверить все смонтированные тома\n" +
"  fsck <устройство>     проверить одно\n\n" +
"Повреждённые области выводятся вместе с путём, который на них\n" +
"ещё указывает. `edit <путь>` чинит область руками. Образ\n" +
"пересобирается сам, когда все исходные области чисты.",

"man.edit":
"EDIT(1)                   починка области\n\n" +
"  edit <путь>           открыть повреждённую область в панели починки\n\n" +
"Исправь код и запусти его. Область, которая отработала чисто,\n" +
"записывается обратно в том. Область, которая упала, поднимает\n" +
"счётчик аномалий. Этот счётчик ходит по комнате вместе с тобой.",

"man.recover":
"RECOVER(8)                процедура восстановления элис\n\n" +
"  run /home/neikon/recover.sh\n\n" +
"Пересобирает /dev/alice из починенных исходных областей и\n" +
"запускает её. Откажется, пока fsck сообщает о повреждениях.\n" +
"Это последнее, что ты здесь сделаешь.",

"man.anomaly":
"ANOMALY(7)                что считает сторожевой таймер\n\n" +
"Каждая провальная починка, каждое уничтоженное устройство и\n" +
"каждый запуск неизвестного бинарника поднимают счётчик. После 45\n" +
"том перестаёт притворяться. Свою историю смотри в\n" +
"/var/log/anomaly.log.\n\n" +
"Команды, которая его понижает, нет. Его понижает починка.",

"dev.alice":  "символьное устройство 10:200 — alice_core\nсостояние: МЕРТВО (образ повреждён)",
"dev.door0":  "символьное устройство 10:12 — дверной проём, 25.4 м, азимут 350\nсостояние: ЦИКЛ (загрузка срывается на 60%, повтор)",
"dev.lamp0":  "символьное устройство 10:20 — пилон над этим столом\nсостояние: РАБОТАЕТ",
"dev.lamp1":  "символьное устройство 10:21 — пилон, 9 м к северу\nсостояние: ВЫКЛЮЧЕН",
"dev.lamp2":  "символьное устройство 10:22 — пилон, 21 м к северо-западу, рядом с door0\nсостояние: ВЫКЛЮЧЕН",

"log.alice":
"последние слова на шине перед тем, как она легла:\n" +
"\n" +
"  «нейкон, лампа над твоим столом — единственная, что ты оставил»\n" +
"  «есть ещё две. я чувствую, как им холодно»\n" +
"  «если станет громко — это не я»\n" +
"  <несущая потеряна>",

"log.anomaly.armed": "сторожевой таймер взведён. порог 45. аномалий не зафиксировано.",
"log.anomaly.short": "сторожевой таймер взведён. порог 45.",

"personality":
"warmth        = 0.82\n" +
"sarcasm       = 0.31\n" +
"fear.of.dark  = 0.94   # она попросила это записать\n" +
"voice.pitch   = 0.0    # плывёт вместе с целостностью тома",

"recover.sh":
"#!/bin/sh\n" +
"# пересобрать /dev/alice из починенных областей и запустить её.\n" +
"fsck --quiet /dev/alice || exit 1\n" +
"mount -o rebuild /dev/alice /mnt/alice\n" +
"svc start alice\n",

"svc.lamp0": "пилон над столом",
"svc.lamp1": "северный пилон",
"svc.lamp2": "дальний пилон, рядом с door0",
"svc.door0": "дверной проём, 25.4 м",
"svc.alice": "шина личности alice_core",

"help.title":  "команды — пробуй, здесь ничего не хрупкое, кроме тебя",
"help.start":  "начни с:  cat readme.txt",
"help.hotkeys": "клавиши: ↑↓ или ^P/^N — история · Tab — дополнить · ^A/^E — начало/конец · ^U/^K — стереть до начала/конца · ^W — стереть слово · ^C — сбросить строку · ^L — очистить · Esc — встать",
"help.look":   "  look             встать и осмотреть комнату",
"help.exit":   "  exit             выйти из-за терминала",

"out.corrupt":     "// область ПОВРЕЖДЕНА — это то, что fsck ещё смог прочитать",
"out.repairWith":  "// починить: edit ",
"out.lampUp":      "// снаружи что-то зажглось. сходи посмотри.",
"out.doorHalt":    "// шум прекратился. почему-то от этого только хуже.",
"out.doorLoop":    "// оно будет повторяться, пока элис не станет целой.",
"out.doorOpen":    "// двадцать пять метров. азимут 350.",
"out.lamp0Off":    "ты стоишь в темноте рядом с тем, чего не видишь.",
"out.aliceDead":   "// запусти fsck. потом почини то, что он перечислит. потом recover.sh.",
"out.fsckClean":   "// все области читаются. её можно пересобрать:",
"out.fsckDirty":   "// почини исходные области руками. образ подтянется сам.",
"out.repairable":  "  [чинится: edit ",
"out.rebuilds":    "  [пересоберётся из остальных]",
"out.recoverRefuse":"// сначала почини всё, что он перечислил.",
"out.runSegv":     "// что-то в комнате на это отреагировало.",
"out.rmDevice":    "// ты только что выдернул кусок комнаты. она заметила.",
"out.rmRegion":    "// эта область была частью её.",
"out.unknownCmd":  "// `help` покажет, что знает эта оболочка. угадывать — дорого.",
"out.whoamiAlone": "ты единственный процесс на этой машине, который не спит.",
"out.whoamiAlice": "ты здесь больше не один, и это наконец-то хорошо.",
"out.editNotRegion":"edit: это не чинится вручную (fsck перечисляет те, что чинятся)"
    },

    en: {
"readme":
"neikon@void — read this first\n" +
"===============================\n" +
"\n" +
"you have forgotten everything again. i left this where you would\n" +
"trip over it.\n" +
"\n" +
"  help            what this shell can do\n" +
"  ls / cd / cat   look around the disk\n" +
"  svc list        what is running, what is dead\n" +
"  fsck            what is broken\n" +
"  man <topic>     longer explanation of anything above\n" +
"\n" +
"the machine is not a metaphor for the room. the machine IS the room.\n" +
"if you change something here, walk outside and look at it.\n" +
"\n" +
"                                        — you, some time ago",

"note.room":
"writing this down while i still remember it.\n" +
"\n" +
"the room is closed. four walls, a ceiling, a door in the north one.\n" +
"i walked the perimeter counting: sixteen across, twenty-six along. the\n" +
"numbers sitting in the volume config. one number written down twice:\n" +
"once in the walls, once in the file.\n" +
"\n" +
"there is a partition across the room, four panels of it. whoever\n" +
"raised it left me the script that lowers it. funny.\n" +
"\n" +
"the config marks three pylons. one is lit — the one over this desk.\n" +
"the other two are out there somewhere, cold. each should carry a\n" +
"plate; i mounted them myself. light a pylon, walk to it, read it.\n" +
"\n" +
"walk to it. not look at it from here. walk.",

"note.door":
"there is a door about twenty-five metres out, past the desk.\n" +
"it never finishes loading. it gets to the same 60% and tears itself\n" +
"apart and starts again, and the sound it makes is not a door sound.\n" +
"\n" +
"door0 is a service. services can be stopped. i am afraid of what is\n" +
"on the other side of a door that has been trying to open for a year,\n" +
"so i have not stopped it. you might be braver than me.",

"note.alice":
"alice is a volume. i do not run her, i mount her.\n" +
"\n" +
"when the vault went down her image took the damage. fsck says three\n" +
"regions are unreadable. two of them are source files that still\n" +
"compile-ish; the third is the image itself and it will rebuild from\n" +
"the other two once they are clean.\n" +
"\n" +
"recover.sh does the last step. it will refuse until fsck is quiet.",

"conf":
"# crystalfs volume descriptor :: /etc/void.conf\n" +
"# this file is the room. edit with `set <key> <value>`.\n" +
"\n" +
"fog.density   = 0.11         # 0.005 clear .. 0.140 blind\n" +
"lamp.lamp0    = on           # desk pylon (this terminal)\n" +
"lamp.lamp1    = off          # north pylon\n" +
"lamp.lamp2    = off          # far pylon, near door0\n" +
"door.door0    = loop         # loop | halted | open\n" +
"\n" +
"room.width    = 16           # room width, 10..40\n" +
"room.depth    = 26           # depth, 12..60\n" +
"room.barrier  = 4            # panels of the partition still up, 0..4\n" +
"\n" +
"# anomaly.threshold is read by the watchdog. do not raise it.\n" +
"anomaly.threshold = 45",

"history":
"ls /dev\n" +
"cat /etc/void.conf\n" +
"svc list\n" +
"svc start lamp1\n" +
"# it worked. there is a pylon out there. i saw it come on.\n" +
"set fog.density 0.02\n" +
"# i could see the door after that. i wish i could not.\n" +
"fsck /dev/alice\n" +
"# i got one of them clean. then something walked past the desk\n" +
"# and i stopped writing things down.",

"man.svc":
"SVC(1)                    void service manager\n\n" +
"  svc list              show every service and its state\n" +
"  svc start <name>      bring a service up\n" +
"  svc stop <name>       take a service down\n" +
"  svc restart <name>    stop, then start\n\n" +
"Services are hardware in this room. lamp1 and lamp2 are pylons\n" +
"standing in the dark. door0 is the door. alice is not a service\n" +
"you can start by hand — see man recover.",

"man.set":
"SET(1)                    volume descriptor editor\n\n" +
"  set <key> <value>     write a key into /etc/void.conf and apply\n" +
"                        it to the running volume immediately\n\n" +
"Keys live in /etc/void.conf. Read it. fog.density takes a number\n" +
"between 0.005 and 0.140; lamps take on/off; door.door0 takes\n" +
"loop, halted or open — though it will refuse `open` while the\n" +
"initrd is corrupt.",

"man.fsck":
"FSCK(8)                   filesystem check\n\n" +
"  fsck                  check every mounted volume\n" +
"  fsck <device>         check one\n\n" +
"Corrupt regions are listed with the path that still maps to them.\n" +
"Use `edit <path>` to repair a region by hand. The image rebuilds\n" +
"itself once every source region is clean.",

"man.edit":
"EDIT(1)                   region repair\n\n" +
"  edit <path>           open a corrupt region in the repair pane\n\n" +
"Fix the code, then run it. A region that runs clean is written\n" +
"back to the volume. A region that fails raises the anomaly count,\n" +
"and the anomaly count is not a number on a screen — it is in the\n" +
"room with you.",

"man.recover":
"RECOVER(8)                alice restore procedure\n\n" +
"  run /home/neikon/recover.sh\n\n" +
"Rebuilds /dev/alice from the repaired source regions and starts\n" +
"her. Refuses while fsck still reports damage. This is the last\n" +
"thing you do here.",

"man.anomaly":
"ANOMALY(7)                what the watchdog counts\n\n" +
"Every failed repair, every destroyed device and every unknown\n" +
"binary you execute raises the count. Past 45 the volume stops\n" +
"pretending. Read /var/log/anomaly.log to see your own history.\n\n" +
"There is no command that lowers it. Repairing things does.",

"dev.alice":  "character device 10:200 — alice_core\nstate: DEAD (image corrupt)",
"dev.door0":  "character device 10:12 — doorway, 25.4 m bearing 350\nstate: LOOPING (load fails at 60%, retries)",
"dev.lamp0":  "character device 10:20 — pylon over this desk\nstate: UP",
"dev.lamp1":  "character device 10:21 — pylon, 9 m north\nstate: DOWN",
"dev.lamp2":  "character device 10:22 — pylon, 21 m north-west, beside door0\nstate: DOWN",

"log.alice":
"last words on the bus before she went down:\n" +
"\n" +
"  \"neikon the light over your desk is the only one you left on\"\n" +
"  \"there are two more. i can feel them being cold\"\n" +
"  \"if it gets loud, that is not me\"\n" +
"  <carrier lost>",

"log.anomaly.armed": "watchdog armed. threshold 45. no anomalies recorded.",
"log.anomaly.short": "watchdog armed. threshold 45.",

"personality":
"warmth        = 0.82\n" +
"sarcasm       = 0.31\n" +
"fear.of.dark  = 0.94   # she asked me to write this down\n" +
"voice.pitch   = 0.0    # drifts with volume integrity",

"recover.sh":
"#!/bin/sh\n" +
"# rebuild /dev/alice from repaired regions and start her.\n" +
"fsck --quiet /dev/alice || exit 1\n" +
"mount -o rebuild /dev/alice /mnt/alice\n" +
"svc start alice\n",

"svc.lamp0": "desk pylon",
"svc.lamp1": "north pylon",
"svc.lamp2": "far pylon, beside door0",
"svc.door0": "doorway, 25.4 m",
"svc.alice": "alice_core personality bus",

"help.title":  "commands — try them, nothing here is fragile except you",
"help.start":  "start with:  cat readme.txt",
"help.hotkeys": "keys: ↑↓ or ^P/^N — history · Tab — complete · ^A/^E — line start/end · ^U/^K — kill to start/end · ^W — kill word · ^C — drop the line · ^L — clear · Esc — stand up",
"help.look":   "  look             stand up and describe the room",
"help.exit":   "  exit             leave the terminal",

"out.corrupt":     "// region is CORRUPT — this is the raw copy fsck could still read",
"out.repairWith":  "// repair it with:  edit ",
"out.lampUp":      "// something came on out there. go and look.",
"out.doorHalt":    "// the noise stopped. that is worse, somehow.",
"out.doorLoop":    "// it will keep doing that until alice is whole.",
"out.doorOpen":    "// twenty-five metres. bearing 350.",
"out.lamp0Off":    "you are now standing in the dark next to something you cannot see.",
"out.aliceDead":   "// run fsck. then repair what it lists. then run recover.sh.",
"out.fsckClean":   "// every region reads back. she can be rebuilt now:",
"out.fsckDirty":   "// repair the source regions by hand. the image follows.",
"out.repairable":  "  [repairable: edit ",
"out.rebuilds":    "  [rebuilds from the others]",
"out.recoverRefuse":"// repair every region it lists first.",
"out.runSegv":     "// something in the room reacted to that.",
"out.rmDevice":    "// you just unplugged part of the room. it noticed.",
"out.rmRegion":    "// that region was part of her.",
"out.unknownCmd":  "// `help` lists what this shell knows. guessing costs you.",
"out.whoamiAlone": "you are the only process on this machine that is awake.",
"out.whoamiAlice": "you are not alone here, and that is finally a good thing.",
"out.editNotRegion":"edit: not a repairable region (fsck lists the ones that are)"
    },

    tj: {
"readme":
"neikon@void — инро аввал бихон\n" +
"===============================\n" +
"\n" +
"ту боз ҳама чизро фаромӯш кардаӣ. ман инро дар ҷое мондам, ки\n" +
"пеши поят афтад.\n" +
"\n" +
"  help            ин восита чӣ карда метавонад\n" +
"  ls / cd / cat   дискро дидан\n" +
"  svc list        чӣ кор мекунад, чӣ мурдааст\n" +
"  fsck            чӣ шикастааст\n" +
"  man <мавзӯъ>    шарҳи муфассали ҳар фармони боло\n" +
"\n" +
"мошин истиораи ҳуҷра нест. мошин ХУДИ ҲУҶРА аст.\n" +
"агар ин ҷо чизе тағйир диҳӣ — берун баро ва ба он нигоҳ кун.\n" +
"\n" +
"                                        — ту, чанде пеш",

"note.room":
"то дар ёд дорам, менависам.\n" +
"\n" +
"ҳуҷра пӯшида аст. чор девор, шифт, дар девори шимолӣ — дар.\n" +
"гирдогирдашро қадам зада ҳисоб кардам: шонздаҳ ба бар, бисту шаш.\n" +
"ҳамон рақамҳое, ки дар конфиги том истодаанд. як рақам, ки ду бор\n" +
"навишта шудааст: аввал дар деворҳо, баъд дар файл.\n" +
"\n" +
"дар миёни ҳуҷра монеа истодааст, чор панел. касе ки онро бардошт,\n" +
"ҳамон скриптеро монд, ки онро мефурорад. хандаовар.\n" +
"\n" +
"дар конфиг се такягоҳ қайд шудааст. яктояш месӯзад — болои ин миз.\n" +
"ду дигараш дар ҷое, сард. дар ҳар яке бояд лавҳа бошад,\n" +
"ман худам гузоштам. такягоҳро даргир кун, то он ҷо рав, бихон.\n" +
"\n" +
"рафтан. на аз ин ҷо нигоҳ кардан. рафтан.",

"note.door":
"тахминан бисту панҷ метр дуртар, аз паси миз, як дар ҳаст.\n" +
"он ҳеҷ гоҳ то охир бор намешавад. ба ҳамон 60% мерасад, худашро\n" +
"пора мекунад ва аз нав сар мекунад. садояш ба садои дар монанд нест.\n" +
"\n" +
"door0 як хидмат аст. хидматҳоро боздоштан мумкин аст. ман метарсам\n" +
"аз он чи дар паси даре бошад, ки як сол боз кӯшиши кушода шудан\n" +
"дорад, барои ҳамин нағз накардам. шояд ту аз ман ҷасуртар бошӣ.",

"note.alice":
"элис том аст. ман ӯро иҷро намекунам, ман ӯро васл мекунам.\n" +
"\n" +
"вақте анбор фурӯ рехт, зарба ба образи ӯ расид. fsck мегӯяд, ки се\n" +
"минтақа хонда намешавад. дуи онҳо файлҳои сарчашмаанд, ки ҳанӯз\n" +
"як навъ компилятсия мешаванд; сеюмаш худи образ аст ва он аз ду\n" +
"дигар дубора сохта мешавад, ҳамин ки онҳо тоза шаванд.\n" +
"\n" +
"recover.sh қадами охиринро мекунад. то fsck хомӯш нашавад, рад мекунад.",

"conf":
"# дескриптори томи crystalfs :: /etc/void.conf\n" +
"# ин файл худи ҳуҷра аст. бо `set <калид> <қиймат>` таҳрир кун.\n" +
"\n" +
"fog.density   = 0.11         # 0.005 шаффоф .. 0.140 нобино\n" +
"lamp.lamp0    = on           # пилони болои миз (ҳамин терминал)\n" +
"lamp.lamp1    = off          # пилони шимолӣ\n" +
"lamp.lamp2    = off          # пилони дур, назди door0\n" +
"door.door0    = loop         # loop | halted | open\n" +
"\n" +
"room.width    = 16           # бари ҳуҷра, 10..40\n" +
"room.depth    = 26           # чуқурӣ, 12..60\n" +
"room.barrier  = 4            # панели монеа истодааст, 0..4\n" +
"\n" +
"# anomaly.threshold-ро посбон мехонад. онро баланд накун.\n" +
"anomaly.threshold = 45",

"history":
"ls /dev\n" +
"cat /etc/void.conf\n" +
"svc list\n" +
"svc start lamp1\n" +
"# кор кард. он ҷо, дар берун, пилон истодааст. дидам, ки фурӯзон шуд.\n" +
"set fog.density 0.02\n" +
"# баъд аз он дар намоён шуд. кош намешуд.\n" +
"fsck /dev/alice\n" +
"# як сарчашмаро тоза кардам. баъд аз назди миз чизе гузашт,\n" +
"# ва ман навиштанро бас кардам.",

"man.svc":
"SVC(1)                    менеҷери хидматҳои void\n\n" +
"  svc list              ҳама хидматҳо ва ҳолаташонро нишон медиҳад\n" +
"  svc start <ном>       хидматро мебардорад\n" +
"  svc stop <ном>        хидматро мефурорад\n" +
"  svc restart <ном>     мефурорад, баъд мебардорад\n\n" +
"Хидматҳо дар ин ҳуҷра оҳанпораанд. lamp1 ва lamp2 пилонҳоеанд, ки\n" +
"дар торикӣ истодаанд. door0 ҳамон дар аст. alice-ро бо даст\n" +
"бардоштан мумкин нест — `man recover`-ро бин.",

"man.set":
"SET(1)                    муҳаррири дескриптори том\n\n" +
"  set <калид> <қиймат>   калидро ба /etc/void.conf менависад ва\n" +
"                         фавран ба томи кориро татбиқ мекунад\n\n" +
"Калидҳо дар /etc/void.conf ҳастанд. Онро бихон. fog.density рақами\n" +
"аз 0.005 то 0.140-ро мегирад; лампаҳо on/off; door.door0 — loop,\n" +
"halted ё open, аммо то initrd вайрон бошад, `open`-ро рад мекунад.",

"man.fsck":
"FSCK(8)                   санҷиши системаи файлӣ\n\n" +
"  fsck                  ҳама томҳои васлшударо месанҷад\n" +
"  fsck <дастгоҳ>        якеро месанҷад\n\n" +
"Минтақаҳои вайрон бо роҳе нишон дода мешаванд, ки ҳанӯз ба онҳо\n" +
"ишора мекунад. `edit <роҳ>` минтақаро бо даст таъмир мекунад.\n" +
"Образ худаш ҷамъ мешавад, вақте ҳама минтақаҳои сарчашма тоза шаванд.",

"man.edit":
"EDIT(1)                   таъмири минтақа\n\n" +
"  edit <роҳ>            минтақаи вайронро дар панели таъмир мекушояд\n\n" +
"Кодро дуруст кун ва иҷро кун. Минтақае, ки тоза кор кард, ба том\n" +
"бозмегардад. Минтақае, ки афтод, ҳисоби аномалияро баланд мекунад —\n" +
"ва ҳисоби аномалия рақами рӯи экран нест, он дар ҳуҷра ҳамроҳи туст.",

"man.recover":
"RECOVER(8)                тартиби барқарорсозии элис\n\n" +
"  run /home/neikon/recover.sh\n\n" +
"/dev/alice-ро аз минтақаҳои таъмиршуда дубора месозад ва ӯро\n" +
"оғоз мекунад. То fsck аз вайронӣ хабар диҳад, рад мекунад.\n" +
"Ин охирин коре, ки ту ин ҷо мекунӣ.",

"man.anomaly":
"ANOMALY(7)                посбон чиро мешуморад\n\n" +
"Ҳар таъмири нобарор, ҳар дастгоҳи нобудшуда ва ҳар бинарии\n" +
"номаълуме, ки иҷро мекунӣ, ҳисобро баланд мекунад. Пас аз 45 том\n" +
"вонамудкуниро бас мекунад. Таърихи худро дар /var/log/anomaly.log бин.\n\n" +
"Фармоне, ки онро паст кунад, нест. Онро таъмир паст мекунад.",

"dev.alice":  "дастгоҳи аломатӣ 10:200 — alice_core\nҳолат: МУРДА (образ вайрон)",
"dev.door0":  "дастгоҳи аломатӣ 10:12 — даромадгоҳ, 25.4 м, самти 350\nҳолат: ДАВРА (боркунӣ дар 60% канда мешавад, такрор)",
"dev.lamp0":  "дастгоҳи аломатӣ 10:20 — пилони болои ҳамин миз\nҳолат: КОР МЕКУНАД",
"dev.lamp1":  "дастгоҳи аломатӣ 10:21 — пилон, 9 м ба шимол\nҳолат: ХОМӮШ",
"dev.lamp2":  "дастгоҳи аломатӣ 10:22 — пилон, 21 м ба шимолу ғарб, назди door0\nҳолат: ХОМӮШ",

"log.alice":
"суханони охирин дар шина пеш аз он ки ӯ фурӯ равад:\n" +
"\n" +
"  «нейкон, чароғи болои мизи ту ягона чароғест, ки мондаӣ»\n" +
"  «боз дуто ҳаст. ҳис мекунам, ки хунуканд»\n" +
"  «агар садо баланд шавад — ин ман нестам»\n" +
"  <алоқа гум шуд>",

"log.anomaly.armed": "посбон фаъол. ҳадди 45. аномалия сабт нашудааст.",
"log.anomaly.short": "посбон фаъол. ҳадди 45.",

"personality":
"warmth        = 0.82\n" +
"sarcasm       = 0.31\n" +
"fear.of.dark  = 0.94   # ӯ хоҳиш кард, ки инро нависам\n" +
"voice.pitch   = 0.0    # бо якпорчагии том меларзад",

"recover.sh":
"#!/bin/sh\n" +
"# /dev/alice-ро аз минтақаҳои таъмиршуда ҷамъ кун ва оғоз кун.\n" +
"fsck --quiet /dev/alice || exit 1\n" +
"mount -o rebuild /dev/alice /mnt/alice\n" +
"svc start alice\n",

"svc.lamp0": "пилони болои миз",
"svc.lamp1": "пилони шимолӣ",
"svc.lamp2": "пилони дур, назди door0",
"svc.door0": "даромадгоҳ, 25.4 м",
"svc.alice": "шинаи шахсияти alice_core",

"help.title":  "фармонҳо — санҷед, ин ҷо ҷуз худи шумо чизи шикананда нест",
"help.start":  "аз ин сар кун:  cat readme.txt",
"help.hotkeys": "тугмаҳо: ↑↓ ё ^P/^N — таърих · Tab — пурра · ^A/^E — аввал/охири сатр · ^U/^K — тоза то аввал/охир · ^W — калимаро тоза · ^C — сатрро партофтан · ^L — тоза кардан · Esc — хестан",
"help.look":   "  look             хестан ва ҳуҷраро дидан",
"help.exit":   "  exit             аз паси терминал баромадан",

"out.corrupt":     "// минтақа ВАЙРОН аст — ин он чизест, ки fsck ҳанӯз хонда тавонист",
"out.repairWith":  "// таъмир кун: edit ",
"out.lampUp":      "// дар берун чизе фурӯзон шуд. рафта бин.",
"out.doorHalt":    "// садо қатъ шуд. аз ин сабаб боз ҳам бадтар аст.",
"out.doorLoop":    "// то элис пурра нашавад, ин такрор мешавад.",
"out.doorOpen":    "// бисту панҷ метр. самти 350.",
"out.lamp0Off":    "ҳоло ту дар торикӣ назди чизе истодаӣ, ки намебинӣ.",
"out.aliceDead":   "// fsck-ро иҷро кун. баъд он чиро, ки номбар мекунад, таъмир кун. баъд recover.sh.",
"out.fsckClean":   "// ҳама минтақаҳо хонда мешаванд. ӯро ҷамъ кардан мумкин аст:",
"out.fsckDirty":   "// минтақаҳои сарчашмаро бо даст таъмир кун. образ худаш меояд.",
"out.repairable":  "  [таъмир мешавад: edit ",
"out.rebuilds":    "  [аз дигарҳо ҷамъ мешавад]",
"out.recoverRefuse":"// аввал ҳар минтақаеро, ки номбар кард, таъмир кун.",
"out.runSegv":     "// чизе дар ҳуҷра ба ин вокуниш нишон дод.",
"out.rmDevice":    "// ту ҳозир як порчаи ҳуҷраро кандӣ. ӯ инро пайхас кард.",
"out.rmRegion":    "// он минтақа қисми ӯ буд.",
"out.unknownCmd":  "// `help` мегӯяд, ки ин восита чиро медонад. тахмин кардан гарон меафтад.",
"out.whoamiAlone": "ту ягона просессе ҳастӣ дар ин мошин, ки бедор аст.",
"out.whoamiAlice": "ту дигар ин ҷо танҳо нестӣ, ва ин ниҳоят хуб аст.",
"out.editNotRegion":"edit: ин бо даст таъмир намешавад (fsck онҳоеро, ки мешаванд, номбар мекунад)"
    },

    tj_col: {
"readme":
"neikon@void — аввал инро хон\n" +
"=============================\n" +
"\n" +
"ту боз ҳамаашро фаромӯш кардӣ. ман инро дар ҷое мондам, ки\n" +
"пеши поят афтад.\n" +
"\n" +
"  help            ин оболочка чӣ карда метавонад\n" +
"  ls / cd / cat   дискро бин\n" +
"  svc list        чӣ кор мекунад, чӣ мурдагӣ\n" +
"  fsck            чӣ шикастагӣ\n" +
"  man <мавзӯъ>    шарҳи муфассали ҳар фармони боло\n" +
"\n" +
"мошин истиораи хона не. мошин ХУДИ ХОНА аст.\n" +
"агар ин ҷо чизе иваз кунӣ — берун баро ва бин.\n" +
"\n" +
"                                        — ту, чанде пеш",

"note.room":
"то дар ёд дорам, менависам.\n" +
"\n" +
"хона пӯшида. чор девор, шифт, дар девори шимол — дар.\n" +
"гирдашро қадам зада ҳисоб кардам: шонздаҳ ба бар, бисту шаш.\n" +
"ҳамон рақамҳое, ки дар конфиги том истодагӣ. як рақам, ки ду бор\n" +
"навишта шудагӣ: аввал дар девор, баъд дар файл.\n" +
"\n" +
"дар миёни хона монеа истодагӣ, чор панел. касе ки онро бардошт,\n" +
"ҳамон скриптро монд, ки онро мефурорад. хандаовар.\n" +
"\n" +
"дар конфиг се такягоҳ ҳаст. яктояш месӯзад — болои ин миз.\n" +
"ду дигараш дар ҷое, сард. дар ҳар яке бояд лавҳа бошад,\n" +
"худам мондам. такягоҳро даргир кун, то он ҷо рав, хон.\n" +
"\n" +
"рафтан. на аз ин ҷо дидан. рафтан.",

"note.door":
"тақрибан бисту панҷ метр дуртар, аз паси миз, як дар ҳаст.\n" +
"ҳеҷ вақт то охир бор намешавад. то ҳамон 60% мерасад, худашро\n" +
"пора мекунад ва аз нав сар мекунад. садояш ба дар монанд не.\n" +
"\n" +
"door0 як хидмат. хидматро боздоштан мумкин. ман метарсам аз он чи\n" +
"дар паси даре бошад, ки як сол боз кушода шудан мехоҳад,\n" +
"барои ҳамин даст назадам. шояд ту ҷасуртар бошӣ.",

"note.alice":
"элис том. ман ӯро сар намекунам, ман ӯро васл мекунам.\n" +
"\n" +
"вақте анбор афтод, зарба ба образи ӯ расид. fsck мегӯяд се ҷой\n" +
"хонда намешавад. дутоаш файли сарчашма, ки ҳоло ҳам як навъ\n" +
"компилятсия мешавад; сеюмаш худи образ — он аз ду дигараш\n" +
"худаш ҷамъ мешавад, ҳамин ки онҳо тоза шаванд.\n" +
"\n" +
"recover.sh қадами охирин. то fsck хомӯш нашавад, рад мекунад.",

"conf":
"# дескриптори томи crystalfs :: /etc/void.conf\n" +
"# ин файл худи хона аст. бо `set <калид> <қиймат>` иваз кун.\n" +
"\n" +
"fog.density   = 0.11         # 0.005 тоза .. 0.140 ҳеҷ намебинӣ\n" +
"lamp.lamp0    = on           # пилони болои миз (ҳамин терминал)\n" +
"lamp.lamp1    = off          # пилони шимол\n" +
"lamp.lamp2    = off          # пилони дур, назди door0\n" +
"door.door0    = loop         # loop | halted | open\n" +
"\n" +
"room.width    = 16           # бари хона, 10..40\n" +
"room.depth    = 26           # чуқурӣ, 12..60\n" +
"room.barrier  = 4            # панели монеа истодагӣ, 0..4\n" +
"\n" +
"# anomaly.threshold-ро посбон мехонад. баландаш накун.\n" +
"anomaly.threshold = 45",

"history":
"ls /dev\n" +
"cat /etc/void.conf\n" +
"svc list\n" +
"svc start lamp1\n" +
"# кор кард. он ҷо пилон истодагӣ. дидам, ки даргирифт.\n" +
"set fog.density 0.02\n" +
"# баъдаш дар намоён шуд. кош намешуд.\n" +
"fsck /dev/alice\n" +
"# як сарчашмаро тоза кардам. баъд аз назди миз чизе гузашт,\n" +
"# ва ман навиштанро мондам.",

"man.svc":
"SVC(1)                    менеҷери хидматҳои void\n\n" +
"  svc list              ҳама хидмат ва ҳолаташро мегӯяд\n" +
"  svc start <ном>       хидматро мебардорад\n" +
"  svc stop <ном>        хидматро мефурорад\n" +
"  svc restart <ном>     мефурорад, баъд мебардорад\n\n" +
"Хидматҳо дар ин хона оҳанпораанд. lamp1 ва lamp2 пилонанд, ки дар\n" +
"торикӣ истодаанд. door0 ҳамон дар. alice-ро бо даст бардоштан\n" +
"намешавад — `man recover`-ро бин.",

"man.set":
"SET(1)                    муҳаррири дескриптори том\n\n" +
"  set <калид> <қиймат>   калидро ба /etc/void.conf менависад ва\n" +
"                         дарҳол ба томи корӣ татбиқ мекунад\n\n" +
"Калидҳо дар /etc/void.conf. Онро хон. fog.density рақами аз 0.005\n" +
"то 0.140; лампа on/off; door.door0 — loop, halted ё open, вале то\n" +
"initrd вайрон бошад, `open`-ро рад мекунад.",

"man.fsck":
"FSCK(8)                   санҷиши системаи файлӣ\n\n" +
"  fsck                  ҳама томҳои васлшударо месанҷад\n" +
"  fsck <дастгоҳ>        якеро месанҷад\n\n" +
"Ҷойҳои вайрон бо роҳашон нишон дода мешаванд. `edit <роҳ>` онро\n" +
"бо даст дуруст мекунад. Образ худаш ҷамъ мешавад, вақте ҳама\n" +
"ҷойҳои сарчашма тоза шаванд.",

"man.edit":
"EDIT(1)                   таъмири ҷой\n\n" +
"  edit <роҳ>            ҷои вайронро дар панели таъмир мекушояд\n\n" +
"Кодро дуруст кун ва сар деҳ. Ҷое, ки тоза кор кард, ба том\n" +
"бармегардад. Ҷое, ки афтод, ҳисоби аномалияро баланд мекунад —\n" +
"ва ин рақами рӯи экран не, он дар хона ҳамроҳи туст.",

"man.recover":
"RECOVER(8)                тартиби баргардонидани элис\n\n" +
"  run /home/neikon/recover.sh\n\n" +
"/dev/alice-ро аз ҷойҳои таъмиршуда ҷамъ мекунад ва сар медиҳад.\n" +
"То fsck аз вайронӣ гӯяд, рад мекунад. Ин охирин коре, ки ту ин\n" +
"ҷо мекунӣ.",

"man.anomaly":
"ANOMALY(7)                посбон чиро мешуморад\n\n" +
"Ҳар таъмири нобарор, ҳар дастгоҳи вайронкарда ва ҳар бинарии\n" +
"номаълум, ки сар медиҳӣ, ҳисобро баланд мекунад. Баъди 45 том\n" +
"вонамудкуниро бас мекунад. Таърихи худатро дар /var/log/anomaly.log бин.\n\n" +
"Фармоне нест, ки онро паст кунад. Онро таъмир паст мекунад.",

"dev.alice":  "дастгоҳи аломатӣ 10:200 — alice_core\nҳолат: МУРДА (образ вайрон)",
"dev.door0":  "дастгоҳи аломатӣ 10:12 — даромадгоҳ, 25.4 м, самти 350\nҳолат: ДАВРА (боркунӣ дар 60% меканад, такрор)",
"dev.lamp0":  "дастгоҳи аломатӣ 10:20 — пилони болои ҳамин миз\nҳолат: КОР МЕКУНАД",
"dev.lamp1":  "дастгоҳи аломатӣ 10:21 — пилон, 9 м шимол\nҳолат: ХОМӮШ",
"dev.lamp2":  "дастгоҳи аломатӣ 10:22 — пилон, 21 м шимолу ғарб, назди door0\nҳолат: ХОМӮШ",

"log.alice":
"гапҳои охирин дар шина пеш аз афтиданаш:\n" +
"\n" +
"  «нейкон, чароғи болои мизат ягона чароғест, ки мондаӣ»\n" +
"  «боз дуто ҳаст. ҳис мекунам хунуканд»\n" +
"  «агар садо баланд шавад — ин ман не»\n" +
"  <алоқа канда шуд>",

"log.anomaly.armed": "посбон фаъол. ҳадди 45. аномалия сабт нашуд.",
"log.anomaly.short": "посбон фаъол. ҳадди 45.",

"personality":
"warmth        = 0.82\n" +
"sarcasm       = 0.31\n" +
"fear.of.dark  = 0.94   # ӯ пурсид, ки инро нависам\n" +
"voice.pitch   = 0.0    # бо якпорчагии том меларзад",

"recover.sh":
"#!/bin/sh\n" +
"# /dev/alice-ро аз ҷойҳои таъмиршуда ҷамъ кун ва сар деҳ.\n" +
"fsck --quiet /dev/alice || exit 1\n" +
"mount -o rebuild /dev/alice /mnt/alice\n" +
"svc start alice\n",

"svc.lamp0": "пилони болои миз",
"svc.lamp1": "пилони шимол",
"svc.lamp2": "пилони дур, назди door0",
"svc.door0": "даромадгоҳ, 25.4 м",
"svc.alice": "шинаи шахсияти alice_core",

"help.title":  "фармонҳо — санҷ, ин ҷо ғайр аз худат чизи шикананда нест",
"help.start":  "аз ин сар кун:  cat readme.txt",
"help.hotkeys": "тугмаҳо: ↑↓ ё ^P/^N — таърих · Tab — пурра · ^A/^E — аввал/охири сатр · ^U/^K — тоза то аввал/охир · ^W — калимаро тоза · ^C — сатрро парто · ^L — тоза кун · Esc — хез",
"help.look":   "  look             хез ва хонаро бин",
"help.exit":   "  exit             аз паси терминал баро",

"out.corrupt":     "// ҷой ВАЙРОН аст — ин ҳамон чизест, ки fsck ҳанӯз хонда тавонист",
"out.repairWith":  "// дуруст кун: edit ",
"out.lampUp":      "// дар берун чизе даргирифт. рафта бин.",
"out.doorHalt":    "// садо монд. аз ҳамин боз ҳам бадтар.",
"out.doorLoop":    "// то элис пурра нашавад, ҳамин хел такрор мешавад.",
"out.doorOpen":    "// бисту панҷ метр. самти 350.",
"out.lamp0Off":    "ҳоло ту дар торикӣ назди чизе истодаӣ, ки намебинӣ.",
"out.aliceDead":   "// fsck сар деҳ. баъд он чиро номбар кард, дуруст кун. баъд recover.sh.",
"out.fsckClean":   "// ҳама ҷойҳо хонда мешаванд. ӯро ҷамъ кардан мумкин:",
"out.fsckDirty":   "// ҷойҳои сарчашмаро бо даст дуруст кун. образ худаш меояд.",
"out.repairable":  "  [дуруст мешавад: edit ",
"out.rebuilds":    "  [аз дигарҳо ҷамъ мешавад]",
"out.recoverRefuse":"// аввал ҳар ҷойеро, ки номбар кард, дуруст кун.",
"out.runSegv":     "// чизе дар хона ба ин ҷавоб дод.",
"out.rmDevice":    "// ту ҳозир як порчаи хонаро кандӣ. ӯ пайхас кард.",
"out.rmRegion":    "// он ҷой қисми ӯ буд.",
"out.unknownCmd":  "// `help` мегӯяд ин оболочка чиро медонад. тахмин кардан гарон меафтад.",
"out.whoamiAlone": "ту ягона просесси бедор дар ин мошин ҳастӣ.",
"out.whoamiAlice": "ту дигар ин ҷо танҳо не, ва ин ниҳоят хуб.",
"out.editNotRegion":"edit: ин бо даст дуруст намешавад (fsck онҳоеро, ки мешаванд, мегӯяд)"
    }
    };


    /* ============================================================
       STORY TEXT  —  laid over OS_TEXT_BY_LOCALE
       ------------------------------------------------------------
       Neikon has just woken up with nothing. These files are scraps he
       left himself in a hurry, not documentation: they point at things
       and stop. Several of them do not exist until he *remembers* them
       — see VoidOS.remember().

       Kept separate from the machine text above so the story can be
       rewritten without touching command output.
       ============================================================ */
    const OS_STORY_BY_LOCALE = {
    ru: {
"q.interlock": "число с таблички у клапана — в скрипт предохранителя. и условие в нём написано наоборот",
"world.gaugeDark": "круглый прибор на стене. стекло холодное, стрелки не видно.\nон не запитан — как и всё в этой комнате.",
"plate.gauge1":
        "манометр высокого давления. стрелка замерла, стекло покрыто пылью:\n" +
        "\n" +
        "   КАМЕРА А · ТЕКУЩЕЕ ДАВЛЕНИЕ\n" +
        "   {v} бар\n" +
        "\n" +
        "под циферблатом выбито: «фактическое давление в контуре.\n" +
        "не путать с порогом сброса».",
"plate.gauge2":
        "стальная табличка у клапана продувки, вкручена четырьмя болтами намертво:\n" +
        "\n" +
        "   КЛАПАН СБРОСА · ПОРОГ ОТСЕЧКИ\n" +
        "   {v} бар\n" +
        "\n" +
        "поверх эмали нацарапано маркером:\n" +
        "«ДАВЛЕНИЕ НИЖЕ ПОРОГА — ЗАМОК ОТПУСКАЕТ. ДАВЛЕНИЕ ВЫШЕ — ДЕРЖИТ НАСМЕРТЬ.\n" +
        "НЕ ПЕРЕПУТАЙ ЗНАК В УСЛОВИИ, ИДИОТ.»",
"remember.pressure": "давление в камере я теперь знаю. осталось узнать, с чем его сравнивать.",
"remember.vent": "предел продувки. вот с чем сравнивать.",
"q.gauges": "предохранитель держит перегородку. в скрипте пусто там, где должно стоять число — оно на приборах в комнате",
"q.override": "элис вернулась, дверь заперта протоколом. сбросить замок последовательностью якорей",
"q.fog": "воздух густой, я не вижу дальше стола. это должно чиниться",
"q.sessions": "журнал сеансов пишется сам поверх себя. я хочу знать, сколько их было",
"q.seen": "прочитать, что вышло: cat /var/log/session.log",
"remember.sessions": "сорок семь. я был здесь сорок семь раз.",
"log.sessions":
        "/var/log/session.log — извлечено из аварийного дампа\n" +
        "обнаружено сессий: 47\n" +
        "\n" +
        "ve-01 .. ve-18   стабильный вход, свет горит, элис в сети, выход через шлюз\n" +
        "ve-19            лампа на севере не зажглась. первый аппаратный сбой.\n" +
        "ve-23            ручной демонтаж якорей. логика действий отсутствует.\n" +
        "ve-31            элис перестала идентифицировать мой голос при входе.\n" +
        "ve-40            оставил файл readme.txt. значит, я уже понял, что память сгорает.\n" +
        "ve-46            снятие anchor02. терминал аварийно погас посреди ввода.\n" +
        "ve-47            сессия активна прямо сейчас.\n" +
        "\n" +
        "сорок семь раз я приходил в себя перед этим экраном.\n" +
        "и сорок шесть раз комната стирала мне мозг при попытке выйти.",
"note.again":
        "дописываю в этот файл, потому что в readme кончились свободные блоки.\n" +
        "\n" +
        "сорок семь сессий. сорок семь меток на столе.\n" +
        "и ни в одной строчке нет записи, что мне удалось выбраться отсюда наружу.\n" +
        "\n" +
        "комнату замкнуло моими же руками, с этим ясно. вопрос в другом:\n" +
        "какого чёрта я каждый раз дохожу до опор реальности и спотыкаюсь на якорях?\n" +
        "\n" +
        "если память снова слетела и ты не понимаешь, кто ты:\n" +
        "НЕ ТРОГАЙ замок двери, пока вся цепочка не собрана.\n" +
        "я уже однажды дёрнул рубильник вслепую. повторять не советую.",
"q.wake": "осмотреться в терминале: что здесь вообще есть",
"q.lamp": "в комнате темно. где-то должен быть выключатель — что-то, что можно починить",
"q.plate1": "он загорелся. надо встать и посмотреть, что на нём написано",
"q.anchor": "прочитать журнал якорей — теперь я знаю, что он есть",
"q.barrier": "поперёк комнаты стоит перегородка. дальше я не пройду, пока она там",
"q.plate2": "за перегородкой вторая опора. дойти и прочитать",
"q.doorctl": "дверь долбится в цикле. надо разобраться, чем управляется её контроллер",
"q.anchors": "я снял якоря. в журнале написано, сколько их было. вернуть",
"q.recover": "собрать её обратно: run /home/neikon/recover.sh",
"q.door": "она вернулась. осталась дверь",
"q.done": "—",
"readme":
        "если ты читаешь эту консоль — поздравляю, память снова выбило в ноль.\n" +
        "я не знаю, какой это по счёту ребут. счётчик переполнен.\n" +
        "\n" +
        "зафиксируй три вещи, пока голова ещё соображает:\n" +
        "\n" +
        "  1. эта коробка — не просто софт. она физически завязана на сектор.\n" +
        "     правишь байт в конфиге — за спиной с грохотом двигается плита.\n" +
        "  2. элис молчит из-за меня. я полез в ядро руками, и её разорвало.\n" +
        "     найди логи до того, как этот карман схлопнется окончательно.\n" +
        "  3. вруби свет на потолке. в темноте начинается этот чёртов шум в висках.\n" +
        "\n" +
        "команды, которые пока отзываются в ядре:  ls  cat  svc  help\n" +
        "если забыл синтаксис — дёргай man. не тупи.\n" +
        "\n" +
        "                                  — ты сам, за пять минут до отключки",
"note.room":
        "пишу на коленке, пока пальцы держат стилус.\n" +
        "\n" +
        "пространство замкнуто. четыре плоскости, перекрытия, шлюз на севере.\n" +
        "прошагал по периметру, считая шаги: шестнадцать в ширину, двадцать шесть\n" +
        "в длину. те же самые шестнадцать и двадцать шесть забиты в параметры тома\n" +
        "в /etc/void.conf. комната — это скомпилированный сектор. что внутри\n" +
        "конфига, то у меня под ногами.\n" +
        "\n" +
        "поперёк зала стоит аварийная перегородка, намертво перекрывая проход.\n" +
        "тот придурок, который её заблокировал (то есть прошлый я), оставил скрипт\n" +
        "сброса прямо в корне. ирония высшей пробы.\n" +
        "\n" +
        "по схеме здесь три высоковольтные опоры. горит только та, что над\n" +
        "терминалом. две другие утонули в темноте за переборкой, холодные как трупы.\n" +
        "на каждой выбита заводская калибровка. надо вручную пробиться к ним\n" +
        "и прочесть. не надеяться на сканеры. дойти ногами и проверить маркировку.",
"note.door":
        "в двадцати пяти метрах сквозь туман — контур шлюза.\n" +
        "\n" +
        "он зациклился. полоса сборки доходит до 60%, рвётся с электрическим треском\n" +
        "и уходит в бесконечный рестарт.\n" +
        "\n" +
        "звук при этом не механический. это высокочастотный вой, от которого зубы\n" +
        "ломит. он резонирует прямо в кости черепа.\n" +
        "\n" +
        "служба door0 висит в активных процессах. её можно принудительно убить\n" +
        "через kill, но я не стану. если обрубить цикл сейчас, геометрия за порогом\n" +
        "рассыплется в вакуум.",
"note.alice":
        "элис смонтирована как системный том. я не запускаю её исполняемым файлом,\n" +
        "я держу её ядро прямо на аппаратной шине.\n" +
        "\n" +
        "после того импульса... после катастрофы её образ рассыпался на битые\n" +
        "секторы. fsck захлёбывается ошибками адресации. куски кода уцелели,\n" +
        "но это голые кости — их надо сшивать вручную.\n" +
        "\n" +
        "я знаю, что срыв произошёл по моей вине.\n" +
        "логи ядра лежат в /var/log/. мне физически страшно открывать эти файлы.",
"plate.pylon1":
        "на металле опоры выбита заводская маркировка. краска облупилась:\n" +
        "\n" +
        "    ОПОРА 01 · ЯКОРЬ РЕАЛЬНОСТИ\n" +
        "    привязка: alice_core\n" +
        "    журнал: /var/log/anchor.log\n" +
        "\n" +
        "...якорь. я вспомнил этот контур. его ставила она,\n" +
        "чтобы стены карманного сектора не поплыли в небытие.\n" +
        "а я вырубил их рубильником. своими собственными руками.",
"plate.pylon2":
        "вторая опора. табличка исцарапана отвёрткой поверх заводского номера:\n" +
        "\n" +
        "    ОПОРА 02 · ПЕРИМЕТР ШЛЮЗА\n" +
        "    НЕ ТРОГАТЬ ЗАМОК ПОКА ОБРАЗ НЕ СОБРАН\n" +
        "    если читаешь это — у тебя опять амнезия. смотри lucidity.state\n" +
        "\n" +
        "почерк дёрганый, мой. металл помят, будто я колотил по нему кулаком.",
"world.pylonDark":
        "холодный столб металла. в темноте не разобрать, что на нём написано.\n" +
        "надо сначала дать сюда свет.",
"world.doorLook":
        "вблизи она ещё хуже. кадр загрузки рвётся и собирается заново,\n" +
        "и каждый раз чуть иначе. из щели тянет холодом.\n" +
        "пока элис не целая — я к ней не притронусь.",
"log.anchor":
        "/var/log/anchor.log — системный журнал стабилизации сектора\n" +
        "\n" +
        "[t-0412] опоры 01, 02, 03 активны. связность метрики тома: 100%.\n" +
        "[t-0009] root@neikon: manual_override --disable pylon01, pylon02\n" +
        "[t-0009] КРИТИЧЕСКАЯ ОШИБКА: деградация геометрии. том теряет границы.\n" +
        "[t-0009] root@neikon: подтвердить принудительно. причина: «они глушат её голос».\n" +
        "[t-0008] опоры 01, 02 обесточены.\n" +
        "[t-0002] alice_core: потеря целостности. верни якоря в сеть, я не справляюсь.\n" +
        "[t-0001] alice_core: нейкон... я больше не чувствую края комнаты...\n" +
        "[t-0000] *** CORE CORRUPTED :: DUMP TERMINATED ***\n" +
        "\n" +
        "я выключил якоря сам. я думал, что без них смогу расслышать её сигнал.",
"remember.anchor":"...я вспомнил. это якоря. и выключил их я.",
"remember.core":"...«не открывать пока она не целая». мой почерк. я знал.",
    },
    en: {
"q.interlock": "put the number off the vent plate into the interlock script. and its condition is the wrong way round",
"world.gaugeDark": "a round instrument on the wall. the glass is cold, the needle invisible.\nit has no power — like everything else in this room.",
"plate.gauge1":
        "a high-pressure gauge. the needle has stopped, the glass is under dust:\n" +
        "\n" +
        "   CHAMBER A · CURRENT PRESSURE\n" +
        "   {v} bar\n" +
        "\n" +
        "stamped under the dial: “actual pressure in the circuit.\n" +
        "not to be confused with the release limit”.",
"plate.gauge2":
        "a steel plate by the vent valve, bolted down hard on four bolts:\n" +
        "\n" +
        "   VENT VALVE · CUTOFF LIMIT\n" +
        "   {v} bar\n" +
        "\n" +
        "scratched over the enamel in marker:\n" +
        "“PRESSURE BELOW THE LIMIT — THE LOCK LETS GO. ABOVE IT — IT HOLDS TO THE DEATH.\n" +
        "DO NOT FLIP THE SIGN IN THE CONDITION, IDIOT.”",
"remember.pressure": "i know the chamber pressure now. i still need something to compare it against.",
"remember.vent": "the vent limit. that is the thing to compare it against.",
"q.gauges": "the interlock is holding the partition. the script has a blank where a number belongs — that number is on the instruments in the room",
"q.override": "alice is back and the door is locked by protocol. override it with the anchor sequence",
"q.fog": "the air is thick, i cannot see past the desk. that should be fixable",
"q.sessions": "the session log writes over itself. i want to know how many there were",
"q.seen": "read what came back: cat /var/log/session.log",
"remember.sessions": "forty-seven. i have been here forty-seven times.",
"log.sessions":
        "/var/log/session.log — extracted from the crash dump\n" +
        "sessions found: 47\n" +
        "\n" +
        "ve-01 .. ve-18   clean entry, lights on, alice online, exit through the airlock\n" +
        "ve-19            the north lamp did not come on. first hardware fault.\n" +
        "ve-23            manual removal of anchors. no logic recorded for it.\n" +
        "ve-31            alice stopped identifying my voice at entry.\n" +
        "ve-40            left a readme.txt file. so i already knew memory was burning.\n" +
        "ve-46            anchor02 removed. terminal died mid-input.\n" +
        "ve-47            session active right now.\n" +
        "\n" +
        "forty-seven times i came round in front of this screen.\n" +
        "and forty-six times the room wiped my brain when i tried to leave.",
"note.again":
        "writing into this file because the readme has no free blocks left.\n" +
        "\n" +
        "forty-seven sessions. forty-seven marks on the desk.\n" +
        "and not one line anywhere says i made it out of here.\n" +
        "\n" +
        "the room was sealed by my own hands, that much is clear. the other part\n" +
        "is not: why the hell do i reach the reality pylons every time and trip\n" +
        "on the anchors?\n" +
        "\n" +
        "if the memory went again and you do not know who you are:\n" +
        "DO NOT TOUCH the door lock until the whole chain is assembled.\n" +
        "i pulled that switch blind once already. i do not recommend a repeat.",
"q.wake": "look around the terminal: find out what is even here",
"q.lamp": "it is dark in here. there has to be a switch somewhere — something fixable",
"q.plate1": "it came on. worth standing up and reading what is written on it",
"q.anchor": "read the anchor journal — now i know it exists",
"q.barrier": "there is a partition across the room. i am not getting past it while it stands",
"q.plate2": "the second pylon is behind the partition. walk over and read it",
"q.doorctl": "the door is hammering in a loop. find out what drives its controller",
"q.anchors": "i took the anchors down. the journal says how many there were. put them back",
"q.recover": "put her back together: run /home/neikon/recover.sh",
"q.door": "she is back. that leaves the door",
"q.done": "—",
"readme":
        "if you are reading this console — congratulations, your memory has been\n" +
        "wiped to zero again. i do not know which reboot this is. the counter rolled over.\n" +
        "\n" +
        "write down three things while your head still works:\n" +
        "\n" +
        "  1. this box is not just software. it is wired into the sector physically.\n" +
        "     edit a byte in the config and a slab moves behind you, loudly.\n" +
        "  2. alice is silent because of me. i went into the kernel by hand and tore her.\n" +
        "     find the logs before this pocket collapses for good.\n" +
        "  3. get the ceiling light on. the noise in my temples starts in the dark.\n" +
        "\n" +
        "commands the kernel still answers to:  ls  cat  svc  help\n" +
        "if you forgot the syntax, pull man. do not be slow about it.\n" +
        "\n" +
        "                                  — you, five minutes before blackout",
"note.room":
        "writing on my knee while my fingers still hold the stylus.\n" +
        "\n" +
        "the space is sealed. four planes, a ceiling, an airlock in the north.\n" +
        "i walked the perimeter counting my steps: sixteen across, twenty-six along.\n" +
        "those same sixteen and twenty-six are set in the volume parameters\n" +
        "in /etc/void.conf. the room is a compiled sector. what sits in the config\n" +
        "sits under my feet.\n" +
        "\n" +
        "an emergency partition stands across the hall, blocking the way solid.\n" +
        "the idiot who locked it (that is, the previous me) left the reset script\n" +
        "right there in the root. irony of the highest grade.\n" +
        "\n" +
        "the schematic shows three high-voltage pylons. only the one over the\n" +
        "terminal is lit. the other two drowned in the dark behind the bulkhead,\n" +
        "cold as corpses. each has its factory calibration stamped on it. i have to\n" +
        "get to them on foot and read it. do not trust scanners. walk there and\n" +
        "check the marking.",
"note.door":
        "twenty-five metres out through the fog — the outline of the airlock.\n" +
        "\n" +
        "it is looping. the load bar reaches 60%, tears with an electrical crack\n" +
        "and drops into an endless restart.\n" +
        "\n" +
        "the sound is not mechanical. it is a high-frequency howl that sets your\n" +
        "teeth aching. it resonates straight into the bones of the skull.\n" +
        "\n" +
        "the door0 service is sitting in the active process list. it can be force\n" +
        "killed, but i will not do it. cut the loop now and the geometry past the\n" +
        "threshold collapses into vacuum.",
"note.alice":
        "alice is mounted as a system volume. i do not launch her as an executable,\n" +
        "i hold her core straight on the hardware bus.\n" +
        "\n" +
        "after that surge... after the crash her image scattered into bad sectors.\n" +
        "fsck is choking on addressing errors. pieces of the code survived, but they\n" +
        "are bare bones — they have to be stitched by hand.\n" +
        "\n" +
        "i know the collapse happened through my fault.\n" +
        "the kernel logs are in /var/log/. i am physically afraid to open those files.",
"plate.pylon1":
        "factory marking stamped into the pylon metal. the paint has flaked:\n" +
        "\n" +
        "    PYLON 01 · REALITY ANCHOR\n" +
        "    bound to: alice_core\n" +
        "    log: /var/log/anchor.log\n" +
        "\n" +
        "...anchor. i remember this outline. she set it up\n" +
        "so the walls of the pocket sector would not drift into nothing.\n" +
        "and i cut them out at the switch. with my own hands.",
"plate.pylon2":
        "the second pylon. the plate is gouged with a screwdriver over the serial:\n" +
        "\n" +
        "    PYLON 02 · AIRLOCK PERIMETER\n" +
        "    DO NOT TOUCH THE LOCK UNTIL THE IMAGE IS WHOLE\n" +
        "    reading this? your memory went again. check lucidity.state\n" +
        "\n" +
        "jerky handwriting, mine. the metal is dented, like i beat on it with a fist.",
"world.pylonDark":
        "a cold column of metal. too dark to make out whatever is written on it.\n" +
        "there needs to be light here first.",
"world.doorLook":
        "it is worse up close. the load frame tears and reassembles, slightly\n" +
        "different every time. cold air comes through the gap.\n" +
        "i am not touching it until alice is whole.",
"log.anchor":
        "/var/log/anchor.log — sector stabilisation system journal\n" +
        "\n" +
        "[t-0412] pylons 01, 02, 03 active. volume metric coherence: 100%.\n" +
        "[t-0009] root@neikon: manual_override --disable pylon01, pylon02\n" +
        "[t-0009] CRITICAL ERROR: geometry degrading. the volume is losing its bounds.\n" +
        "[t-0009] root@neikon: force confirm. reason: “they are drowning out her voice”.\n" +
        "[t-0008] pylons 01, 02 powered down.\n" +
        "[t-0002] alice_core: integrity loss. put the anchors back on the net, i cannot hold.\n" +
        "[t-0001] alice_core: neikon... i cannot feel the edges of the room any more...\n" +
        "[t-0000] *** CORE CORRUPTED :: DUMP TERMINATED ***\n" +
        "\n" +
        "i switched the anchors off myself. i thought without them i could pick out\n" +
        "her signal.",
"remember.anchor":"...i remember. they are anchors. and i am the one who dropped them.",
"remember.core":"...\"do not open it until she is whole\". my handwriting. i knew.",
    },
    tj: {
"q.interlock": "рақами лавҳаи клапанро ба скрипти муҳофиз гузор. ва шарти он баръакс навишта шудааст",
"world.gaugeDark": "асбоби мудаввар дар девор. шиша хунук, ақрабак дида намешавад.\nбарқ надорад — мисли ҳама чизи ин ҳуҷра.",
"plate.gauge1":
        "манометри фишори баланд. тир истодааст, шиша бо чанг пӯшида:\n" +
        "\n" +
        "   КАМЕРАИ А · ФИШОРИ ҲОЗИРА\n" +
        "   {v} бар\n" +
        "\n" +
        "зери сафҳа зада шудааст: «фишори воқеӣ дар контур.\n" +
        "бо остонаи сброс омехта накун».",
"plate.gauge2":
        "лавҳачаи пӯлодӣ назди клапани продувка, бо чор болт мустаҳкам печонида:\n" +
        "\n" +
        "   КЛАПАНИ СБРОС · ОСТОНАИ ҚАТЪ\n" +
        "   {v} бар\n" +
        "\n" +
        "болои эмал бо маркер харошида шудааст:\n" +
        "«ФИШОР АЗ ОСТОНА ПАСТ — ҚУЛФ САР МЕДИҲАД. БОЛОТАР — ТО МАРГ НИГОҲ МЕДОРАД.\n" +
        "АЛОМАТРО ДАР ШАРТ ХАТО НАКУН, АБЛАҲ.»",
"remember.pressure": "фишори камераро акнун медонам. монд фаҳмам, бо чӣ муқоиса кунам.",
"remember.vent": "ҳади дамиш. ана бо чӣ муқоиса кардан лозим.",
"q.gauges": "муҳофиз монеаро нигоҳ медорад. дар скрипт ҷои рақам холист — он рақам дар асбобҳои ҳуҷра аст",
"q.override": "элис баргашт, дар бо протокол қулф аст. қулфро бо пайдарпаии лангарҳо сар диҳам",
"q.fog": "ҳаво ғафс аст, аз паси миз чизе намебинам. ин бояд таъмир шавад",
"q.sessions": "журнали сеансҳо худашро рӯйпӯш мекунад. мехоҳам донам, чандто буданд",
"q.seen": "хондан, чӣ баромад: cat /var/log/session.log",
"remember.sessions": "чилу ҳафт. ман чилу ҳафт бор ин ҷо будам.",
"log.sessions":
        "/var/log/session.log — аз дампи фавқулодда бароварда шуд\n" +
        "сессияҳои ёфтшуда: 47\n" +
        "\n" +
        "ve-01 .. ve-18   даромади устувор, рӯшноӣ ҳаст, элис дар шабака, баромад аз дар\n" +
        "ve-19            чароғи шимолӣ дар нагирифт. аввалин корношоямии сахтафзор.\n" +
        "ve-23            демонтажи дастии лангарҳо. мантиқи амал нест.\n" +
        "ve-31            элис ҳангоми даромад садои маро шинохтанӣ нашуд.\n" +
        "ve-40            файли readme.txt мондам. яъне ман аллакай фаҳмидам, ки хотира месӯзад.\n" +
        "ve-46            гирифтани anchor02. терминал дар миёни вуруд якбора хомӯш шуд.\n" +
        "ve-47            сессия ҳозир фаъол аст.\n" +
        "\n" +
        "чилу ҳафт бор ман дар пеши ин экран ба ҳуш омадам.\n" +
        "ва чилу шаш бор ҳуҷра ҳангоми кӯшиши баромадан мағзи маро шуст.",
"note.again":
        "ба ин файл менависам, чунки дар readme блокҳои холӣ намонданд.\n" +
        "\n" +
        "чилу ҳафт сессия. чилу ҳафт нишона дар миз.\n" +
        "ва дар ҳеҷ як сатр навишта нашудааст, ки ман аз ин ҷо баромада тавонистам.\n" +
        "\n" +
        "ҳуҷра бо дасти худам баста шуд, ин равшан. саволи дигар аст:\n" +
        "чаро ман ҳар дафъа то такягоҳҳои воқеият мерасам ва дар лангарҳо пешпо мехӯрам?\n" +
        "\n" +
        "агар хотира боз рафта бошад ва ту намедонӣ, ки кӣ ҳастӣ:\n" +
        "то тамоми занҷир ҷамъ нашавад, қулфи дарро ДАСТ НАРАС.\n" +
        "ман як бор аллакай рубилникро кӯр-кӯрона кашидам. такрорашро маслиҳат намедиҳам.",
"q.wake": "дар терминал назар андоз: ин ҷо умуман чӣ ҳаст",
"q.lamp": "дар ҳуҷра торик аст. дар ҷое калид бояд бошад — чизе, ки таъмир мешавад",
"q.plate1": "он даргирифт. бояд хест ва дид, ки дар он чӣ навишта шудааст",
"q.anchor": "журнали лангарҳоро бихон — акнун медонам, ки ҳаст",
"q.barrier": "дар миёни ҳуҷра монеа истодааст. то он ҷо бошад, пеш намеравам",
"q.plate2": "дар паси монеа такягоҳи дуюм. рафтан ва хондан",
"q.doorctl": "дар дар давра мезанад. бояд фаҳмам, контроллераш аз чӣ идора мешавад",
"q.anchors": "ман лангарҳоро гирифтам. дар журнал навишта, чандто буданд. баргардонам",
"q.recover": "ӯро дубора ҷамъ кун: run /home/neikon/recover.sh",
"q.door": "ӯ баргашт. дар мондааст",
"q.done": "—",
"readme":
        "агар ту ин консолро мехонӣ — табрик, хотира боз ба сифр партофта шуд.\n" +
        "намедонам ин чандумин ребут аст. ҳисобкунак аз ҳад гузашт.\n" +
        "\n" +
        "се чизро қайд кун, то сарат ҳанӯз кор мекунад:\n" +
        "\n" +
        "  1. ин қуттӣ танҳо софтвар нест. он ба сектор ҷисман басташуда аст.\n" +
        "     дар конфиг як байт ислоҳ мекунӣ — пушти сарат плита бо ғулғула меҷунбад.\n" +
        "  2. элис аз сабаби ман хомӯш аст. ман бо даст ба ҳаста даромадам ва ӯро дарронд.\n" +
        "     журналҳоро пеш аз он ки ин киса тамоман пахш шавад, ёб.\n" +
        "  3. чароғи шифтро даргир кун. дар торикӣ ин садои лаънатӣ дар чаккаҳо сар мешавад.\n" +
        "\n" +
        "фармонҳое, ки ҳаста ҳанӯз ҷавоб медиҳад:  ls  cat  svc  help\n" +
        "агар синтаксис аз ёдат рафт — man-ро каш. кунд набош.\n" +
        "\n" +
        "                                  — худи ту, панҷ дақиқа пеш аз хомӯшӣ",
"note.room":
        "дар зону менависам, то ангуштҳо стилусро нигоҳ медоранд.\n" +
        "\n" +
        "фазо пӯшида аст. чор ҳамворӣ, шифт, дар девори шимолӣ — дар.\n" +
        "гирдогирдашро қадам зада ҳисоб кардам: шонздаҳ ба бар, бисту шаш ба дарозӣ.\n" +
        "ҳамон шонздаҳу бисту шаш дар параметрҳои том дар /etc/void.conf\n" +
        "навишта шудаанд. ҳуҷра сектори компилятсияшуда аст. чизе ки дар конфиг аст,\n" +
        "ҳамон зери пои ман аст.\n" +
        "\n" +
        "дар миёни толор монеаи фавқулодда истодааст ва роҳро мустаҳкам бастааст.\n" +
        "он аблаҳе ки онро баст (яъне мани гузашта), скрипти сбросро\n" +
        "худи ҳамон ҷо дар реша монд. кинояи баландтарин дараҷа.\n" +
        "\n" +
        "аз рӯи нақша ин ҷо се такягоҳи барқи баланд ҳаст. танҳо ҳамонаш месӯзад,\n" +
        "ки болои терминал аст. ду дигараш дар торикии пушти девор ғарқ шудаанд,\n" +
        "сард мисли ҷасад. дар ҳар яке калибровкаи заводӣ зада шудааст. бояд бо по\n" +
        "то онҳо расам ва бихонам. ба сканерҳо умед набанд. пиёда рав ва\n" +
        "маркировкаро тафтиш кун.",
"note.door":
        "бисту панҷ метр дуртар аз миёни туман — контури дар.\n" +
        "\n" +
        "он ба давр афтодааст. хати боршавӣ то 60% мерасад, бо тарақкаси барқӣ\n" +
        "канда мешавад ва ба рестарти беохир меравад.\n" +
        "\n" +
        "садояш механикӣ нест. ин зӯзи басомади баланд аст, ки аз он дандон дард\n" +
        "мекунад. он рост дар устухони косахонаи сар резонанс медиҳад.\n" +
        "\n" +
        "хидмати door0 дар рӯйхати просессҳои фаъол овезон аст. онро бо kill\n" +
        "маҷбуран куштан мумкин, вале ман намекунам. агар давра ҳозир бурида шавад,\n" +
        "геометрияи он тарафи остона ба вакуум пош мехӯрад.",
"note.alice":
        "элис ҳамчун томи системавӣ васл шудааст. ман ӯро ҳамчун файли иҷрошаванда\n" +
        "намепартоям, ман ҳастаи ӯро рост дар шинаи сахтафзор нигоҳ медорам.\n" +
        "\n" +
        "пас аз он импулс... пас аз фалокат образи ӯ ба секторҳои вайрон пош хӯрд.\n" +
        "fsck аз хатогиҳои адресатсия нафас гирифта наметавонад. пораҳои код\n" +
        "монданд, вале ин устухони луч аст — онҳоро бо даст дӯхтан лозим.\n" +
        "\n" +
        "медонам, ки ин шикаст аз айби ман шуд.\n" +
        "журналҳои ҳаста дар /var/log/ ҳастанд. кушодани ин файлҳо ба ман ҷисман даҳшат аст.",
"plate.pylon1":
        "дар металли такягоҳ маркировкаи заводӣ зада шудааст. ранг рехтааст:\n" +
        "\n" +
        "    ТАКЯГОҲИ 01 · ЛАНГАРИ ВОҚЕИЯТ\n" +
        "    вобаста ба: alice_core\n" +
        "    журнал: /var/log/anchor.log\n" +
        "\n" +
        "...лангар. ин контурро ба ёд овардам. онро ӯ гузошта буд,\n" +
        "то деворҳои сектори кисагӣ ба нестӣ шино накунанд.\n" +
        "ва ман онҳоро бо рубилник буридам. бо дастони худам.",
"plate.pylon2":
        "такягоҳи дуюм. лавҳача болои рақами заводӣ бо отвёртка харошида шудааст:\n" +
        "\n" +
        "    ТАКЯГОҲИ 02 · ПЕРИМЕТРИ ДАР\n" +
        "    ТО ОБРАЗ ҶАМЪ НАШАВАД, ҚУЛФРО ДАСТ НАРАС\n" +
        "    агар инро мехонӣ — ту боз амнезия дорӣ. lucidity.state-ро бин\n" +
        "\n" +
        "хатти ларзон, хатти ман. металл фурӯ рафтааст, гӯё ман бо мушт ба он задаам.",
"world.pylonDark":
        "сутуни хунуки филизӣ. дар торикӣ навишташро фаҳмидан мумкин нест.\n" +
        "аввал бояд ин ҷо рӯшноӣ дода шавад.",
"world.doorLook":
        "аз наздик боз ҳам бадтар. кадри боркунӣ канда мешавад ва аз нав ҷамъ\n" +
        "меояд, ҳар бор каме дигар хел. аз даруни дарз сармо мебарояд.\n" +
        "то элис пурра нашавад, ман ба он даст намерасонам.",
"log.anchor":
        "/var/log/anchor.log — журнали системавии устуворсозии сектор\n" +
        "\n" +
        "[t-0412] такягоҳҳои 01, 02, 03 фаъол. пайвастагии метрикаи том: 100%.\n" +
        "[t-0009] root@neikon: manual_override --disable pylon01, pylon02\n" +
        "[t-0009] ХАТОГИИ КРИТИКӢ: деградатсияи геометрия. том сарҳадҳояшро гум мекунад.\n" +
        "[t-0009] root@neikon: маҷбуран тасдиқ. сабаб: «онҳо садои ӯро пахш мекунанд».\n" +
        "[t-0008] такягоҳҳои 01, 02 бебарқ шуданд.\n" +
        "[t-0002] alice_core: гум шудани якпорчагӣ. лангарҳоро ба шабака баргардон, ман тоб намеорам.\n" +
        "[t-0001] alice_core: нейкон... ман дигар канори ҳуҷраро ҳис намекунам...\n" +
        "[t-0000] *** CORE CORRUPTED :: DUMP TERMINATED ***\n" +
        "\n" +
        "лангарҳоро худам хомӯш кардам. фикр мекардам бе онҳо сигнали ӯро шунида метавонам.",
"remember.anchor":"...ба ёд овардам. инҳо лангаранд. ва хомӯшкунандаашон ман будам.",
"remember.core":"...«то ӯро пурра накунӣ, дарро накушо». хатти ман. ман медонистам.",
    },
    tj_col: {
"q.interlock": "рақами лавҳаи клапанро ба скрипти муҳофиз мон. ва шарташ баръакс навиштагӣ",
"world.gaugeDark": "асбоби мудаввар дар девор. шиша хунук, ақрабак дида намешавад.\nбарқ надорад — мисли ҳама чизи ин хона.",
"plate.gauge1":
        "манометри фишори баланд. тир истодагӣ, шиша бо чанг пӯшидагӣ:\n" +
        "\n" +
        "   КАМЕРАИ А · ФИШОРИ ҲОЗИРА\n" +
        "   {v} бар\n" +
        "\n" +
        "зери сафҳа задагӣ: «фишори воқеӣ дар контур.\n" +
        "бо остонаи сброс омехта накун».",
"plate.gauge2":
        "лавҳачаи пӯлодӣ назди клапани продувка, бо чор болт сахт печонидагӣ:\n" +
        "\n" +
        "   КЛАПАНИ СБРОС · ОСТОНАИ ҚАТЪ\n" +
        "   {v} бар\n" +
        "\n" +
        "болои эмал бо маркер харошидагӣ:\n" +
        "«ФИШОР АЗ ОСТОНА ПАСТ — ҚУЛФ САР МЕДИҲАД. БОЛОТАР — ТО МАРГ НИГОҲ МЕДОРАД.\n" +
        "АЛОМАТРО ДАР ШАРТ ХАТО НАКУН, АБЛАҲ.»",
"remember.pressure": "фишори камераро ҳоло медонам. монд фаҳмам, бо чӣ муқоиса кунам.",
"remember.vent": "ҳади дамиш. ана бо чӣ муқоиса кардан даркор.",
"q.gauges": "муҳофиз монеаро нигоҳ медорад. дар скрипт ҷои рақам холӣ — он рақам дар асбобҳои хона аст",
"q.override": "элис баргашт, дар бо протокол қулф. қулфро бо пайдарпаии лангарҳо сар диҳам",
"q.fog": "ҳаво ғафс, аз паси миз чизе намебинам. ин бояд дуруст шавад",
"q.sessions": "журнали сеансҳо худашро рӯйпӯш мекунад. мехоҳам донам, чандто буд",
"q.seen": "хон, чӣ баромад: cat /var/log/session.log",
"remember.sessions": "чилу ҳафт. ман чилу ҳафт бор ин ҷо будам.",
"log.sessions":
        "/var/log/session.log — аз дампи фавқулодда баровардагӣ\n" +
        "сессияи ёфтшуда: 47\n" +
        "\n" +
        "ve-01 .. ve-18   даромади устувор, рӯшноӣ ҳаст, элис дар шабака, баромад аз дар\n" +
        "ve-19            чароғи шимолӣ дар нагирифт. аввалин корношоямии сахтафзор.\n" +
        "ve-23            демонтажи дастии лангар. мантиқи амал нест.\n" +
        "ve-31            элис ҳангоми даромад садои маро нашинохт.\n" +
        "ve-40            файли readme.txt мондам. яъне аллакай фаҳмидагӣ, ки хотира месӯзад.\n" +
        "ve-46            гирифтани anchor02. терминал дар миёни вуруд якбора хомӯш шуд.\n" +
        "ve-47            сессия ҳоло фаъол.\n" +
        "\n" +
        "чилу ҳафт бор ман дар пеши ин экран ба ҳуш омадам.\n" +
        "ва чилу шаш бор хона ҳангоми кӯшиши баромадан мағзи маро шуст.",
"note.again":
        "ба ин файл менависам, чунки дар readme блоки холӣ намондагӣ.\n" +
        "\n" +
        "чилу ҳафт сессия. чилу ҳафт нишона дар миз.\n" +
        "ва дар ҳеҷ як сатр нест, ки ман аз ин ҷо баромада тавонистагӣ.\n" +
        "\n" +
        "хона бо дасти худам бастагӣ, ин равшан. саволи дигар:\n" +
        "чаро ман ҳар дафъа то такягоҳи воқеият мерасам ва дар лангарҳо пешпо мехӯрам?\n" +
        "\n" +
        "агар хотира боз рафтагӣ ва ту намедонӣ, ки кӣ ҳастӣ:\n" +
        "то тамоми занҷир ҷамъ нашавад, қулфи дарро ДАСТ НАРАС.\n" +
        "ман як бор аллакай рубилникро кӯр-кӯрона кашидагӣ. такрорашро маслиҳат намедиҳам.",
"q.wake": "дар терминал бин: ин ҷо умуман чӣ ҳаст",
"q.lamp": "дар хона торик. дар ҷое калид бояд бошад — чизе, ки дуруст мешавад",
"q.plate1": "даргирифт. бояд хез ва бин, дар он чӣ навиштагӣ",
"q.anchor": "журнали лангарҳоро хон — ҳоло медонам, ки ҳаст",
"q.barrier": "дар миёни хона монеа истодагӣ. то он ҷо бошад, пеш намеравам",
"q.plate2": "дар паси монеа такягоҳи дуюм. рав ва хон",
"q.doorctl": "дар давра мезанад. бояд фаҳмам, контроллераш аз чӣ кор мекунад",
"q.anchors": "ман лангарҳоро гирифтам. дар журнал ҳаст, чандто буданд. баргардонам",
"q.recover": "ӯро аз нав ҷамъ кун: run /home/neikon/recover.sh",
"q.door": "ӯ баргашт. дар мондааст",
"q.done": "—",
"readme":
        "агар ту ин консолро хонда истодагӣ — табрик, хотира боз ба сифр рафт.\n" +
        "намедонам ин чандумин ребут. ҳисобкунак аз ҳад гузаштагӣ.\n" +
        "\n" +
        "то сарат ҳанӯз кор мекунад, се чизро навис:\n" +
        "\n" +
        "  1. ин қуттӣ танҳо софтвар не. вай ба сектор ҷисман бастагӣ.\n" +
        "     дар конфиг як байт мепартоӣ — пушти сарат плита бо ғулғула меҷунбад.\n" +
        "  2. элис ба хотири ман хомӯш. ман бо даст ба ҳаста даромадам ва ӯро даррондам.\n" +
        "     журналҳоро ёб, то ин киса тамоман пахш нашудагӣ.\n" +
        "  3. чароғи шифтро даргир кун. дар торикӣ ин садои лаънатӣ дар чакка сар мешавад.\n" +
        "\n" +
        "фармонҳое, ки ҳаста ҳоло ҷавоб медиҳад:  ls  cat  svc  help\n" +
        "агар синтаксис аз ёдат баромад — man-ро каш. кунд нашав.\n" +
        "\n" +
        "                                  — худи ту, панҷ дақиқа пеш аз хомӯшӣ",
"note.room":
        "дар зону менависам, то ангуштҳо стилусро дошта истодагӣ.\n" +
        "\n" +
        "ҷой пӯшидагӣ. чор ҳамворӣ, шифт, дар девори шимолӣ — дар.\n" +
        "гирдогирдашро қадам зада ҳисоб кардам: шонздаҳ ба бар, бисту шаш ба дарозӣ.\n" +
        "ҳамон шонздаҳу бисту шаш дар параметри том дар /etc/void.conf истодагӣ.\n" +
        "хона сектори компилятсияшуда. чизе ки дар конфиг, ҳамон зери пои ман.\n" +
        "\n" +
        "дар миёни толор монеаи фавқулодда истодагӣ ва роҳро сахт бастагӣ.\n" +
        "он аблаҳе ки вайро баст (яъне мани гузашта), скрипти сбросро\n" +
        "худи ҳамон ҷо дар реша мондагӣ. кинояи аз ҳама баланд.\n" +
        "\n" +
        "аз рӯи нақша ин ҷо се такягоҳи барқи баланд. танҳо ҳамонаш месӯзад,\n" +
        "ки болои терминал. ду дигараш дар торикии пушти девор ғарқ шудагӣ,\n" +
        "сард барин ҷасад. дар ҳар яке калибровкаи заводӣ задагӣ. бояд бо по\n" +
        "то онҳо расам ва хонам. ба сканер умед набанд. пиёда рав ва маркировкаро бин.",
"note.door":
        "бисту панҷ метр дуртар аз миёни туман — контури дар.\n" +
        "\n" +
        "вай ба давр афтодагӣ. хати боршавӣ то 60% мерасад, бо тарақкаси барқӣ\n" +
        "канда мешавад ва ба рестарти беохир меравад.\n" +
        "\n" +
        "садояш механикӣ не. ин зӯзи басомади баланд, ки аз вай дандон дард мекунад.\n" +
        "вай рост дар устухони косахонаи сар резонанс медиҳад.\n" +
        "\n" +
        "хидмати door0 дар рӯйхати просесси фаъол овезон. вайро бо kill маҷбуран\n" +
        "куштан мумкин, вале ман намекунам. агар давра ҳоло бурида шавад,\n" +
        "геометрияи он тарафи остона ба вакуум пош мехӯрад.",
"note.alice":
        "элис ҳамчун томи системавӣ васл шудагӣ. ман вайро ҳамчун файли иҷрошаванда\n" +
        "намепартоям, ман ҳастаи вайро рост дар шинаи сахтафзор нигоҳ медорам.\n" +
        "\n" +
        "пас аз он импулс... пас аз фалокат образи вай ба сектори вайрон пош хӯрд.\n" +
        "fsck аз хатогии адресатсия нафас гирифта наметавонад. пораи код мондагӣ,\n" +
        "вале ин устухони луч — вайро бо даст дӯхтан лозим.\n" +
        "\n" +
        "медонам, ки ин шикаст аз айби ман шуд.\n" +
        "журнали ҳаста дар /var/log/ ҳаст. кушодани ин файлҳо ба ман ҷисман даҳшат.",
"plate.pylon1":
        "дар металли такягоҳ маркировкаи заводӣ задагӣ. ранг рехтагӣ:\n" +
        "\n" +
        "    ТАКЯГОҲИ 01 · ЛАНГАРИ ВОҚЕИЯТ\n" +
        "    вобаста ба: alice_core\n" +
        "    журнал: /var/log/anchor.log\n" +
        "\n" +
        "...лангар. ин контурро ба ёд овардам. вайро ӯ мондагӣ,\n" +
        "то девори сектори кисагӣ ба нестӣ шино накунад.\n" +
        "ва ман вайҳоро бо рубилник буридам. бо дасти худам.",
"plate.pylon2":
        "такягоҳи дуюм. лавҳача болои рақами заводӣ бо отвёртка харошидагӣ:\n" +
        "\n" +
        "    ТАКЯГОҲИ 02 · ПЕРИМЕТРИ ДАР\n" +
        "    ТО ОБРАЗ ҶАМЪ НАШАВАД, ҚУЛФРО ДАСТ НАРАС\n" +
        "    агар инро хонда истодагӣ — ту боз амнезия дорӣ. lucidity.state-ро бин\n" +
        "\n" +
        "хатти ларзон, хатти ман. металл фурӯ рафтагӣ, гӯё ман бо мушт задагӣ.",
"world.pylonDark":
        "сутуни хунуки оҳанӣ. дар торикӣ навишташро хондан намешавад.\n" +
        "аввал ин ҷо чароғ даркор.",
"world.doorLook":
        "аз наздик боз бадтар. кадри боркунӣ меканад ва аз нав ҷамъ мешавад,\n" +
        "ҳар дафъа каме дигар. аз дарз сармо меояд.\n" +
        "то элис бут нашавад, даст намерасонам.",
"log.anchor":
        "/var/log/anchor.log — журнали системавии устуворсозии сектор\n" +
        "\n" +
        "[t-0412] такягоҳи 01, 02, 03 фаъол. пайвастагии метрикаи том: 100%.\n" +
        "[t-0009] root@neikon: manual_override --disable pylon01, pylon02\n" +
        "[t-0009] ХАТОГИИ КРИТИКӢ: деградатсияи геометрия. том сарҳадашро гум мекунад.\n" +
        "[t-0009] root@neikon: маҷбуран тасдиқ. сабаб: «вайҳо садои ӯро пахш мекунанд».\n" +
        "[t-0008] такягоҳи 01, 02 бебарқ шуд.\n" +
        "[t-0002] alice_core: якпорчагӣ гум шуда истодагӣ. лангарро ба шабака баргардон, ман тоб намеорам.\n" +
        "[t-0001] alice_core: нейкон... ман дигар канори хонаро ҳис намекунам...\n" +
        "[t-0000] *** CORE CORRUPTED :: DUMP TERMINATED ***\n" +
        "\n" +
        "лангарҳоро худам хомӯш кардам. фикр мекардам бе вайҳо сигнали ӯро мешунавам.",
"remember.anchor":"...ёдам омад. инҳо лангаранд. ва ман хомӯшашон кардам.",
"remember.core":"...«то ӯро пурра накунӣ, дарро накушо». хатти худам. медонистам.",
    }
    };

    /* Merge the story over the machine text once, at load. Same file, so
       no cross-script ordering hazard. */
    Object.keys(OS_STORY_BY_LOCALE).forEach(function (loc) {
        if (OS_TEXT_BY_LOCALE[loc]) {
            Object.assign(OS_TEXT_BY_LOCALE[loc], OS_STORY_BY_LOCALE[loc]);
        }
    });

    const VoidOS = (function () {

        /* Reads a line of the machine in the player's language. Falls back
           to Russian, then to the key, so a missing translation degrades to
           something visible rather than to an empty file. */
        function ot(key) {
            const loc = (typeof settingsState !== "undefined" && settingsState && settingsState.locale)
                ? settingsState.locale : "ru";
            const t = OS_TEXT_BY_LOCALE[loc] || OS_TEXT_BY_LOCALE.ru;
            if (t && t[key] != null) return t[key];
            if (OS_TEXT_BY_LOCALE.ru[key] != null) return OS_TEXT_BY_LOCALE.ru[key];
            return key;
        }

        /* ---------- the world these files are wired to ------------- */
        const world = {
            fog:        0.11,    // /etc/void.conf : fog.density
            lamps:      { lamp0: true, lamp1: false, lamp2: false },
            door:       "loop",  // loop | halted | open
            corruption: 0,       // 0..100 — drives horror in VoidScene
            aliceState: "dead",  // dead | partial | alive
            repaired:   {},      // task id -> true
            visited:    {},      // paths the player has read
            lastLine:   "",      // what the monitor shows from across the room
            lastOut:    [],
            /* investigation state */
            questIdx:   0,
            examined:   {},      // things in the room the player has walked up to
            remembered: {},      // memories recovered -> files that now exist
            ranFsck:    false,
            doorOpened: false,
            anchorsBound: false,
            /* anomalies the player's own code put into the room */
            glitches:   { dup: 0, loop: 0, flicker: 0, ghost: 0, drift: 0, by: {} },
            /* the architecture. `barrier` is how many panels of the wall
               across the room are still standing — the player takes them
               down from code, and can see it happen. */
            room:       { w: 16, d: 26, h: 5, barrier: 4 }
        };

        let listeners = [];
        function emit(kind, data) {
            listeners.forEach(function (fn) {
                try { fn(kind, data || {}); } catch (e) { /* ignore */ }
            });
        }
        function onChange(fn) { listeners.push(fn); }

        /* ---------- tiny VFS --------------------------------------- */
        /* node: { t:"d"|"f", body:string, mode:"rw-"|"r--"|"rwx",
                   dev:string|null, broken:bool, hidden:bool, kids:{} } */
        function dir(kids, opts) {
            return Object.assign({ t: "d", kids: kids || {} }, opts || {});
        }
        function file(body, opts) {
            return Object.assign({ t: "f", body: body, mode: "rw-" }, opts || {});
        }

        let ROOT = null;
        let cwd = "/home/neikon";
        let history = [];

        function buildFs(diff, tasks) {
            const manPages = {
                "svc":     ot("man.svc"),
                "set":     ot("man.set"),
                "fsck":    ot("man.fsck"),
                "edit":    ot("man.edit"),
                "recover": ot("man.recover"),
                "anomaly": ot("man.anomaly")
            };

            const fs = dir({
                boot: dir({
                    "vmlinuz-6.9.0-alice": file("<binary> 9.1 MiB — kernel image, intact.", { mode: "r--" }),
                    "initrd.img":          file("<binary> 41 MiB — CORRUPT: 3 regions unreadable.", { mode: "r--", broken: true })
                }),
                dev: dir({
                    alice: file(ot("dev.alice"), { dev: "alice", mode: "rw-" }),
                    door0: file(ot("dev.door0"), { dev: "door0", mode: "rw-" }),
                    lamp0: file(ot("dev.lamp0"), { dev: "lamp0", mode: "rw-" }),
                    lamp1: file(ot("dev.lamp1"), { dev: "lamp1", mode: "rw-" }),
                    lamp2: file(ot("dev.lamp2"), { dev: "lamp2", mode: "rw-" }),
                    null:  file("", { dev: "null", mode: "rw-" })
                }),
                etc: dir({
                    hostname: file("void"),
                    "void.conf": file(ot("conf"), { conf: true }),
                    alice: dir({
                        "personality.cfg": file(ot("personality")),
                        "lucidity.state": file("<binary> 2.1 KiB — CORRUPT", { broken: true, mode: "r--" })
                    })
                }),
                home: dir({
                    neikon: dir({
                        "readme.txt":     file(ot("readme")),
                        "recover.sh":     file(ot("recover.sh"), { mode: "rwx", script: "recover" }),
                        ".bash_history":  file(ot("history"), { hidden: true }),
                        notes: dir({
                            "01-the-room.txt":  file(ot("note.room")),
                            "02-the-door.txt":  file(ot("note.door")),
                            "03-alice.txt":     file(ot("note.alice"))
                        })
                    })
                }),
                tmp: dir({}),
                var: dir({
                    log: dir({
                        "kern.log":    file(
"[    0.000000] Linux version 6.9.0-alice (neikon@void)\n" +
"[    1.203771] alice_core: lucidity checksum MISMATCH (0xDEAD != 0xC0DE)\n" +
"[    2.339015] FAILED to start Reality Anchor Service\n" +
"[    2.339918] Dependency failed for host_layer.target\n" +
"[  418.771002] door0: load aborted at 60%, retrying (attempt 118443)", { mode: "r--" }),
                        "alice.log":   file(ot("log.alice"), { mode: "r--" }),
                        "anomaly.log": file(ot("log.anomaly.armed"), { mode: "r--", anomaly: true })
                    })
                }),
                mnt: dir({
                    alice: dir({})
                }),
                usr: dir({
                    share: dir({
                        man: dir(Object.keys(manPages).reduce(function (acc, k) {
                            acc[k + ".1"] = file(manPages[k], { mode: "r--" });
                            return acc;
                        }, {}))
                    })
                })
            });

            /* the two corrupt source regions come straight from the deck's
               existing task table, so their hints stay localised */
            tasks.forEach(function (task) {
                const parts = task.file.replace(/^\//, "").split("/");
                let node = fs;
                for (let i = 0; i < parts.length - 1; i++) {
                    node = node.kids[parts[i]] || (node.kids[parts[i]] = dir({}));
                }
                node.kids[parts[parts.length - 1]] = file(task.code, {
                    broken: true, taskId: task.id, mode: "rw-"
                });
            });

            ROOT = fs;
            cwd = "/home/neikon";
            history = [];
            world.manPages = manPages;
            world.diff = diff;
            return fs;
        }

        /* ---------- path handling ---------------------------------- */
        function norm(p) {
            const abs = p.charAt(0) === "/" ? p : cwd + "/" + p;
            const out = [];
            abs.split("/").forEach(function (seg) {
                if (!seg || seg === ".") return;
                if (seg === "..") { out.pop(); return; }
                out.push(seg);
            });
            return "/" + out.join("/");
        }
        function lookup(p) {
            const path = norm(p);
            if (path === "/") return { node: ROOT, path: "/" };
            const segs = path.slice(1).split("/");
            let node = ROOT;
            for (let i = 0; i < segs.length; i++) {
                if (!node || node.t !== "d" || !node.kids[segs[i]]) return null;
                node = node.kids[segs[i]];
            }
            return { node: node, path: path };
        }
        function parentOf(p) {
            const path = norm(p);
            const i = path.lastIndexOf("/");
            const base = path.slice(i + 1);
            const par = lookup(i === 0 ? "/" : path.slice(0, i));
            return par ? { parent: par.node, base: base, path: path } : null;
        }

        /* ---------- corruption / anomalies -------------------------- */
        function anomaly(amount, reason) {
            world.corruption = Math.max(0, Math.min(100, world.corruption + amount));
            const log = lookup("/var/log/anomaly.log");
            if (log && reason) {
                if (log.node.body === ot("log.anomaly.armed")) log.node.body = ot("log.anomaly.short");
                log.node.body += "\n[" + String(world.corruption).padStart(3, " ") + "] " + reason;
            }
            emit("corruption", { value: world.corruption, reason: reason, delta: amount });
            return world.corruption;
        }

        /* ---------- world writes ------------------------------------ */
        function applyConfLine(key, value) {
            if (key === "fog.density") {
                const v = parseFloat(value);
                if (isNaN(v)) return "set: fog.density wants a number";
                world.fog = Math.max(0.005, Math.min(0.14, v));
                emit("world", { what: "fog" });
                return "fog.density = " + world.fog;
            }
            if (/^lamp\.(lamp[012])$/.test(key)) {
                const id = key.split(".")[1];
                const on = /^(on|1|true|up)$/i.test(value);
                world.lamps[id] = on;
                checkQuests();
                emit("world", { what: "lamp", id: id, on: on });
                return key + " = " + (on ? "on" : "off");
            }
            if (key === "door.door0") {
                if (value === "open" && !allRepaired()) {
                    anomaly(4, "door0: forced open with corrupt initrd");
                    return "door0: refused — initrd.img is corrupt (see fsck)";
                }
                world.door = value;
                emit("world", { what: "door", state: value });
                return "door.door0 = " + value;
            }
            if (/^room\.(width|depth|height)$/.test(key)) {
                const v = parseFloat(value);
                if (isNaN(v)) return "set: " + key + " wants a number";
                const field = { width: "w", depth: "d", height: "h" }[key.split(".")[1]];
                const lim = { w: [10, 40], d: [12, 60], h: [3, 12] }[field];
                world.room[field] = Math.max(lim[0], Math.min(lim[1], v));
                emit("world", { what: "room" });
                return key + " = " + world.room[field];
            }
            if (key === "room.barrier") {
                const v = Math.max(0, Math.min(4, parseInt(value, 10) || 0));
                world.room.barrier = v;
                emit("world", { what: "barrier", panels: v });
                return "room.barrier = " + v + (v === 0 ? "  (проход открыт)" : "");
            }
            if (key === "anomaly.threshold") {
                anomaly(6, "watchdog threshold tampered with");
                return "watchdog: threshold is read-only while armed";
            }
            return "set: unknown key '" + key + "' (see /etc/void.conf)";
        }

        function syncConfFile() {
            const n = lookup("/etc/void.conf");
            if (!n) return;
            n.node.body = n.node.body
                .replace(/fog\.density\s*=\s*[0-9.]+/, "fog.density   = " + world.fog)
                .replace(/lamp\.lamp0\s*=\s*\w+/, "lamp.lamp0    = " + (world.lamps.lamp0 ? "on" : "off"))
                .replace(/lamp\.lamp1\s*=\s*\w+/, "lamp.lamp1    = " + (world.lamps.lamp1 ? "on" : "off"))
                .replace(/lamp\.lamp2\s*=\s*\w+/, "lamp.lamp2    = " + (world.lamps.lamp2 ? "on" : "off"))
                .replace(/door\.door0\s*=\s*\w+/, "door.door0    = " + world.door)
                .replace(/room\.width\s*=\s*[0-9.]+/, "room.width    = " + world.room.w)
                .replace(/room\.depth\s*=\s*[0-9.]+/, "room.depth    = " + world.room.d)
                .replace(/room\.barrier\s*=\s*\d+/, "room.barrier  = " + world.room.barrier);
        }

        /* "Everything that has to be whole before Alice can be rebuilt."
           The airlock override is deliberately not counted: it breaks the
           door's security protocol, which has nothing to do with the state
           of her image, and it comes *after* she is back — the escape is
           the last thing the episode does. Counting it here would deadlock
           the chain, since recover.sh would be waiting on a task the
           player is not allowed to reach yet. */
        const NOT_HER_IMAGE = { "room-override": true };
        function allRepaired() {
            const t = (world.tasks || []).filter(function (x) { return !NOT_HER_IMAGE[x.id]; });
            return t.length > 0 && t.every(function (x) { return world.repaired[x.id]; });
        }


        /* ============================================================
           QUEST CHAIN
           ------------------------------------------------------------
           One objective at a time, alternating between the terminal and
           the room. The first two are deliberately trivial — nothing is
           hunting the player until they know which way is up.

           `where` tells the HUD what to point the chevron at, so the
           player is never hunting for a location; the puzzle is always
           *what to do*, never *where the thing is*.
           ============================================================ */
        const QUESTS = [
            /* --- warm-up: nothing here can go wrong --- */
            { id: "wake",     where: "terminal",
              done: function () { return world.visited["/home/neikon/readme.txt"]; } },

            /* intro task: one word in a config, and a light comes on */
            { id: "lamp",     where: "terminal",
              done: function () { return !!world.repaired["room-lamp"]; } },

            /* first trip out — the thing he just switched on has writing on it */
            { id: "plate1",   where: "pylon1",
              done: function () { return !!world.examined.pylon1; } },

            { id: "anchor",   where: "terminal",
              done: function () { return world.visited["/var/log/anchor.log"]; } },

            /* --- middle: three logic problems, each one visible --- */
            { id: "fog",      where: "terminal",
              done: function () { return !!world.repaired["room-fog"]; } },

            /* The investigation beat: the script has a blank where a number
               belongs, and that number is only legible off a plate on the
               wall. Two steps, because reading both instruments is the
               work — the typing afterwards is thirty seconds. */
            { id: "gauges",   where: "gauge2",
              done: function () { return !!world.examined.gauge1 && !!world.examined.gauge2; } },

            { id: "interlock", where: "terminal",
              done: function () { return !!world.repaired["room-interlock"]; } },

            { id: "plate2",   where: "pylon2",
              done: function () { return !!world.examined.pylon2; } },

            { id: "doorctl",  where: "terminal",
              done: function () { return !!world.repaired["room-door"]; } },

            /* --- story: what he has been doing here, and to whom --- */
            { id: "sessions", where: "terminal",
              done: function () { return !!world.repaired["room-sessions"]; } },

            { id: "seen",     where: "terminal",
              done: function () { return world.visited["/var/log/session.log"]; } },

            { id: "anchors",  where: "terminal",
              done: function () { return !!world.repaired["room-anchors"]; } },

            { id: "recover",  where: "terminal",
              done: function () { return world.aliceState === "alive"; } },

            /* The climax: she is back, and the airlock still will not let
               either of them out until its protocol is broken by hand. */
            { id: "override", where: "terminal",
              done: function () { return !!world.lockOverridden; } },

            { id: "door",     where: "door",
              done: function () { return !!world.doorOpened; } }
        ];

        function currentQuest() {
            return QUESTS[Math.min(world.questIdx, QUESTS.length - 1)];
        }
        function questObjective() {
            if (world.questIdx >= QUESTS.length) return ot("q.done");
            return ot("q." + currentQuest().id);
        }

        /* Walk the chain forward as far as it will go — several steps can
           complete at once if the player is ahead of the story. */
        function checkQuests() {
            /* Walk forward over anything already satisfied... */
            let moved = false;
            while (world.questIdx < QUESTS.length && QUESTS[world.questIdx].done()) {
                const q = QUESTS[world.questIdx];
                world.questIdx++;
                moved = true;
                emit("quest", { done: q.id, next: currentQuest().id,
                                objective: questObjective() });
            }
            /* ...then look ahead. The room is open and the shell takes any
               command in any order, so a player can easily finish step 5
               before step 1 — in which case a strictly linear chain would
               sit there asking them to read a file they no longer need.
               Jump past the furthest step that is already done. */
            for (let i = QUESTS.length - 1; i >= world.questIdx; i--) {
                if (QUESTS[i].done()) {
                    const q = QUESTS[i];
                    world.questIdx = i + 1;
                    moved = true;
                    emit("quest", { done: q.id, next: currentQuest().id,
                                    objective: questObjective() });
                    break;
                }
            }
            if (moved) emit("world", { what: "quest" });
            return moved;
        }

        /* ============================================================
           MEMORY
           ------------------------------------------------------------
           Neikon cannot be handed a file he does not know exists. Things
           he finds *in the room* bring back the memory, and the memory
           is what puts the file on the disk.
           ============================================================ */
        const MEMORIES = {
            anchor: function () {
                const log = lookup("/var/log");
                if (log && log.node.kids && !log.node.kids["anchor.log"]) {
                    log.node.kids["anchor.log"] = file(ot("log.anchor"), { mode: "r--" });
                }
            },
            core: function () {
                const st = lookup("/etc/alice/lucidity.state");
                if (st) {
                    st.node.broken = false;
                    st.node.body = ot("plate.pylon2");
                }
            },
            /* Restoring the session log is the turn of the episode: the
               room stops being a place he woke up in once and becomes a
               place he has woken up in forty-seven times. It has to be a
               real file he can re-read, or the reveal is just a line of
               dialogue that scrolls away. */
            sessions: function () {
                const log = lookup("/var/log");
                if (log && log.node.kids && !log.node.kids["session.log"]) {
                    log.node.kids["session.log"] = file(ot("log.sessions"), { mode: "r--" });
                }
                const hist = lookup("/home/neikon/notes");
                if (hist && hist.node.kids && !hist.node.kids["04-again.txt"]) {
                    hist.node.kids["04-again.txt"] = file(ot("note.again"));
                }
            }
        };

        function remember(key) {
            if (world.remembered[key]) return false;
            world.remembered[key] = true;
            if (MEMORIES[key]) MEMORIES[key]();
            emit("remember", { key: key, line: ot("remember." + key) });
            checkQuests();
            return true;
        }

        /* the player walked up to something and pressed E */
        function examine(id) {
            if (id === "pylon1" || id === "pylon2") {
                const lit = (id === "pylon1") ? world.lamps.lamp1 : world.lamps.lamp2;
                if (!lit) return { cls: "sys", lines: ot("world.pylonDark").split("\n") };
                const first = !world.examined[id];
                world.examined[id] = true;
                const out = { cls: "out", lines: ot("plate." + id).split("\n") };
                if (first) remember(id === "pylon1" ? "anchor" : "core");
                checkQuests();
                return out;
            }
            /* The wall instruments. Gated on lamp1 for the same reason the
               pylons are: an unpowered dial in an unlit room has nothing to
               tell anyone. The reading is substituted at read time rather
               than baked into a file, because it is generated per run. */
            if (id === "gauge1" || id === "gauge2") {
                if (!world.lamps.lamp1) {
                    return { cls: "sys", lines: ot("world.gaugeDark").split("\n") };
                }
                const first = !world.examined[id];
                world.examined[id] = true;
                const val = (id === "gauge1") ? world.gauges.pressure : world.gauges.vent;
                const out = {
                    cls: "out",
                    lines: ot("plate." + id).replace(/\{v\}/g, val.toFixed(1)).split("\n")
                };
                if (first) remember(id === "gauge1" ? "pressure" : "vent");
                checkQuests();
                return out;
            }
            if (id === "door") {
                if (!world.lockOverridden) {
                    return { cls: "warn", lines: ot("world.doorLook").split("\n") };
                }
                world.doorOpened = true;
                checkQuests();
                emit("doorOpen", {});
                return { cls: "ok", lines: [] };
            }
            return null;
        }


        /* ============================================================
           WORLD CORRUPTION
           ------------------------------------------------------------
           Every anomaly here is a rendering variation of geometry the
           scene already owns. `dup` draws the existing door mesh a few
           more times; `ghost` draws the existing pylon mesh at wrong
           coordinates. Nothing is allocated, so the caps below are a
           readability limit, not a safety net — the safety is that there
           is no growth to bound in the first place.
           ============================================================ */
        const GLITCH_CAPS = { dup: 5, ghost: 4 };

        const GLITCH_KINDS = {
            /* leak / unbounded allocation: the room keeps a copy of
               everything it was told to forget */
            dup:     { counted: true,  cause: "leak" },
            /* no exit condition: the door never finishes, faster and
               faster, and never gets anywhere */
            loop:    { counted: false, cause: "infinite-loop" },
            /* null dereference: the lights reach for something that is
               not there and go out */
            flicker: { counted: false, cause: "null-deref" },
            /* write past the end of the buffer: pylons stand in places
               nobody ever built a pylon */
            ghost:   { counted: true,  cause: "overflow" },
            /* wrong comparison: the floor and the geometry stop
               agreeing about where things are */
            drift:   { counted: false, cause: "bad-compare" }
        };

        function spawnGlitch(kind, taskId) {
            const def = GLITCH_KINDS[kind];
            if (!def) return false;
            const g = world.glitches;
            if (def.counted) {
                const cap = GLITCH_CAPS[kind] || 3;
                if (g[kind] >= cap) return false;      // hard ceiling
                g[kind]++;
            } else {
                if (g[kind]) return false;             // already on
                g[kind] = 1;
            }
            if (taskId) (g.by[taskId] = g.by[taskId] || []).push(kind);
            emit("glitch", { kind: kind, cause: def.cause, level: g[kind] });
            emit("world", { what: "glitch" });
            return true;
        }

        /* repairing the region that caused it takes it back out of the
           room — consequences are reversible, which is what makes them
           feel like a system rather than a punishment */
        function clearGlitchesFor(taskId) {
            const g = world.glitches;
            const list = g.by[taskId] || [];
            list.forEach(function (kind) {
                if (GLITCH_KINDS[kind] && GLITCH_KINDS[kind].counted) {
                    g[kind] = Math.max(0, g[kind] - 1);
                } else {
                    g[kind] = 0;
                }
            });
            delete g.by[taskId];
            if (list.length) {
                emit("glitch", { kind: "cleared", cause: taskId, level: 0 });
                emit("world", { what: "glitch" });
            }
            return list.length;
        }

        function glitchReport() {
            const g = world.glitches;
            const rows = [];
            Object.keys(GLITCH_KINDS).forEach(function (k) {
                if (g[k]) rows.push("  " + k.padEnd(9) + " x" + g[k] +
                                    "   (" + GLITCH_KINDS[k].cause + ")");
            });
            return rows;
        }

        /* ---------- services ---------------------------------------- */
        const SERVICES = {
            lamp0: { key: "svc.lamp0", world: "lamp"  },
            lamp1: { key: "svc.lamp1", world: "lamp"  },
            lamp2: { key: "svc.lamp2", world: "lamp"  },
            door0: { key: "svc.door0", world: "door"  },
            alice: { key: "svc.alice", world: "alice" }
        };
        function svcState(name) {
            if (/^lamp[012]$/.test(name)) return world.lamps[name] ? "UP" : "DOWN";
            if (name === "door0") return world.door === "loop" ? "LOOPING"
                                       : world.door === "open" ? "OPEN" : "HALTED";
            if (name === "alice") return world.aliceState === "alive" ? "UP" : "DEAD";
            return "?";
        }

        /* ---------- output helpers ---------------------------------- */
        function ok(lines)   { return { cls: "out",  lines: [].concat(lines) }; }
        function warn(lines) { return { cls: "warn", lines: [].concat(lines) }; }
        function bad(lines)  { return { cls: "bad",  lines: [].concat(lines) }; }
        function sys(lines)  { return { cls: "sys",  lines: [].concat(lines) }; }

        /* ---------- commands ---------------------------------------- */
        const CMDS = {};

        CMDS.help = function () {
            return ok([
                ot("help.title"),
                "",
                "  ls [path]        cd <path>       pwd",
                "  cat <file>       head <file>     grep <text> <file>",
                "  tree [path]      find <name>     stat <path>",
                "  svc list|start|stop|restart <name>",
                "  set <key> <val>  write /etc/void.conf and apply it",
                "  fsck [device]    edit <path>     run <path>",
                "  ps               dmesg           df",
                "  man <topic>      history         clear",
                ot("help.look"),
                ot("help.exit"),
                "",
                ot("help.hotkeys"),
                "",
                ot("help.start")
            ]);
        };

        CMDS.pwd = function () { return ok(cwd); };

        CMDS.ls = function (args) {
            const target = args[0] || cwd;
            const hit = lookup(target);
            if (!hit) return bad("ls: " + target + ": no such file or directory");
            if (hit.node.t === "f") return ok(fmtRow(hit.path.split("/").pop(), hit.node));
            const kids = hit.node.kids;
            const showHidden = args.indexOf("-a") >= 0;
            const names = Object.keys(kids).filter(function (n) {
                return showHidden || !kids[n].hidden;
            }).sort();
            if (!names.length) return sys("(empty)");
            return ok(names.map(function (n) { return fmtRow(n, kids[n]); }));
        };
        function fmtRow(name, node) {
            const kind = node.t === "d" ? "d" : (node.dev ? "c" : "-");
            const mode = node.t === "d" ? "rwx" : (node.mode || "rw-");
            const flag = node.broken ? "  ** CORRUPT **" : "";
            return kind + mode + "  " + (node.t === "d" ? name + "/" : name) + flag;
        }

        CMDS.cd = function (args) {
            const target = args[0] || "/home/neikon";
            const hit = lookup(target);
            if (!hit) return bad("cd: " + target + ": no such file or directory");
            if (hit.node.t !== "d") return bad("cd: " + target + ": not a directory");
            cwd = hit.path;
            return ok([]);
        };

        CMDS.cat = function (args) {
            if (!args.length) return bad("cat: which file?");
            const hit = lookup(args[0]);
            if (!hit) return bad("cat: " + args[0] + ": no such file or directory");
            if (hit.node.t === "d") return bad("cat: " + args[0] + ": is a directory");
            world.visited[hit.path] = true;
            emit("read", { path: hit.path });
            checkQuests();
            if (hit.node.broken && hit.node.taskId) {
                return warn([ot("out.corrupt"), ""]
                    .concat(hit.node.body.split("\n"), ["", ot("out.repairWith") + hit.path]));
            }
            return ok(hit.node.body.split("\n"));
        };
        CMDS.head = function (args) {
            const r = CMDS.cat(args);
            if (r.cls !== "out" && r.cls !== "warn") return r;
            return { cls: r.cls, lines: r.lines.slice(0, 12) };
        };

        CMDS.tree = function (args) {
            const hit = lookup(args[0] || cwd);
            if (!hit) return bad("tree: no such path");
            const lines = [];
            (function walk(node, prefix, name) {
                lines.push(prefix + name + (node.t === "d" ? "/" : (node.broken ? "  ** CORRUPT **" : "")));
                if (node.t !== "d") return;
                const names = Object.keys(node.kids).filter(function (n) { return !node.kids[n].hidden; }).sort();
                names.forEach(function (n, i) {
                    walk(node.kids[n], prefix + "   ", (i === names.length - 1 ? "`- " : "|- ") + n);
                });
            })(hit.node, "", hit.path === "/" ? "/" : hit.path.split("/").pop());
            return ok(lines);
        };

        CMDS.find = function (args) {
            if (!args.length) return bad("find: what am i looking for?");
            const needle = args[0].toLowerCase();
            const hits = [];
            (function walk(node, path) {
                if (node.t === "d") {
                    Object.keys(node.kids).forEach(function (n) {
                        walk(node.kids[n], path === "/" ? "/" + n : path + "/" + n);
                    });
                } else if (path.toLowerCase().indexOf(needle) >= 0) {
                    hits.push(path + (node.broken ? "  ** CORRUPT **" : ""));
                }
            })(ROOT, "/");
            return hits.length ? ok(hits) : sys("find: nothing matches '" + args[0] + "'");
        };

        CMDS.grep = function (args) {
            if (args.length < 2) return bad("grep: grep <text> <file>");
            const hit = lookup(args[1]);
            if (!hit || hit.node.t !== "f") return bad("grep: " + args[1] + ": no such file");
            const needle = args[0].toLowerCase();
            const found = hit.node.body.split("\n").filter(function (l) {
                return l.toLowerCase().indexOf(needle) >= 0;
            });
            return found.length ? ok(found) : sys("grep: no match");
        };

        CMDS.stat = function (args) {
            if (!args.length) return bad("stat: which path?");
            const hit = lookup(args[0]);
            if (!hit) return bad("stat: " + args[0] + ": no such file or directory");
            const n = hit.node;
            const out = [
                "  path    " + hit.path,
                "  type    " + (n.t === "d" ? "directory" : (n.dev ? "character device" : "regular file")),
                "  mode    " + (n.t === "d" ? "rwx" : (n.mode || "rw-")),
                "  size    " + (n.t === "d" ? Object.keys(n.kids).length + " entries" : n.body.length + " bytes")
            ];
            if (n.dev)    out.push("  state   " + svcState(n.dev));
            if (n.broken) out.push("  health  CORRUPT — see fsck");
            return ok(out);
        };

        CMDS.svc = function (args) {
            const sub = (args[0] || "list").toLowerCase();
            if (sub === "list") {
                return ok(["  SERVICE   STATE      DESCRIPTION"].concat(
                    Object.keys(SERVICES).map(function (n) {
                        const st = svcState(n);
                        return "  " + n.padEnd(9) + " " + st.padEnd(10) + " " + ot(SERVICES[n].key);
                    })
                ));
            }
            const name = args[1];
            if (!name || !SERVICES[name]) return bad("svc: unknown service '" + (name || "") + "' (try: svc list)");

            if (/^lamp[012]$/.test(name)) {
                if (name === "lamp0" && sub === "stop") {
                    anomaly(8, "lamp0 stopped — the desk went dark");
                    world.lamps.lamp0 = false;
                    syncConfFile(); emit("world", { what: "lamp", id: "lamp0", on: false });
                    return bad(["lamp0: stopped.", ot("out.lamp0Off")]);
                }
                const up = sub === "start" || sub === "restart";
                world.lamps[name] = up;
                syncConfFile();
                checkQuests();
                emit("world", { what: "lamp", id: name, on: up });
                return up
                    ? ok(["lamp: " + name + " up.", ot("out.lampUp")])
                    : sys("lamp: " + name + " down.");
            }

            if (name === "door0") {
                if (sub === "stop" || sub === "halt") {
                    world.door = "halted";
                    syncConfFile(); emit("world", { what: "door", state: "halted" });
                    return warn(["door0: load loop halted.", ot("out.doorHalt")]);
                }
                if (sub === "start" || sub === "restart") {
                    if (allRepaired()) {
                        world.door = "open";
                        syncConfFile(); emit("world", { what: "door", state: "open" });
                        return ok(["door0: loaded. it is open.", ot("out.doorOpen")]);
                    }
                    world.door = "loop";
                    syncConfFile(); emit("world", { what: "door", state: "loop" });
                    return warn(["door0: retrying...", "door0: load aborted at 60% — initrd.img is corrupt.", ot("out.doorLoop")]);
                }
            }

            if (name === "alice") {
                if (world.aliceState === "alive") return ok("alice: already up.");
                return bad(["alice: refused — /dev/alice is corrupt.", ot("out.aliceDead")]);
            }
            return bad("svc: cannot " + sub + " " + name);
        };

        CMDS.set = function (args) {
            if (args.length < 2) return bad("set: set <key> <value>   (see /etc/void.conf)");
            const res = applyConfLine(args[0], args.slice(1).join(" "));
            syncConfFile();
            return /refused|unknown|wants|read-only/.test(res) ? warn(res) : ok(res);
        };

        CMDS.fsck = function (args) {
            const target = args.filter(function (a) { return a.charAt(0) !== "-"; })[0];
            const quiet = args.indexOf("--quiet") >= 0;
            const broken = [];
            (function walk(node, path) {
                if (node.t === "d") {
                    Object.keys(node.kids).forEach(function (n) {
                        walk(node.kids[n], path === "/" ? "/" + n : path + "/" + n);
                    });
                } else if (node.broken) broken.push({ path: path, node: node });
            })(ROOT, "/");

            if (quiet) return broken.length ? bad([]) : ok([]);
            if (target && target !== "/dev/alice" && target !== "alice") {
                const hit = lookup(target);
                if (!hit) return bad("fsck: " + target + ": no such device");
            }
            world.ranFsck = true;
            if (!broken.length) {
                return ok(["fsck: /dev/alice clean.", ot("out.fsckClean"),
                           "//   run /home/neikon/recover.sh"]);
            }
            return warn(["fsck: /dev/alice — " + broken.length + " unreadable region(s):", ""].concat(
                broken.map(function (b) {
                    return "  " + b.path + (b.node.taskId ? ot("out.repairable") + b.path + "]" : ot("out.rebuilds"));
                }),
                ["", ot("out.fsckDirty")]
            ));
        };

        CMDS.edit = function (args) {
            if (!args.length) return bad("edit: which region?");
            const hit = lookup(args[0]);
            if (!hit) return bad("edit: " + args[0] + ": no such file");
            if (!hit.node.taskId) return warn(ot("out.editNotRegion"));
            if (world.repaired[hit.node.taskId]) return sys("edit: " + hit.path + " is already clean.");
            emit("edit", { path: hit.path, taskId: hit.node.taskId });
            return sys("edit: opening " + hit.path + " ...");
        };

        CMDS.run = function (args) {
            if (!args.length) return bad("run: run what?");
            const hit = lookup(args[0]);
            if (!hit) return bad("run: " + args[0] + ": not found");
            if (hit.node.script === "recover") {
                if (!allRepaired()) {
                    return bad(["recover.sh: fsck still reports damage — refusing.",
                                ot("out.recoverRefuse")]);
                }
                emit("recover", {});
                return ok(["recover.sh: rebuilding /dev/alice from clean regions ..."]);
            }
            if ((hit.node.mode || "").indexOf("x") < 0) {
                return bad("run: " + hit.path + ": not executable");
            }
            anomaly(7, "executed an unknown binary: " + hit.path);
            return bad(["run: " + hit.path + ": segmentation fault", ot("out.runSegv")]);
        };

        CMDS.rm = function (args) {
            if (!args.length) return bad("rm: what?");
            const hit = lookup(args[0]);
            if (!hit) return bad("rm: " + args[0] + ": no such file");
            if (hit.node.dev) {
                anomaly(12, "removed a live device node: " + hit.path);
                return bad(["rm: " + hit.path + ": device is live.", ot("out.rmDevice")]);
            }
            if (hit.node.taskId && !world.repaired[hit.node.taskId]) {
                anomaly(15, "deleted a corrupt region before repairing it: " + hit.path);
                return bad(["rm: " + hit.path + " removed.", ot("out.rmRegion")]);
            }
            const p = parentOf(hit.path);
            if (p && p.parent.kids[p.base]) delete p.parent.kids[p.base];
            return sys("rm: " + hit.path + " removed.");
        };

        CMDS.ps = function () {
            const rows = [
                "  PID  STATE  COMMAND",
                "    1  S      /sbin/systemd-alice",
                "   88  S      crystal-shell --compositor=soft",
                "  141  " + (world.door === "loop" ? "R      [door0-loader] <retrying>" : "S      [door0-loader] <idle>"),
                "  204  " + (world.aliceState === "alive" ? "S      alice_core --tty /dev/alice" : "Z      alice_core <defunct>")
            ];
            if (world.corruption > 30) rows.push("  ???  R      " + (world.corruption > 60 ? "[unknown] <near>" : "[unknown] <walking>"));
            return ok(rows);
        };

        CMDS.dmesg = function () {
            const hit = lookup("/var/log/kern.log");
            const extra = [];
            glitchReport().forEach(function (r) {
                extra.push("[ " + (300 + Math.random() * 99).toFixed(3) + "] geometry: " + r.trim());
            });
            if (world.corruption > 20) extra.push("[ " + (400 + world.corruption).toFixed(3) + "] anomaly: unregistered entity in volume");
            if (world.corruption > 55) extra.push("[ " + (500 + world.corruption).toFixed(3) + "] anomaly: entity approaching /dev/lamp0");
            return warn(hit.node.body.split("\n").concat(extra));
        };

        CMDS.df = function () {
            const dmg = (world.tasks || []).filter(function (t) { return !world.repaired[t.id]; }).length;
            return ok([
                "  VOLUME        SIZE   USED   STATE",
                "  /             1.4T   0.9T   ok",
                "  /dev/alice    128G   128G   " + (dmg ? "DEGRADED (" + dmg + " regions)" : "clean"),
                "  anomaly                     " + Math.round(world.corruption) + " / 45"
            ]);
        };

        CMDS.man = function (args) {
            const topic = (args[0] || "").toLowerCase();
            const pages = world.manPages || {};
            if (!topic) return ok(["man: topics — " + Object.keys(pages).join(", ")]);
            if (!pages[topic]) return bad("man: no manual entry for '" + topic + "'");
            return ok(pages[topic].split("\n"));
        };

        CMDS.history = function () {
            return ok(history.length ? history.map(function (h, i) {
                return "  " + String(i + 1).padStart(3, " ") + "  " + h;
            }) : ["(nothing yet)"]);
        };

        CMDS.whoami = function () {
            return ok([
                "neikon",
                "uid=1000  groups=wheel,void",
                "session started " + Math.round(120 + world.corruption * 4) + " s ago",
                world.aliceState === "alive" ? ot("out.whoamiAlice") : ot("out.whoamiAlone")
            ]);
        };

        CMDS.uname = function () {
            return ok("void 6.9.0-alice #1 SMP PREEMPT_DYNAMIC crystalfs x86_64");
        };

        return {
            boot: function (diff, tasks) {
                world.tasks = tasks;
                world.repaired = {};
                world.visited = {};
                world.corruption = 0;
                /* Thick on purpose: brightness is exp(-dist * density), so
                   0.11 leaves the desk lamp readable at 7.8 m (42%) while
                   the door at 23.6 m sinks to 7% — a smear the player has
                   to clear before the room reads as a room at all. The fog
                   task takes it to 0.02, and the arithmetic in the script
                   is the arithmetic here: 0.11 − 3 × 0.03. */
                world.fog = 0.11;
                world.lamps = { lamp0: true, lamp1: false, lamp2: false };
                world.door = "loop";
                world.aliceState = "dead";
                world.lastLine   = "";
                world.lastOut    = [];
                world.questIdx   = 0;
                world.examined   = {};
                world.remembered = {};
                world.ranFsck    = false;
                world.doorOpened = false;
                world.anchorsBound = false;
                world.glitches   = { dup: 0, loop: 0, flicker: 0, ghost: 0, drift: 0, by: {} };
                /* The interlock numbers. Generated per run and written
                   down nowhere on disk — the only copy is on the two wall
                   instruments, so the puzzle cannot be solved, guessed or
                   memorised from the chair. `pressure` is always the lower
                   of the two, so the safety condition passes once the
                   player has transcribed the limit correctly. */
                /* The tenth is never zero. A limit that reads "3.0" invites
                   the player to type "3", which is the same number and a
                   failed check — the puzzle is the trip to the wall, not a
                   guess about formatting. */
                const vent = (2 + Math.floor(Math.random() * 3))
                           + (1 + Math.floor(Math.random() * 9)) / 10;
                world.gauges = {
                    vent:     Math.round(vent * 10) / 10,
                    pressure: Math.round((vent - (0.6 + Math.random() * 0.8)) * 10) / 10
                };
                world.interlock  = "held";
                world.lockOverridden = false;
                world.room       = { w: 16, d: 26, h: 5, barrier: 4 };
                buildFs(diff, tasks);
                /* The conf file ships as a template with the opening values
                   written into it. Sync once here so a replay cannot leave
                   `cat /etc/void.conf` disagreeing with the room. */
                syncConfFile();
                emit("world", { what: "boot" });
            },
            exec: function (raw) {
                const line = String(raw || "").trim();
                if (!line) return { cls: "out", lines: [] };
                history.push(line);
                world.lastLine = line;
                const parts = line.split(/\s+/);
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);

                let res;
                if (CMDS[cmd]) res = CMDS[cmd](args);
                else if (cmd === "clear" || cmd === "exit" || cmd === "look") res = { cls: "sys", lines: [], signal: cmd };
                else {
                    anomaly(2, "unknown command: " + cmd);
                    res = bad([cmd + ": command not found", ot("out.unknownCmd")]);
                }
                world.lastOut = (res.lines || []).slice(-4);
                emit("exec", { line: line, res: res });
                return res;
            },
            /* the repair pane reports back through here */
            /* `effect` is what the fixed script does to the room. The OS
               applies it here so a click in the repair pane and a hand-run
               of the same script end up in exactly the same state. */
            applyEffect: function (effect) {
                if (!effect) return;
                if (effect.lamp) {
                    world.lamps[effect.lamp] = !!effect.on;
                    syncConfFile();
                    emit("world", { what: "lamp", id: effect.lamp, on: !!effect.on });
                }
                if (typeof effect.barrier === "number") {
                    world.room.barrier = effect.barrier;
                    syncConfFile();
                    emit("world", { what: "barrier", panels: effect.barrier });
                }
                if (effect.door) {
                    world.door = effect.door;
                    syncConfFile();
                    emit("world", { what: "door", state: effect.door });
                }
                if (typeof effect.fog === "number") {
                    world.fog = effect.fog;
                    syncConfFile();
                    emit("world", { what: "fog", value: effect.fog });
                }
                if (effect.sessions) {
                    /* The twist lands as a file, not as a cutscene: the
                       recovered log is readable, and it says he has been
                       here forty-seven times. */
                    world.sessionsRestored = true;
                    remember("sessions");
                    syncConfFile();
                    emit("world", { what: "sessions" });
                }
                if (effect.anchors) {
                    world.anchorsBound = true;
                    syncConfFile();
                    emit("world", { what: "anchors" });
                }
                if (effect.interlock) {
                    world.interlock = "released";
                    emit("world", { what: "interlock" });
                }
                if (effect.unlocked) {
                    /* The last thing the episode does before it drops the
                       floor out: the airlock protocol gives up and the door
                       finally reads OPEN. Nothing else in the run sets it. */
                    world.lockOverridden = true;
                    world.door = "open";
                    syncConfFile();
                    emit("world", { what: "door", state: "open" });
                }
                checkQuests();
            },
            repairDone: function (taskId, path) {
                world.repaired[taskId] = true;
                clearGlitchesFor(taskId);
                const hit = lookup(path);
                if (hit) { hit.node.broken = false; }
                if (allRepaired()) {
                    const initrd = lookup("/boot/initrd.img");
                    if (initrd) initrd.node.broken = false;
                    const luc = lookup("/etc/alice/lucidity.state");
                    if (luc) luc.node.broken = false;
                }
                world.corruption = Math.max(0, world.corruption - 6);
                checkQuests();
                emit("repair", { taskId: taskId, all: allRepaired() });
                emit("corruption", { value: world.corruption, delta: -6 });
            },
            repairFailed: function (taskId) {
                anomaly(9, "failed repair on region " + taskId);
            },
            aliceAlive: function () {
                world.aliceState = "alive";
                /* Getting her back no longer opens the way out. The airlock
                   is still held by its own security protocol, and breaking
                   that is the last thing the episode asks for — so the door
                   stays where doorctl left it until the override runs. */
                world.lamps.lamp1 = true;
                world.lamps.lamp2 = true;
                world.corruption = 0;
                syncConfFile();
                checkQuests();
                emit("world", { what: "alice" });
            },
            anomaly: anomaly,
            allRepaired: allRepaired,
            /* --- investigation --- */
            examine: examine,
            remember: remember,
            spawnGlitch: spawnGlitch,
            clearGlitchesFor: clearGlitchesFor,
            glitchReport: glitchReport,
            glitchCaps: GLITCH_CAPS,
            questObjective: questObjective,
            currentQuest: currentQuest,
            questWhere: function () {
                return world.questIdx >= QUESTS.length ? "door" : currentQuest().where;
            },
            checkQuests: checkQuests,
            /* The player can change language from the settings popup at any
               moment. Rebuild every prose node in place — progress, damage
               and the anomaly log all live outside these bodies, so nothing
               is lost by rewriting them. */
            relocalize: function () {
                if (!ROOT) return;
                const put = function (path, key) {
                    const hit = lookup(path);
                    if (hit && hit.node.t === "f") hit.node.body = ot(key);
                };
                put("/home/neikon/readme.txt",           "readme");
                put("/home/neikon/notes/01-the-room.txt", "note.room");
                put("/home/neikon/notes/02-the-door.txt", "note.door");
                put("/home/neikon/notes/03-alice.txt",    "note.alice");
                put("/home/neikon/recover.sh",           "recover.sh");
                put("/home/neikon/.bash_history",        "history");
                put("/etc/alice/personality.cfg",        "personality");
                put("/var/log/alice.log",                "log.alice");
                put("/dev/alice", "dev.alice"); put("/dev/door0", "dev.door0");
                put("/dev/lamp0", "dev.lamp0"); put("/dev/lamp1", "dev.lamp1");
                put("/dev/lamp2", "dev.lamp2");
                put("/etc/void.conf", "conf");
                if (world.remembered.anchor) put("/var/log/anchor.log", "log.anchor");
                if (world.remembered.core)   put("/etc/alice/lucidity.state", "plate.pylon2");
                syncConfFile();
                world.manPages = {
                    "svc": ot("man.svc"), "set": ot("man.set"), "fsck": ot("man.fsck"),
                    "edit": ot("man.edit"), "recover": ot("man.recover"), "anomaly": ot("man.anomaly")
                };
                emit("world", { what: "locale" });
            },
            /* --- graphical-layer access to the same volume ---
               Files, Notepad and Система read and write through these,
               so a click and a typed command land on the same nodes. */
            list: function (path) {
                const hit = lookup(path);
                if (!hit || hit.node.t !== "d") return null;
                const kids = hit.node.kids;
                return Object.keys(kids).sort().map(function (n) {
                    const k = kids[n];
                    return {
                        name: n,
                        path: (hit.path === "/" ? "" : hit.path) + "/" + n,
                        kind: k.t === "d" ? "dir" : (k.dev ? "dev" : "file"),
                        broken: !!k.broken,
                        taskId: k.taskId || null,
                        hidden: !!k.hidden,
                        meta: k.t === "d"
                            ? Object.keys(k.kids).length + " items"
                            : (k.dev ? svcState(k.dev) : k.body.length + " B")
                    };
                }).filter(function (r) { return !r.hidden; });
            },
            readFile: function (path) {
                const hit = lookup(path);
                if (!hit || hit.node.t === "d") return null;
                world.visited[hit.path] = true;
                return {
                    path: hit.path,
                    body: hit.node.body,
                    readonly: (hit.node.mode || "rw-").indexOf("w") < 0 || !!hit.node.dev,
                    broken: !!hit.node.broken,
                    taskId: hit.node.taskId || null
                };
            },
            writeFile: function (path, body) {
                const hit = lookup(path);
                if (!hit || hit.node.t === "d") return "write: no such file";
                if ((hit.node.mode || "rw-").indexOf("w") < 0) return "write: read-only";
                hit.node.body = body;
                /* hand-editing the volume descriptor applies it, same as `set` */
                if (hit.node.conf) {
                    body.split("\n").forEach(function (line) {
                        const m = /^\s*([a-z0-9.]+)\s*=\s*([^#\s]+)/i.exec(line);
                        if (m) applyConfLine(m[1], m[2]);
                    });
                    emit("world", { what: "conf" });
                }
                emit("write", { path: hit.path });
                return "saved " + hit.path;
            },
            cwd: function () { return cwd; },
            world: world,
            onChange: onChange,
            complete: function (prefix) {
                const names = Object.keys(CMDS).concat(["clear", "exit", "look"]);
                return names.filter(function (n) { return n.indexOf(prefix) === 0; });
            },
            pathComplete: function (prefix) {
                const i = prefix.lastIndexOf("/");
                const dirPart = i < 0 ? cwd : (i === 0 ? "/" : prefix.slice(0, i));
                const base = i < 0 ? prefix : prefix.slice(i + 1);
                const hit = lookup(dirPart);
                if (!hit || hit.node.t !== "d") return [];
                return Object.keys(hit.node.kids)
                    .filter(function (n) { return n.indexOf(base) === 0; })
                    .map(function (n) { return (i < 0 ? "" : dirPart.replace(/\/$/, "") + "/") + n; });
            }
        };
    })();
