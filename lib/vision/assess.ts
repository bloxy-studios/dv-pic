import type { CheckResult } from "@/lib/rules/types";
import { sources } from "@/lib/rules/sources";

export type NormalizedBox = { x: number; y: number; width: number; height: number };

export type DetectedFace = {
  box: NormalizedBox;
  score: number;
  landmarks?: { x: number; y: number }[];
  blinkLeft?: number | null;
  blinkRight?: number | null;
  smile?: number | null;
};

const photoUrl = sources.photoRequirements.url;

export function assessFaces(faces: DetectedFace[] | null): CheckResult[] {
  if (faces === null) {
    return [
      {
        id: "face-detection",
        label: "Face detection",
        state: "unable_to_verify",
        sourceUrl: photoUrl,
        detail:
          "Face detection did not run or is not available in this browser. Use the composition guide and the checklist. This is not a pass.",
      },
    ];
  }
  if (faces.length === 0) {
    return [
      {
        id: "face-count",
        label: "Face",
        state: "needs_attention",
        sourceUrl: photoUrl,
        detail:
          "No face was detected. The photo may be too small, too dark, or may not show a face. Detection can also miss a real face. Review the photo yourself.",
      },
    ];
  }
  if (faces.length > 1) {
    return [
      {
        id: "face-count",
        label: "Face",
        state: "needs_attention",
        sourceUrl: photoUrl,
        detail: `${faces.length} faces were detected. A DV photo should show one person. Cropping cannot remove another person if they remain in the frame.`,
      },
    ];
  }

  const face = faces[0];
  const results: CheckResult[] = [
    {
      id: "face-count",
      label: "Face",
      state: "pass",
      sourceUrl: photoUrl,
      detail: "One face was detected. This does not confirm identity or that the pose meets the official rules.",
    },
  ];

  const centerX = face.box.x + face.box.width / 2;
  const centerY = face.box.y + face.box.height / 2;
  const centered = Math.abs(centerX - 0.5) < 0.12 && Math.abs(centerY - 0.48) < 0.14;
  results.push({
    id: "centering",
    label: "Position",
    state: centered ? "pass" : "needs_attention",
    sourceUrl: photoUrl,
    detail: centered
      ? "The detected face is near the center. Confirm the full head, including the top of the head and the chin, is inside the frame."
      : "Possible issue: the face is not near the center. Move the crop before downloading.",
  });

  const nearEdge =
    face.box.x < 0.04 ||
    face.box.y < 0.03 ||
    face.box.x + face.box.width > 0.96 ||
    face.box.y + face.box.height > 0.97;
  results.push({
    id: "edges",
    label: "Edges",
    state: nearEdge ? "needs_attention" : "pass",
    sourceUrl: photoUrl,
    detail: nearEdge
      ? "Possible issue: the face is very close to an edge and the head may be cropped. Leave margin around the hair and chin."
      : "The detected face is not touching the edge. The top of the head can still be cut off if hair extends outside the face box.",
  });

  const span = foreheadToChin(face);
  if (span === null) {
    results.push({
      id: "head-size",
      label: "Head size",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail:
        "The official head-size range is 50% to 69% of the image height, from the chin to the top of the head. Landmarks for that measurement were not available. Use the on-screen guide and check it yourself.",
    });
  } else if (span > 0.69) {
    results.push({
      id: "head-size",
      label: "Head size",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail: `The forehead-to-chin estimate is about ${Math.round(span * 100)}% of the image height. The official measurement includes the top of the head, so the head is likely too large. Zoom out. Do not resize the head by stretching.`,
    });
  } else if (span < 0.4) {
    results.push({
      id: "head-size",
      label: "Head size",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail: `The forehead-to-chin estimate is about ${Math.round(span * 100)}% of the image height. Even with hair above the forehead, the head may be smaller than 50% of the frame. Move closer or zoom in without stretching.`,
    });
  } else {
    results.push({
      id: "head-size",
      label: "Head size",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: `Forehead-to-chin is about ${Math.round(span * 100)}% of the height. That is not the official crown-to-chin measurement, so DV Ready will not mark head size as passed. Compare the guides with the top of the head and the chin.`,
    });
  }

  const tilt = eyeTilt(face);
  if (tilt === null) {
    results.push({
      id: "pose",
      label: "Pose",
      state: "unable_to_verify",
      detail: "Head tilt and whether the face is turned could not be estimated.",
    });
  } else if (Math.abs(tilt) > 12) {
    results.push({
      id: "pose",
      label: "Pose",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail: `Possible issue: the eyes look tilted by about ${Math.abs(Math.round(tilt))} degrees. Face the camera with your head level. Rotating the file cannot fix a turned face.`,
    });
  } else {
    results.push({
      id: "pose",
      label: "Pose",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail:
        "The eye line is not strongly tilted. DV Ready still cannot confirm a full-face view or that both eyes are open from tilt alone.",
    });
  }

  if (face.blinkLeft == null || face.blinkRight == null) {
    results.push({
      id: "eyes",
      label: "Eyes",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: "Open eyes could not be checked by the face model. Look at the photo and confirm both eyes are open.",
    });
  } else if (face.blinkLeft > 0.55 || face.blinkRight > 0.55) {
    results.push({
      id: "eyes",
      label: "Eyes",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail:
        "Possible issue: the face model’s blink score is high for one or both eyes. If an eye is closed, take another photo. Do not edit the eyes.",
    });
  } else {
    results.push({
      id: "eyes",
      label: "Eyes",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail:
        "The blink score is not high. That is not proof both eyes are open. Confirm them yourself. Model scores are not shown as an acceptance percentage.",
    });
  }

  if (face.smile == null) {
    results.push({
      id: "expression",
      label: "Expression",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: "Expression could not be estimated. The official guidance asks for a neutral expression.",
    });
  } else if (face.smile > 0.55) {
    results.push({
      id: "expression",
      label: "Expression",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail:
        "Possible issue: the face model’s smile score is high. A neutral expression is required. Take another photo rather than editing the mouth.",
    });
  } else {
    results.push({
      id: "expression",
      label: "Expression",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: "No strong smile score was returned. Confirm the expression is neutral. This is not a pass.",
    });
  }

  results.push({
    id: "manual-appearance",
    label: "Glasses, coverings, and edits",
    state: "unable_to_verify",
    sourceUrl: photoUrl,
    detail:
      "Eyeglasses, headphones, hair covering the face, religious or medical exceptions, and digital alteration are not decided by this tool. A religious head covering worn daily is not automatically a problem. Read the official photo page and the checklist.",
  });

  return results;
}

