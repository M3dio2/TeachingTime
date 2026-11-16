import type { dashboard as en } from "../en/dashboard";

export const dashboard: typeof en = {
  // Header
  logOut: "Se déconnecter",
  loggingOut: "Déconnexion…",
  loadingClassrooms: "Chargement de vos Classrooms",
  leavingLesson: "Vous quittez le cours",

  // Name chip
  changeNameTitle: "Modifier le nom que vos élèves voient pendant les cours",
  nameChipLabel: (name: string) => `Votre nom pendant les cours : ${name}. Le modifier`,
  addYourName: "Ajouter votre nom",
  nameInLessons: "Votre nom pendant les cours",
  namePlaceholder: "ex. Mme Martin",

  // Feedback
  sendFeedback: "Envoyer un avis",
  feedback: "Avis",
  feedbackThanks: "Merci ! Chaque message est lu.",
  feedbackQuestion: "Qu’est-ce qui marche, qu’est-ce qui manque, qu’est-ce qui ne marche pas ?",
  feedbackPlaceholder: "ex. Sur mon iPad, le tableau blanc…",
  feedbackFailed: "L’envoi a échoué. Veuillez réessayer dans un instant.",

  // Welcome (first visit)
  welcomeTitle: "Bienvenue ! Comment vos élèves doivent-ils vous appeler ?",
  welcomeText: "Ce nom s’affiche sur votre caméra à chaque cours. Vous pourrez le modifier plus tard.",

  // Quick call
  quickCallInProgress: "Appel rapide en cours",
  studentWaiting: "Votre élève attend.",
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
  yourClassrooms: "Vos Classrooms",
  classroomsIntro: "Un Classroom par élève : ses fichiers et un lien qui reste le même chaque semaine.",
  classroomLimit: (max: number) =>
    `${max} Classrooms maximum pour le moment. Supprimez-en un pour en ajouter un autre.`,
  firstStudentTitle: "Commencez par votre premier élève",
  firstStudentText:
    "Saisissez son nom et appuyez sur Ajouter. Vous obtenez un Classroom pour ses fichiers et un lien à lui envoyer.",
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
    "Pendant le cours, ces fichiers se trouvent dans le panneau latéral. Cliquez sur un PDF, un fichier Word, une image ou un lien pour l’afficher (les vidéos YouTube se lisent pour vous deux), lancez la lecture d’un audio, ou glissez un fichier sur la scène.",
  youtubeVideo: "Vidéo YouTube",
  linkToAdd: "Lien à ajouter",
  linkPlaceholder: "Collez une vidéo YouTube ou un lien",
  addLink: "Ajouter le lien",
  badLink: "Cela ne ressemble pas à une adresse web. Collez un lien qui commence par https://",
  linkNotSaved: "Le lien n’a pas pu être enregistré. Veuillez réessayer.",
  deleteName: (name: string) => `Supprimer ${name}`,
  delete: "Supprimer",
  deleteConfirm: (name: string) => `Supprimer ${name} ?`,
  pause: "Pause",
  listen: "Écouter",
  pauseName: (name: string) => `Mettre ${name} en pause`,
  listenTo: (name: string) => `Écouter ${name}`,

  // Upload
  uploadFiles: "Importer des fichiers",
  dropToUpload: "Relâchez pour importer",
  dropFilesHere: "Déposez vos fichiers ici",
  dropHint: "Images, PDF, fichiers Word ou audio, jusqu’à 10 Mo chacun",
  uploading: (name: string) => `Import de ${name}…`,
  upload: {
    oldWord: (name: string) =>
      `${name} est un ancien fichier Word. Dans Word, enregistrez-le en .docx (ou PDF), puis importez ce fichier.`,
    wrongType: (name: string) => `${name} n’est ni une image, ni un PDF, ni un fichier Word ou audio.`,
    tooBig: (name: string) => `${name} dépasse 10 Mo.`,
    noRoom: (name: string, mb: number) =>
      `${name} ne rentre pas : vos fichiers peuvent occuper ${mb} Mo au total. Supprimez-en d’abord quelques-uns.`,
    notAccepted: (name: string) => `${name} : ce type de fichier n’est pas encore accepté.`,
    failed: (name: string) => `${name} n’a pas pu être importé. Veuillez réessayer.`,
  },

  // Storage
  storage: "Stockage",
  storageUsed: (used: number, total: number) => `${used} Mo sur ${total} Mo`,
  storageUsedLabel: (used: number, total: number) => `${used} Mo utilisés sur ${total}`,
  storageHint: "Tous vos Classrooms ensemble. Jusqu’à 10 Mo par fichier.",
};
