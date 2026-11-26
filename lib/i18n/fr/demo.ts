import type { demo as en } from "../en/demo";

export const demo: typeof en = {
  badge: "Cours de démo",
  leave: "Quitter la démo",
  studentCamera: (name) => `Caméra de ${name} (un dessin dans la démo)`,
  studentJoining: (name) => `${name} arrive…`,
  you: "Toi",
  youInitial: "T",
  cameraOff: "Caméra coupée dans la démo",
  tourLabel: "Visite de la démo",
  stepOf: (n, all) => `Étape ${n} sur ${all}`,
  startTour: "Fais-moi visiter",
  explore: "Je découvre seul",
  hideTips: "Masquer les conseils",
  showTips: "Conseils",
  createClassroom: "Crée ton Classroom gratuit",
  doItForMe: "Fais-le pour moi",
  keepExploring: "Continuer à essayer",
  steps: {
    welcome: {
      title: (name) => `Ton cours de démo avec ${name}`,
      text: (name) =>
        `${name} est une élève fictive : elle réagit à ce que tu fais, comme dans un vrai cours. Pas de caméra, pas de micro, rien n’est enregistré.`,
    },
    worksheet: {
      title: () => "Montre la fiche",
      text: (name) => `Clique sur « Worksheet – Past simple » dans les fichiers de ${name}, ou glisse-la sur la scène. Elle la voit tout de suite.`,
    },
    write: {
      title: (name) => `Laisse ${name} écrire`,
      text: (name) => `Active en bas « ${name} peut écrire et dessiner ». Puis regarde le bloc-notes.`,
    },
    quiz: {
      title: () => "Lance un quiz",
      text: (name) => `Glisse le quiz « Past simple: irregular verbs » des fichiers de ${name} sur la fiche pour la remplacer. Elle répond de son côté.`,
    },
    check: {
      title: (name) => `${name} a fini`,
      text: () => "Appuie sur « Corriger » pour voir ce qui est juste ou faux. Dans un vrai cours, le résultat est gardé dans le Classroom.",
    },
    end: {
      title: () => "Voilà TeachingTime",
      text: () =>
        "Il y a encore plus : le tableau blanc, l’audio pour vous deux, l’image, Juste parler. On passe à tes propres élèves ?",
    },
  },
  endTitle: "C’était la démo",
  endText: "Ton vrai Classroom marche pareil : un lien par élève, tes fichiers, quiz et notes, tout dans le navigateur.",
  again: "Refaire la démo",
  home: "Retour à l’accueil",
  loading: "Préparation de la démo…",
};
