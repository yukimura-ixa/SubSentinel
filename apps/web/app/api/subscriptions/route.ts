import { NextResponse } from "next/server";
import { prisma } from "@subsentinel/db";
import { parse } from "valibot";
import { subscriptionCreateSchema, subscriptionListSchema } from "@/schemas/subscription";
import { monthlySpendFromSubscription } from "@/lib/time";

export async function GET() {
  try {
    const [subscriptions, settings] = await Promise.all([
      prisma.subscription.findMany({
        orderBy: { nextCharge: "asc" }
      }),
      prisma.settings.findUnique({ where: { userId: "demo-user" } })
    ]);
    const monthlySpend = subscriptions.reduce(
      (total, sub) => total + monthlySpendFromSubscription(Number(sub.amount), sub.cycle as "weekly" | "monthly" | "yearly"),
      0
    );

    const response = {
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        amount: Number(sub.amount),
        currency: sub.currency,
        cycle: sub.cycle as "weekly" | "monthly" | "yearly",
        nextCharge: sub.nextCharge.toISOString()
      })),
      monthlySpend,
      token: settings?.calendarToken
    };

    const data = parse(subscriptionListSchema, response);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = parse(subscriptionCreateSchema, json);
    const subscription = await prisma.subscription.create({
      data: {
        name: payload.name,
        amount: payload.amount,
        currency: payload.currency,
        cycle: payload.cycle,
        nextCharge: new Date(payload.nextCharge),
        notes: payload.notes,
        user: {
          connectOrCreate: {
            where: { id: "demo-user" },
            create: {
              id: "demo-user",
              email: "demo@subsentinel.app",
              settings: {
                create: { timezone: "Asia/Bangkok" }
              }
            }
          }
        }
      }
    });
    return NextResponse.json({ success: true, data: { id: subscription.id } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}
