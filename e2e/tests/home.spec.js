import { test, expect } from "./fixtures.js";

test("has title", async ({ page }) => {
	await page.goto("/");

	await expect(page).toHaveTitle(/CYFoverflow/);
});

test("shows the navbar with branding", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByText("CYFoverflow")).toBeVisible();
});

test("meets a11y requirements", async ({ axe, page }) => {
	await page.goto("/");

	const { violations } = await axe.analyze();
	expect(violations).toHaveLength(0);
});
