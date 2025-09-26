import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@subsentinel/db";
import { parse } from "valibot";
import { subscriptionUpdateSchema } from "@/schemas/subscription";

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const json = await request.json();

    if (json.action === "rotate" && params.id === "demo") {
      const updated = await prisma.settings.upsert({
        where: { userId: "demo-user" },
        update: { calendarToken: crypto.randomUUID(), calendarRotatedAt: new Date() },
        create: {
          userId: "demo-user",
          timezone: "Asia/Bangkok",
          currency: "THB",
          calendarToken: crypto.randomUUID()
        }
      });
      return NextResponse.json({ success: true, data: { token: updated.calendarToken } });
    }

    const payload = parse(subscriptionUpdateSchema, { ...json, id: params.id });
    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: {
        name: payload.name ?? undefined,
        amount: payload.amount ?? undefined,
        currency: payload.currency ?? undefined,
        cycle: payload.cycle ?? undefined,
        nextCharge: payload.nextCharge ? new Date(payload.nextCharge) : undefined,
        notes: payload.notes ?? undefined
      }
    });
    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        amount: Number(updated.amount),
        currency: updated.currency,
        cycle: updated.cycle,
        nextCharge: updated.nextCharge.toISOString()
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await prisma.subscription.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
