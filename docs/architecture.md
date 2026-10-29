# Image processing

Photographs are decoded, cropped, and encoded in the browser. The original `Uint8Array` is kept for the tab session and is not written back. SHA-256 is calculated locally.

Export draws a 600×600 canvas, optionally applies a capped global lighting adjustment, then binary-searches JPEG quality from 0.50 to 0.95. EXIF is inserted after encoding, and the byte length is measured on that final file. GPS is omitted unless the user opts in. Capture dates are copied, never replaced with today’s date.

An already compliant 600×600 JPEG with normal orientation can be downloaded as the original bytes.

RAW and TIFF files are refused with instructions to export a JPEG locally. They are not uploaded.

Face landmarks use MediaPipe from `/mediapipe` and `/models/face_landmarker.task` on this origin. `scripts/copy-vision.ts` copies the WASM out of `node_modules` and downloads the model if it is missing. If that model is absent, the visual check returns “unable to verify.”

# Privacy

There is no account, database, or image API. Checklist progress is stored in `localStorage` only after the user asks. Photos are not put in that store. The privacy page in the app matches this behavior.

# Updating rules

Edit `lib/rules/dv-2027.ts` and `lib/rules/registration.ts`. Set `active: false` on anything that is only an older year’s instruction. Change `verifiedOn` when you re-read the official page. Do not turn an unverified rule on.

# Deploy check

1. `bun test`
2. `bun run build`
3. Open `/`, `/photo-checker`, and `/photo-cropper`.
4. Upload a JPEG, export, and confirm the downloaded file is 600×600 and at most 240,000 bytes.
5. In the browser network panel, confirm the image itself is not posted to another host. The face model, if requested, loads from this site.
