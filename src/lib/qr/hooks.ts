"use client";

import { useEffect, useRef, useState } from "react";
import {
  renderQr,
  renderThumb,
  scanCheck,
  type Rendered,
  type ScanResult,
  type ThumbKind,
} from "./render";
import { DEFAULT_CONFIG, PRESETS, type QRConfig } from "./types";

const PREVIEW_WIDTH = 720;

export type Preview = {
  rendered: Rendered | null;
  /** Object URL of the rendered SVG, ready for an <img>. */
  url: string | null;
  error: string | null;
};

function describeError(error: unknown): string {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  if (/overflow/i.test(message)) {
    return "That is too much content for one QR code. Shorten it, or lower the error correction level.";
  }
  return message || "Something went wrong while drawing the code.";
}

/** Re-renders the artwork shortly after the design or the content changes. */
export function usePreview(config: QRConfig, data: string): Preview {
  const [preview, setPreview] = useState<Preview>({ rendered: null, url: null, error: null });
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rendered = await renderQr(config, data, PREVIEW_WIDTH);
        if (cancelled) return;
        const url = URL.createObjectURL(new Blob([rendered.svg], { type: "image/svg+xml;charset=utf-8" }));
        const previous = lastUrl.current;
        lastUrl.current = url;
        setPreview({ rendered, url, error: null });
        // Give the <img> a moment to swap before releasing the old picture.
        if (previous) setTimeout(() => URL.revokeObjectURL(previous), 2000);
      } catch (error) {
        if (!cancelled) setPreview((current) => ({ ...current, error: describeError(error) }));
      }
    }, 40);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config, data]);

  return preview;
}

export type ScanStatus = "checking" | ScanResult;

/** Tries to decode each finished preview, the way a phone would. */
export function useScanCheck(rendered: Rendered | null, data: string): ScanStatus {
  const [result, setResult] = useState<{ target: Rendered; status: ScanResult } | null>(null);

  useEffect(() => {
    if (!rendered || !data) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const status = await scanCheck(rendered, data).catch((): ScanResult => "fail");
      if (!cancelled) setResult({ target: rendered, status });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rendered, data]);

  return result && result.target === rendered ? result.status : "checking";
}

const THUMBS: Record<ThumbKind, string[]> = {
  dots: ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"],
  cornerSquare: ["square", "extra-rounded", "dot", "rounded", "classy", "classy-rounded", "dots"],
  cornerDot: ["square", "dot", "rounded", "extra-rounded", "classy", "classy-rounded", "dots"],
};

export const STYLE_VALUES = THUMBS;

let thumbsPromise: Promise<Record<string, string>> | null = null;

function loadThumbs(): Promise<Record<string, string>> {
  thumbsPromise ??= (async () => {
    const images: Record<string, string> = {};
    const jobs: Promise<void>[] = [];

    for (const kind of Object.keys(THUMBS) as ThumbKind[]) {
      for (const type of THUMBS[kind]) {
        jobs.push(renderThumb(kind, type).then((image) => void (images[`${kind}:${type}`] = image)));
      }
    }
    for (const preset of PRESETS) {
      const sample: QRConfig = { ...DEFAULT_CONFIG, ...preset.style, margin: 6 };
      jobs.push(
        renderQr(sample, "https://example.com", 168).then(({ svg }) => {
          images[`preset:${preset.id}`] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }),
      );
    }
    await Promise.all(jobs);
    return images;
  })();
  return thumbsPromise;
}

/** Pictures for the style and preset tiles, keyed "kind:value". */
export function useThumbs(): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    loadThumbs()
      .then((images) => !cancelled && setThumbs(images))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return thumbs;
}
