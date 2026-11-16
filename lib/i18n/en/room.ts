// The lesson room's shell: joining, the camera check, cameras, controls, status banners.
// Names passed in are already capitalised where a sentence starts.
export type Device = "camera" | "microphone" | "either";

const deviceName = (d: Device) =>
  d === "camera" ? "camera" : d === "microphone" ? "microphone" : "camera or microphone";

export const room = {
  // Loading and full-page messages
  gettingReady: "Getting your lesson ready",
  leavingLesson: "Leaving the lesson",
  joining: "Joining…",
  continueHere: "Continue here",
  backToDashboard: "Back to dashboard",

  // Student join card
  joinTitle: { before: "Join your ", marked: "lesson", after: "" },
  joinIntro: "Check your camera, type your name, and you're in.",
  yourName: "Your name",
  namePlaceholder: "e.g. Anna",
  joinLesson: "Join lesson",
  allowDevices: "When your browser asks, allow the camera and microphone.",
  couldNotJoin: "Could not join",

  // Student: out of the room
  endedTitle: "See you next time!",
  endedText: "The lesson has ended. You can close this page.",
  replacedTitle: "You joined this lesson somewhere else.",
  replacedText:
    "This lesson is open on another device or tab. Close this page, or continue here to move the lesson to this one.",
  leftTitle: "You left the lesson",
  rejoin: "Rejoin",
  leftText: "Left by mistake? Join again with the same name.",

  // Teacher: can't start / opened elsewhere
  couldNotStart: "Could not start the lesson",
  cantStartTitle: "This lesson can't start",
  replacedTabTitle: "You joined this lesson in another tab.",
  replacedTabText: "Close this tab, or continue here to leave the other one.",

  // Camera check
  yourCamera: "Your camera",
  startingCamera: "Starting your camera…",
  turnOffMic: "Turn off your microphone",
  turnOnMic: "Turn on your microphone",
  turnOffCam: "Turn off your camera",
  turnOnCam: "Turn on your camera",

  // Camera and microphone problems
  device: {
    blocked: (d: Device) =>
      `Your browser blocked the ${deviceName(d)}. Click the icon at the left of the address bar, allow the ${deviceName(d)}, then reload the page. If it is already allowed there, allow your browser in your computer's privacy settings (Mac: System Settings → Privacy & Security → Camera / Microphone).`,
    notFound: (d: Device) => `No ${deviceName(d)} was found. Check that it is connected, then reload the page.`,
    inUse: (d: Device) =>
      `Your ${deviceName(d)} is being used by another app (for example Zoom or Teams). Close that app, then reload the page.`,
    failed: (d: Device) => `Your ${deviceName(d)} could not be started. Reload the page to try again.`,
  },

  // Status banner
  reconnecting: "Connection lost. Reconnecting…",
  mutedByTeacher: "Your teacher muted your microphone. Click the microphone button to speak again.",
  waitingForStudent: "Waiting for your student to join. Send them the student link.",
  waitingForTeacher: "Waiting for your teacher to join…",
  dismiss: "Dismiss",
  connectionError: "Something went wrong with the connection. Check your internet and reload.",
  muteFailed: "Muting didn't work. Please try again.",
  lessonEndsSoon: (minutes: number, hours: number) =>
    `This lesson ends in ${minutes} minutes: ${hours} hours is the most for one lesson while TeachingTime is free. You can start it again afterwards.`,

  // Who's there
  joined: (name: string) => `${name} joined`,
  someone: "Someone",
  thisPerson: "this person",
  yourStudent: "your student",
  yourTeacher: "your teacher",
  filesTitle: (name: string) => `${name}'s files`,

  // Controls
  lessonWith: (name: string) => `Lesson with ${name}`,
  microphone: "Microphone",
  camera: "Camera",
  chooseMicrophone: "Choose a microphone",
  chooseCamera: "Choose a camera",
  leaveLesson: "Leave the lesson",
  leave: "Leave",
  shareScreen: "Share your screen",
  stopSharing: "Stop sharing your screen",
  mute: (name: string) => `Mute ${name}`,
  muteShort: "Mute",
  micIsOff: (name: string) => `${name}'s microphone is off`,
  turnMicOff: (name: string) => `Turn ${name}'s microphone off`,
  canEdit: (name: string) => `${name} can edit`,
  viewsOnly: (name: string) => `${name} views only`,
  clickToChange: (label: string) => `${label}. Click to change.`,
  letWriteAndDraw: (name: string) => `Let ${name} write and draw`,

  // Cameras and layout
  cameras: "Cameras",
  dragToMoveLabel: (label: string) => `${label}. Drag to move, or use the arrow keys.`,
  dragToMove: "Drag to move",
  resizeCameras: "Resize the camera column",
  resizeFiles: (title: string) => `Resize ${title}`,

  // Just talk
  justTalkingTeacher: "Just talking. The tabs are folded for both of you.",
  justTalkingStudent: (name: string) => `${name} folded the tabs. Just talking for now.`,
  showTabs: (n: number): string => (n === 1 ? "Show the tab" : "Show the 2 tabs"),

  // Phones
  lesson: "Lesson",
  openTabs: "Open tabs",
  lessonTabs: "Lesson tabs",
  closeTab: (tab: string) => `Close ${tab}`,
  openSecondTab: "Open a second tab",
  openAsSecondTab: (tab: string) => `Open ${tab} as a second tab`,
  showsTwoTabs: (name: string) => `${name} shows two tabs`,
  showsTab: (name: string, tab: string) => `${name} shows ${tab}`,
  following: (name: string) => `Following ${name}`,
  files: "Files",
  moreControls: "More controls",
  filesFull: "Two tabs are open. Close one with its × to show a file.",
  tapFileToShow: (name: string) => `Tap a file to show it to ${name}. It opens as a second tab.`,
  lessonControls: "Lesson controls",
  canWriteAndDraw: (name: string) => `${name} can write and draw`,
  showTheTabs: "Show the tabs",
  justTalk: "Just talk",
  needsComputer: "Screen sharing and side by side need a computer.",

  // /api/livekit-token errors (shown on the join card or the teacher's "can't start" page)
  errors: {
    notConfigured: "LiveKit keys are not configured",
    logIn: "Please log in",
    lessonNotFound: "Lesson not found",
    nameRequired: "Name is required",
    invalidInvite: "This invite link is not valid",
    badRequest: "Bad request",
    monthLimitTeacher: (hours: number) =>
      `You've used this month's ${hours} hours of lessons (TeachingTime is free while it's new). They come back on the 1st.`,
    monthLimitStudent: "Your teacher's lesson time for this month is used up. Please ask them.",
    lessonLimit: (hours: number) =>
      `This lesson ran for ${hours} hours, the most for one lesson, so it ended. Start it again to continue.`,
  },
};
