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
  yourLesson: "Tu clase",
  microphone: "Micrófono",
  myMicOn: "Micro activado",
  myMicOff: "Micro apagado",
  myCamOn: "Cámara activada",
  myCamOff: "Cámara apagada",
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

  // R1: grabación
  rec: {
    record: "Grabar",
    stopRecording: "Detener la grabación",
    title: "Grabar esta clase",
    whatToRecord: "Qué grabar",
    voices: "Voces",
    voicesHint: "Los dos, más el audio y los vídeos que pongas.",
    cameras: "Cámaras",
    camerasHint: "Las dos cámaras una al lado de la otra.",
    screen: "Pantalla de la clase",
    screenHint: "Archivos, pizarra, texto y pantallas compartidas. Tu navegador te pregunta qué pestaña: elige esta.",
    screenNotHere: "No es posible en este navegador. Usa Chrome, Edge o Firefox en un ordenador.",
    privacy: (name: string) =>
      `Primero se le pregunta a ${name}. El vídeo se guarda solo en este dispositivo, TeachingTime nunca lo recibe. Solo tú puedes detenerlo; también se detiene si ${name} sale de la clase.`,
    needsStudent: "Tu estudiante tiene que estar en la clase.",
    yourStudent: "tu estudiante",
    yourTeacher: "Tu profesor",
    askAndRecord: (name: string) => `Preguntar a ${name} y grabar`,
    cancel: "Cancelar",
    askingTitle: "Preguntando…",
    asking: (name: string) => `Esperando a que ${name} acepte la grabación.`,
    studentSaidNo: (name: string) => `${name} no quiere que se grabe la clase. No se grabó nada.`,
    studentLeftStopped: (name: string) => `${name} salió de la clase, así que la grabación se detuvo.`,
    studentStopped: (name: string) => `${name} detuvo la grabación.`,
    screenRefused: "El navegador no permitió grabar la pestaña. Inténtalo de nuevo o graba sin la pantalla de la clase.",
    failed: "La grabación no pudo empezar en este navegador.",
    saved: (file: string) => `Grabación guardada: ${file}`,
    leftover: (file: string) => `Una grabación no se guardó porque la clase se cerró: ${file}`,
    download: "Descargar",
    discard: "Eliminar",
    consentTitle: "¿Grabar esta clase?",
    consent: (name: string) => `${name} quiere grabar esta clase.`,
    whatIsRecorded: "Se graba:",
    consentHint: (name: string) =>
      `La grabación se guarda solo en el dispositivo de ${name}. Mientras dure verás una señal roja. Solo tu profesor puede detenerla; si sales de la clase, también se detiene.`,
    allow: "Permitir",
    dontAllow: "No permitir",
    rec: "REC",
    recordingNow: "Esta clase se está grabando",
    stop: "Detener",
  },
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
