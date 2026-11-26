import type { demo as en } from "../en/demo";

export const demo: typeof en = {
  badge: "Demo-Lektion",
  leave: "Demo verlassen",
  studentCamera: (name) => `Kamera von ${name} (in der Demo eine Zeichnung)`,
  studentJoining: (name) => `${name} kommt gleich…`,
  you: "Du",
  youInitial: "D",
  cameraOff: "Kamera in der Demo aus",
  tourLabel: "Demo-Rundgang",
  stepOf: (n, all) => `Schritt ${n} von ${all}`,
  startTour: "Zeig mir alles",
  explore: "Ich schau mich selbst um",
  hideTips: "Tipps ausblenden",
  showTips: "Tipps",
  createClassroom: "Kostenloses Classroom erstellen",
  doItForMe: "Mach das für mich",
  keepExploring: "Weiter ausprobieren",
  steps: {
    welcome: {
      title: (name) => `Deine Demo-Lektion mit ${name}`,
      text: (name) =>
        `${name} ist eine gespielte Schülerin: Sie reagiert auf das, was du tust, wie in einer echten Lektion. Keine Kamera, kein Mikrofon, nichts wird gespeichert.`,
    },
    worksheet: {
      title: () => "Zeig das Arbeitsblatt",
      text: (name) => `Klick in den Dateien von ${name} auf „Worksheet – Past simple“ oder zieh es auf die Bühne. Sie sieht es sofort.`,
    },
    write: {
      title: (name) => `Lass ${name} schreiben`,
      text: (name) => `Schalte unten „${name} darf schreiben und zeichnen“ ein. Dann schau aufs Textfeld.`,
    },
    quiz: {
      title: () => "Mach ein Quiz",
      text: (name) => `Zieh das Quiz „Past simple: irregular verbs“ aus den Dateien von ${name} auf das Arbeitsblatt, um es zu tauschen. Sie antwortet auf ihrer Seite.`,
    },
    check: {
      title: (name) => `${name} ist fertig`,
      text: () => "Drück „Antworten prüfen“, um zu sehen, was richtig und falsch ist. In einer echten Lektion landet das Ergebnis im Classroom.",
    },
    end: {
      title: () => "Das ist TeachingTime",
      text: () =>
        "Es gibt noch mehr: das Whiteboard, Audio für beide abspielen, das Bild, Nur reden. Bereit für deine eigenen Schüler?",
    },
  },
  endTitle: "Das war die Demo",
  endText: "Dein echtes Classroom funktioniert genauso: ein Link pro Schüler, deine Dateien, Quizze und Notizen, alles im Browser.",
  again: "Demo nochmal starten",
  home: "Zur Startseite",
  loading: "Demo wird vorbereitet…",
};
