import { test, expect } from "./fixtures.js";

test("login page can be visited", async ({ page }) => {
	await page.goto("/login");

	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("meets a11y requirements", async ({ axe, page }) => {
	await page.goto("/login");

	const { violations } = await axe.analyze();
	expect(violations).toHaveLength(0);
});
