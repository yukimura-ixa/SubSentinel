"use client";

import { useEffect, useState } from "react";
import { Button } from "@subsentinel/ui";

function buildWebcalUrl(token: string) {
  const base = typeof window === "undefined" ? "" : window.location.origin;
  const httpsBase = base.replace(/^http/, "https");
  return `webcal://${httpsBase.replace(/^https?:\/\//, "")}/calendar/${token}`;
}

export default function CalendarPage() {
  const [token, setToken] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [testUrl, setTestUrl] = useState<string>("");

  useEffect(() => {
    async function loadToken() {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json.success && json.data?.token) {
        setToken(json.data.token);
        setTestUrl(`/calendar/${json.data.token}?preview=1`);
      } else {
        // Assumption: backend returns token when calendar feature enabled
        setToken("demo-token");
        setTestUrl(`/calendar/demo-token?preview=1`);
      }
    }
    void loadToken();
  }, []);

  const onCopy = async () => {
    const url = buildWebcalUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onTest = async () => {
    await fetch(testUrl);
    setCopied(false);
  };

  const webcalUrl = token ? buildWebcalUrl(token) : "";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar feed</h1>
        <p className="text-sm text-slate-500">
          Subscribe in Google Calendar, Apple Calendar, or Notion using the private webcal link below. We only send reminders
          via your calendar app—no email provider needed.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your private link</h2>
        <p className="mt-2 break-all font-mono text-sm text-slate-900">{webcalUrl}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={onCopy}>{copied ? "Copied" : "Copy webcal URL"}</Button>
          <Button type="button" variant="secondary" onClick={onTest}>
            Trigger test event
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Rotate the token if you suspect the feed leaked. The ICS endpoint is cached for 5 minutes with an ETag to protect the
        free tier.
      </p>
    </div>
  );
}
