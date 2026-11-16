import type { ReactNode } from "react";
import type { auth as en } from "../en/auth";

export const auth: typeof en = {
  brandTitle: "Jede Lektion in einem ruhigen Raum.",
  brandText: "Video, Bildschirmfreigabe, ein gemeinsames Heft und ein Whiteboard. Deine Schüler kommen mit einem Link dazu, ganz ohne Konto.",
  brandPoints: [
    "Beide Kameras bleiben sichtbar, während du deinen Bildschirm teilst",
    "Notizen und Zeichnungen sind sofort bei euch beiden",
    "Du entscheidest, wann deine Schüler schreiben und zeichnen dürfen",
  ],

  email: "E-Mail",
  emailPlaceholder: "du@beispiel.de",
  password: "Passwort",
  showPassword: "Passwort anzeigen",
  hidePassword: "Passwort verbergen",
  backToLogin: "Zurück zur Anmeldung",
  logIn: "Anmelden",
  checkEmail: "Schau in dein Postfach",
  noEmail: "Nach ein paar Minuten noch keine E-Mail? Schau in deinen Spam-Ordner.",

  captchaFailed: "Die Prüfung, ob du kein Roboter bist, wurde nicht geladen. Lade die Seite neu oder nimm einen anderen Browser.",
  captchaWait: "Prüfung läuft…",

  googleContinue: "Weiter mit Google",
  googleOpening: "Google wird geöffnet…",
  googleStartFailed: "Die Anmeldung mit Google konnte nicht starten. Bitte versuch es noch einmal.",
  googleFailed: "Die Anmeldung mit Google wurde nicht abgeschlossen. Versuch es noch einmal oder melde dich mit E-Mail an.",
  orWithEmail: "oder mit E-Mail",

  loginTitle: "Anmeldung für Lehrkräfte",
  loginIntro: "Willkommen zurück. Melde dich an, um deine Klassenzimmer zu sehen.",
  passwordPlaceholder: "Dein Passwort",
  forgotPasswordLink: "Passwort vergessen?",
  loggingIn: "Wird angemeldet…",
  newHere: "Neu hier?",
  createTeacherAccount: "Konto als Lehrkraft erstellen",
  areYouStudent: "Bist du Schüler?",
  studentHint: "Öffne den Einladungslink, den du bekommen hast. Du brauchst kein Konto.",

  signupIntro: "Richte für jeden Schüler ein Klassenzimmer ein und lade ihn mit einem Link ein.",
  yourName: "Dein Name",
  namePlaceholder: "z. B. Laura",
  nameHint: "Deine Schüler sehen ihn in jeder Lektion bei deiner Kamera.",
  creatingAccount: "Konto wird erstellt…",
  createAccount: "Konto erstellen",
  agreeTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
    <>
      Mit dem Erstellen eines Kontos stimmst du den {terms} und der {privacy} zu.
    </>
  ),
  termsLink: "Nutzungsbedingungen",
  privacyLink: "Datenschutzerklärung",
  haveAccount: "Du hast schon ein Konto?",
  signupSent: (email: ReactNode): ReactNode => (
    <>Wir haben einen Link an {email} geschickt. Klick darauf, um dein Konto fertig einzurichten.</>
  ),

  forgotTitle: "Passwort vergessen?",
  forgotIntro: "Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, mit dem du ein neues Passwort wählen kannst.",
  sendLink: "Link senden",
  resetSent: (email: ReactNode): ReactNode => (
    <>Falls es ein Konto für {email} gibt, haben wir einen Link geschickt, um ein neues Passwort zu wählen.</>
  ),

  confirmPassword: "Passwort bestätigen",
  passwordsDontMatch: "Die beiden Passwörter stimmen nicht überein.",
  ruleLength: (n: number) => `Mindestens ${n} Zeichen`,
  ruleMix: "Buchstaben und Zahlen",
  ruleDone: "(erfüllt)",
  ruleNotYet: "(noch nicht)",
  passwordTooWeak: (n: number) => `Bitte nimm mindestens ${n} Zeichen, mit Buchstaben und Zahlen.`,

  resetTitle: "Neues Passwort wählen",
  resetIntro: "Damit meldest du dich beim nächsten Mal an.",
  newPassword: "Neues Passwort",
  savePassword: "Passwort speichern",

  expiredTitle: "Dieser Link ist abgelaufen",
  expiredIntro: "Links aus E-Mails funktionieren nur einmal und nur für kurze Zeit. Wenn du ihn schon benutzt hast, melde dich einfach an.",
  resettingPassword: "Willst du dein Passwort zurücksetzen?",
  sendNewLink: "Neuen Link senden",

  errors: {
    invalid_credentials: "E-Mail oder Passwort ist falsch. Prüf beides oder setz dein Passwort zurück.",
    email_not_confirmed: "Bitte bestätige zuerst deine E-Mail-Adresse: Klick auf den Link, den wir dir geschickt haben.",
    user_already_exists: "Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich stattdessen an.",
    email_exists: "Mit dieser E-Mail-Adresse gibt es schon ein Konto. Melde dich stattdessen an.",
    weak_password: "Bitte nimm mindestens 10 Zeichen, mit Buchstaben und Zahlen.",
    same_password: "Das ist dein aktuelles Passwort. Bitte wähle ein neues.",
    email_address_invalid: "Bitte prüf die E-Mail-Adresse.",
    signup_disabled: "Neue Konten können gerade nicht erstellt werden.",
    over_email_send_rate_limit: "Es wurden zu viele E-Mails verschickt. Bitte versuch es in einer Stunde noch einmal.",
    over_request_rate_limit: "Zu viele Versuche. Bitte warte eine Minute und versuch es dann noch einmal.",
    captcha_failed: "Die Prüfung, ob du kein Roboter bist, hat nicht geklappt. Warte auf das Häkchen und versuch es noch einmal.",
  },
  errorUnknown: "Da ist etwas schiefgelaufen. Bitte versuch es noch einmal.",
};
