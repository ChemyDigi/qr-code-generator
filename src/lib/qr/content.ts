import type { ContentType, QRConfig } from "./types";

export type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  kind?: "text" | "textarea" | "tel" | "email" | "url" | "password" | "datetime" | "select" | "toggle";
  options?: { value: string; label: string }[];
  /** Span both columns of the form grid. */
  wide?: boolean;
};

export type ContentDef = {
  id: ContentType;
  label: string;
  fields: FieldDef[];
};

export const CONTENT_TYPES: ContentDef[] = [
  {
    id: "url",
    label: "Link",
    fields: [{ key: "url", label: "Website address", placeholder: "https://example.com", kind: "url", wide: true }],
  },
  {
    id: "text",
    label: "Text",
    fields: [{ key: "text", label: "Text", placeholder: "Anything you like", kind: "textarea", wide: true }],
  },
  {
    id: "email",
    label: "Email",
    fields: [
      { key: "to", label: "To", placeholder: "name@example.com", kind: "email", wide: true },
      { key: "subject", label: "Subject", wide: true },
      { key: "body", label: "Message", kind: "textarea", wide: true },
    ],
  },
  {
    id: "phone",
    label: "Phone",
    fields: [{ key: "number", label: "Phone number", placeholder: "+94 77 123 4567", kind: "tel", wide: true }],
  },
  {
    id: "sms",
    label: "SMS",
    fields: [
      { key: "number", label: "Phone number", placeholder: "+94 77 123 4567", kind: "tel", wide: true },
      { key: "message", label: "Message", kind: "textarea", wide: true },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    fields: [
      { key: "number", label: "Number with country code", placeholder: "+94 77 123 4567", kind: "tel", wide: true },
      { key: "message", label: "Pre-filled message", kind: "textarea", wide: true },
    ],
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    fields: [
      { key: "ssid", label: "Network name", placeholder: "My network", wide: true },
      { key: "password", label: "Password", kind: "password" },
      {
        key: "security",
        label: "Security",
        kind: "select",
        options: [
          { value: "WPA", label: "WPA / WPA2 / WPA3" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "None" },
        ],
      },
      { key: "hidden", label: "Hidden network", kind: "toggle", wide: true },
    ],
  },
  {
    id: "vcard",
    label: "Contact",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "org", label: "Company" },
      { key: "title", label: "Job title" },
      { key: "phone", label: "Phone", kind: "tel" },
      { key: "email", label: "Email", kind: "email" },
      { key: "website", label: "Website", kind: "url", wide: true },
      { key: "address", label: "Address", wide: true },
    ],
  },
  {
    id: "location",
    label: "Location",
    fields: [
      { key: "lat", label: "Latitude", placeholder: "6.9271" },
      { key: "lng", label: "Longitude", placeholder: "79.8612" },
    ],
  },
  {
    id: "event",
    label: "Event",
    fields: [
      { key: "title", label: "Title", wide: true },
      { key: "start", label: "Starts", kind: "datetime" },
      { key: "end", label: "Ends", kind: "datetime" },
      { key: "location", label: "Where", wide: true },
      { key: "notes", label: "Notes", kind: "textarea", wide: true },
    ],
  },
];

const trim = (value: string | undefined) => (value ?? "").trim();

/** Escape the characters that are special inside a WIFI: payload. */
const wifiEscape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

/** Escape text for vCard / iCalendar values. */
const cardEscape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

const query = (params: Record<string, string>) => {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

/** "2026-11-12T09:30" (local time) → "20261112T093000". */
const calendarStamp = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}00` : "";
};

/**
 * Turn the form fields for the active content type into the string that gets
 * encoded. Returns an empty string when there is not enough to encode yet.
 */
export function encodeContent(config: Pick<QRConfig, "contentType" | "fields">): string {
  const f = config.fields[config.contentType] ?? {};

  switch (config.contentType) {
    case "url": {
      const url = trim(f.url);
      if (!url) return "";
      return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
    }
    case "text":
      return f.text ?? "";
    case "email": {
      const to = trim(f.to);
      if (!to) return "";
      return `mailto:${to}${query({ subject: trim(f.subject), body: f.body ?? "" })}`;
    }
    case "phone": {
      const number = trim(f.number).replace(/[^\d+]/g, "");
      return number ? `tel:${number}` : "";
    }
    case "sms": {
      const number = trim(f.number).replace(/[^\d+]/g, "");
      return number ? `SMSTO:${number}:${f.message ?? ""}` : "";
    }
    case "whatsapp": {
      const number = trim(f.number).replace(/\D/g, "");
      return number ? `https://wa.me/${number}${query({ text: f.message ?? "" })}` : "";
    }
    case "wifi": {
      const ssid = f.ssid ?? "";
      if (!ssid) return "";
      const security = f.security || "WPA";
      const password = security === "nopass" ? "" : `P:${wifiEscape(f.password ?? "")};`;
      const hidden = f.hidden === "true" ? "H:true;" : "";
      return `WIFI:T:${security};S:${wifiEscape(ssid)};${password}${hidden};`;
    }
    case "vcard": {
      const first = trim(f.firstName);
      const last = trim(f.lastName);
      const org = trim(f.org);
      if (!first && !last && !org) return "";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${cardEscape(last)};${cardEscape(first)};;;`,
        `FN:${cardEscape([first, last].filter(Boolean).join(" ") || org)}`,
      ];
      if (org) lines.push(`ORG:${cardEscape(org)}`);
      if (trim(f.title)) lines.push(`TITLE:${cardEscape(trim(f.title))}`);
      if (trim(f.phone)) lines.push(`TEL;TYPE=CELL:${trim(f.phone)}`);
      if (trim(f.email)) lines.push(`EMAIL:${trim(f.email)}`);
      if (trim(f.website)) lines.push(`URL:${trim(f.website)}`);
      if (trim(f.address)) lines.push(`ADR:;;${cardEscape(trim(f.address))};;;;`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    case "location": {
      const lat = Number.parseFloat(f.lat);
      const lng = Number.parseFloat(f.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
      return `geo:${lat},${lng}`;
    }
    case "event": {
      const title = trim(f.title);
      const start = calendarStamp(f.start ?? "");
      if (!title || !start) return "";
      const end = calendarStamp(f.end ?? "");
      const lines = ["BEGIN:VEVENT", `SUMMARY:${cardEscape(title)}`, `DTSTART:${start}`];
      if (end) lines.push(`DTEND:${end}`);
      if (trim(f.location)) lines.push(`LOCATION:${cardEscape(trim(f.location))}`);
      if (trim(f.notes)) lines.push(`DESCRIPTION:${cardEscape(trim(f.notes))}`);
      lines.push("END:VEVENT");
      return lines.join("\n");
    }
  }
}

/** A short hint shown when the active form does not produce any content yet. */
export const EMPTY_HINTS: Record<ContentType, string> = {
  url: "Enter a website address to generate a code.",
  text: "Type some text to generate a code.",
  email: "Enter the recipient's email address.",
  phone: "Enter a phone number.",
  sms: "Enter a phone number.",
  whatsapp: "Enter a WhatsApp number including the country code.",
  wifi: "Enter the network name.",
  vcard: "Enter a name or company.",
  location: "Enter a latitude and longitude.",
  event: "Enter a title and a start time.",
};
