/** Shrinks an uploaded photo so it fits comfortably in local storage. Returns a JPEG data URL. */
export async function downscaleImage(file: File, max = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reads a small file (e.g. a PDF label) as a data URL. Rejects anything over `limitKb`. */
export function readSmallFile(file: File, limitKb = 900): Promise<string> {
  if (file.size > limitKb * 1024) return Promise.reject(new Error(`File is over ${limitKb} KB`));
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
