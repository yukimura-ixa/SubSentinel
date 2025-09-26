import "@total-typescript/ts-reset";
import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";

export const metadata: Metadata = {
  title: "Subsentinel",
  description: "Track your subscriptions and calendar notifications"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
      </body>
    </html>
  );
}
