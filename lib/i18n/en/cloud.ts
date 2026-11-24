// C1: connected clouds (Settings), picking files from them, saving recordings there.
export const cloud = {
  settings: "Settings",
  settingsTitle: "Settings",
  clouds: "Connected clouds",
  cloudsIntro:
    "Save recordings to your cloud and add files from it to a Classroom. TeachingTime only sees the files you pick or save here, never your whole cloud.",
  thisDevice: "These settings are kept in this browser. On another computer, connect again.",
  google: "Google Drive",
  dropbox: "Dropbox",
  connected: "Connected",
  connectedAs: (email: string) => `Connected as ${email}`,
  notConnected: "Not connected",
  connect: "Connect",
  connecting: "Connecting…",
  disconnect: "Disconnect",
  connectFailed: "That didn't work. Allow pop-ups for TeachingTime and try again.",
  googleSaves: "Recordings go into the folder “TeachingTime recordings”.",
  dropboxSaves: "Recordings go into Apps › TeachingTime › Recordings.",
  afterRecording: "After a recording",
  saveDownload: "Download to this computer",
  saveGoogle: "Save to Google Drive",
  saveDropbox: "Save to Dropbox",
  connectFirst: "Connect it first.",
  // Classroom files
  fromGoogle: "From Google Drive",
  fromDropbox: "From Dropbox",
  fetching: "Getting the files…",
  fetchFailed: (where: string) => `The files couldn't be fetched from ${where}. Please try again.`,
  // After a recording
  savingTo: (where: string, percent: number) => `Saving to ${where}… ${percent} %`,
  savedTo: (where: string, path: string) => `Saved to ${where}: ${path}`,
  saveFailed: (where: string) => `Saving to ${where} didn't work, so it was downloaded instead.`,
  // /cloud/dropbox
  finishing: "Connecting Dropbox…",
  dropboxFailed: "Dropbox couldn't be connected. Please try again from Settings.",
  backToSettings: "Back to Settings",
};
