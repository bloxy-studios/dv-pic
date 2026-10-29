export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function searchJpegQuality(options: {
  encode: (quality: number) => Promise<Uint8Array>;
  maxBytes: number;
  minQuality?: number;
  maxQuality?: number;
}): Promise<{ bytes: Uint8Array; quality: number } | null> {
  const min = options.minQuality ?? 0.5;
  const max = options.maxQuality ?? 0.95;
  let best: { bytes: Uint8Array; quality: number } | null = null;
  let low = Math.round(min * 100);
  let high = Math.round(max * 100);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const quality = mid / 100;
    const bytes = await options.encode(quality);
    if (bytes.byteLength <= options.maxBytes) {
      best = { bytes, quality };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}
