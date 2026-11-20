"use client";

/** Resize to ≤ maxW and re-encode as WebP in the browser: small, sharp, never touches our server. */
export async function toWebp(file: File, maxW = 1600): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bmp.width);
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process that image"))), "image/webp", 0.86));
  return { blob, width, height };
}

/** PUT a file to a one-time signed storage URL. */
export async function putSigned(url: string, body: Blob, type: string) {
  const r = await fetch(url, { method: "PUT", body, headers: { "content-type": type, "x-upsert": "true", "cache-control": "max-age=31536000" } });
  if (!r.ok) throw new Error(`Upload failed (${r.status})`);
}
