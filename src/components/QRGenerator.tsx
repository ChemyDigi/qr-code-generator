"use client";

import {
  Check,
  CircleCheck,
  Copy,
  Download,
  Frame,
  ImagePlus,
  Link2,
  LoaderCircle,
  Moon,
  Palette,
  QrCode,
  RotateCcw,
  Scan,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EMPTY_HINTS, encodeContent } from "@/lib/qr/content";
import { usePreview, useScanCheck, useThumbs } from "@/lib/qr/hooks";
import { artworkHeight, designWarnings, downloadBlob, exportBlob } from "@/lib/qr/render";
import { THEME_KEY, loadState, saveState } from "@/lib/qr/storage";
import {
  DEFAULT_CONFIG,
  DEFAULT_EXPORT,
  type ContentType,
  type ExportFormat,
  type ExportSettings,
  type QRConfig,
} from "@/lib/qr/types";
import ContentForm from "./ContentForm";
import { Field, Segmented, Slider, inputClass } from "./controls";
import { AdvancedPanel, CornersPanel, FramePanel, LogoPanel, StylePanel } from "./panels";

type TabId = "content" | "style" | "corners" | "logo" | "frame" | "advanced";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "content", label: "Content", icon: Link2 },
  { id: "style", label: "Style", icon: Palette },
  { id: "corners", label: "Corners", icon: Scan },
  { id: "logo", label: "Logo", icon: ImagePlus },
  { id: "frame", label: "Frame", icon: Frame },
  { id: "advanced", label: "Advanced", icon: SlidersHorizontal },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

type Theme = "light" | "dark";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // The choice simply will not be remembered.
    }
    setTheme(next);
  };
  return [theme, toggle];
}

