"use client";

import { Shuffle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { STYLE_VALUES } from "@/lib/qr/hooks";
import { PRESETS, randomStyle, type ErrorCorrection, type QRConfig } from "@/lib/qr/types";
import {
  ColorInput,
  Field,
  FillControl,
  Section,
  Segmented,
  Slider,
  TileGrid,
  Toggle,
  inputClass,
} from "./controls";

type PanelProps = {
  config: QRConfig;
  update: (patch: Partial<QRConfig>) => void;
  thumbs: Record<string, string>;
};

const STYLE_LABELS: Record<string, string> = {
  square: "Square",
  dots: "Dots",
  dot: "Circle",
  rounded: "Rounded",
  "extra-rounded": "Smooth",
  classy: "Classy",
  "classy-rounded": "Leaf",
};

const tiles = <T extends string>(kind: keyof typeof STYLE_VALUES, thumbs: Record<string, string>) =>
  STYLE_VALUES[kind].map((value) => ({
    value: value as T,
    label: STYLE_LABELS[value] ?? value,
    image: thumbs[`${kind}:${value}`],
  }));

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function StylePanel({ config, update, thumbs }: PanelProps) {
  return (
    <>
      <Section
        title="Start from a preset"
        description="Pick a look, then fine-tune anything below."
        action={
          <button
            type="button"
            onClick={() => update(randomStyle())}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-field px-3 py-1.5 text-sm font-medium text-ink transition hover:border-muted/50"
          >
            <Shuffle size={14} aria-hidden />
            Surprise me
          </button>
        }
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => update(preset.style)}
              className="group flex flex-col items-center gap-1.5 text-center"
            >
              <span className="block aspect-square w-full overflow-hidden rounded-xl border border-line bg-white transition group-hover:border-accent">
                {thumbs[`preset:${preset.id}`] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- inline data URL, nothing to optimise
                  <img src={thumbs[`preset:${preset.id}`]} alt="" className="h-full w-full" />
                ) : null}
              </span>
              <span className="text-[11px] font-medium text-muted group-hover:text-ink">{preset.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Pattern" description="The shape and colour of the modules that carry the data.">
        <TileGrid
          label="Pattern style"
          value={config.dots.type}
          options={tiles<QRConfig["dots"]["type"]>("dots", thumbs)}
          onChange={(type) => update({ dots: { ...config.dots, type } })}
        />
        <FillControl
          label="Pattern colour"
          value={config.dots.fill}
          onChange={(fill) => update({ dots: { ...config.dots, fill } })}
        />
      </Section>

      <Section title="Background">
        <Toggle
          label="Transparent background"
          description="Available in PNG, WebP and SVG exports."
          checked={config.background.transparent}
          onChange={(transparent) => update({ background: { ...config.background, transparent } })}
        />
        {config.background.transparent ? null : (
          <>
            <FillControl
              label="Background colour"
              value={config.background.fill}
              onChange={(fill) => update({ background: { ...config.background, fill } })}
            />
            <Slider
              label="Rounded corners"
              min={0}
              max={0.5}
              step={0.01}
              value={config.background.round}
              format={percent}
              onChange={(round) => update({ background: { ...config.background, round } })}
            />
          </>
        )}
      </Section>
    </>
  );
}

