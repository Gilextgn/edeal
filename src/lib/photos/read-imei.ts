import { fitWithin } from "@/domain/condition-report";
import { extractImeis } from "@/domain/imei";

// Lecture de l'IMEI sur une photo : d'abord les codes-barres (boîte, écran
// *#06#), rapides et fiables ; sinon le texte (écran « À propos »).
// Les bibliothèques ne sont chargées qu'au moment de la lecture.

const MAX_SIDE = 2000;

// Réduit les très grandes photos : plus rapide à analyser, sans perdre les chiffres.
async function toCanvas(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas;
}

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

async function readBarcodes(canvas: HTMLCanvasElement): Promise<string[]> {
  // Lecteur intégré au navigateur quand il existe (Chrome sur Android).
  const Native = (globalThis as { BarcodeDetector?: new () => Detector }).BarcodeDetector;
  if (Native) {
    try {
      const codes = await new Native().detect(canvas);
      if (codes.length > 0) return codes.map((code) => code.rawValue);
    } catch {
      // Lecteur indisponible sur cet appareil : on passe à la bibliothèque.
    }
  }

  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  try {
    return [new BrowserMultiFormatReader().decodeFromCanvas(canvas).getText()];
  } catch {
    return [];
  }
}

async function readText(canvas: HTMLCanvasElement): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/** IMEI valides trouvés sur la photo (aucun, un, ou deux pour un double SIM). */
export async function readImeiFromPhoto(file: Blob): Promise<string[]> {
  const canvas = await toCanvas(file);

  const fromBarcodes = (await readBarcodes(canvas)).flatMap(extractImeis);
  if (fromBarcodes.length > 0) return [...new Set(fromBarcodes)];

  return extractImeis(await readText(canvas));
}
