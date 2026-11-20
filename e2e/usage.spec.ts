import { expect, test } from "@playwright/test";

// The usage total is only for the token holder (the agent's daily check).
test("usage: without the token it's not found", async ({ request }) => {
  expect((await request.get("/api/usage")).status()).toBe(404);
  expect((await request.get("/api/usage", { headers: { authorization: "Bearer wrong" } })).status()).toBe(404);
});