export function CornersPanel({ config, update, thumbs }: PanelProps) {
  return (
    <>
      <Section title="Corner frames" description="The three large squares scanners use to find the code.">
        <TileGrid
          label="Corner frame style"
          columns="grid-cols-4 sm:grid-cols-7"
          value={config.cornerSquare.type}
          options={tiles<QRConfig["cornerSquare"]["type"]>("cornerSquare", thumbs)}
          onChange={(type) => update({ cornerSquare: { ...config.cornerSquare, type } })}
        />
        <Toggle
          label="Match the pattern colour"
          checked={config.cornerSquare.inherit}
          onChange={(inherit) => update({ cornerSquare: { ...config.cornerSquare, inherit } })}
        />
        {config.cornerSquare.inherit ? null : (
          <FillControl
            label="Frame colour"
            value={config.cornerSquare.fill}
            onChange={(fill) => update({ cornerSquare: { ...config.cornerSquare, fill } })}
          />
        )}
      </Section>

      <Section title="Corner centres" description="The solid shape inside each corner frame.">
        <TileGrid
          label="Corner centre style"
          columns="grid-cols-4 sm:grid-cols-7"
          value={config.cornerDot.type}
          options={tiles<QRConfig["cornerDot"]["type"]>("cornerDot", thumbs)}
          onChange={(type) => update({ cornerDot: { ...config.cornerDot, type } })}
        />
        <Toggle
          label="Match the pattern colour"
          checked={config.cornerDot.inherit}
          onChange={(inherit) => update({ cornerDot: { ...config.cornerDot, inherit } })}
        />
        {config.cornerDot.inherit ? null : (
          <FillControl
            label="Centre colour"
            value={config.cornerDot.fill}
            onChange={(fill) => update({ cornerDot: { ...config.cornerDot, fill } })}
          />
        )}
      </Section>
    </>
  );
}

