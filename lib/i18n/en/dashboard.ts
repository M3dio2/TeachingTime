// The dashboard (your classrooms) and a student's classroom page with its files.
export const dashboard = {
  // Header
  logOut: "Log out",
  loggingOut: "Logging out…",
  loadingClassrooms: "Loading your classrooms",
  leavingLesson: "Leaving the lesson",

  // Name chip
  changeNameTitle: "Change the name students see in lessons",
  nameChipLabel: (name: string) => `Your name in lessons: ${name}. Change it`,
  addYourName: "Add your name",
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
  yourClassrooms: "Your classrooms",
  classroomsIntro: "One classroom per student: their files, and a link that stays the same every week.",
  classroomLimit: (max: number) => `${max} classrooms is the most for now. Remove one to add another.`,
  firstStudentTitle: "Start with your first student",
  firstStudentText: "Type their name and press Add. You get a classroom for their files and a link to send them.",
  addClassroom: "Add a classroom",
  forNewStudent: "For a new student",
  studentName: "Student's name",
  studentNamePlaceholder: "Student's name, e.g. Anna",
  add: "Add",
  adding: "Adding…",

  // Classroom card
  openClassroom: (name: string) => `Open ${name}'s classroom`,
  lastLesson: "Last lesson:",
  noLessonsYet: "No lessons yet",
  waiting: "Waiting",
  noFilesYet: "No files yet",
  startLesson: "Start lesson",
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

  // Copy link button
  copyStudentLink: "Copy student link",
  copyNamesLink: (name: string) => `Copy ${name}'s student link`,
  copied: "Copied!",
  copy: "Copy",

  // Classroom page
  removeClassroom: "Remove this classroom",
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
    "In a lesson, these files sit in the side panel. Click a PDF, Word file, picture or link to show it (YouTube videos play for both of you), press play for audio, or drag any file onto the stage.",
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
  dropHint: "Pictures, PDFs, Word files or audio, up to 10 MB each",
  uploading: (name: string) => `Uploading ${name}…`,
  // Also used by lib/files/uploadResource.ts (the room's file panel can pass them too).
  upload: {
    oldWord: (name: string) => `${name} is an old Word file. In Word, save it as .docx (or PDF), then upload that.`,
    wrongType: (name: string) => `${name} is not a picture, PDF, Word or audio file.`,
    tooBig: (name: string) => `${name} is bigger than 10 MB.`,
    noRoom: (name: string, mb: number) => `${name} doesn't fit: your files can take up ${mb} MB. Delete some first.`,
    notAccepted: (name: string) => `${name}: this kind of file isn't accepted yet.`,
    failed: (name: string) => `${name} could not be uploaded. Please try again.`,
  },

  // Storage
  storage: "Storage",
  storageUsed: (used: number, total: number) => `${used} MB of ${total} MB`,
  storageUsedLabel: (used: number, total: number) => `${used} of ${total} MB used`,
  storageHint: "All your classrooms together. Up to 10 MB per file.",
};
