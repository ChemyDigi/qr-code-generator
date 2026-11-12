export type DotType =
  | "square"
  | "dots"
  | "rounded"
  | "extra-rounded"
  | "classy"
  | "classy-rounded";

export type CornerSquareType = "square" | "extra-rounded" | "dot" | DotType;
export type CornerDotType = "square" | "dot" | DotType;
export type ErrorCorrection = "L" | "M" | "Q" | "H";
export type ExportFormat = "png" | "svg" | "jpeg" | "webp";

export type Fill = {
  mode: "solid" | "gradient";
  color: string;
  color2: string;
  gradientType: "linear" | "radial";
  /** Degrees, linear gradients only. */
  rotation: number;
};

export type ContentType =
  | "url"
  | "text"
  | "email"
  | "phone"
  | "sms"
  | "whatsapp"
  | "wifi"
  | "vcard"
  | "location"
  | "event";

export type QRConfig = {
  contentType: ContentType;
  fields: Record<ContentType, Record<string, string>>;

  shape: "square" | "circle";
  /** Quiet zone, as a percentage of the code's width. */
  margin: number;
  ec: ErrorCorrection;

  dots: { type: DotType; fill: Fill };
  cornerSquare: { type: CornerSquareType; inherit: boolean; fill: Fill };
  cornerDot: { type: CornerDotType; inherit: boolean; fill: Fill };
  background: { transparent: boolean; fill: Fill; round: number };

  logo: {
    src: string | null;
    /** 0–1, relative to what the error correction level can safely hide. */
    size: number;
    /** Padding around the logo, in thousandths of the code's width. */
    margin: number;
    hideDots: boolean;
  };

  frame: {
    style: "none" | "bottom" | "top";
    text: string;
    color: string;
    textColor: string;
    /** Corner radius as a percentage of the width. */
    radius: number;
    font: "sans" | "serif" | "mono";
  };
};

export type ExportSettings = { format: ExportFormat; size: number; name: string };

export const DEFAULT_EXPORT: ExportSettings = { format: "png", size: 1024, name: "qr-code" };

export const solid = (color: string): Fill => ({
  mode: "solid",
  color,
  color2: color,
  gradientType: "linear",
  rotation: 45,
});

export const gradient = (
  color: string,
  color2: string,
  rotation = 45,
  gradientType: Fill["gradientType"] = "linear",
): Fill => ({ mode: "gradient", color, color2, gradientType, rotation });

export const DEFAULT_FIELDS: QRConfig["fields"] = {
  url: { url: "https://example.com" },
  text: { text: "" },
  email: { to: "", subject: "", body: "" },
  phone: { number: "" },
  sms: { number: "", message: "" },
  whatsapp: { number: "", message: "" },
  wifi: { ssid: "", password: "", security: "WPA", hidden: "false" },
  vcard: {
    firstName: "",
    lastName: "",
    org: "",
    title: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  },
  location: { lat: "", lng: "" },
  event: { title: "", location: "", start: "", end: "", notes: "" },
};

export const DEFAULT_CONFIG: QRConfig = {
  contentType: "url",
  fields: DEFAULT_FIELDS,
  shape: "square",
  margin: 4,
  ec: "Q",
  dots: { type: "rounded", fill: solid("#16150f") },
  cornerSquare: { type: "extra-rounded", inherit: true, fill: solid("#16150f") },
  cornerDot: { type: "dot", inherit: true, fill: solid("#16150f") },
  background: { transparent: false, fill: solid("#ffffff"), round: 0 },
  logo: { src: null, size: 0.4, margin: 12, hideDots: true },
  frame: {
    style: "none",
    text: "SCAN ME",
    color: "#16150f",
    textColor: "#ffffff",
    radius: 6,
    font: "sans",
  },
};

/** The parts of the config a style preset is allowed to change. */
export type StylePreset = {
  id: string;
  name: string;
  style: Pick<QRConfig, "dots" | "cornerSquare" | "cornerDot" | "background">;
};

