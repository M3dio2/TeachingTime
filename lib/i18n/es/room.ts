import type { Device, room as en } from "../en/room";

const the = (d: Device) =>
  d === "camera" ? "la cámara" : d === "microphone" ? "el micrófono" : "la cámara o el micrófono";
const your = (d: Device) =>
  d === "camera" ? "tu cámara" : d === "microphone" ? "tu micrófono" : "tu cámara o tu micrófono";

export const room: typeof en = {
  gettingReady: "Preparando tu clase",
  leavingLesson: "Saliendo de la clase",
  joining: "Entrando…",
  continueHere: "Continuar aquí",
  backToDashboard: "Volver al panel",

  joinTitle: { before: "Únete a tu ", marked: "clase", after: "" },
  joinIntro: "Revisa tu cámara, escribe tu nombre y listo.",
  yourName: "Tu nombre",
  namePlaceholder: "p. ej., Ana",
  joinLesson: "Unirme a la clase",
  allowDevices: "Cuando tu navegador lo pida, permite la cámara y el micrófono.",
  couldNotJoin: "No se pudo entrar",

  endedTitle: "¡Hasta la próxima!",
  endedText: "La clase ha terminado. Puedes cerrar esta página.",
  replacedTitle: "Entraste a esta clase desde otro lugar.",
  replacedText:
    "Esta clase está abierta en otro dispositivo o pestaña. Cierra esta página o continúa aquí para traer la clase a esta.",
  leftTitle: "Saliste de la clase",
  rejoin: "Volver a entrar",
  leftText: "¿Saliste sin querer? Vuelve a entrar con el mismo nombre.",

  couldNotStart: "No se pudo iniciar la clase",
  cantStartTitle: "Esta clase no puede empezar",
  replacedTabTitle: "Entraste a esta clase en otra pestaña.",
  replacedTabText: "Cierra esta pestaña o continúa aquí para salir de la otra.",

  yourCamera: "Tu cámara",
  startingCamera: "Iniciando tu cámara…",
  turnOffMic: "Apagar el micrófono",
  turnOnMic: "Encender el micrófono",
  turnOffCam: "Apagar la cámara",
  turnOnCam: "Encender la cámara",

  device: {
    blocked: (d) =>
      `Tu navegador bloqueó ${the(d)}. Haz clic en el icono a la izquierda de la barra de direcciones, permite ${the(d)} y vuelve a cargar la página. Si ya está permitido ahí, da permiso a tu navegador en los ajustes de privacidad de tu equipo (Mac: Ajustes del Sistema → Privacidad y seguridad → Cámara / Micrófono).`,
    notFound: (d) =>
      d === "camera"
        ? "No se encontró ninguna cámara. Comprueba que esté conectada y vuelve a cargar la página."
        : d === "microphone"
          ? "No se encontró ningún micrófono. Comprueba que esté conectado y vuelve a cargar la página."
          : "No se encontró ninguna cámara o micrófono. Comprueba que estén conectados y vuelve a cargar la página.",
    inUse: (d) =>
      `Otra app está usando ${your(d)} (por ejemplo, Zoom o Teams). Cierra esa app y vuelve a cargar la página.`,
    failed: (d) => `No se pudo iniciar ${your(d)}. Vuelve a cargar la página para intentarlo de nuevo.`,
  },

  reconnecting: "Se perdió la conexión. Reconectando…",
  mutedByTeacher: "Tu profesor silenció tu micrófono. Haz clic en el botón del micrófono para volver a hablar.",
  waitingForStudent: "Esperando a que entre tu estudiante. Envíale el enlace para estudiantes.",
  waitingForTeacher: "Esperando a que entre tu profesor…",
  dismiss: "Descartar",
  connectionError: "Algo falló con la conexión. Revisa tu internet y vuelve a cargar.",
  muteFailed: "No se pudo silenciar. Inténtalo de nuevo.",
  lessonEndsSoon: (minutes, hours) =>
    `Esta clase termina en ${minutes} minutos: mientras TeachingTime sea gratis, una clase dura como máximo ${hours} horas. Después puedes volver a iniciarla.`,

  joined: (name) => `${name} se unió`,
  someone: "Alguien",
  thisPerson: "esta persona",
  yourStudent: "tu estudiante",
  yourTeacher: "tu profesor",
  filesTitle: (name) => `Archivos de ${name}`,

  lessonWith: (name) => `Clase con ${name}`,
  microphone: "Micrófono",
  camera: "Cámara",
  chooseMicrophone: "Elegir un micrófono",
  chooseCamera: "Elegir una cámara",
  leaveLesson: "Salir de la clase",
  leave: "Salir",
  shareScreen: "Compartir pantalla",
  stopSharing: "Dejar de compartir pantalla",
  mute: (name) => `Silenciar a ${name}`,
  muteShort: "Silenciar",
  micIsOff: (name) => `El micrófono de ${name} está apagado`,
  turnMicOff: (name) => `Apagar el micrófono de ${name}`,
  canEdit: (name) => `${name} puede editar`,
  viewsOnly: (name) => `${name} solo puede ver`,
  clickToChange: (label) => `${label}. Haz clic para cambiarlo.`,
  letWriteAndDraw: (name) => `Permitir que ${name} escriba y dibuje`,

  cameras: "Cámaras",
  dragToMoveLabel: (label) => `${label}. Arrastra para mover o usa las flechas.`,
  dragToMove: "Arrastra para mover",
  resizeCameras: "Cambiar el ancho de las cámaras",
  resizeFiles: (title) => `Cambiar el ancho: ${title}`,

  justTalkingTeacher: "Solo hablar. Las pestañas están plegadas para los dos.",
  justTalkingStudent: (name) => `${name} plegó las pestañas. Por ahora, solo hablar.`,
  showTabs: (n) => (n === 1 ? "Mostrar la pestaña" : "Mostrar las 2 pestañas"),

  lesson: "Clase",
  openTabs: "Pestañas abiertas",
  lessonTabs: "Pestañas de la clase",
  closeTab: (tab) => `Cerrar ${tab}`,
  openSecondTab: "Abrir una segunda pestaña",
  openAsSecondTab: (tab) => `Abrir ${tab} como segunda pestaña`,
  showsTwoTabs: (name) => `${name} muestra dos pestañas`,
  showsTab: (name, tab) => `${name} muestra ${tab}`,
  following: (name) => `Siguiendo a ${name}`,
  files: "Archivos",
  moreControls: "Más controles",
  filesFull: "Hay dos pestañas abiertas. Cierra una con su × para mostrar un archivo.",
  tapFileToShow: (name) => `Toca un archivo para mostrárselo a ${name}. Se abre como segunda pestaña.`,
  lessonControls: "Controles de la clase",
  canWriteAndDraw: (name) => `${name} puede escribir y dibujar`,
  showTheTabs: "Mostrar las pestañas",
  justTalk: "Solo hablar",
  needsComputer: "Compartir pantalla y ver lado a lado requieren una computadora.",

  errors: {
    notConfigured: "Las claves de LiveKit no están configuradas",
    logIn: "Inicia sesión",
    lessonNotFound: "No se encontró la clase",
    nameRequired: "Escribe tu nombre",
    invalidInvite: "Este enlace de invitación no es válido",
    badRequest: "Solicitud no válida",
    monthLimitTeacher: (hours) =>
      `Ya usaste las ${hours} horas de clase de este mes (TeachingTime es gratis mientras es nuevo). Vuelven el día 1.`,
    monthLimitStudent: "El tiempo de clase de tu profesor para este mes se agotó. Coméntaselo.",
    lessonLimit: (hours) =>
      `Esta clase duró ${hours} horas, el máximo para una clase, así que terminó. Vuelve a iniciarla para continuar.`,
  },
};
