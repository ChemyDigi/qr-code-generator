import type { Options } from "qr-code-styling";
import { sealSeams } from "./seams";
import type { ExportFormat, Fill, QRConfig } from "./types";

export type Rendered = { svg: string; width: number; height: number };

const FONT_STACKS: Record<QRConfig["frame"]["font"], string> = {
  sans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', Menlo, Consolas, 'Courier New', monospace",
};

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * The underlying encoder writes one byte per character, so anything outside
 * ASCII has to be expanded to its UTF-8 bytes first or scanners read garbage.
 */
function toByteString(data: string): string {
  if (/^[\x00-\x7f]*$/.test(data)) return data;
  let out = "";
  for (const byte of new TextEncoder().encode(data)) out += String.fromCharCode(byte);
  return out;
}

function fillOptions(fill: Fill) {
  if (fill.mode === "solid") return { color: fill.color };
  return {
    gradient: {
      type: fill.gradientType,
      rotation: (fill.rotation * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: fill.color },
        { offset: 1, color: fill.color2 },
      ],
    },
  };
}

/** Map our config onto qr-code-styling options for a code `size` pixels wide. */
export function buildOptions(config: QRConfig, data: string, size: number): Options {
  const hasLogo = Boolean(config.logo.src);

  return {
    type: "svg",
    width: size,
    height: size,
    shape: config.shape,
    margin: Math.round((size * config.margin) / 100),
    data: toByteString(data),
    image: config.logo.src ?? undefined,
    qrOptions: { typeNumber: 0, errorCorrectionLevel: config.ec },
    imageOptions: {
      saveAsBlob: true,
      crossOrigin: "anonymous",
      hideBackgroundDots: hasLogo && config.logo.hideDots,
      imageSize: config.logo.size,
      margin: Math.round((size * config.logo.margin) / 1000),
    },
    dotsOptions: { type: config.dots.type, ...fillOptions(config.dots.fill) },
    cornersSquareOptions: {
      type: config.cornerSquare.type,
      ...(config.cornerSquare.inherit ? {} : fillOptions(config.cornerSquare.fill)),
    },
    cornersDotOptions: {
      type: config.cornerDot.type,
      ...(config.cornerDot.inherit ? {} : fillOptions(config.cornerDot.fill)),
    },
    backgroundOptions: config.background.transparent
      ? { color: "transparent", round: 0 }
      : { round: config.background.round, ...fillOptions(config.background.fill) },
  };
}

async function qrSvg(options: Options): Promise<string> {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const qr = new QRCodeStyling(options);
  const blob = await qr.getRawData("svg");
  if (!blob) throw new Error("Nothing to encode.");
  const text = await (blob as Blob).text();
  return sealSeams(text.replace(/^<\?xml[^>]*\?>\s*/, ""));
}

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Where the code and the label band sit in artwork `width` pixels wide. */
function layout(config: QRConfig, width: number) {
  const framed = config.frame.style !== "none";
  const pad = framed ? Math.round(width * 0.05) : 0;
  const size = width - pad * 2;
  const band = framed ? Math.round(width * 0.15) : 0;
  return { framed, pad, size, band, height: framed ? pad + size + band : width };
}

/** Height in pixels of an export that is `width` pixels wide. */
export const artworkHeight = (config: QRConfig, width: number) => layout(config, width).height;

/**
 * Render the finished artwork (code plus optional frame) as one SVG that is
 * exactly `width` pixels wide. Preview, raster exports and the SVG download
 * all come from this string, so what you see is what you get.
 */
export async function renderQr(config: QRConfig, data: string, width: number): Promise<Rendered> {
  const { framed, pad, size, band, height } = layout(config, width);
  const code = await qrSvg(buildOptions(config, data, size));

  if (!framed) return { svg: code, width, height };

  const top = config.frame.style === "top";
  const codeY = top ? band : pad;
  const labelCenter = top ? band / 2 : pad + size + band / 2;

  const root = new DOMParser().parseFromString(code, "image/svg+xml").documentElement;
  root.setAttribute("x", String(pad));
  root.setAttribute("y", String(codeY));
  const inner = new XMLSerializer().serializeToString(root);

  const label = config.frame.text.trim().slice(0, 32);
  const fontSize = Math.min(band * 0.42, size / (Math.max(label.length, 1) * 0.7));
  const radius = Math.round((width * config.frame.radius) / 100);

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="${radius}" fill="${config.frame.color}"/>`,
    inner,
    label
      ? `<text x="${width / 2}" y="${labelCenter + fontSize * 0.35}" text-anchor="middle" font-family="${FONT_STACKS[config.frame.font]}" font-weight="700" font-size="${fontSize.toFixed(1)}" letter-spacing="${(fontSize * 0.04).toFixed(2)}" fill="${config.frame.textColor}">${xmlEscape(label)}</text>`
      : "",
    `</svg>`,
  ].join("");

  return { svg, width, height };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      // Safari can report "loaded" before images nested in the SVG are ready.
      const ready = image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
      ready.then(() => resolve(image));
    };
    image.onerror = () => reject(new Error("Could not render the code."));
    image.src = url;
  });
}

export async function toCanvas(
  rendered: Rendered,
  width = rendered.width,
  backdrop?: string,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round((rendered.height / rendered.width) * width);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available in this browser.");
    if (backdrop) {
      context.fillStyle = backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Produce a file of the finished artwork, `size` pixels wide. */
export async function exportBlob(
  config: QRConfig,
  data: string,
  format: ExportFormat,
  size: number,
): Promise<Blob> {
  const rendered = await renderQr(config, data, size);
  if (format === "svg") {
    return new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${rendered.svg}`], { type: MIME.svg });
  }
  // JPEG has no alpha channel, so give it a white sheet to sit on.
  const canvas = await toCanvas(rendered, rendered.width, format === "jpeg" ? "#ffffff" : undefined);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))),
      MIME[format],
      0.95,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ScanResult = "pass" | "fail";

