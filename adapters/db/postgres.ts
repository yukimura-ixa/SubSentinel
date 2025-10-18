import { prisma } from "@subsentinel/db";

export function getPrismaClient() {
  return prisma;
}

export async function ensureDemoUser() {
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@subsentinel.app",
      settings: { create: { timezone: "Asia/Bangkok", currency: "THB" } }
    }
  });
}
