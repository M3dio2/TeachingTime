import type { net as en } from "../en/net";

export const net: typeof en = {
  inAppTitle: (app) => `Abriste este enlace dentro de ${app}. La cámara y el micrófono a menudo no funcionan aquí.`,
  inAppHowIos: (app) => `En ${app}, toca ··· (arriba a la derecha) y luego “Abrir en Safari”. O copia el enlace y pégalo en Safari.`,
  inAppHowAndroid: (app) => `En ${app}, toca ⋮ o ··· (arriba a la derecha) y luego “Abrir en el navegador”. O copia el enlace y pégalo en Chrome.`,
  inAppHowOther: "Abre este enlace en tu navegador normal (Chrome, Safari, Edge) para que funcione la cámara.",
  inAppOpen: "Abrir en mi navegador",
  copyLink: "Copiar el enlace",
  copied: "Enlace copiado",
  testConnection: "Probar mi conexión",
  testing: "Probando tu conexión… (unos 20 segundos)",
  detail: (rtt, loss, up) => `Retraso ${rtt} ms · perdido ${loss} % · subida ${up} Mbit/s`,
  result: {
    good: "Tu conexión es buena para clases con vídeo.",
    ok: "Tu conexión está bien. A veces el vídeo será menos nítido.",
    weak: "Tu conexión es débil: el vídeo puede cortarse, el sonido debería funcionar.",
    blocked: "No pudimos llegar a los servidores de vídeo desde esta red.",
  },
  advice: {
    good: "",
    ok: "Cierra otras apps o descargas durante la clase para tener la mejor imagen.",
    weak: "Usa wifi en vez de datos móviles, o apaga la cámara en la clase: el sonido necesita mucho menos.",
    blocked: "Prueba otra red (wifi o datos móviles), o desactiva la VPN si usas una.",
  },
  weakMine: "Tu conexión es débil. Bajamos tu vídeo para que el sonido se oiga bien.",
  cameraOff: "Apagar mi cámara",
  weakOther: (name) => `La conexión de ${name} es débil. Su vídeo puede congelarse; el sonido va primero.`,
  theOther: "La otra persona",
};
