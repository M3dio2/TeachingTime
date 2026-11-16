import type { Device, room as en } from "../en/room";

// "de Anna" → "d’Anna"; "de votre élève" stays.
const of = (name: string) => (/^[aeiouyhàâäéèêëîïôöûüœ]/i.test(name) ? `d’${name}` : `de ${name}`);

const the = (d: Device) =>
  d === "camera" ? "la caméra" : d === "microphone" ? "le micro" : "la caméra ou le micro";
const your = (d: Device) =>
  d === "camera" ? "votre caméra" : d === "microphone" ? "votre micro" : "votre caméra ou votre micro";

export const room: typeof en = {
  gettingReady: "Préparation de votre cours",
  leavingLesson: "Vous quittez le cours",
  joining: "Connexion…",
  continueHere: "Continuer ici",
  backToDashboard: "Retour au tableau de bord",

  joinTitle: { before: "Rejoignez votre ", marked: "cours", after: "" },
  joinIntro: "Vérifiez votre caméra, saisissez votre prénom, et c’est parti.",
  yourName: "Votre prénom",
  namePlaceholder: "p. ex. Anna",
  joinLesson: "Rejoindre le cours",
  allowDevices: "Quand votre navigateur le demande, autorisez la caméra et le micro.",
  couldNotJoin: "Impossible de rejoindre le cours",

  endedTitle: "À la prochaine !",
  endedText: "Le cours est terminé. Vous pouvez fermer cette page.",
  replacedTitle: "Vous avez rejoint ce cours ailleurs.",
  replacedText:
    "Ce cours est ouvert sur un autre appareil ou onglet. Fermez cette page, ou continuez ici pour y déplacer le cours.",
  leftTitle: "Vous avez quitté le cours",
  rejoin: "Revenir",
  leftText: "Parti par erreur ? Revenez avec le même prénom.",

  couldNotStart: "Impossible de démarrer le cours",
  cantStartTitle: "Ce cours ne peut pas démarrer",
  replacedTabTitle: "Vous avez rejoint ce cours dans un autre onglet.",
  replacedTabText: "Fermez cet onglet, ou continuez ici pour quitter l’autre.",

  yourCamera: "Votre caméra",
  startingCamera: "Démarrage de la caméra…",
  turnOffMic: "Couper votre micro",
  turnOnMic: "Activer votre micro",
  turnOffCam: "Couper votre caméra",
  turnOnCam: "Activer votre caméra",

  device: {
    blocked: (d) =>
      `Votre navigateur a bloqué ${the(d)}. Cliquez sur l’icône à gauche de la barre d’adresse, autorisez ${the(d)}, puis rechargez la page. Si l’accès y est déjà autorisé, autorisez votre navigateur dans les réglages de confidentialité de votre ordinateur (Mac : Réglages Système → Confidentialité et sécurité → Caméra / Microphone).`,
    notFound: (d) =>
      d === "camera"
        ? "Aucune caméra trouvée. Vérifiez qu’elle est branchée, puis rechargez la page."
        : d === "microphone"
          ? "Aucun micro trouvé. Vérifiez qu’il est branché, puis rechargez la page."
          : "Aucune caméra ou aucun micro trouvé. Vérifiez qu’ils sont branchés, puis rechargez la page.",
    inUse: (d) =>
      `Une autre application utilise ${your(d)} (par exemple Zoom ou Teams). Fermez-la, puis rechargez la page.`,
    failed: (d) => `Impossible de démarrer ${your(d)}. Rechargez la page pour réessayer.`,
  },

  reconnecting: "Connexion perdue. Reconnexion…",
  mutedByTeacher: "Votre professeur a coupé votre micro. Cliquez sur le bouton du micro pour reparler.",
  waitingForStudent: "En attente de votre élève. Envoyez-lui le lien élève.",
  waitingForTeacher: "En attente de votre professeur…",
  dismiss: "Fermer",
  connectionError: "Un problème de connexion est survenu. Vérifiez votre connexion internet et rechargez.",
  muteFailed: "Impossible de couper le micro. Veuillez réessayer.",
  lessonEndsSoon: (minutes, hours) =>
    `Ce cours se termine dans ${minutes} minutes : tant que TeachingTime est gratuit, un cours dure au maximum ${hours} heures. Vous pourrez le relancer ensuite.`,

  joined: (name) => `${name} a rejoint le cours`,
  someone: "Quelqu’un",
  thisPerson: "cette personne",
  yourStudent: "votre élève",
  yourTeacher: "votre professeur",
  filesTitle: (name) => `Fichiers ${of(name)}`,

  lessonWith: (name) => `Cours avec ${name}`,
  microphone: "Micro",
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
  clickToChange: (label) => `${label}. Cliquez pour changer.`,
  letWriteAndDraw: (name) => `Laisser ${name} écrire et dessiner`,

  cameras: "Caméras",
  dragToMoveLabel: (label) => `${label}. Faites glisser pour déplacer, ou utilisez les flèches.`,
  dragToMove: "Faites glisser pour déplacer",
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
  following: (name) => `Vous suivez ${name}`,
  files: "Fichiers",
  moreControls: "Plus de commandes",
  filesFull: "Deux onglets sont ouverts. Fermez-en un avec son × pour afficher un fichier.",
  tapFileToShow: (name) =>
    `Touchez un fichier pour le montrer à ${name}. Il s’ouvre dans un deuxième onglet.`,
  lessonControls: "Commandes du cours",
  canWriteAndDraw: (name) => `${name} peut écrire et dessiner`,
  showTheTabs: "Afficher les onglets",
  justTalk: "Juste parler",
  needsComputer: "Le partage d’écran et l’affichage côte à côte nécessitent un ordinateur.",

  errors: {
    notConfigured: "Les clés LiveKit ne sont pas configurées",
    logIn: "Veuillez vous connecter",
    lessonNotFound: "Cours introuvable",
    nameRequired: "Veuillez saisir votre prénom",
    invalidInvite: "Ce lien d’invitation n’est pas valide",
    badRequest: "Requête invalide",
    monthLimitTeacher: (hours) =>
      `Vous avez utilisé les ${hours} heures de cours de ce mois-ci (TeachingTime est gratuit tant qu’il est nouveau). Elles reviennent le 1er du mois.`,
    monthLimitStudent: "Le temps de cours de votre professeur pour ce mois-ci est épuisé. Parlez-lui-en.",
    lessonLimit: (hours) =>
      `Ce cours a duré ${hours} heures, le maximum pour un cours, il a donc pris fin. Relancez-le pour continuer.`,
  },
};
