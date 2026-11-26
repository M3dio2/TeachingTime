// Review A1: the demo lesson (/demo).
export const demo = {
  badge: "Demo lesson",
  leave: "Leave the demo",
  studentCamera: (name: string) => `${name}'s camera (a drawing in the demo)`,
  studentJoining: (name: string) => `${name} is joining…`,
  you: "You",
  youInitial: "Y",
  cameraOff: "Camera off in the demo",
  tourLabel: "Demo tour",
  stepOf: (n: number, all: number) => `Step ${n} of ${all}`,
  startTour: "Show me around",
  explore: "I'll explore myself",
  hideTips: "Hide the tips",
  showTips: "Tips",
  createClassroom: "Create your free Classroom",
  doItForMe: "Do it for me",
  keepExploring: "Keep exploring",
  steps: {
    welcome: {
      title: (name: string) => `Your demo lesson with ${name}`,
      text: (name: string) =>
        `${name} is a pretend student: she reacts to what you do, like in a real lesson. No camera, no microphone, nothing is saved.`,
    },
    worksheet: {
      title: () => "Show the worksheet",
      text: (name: string) => `Click “Worksheet – Past simple” in ${name}'s files, or drag it onto the stage. She sees it at once.`,
    },
    write: {
      title: (name: string) => `Let ${name} write`,
      text: (name: string) => `Turn on “${name} can write and draw” at the bottom. Then watch the text pad.`,
    },
    quiz: {
      title: () => "Give a quiz",
      text: (name: string) => `Drag the quiz “Past simple: irregular verbs” from ${name}'s files onto the worksheet to swap it. She answers on her side.`,
    },
    check: {
      title: (name: string) => `${name} is done`,
      text: () => "Press “Check answers” to see what's right and wrong. In a real lesson the result is saved in the Classroom.",
    },
    end: {
      title: () => "That's TeachingTime",
      text: () =>
        "There's more to try: the whiteboard, playing the audio for both of you, the picture, Just talk. Ready for your own students?",
    },
  },
  // The page around the room
  endTitle: "That was the demo",
  endText: "Your real Classroom works the same way: one link per student, your files, quizzes and notes, all in the browser.",
  again: "Try the demo again",
  home: "Back to the start page",
  loading: "Getting the demo ready…",
};
