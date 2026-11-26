// The dashboard (your classrooms) and a student's classroom page with its files.
export const dashboard = {
  // Header
  logOut: "Log out",
  loggingOut: "Logging out…",
  loadingClassrooms: "Loading your Classrooms",
  leavingLesson: "Leaving the lesson",

  // Name chip
  changeNameTitle: "Change the name students see in lessons",
  nameChipLabel: (name: string) => `Your name in lessons: ${name}. Change it`,
  addYourName: "Add your name",
  accountLabel: (name: string) => `Account: ${name}`,
  quickCallStudent: "Your quick call",
  // Review A2: a waiting student
  isWaitingTitle: (name: string) => `${name} is waiting`,
  isWaitingBody: "Click to start the lesson.",
  notifyOffer: "Get a notification when a student is waiting, even in another tab.",
  notifyTurnOn: "Turn on",
  notifyNotNow: "Not now",
  // Review A7: getting started
  start: {
    title: "Getting started",
    progress: (done: number, all: number) => `${done} of ${all} done`,
    done: "done",
    hide: "Hide getting started",
    classroom: "Add a Classroom for a student",
    classroomText: "Type their name below. One Classroom per student.",
    link: "Send your student their link",
    linkText: (name: string) => `${name} joins with it, every week. No account needed.`,
    linkTextNone: "Each Classroom has its own link.",
    copyLink: "Copy the link",
    test: "Try a lesson yourself",
    testText: "Start the lesson, then open the student link on your phone or in another browser.",
    openStudentView: "Open the student view",
    file: "Add a worksheet or a picture",
    fileText: "Files in the Classroom are one click away in the lesson.",
    openClassroom: "Open the Classroom",
  },
  nameInLessons: "Your name in lessons",
  namePlaceholder: "e.g. Ms Smith",

  // Feedback
  sendFeedback: "Send feedback",
  feedback: "Feedback",
  feedbackThanks: "Thank you! Every message is read.",
  feedbackQuestion: "What works, what's missing, what broke?",
  feedbackPlaceholder: "e.g. On my iPad the whiteboard…",
  feedbackFailed: "It didn't send. Please try again in a moment.",

  // Welcome (first visit)
  welcomeTitle: "Welcome! What should your students call you?",
  welcomeText: "This name is shown on your camera in every lesson. You can change it later.",

  // Quick call
  quickCallInProgress: "Quick call in progress",
  studentWaiting: "Your student is waiting.",
  nobodyInCall: "Nobody is in the call.",
  rejoin: "Rejoin",
  endQuickCallConfirm: "End this quick call? The student link will stop working.",
  ending: "Ending…",
  endCall: "End call",
  startQuickCall: "Start a quick call",
  startNewQuickCall: "Start a new quick call",
  starting: "Starting…",
  quickCallHint: "A one-off call with a new link. Nothing is saved.",
  newQuickCallHint: "Ends the call above and starts a fresh one.",

  // Classrooms
  yourClassrooms: "Your Classrooms",
  // The heading again, in parts: the marker underlines `marked`.
  yourClassroomsTitle: { before: "Your ", marked: "Classrooms", after: "" },
  classroomsIntro: "One Classroom per student: their files, and a link that stays the same every week.",
  classroomLimit: (max: number) => `${max} Classrooms is the most for now. Remove one to add another.`,
  firstStudentTitle: "Start with your first student",
  firstStudentText: "Type their name and press Add. You get a Classroom for their files and a link to send them.",
  addClassroom: "Add a Classroom",
  forNewStudent: "For a new student",
  studentName: "Student's name",
  studentNamePlaceholder: "Student's name, e.g. Anna",
  add: "Add",
  adding: "Adding…",

  // Classroom card
  openClassroom: (name: string) => `Open ${name}'s Classroom`,
  lastLesson: "Last lesson:",
  noLessonsYet: "No lessons yet",
  waiting: "Waiting",
  noFilesYet: "No files yet",
  startLesson: "Start lesson",
  // The classroom card's button: short, it shares a row with "Copy link" and ⋯.
  startLessonShort: "Start lesson",
  copyLink: "Copy link",
  moreFor: (name: string) => `More for ${name}`,
  removeConfirm: (name: string) => `Remove ${name}? Their link will stop working and their files are deleted.`,
  removeName: (name: string) => `Remove ${name}`,
  // "3 pictures · 2 PDFs · 2 audio"
  countPictures: (n: number) => `${n} ${n === 1 ? "picture" : "pictures"}`,
  countPdfs: (n: number) => `${n} ${n === 1 ? "PDF" : "PDFs"}`,
  countWord: (n: number) => `${n} Word ${n === 1 ? "file" : "files"}`,
  countAudio: (n: number) => `${n} audio`,
  countLinks: (n: number) => `${n} ${n === 1 ? "link" : "links"}`,
  countDocuments: (n: number) => `${n} ${n === 1 ? "document" : "documents"}`,
  countVideos: (n: number) => `${n} ${n === 1 ? "video" : "videos"}`,
  // F1: one list of files, with these filters
  groups: { documents: "Documents", pictures: "Pictures", videos: "Videos", audio: "Audio", links: "Links" },
  noFiles: "No files yet. Upload documents, pictures, audio or video, or add a link.",
  kindLabels: { image: "Picture", video: "Video", audio: "Audio" },

  // Copy link button
  copyStudentLink: "Copy student link",
  copyNamesLink: (name: string) => `Copy ${name}'s student link`,
  copied: "Copied!",
  copy: "Copy",

  // Classroom page
  removeClassroom: "Remove this Classroom",
  removeClassroomHint: "The link stops working and the files are deleted.",
  namesLink: (name: string) => `${name}'s link`,
  linkHint: (name: string) => `${name} joins with this link. It stays the same every week.`,

  // Files
  files: "Files",
  fileCount: (n: number) => `${n} ${n === 1 ? "file" : "files"}`,
  show: "Show",
  all: "All",
  sections: {
    image: { title: "Pictures", filter: "Pictures", empty: "No pictures yet." },
    pdf: { title: "PDFs", filter: "PDFs", empty: "No PDFs yet." },
    doc: { title: "Word files", filter: "Word", empty: "No word files yet." },
    audio: { title: "Audio", filter: "Audio", empty: "No audio yet." },
    link: { title: "Links", filter: "Links", empty: "No links yet." },
  },
  openFile: (name: string) => `Open ${name}`,
  filesTip:
    "In a lesson, these files sit in the side panel. Click one to show it to both of you (videos play in sync), press play for audio, or drag it onto the stage.",
  youtubeVideo: "YouTube video",
  linkToAdd: "Link to add",
  linkPlaceholder: "Paste a YouTube video or any link",
  addLink: "Add link",
  badLink: "That doesn't look like a web address. Paste a link starting with https://",
  linkNotSaved: "The link could not be saved. Please try again.",
  deleteName: (name: string) => `Delete ${name}`,
  delete: "Delete",
  deleteConfirm: (name: string) => `Delete ${name}?`,
  pause: "Pause",
  listen: "Listen",
  pauseName: (name: string) => `Pause ${name}`,
  listenTo: (name: string) => `Listen to ${name}`,

  // Upload
  uploadFiles: "Upload files",
  dropToUpload: "Drop to upload",
  dropFilesHere: "Drop files here",
  dropHint: "Documents, pictures, audio or video, up to 10 MB each",
  uploading: (name: string) => `Uploading ${name}…`,
  // Also used by lib/files/uploadResource.ts (the room's file panel can pass them too).
  upload: {
    oldWord: (name: string) => `${name} is an old Word file. In Word, save it as .docx (or PDF), then upload that.`,
    presentation: (name: string) =>
      `${name} is a presentation. Save it as a PDF first (PowerPoint: File → Export → PDF; Keynote: File → Export To → PDF; Google Slides: File → Download → PDF), then upload the PDF: each slide becomes a page you can show and write on together.`,
    wrongType: (name: string) => `${name}: this kind of file can't be uploaded.`,
    tooBig: (name: string) => `${name} is bigger than 10 MB.`,
    tooLargeForUpload: (name: string) => `${name} is too big to upload (the storage takes up to 50 MB per file for now).`,
    noRoom: (name: string, mb: number) => `${name} doesn't fit: your files can take up ${mb} MB. Delete some first.`,
    notAccepted: (name: string) => `${name}: this kind of file isn't accepted yet.`,
    failed: (name: string) => `${name} could not be uploaded. Please try again.`,
  },

  // Storage
  storage: "Storage",
  storageUsed: (used: number, total: number) => `${used} MB of ${total} MB`,
  storageUsedLabel: (used: number, total: number) => `${used} of ${total} MB used`,
  storageHint: "Classrooms and Library together. Up to 10 MB per file in a Classroom, no per-file limit in the Library.",
};
