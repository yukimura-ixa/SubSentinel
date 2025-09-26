import { expect, test } from "@playwright/test";

const demoSubscription = {
  name: "Test SaaS",
  amount: "99",
  currency: "THB",
  nextCharge: "2024-05-01"
};

test.describe("subscriptions and calendar feed", () => {
  test("user can add subscription and see event in calendar feed", async ({ page, request }) => {
    await page.goto("/subscriptions/new");
    await page.fill("input[name=\"name\"]", demoSubscription.name);
    await page.fill("input[name=\"amount\"]", demoSubscription.amount);
    await page.fill("input[name=\"currency\"]", demoSubscription.currency);
    await page.fill("input[name=\"nextCharge\"]", demoSubscription.nextCharge);
    await page.click("button[type=\"submit\"]");

    await expect(page).toHaveURL(/subscriptions/);

    const tokenResponse = await request.get("/api/subscriptions");
    const { data } = await tokenResponse.json();
    // Assumption: API returns token when subscription exists
    const feed = await request.get(`/calendar/${data.token}`);
    expect(feed.status()).toBe(200);
    const body = await feed.text();
    expect(body).toContain("VEVENT");
    expect(body).toContain("TRIGGER:-PT48H");
  });

  test("rotating token invalidates old feed", async ({ request }) => {
    const initial = await request.get("/api/subscriptions");
    const { data } = await initial.json();
    const oldToken = data.token;
    // rotate token by updating settings
    await request.patch("/api/subscriptions/demo", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ action: "rotate" })
    });
    const next = await request.get("/api/subscriptions");
    const { data: nextData } = await next.json();
    const newToken = nextData.token;
    expect(newToken).not.toEqual(oldToken);
    const oldFeed = await request.get(`/calendar/${oldToken}`);
    expect(oldFeed.status()).toBe(404);
  });
});
