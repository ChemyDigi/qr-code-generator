# QR Studio

A QR code generator with full visual customisation, built with Next.js (App Router), TypeScript and Tailwind CSS. Everything runs in the browser: nothing you type or upload is sent to a server.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

For a production build: `npm run build` followed by `npm start`.

## What it does

- **Content**: link, plain text, email, phone, SMS, WhatsApp, Wi-Fi, contact card (vCard), location and calendar event.
- **Style**: eight presets, a "Surprise me" randomiser, six pattern shapes, solid or gradient colours (linear or radial, any angle), solid, gradient or transparent background with rounded corners.
- **Corners**: seven corner-frame shapes and seven corner-centre shapes, each with its own colour or gradient.
- **Logo**: drop in an image, set its size and padding, and choose whether the pattern is cleared behind it.
- **Frame**: optional frame with a label above or below the code, three typefaces, custom colours and corner radius.
- **Advanced**: square or circle shape, quiet-zone margin and error correction level.
- **Export**: PNG, SVG, JPEG or WebP from 256 to 4096 px, custom file name, copy to clipboard.
- **Scan test**: every design is decoded in the browser after each change, with plain-language warnings for low contrast, tiny margins and similar problems.
- Light and dark themes. Your design is remembered in the browser between visits.

## Project layout

```
src/app/                  layout, page, global styles, icon
src/components/
  QRGenerator.tsx         page shell, preview and export panel
  ContentForm.tsx         content type picker and forms
  panels.tsx              Style, Corners, Logo, Frame and Advanced tabs
  controls.tsx            small reusable inputs (sliders, colour pickers, tiles)
src/lib/qr/
  types.ts                design config, defaults and presets
  content.ts              turns form fields into the encoded string
  render.ts               builds the SVG artwork, exports files, runs the scan test
  seams.ts                merges module shapes so scaled codes have no hairline gaps
  hooks.ts                live preview, scan test and thumbnail hooks
  storage.ts              saves and restores the design in localStorage
```

QR drawing uses [qr-code-styling](https://github.com/kozakdenys/qr-code-styling); the scan test uses [jsQR](https://github.com/cozmo/jsQR).
