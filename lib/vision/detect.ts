import type { DetectedFace } from "./assess";

type Landmarker = {
  detect: (image: CanvasImageSource) => {
    faceLandmarks: { x: number; y: number }[][];
    faceBlendshapes?: { categories?: { categoryName?: string; score?: number }[] }[];
  };
};

let loading: Promise<Landmarker | null> | null = null;

export function loadFaceLandmarker(): Promise<Landmarker | null> {
  if (!loading) {
    loading = import("@mediapipe/tasks-vision")
      .then(async (vision) => {
        const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe");
        const created = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "IMAGE",
          numFaces: 3,
          outputFaceBlendshapes: true,
        });
        return created as unknown as Landmarker;
      })
      .catch(() => null);
  }
  return loading;
}

export async function detectFaces(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<DetectedFace[] | null> {
  const landmarker = await loadFaceLandmarker();
  if (!landmarker) return null;
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1024 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const result = landmarker.detect(canvas);
    return result.faceLandmarks.map((landmarks, index) => {
      let minX = 1;
      let minY = 1;
      let maxX = 0;
      let maxY = 0;
      for (const point of landmarks) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      const categories = result.faceBlendshapes?.[index]?.categories ?? [];
      const scoreOf = (name: string) => categories.find((item) => item.categoryName === name)?.score ?? null;
      const smileLeft = scoreOf("mouthSmileLeft");
      const smileRight = scoreOf("mouthSmileRight");
      return {
        box: { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) },
        score: 1,
        landmarks,
        blinkLeft: scoreOf("eyeBlinkLeft"),
        blinkRight: scoreOf("eyeBlinkRight"),
        smile: smileLeft == null && smileRight == null ? null : Math.max(smileLeft ?? 0, smileRight ?? 0),
      };
    });
  } catch {
    return null;
  }
}
