import type { Device, room as en } from "../en/room";

// "de Anna" → "d’Anna"; "de ton élève" stays.
const of = (name: string) => (/^[aeiouyhàâäéèêëîïôöûüœ]/i.test(name) ? `d’${name}` : `de ${name}`);

const the = (d: Device) =>
  d === "camera" ? "la caméra" : d === "microphone" ? "le micro" : "la caméra ou le micro";
const your = (d: Device) =>
  d === "camera" ? "ta caméra" : d === "microphone" ? "ton micro" : "ta caméra ou ton micro";

export const room: typeof en = {
  gettingReady: "Préparation de ton cours",
  leavingLesson: "Tu quittes le cours",
  joining: "Connexion…",
  continueHere: "Continuer ici",
  backToDashboard: "Retour au tableau de bord",

  joinTitle: { before: "Rejoins ton ", marked: "cours", after: "" },
  joinIntro: "Vérifie ta caméra, saisis ton prénom, et c’est parti.",
  yourName: "Ton prénom",
  namePlaceholder: "p. ex. Anna",
  joinLesson: "Rejoindre le cours",
  allowDevices: "Quand ton navigateur le demande, autorise la caméra et le micro.",
  couldNotJoin: "Impossible de rejoindre le cours",

  endedTitle: "À la prochaine !",
  endedText: "Le cours est terminé. Tu peux fermer cette page.",
  replacedTitle: "Tu as rejoint ce cours ailleurs.",
  replacedText:
    "Ce cours est ouvert sur un autre appareil ou onglet. Ferme cette page, ou continue ici pour y déplacer le cours.",
  leftTitle: "Tu as quitté le cours",
  rejoin: "Revenir",
  leftText: "Parti par erreur ? Reviens avec le même prénom.",

  couldNotStart: "Impossible de démarrer le cours",
  cantStartTitle: "Ce cours ne peut pas démarrer",
  replacedTabTitle: "Tu as rejoint ce cours dans un autre onglet.",
  replacedTabText: "Ferme cet onglet, ou continue ici pour quitter l’autre.",

  yourCamera: "Ta caméra",
  startingCamera: "Démarrage de la caméra…",
  turnOffMic: "Couper ton micro",
  turnOnMic: "Activer ton micro",
  turnOffCam: "Couper ta caméra",
  turnOnCam: "Activer ta caméra",

  device: {
    blocked: (d) =>
      `Ton navigateur a bloqué ${the(d)}. Clique sur l’icône à gauche de la barre d’adresse, autorise ${the(d)}, puis recharge la page. Si l’accès y est déjà autorisé, autorise ton navigateur dans les réglages de confidentialité de ton ordinateur (Mac : Réglages Système → Confidentialité et sécurité → Caméra / Microphone).`,
    notFound: (d) =>
      d === "camera"
        ? "Aucune caméra trouvée. Vérifie qu’elle est branchée, puis recharge la page."
        : d === "microphone"
          ? "Aucun micro trouvé. Vérifie qu’il est branché, puis recharge la page."
          : "Aucune caméra ou aucun micro trouvé. Vérifie qu’ils sont branchés, puis recharge la page.",
    inUse: (d) =>
      `Une autre application utilise ${your(d)} (par exemple Zoom ou Teams). Quitte-la, puis recharge la page.`,
    failed: (d) => `Impossible de démarrer ${your(d)}. Recharge la page pour réessayer.`,
  },

  reconnecting: "Connexion perdue. Reconnexion…",
  mutedByTeacher: "Ton professeur a coupé ton micro. Clique sur le bouton du micro pour reparler.",
  waitingForStudent: "En attente de ton élève. Envoie-lui le lien élève.",
  waitingForTeacher: "En attente de ton professeur…",
  dismiss: "Fermer",
  connectionError: "Un problème de connexion est survenu. Vérifie ta connexion internet et recharge.",
  muteFailed: "Impossible de couper le micro. Réessaie.",
  lessonEndsSoon: (minutes, hours) =>
    `Ce cours se termine dans ${minutes} minutes : tant que TeachingTime est gratuit, un cours dure au maximum ${hours} heures. Tu pourras le relancer ensuite.`,

  joined: (name) => `${name} a rejoint le cours`,
  someone: "Quelqu’un",
  thisPerson: "cette personne",
  yourStudent: "ton élève",
  yourTeacher: "ton professeur",
  filesTitle: (name) => `Fichiers ${of(name)}`,

  lessonWith: (name) => `Cours avec ${name}`,
  yourLesson: "Ton cours",
  microphone: "Micro",
  myMicOn: "Micro activé",
  myMicOff: "Micro coupé",
  myCamOn: "Caméra activée",
  myCamOff: "Caméra coupée",
  camera: "Caméra",
  chooseMicrophone: "Choisir un micro",
  chooseCamera: "Choisir une caméra",
  leaveLesson: "Quitter le cours",
  leave: "Quitter",
  shareScreen: "Partager l’écran",
  stopSharing: "Arrêter le partage d’écran",
  mute: (name) => `Couper le micro ${of(name)}`,
  muteShort: "Couper",
  micIsOff: (name) => `Le micro ${of(name)} est coupé`,
  turnMicOff: (name) => `Couper le micro ${of(name)}`,
  canEdit: (name) => `${name} peut modifier`,
  viewsOnly: (name) => `${name} peut seulement voir`,
  clickToChange: (label) => `${label}. Clique pour changer.`,
  letWriteAndDraw: (name) => `Laisser ${name} écrire et dessiner`,

  cameras: "Caméras",
  dragToMoveLabel: (label) => `${label}. Fais glisser pour déplacer, ou utilise les flèches.`,
  dragToMove: "Fais glisser pour déplacer",
  resizeCameras: "Redimensionner la colonne des caméras",
  resizeFiles: (title) => `Redimensionner : ${title}`,

  justTalkingTeacher: "Juste parler. Les onglets sont repliés pour vous deux.",
  justTalkingStudent: (name) => `${name} a replié les onglets. On parle, tout simplement.`,
  showTabs: (n) => (n === 1 ? "Afficher l’onglet" : "Afficher les 2 onglets"),

  lesson: "Cours",
  openTabs: "Onglets ouverts",
  lessonTabs: "Onglets du cours",
  closeTab: (tab) => `Fermer ${tab}`,
  openSecondTab: "Ouvrir un deuxième onglet",
  openAsSecondTab: (tab) => `Ouvrir ${tab} dans un deuxième onglet`,
  showsTwoTabs: (name) => `${name} affiche deux onglets`,
  showsTab: (name, tab) => `${name} affiche ${tab}`,
  following: (name) => `Tu suis ${name}`,
  files: "Fichiers",
  moreControls: "Plus de commandes",
  filesFull: "Deux onglets sont ouverts. Fermes-en un avec son × pour afficher un fichier.",
  tapFileToShow: (name) =>
    `Touche un fichier pour le montrer à ${name}. Il s’ouvre dans un deuxième onglet.`,
  lessonControls: "Commandes du cours",
  canWriteAndDraw: (name) => `${name} peut écrire et dessiner`,
  showTheTabs: "Afficher les onglets",
  justTalk: "Juste parler",
  needsComputer: "Le partage d’écran et l’affichage côte à côte nécessitent un ordinateur.",

  // R1 : enregistrement
  rec: {
    record: "Enregistrer",
    stopRecording: "Arrêter l’enregistrement",
    title: "Enregistrer ce cours",
    whatToRecord: "Quoi enregistrer",
    voices: "Voix",
    voicesHint: "Vous deux, plus l’audio et les vidéos que tu lances.",
    cameras: "Caméras",
    camerasHint: "Les deux caméras côte à côte.",
    screen: "Écran du cours",
    screenHint: "Fichiers, tableau, texte et écrans partagés. Ton navigateur demande quel onglet : choisis celui-ci.",
    screenNotHere: "Impossible dans ce navigateur. Utilise Chrome, Edge ou Firefox sur un ordinateur.",
    privacy: (name: string) =>
      `On demande d’abord à ${name}. La vidéo est enregistrée uniquement sur cet appareil, TeachingTime ne la reçoit jamais. Tu peux l’arrêter à tout moment, ${name} aussi.`,
    needsStudent: "Ton élève doit être dans le cours.",
    yourStudent: "ton élève",
    yourTeacher: "Ton prof",
    askAndRecord: (name: string) => `Demander à ${name} et enregistrer`,
    cancel: "Annuler",
    askingTitle: "Demande en cours…",
    asking: (name: string) => `On attend que ${name} accepte l’enregistrement.`,
    studentSaidNo: (name: string) => `${name} ne veut pas que le cours soit enregistré. Rien n’a été enregistré.`,
    studentStopped: (name: string) => `${name} a arrêté l’enregistrement.`,
    screenRefused: "Le navigateur n’a pas autorisé l’enregistrement de l’onglet. Réessaie, ou enregistre sans l’écran du cours.",
    failed: "L’enregistrement n’a pas pu démarrer dans ce navigateur.",
    saved: (file: string) => `Enregistrement sauvegardé : ${file}`,
    leftover: (file: string) => `Un enregistrement n’a pas été sauvegardé car le cours s’est fermé : ${file}`,
    download: "Télécharger",
    discard: "Supprimer",
    consentTitle: "Enregistrer ce cours ?",
    consent: (name: string) => `${name} aimerait enregistrer ce cours.`,
    whatIsRecorded: "Enregistré :",
    consentHint: (name: string) =>
      `L’enregistrement est sauvegardé uniquement sur l’appareil de ${name}. Tu vois un signe rouge pendant qu’il tourne, et tu peux l’arrêter à tout moment.`,
    allow: "Autoriser",
    dontAllow: "Ne pas autoriser",
    rec: "REC",
    recordingNow: "Ce cours est enregistré",
    stop: "Arrêter",
  },
  errors: {
    notConfigured: "Les clés LiveKit ne sont pas configurées",
    logIn: "Connecte-toi",
    lessonNotFound: "Cours introuvable",
    nameRequired: "Saisis ton prénom",
    invalidInvite: "Ce lien d’invitation n’est pas valide",
    badRequest: "Requête invalide",
    monthLimitTeacher: (hours) =>
      `Tu as utilisé les ${hours} heures de cours de ce mois-ci (TeachingTime est gratuit tant qu’il est nouveau). Elles reviennent le 1er du mois.`,
    monthLimitStudent: "Le temps de cours de ton professeur pour ce mois-ci est épuisé. Parle-lui-en.",
    lessonLimit: (hours) =>
      `Ce cours a duré ${hours} heures, le maximum pour un cours, il a donc pris fin. Relance-le pour continuer.`,
  },
};
