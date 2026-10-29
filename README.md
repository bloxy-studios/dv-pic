This is a [Next.js](https://nextjs.org) app for preparing a Diversity Visa photograph in the browser.

The product name and disclaimer live in `lib/product.ts`. Official photo rules and their sources live in `lib/rules`.

## Scripts

```bash
bun install
bun run dev
bun test
bun run build
```

`dev` and `build` copy the local face-detection runtime into `public/mediapipe` and download the landmark model if it is not already there. Those files are not committed. Photographs are not uploaded.

## Limits

Automated checks do not mean the U.S. Department of State will accept a photo. DV-2027 registration was not verified as open on October 28, 2026. See `docs/requirements.md`.

DV Ready is not a government site.
