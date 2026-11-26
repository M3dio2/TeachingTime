import type { net as en } from "../en/net";

export const net: typeof en = {
  inAppTitle: (app) => `Du hast diesen Link in ${app} geöffnet. Kamera und Mikrofon funktionieren dort oft nicht.`,
  inAppHowIos: (app) => `Tippe in ${app} oben rechts auf ··· und dann auf „In Safari öffnen“. Oder kopiere den Link und füge ihn in Safari ein.`,
  inAppHowAndroid: (app) => `Tippe in ${app} oben rechts auf ⋮ oder ··· und dann auf „Im Browser öffnen“. Oder kopiere den Link und füge ihn in Chrome ein.`,
  inAppHowOther: "Öffne diesen Link in deinem normalen Browser (Chrome, Safari, Edge), damit die Kamera funktioniert.",
  inAppOpen: "In meinem Browser öffnen",
  copyLink: "Link kopieren",
  copied: "Link kopiert",
  testConnection: "Meine Verbindung testen",
  testing: "Deine Verbindung wird getestet… (etwa 20 Sekunden)",
  detail: (rtt, loss, up) => `Verzögerung ${rtt} ms · verloren ${loss} % · Upload ${up} Mbit/s`,
  result: {
    good: "Deine Verbindung ist gut für Video-Lektionen.",
    ok: "Deine Verbindung ist in Ordnung. Das Video ist manchmal etwas weniger scharf.",
    weak: "Deine Verbindung ist schwach: Das Video kann ruckeln, der Ton sollte gehen.",
    blocked: "Von diesem Netzwerk aus erreichen wir die Video-Server nicht.",
  },
  advice: {
    good: "",
    ok: "Schliess während der Lektion andere Apps und Downloads für das beste Bild.",
    weak: "Nimm WLAN statt mobiler Daten, oder schalte in der Lektion die Kamera aus: Ton braucht viel weniger.",
    blocked: "Versuch ein anderes Netzwerk (WLAN oder mobile Daten) oder schalte ein VPN aus, falls du eines nutzt.",
  },
  weakMine: "Deine Verbindung ist schwach. Wir haben dein Video reduziert, damit der Ton klar bleibt.",
  cameraOff: "Meine Kamera ausschalten",
  weakOther: (name) => `Die Verbindung von ${name} ist schwach. Das Video kann einfrieren, der Ton hat Vorrang.`,
  theOther: "die andere Person",
};
