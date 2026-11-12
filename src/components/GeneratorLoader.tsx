"use client";

import dynamic from "next/dynamic";

// The generator reads saved settings from the browser and draws with browser
// APIs, so it is rendered on the client only.
const QRGenerator = dynamic(() => import("./QRGenerator"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted">Loading QR Studio…</div>
  ),
});

export default function GeneratorLoader() {
  return <QRGenerator />;
}
