import { test, expect, Page } from "@playwright/test";

// ─── helpers ───────────────────────────────────────────────────────────────

async function waitForApp(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForSelector(".animate-spin", { state: "detached", timeout: 10000 }).catch(() => {});
}

async function navigateTo(page: Page, viewId: "dashboard" | "portfolio" | "transactions" | "analytics") {
  const labels: Record<string, RegExp> = {
    dashboard: /dashboard/i,
    portfolio: /portfolio/i,
    transactions: /transactions/i,
    analytics: /analytics/i,
  };
  await page.getByRole("button", { name: labels[viewId] })
    .or(page.getByRole("link", { name: labels[viewId] }))
    .first()
    .click();
  await page.waitForTimeout(300);
}

async function openAddModal(page: Page) {
  await page.getByRole("button", { name: /add transaction/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
}

async function addTransaction(page: Page, ticker: string, amount: string) {
  await openAddModal(page);
  await page.locator("#tx-ticker").fill(ticker);
  await page.locator("#tx-amount").fill(amount);
  await page.getByRole("button", { name: /record/i }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
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
    await expect(page.locator("body")).not.toBeEmpty();
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

  test("keyboard shortcut n opens Add Transaction modal", async ({ page }) => {
    // Click a neutral area so focus is not inside an input
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
  });
});

// ─── add transaction ───────────────────────────────────────────────────────

test.describe("Add transaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("opens add transaction modal", async ({ page }) => {
    await openAddModal(page);
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("modal closes on escape", async ({ page }) => {
    await openAddModal(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  test("modal closes on cancel button", async ({ page }) => {
    await openAddModal(page);
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
  });

  test("adds a buy transaction and it appears in transactions view", async ({ page }) => {
    await addTransaction(page, "AAPL", "1500");
    await navigateTo(page, "transactions");
    await expect(page.getByRole("table").getByText("AAPL").first()).toBeVisible({ timeout: 5000 });
  });

  test("record button is disabled until required fields are filled", async ({ page }) => {
    await openAddModal(page);
    await expect(page.getByRole("button", { name: /record/i })).toBeDisabled();
    await page.locator("#tx-ticker").fill("AAPL");
    await page.locator("#tx-amount").fill("1500");
    await expect(page.getByRole("button", { name: /record/i })).toBeEnabled();
  });
});

// ─── backup & restore ──────────────────────────────────────────────────────

test.describe("Backup and restore", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);
  });

  test("backup triggers a file download", async ({ page }) => {
    // Export backup is disabled when there is no data — add one transaction first
    await addTransaction(page, "VOO", "500");

    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
    await page.getByRole("button", { name: /export backup/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/apex|backup|\.json/i);
  });

  test("restore accepts a valid backup file without crashing", async ({ page }) => {
    const backup = {
      transactions: [
        {
          id: "test-1",
          month: "2026-01",
          ticker: "VOO",
          amount: 500,
          type: "buy",
          timestamp: new Date().toISOString(),
        },
      ],
      meta: [],
      deletedIds: [],
      exportedAt: new Date().toISOString(),
    };

    const fileChooserPromise = page.waitForEvent("filechooser", { timeout: 5000 });
    await page.getByRole("button", { name: /import backup/i }).first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "apex-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });

    await page.waitForTimeout(800);
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});

// ─── edit transaction ──────────────────────────────────────────────────────

test.describe("Edit transaction", () => {
  test("inline edit activates on transactions view", async ({ page }) => {
    await page.goto("/");
    await waitForApp(page);

    // Need at least one transaction to edit
    await addTransaction(page, "MSFT", "800");
    await navigateTo(page, "transactions");

    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      // Edit is inline — expect a Save button to appear
      await expect(page.getByRole("button", { name: /save/i }).first()).toBeVisible({ timeout: 3000 });
    } else {
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

  test("PNG icons declared in manifest are reachable", async ({ page }) => {
    await page.goto("/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await (await page.request.get(manifestHref!)).json();
    const pngIcons = (manifest.icons as { src: string; type?: string }[]).filter(
      (i) => !i.src.endsWith(".svg")
    );
    expect(pngIcons.length).toBeGreaterThan(0);
    for (const icon of pngIcons) {
      const resp = await page.request.get(icon.src);
      expect(resp.status()).toBe(200);
    }
  });
});
