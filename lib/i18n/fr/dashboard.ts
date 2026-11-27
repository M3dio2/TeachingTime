import type { dashboard as en } from "../en/dashboard";

export const dashboard: typeof en = {
  // Header
  logOut: "Se déconnecter",
  loggingOut: "Déconnexion…",
  loadingClassrooms: "Chargement de tes Classrooms",
  leavingLesson: "Tu quittes le cours",

  // Name chip
  changeNameTitle: "Modifier le nom que tes élèves voient pendant les cours",
  nameChipLabel: (name: string) => `Ton nom pendant les cours : ${name}. Le modifier`,
  addYourName: "Ajouter ton nom",
  accountLabel: (name: string) => `Compte: ${name}`,
  quickCallStudent: "Ton appel rapide",
  isWaitingTitle: (name: string) => `${name} attend`,
  isWaitingBody: "Clique pour commencer le cours.",
  notifyOffer: "Reçois une notification quand un élève attend, même dans un autre onglet.",
  notifyTurnOn: "Activer",
  notifyNotNow: "Pas maintenant",
  start: {
    title: "Pour commencer",
    progress: (done: number, all: number) => `${done} sur ${all} faits`,
    done: "fait",
    hide: "Masquer « Pour commencer »",
    classroom: "Crée un Classroom pour un élève",
    classroomText: "Tape son prénom ci-dessous. Un Classroom par élève.",
    link: "Envoie son lien à ton élève",
    linkText: (name: string) => `${name} entre avec chaque semaine. Sans compte.`,
    linkTextNone: "Chaque Classroom a son propre lien.",
    copyLink: "Copier le lien",
    test: "Essaie un cours toi-même",
    testText: "Lance le cours, puis ouvre le lien élève sur ton téléphone ou dans un autre navigateur.",
    openStudentView: "Ouvrir la vue élève",
    file: "Ajoute une fiche ou une image",
    fileText: "Les fichiers du Classroom sont à un clic pendant le cours.",
    openClassroom: "Ouvrir le Classroom",
  },
  nameInLessons: "Ton nom pendant les cours",
  namePlaceholder: "ex. Mme Martin",

  // Feedback
  sendFeedback: "Envoyer un avis",
  feedback: "Avis",
  feedbackThanks: "Merci ! Chaque message est lu.",
  feedbackQuestion: "Qu’est-ce qui marche, qu’est-ce qui manque, qu’est-ce qui ne marche pas ?",
  feedbackPlaceholder: "ex. Sur mon iPad, le tableau blanc…",
  feedbackFailed: "L’envoi a échoué. Réessaie dans un instant.",

  // Welcome (first visit)
  welcomeTitle: "Bienvenue ! Comment tes élèves doivent-ils t’appeler ?",
  welcomeText: "Ce nom s’affiche sur ta caméra à chaque cours. Tu pourras le modifier plus tard.",

  // Quick call
  quickCallInProgress: "Appel rapide en cours",
  studentWaiting: "Ton élève attend.",
  nobodyInCall: "Personne n’est dans l’appel.",
  rejoin: "Revenir",
  endQuickCallConfirm: "Terminer cet appel rapide ? Le lien de l’élève ne fonctionnera plus.",
  ending: "Fin en cours…",
  endCall: "Terminer",
  startQuickCall: "Lancer un appel rapide",
  startNewQuickCall: "Lancer un nouvel appel rapide",
  starting: "Lancement…",
  quickCallHint: "Un appel ponctuel avec un nouveau lien. Rien n’est enregistré.",
  newQuickCallHint: "Termine l’appel ci-dessus et en lance un nouveau.",

  // Classrooms
  yourClassrooms: "Tes Classrooms",
  // The heading again, in parts: the marker underlines `marked`.
  yourClassroomsTitle: { before: "Tes ", marked: "Classrooms", after: "" },
  classroomsIntro: "Un Classroom par élève : ses fichiers et un lien qui reste le même chaque semaine.",
  classroomLimit: (max: number) =>
    `${max} Classrooms maximum pour le moment. Supprimes-en un pour en ajouter un autre.`,
  firstStudentTitle: "Commence par ton premier élève",
  firstStudentText:
    "Saisis son nom et appuie sur Ajouter. Tu obtiens un Classroom pour ses fichiers et un lien à lui envoyer.",
  addClassroom: "Ajouter un Classroom",
  forNewStudent: "Pour un nouvel élève",
  studentName: "Nom de l’élève",
  studentNamePlaceholder: "Nom de l’élève, ex. Anna",
  add: "Ajouter",
  adding: "Ajout…",

  // Classroom card
  openClassroom: (name: string) => `Ouvrir le Classroom de ${name}`,
  lastLesson: "Dernier cours :",
  noLessonsYet: "Aucun cours pour l’instant",
  waiting: "En attente",
  noFilesYet: "Aucun fichier pour l’instant",
  startLesson: "Commencer le cours",
  // The classroom card's button: short, it shares a row with "Copy link" and ⋯.
  startLessonShort: "Commencer",
  copyLink: "Copier le lien",
  moreFor: (name: string) => `Plus d’options pour ${name}`,
  removeConfirm: (name: string) =>
    `Supprimer ${name} ? Son lien ne fonctionnera plus et ses fichiers seront effacés.`,
  removeName: (name: string) => `Supprimer ${name}`,
  countPictures: (n: number) => `${n} ${n === 1 ? "image" : "images"}`,
  countPdfs: (n: number) => `${n} PDF`,
  countWord: (n: number) => `${n} ${n === 1 ? "fichier" : "fichiers"} Word`,
  countAudio: (n: number) => `${n} audio`,
  countLinks: (n: number) => `${n} ${n === 1 ? "lien" : "liens"}`,
  countDocuments: (n: number) => `${n} ${n === 1 ? "document" : "documents"}`,
  countVideos: (n: number) => `${n} ${n === 1 ? "vidéo" : "vidéos"}`,
  groups: { documents: "Documents", pictures: "Images", videos: "Vidéos", audio: "Audio", links: "Liens" },
  noFiles: "Aucun fichier pour l’instant. Ajoute des documents, des images, de l’audio ou des vidéos, ou un lien.",
  kindLabels: { image: "Image", video: "Vidéo", audio: "Audio" },

  // Copy link button
  copyStudentLink: "Copier le lien de l’élève",
  copyNamesLink: (name: string) => `Copier le lien de ${name}`,
  copied: "Copié !",
  copy: "Copier",

  // Classroom page
  removeClassroom: "Supprimer ce Classroom",
  removeClassroomHint: "Le lien ne fonctionnera plus et les fichiers seront effacés.",
  namesLink: (name: string) => `Lien de ${name}`,
  linkHint: (name: string) => `${name} rejoint le cours avec ce lien. Il reste le même chaque semaine.`,

  // Files
  files: "Fichiers",
  filesFromLesson: (day: string) => `Cours · ${day}`,
  filesForNext: (day: string) => (day ? `Pour le prochain cours · ${day}` : `Pour le prochain cours`),
  earlierLessons: (n: number) => (n === 1 ? "Voir 1 cours précédent" : `Voir ${n} cours précédents`),
  fileCount: (n: number) => `${n} ${n === 1 ? "fichier" : "fichiers"}`,
  show: "Afficher",
  all: "Tout",
  sections: {
    image: { title: "Images", filter: "Images", empty: "Aucune image pour l’instant." },
    pdf: { title: "PDF", filter: "PDF", empty: "Aucun PDF pour l’instant." },
    doc: { title: "Fichiers Word", filter: "Word", empty: "Aucun fichier Word pour l’instant." },
    audio: { title: "Audio", filter: "Audio", empty: "Aucun audio pour l’instant." },
    link: { title: "Liens", filter: "Liens", empty: "Aucun lien pour l’instant." },
  },
  openFile: (name: string) => `Ouvrir ${name}`,
  filesTip:
    "Pendant un cours, ces fichiers sont dans le panneau latéral. Clique sur l’un d’eux pour le montrer à vous deux (les vidéos sont synchronisées), lance l’audio, ou fais-le glisser sur la scène.",
  youtubeVideo: "Vidéo YouTube",
  linkToAdd: "Lien à ajouter",
  linkPlaceholder: "Colle une vidéo YouTube ou un lien",
  addLink: "Ajouter le lien",
  badLink: "Cela ne ressemble pas à une adresse web. Colle un lien qui commence par https://",
  linkNotSaved: "Le lien n’a pas pu être enregistré. Réessaie.",
  deleteName: (name: string) => `Supprimer ${name}`,
  delete: "Supprimer",
  deleteConfirm: (name: string) => `Supprimer ${name} ?`,
  pause: "Pause",
  listen: "Écouter",
  pauseName: (name: string) => `Mettre ${name} en pause`,
  listenTo: (name: string) => `Écouter ${name}`,

  // Upload
  uploadFiles: "Importer des fichiers",
  dropToUpload: "Relâche pour importer",
  dropFilesHere: "Dépose tes fichiers ici",
  dropHint: "Documents, images, audio ou vidéos, jusqu’à 10 Mo chacun",
  uploading: (name: string) => `Import de ${name}…`,
  upload: {
    oldWord: (name: string) =>
      `${name} est un ancien fichier Word. Dans Word, enregistre-le en .docx (ou PDF), puis importe ce fichier.`,
    presentation: (name) =>
      `${name} est une présentation. Enregistre-la d’abord en PDF (PowerPoint : Fichier → Exporter → PDF ; Keynote : Fichier → Exporter vers → PDF ; Google Slides : Fichier → Télécharger → PDF), puis importe le PDF : chaque diapo devient une page à montrer et annoter ensemble.`,
    wrongType: (name: string) => `${name} : ce type de fichier ne peut pas être ajouté.`,
    tooBig: (name: string) => `${name} dépasse 10 Mo.`,
    tooLargeForUpload: (name: string) => `${name} est trop gros pour être envoyé (le stockage accepte pour l’instant 50 Mo par fichier).`,
    noRoom: (name: string, mb: number) =>
      `${name} ne rentre pas : tes fichiers peuvent occuper ${mb} Mo au total. Supprimes-en d’abord quelques-uns.`,
    notAccepted: (name: string) => `${name} : ce type de fichier n’est pas encore accepté.`,
    failed: (name: string) => `${name} n’a pas pu être importé. Réessaie.`,
  },

  // Storage
  storage: "Stockage",
  storageUsed: (used: number, total: number) => `${used} Mo sur ${total} Mo`,
  storageUsedLabel: (used: number, total: number) => `${used} Mo utilisés sur ${total}`,
  storageHint: "Classrooms et Bibliothèque ensemble. Jusqu’à 10 Mo par fichier dans un Classroom, sans limite par fichier dans la Bibliothèque.",
};