/** Read an uploaded logo, shrinking large bitmaps so they stay quick to draw and save. */
async function readLogo(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return dataUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("That file does not look like an image."));
    element.src = dataUrl;
  });
  const limit = 640;
  const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
  if (scale === 1 && dataUrl.length < 400_000) return dataUrl;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function LogoPanel({ config, update }: PanelProps) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const { logo } = config;

  const accept = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file: PNG, JPEG, SVG or WebP.");
      return;
    }
    try {
      const src = await readLogo(file);
      setError(null);
      // A logo covers part of the code, so switch to the strongest error correction.
      update({ logo: { ...logo, src }, ec: "H" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not use that image.");
    }
  };

  return (
    <>
      <Section title="Logo" description="Placed in the centre of the code. Simple, square-ish marks work best.">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void accept(event.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center gap-4 rounded-xl border border-dashed p-5 sm:flex-row ${
            dragging ? "border-accent bg-accent-soft" : "border-line bg-field"
          }`}
        >
          <span className="checkerboard flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-black/10">
            {logo.src ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URL
              <img src={logo.src} alt="Current logo" className="max-h-full max-w-full object-contain" />
            ) : (
              <Upload size={20} className="text-[#8a867c]" aria-hidden />
            )}
          </span>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-ink">{logo.src ? "Logo added" : "Drop an image here"}</p>
            <p className="text-xs text-muted">PNG, JPEG, SVG or WebP. It stays in your browser.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-surface transition hover:opacity-90"
              >
                <Upload size={14} aria-hidden />
                {logo.src ? "Replace" : "Choose image"}
              </button>
              {logo.src ? (
                <button
                  type="button"
                  onClick={() => update({ logo: { ...logo, src: null } })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:border-muted/50"
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void accept(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </Section>

      <Section
        title="Placement"
        description="Adding a logo switches error correction to High so the covered area can be recovered."
      >
        <Slider
          label="Logo size"
          min={0.15}
          max={0.6}
          step={0.01}
          value={logo.size}
          format={percent}
          onChange={(size) => update({ logo: { ...logo, size } })}
        />
        <Slider
          label="Space around the logo"
          min={0}
          max={40}
          value={logo.margin}
          onChange={(margin) => update({ logo: { ...logo, margin } })}
        />
        <Toggle
          label="Clear the pattern behind the logo"
          description="Turn off to let the pattern show through transparent logos."
          checked={logo.hideDots}
          onChange={(hideDots) => update({ logo: { ...logo, hideDots } })}
        />
      </Section>
    </>
  );
}

function FrameGlyph({ style }: { style: QRConfig["frame"]["style"] }) {
  const code = <rect x="9" y={style === "top" ? 15 : 7} width="22" height="22" rx="2" fill="#16150f" />;
  if (style === "none") {
    return (
      <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden>
        <rect x="9" y="11" width="22" height="22" rx="2" fill="#16150f" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 44" className="h-full w-full" aria-hidden>
      <rect x="5" y="3" width="30" height="38" rx="4" fill="#d9430f" />
      <rect x="8" y={style === "top" ? 14 : 6} width="24" height="24" rx="2" fill="#ffffff" />
      {code}
      <rect x="12" y={style === "top" ? 7 : 33} width="16" height="3" rx="1.5" fill="#ffffff" />
    </svg>
  );
}

export function FramePanel({ config, update }: PanelProps) {
  const { frame } = config;
  const set = (patch: Partial<QRConfig["frame"]>) => update({ frame: { ...frame, ...patch } });

  return (
    <>
      <Section title="Frame" description="Wrap the code in a coloured frame with a call to action.">
        <TileGrid
          label="Frame style"
          columns="grid-cols-3"
          value={frame.style}
          onChange={(style) => set({ style })}
          options={[
            { value: "none", label: "No frame", node: <FrameGlyph style="none" /> },
            { value: "bottom", label: "Label below", node: <FrameGlyph style="bottom" /> },
            { value: "top", label: "Label above", node: <FrameGlyph style="top" /> },
          ]}
        />
      </Section>

      {frame.style === "none" ? null : (
        <Section title="Label and colours">
          <Field label="Label text" htmlFor="frame-text" hint="Up to 32 characters. Leave empty for a plain frame.">
            <input
              id="frame-text"
              type="text"
              maxLength={32}
              value={frame.text}
              onChange={(event) => set({ text: event.target.value })}
              className={inputClass}
            />
          </Field>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Typeface</span>
            <Segmented
              label="Label typeface"
              value={frame.font}
              onChange={(font) => set({ font })}
              options={[
                { value: "sans", label: "Sans" },
                { value: "serif", label: "Serif" },
                { value: "mono", label: "Mono" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorInput label="Frame colour" value={frame.color} onChange={(color) => set({ color })} />
            <ColorInput label="Text colour" value={frame.textColor} onChange={(textColor) => set({ textColor })} />
          </div>
          <Slider
            label="Frame corner radius"
            min={0}
            max={14}
            value={frame.radius}
            format={(v) => `${v}%`}
            onChange={(radius) => set({ radius })}
          />
        </Section>
      )}
    </>
  );
}

const EC_LEVELS: { value: ErrorCorrection; label: string; note: string }[] = [
  { value: "L", label: "Low", note: "Recovers about 7% damage. Smallest, least dense code." },
  { value: "M", label: "Medium", note: "Recovers about 15% damage. A good everyday default." },
  { value: "Q", label: "Quartile", note: "Recovers about 25% damage. Good for print and styled codes." },
  { value: "H", label: "High", note: "Recovers about 30% damage. Best with a logo; densest code." },
];

export function AdvancedPanel({ config, update }: PanelProps) {
  const level = EC_LEVELS.find((item) => item.value === config.ec) ?? EC_LEVELS[1];

  return (
    <>
      <Section title="Shape">
        <Segmented
          label="Code shape"
          value={config.shape}
          onChange={(shape) => update({ shape })}
          options={[
            { value: "square", label: "Square" },
            { value: "circle", label: "Circle" },
          ]}
        />
        {config.shape === "circle" ? (
          <p className="text-xs text-muted">
            Circle fills the area around the code with decorative modules. Keep a generous quiet zone.
          </p>
        ) : null}
      </Section>

      <Section title="Quiet zone" description="Empty space around the code. Scanners need some to find the edges.">
        <Slider
          label="Margin"
          min={0}
          max={15}
          value={config.margin}
          format={(v) => `${v}%`}
          onChange={(margin) => update({ margin })}
        />
      </Section>

      <Section title="Error correction" description="How much of the code can be damaged or covered and still scan.">
        <Segmented
          full
          label="Error correction level"
          value={config.ec}
          onChange={(ec) => update({ ec })}
          options={EC_LEVELS.map(({ value, label }) => ({ value, label }))}
        />
        <p className="text-xs text-muted">{level.note}</p>
      </Section>
    </>
  );
}