export function assessBackground(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  face: NormalizedBox | null,
): CheckResult {
  if (width < 8 || height < 8) {
    return {
      id: "background",
      label: "Background",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: "The image is too small to sample a background.",
    };
  }
  const samples: number[][] = [];
  const points = [
    [0.08, 0.08],
    [0.92, 0.08],
    [0.08, 0.92],
    [0.92, 0.92],
    [0.5, 0.06],
  ];
  for (const [nx, ny] of points) {
    const x = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))));
    const y = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))));
    if (face && inside(nx, ny, expand(face, 0.08))) continue;
    const offset = (y * width + x) * 4;
    samples.push([rgba[offset] ?? 0, rgba[offset + 1] ?? 0, rgba[offset + 2] ?? 0]);
  }
  if (samples.length < 3) {
    return {
      id: "background",
      label: "Background",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail: "Not enough background area was clear of the face to sample. Look for a plain white or off-white background yourself.",
    };
  }
  const mean = samples.reduce((sum, sample) => sum + (sample[0] + sample[1] + sample[2]) / 3, 0) / samples.length;
  let variance = 0;
  for (const sample of samples) {
    const luma = (sample[0] + sample[1] + sample[2]) / 3;
    variance += (luma - mean) ** 2;
  }
  variance /= samples.length;
  if (variance > 400 || mean < 170) {
    return {
      id: "background",
      label: "Background",
      state: "needs_attention",
      sourceUrl: photoUrl,
      detail:
        "The sampled corners are uneven or not light. A plain white or off-white background is required. Cropping will not replace the background. If the scene is distracting, take a new photo.",
    };
  }
  if (variance > 120) {
    return {
      id: "background",
      label: "Background",
      state: "unable_to_verify",
      sourceUrl: photoUrl,
      detail:
        "The background samples are fairly light but not uniform. Shadows, gradients, or objects may still be present. This is not a pass just because the average is light.",
    };
  }
  return {
    id: "background",
    label: "Background",
    state: "unable_to_verify",
    sourceUrl: photoUrl,
    detail:
      "Corner samples look light and fairly even. That is not proof of a plain white or off-white background. Confirm there are no shadows, objects, or patterns.",
  };
}

export function assessSharpness(rgba: Uint8ClampedArray, width: number, height: number): CheckResult {
  if (width < 32 || height < 32) {
    return {
      id: "sharpness",
      label: "Sharpness",
      state: "needs_attention",
      detail: "The image is very small. Enlarging it will not restore detail. Use a higher-resolution original.",
    };
  }
  const stepX = Math.max(1, Math.floor(width / 80));
  const stepY = Math.max(1, Math.floor(height / 80));
  let energy = 0;
  let count = 0;
  const lumaAt = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    return (
      0.2126 * (rgba[offset] ?? 0) +
      0.7152 * (rgba[offset + 1] ?? 0) +
      0.0722 * (rgba[offset + 2] ?? 0)
    );
  };
  for (let y = stepY; y < height - stepY; y += stepY) {
    for (let x = stepX; x < width - stepX; x += stepX) {
      const center = lumaAt(x, y);
      const lap = lumaAt(x - stepX, y) + lumaAt(x + stepX, y) + lumaAt(x, y - stepY) + lumaAt(x, y + stepY) - 4 * center;
      energy += lap * lap;
      count += 1;
    }
  }
  const score = energy / Math.max(1, count);
  if (score < 15) {
    return {
      id: "sharpness",
      label: "Sharpness",
      state: "needs_attention",
      detail:
        "The image looks unusually soft. Blur detection is not perfect. If the face is out of focus, take another photo. Do not add sharpening that invents detail.",
    };
  }
  return {
    id: "sharpness",
    label: "Sharpness",
    state: "unable_to_verify",
    detail: "No strong blur signal was measured. Focus still needs a human look, especially around the eyes.",
  };
}

function foreheadToChin(face: DetectedFace): number | null {
  const landmarks = face.landmarks;
  if (!landmarks || landmarks.length < 153) return null;
  const forehead = landmarks[10];
  const chin = landmarks[152];
  if (!forehead || !chin) return null;
  return Math.abs(chin.y - forehead.y);
}

function eyeTilt(face: DetectedFace): number | null {
  const landmarks = face.landmarks;
  if (!landmarks || landmarks.length < 264) return null;
  const left = landmarks[33];
  const right = landmarks[263];
  if (!left || !right) return null;
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
}

function expand(box: NormalizedBox, amount: number): NormalizedBox {
  return {
    x: box.x - amount,
    y: box.y - amount,
    width: box.width + amount * 2,
    height: box.height + amount * 2,
  };
}

function inside(x: number, y: number, box: NormalizedBox): boolean {
  return x >= box.x && y >= box.y && x <= box.x + box.width && y <= box.y + box.height;
}
