"use client";

import {
  CalendarDays,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Type,
  UserRound,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";
import { CONTENT_TYPES, type FieldDef } from "@/lib/qr/content";
import type { ContentType, QRConfig } from "@/lib/qr/types";
import { Field, Section, Toggle, inputClass } from "./controls";

const ICONS: Record<ContentType, LucideIcon> = {
  url: Link2,
  text: Type,
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  wifi: Wifi,
  vcard: UserRound,
  location: MapPin,
  event: CalendarDays,
};

const INPUT_TYPES: Partial<Record<NonNullable<FieldDef["kind"]>, string>> = {
  tel: "tel",
  email: "email",
  url: "url",
  datetime: "datetime-local",
};

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const span = def.wide ? "sm:col-span-2" : "";

  if (def.kind === "toggle") {
    return (
      <div className={span}>
        <Toggle label={def.label} checked={value === "true"} onChange={(on) => onChange(String(on))} />
      </div>
    );
  }

  return (
    <Field label={def.label} htmlFor={id} className={span}>
      {def.kind === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          placeholder={def.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} resize-y`}
        />
      ) : def.kind === "select" ? (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          {def.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          // Passwords stay readable on purpose: they are about to be printed in a code anyway.
          type={INPUT_TYPES[def.kind ?? "text"] ?? "text"}
          value={value}
          placeholder={def.placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </Field>
  );
}

export default function ContentForm({
  config,
  onType,
  onField,
}: {
  config: QRConfig;
  onType: (type: ContentType) => void;
  onField: (key: string, value: string) => void;
}) {
  const active = CONTENT_TYPES.find((type) => type.id === config.contentType) ?? CONTENT_TYPES[0];
  const values = config.fields[active.id] ?? {};

  return (
    <>
      <Section title="What should the code open?">
        <div role="radiogroup" aria-label="Content type" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CONTENT_TYPES.map((type) => {
            const Icon = ICONS[type.id];
            const selected = type.id === active.id;
            return (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onType(type.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  selected
                    ? "border-accent bg-accent-soft text-ink ring-1 ring-accent"
                    : "border-line bg-field text-muted hover:border-muted/50 hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={2} className={`shrink-0 ${selected ? "text-accent" : ""}`} aria-hidden />
                {type.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={`${active.label} details`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {active.fields.map((def) => (
            <FieldInput
              key={`${active.id}.${def.key}`}
              def={def}
              value={values[def.key] ?? ""}
              onChange={(value) => onField(def.key, value)}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
