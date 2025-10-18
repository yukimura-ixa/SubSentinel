import crypto from "node:crypto";
import { formatBangkok } from "./time";

export interface CalendarEventInput {
  id: string;
  name: string;
  description?: string | null;
  start: Date;
  end?: Date;
}

export interface IcsBuildOptions {
  calendarName: string;
  updatedAt?: Date;
}

export function buildIcs(events: CalendarEventInput[], options: IcsBuildOptions): { body: string; etag: string } {
  const timestamp = formatBangkok(options.updatedAt ?? new Date(), "yyyyMMdd'T'HHmmss");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Subsentinel//Subscription Sentinel//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${options.calendarName}`,
    `X-WR-TIMEZONE:Asia/Bangkok`
  ];

  for (const event of events) {
    const dtStart = formatBangkok(event.start, "yyyyMMdd'T'HHmmss");
    const dtEnd = formatBangkok(event.end ?? event.start, "yyyyMMdd'T'HHmmss");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@subsentinel.app`,
      `SUMMARY:${escapeText(event.name)}`,
      `DESCRIPTION:${escapeText(event.description ?? "")}`,
      `DTSTAMP;TZID=Asia/Bangkok:${timestamp}`,
      `DTSTART;TZID=Asia/Bangkok:${dtStart}`,
      `DTEND;TZID=Asia/Bangkok:${dtEnd}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT48H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(event.name)}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  const body = `${lines.join("\r\n")}\r\n`;
  const etag = crypto.createHash("sha256").update(body).digest("hex");
  return { body, etag };
}

function escapeText(input: string) {
  return input.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
