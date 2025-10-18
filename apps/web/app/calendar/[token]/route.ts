import { NextResponse } from "next/server";
import { prisma } from "@subsentinel/db";
import { buildIcs } from "@/lib/ics";

interface Params {
  params: { token: string };
}

export async function GET(request: Request, { params }: Params) {
  try {
    const settings = await prisma.settings.findFirst({
      where: { calendarToken: params.token },
      include: { user: { select: { id: true } } }
    });

    if (!settings) {
      return NextResponse.json({ success: false, error: "Feed not found" }, { status: 404 });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { userId: settings.userId },
      orderBy: { nextCharge: "asc" }
    });

    const events = subscriptions.map((sub) => ({
      id: sub.id,
      name: sub.name,
      description: sub.notes ?? undefined,
      start: sub.nextCharge,
      end: new Date(sub.nextCharge.getTime() + 60 * 60 * 1000)
    }));

    const { body, etag } = buildIcs(events, {
      calendarName: "Subsentinel Subscriptions",
      updatedAt: settings.updatedAt ?? new Date()
    });

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=300"
        }
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        ETag: etag,
        "Last-Modified": new Date().toUTCString()
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
