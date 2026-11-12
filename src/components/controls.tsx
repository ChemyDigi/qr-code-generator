"use client";

import { useId, useState, type ReactNode } from "react";
import type { Fill } from "@/lib/qr/types";

export const inputClass =
  "w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-6 first:border-t-0 first:pt-0 last:pb-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
        <span className="text-xs tabular-nums text-ink">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="block h-5 w-full cursor-pointer accent-accent"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  full = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  full?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${full ? "flex w-full" : "inline-flex"} rounded-lg border border-line bg-field p-0.5`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`${full ? "flex-1" : ""} rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  // While the user is mid-way through typing a hex code, show their draft.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-field p-1 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
        <span
          className="relative h-7 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-muted/40"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            aria-label={`${label} picker`}
            value={HEX.test(value) ? value : "#000000"}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
        <input
          id={id}
          type="text"
          spellCheck={false}
          maxLength={7}
          value={draft ?? value.toUpperCase()}
          onChange={(event) => {
            const raw = event.target.value.trim();
            const next = raw.startsWith("#") ? raw : `#${raw}`;
            setDraft(raw);
            if (HEX.test(next)) onChange(next.toLowerCase());
          }}
          onBlur={() => setDraft(null)}
          className="w-full min-w-0 bg-transparent font-mono text-sm text-ink outline-none"
        />
      </div>
    </div>
  );
}

export function FillControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Fill;
  onChange: (value: Fill) => void;
}) {
  const set = (patch: Partial<Fill>) => onChange({ ...value, ...patch });
  const isGradient = value.mode === "gradient";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">{label}</span>
        <Segmented
          label={`${label} type`}
          value={value.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorInput label={isGradient ? "From" : "Colour"} value={value.color} onChange={(color) => set({ color })} />
        {isGradient ? (
          <ColorInput label="To" value={value.color2} onChange={(color2) => set({ color2 })} />
        ) : null}
      </div>
      {isGradient ? (
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <Segmented
            full
            label={`${label} gradient shape`}
            value={value.gradientType}
            onChange={(gradientType) => set({ gradientType })}
            options={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
          />
          {value.gradientType === "linear" ? (
            <Slider
              label="Angle"
              min={0}
              max={360}
              step={5}
              value={value.rotation}
              format={(v) => `${v}°`}
              onChange={(rotation) => set({ rotation })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TileGrid<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = "grid-cols-3 sm:grid-cols-6",
}: {
  label: string;
  options: { value: T; label: string; image?: string; node?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  columns?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-2 ${columns}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-2 text-center transition ${
              active
                ? "border-accent bg-accent-soft ring-1 ring-accent"
                : "border-line bg-field hover:border-muted/50"
            }`}
          >
            <span className="flex aspect-square w-full max-w-16 items-center justify-center overflow-hidden rounded-lg bg-white p-1.5 ring-1 ring-black/5">
              {option.node ??
                (option.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- inline data URL, nothing to optimise
                  <img src={option.image} alt="" className="h-full w-full" />
                ) : null)}
            </span>
            <span className={`text-[11px] leading-tight font-medium ${active ? "text-ink" : "text-muted"}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