export default function QRGenerator() {
  const [initial] = useState(loadState);
  const [config, setConfig] = useState<QRConfig>(initial.config);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(initial.exportSettings);
  const [tab, setTab] = useState<TabId>("content");
  const [theme, toggleTheme] = useTheme();
  const [busy, setBusy] = useState<"download" | "copy" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  const data = useMemo(() => encodeContent(config), [config]);
  const preview = usePreview(config, data);
  const scan = useScanCheck(preview.rendered, data);
  const thumbs = useThumbs();
  const warnings = useMemo(() => designWarnings(config), [config]);

  const update = (patch: Partial<QRConfig>) => setConfig((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const timer = setTimeout(() => saveState({ config, exportSettings }), 300);
    return () => clearTimeout(timer);
  }, [config, exportSettings]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const ready = Boolean(data) && !preview.error && Boolean(preview.rendered);
  const aspect = preview.rendered ? preview.rendered.height / preview.rendered.width : 1;
  const exportHeight = artworkHeight(config, exportSettings.size);
  const jpegLosesTransparency = exportSettings.format === "jpeg" && config.background.transparent;

  const download = async () => {
    setBusy("download");
    try {
      const blob = await exportBlob(config, data, exportSettings.format, exportSettings.size);
      const base = exportSettings.name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "qr-code";
      downloadBlob(blob, `${base}.${exportSettings.format === "jpeg" ? "jpg" : exportSettings.format}`);
      setNotice({ tone: "ok", text: "Saved to your downloads." });
    } catch {
      setNotice({ tone: "danger", text: "The file could not be created. Try a smaller size." });
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    setBusy("copy");
    try {
      // Hand the clipboard a promise so Safari keeps the user gesture alive.
      const blob = exportBlob(config, data, "png", exportSettings.size);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setNotice({ tone: "ok", text: "Copied as a PNG image." });
    } catch {
      setNotice({ tone: "danger", text: "Your browser blocked copying. Download the file instead." });
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setConfig(DEFAULT_CONFIG);
    setExportSettings(DEFAULT_EXPORT);
    setTab("content");
  };

  const panelProps = { config, update, thumbs };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-surface">
            <QrCode size={20} aria-hidden />
          </span>
          <div>
            <h1 className="text-base leading-tight font-semibold tracking-tight text-ink">QR Studio</h1>
            <p className="hidden text-xs text-muted sm:block">Design a code, check it scans, export it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:border-muted/50"
          >
            <RotateCcw size={14} aria-hidden />
            <span className="hidden sm:inline">Start over</span>
            <span className="sr-only sm:hidden">Start over</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-ink transition hover:border-muted/50"
          >
            {theme === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 rounded-2xl border border-line bg-surface">
          <div
            role="tablist"
            aria-label="Customisation"
            className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 pt-3"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = id === tab;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={active}
                  aria-controls="tab-panel"
                  onClick={() => setTab(id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pt-2 pb-3 text-sm font-medium transition ${
                    active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  <Icon size={16} className={active ? "text-accent" : ""} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>

          <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="p-5 sm:p-6">
            {tab === "content" ? (
              <ContentForm
                config={config}
                onType={(contentType: ContentType) => update({ contentType })}
                onField={(key, value) =>
                  setConfig((current) => ({
                    ...current,
                    fields: {
                      ...current.fields,
                      [current.contentType]: { ...current.fields[current.contentType], [key]: value },
                    },
                  }))
                }
              />
            ) : null}
            {tab === "style" ? <StylePanel {...panelProps} /> : null}
            {tab === "corners" ? <CornersPanel {...panelProps} /> : null}
            {tab === "logo" ? <LogoPanel {...panelProps} /> : null}
            {tab === "frame" ? <FramePanel {...panelProps} /> : null}
            {tab === "advanced" ? <AdvancedPanel {...panelProps} /> : null}
          </div>
        </div>

        <aside className="order-first rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6 lg:order-none">
          <div className="checkerboard flex aspect-square items-center justify-center overflow-hidden rounded-xl p-5 ring-1 ring-black/5">
            {!data ? (
              <p className="max-w-52 text-center text-sm text-[#6b675e]">{EMPTY_HINTS[config.contentType]}</p>
            ) : preview.error ? (
              <p className="max-w-60 text-center text-sm text-[#b42318]">{preview.error}</p>
            ) : preview.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- locally generated blob URL
              <img
                src={preview.url}
                alt="Preview of your QR code"
                className="max-h-full max-w-full drop-shadow-sm"
                style={{ aspectRatio: `1 / ${aspect}` }}
              />
            ) : (
              <LoaderCircle size={20} className="animate-spin text-[#6b675e]" aria-label="Drawing" />
            )}
          </div>

          <div className="mt-4 space-y-2" aria-live="polite">
            {ready ? (
              scan === "pass" ? (
                <p className="flex items-start gap-2 text-sm font-medium text-ok">
                  <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden />
                  Scan test passed
                </p>
              ) : scan === "fail" ? (
                <p className="flex items-start gap-2 text-sm font-medium text-warn">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
                  Our scan test could not read this. Try more contrast, a smaller logo, simpler corners or higher error correction.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-sm text-muted">
                  <LoaderCircle size={16} className="mt-0.5 shrink-0 animate-spin" aria-hidden />
                  Running scan test…
                </p>
              )
            ) : null}
            {ready
              ? warnings.map((warning) => (
                  <p key={warning} className="flex items-start gap-2 text-xs text-muted">
                    <TriangleAlert size={14} className="mt-px shrink-0 text-warn" aria-hidden />
                    {warning}
                  </p>
                ))
              : null}
          </div>

          <div className="mt-5 space-y-4 border-t border-line pt-5">
            <Segmented
              full
              label="File format"
              value={exportSettings.format}
              onChange={(format) => setExportSettings((current) => ({ ...current, format }))}
              options={FORMATS}
            />
            <Slider
              label="Size"
              min={256}
              max={4096}
              step={64}
              value={exportSettings.size}
              format={(size) => `${size} × ${artworkHeight(config, size)} px`}
              onChange={(size) => setExportSettings((current) => ({ ...current, size }))}
            />
            <Field label="File name" htmlFor="file-name">
              <input
                id="file-name"
                type="text"
                value={exportSettings.name}
                spellCheck={false}
                onChange={(event) => setExportSettings((current) => ({ ...current, name: event.target.value }))}
                className={inputClass}
              />
            </Field>
            {jpegLosesTransparency ? (
              <p className="text-xs text-muted">JPEG cannot be transparent, so the background will be white.</p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={download}
                disabled={!ready || busy !== null}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "download" ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Download size={16} aria-hidden />
                )}
                Download {FORMATS.find((format) => format.value === exportSettings.format)?.label}
              </button>
              <button
                type="button"
                onClick={copy}
                disabled={!ready || busy !== null}
                aria-label="Copy as PNG image"
                title="Copy as PNG image"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink transition hover:border-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "copy" ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden />
                ) : (
                  <Copy size={16} aria-hidden />
                )}
                Copy
              </button>
            </div>
            <p
              role="status"
              className={`flex min-h-5 items-center gap-1.5 text-xs ${notice?.tone === "danger" ? "text-danger" : "text-ok"}`}
            >
              {notice ? (
                <>
                  {notice.tone === "ok" ? <Check size={14} aria-hidden /> : <TriangleAlert size={14} aria-hidden />}
                  {notice.text}
                </>
              ) : (
                <span className="text-muted">
                  {exportSettings.format === "svg"
                    ? "SVG stays sharp at any size. Best for print."
                    : `${exportSettings.size} × ${exportHeight} px image.`}
                </span>
              )}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
