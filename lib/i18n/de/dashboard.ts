import type { dashboard as en } from "../en/dashboard";

export const dashboard: typeof en = {
  // Header
  logOut: "Abmelden",
  loggingOut: "Wird abgemeldet…",
  loadingClassrooms: "Deine Classrooms werden geladen",
  leavingLesson: "Lektion wird verlassen",

  // Name chip
  changeNameTitle: "Namen ändern, den deine Schüler in Lektionen sehen",
  nameChipLabel: (name: string) => `Dein Name in Lektionen: ${name}. Ändern`,
  addYourName: "Namen hinzufügen",
  accountLabel: (name: string) => `Konto: ${name}`,
  quickCallStudent: "Dein schneller Anruf",
  isWaitingTitle: (name: string) => `${name} wartet`,
  isWaitingBody: "Klick, um die Lektion zu starten.",
  notifyOffer: "Lass dich benachrichtigen, wenn ein Schüler wartet, auch in einem anderen Tab.",
  notifyTurnOn: "Einschalten",
  notifyNotNow: "Jetzt nicht",
  start: {
    title: "Erste Schritte",
    progress: (done: number, all: number) => `${done} von ${all} erledigt`,
    done: "erledigt",
    hide: "Erste Schritte ausblenden",
    classroom: "Leg ein Classroom für einen Schüler an",
    classroomText: "Gib unten den Namen ein. Ein Classroom pro Schüler.",
    link: "Schick deinem Schüler den Link",
    linkText: (name: string) => `${name} kommt damit jede Woche rein. Ohne Konto.`,
    linkTextNone: "Jedes Classroom hat seinen eigenen Link.",
    copyLink: "Link kopieren",
    test: "Probier selbst eine Lektion aus",
    testText: "Starte die Lektion und öffne dann den Schülerlink auf deinem Handy oder in einem anderen Browser.",
    openStudentView: "Schüleransicht öffnen",
    file: "Füg ein Arbeitsblatt oder ein Bild hinzu",
    fileText: "Dateien im Classroom sind in der Lektion einen Klick entfernt.",
    openClassroom: "Classroom öffnen",
  },
  nameInLessons: "Dein Name in Lektionen",
  namePlaceholder: "z. B. Frau Schmidt",

  // Feedback
  sendFeedback: "Feedback senden",
  feedback: "Feedback",
  feedbackThanks: "Danke! Jede Nachricht wird gelesen.",
  feedbackQuestion: "Was funktioniert, was fehlt, was ist kaputt?",
  feedbackPlaceholder: "z. B. Auf meinem iPad ist das Whiteboard…",
  feedbackFailed: "Das hat nicht geklappt. Bitte versuch es gleich noch einmal.",

  // Welcome (first visit)
  welcomeTitle: "Willkommen! Wie sollen deine Schüler dich nennen?",
  welcomeText: "Dieser Name steht in jeder Lektion auf deinem Kamerabild. Du kannst ihn später ändern.",

  // Quick call
  quickCallInProgress: "Schneller Anruf läuft",
  studentWaiting: "Dein Schüler wartet.",
  nobodyInCall: "Niemand ist im Anruf.",
  rejoin: "Wieder beitreten",
  endQuickCallConfirm: "Diesen schnellen Anruf beenden? Der Link für den Schüler funktioniert dann nicht mehr.",
  ending: "Wird beendet…",
  endCall: "Anruf beenden",
  startQuickCall: "Schnellen Anruf starten",
  startNewQuickCall: "Neuen schnellen Anruf starten",
  starting: "Wird gestartet…",
  quickCallHint: "Ein einmaliger Anruf mit neuem Link. Nichts wird gespeichert.",
  newQuickCallHint: "Beendet den Anruf oben und startet einen neuen.",

  // Classrooms
  yourClassrooms: "Deine Classrooms",
  // The heading again, in parts: the marker underlines `marked`.
  yourClassroomsTitle: { before: "Deine ", marked: "Classrooms", after: "" },
  classroomsIntro: "Ein Classroom pro Schüler: seine Dateien und ein Link, der jede Woche gleich bleibt.",
  classroomLimit: (max: number) =>
    `Mehr als ${max} Classrooms gehen im Moment nicht. Entferne eines, um ein neues hinzuzufügen.`,
  firstStudentTitle: "Fang mit deinem ersten Schüler an",
  firstStudentText:
    "Gib den Namen ein und tippe auf Hinzufügen. Du bekommst ein Classroom für die Dateien und einen Link zum Verschicken.",
  addClassroom: "Classroom hinzufügen",
  forNewStudent: "Für einen neuen Schüler",
  studentName: "Name des Schülers",
  studentNamePlaceholder: "Name, z. B. Anna",
  add: "Hinzufügen",
  adding: "Wird hinzugefügt…",

  // Classroom card
  openClassroom: (name: string) => `Classroom von ${name} öffnen`,
  lastLesson: "Letzte Lektion:",
  noLessonsYet: "Noch keine Lektionen",
  waiting: "Wartet",
  noFilesYet: "Noch keine Dateien",
  startLesson: "Lektion starten",
  // The classroom card's button: short, it shares a row with "Copy link" and ⋯.
  startLessonShort: "Starten",
  copyLink: "Link kopieren",
  moreFor: (name: string) => `Mehr für ${name}`,
  removeConfirm: (name: string) =>
    `${name} entfernen? Der Link funktioniert dann nicht mehr und die Dateien werden gelöscht.`,
  removeName: (name: string) => `${name} entfernen`,
  countPictures: (n: number) => `${n} ${n === 1 ? "Bild" : "Bilder"}`,
  countPdfs: (n: number) => `${n} ${n === 1 ? "PDF" : "PDFs"}`,
  countWord: (n: number) => `${n} Word-${n === 1 ? "Datei" : "Dateien"}`,
  countAudio: (n: number) => `${n} Audio`,
  countLinks: (n: number) => `${n} ${n === 1 ? "Link" : "Links"}`,
  countDocuments: (n: number) => `${n} ${n === 1 ? "Dokument" : "Dokumente"}`,
  countVideos: (n: number) => `${n} ${n === 1 ? "Video" : "Videos"}`,
  groups: { documents: "Dokumente", pictures: "Bilder", videos: "Videos", audio: "Audio", links: "Links" },
  noFiles: "Noch keine Dateien. Lade Dokumente, Bilder, Audio oder Videos hoch oder füg einen Link hinzu.",
  kindLabels: { image: "Bild", video: "Video", audio: "Audio" },

  // Copy link button
  copyStudentLink: "Link für Schüler kopieren",
  copyNamesLink: (name: string) => `Link für ${name} kopieren`,
  copied: "Kopiert!",
  copy: "Kopieren",

  // Classroom page
  removeClassroom: "Dieses Classroom entfernen",
  removeClassroomHint: "Der Link funktioniert dann nicht mehr und die Dateien werden gelöscht.",
  namesLink: (name: string) => `Link für ${name}`,
  linkHint: (name: string) => `${name} kommt mit diesem Link rein. Er bleibt jede Woche gleich.`,

  // Files
  files: "Dateien",
  filesFromLesson: (day: string) => `Lektion · ${day}`,
  filesAdded: (day: string) => `Hinzugefügt ${day}`,
  fileCount: (n: number) => `${n} ${n === 1 ? "Datei" : "Dateien"}`,
  show: "Anzeigen",
  all: "Alle",
  sections: {
    image: { title: "Bilder", filter: "Bilder", empty: "Noch keine Bilder." },
    pdf: { title: "PDFs", filter: "PDFs", empty: "Noch keine PDFs." },
    doc: { title: "Word-Dateien", filter: "Word", empty: "Noch keine Word-Dateien." },
    audio: { title: "Audio", filter: "Audio", empty: "Noch kein Audio." },
    link: { title: "Links", filter: "Links", empty: "Noch keine Links." },
  },
  openFile: (name: string) => `${name} öffnen`,
  filesTip:
    "In einer Lektion sind diese Dateien in der Seitenleiste. Klick auf eine, um sie euch beiden zu zeigen (Videos laufen synchron), spiel Audio ab oder zieh sie auf die Bühne.",
  youtubeVideo: "YouTube-Video",
  linkToAdd: "Link zum Hinzufügen",
  linkPlaceholder: "YouTube-Video oder beliebigen Link einfügen",
  addLink: "Link hinzufügen",
  badLink: "Das sieht nicht wie eine Webadresse aus. Füge einen Link ein, der mit https:// beginnt.",
  linkNotSaved: "Der Link konnte nicht gespeichert werden. Bitte versuch es noch einmal.",
  deleteName: (name: string) => `${name} löschen`,
  delete: "Löschen",
  deleteConfirm: (name: string) => `${name} löschen?`,
  pause: "Pause",
  listen: "Anhören",
  pauseName: (name: string) => `${name} pausieren`,
  listenTo: (name: string) => `${name} anhören`,

  // Upload
  uploadFiles: "Dateien hochladen",
  dropToUpload: "Loslassen zum Hochladen",
  dropFilesHere: "Dateien hier ablegen",
  dropHint: "Dokumente, Bilder, Audio oder Videos, bis zu 10 MB pro Datei",
  uploading: (name: string) => `${name} wird hochgeladen…`,
  upload: {
    oldWord: (name: string) =>
      `${name} ist eine alte Word-Datei. Speichere sie in Word als .docx (oder PDF) und lade die hoch.`,
    presentation: (name) =>
      `${name} ist eine Präsentation. Speichere sie zuerst als PDF (PowerPoint: Datei → Exportieren → PDF; Keynote: Ablage → Exportieren → PDF; Google Präsentationen: Datei → Herunterladen → PDF) und lade dann das PDF hoch: Jede Folie wird eine Seite, die ihr zusammen anschauen und beschriften könnt.`,
    wrongType: (name: string) => `${name}: Diese Art von Datei kann nicht hochgeladen werden.`,
    tooBig: (name: string) => `${name} ist größer als 10 MB.`,
    tooLargeForUpload: (name: string) => `${name} ist zu groß zum Hochladen (der Speicher nimmt im Moment bis 50 MB pro Datei).`,
    noRoom: (name: string, mb: number) =>
      `${name} passt nicht mehr: Deine Dateien dürfen zusammen ${mb} MB groß sein. Lösche zuerst ein paar.`,
    notAccepted: (name: string) => `${name}: Diese Art von Datei wird noch nicht unterstützt.`,
    failed: (name: string) => `${name} konnte nicht hochgeladen werden. Bitte versuch es noch einmal.`,
  },

  // Storage
  storage: "Speicher",
  storageUsed: (used: number, total: number) => `${used} MB von ${total} MB`,
  storageUsedLabel: (used: number, total: number) => `${used} von ${total} MB belegt`,
  storageHint: "Classrooms und Bibliothek zusammen. Bis 10 MB pro Datei im Classroom, in der Bibliothek ohne Grenze pro Datei.",
};
