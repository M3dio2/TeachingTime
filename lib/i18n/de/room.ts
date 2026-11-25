import type { Device, room as en } from "../en/room";

// The fallback names ("dein Schüler", "deine Lehrkraft") change with the case; real names don't.
const DATIVE: Record<string, string> = { "dein schüler": "deinem Schüler", "deine lehrkraft": "deiner Lehrkraft" };
const ACCUSATIVE: Record<string, string> = { "dein schüler": "deinen Schüler" };
const dat = (name: string) => DATIVE[name.toLowerCase()] ?? name;
const acc = (name: string) => ACCUSATIVE[name.toLowerCase()] ?? name;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const the = (d: Device) =>
  d === "camera" ? "die Kamera" : d === "microphone" ? "das Mikrofon" : "Kamera und Mikrofon";
const your = (d: Device) =>
  d === "camera" ? "Deine Kamera" : d === "microphone" ? "Dein Mikrofon" : "Deine Kamera oder dein Mikrofon";

export const room: typeof en = {
  gettingReady: "Deine Lektion wird vorbereitet",
  leavingLesson: "Lektion wird verlassen",
  joining: "Wird verbunden…",
  continueHere: "Hier weitermachen",
  backToDashboard: "Zurück zur Übersicht",

  joinTitle: { before: "Zu deiner ", marked: "Lektion", after: "" },
  joinIntro: "Kamera prüfen, Namen eingeben, und los geht’s.",
  yourName: "Dein Name",
  namePlaceholder: "z. B. Anna",
  joinLesson: "Lektion beitreten",
  allowDevices: "Wenn dein Browser fragt, erlaube Kamera und Mikrofon.",
  couldNotJoin: "Beitreten hat nicht geklappt",

  endedTitle: "Bis zum nächsten Mal!",
  endedText: "Die Lektion ist beendet. Du kannst diese Seite schließen.",
  replacedTitle: "Du bist dieser Lektion woanders beigetreten.",
  replacedText:
    "Die Lektion ist auf einem anderen Gerät oder Tab offen. Schließ diese Seite oder mach hier weiter, um die Lektion hierher zu holen.",
  leftTitle: "Du hast die Lektion verlassen",
  rejoin: "Wieder beitreten",
  leftText: "Aus Versehen? Tritt mit demselben Namen wieder bei.",

  couldNotStart: "Die Lektion konnte nicht starten",
  cantStartTitle: "Diese Lektion kann nicht starten",
  replacedTabTitle: "Du bist dieser Lektion in einem anderen Tab beigetreten.",
  replacedTabText: "Schließ diesen Tab oder mach hier weiter, dann wird der andere verlassen.",

  yourCamera: "Deine Kamera",
  startingCamera: "Kamera wird gestartet…",
  turnOffMic: "Mikrofon ausschalten",
  turnOnMic: "Mikrofon einschalten",
  turnOffCam: "Kamera ausschalten",
  turnOnCam: "Kamera einschalten",

  device: {
    blocked: (d) =>
      `Dein Browser hat ${the(d)} blockiert. Klick auf das Symbol links in der Adressleiste, erlaube ${the(d)} und lade die Seite neu. Ist der Zugriff dort schon erlaubt, erlaube ihn deinem Browser in den Datenschutzeinstellungen deines Computers (Mac: Systemeinstellungen → Datenschutz & Sicherheit → Kamera / Mikrofon).`,
    notFound: (d) =>
      d === "camera"
        ? "Keine Kamera gefunden. Prüfe, ob sie angeschlossen ist, und lade die Seite neu."
        : d === "microphone"
          ? "Kein Mikrofon gefunden. Prüfe, ob es angeschlossen ist, und lade die Seite neu."
          : "Keine Kamera oder kein Mikrofon gefunden. Prüfe, ob alles angeschlossen ist, und lade die Seite neu.",
    inUse: (d) =>
      `${your(d)} wird gerade von einer anderen App verwendet (zum Beispiel Zoom oder Teams). Schließ diese App und lade die Seite neu.`,
    failed: (d) => `${your(d)} konnte nicht gestartet werden. Lade die Seite neu, um es noch einmal zu versuchen.`,
  },

  reconnecting: "Verbindung unterbrochen. Neu verbinden…",
  mutedByTeacher: "Deine Lehrkraft hat dein Mikrofon stummgeschaltet. Klick auf den Mikrofon-Button, um wieder zu sprechen.",
  waitingForStudent: "Warte auf deinen Schüler. Schick ihm den Link für Schüler.",
  waitingForTeacher: "Warte auf deine Lehrkraft…",
  dismiss: "Ausblenden",
  connectionError: "Mit der Verbindung ist etwas schiefgelaufen. Prüfe dein Internet und lade neu.",
  muteFailed: "Stummschalten hat nicht geklappt. Bitte versuch es noch einmal.",
  lessonEndsSoon: (minutes, hours) =>
    `Diese Lektion endet in ${minutes} Minuten: Solange TeachingTime kostenlos ist, dauert eine Lektion höchstens ${hours} Stunden. Danach kannst du sie neu starten.`,

  joined: (name) => `${name} ist da`,
  someone: "Jemand",
  thisPerson: "diese Person",
  yourStudent: "dein Schüler",
  yourTeacher: "deine Lehrkraft",
  filesTitle: (name) => `Dateien von ${dat(name)}`,

  lessonWith: (name) => `Lektion mit ${dat(name)}`,
  yourLesson: "Deine Lektion",
  microphone: "Mikrofon",
  myMicOn: "Mikro an",
  myMicOff: "Mikro aus",
  myCamOn: "Kamera an",
  myCamOff: "Kamera aus",
  camera: "Kamera",
  chooseMicrophone: "Mikrofon wählen",
  chooseCamera: "Kamera wählen",
  leaveLesson: "Lektion verlassen",
  leave: "Verlassen",
  shareScreen: "Bildschirm teilen",
  stopSharing: "Bildschirm nicht mehr teilen",
  mute: (name) => `${cap(acc(name))} stummschalten`,
  muteShort: "Stumm",
  micIsOff: (name) => `Mikrofon von ${dat(name)} ist aus`,
  turnMicOff: (name) => `Mikrofon von ${dat(name)} ausschalten`,
  canEdit: (name) => `${name} kann bearbeiten`,
  viewsOnly: (name) => `${name} kann nur ansehen`,
  clickToChange: (label) => `${label}. Zum Ändern klicken.`,
  letWriteAndDraw: (name) => `${cap(acc(name))} schreiben und zeichnen lassen`,

  cameras: "Kameras",
  dragToMoveLabel: (label) => `${label}. Zum Verschieben ziehen oder die Pfeiltasten nutzen.`,
  dragToMove: "Zum Verschieben ziehen",
  resizeCameras: "Breite der Kameraspalte ändern",
  resizeFiles: (title) => `Breite ändern: ${title}`,

  justTalkingTeacher: "Nur reden. Die Tabs sind für euch beide eingeklappt.",
  justTalkingStudent: (name) => `${name} hat die Tabs eingeklappt. Gerade wird nur geredet.`,
  showTabs: (n) => (n === 1 ? "Tab zeigen" : "Die 2 Tabs zeigen"),

  lesson: "Lektion",
  openTabs: "Offene Tabs",
  lessonTabs: "Tabs der Lektion",
  closeTab: (tab) => `${tab} schließen`,
  openSecondTab: "Zweiten Tab öffnen",
  openAsSecondTab: (tab) => `${tab} als zweiten Tab öffnen`,
  showsTwoTabs: (name) => `${name} zeigt zwei Tabs`,
  showsTab: (name, tab) => `${name} zeigt ${tab}`,
  following: (name) => `Du folgst ${dat(name)}`,
  files: "Dateien",
  moreControls: "Weitere Steuerung",
  filesFull: "Zwei Tabs sind offen. Schließ einen mit seinem ×, um eine Datei zu zeigen.",
  tapFileToShow: (name) => `Tippe auf eine Datei, um sie ${dat(name)} zu zeigen. Sie öffnet sich als zweiter Tab.`,
  lessonControls: "Steuerung der Lektion",
  canWriteAndDraw: (name) => `${name} darf schreiben und zeichnen`,
  showTheTabs: "Tabs zeigen",
  justTalk: "Nur reden",
  needsComputer: "Bildschirm teilen und nebeneinander gehen nur am Computer.",

  // R1: Aufnahme
  rec: {
    record: "Aufnehmen",
    stopRecording: "Aufnahme beenden",
    title: "Diese Lektion aufnehmen",
    whatToRecord: "Was aufnehmen",
    voices: "Stimmen",
    voicesHint: "Ihr beide, dazu Audio und Videos, die du abspielst.",
    cameras: "Kameras",
    camerasHint: "Beide Kameras nebeneinander.",
    screen: "Lektionsbildschirm",
    screenHint: "Dateien, Whiteboard, Text und geteilte Bildschirme. Dein Browser fragt nach dem Tab: Wähl diesen.",
    screenNotHere: "In diesem Browser nicht möglich. Nimm Chrome, Edge oder Firefox auf einem Computer.",
    privacy: (name: string) =>
      `${name} wird zuerst gefragt. Das Video wird nur auf diesem Gerät gespeichert, TeachingTime bekommt es nie. Du kannst jederzeit stoppen, ${name} auch.`,
    needsStudent: "Dein Schüler muss in der Lektion sein.",
    yourStudent: "deinen Schüler",
    yourTeacher: "Deine Lehrperson",
    askAndRecord: (name: string) => `${name} fragen und aufnehmen`,
    cancel: "Abbrechen",
    askingTitle: "Wird gefragt…",
    asking: (name: string) => `Warte, bis ${name} der Aufnahme zustimmt.`,
    studentSaidNo: (name: string) => `${name} möchte keine Aufnahme. Es wurde nichts aufgenommen.`,
    studentStopped: (name: string) => `${name} hat die Aufnahme beendet.`,
    screenRefused: "Der Browser hat die Aufnahme des Tabs nicht erlaubt. Versuch es nochmal oder nimm ohne Lektionsbildschirm auf.",
    failed: "Die Aufnahme konnte in diesem Browser nicht starten.",
    saved: (file: string) => `Aufnahme gespeichert: ${file}`,
    leftover: (file: string) => `Eine Aufnahme wurde nicht gespeichert, weil die Lektion geschlossen wurde: ${file}`,
    download: "Herunterladen",
    discard: "Löschen",
    consentTitle: "Diese Lektion aufnehmen?",
    consent: (name: string) => `${name} möchte diese Lektion aufnehmen.`,
    whatIsRecorded: "Aufgenommen wird:",
    consentHint: (name: string) =>
      `Die Aufnahme wird nur auf dem Gerät von ${name} gespeichert. Solange sie läuft, siehst du ein rotes Zeichen, und du kannst sie jederzeit stoppen.`,
    allow: "Erlauben",
    dontAllow: "Nicht erlauben",
    rec: "REC",
    recordingNow: "Diese Lektion wird aufgenommen",
    stop: "Stopp",
  },
  errors: {
    notConfigured: "Die LiveKit-Schlüssel sind nicht eingerichtet",
    logIn: "Bitte melde dich an",
    lessonNotFound: "Lektion nicht gefunden",
    nameRequired: "Bitte gib deinen Namen ein",
    invalidInvite: "Dieser Einladungslink ist nicht gültig",
    badRequest: "Ungültige Anfrage",
    monthLimitTeacher: (hours) =>
      `Du hast die ${hours} Stunden Lektionen für diesen Monat aufgebraucht (TeachingTime ist kostenlos, solange es neu ist). Am 1. gibt es neue.`,
    monthLimitStudent: "Die Lektionszeit deiner Lehrkraft für diesen Monat ist aufgebraucht. Bitte sprich sie darauf an.",
    lessonLimit: (hours) =>
      `Diese Lektion lief ${hours} Stunden, so lange wie eine Lektion höchstens dauern darf, und wurde deshalb beendet. Starte sie neu, um weiterzumachen.`,
  },
};
