import type { dashboard as en } from "../en/dashboard";

export const dashboard: typeof en = {
  // Header
  logOut: "Cerrar sesión",
  loggingOut: "Cerrando sesión…",
  loadingClassrooms: "Cargando tus Classrooms",
  leavingLesson: "Saliendo de la clase",

  // Name chip
  changeNameTitle: "Cambiar el nombre que ven tus estudiantes en clase",
  nameChipLabel: (name: string) => `Tu nombre en clase: ${name}. Cambiarlo`,
  addYourName: "Añade tu nombre",
  nameInLessons: "Tu nombre en clase",
  namePlaceholder: "p. ej. Profe Ana",

  // Feedback
  sendFeedback: "Enviar comentarios",
  feedback: "Comentarios",
  feedbackThanks: "¡Gracias! Leemos todos los mensajes.",
  feedbackQuestion: "¿Qué funciona, qué falta, qué falló?",
  feedbackPlaceholder: "p. ej. En mi iPad la pizarra…",
  feedbackFailed: "No se envió. Inténtalo de nuevo en un momento.",

  // Welcome (first visit)
  welcomeTitle: "¡Bienvenido! ¿Cómo quieres que te llamen tus estudiantes?",
  welcomeText: "Este nombre aparece en tu cámara en cada clase. Puedes cambiarlo más tarde.",

  // Quick call
  quickCallInProgress: "Llamada rápida en curso",
  studentWaiting: "Tu estudiante está esperando.",
  nobodyInCall: "No hay nadie en la llamada.",
  rejoin: "Volver a entrar",
  endQuickCallConfirm: "¿Terminar esta llamada rápida? El enlace del estudiante dejará de funcionar.",
  ending: "Terminando…",
  endCall: "Terminar",
  startQuickCall: "Iniciar una llamada rápida",
  startNewQuickCall: "Iniciar otra llamada rápida",
  starting: "Iniciando…",
  quickCallHint: "Una llamada única con un enlace nuevo. No se guarda nada.",
  newQuickCallHint: "Termina la llamada de arriba e inicia una nueva.",

  // Classrooms
  yourClassrooms: "Tus Classrooms",
  // The heading again, in parts: the marker underlines `marked`.
  yourClassroomsTitle: { before: "Tus ", marked: "Classrooms", after: "" },
  classroomsIntro: "Un Classroom por estudiante: sus archivos y un enlace que es el mismo cada semana.",
  classroomLimit: (max: number) => `Por ahora el máximo es ${max} Classrooms. Elimina uno para añadir otro.`,
  firstStudentTitle: "Empieza con tu primer estudiante",
  firstStudentText:
    "Escribe su nombre y pulsa Añadir. Tendrás un Classroom para sus archivos y un enlace para enviarle.",
  addClassroom: "Añadir un Classroom",
  forNewStudent: "Para un estudiante nuevo",
  studentName: "Nombre del estudiante",
  studentNamePlaceholder: "Nombre del estudiante, p. ej. Ana",
  add: "Añadir",
  adding: "Añadiendo…",

  // Classroom card
  openClassroom: (name: string) => `Abrir el Classroom de ${name}`,
  lastLesson: "Última clase:",
  noLessonsYet: "Todavía sin clases",
  waiting: "Esperando",
  noFilesYet: "Todavía sin archivos",
  startLesson: "Empezar clase",
  // The classroom card's button: short, it shares a row with "Copy link" and ⋯.
  startLessonShort: "Empezar",
  copyLink: "Copiar enlace",
  moreFor: (name: string) => `Más opciones para ${name}`,
  removeConfirm: (name: string) =>
    `¿Eliminar a ${name}? Su enlace dejará de funcionar y se borrarán sus archivos.`,
  removeName: (name: string) => `Eliminar a ${name}`,
  countPictures: (n: number) => `${n} ${n === 1 ? "imagen" : "imágenes"}`,
  countPdfs: (n: number) => `${n} PDF`,
  countWord: (n: number) => `${n} ${n === 1 ? "archivo" : "archivos"} Word`,
  countAudio: (n: number) => `${n} ${n === 1 ? "audio" : "audios"}`,
  countLinks: (n: number) => `${n} ${n === 1 ? "enlace" : "enlaces"}`,
  countDocuments: (n: number) => `${n} ${n === 1 ? "documento" : "documentos"}`,
  countVideos: (n: number) => `${n} ${n === 1 ? "video" : "videos"}`,
  groups: { documents: "Documentos", pictures: "Imágenes", videos: "Videos", audio: "Audio", links: "Enlaces" },
  noFiles: "Aún no hay archivos. Sube documentos, imágenes, audio o videos, o añade un enlace.",
  kindLabels: { image: "Imagen", video: "Video", audio: "Audio" },

  // Copy link button
  copyStudentLink: "Copiar enlace del estudiante",
  copyNamesLink: (name: string) => `Copiar el enlace de ${name}`,
  copied: "¡Copiado!",
  copy: "Copiar",

  // Classroom page
  removeClassroom: "Eliminar este Classroom",
  removeClassroomHint: "El enlace dejará de funcionar y se borrarán los archivos.",
  namesLink: (name: string) => `Enlace de ${name}`,
  linkHint: (name: string) => `${name} entra con este enlace. Es el mismo cada semana.`,

  // Files
  files: "Archivos",
  fileCount: (n: number) => `${n} ${n === 1 ? "archivo" : "archivos"}`,
  show: "Mostrar",
  all: "Todo",
  sections: {
    image: { title: "Imágenes", filter: "Imágenes", empty: "Todavía no hay imágenes." },
    pdf: { title: "PDF", filter: "PDF", empty: "Todavía no hay PDF." },
    doc: { title: "Archivos Word", filter: "Word", empty: "Todavía no hay archivos Word." },
    audio: { title: "Audio", filter: "Audio", empty: "Todavía no hay audios." },
    link: { title: "Enlaces", filter: "Enlaces", empty: "Todavía no hay enlaces." },
  },
  openFile: (name: string) => `Abrir ${name}`,
  filesTip:
    "En una clase, estos archivos están en el panel lateral. Haz clic en uno para mostrárselo a los dos (los videos se reproducen sincronizados), pulsa reproducir para el audio o arrástralo al escenario.",
  youtubeVideo: "Video de YouTube",
  linkToAdd: "Enlace para añadir",
  linkPlaceholder: "Pega un video de YouTube o cualquier enlace",
  addLink: "Añadir enlace",
  badLink: "Eso no parece una dirección web. Pega un enlace que empiece por https://",
  linkNotSaved: "No se pudo guardar el enlace. Inténtalo de nuevo.",
  deleteName: (name: string) => `Borrar ${name}`,
  delete: "Borrar",
  deleteConfirm: (name: string) => `¿Borrar ${name}?`,
  pause: "Pausa",
  listen: "Escuchar",
  pauseName: (name: string) => `Pausar ${name}`,
  listenTo: (name: string) => `Escuchar ${name}`,

  // Upload
  uploadFiles: "Subir archivos",
  dropToUpload: "Suelta para subir",
  dropFilesHere: "Suelta archivos aquí",
  dropHint: "Documentos, imágenes, audio o videos, hasta 10 MB cada uno",
  uploading: (name: string) => `Subiendo ${name}…`,
  upload: {
    oldWord: (name: string) =>
      `${name} es un archivo antiguo de Word. En Word, guárdalo como .docx (o PDF) y sube ese.`,
    wrongType: (name: string) => `${name}: este tipo de archivo no se puede subir.`,
    tooBig: (name: string) => `${name} pesa más de 10 MB.`,
    noRoom: (name: string, mb: number) =>
      `${name} no cabe: tus archivos pueden ocupar ${mb} MB en total. Borra algunos primero.`,
    notAccepted: (name: string) => `${name}: este tipo de archivo todavía no se acepta.`,
    failed: (name: string) => `No se pudo subir ${name}. Inténtalo de nuevo.`,
  },

  // Storage
  storage: "Almacenamiento",
  storageUsed: (used: number, total: number) => `${used} MB de ${total} MB`,
  storageUsedLabel: (used: number, total: number) => `${used} de ${total} MB usados`,
  storageHint: "Todos tus Classrooms juntos. Hasta 10 MB por archivo.",
};
