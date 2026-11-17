import type { ReactNode } from "react";
import type { auth as en } from "../en/auth";

// French punctuation: a non-breaking space before ? ! : (written as \u00a0).
export const auth: typeof en = {
  brandTitle: "Chaque cours dans un espace calme.",
  brandText: "Vidéo, partage d’écran, un cahier partagé et un tableau blanc. Ton élève rejoint le cours avec un lien, sans compte.",
  brandPoints: [
    "Les deux caméras restent visibles pendant que tu partages ton écran",
    "Les notes et les dessins s’affichent instantanément chez vous deux",
    "Tu décides quand ton élève peut écrire et dessiner",
  ],

  email: "E-mail",
  emailPlaceholder: "toi@exemple.fr",
  password: "Mot de passe",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  backToLogin: "Retour à la connexion",
  logIn: "Se connecter",
  checkEmail: "Consulte tes e-mails",
  noEmail: "Pas d’e-mail après quelques minutes\u00a0? Regarde dans tes spams.",

  captchaFailed: "La vérification anti-robot ne s’est pas chargée. Recharge la page ou essaie un autre navigateur.",
  captchaWait: "Vérification anti-robot…",

  googleContinue: "Continuer avec Google",
  googleOpening: "Ouverture de Google…",
  googleStartFailed: "La connexion avec Google n’a pas démarré. Réessaie.",
  googleFailed: "La connexion avec Google n’a pas abouti. Réessaie ou connecte-toi par e-mail.",
  orWithEmail: "ou par e-mail",

  loginTitle: "Connexion enseignant",
  loginIntro: "Bon retour parmi nous. Connecte-toi pour voir tes Classrooms.",
  passwordPlaceholder: "Ton mot de passe",
  forgotPasswordLink: "Mot de passe oublié\u00a0?",
  loggingIn: "Connexion…",
  newHere: "Nouveau ici\u00a0?",
  createTeacherAccount: "Créer un compte enseignant",
  areYouStudent: "Tu es élève\u00a0?",
  studentHint: "Ouvre le lien d’invitation envoyé par ton enseignant. Pas besoin de compte.",

  signupIntro: "Crée un Classroom pour chaque élève et invite-le avec un lien.",
  yourName: "Ton nom",
  namePlaceholder: "ex. Laura",
  nameHint: "Tes élèves le voient sur ta caméra à chaque cours.",
  creatingAccount: "Création du compte…",
  createAccount: "Créer le compte",
  agreeTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
    <>
      En créant un compte, tu acceptes les {terms} et la {privacy}.
    </>
  ),
  termsLink: "conditions d’utilisation",
  privacyLink: "politique de confidentialité",
  haveAccount: "Tu as déjà un compte\u00a0?",
  signupSent: (email: ReactNode): ReactNode => (
    <>Nous avons envoyé un lien à {email}. Clique dessus pour finaliser la création de ton compte.</>
  ),

  forgotTitle: "Mot de passe oublié\u00a0?",
  forgotIntro: "Saisis ton e-mail et nous t’enverrons un lien pour en choisir un nouveau.",
  sendLink: "Envoyer le lien",
  resetSent: (email: ReactNode): ReactNode => (
    <>S’il existe un compte pour {email}, nous lui avons envoyé un lien pour choisir un nouveau mot de passe.</>
  ),

  confirmPassword: "Confirmer le mot de passe",
  passwordsDontMatch: "Les deux mots de passe ne correspondent pas.",
  ruleLength: (n: number) => `${n} caractères minimum`,
  ruleMix: "Lettres et chiffres",
  ruleDone: "(fait)",
  ruleNotYet: "(pas encore)",
  passwordTooWeak: (n: number) => `Utilise au moins ${n} caractères, avec des lettres et des chiffres.`,

  resetTitle: "Choisis un nouveau mot de passe",
  resetIntro: "Tu l’utiliseras lors de ta prochaine connexion.",
  newPassword: "Nouveau mot de passe",
  savePassword: "Enregistrer le mot de passe",

  expiredTitle: "Ce lien a expiré",
  expiredIntro: "Les liens envoyés par e-mail ne fonctionnent qu’une fois, pendant un temps limité. Si tu l’as déjà utilisé, connecte-toi simplement.",
  resettingPassword: "Tu réinitialises ton mot de passe\u00a0?",
  sendNewLink: "Envoyer un nouveau lien",

  errors: {
    invalid_credentials: "E-mail ou mot de passe incorrect. Vérifie les deux ou réinitialise ton mot de passe.",
    email_not_confirmed: "Confirme d’abord ton e-mail\u00a0: clique sur le lien que nous t’avons envoyé.",
    user_already_exists: "Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.",
    email_exists: "Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.",
    weak_password: "Utilise au moins 10 caractères, avec des lettres et des chiffres.",
    same_password: "C’est ton mot de passe actuel. Choisis-en un nouveau.",
    email_address_invalid: "Vérifie l’adresse e-mail.",
    signup_disabled: "Impossible de créer de nouveaux comptes pour le moment.",
    over_email_send_rate_limit: "Trop d’e-mails ont été envoyés. Réessaie dans une heure.",
    over_request_rate_limit: "Trop de tentatives. Patiente une minute, puis réessaie.",
    captcha_failed: "La vérification anti-robot n’a pas fonctionné. Attends la coche, puis réessaie.",
  },
  errorUnknown: "Une erreur s’est produite. Réessaie.",
};
