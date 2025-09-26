import { describe, expect, it } from "vitest";
import { buildIcs } from "@/lib/ics";

describe("buildIcs", () => {
  it("generates RFC5545 compliant event with alarm", () => {
    const { body, etag } = buildIcs(
      [
        {
          id: "evt1",
          name: "Netflix Renewal",
          description: "THB 419",
          start: new Date("2024-04-01T08:00:00Z"),
          end: new Date("2024-04-01T09:00:00Z")
        }
      ],
      { calendarName: "Subsentinel", updatedAt: new Date("2024-03-01T00:00:00Z") }
    );

    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("UID:evt1@subsentinel.app");
    expect(body).toContain("TRIGGER:-PT48H");
    expect(body).toContain("PRODID:-//Subsentinel//Subscription Sentinel//EN");
    expect(etag).toHaveLength(64);
  });
});
