import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const target = resolve(root, "public/mediapipe");
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

const model = resolve(root, "public/models/face_landmarker.task");
if (!existsSync(model)) {
  mkdirSync(dirname(model), { recursive: true });
  const response = await fetch(
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  );
  if (!response.ok) {
    console.warn("Face model was not downloaded. Visual checks will stay unverified until it is present.");
  } else {
    const bytes = new Uint8Array(await response.arrayBuffer());
    writeFileSync(model, bytes);
  }
}
