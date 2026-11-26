import type { demo as en } from "../en/demo";

export const demo: typeof en = {
  badge: "Clase de demostración",
  leave: "Salir de la demo",
  studentCamera: (name) => `Cámara de ${name} (un dibujo en la demo)`,
  studentJoining: (name) => `${name} está entrando…`,
  you: "Tú",
  youInitial: "T",
  cameraOff: "Cámara apagada en la demo",
  tourLabel: "Recorrido de la demo",
  stepOf: (n, all) => `Paso ${n} de ${all}`,
  startTour: "Enséñame",
  explore: "Lo exploro yo",
  hideTips: "Ocultar los consejos",
  showTips: "Consejos",
  createClassroom: "Crea tu Classroom gratis",
  doItForMe: "Hazlo por mí",
  keepExploring: "Seguir probando",
  steps: {
    welcome: {
      title: (name) => `Tu clase de demostración con ${name}`,
      text: (name) =>
        `${name} es una estudiante de mentira: reacciona a lo que haces, como en una clase real. Sin cámara, sin micrófono, no se guarda nada.`,
    },
    worksheet: {
      title: () => "Muestra la ficha",
      text: (name) => `Haz clic en “Worksheet – Past simple” en los archivos de ${name}, o arrástrala al escenario. Ella la ve al instante.`,
    },
    write: {
      title: (name) => `Deja escribir a ${name}`,
      text: (name) => `Activa abajo “${name} puede escribir y dibujar”. Luego mira el bloc de texto.`,
    },
    quiz: {
      title: () => "Pon un quiz",
      text: (name) => `Arrastra el quiz “Past simple: irregular verbs” desde los archivos de ${name} sobre la ficha para cambiarla. Ella responde en su lado.`,
    },
    check: {
      title: (name) => `${name} ha terminado`,
      text: () => "Pulsa “Corregir” para ver qué está bien y qué no. En una clase real el resultado se guarda en el Classroom.",
    },
    end: {
      title: () => "Esto es TeachingTime",
      text: () =>
        "Hay más por probar: la pizarra, el audio para los dos, la imagen, Solo hablar. ¿Todo listo para tus propios estudiantes?",
    },
  },
  endTitle: "Esa fue la demo",
  endText: "Tu Classroom real funciona igual: un enlace por estudiante, tus archivos, quizzes y notas, todo en el navegador.",
  again: "Probar la demo otra vez",
  home: "Volver a la página de inicio",
  loading: "Preparando la demo…",
};
