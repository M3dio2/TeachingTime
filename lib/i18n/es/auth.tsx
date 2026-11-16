import type { ReactNode } from "react";
import type { auth as en } from "../en/auth";

export const auth: typeof en = {
  brandTitle: "Cada clase en un espacio tranquilo.",
  brandText: "Video, pantalla compartida, un cuaderno compartido y una pizarra. Tu estudiante entra con un enlace, sin crear una cuenta.",
  brandPoints: [
    "Las dos cámaras siguen a la vista mientras compartes tu pantalla",
    "Las notas y los dibujos se actualizan al instante para los dos",
    "Tú decides cuándo tu estudiante puede escribir y dibujar",
  ],

  email: "Correo electrónico",
  emailPlaceholder: "tu@ejemplo.com",
  password: "Contraseña",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  backToLogin: "Volver a iniciar sesión",
  logIn: "Iniciar sesión",
  checkEmail: "Revisa tu correo",
  noEmail: "¿No te llega el correo después de unos minutos? Revisa la carpeta de spam.",

  captchaFailed: "No se pudo cargar la comprobación de que no eres un robot. Recarga la página o prueba con otro navegador.",
  captchaWait: "Comprobando que no eres un robot…",

  googleContinue: "Continuar con Google",
  googleOpening: "Abriendo Google…",
  googleStartFailed: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
  googleFailed: "No se completó el inicio de sesión con Google. Inténtalo de nuevo o entra con tu correo.",
  orWithEmail: "o con tu correo",

  loginTitle: "Acceso para profesores",
  loginIntro: "Hola de nuevo. Inicia sesión para ver tus aulas.",
  passwordPlaceholder: "Tu contraseña",
  forgotPasswordLink: "¿Olvidaste tu contraseña?",
  loggingIn: "Iniciando sesión…",
  newHere: "¿Eres nuevo?",
  createTeacherAccount: "Crea una cuenta de profesor",
  areYouStudent: "¿Eres estudiante?",
  studentHint: "Abre el enlace de invitación que te envió tu profesor. No necesitas una cuenta.",

  signupIntro: "Crea un aula para cada estudiante e invítalo con un enlace.",
  yourName: "Tu nombre",
  namePlaceholder: "p. ej. Laura",
  nameHint: "Tus estudiantes lo ven en tu cámara en cada clase.",
  creatingAccount: "Creando tu cuenta…",
  createAccount: "Crear cuenta",
  agreeTerms: (terms: ReactNode, privacy: ReactNode): ReactNode => (
    <>
      Al crear una cuenta aceptas los {terms} y la {privacy}.
    </>
  ),
  termsLink: "términos",
  privacyLink: "política de privacidad",
  haveAccount: "¿Ya tienes una cuenta?",
  signupSent: (email: ReactNode): ReactNode => (
    <>Enviamos un enlace a {email}. Haz clic en él para terminar de crear tu cuenta.</>
  ),

  forgotTitle: "¿Olvidaste tu contraseña?",
  forgotIntro: "Escribe tu correo y te enviaremos un enlace para elegir una nueva.",
  sendLink: "Enviar enlace",
  resetSent: (email: ReactNode): ReactNode => (
    <>Si existe una cuenta para {email}, le enviamos un enlace para elegir una nueva contraseña.</>
  ),

  confirmPassword: "Confirmar contraseña",
  passwordsDontMatch: "Las dos contraseñas no coinciden.",
  ruleLength: (n: number) => `${n} caracteres o más`,
  ruleMix: "Letras y números",
  ruleDone: "(listo)",
  ruleNotYet: "(todavía no)",
  passwordTooWeak: (n: number) => `Usa al menos ${n} caracteres, con letras y números.`,

  resetTitle: "Elige una nueva contraseña",
  resetIntro: "La usarás la próxima vez que inicies sesión.",
  newPassword: "Nueva contraseña",
  savePassword: "Guardar contraseña",

  expiredTitle: "Este enlace ha caducado",
  expiredIntro: "Los enlaces de los correos funcionan una sola vez y por tiempo limitado. Si ya lo usaste, simplemente inicia sesión.",
  resettingPassword: "¿Quieres restablecer tu contraseña?",
  sendNewLink: "Enviar un enlace nuevo",

  errors: {
    invalid_credentials: "Correo o contraseña incorrectos. Revisa ambos o restablece tu contraseña.",
    email_not_confirmed: "Primero confirma tu correo: haz clic en el enlace que te enviamos.",
    user_already_exists: "Ya hay una cuenta con este correo. Inicia sesión.",
    email_exists: "Ya hay una cuenta con este correo. Inicia sesión.",
    weak_password: "Usa al menos 10 caracteres, con letras y números.",
    same_password: "Esa es tu contraseña actual. Elige una nueva.",
    email_address_invalid: "Revisa la dirección de correo.",
    signup_disabled: "Ahora mismo no se pueden crear cuentas nuevas.",
    over_email_send_rate_limit: "Se enviaron demasiados correos. Inténtalo de nuevo en una hora.",
    over_request_rate_limit: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
    captcha_failed: "La comprobación de que no eres un robot no funcionó. Espera a que aparezca la marca e inténtalo de nuevo.",
  },
  errorUnknown: "Algo salió mal. Inténtalo de nuevo.",
};
