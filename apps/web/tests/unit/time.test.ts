import { describe, expect, it } from "vitest";
import { monthlySpendFromSubscription, nextChargeDate } from "@/lib/time";

describe("time helpers", () => {
  it("calculates next monthly charge in Bangkok TZ", () => {
    const current = new Date("2024-01-31T12:00:00Z");
    const next = nextChargeDate(current, "monthly");
    expect(next.getDate()).toBe(29);
    expect(next.getMonth()).toBe(1);
  });

  it("normalizes yearly spend", () => {
    expect(monthlySpendFromSubscription(1200, "yearly")).toBeCloseTo(100);
  });

  it("converts weekly spend", () => {
    expect(monthlySpendFromSubscription(10, "weekly")).toBeCloseTo((10 * 52) / 12);
  });
});
