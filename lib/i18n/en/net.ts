// Asia: chat-app browsers, the connection test, weak connections in a lesson.
export const net = {
  inAppTitle: (app: string) => `You opened this link inside ${app}. Camera and microphone often don't work here.`,
  inAppHowIos: (app: string) => `In ${app}, tap ··· (top right), then “Open in Safari”. Or copy the link and paste it into Safari.`,
  inAppHowAndroid: (app: string) => `In ${app}, tap ⋮ or ··· (top right), then “Open in browser”. Or copy the link and paste it into Chrome.`,
  inAppHowOther: "Open this link in your normal browser (Chrome, Safari, Edge) for the camera to work.",
  inAppOpen: "Open in my browser",
  copyLink: "Copy the link",
  copied: "Link copied",
  testConnection: "Test my connection",
  testing: "Testing your connection… (about 20 seconds)",
  detail: (rtt: number, loss: number, up: number) => `Delay ${rtt} ms · lost ${loss} % · upload ${up} Mbit/s`,
  result: {
    good: "Your connection is good for video lessons.",
    ok: "Your connection is OK. Video may sometimes be less sharp.",
    weak: "Your connection is weak: video may stutter, sound should work.",
    blocked: "We couldn't reach the video servers from this network.",
  },
  advice: {
    good: "",
    ok: "Close other apps or downloads during the lesson for the best picture.",
    weak: "Use Wi-Fi instead of mobile data, or turn your camera off in the lesson: sound needs much less.",
    blocked: "Try another network (Wi-Fi or mobile data), or turn off a VPN if you use one.",
  },
  weakMine: "Your connection is weak. We lowered your video so the sound stays clear.",
  cameraOff: "Turn off my camera",
  weakOther: (name: string) => `${name}'s connection is weak. Their video may freeze; the sound comes first.`,
  theOther: "The other person",
};