/** Widths to try, in pixels. Shrinking softens the image much like a camera does. */
const SCAN_WIDTHS = [480, 300, 720, 200];

/**
 * Try to decode the rendered artwork at a few sizes. A pass means a strict
 * decoder could read it; phone cameras are usually more forgiving.
 */
export async function scanCheck(rendered: Rendered, data: string): Promise<ScanResult> {
  const [{ default: jsQR }, source] = await Promise.all([
    import("jsqr"),
    toCanvas(rendered, Math.min(rendered.width, 720), "#ffffff"),
  ]);

  for (const width of SCAN_WIDTHS) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round((source.height / source.width) * width);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return "fail";
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
    if (result && result.data === data) return "pass";
  }
  return "fail";
}

function luminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

const fillColors = (fill: Fill) => (fill.mode === "gradient" ? [fill.color, fill.color2] : [fill.color]);

/** Plain-language warnings about choices that commonly stop codes scanning. */
export function designWarnings(config: QRConfig): string[] {
  const warnings: string[] = [];
  const dark = [
    ...fillColors(config.dots.fill),
    ...(config.cornerSquare.inherit ? [] : fillColors(config.cornerSquare.fill)),
    ...(config.cornerDot.inherit ? [] : fillColors(config.cornerDot.fill)),
  ].map(luminance);
  const light = (config.background.transparent ? ["#ffffff"] : fillColors(config.background.fill)).map(luminance);

  const lightestDot = Math.max(...dark);
  const darkestDot = Math.min(...dark);
  const darkestBackground = Math.min(...light);
  const lightestBackground = Math.max(...light);
  const inverted = darkestDot > lightestBackground;

  const ratio = inverted
    ? (darkestDot + 0.05) / (lightestBackground + 0.05)
    : (darkestBackground + 0.05) / (lightestDot + 0.05);

  if (ratio < 3) {
    warnings.push("Low contrast between the pattern and the background. Darken one or lighten the other.");
  } else if (inverted) {
    warnings.push("Light pattern on a dark background: most phones cope, but some older scanners will not.");
  }
  if (config.background.transparent) {
    warnings.push(
      config.frame.style === "none"
        ? "Transparent background: place the code on a plain, light surface."
        : "Transparent background: the frame colour shows behind the code, so keep the frame light.",
    );
  }
  if (config.margin < 2) {
    warnings.push("Very small quiet zone. Leave clear space around the code wherever you place it.");
  }
  if (config.logo.src && config.ec !== "H" && config.ec !== "Q") {
    warnings.push("With a logo, use error correction Q or H so the hidden modules can be recovered.");
  }
  return warnings;
}

export type ThumbKind = "dots" | "cornerSquare" | "cornerDot";

/**
 * A small crop of a real code drawn with one style option, used as the
 * picture on the style picker tiles.
 */
export async function renderThumb(kind: ThumbKind, type: string): Promise<string> {
  const ink = "#16150f";
  const faint = "#cfcbc0";
  const options: Options = {
    type: "svg",
    width: 210,
    height: 210,
    margin: 0,
    data: "QR",
    qrOptions: { typeNumber: 1, mode: "Byte", errorCorrectionLevel: "L" },
    backgroundOptions: { color: "transparent" },
    dotsOptions: { type: "square", color: ink },
  };
  if (kind === "dots") {
    options.dotsOptions = { type: type as never, color: ink };
  } else if (kind === "cornerSquare") {
    options.cornersSquareOptions = { type: type as never, color: ink };
    options.cornersDotOptions = { type: "dot", color: faint };
  } else {
    options.cornersSquareOptions = { type: "extra-rounded", color: faint };
    options.cornersDotOptions = { type: type as never, color: ink };
  }

  const root = new DOMParser().parseFromString(await qrSvg(options), "image/svg+xml").documentElement;
  root.setAttribute("viewBox", kind === "dots" ? "80 80 60 60" : "0 0 70 70");
  root.setAttribute("width", "64");
  root.setAttribute("height", "64");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(root))}`;
}