export const PRESETS: StylePreset[] = [
  {
    id: "classic",
    name: "Classic",
    style: {
      dots: { type: "square", fill: solid("#000000") },
      cornerSquare: { type: "square", inherit: true, fill: solid("#000000") },
      cornerDot: { type: "square", inherit: true, fill: solid("#000000") },
      background: { transparent: false, fill: solid("#ffffff"), round: 0 },
    },
  },
  {
    id: "ink",
    name: "Soft ink",
    style: {
      dots: { type: "rounded", fill: solid("#16150f") },
      cornerSquare: { type: "extra-rounded", inherit: true, fill: solid("#16150f") },
      cornerDot: { type: "dot", inherit: true, fill: solid("#16150f") },
      background: { transparent: false, fill: solid("#ffffff"), round: 0 },
    },
  },
  {
    id: "ember",
    name: "Ember",
    style: {
      dots: { type: "dots", fill: gradient("#c2260b", "#f2541b", 35) },
      cornerSquare: { type: "extra-rounded", inherit: false, fill: solid("#7a1c06") },
      cornerDot: { type: "dot", inherit: false, fill: solid("#f2541b") },
      background: { transparent: false, fill: solid("#fff7ef"), round: 0.08 },
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    style: {
      dots: { type: "extra-rounded", fill: gradient("#0b3a82", "#0a7d8c", 120) },
      cornerSquare: { type: "extra-rounded", inherit: false, fill: solid("#0b2a5c") },
      cornerDot: { type: "dot", inherit: false, fill: solid("#0a7d8c") },
      background: { transparent: false, fill: solid("#f1f8fb"), round: 0.08 },
    },
  },
  {
    id: "forest",
    name: "Forest",
    style: {
      dots: { type: "classy-rounded", fill: solid("#1c4a2e") },
      cornerSquare: { type: "classy-rounded", inherit: false, fill: solid("#0f2d1b") },
      cornerDot: { type: "classy-rounded", inherit: false, fill: solid("#3f7d3a") },
      background: { transparent: false, fill: solid("#f3f7ee"), round: 0 },
    },
  },
  {
    id: "grape",
    name: "Grape",
    style: {
      dots: { type: "classy", fill: gradient("#4b1d8f", "#b0206f", 60) },
      cornerSquare: { type: "square", inherit: true, fill: solid("#4b1d8f") },
      cornerDot: { type: "square", inherit: true, fill: solid("#4b1d8f") },
      background: { transparent: false, fill: solid("#ffffff"), round: 0 },
    },
  },
  {
    id: "dusk",
    name: "Dusk",
    style: {
      dots: { type: "rounded", fill: gradient("#1d1b4b", "#8a2a5b", 0, "radial") },
      cornerSquare: { type: "dot", inherit: false, fill: solid("#1d1b4b") },
      cornerDot: { type: "dot", inherit: false, fill: solid("#8a2a5b") },
      background: {
        transparent: false,
        fill: gradient("#fff4e6", "#ffe3ec", 160),
        round: 0.1,
      },
    },
  },
  {
    id: "slate",
    name: "Slate",
    style: {
      dots: { type: "dots", fill: solid("#1f2a3a") },
      cornerSquare: { type: "extra-rounded", inherit: true, fill: solid("#1f2a3a") },
      cornerDot: { type: "dot", inherit: false, fill: solid("#d9430f") },
      background: { transparent: false, fill: solid("#eef1f5"), round: 0.08 },
    },
  },
];

const DOT_TYPES: DotType[] = [
  "square",
  "dots",
  "rounded",
  "extra-rounded",
  "classy",
  "classy-rounded",
];
const CORNER_SQUARE_TYPES: CornerSquareType[] = ["square", "extra-rounded", "dot", "classy-rounded"];
const CORNER_DOT_TYPES: CornerDotType[] = ["square", "dot", "rounded", "classy"];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

function hsl(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** A random style that always keeps dark modules on a light background. */
export function randomStyle(): StylePreset["style"] {
  const hue = Math.floor(Math.random() * 360);
  const hue2 = (hue + 30 + Math.floor(Math.random() * 60)) % 360;
  const dark = hsl(hue, 70, 24);
  const dark2 = hsl(hue2, 75, 32);
  const useGradient = Math.random() > 0.45;
  const separateCorners = Math.random() > 0.5;

  return {
    dots: {
      type: pick(DOT_TYPES),
      fill: useGradient
        ? gradient(dark, dark2, Math.floor(Math.random() * 180), pick(["linear", "radial"]))
        : solid(dark),
    },
    cornerSquare: {
      type: pick(CORNER_SQUARE_TYPES),
      inherit: !separateCorners,
      fill: solid(hsl(hue, 75, 18)),
    },
    cornerDot: {
      type: pick(CORNER_DOT_TYPES),
      inherit: !separateCorners,
      fill: solid(dark2),
    },
    background: {
      transparent: false,
      fill: solid(Math.random() > 0.5 ? "#ffffff" : hsl(hue, 45, 96)),
      round: pick([0, 0, 0.06, 0.1]),
    },
  };
}
