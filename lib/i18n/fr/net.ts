import type { net as en } from "../en/net";

export const net: typeof en = {
  inAppTitle: (app) => `Tu as ouvert ce lien dans ${app}. La caméra et le micro ne marchent souvent pas ici.`,
  inAppHowIos: (app) => `Dans ${app}, touche ··· (en haut à droite), puis « Ouvrir dans Safari ». Ou copie le lien et colle-le dans Safari.`,
  inAppHowAndroid: (app) => `Dans ${app}, touche ⋮ ou ··· (en haut à droite), puis « Ouvrir dans le navigateur ». Ou copie le lien et colle-le dans Chrome.`,
  inAppHowOther: "Ouvre ce lien dans ton navigateur habituel (Chrome, Safari, Edge) pour que la caméra marche.",
  inAppOpen: "Ouvrir dans mon navigateur",
  copyLink: "Copier le lien",
  copied: "Lien copié",
  testConnection: "Tester ma connexion",
  testing: "Test de ta connexion… (environ 20 secondes)",
  detail: (rtt, loss, up) => `Délai ${rtt} ms · perdu ${loss} % · envoi ${up} Mbit/s`,
  result: {
    good: "Ta connexion est bonne pour les cours en vidéo.",
    ok: "Ta connexion est correcte. La vidéo sera parfois moins nette.",
    weak: "Ta connexion est faible : la vidéo peut saccader, le son devrait marcher.",
    blocked: "Impossible de joindre les serveurs vidéo depuis ce réseau.",
  },
  advice: {
    good: "",
    ok: "Ferme les autres applis et téléchargements pendant le cours pour la meilleure image.",
    weak: "Utilise le wifi plutôt que les données mobiles, ou coupe ta caméra pendant le cours : le son demande beaucoup moins.",
    blocked: "Essaie un autre réseau (wifi ou données mobiles), ou coupe ton VPN si tu en utilises un.",
  },
  weakMine: "Ta connexion est faible. On a baissé ta vidéo pour que le son reste clair.",
  cameraOff: "Couper ma caméra",
  weakOther: (name) => `La connexion de ${name} est faible. Sa vidéo peut se figer ; le son passe en premier.`,
  theOther: "L’autre personne",
};
