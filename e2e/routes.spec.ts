import { test, expect, Page } from "@playwright/test";

// ─── helpers ───────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  await page.waitForLoadState("networkidle");
  // App is ready when loading spinner is gone
  await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
}

async function navigateTo(page: Page, viewId: "dashboard" | "portfolio" | "transactions" | "analytics") {
  const labels: Record<string, RegExp> = {
    dashboard: /dashboard/i,
    portfolio: /portfolio/i,
    transactions: /transactions/i,
    analytics: /analytics/i,
  };
  await page.getByRole("link", { name: labels[viewId] })
    .or(page.getByRole("button", { name: labels[viewId] }))
    .first()
    .click();
  await page.waitForTimeout(300);
}

// ─── app boot ──────────────────────────────────────────────────────────────

test.describe("App boot", () => {
  test("loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await waitForApp(page);
    expect(errors.filter(e => !e.includes("favicon"))).toHaveLength(0);
  });

  test("renders dashboard view by default", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    // Dashboard should show portfolio metrics or empty state
    await expect(page.locator("body")).not.toBeEmpty();
    // No crash screen
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ─── navigation ────────────────────────────────────────────────────────────

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("navigates to Portfolio view", async ({ page }) => {
    await navigateTo(page, "portfolio");
    await expect(page.getByText(/portfolio/i).first()).toBeVisible();
  });

  test("navigates to Transactions view", async ({ page }) => {
    await navigateTo(page, "transactions");
    await expect(page.getByText(/transactions/i).first()).toBeVisible();
  });

  test("navigates to Analytics view", async ({ page }) => {
    await navigateTo(page, "analytics");
    await expect(page.getByText(/analytics/i).first()).toBeVisible();
  });

  // TODO(e2e): selector unverified against real modal markup — inspect DOM and re-enable
  test.fixme("keyboard shortcut n opens Add Transaction modal", async ({ page }) => {
    await page.keyboard.press("n");
    await expect(
      page.getByRole("dialog").or(page.getByText(/add transaction/i).first())
    ).toBeVisible({ timeout: 3000 });
  });
});

// ─── add transaction ───────────────────────────────────────────────────────

test.describe("Add transaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  async function openAddModal(page: Page) {
    // Try "+" button first, fall back to keyboard shortcut
    const addBtn = page.getByRole("button", { name: /add|new|\+/i }).first();
    if (await addBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await addBtn.click();
    } else {
      await page.keyboard.press("n");
    }
    await expect(
      page.getByRole("dialog").or(page.getByText(/add transaction/i))
    ).toBeVisible({ timeout: 3000 });
  }

  // TODO(e2e): add-button selector and modal role unverified — inspect DOM and re-enable
  test.fixme("opens add transaction modal", async ({ page }) => {
    await openAddModal(page);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  // TODO(e2e): depends on openAddModal() helper which uses unverified selectors
  test.fixme("modal closes on cancel/escape", async ({ page }) => {
    await openAddModal(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  // TODO(e2e): form-field selectors unverified against real markup
  test.fixme("adds a buy transaction and it appears in transactions view", async ({ page }) => {
    await openAddModal(page);

    // Fill in ticker
    const tickerInput = page.getByPlaceholder(/ticker|symbol/i).or(
      page.getByLabel(/ticker|symbol/i)
    ).first();
    await tickerInput.fill("AAPL");

    // Fill shares
    const sharesInput = page.getByPlaceholder(/shares|quantity/i).or(
      page.getByLabel(/shares|quantity/i)
    ).first();
    await sharesInput.fill("10");

    // Fill price
    const priceInput = page.getByPlaceholder(/price/i).or(
      page.getByLabel(/price/i)
    ).first();
    await priceInput.fill("150");

    // Submit
    const submitBtn = page.getByRole("button", { name: /add|save|submit|buy/i }).last();
    await submitBtn.click();

    // Check transaction appears
    await navigateTo(page, "transactions");
    await expect(page.getByText("AAPL")).toBeVisible({ timeout: 5000 });
  });
});

// ─── backup & restore ──────────────────────────────────────────────────────

test.describe("Backup and restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  // TODO(e2e): backup button location unverified — likely in a menu/settings area
  test.fixme("backup triggers a file download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });

    // Find backup button — may be in settings/menu
    const backupBtn = page.getByRole("button", { name: /backup|export/i }).first();
    if (await backupBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backupBtn.click();
    } else {
      // Try mobile nav settings area
      const settingsBtn = page.getByRole("button", { name: /settings|data/i }).first();
      await settingsBtn.click();
      await page.getByRole("button", { name: /backup|export/i }).first().click();
    }

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/apex|backup|\.json/i);
  });

  // TODO(e2e): file input is hidden behind a custom restore flow — inspect DOM
  test.fixme("restore accepts a valid backup file", async ({ page }) => {
    // Create a minimal valid backup
    const backup = {
      transactions: [],
      meta: {},
      deletedIds: [],
      exportedAt: new Date().toISOString(),
    };
    const backupJson = JSON.stringify(backup);

    // Find restore/import button
    const restoreBtn = page.getByRole("button", { name: /restore|import/i }).first();
    if (!(await restoreBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
      const settingsBtn = page.getByRole("button", { name: /settings|data/i }).first();
      await settingsBtn.click();
    }

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: "apex-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(backupJson),
    });

    // Should not crash — no error dialog
    await page.waitForTimeout(500);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ─── edit transaction ──────────────────────────────────────────────────────

test.describe("Edit transaction", () => {
  test("edit modal opens from transactions view", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
    await navigateTo(page, "transactions");

    // If there are transactions, click the first edit button
    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
    } else {
      // No transactions yet — skip gracefully
      test.skip();
    }
  });
});

// ─── PWA / install surface ─────────────────────────────────────────────────

test.describe("PWA metadata", () => {
  test("manifest is linked and loads", async ({ page }) => {
    await page.goto("/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBeTruthy();

    const manifestResp = await page.request.get(manifestHref!);
    expect(manifestResp.status()).toBe(200);
    const manifest = await manifestResp.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });
});
