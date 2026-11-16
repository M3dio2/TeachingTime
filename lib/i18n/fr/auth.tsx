import type { ReactNode } from "react";
import type { auth as en } from "../en/auth";

// French punctuation: a non-breaking space before ? ! : (written as \u00a0).
export const auth: typeof en = {
  brandTitle: "Chaque cours dans un espace calme.",
  brandText: "Vidéo, partage d’écran, un cahier partagé et un tableau blanc. Votre élève rejoint le cours avec un lien, sans compte.",
  brandPoints: [
    "Les deux caméras restent visibles pendant que vous partagez votre écran",
    "Les notes et les dessins s’affichent instantanément chez vous deux",
    "Vous décidez quand votre élève peut écrire et dessiner",
  ],

  email: "E-mail",
  emailPlaceholder: "vous@exemple.fr",
  password: "Mot de passe",
  showPassword: "Afficher le mot de passe",
  hidePassword: "Masquer le mot de passe",
  backToLogin: "Retour à la connexion",
  logIn: "Se connecter",
  checkEmail: "Consultez vos e-mails",
  noEmail: "Pas d’e-mail après quelques minutes\u00a0? Regardez dans vos spams.",

  captchaFailed: "La vérification anti-robot ne s’est pas chargée. Rechargez la page ou essayez un autre navigateur.",
  captchaWait: "Vérification anti-robot…",

  googleContinue: "Continuer avec Google",
  googleOpening: "Ouverture de Google…",
  googleStartFailed: "La connexion avec Google n’a pas démarré. Veuillez réessayer.",
  googleFailed: "La connexion avec Google n’a pas abouti. Réessayez ou connectez-vous par e-mail.",
  orWithEmail: "ou par e-mail",

  loginTitle: "Connexion enseignant",
  loginIntro: "Bon retour parmi nous. Connectez-vous pour voir vos classes.",
  passwordPlaceholder: "Votre mot de passe",
  forgotPasswordLink: "Mot de passe oublié\u00a0?",
  loggingIn: "Connexion…",
  newHere: "Nouveau ici\u00a0?",
  createTeacherAccount: "Créer un compte enseignant",
  areYouStudent: "Vous êtes élève\u00a0?",
  studentHint: "Ouvrez le lien d’invitation envoyé par votre enseignant. Pas besoin de compte.",

  signupIntro: "Créez une classe pour chaque élève et invitez-le avec un lien.",
  yourName: "Votre nom",
  namePlaceholder: "ex. Laura",
  nameHint: "Vos élèves le voient sur votre caméra à chaque cours.",
  creatingAccount: "Création du compte…",
  createAccount: "Créer le compte",
  agreeTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
    <>
      En créant un compte, vous acceptez les {terms} et la {privacy}.
    </>
  ),
  termsLink: "conditions d’utilisation",
  privacyLink: "politique de confidentialité",
  haveAccount: "Vous avez déjà un compte\u00a0?",
  signupSent: (email: ReactNode): ReactNode => (
    <>Nous avons envoyé un lien à {email}. Cliquez dessus pour finaliser la création de votre compte.</>
  ),

  forgotTitle: "Mot de passe oublié\u00a0?",
  forgotIntro: "Saisissez votre e-mail et nous vous enverrons un lien pour en choisir un nouveau.",
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
  passwordTooWeak: (n: number) => `Utilisez au moins ${n} caractères, avec des lettres et des chiffres.`,

  resetTitle: "Choisissez un nouveau mot de passe",
  resetIntro: "Vous l’utiliserez lors de votre prochaine connexion.",
  newPassword: "Nouveau mot de passe",
  savePassword: "Enregistrer le mot de passe",

  expiredTitle: "Ce lien a expiré",
  expiredIntro: "Les liens envoyés par e-mail ne fonctionnent qu’une fois, pendant un temps limité. Si vous l’avez déjà utilisé, connectez-vous simplement.",
  resettingPassword: "Vous réinitialisez votre mot de passe\u00a0?",
  sendNewLink: "Envoyer un nouveau lien",

  errors: {
    invalid_credentials: "E-mail ou mot de passe incorrect. Vérifiez les deux ou réinitialisez votre mot de passe.",
    email_not_confirmed: "Confirmez d’abord votre e-mail\u00a0: cliquez sur le lien que nous vous avons envoyé.",
    user_already_exists: "Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.",
    email_exists: "Un compte existe déjà avec cet e-mail. Connectez-vous plutôt.",
    weak_password: "Utilisez au moins 10 caractères, avec des lettres et des chiffres.",
    same_password: "C’est votre mot de passe actuel. Choisissez-en un nouveau.",
    email_address_invalid: "Vérifiez l’adresse e-mail.",
    signup_disabled: "Impossible de créer de nouveaux comptes pour le moment.",
    over_email_send_rate_limit: "Trop d’e-mails ont été envoyés. Réessayez dans une heure.",
    over_request_rate_limit: "Trop de tentatives. Patientez une minute, puis réessayez.",
    captcha_failed: "La vérification anti-robot n’a pas fonctionné. Attendez la coche, puis réessayez.",
  },
  errorUnknown: "Une erreur s’est produite. Veuillez réessayer.",
};
