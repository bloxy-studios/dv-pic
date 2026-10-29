export type CropTransform = {
  rotation: 0 | 90 | 180 | 270;
  /** 1 fits the whole image inside the square. Larger values zoom in. */
  zoom: number;
  /** Pan in fractions of the crop square, after rotation. */
  panX: number;
  panY: number;
};

export const defaultCrop: CropTransform = {
  rotation: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export function rotatedSize(width: number, height: number, rotation: CropTransform["rotation"]) {
  if (rotation === 90 || rotation === 270) return { width: height, height: width };
  return { width, height };
}

export function fitZoom(width: number, height: number, rotation: CropTransform["rotation"]): number {
  const size = rotatedSize(width, height, rotation);
  return Math.min(size.width, size.height) / Math.max(size.width, size.height);
}

/** Source-pixel scale from crop-square units at zoom 1 (contain). */
export function containScale(width: number, height: number, rotation: CropTransform["rotation"]): number {
  const size = rotatedSize(width, height, rotation);
  return Math.max(size.width, size.height);
}

export function cropCoversSource(
  width: number,
  height: number,
  crop: CropTransform,
): { inside: boolean } {
  const scale = containScale(width, height, crop.rotation) / crop.zoom;
  const corners = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ];
  const radians = (-crop.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  for (const [cx, cy] of corners) {
    const x = (cx - crop.panX) * scale;
    const y = (cy - crop.panY) * scale;
    const sx = x * cos - y * sin;
    const sy = x * sin + y * cos;
    if (Math.abs(sx) > width / 2 + 0.01 || Math.abs(sy) > height / 2 + 0.01) {
      return { inside: false };
    }
  }
  return { inside: true };
}

export function clampCrop(width: number, height: number, crop: CropTransform): CropTransform {
  const zoom = Math.min(8, Math.max(fitZoom(width, height, crop.rotation), crop.zoom));
  return { ...crop, zoom, panX: clamp(crop.panX, -1.5, 1.5), panY: clamp(crop.panY, -1.5, 1.5) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
