import { fitWithin } from "@/domain/condition-report";

const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.8;

// Réduit la photo sur le téléphone avant tout envoi : 1280 px au plus, JPEG.
export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_SIDE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas indisponible");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encodage impossible"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}
