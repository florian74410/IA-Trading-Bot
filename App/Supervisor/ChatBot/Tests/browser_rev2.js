"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { start } = require("./ui_fixture");
async function main() {
  const { chromium } = require(
      process.env.IATB_PLAYWRIGHT_MODULE || "playwright",
    ),
    out = path.resolve(process.env.IATB_UI_REPORT_DIR || "artifacts/rev2-ui"),
    f = await start({ advanced: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.IATB_CHROMIUM_PATH
      ? { executablePath: process.env.IATB_CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  let checks = 0;
  const check = (a, m) => {
    assert(a, m);
    checks++;
  };
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 960 },
        locale: "fr-FR",
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (r) =>
      new URL(r.request().url()).origin === f.url ? r.continue() : r.abort(),
    );
    await page.goto(f.url);
    await page.locator(".iatbCompBot").click();
    const input = page.getByRole("textbox", {
      name: "Message au ChatBot IA-TB",
    });
    await input.fill(
      "Achète 50 USDT de BTC-USDT Spot Market Demo sur OKX compte okx-demo",
    );
    await input.press("Enter");
    const d = page.getByRole("dialog", {
        name: "Préparation financière détaillée",
      }),
      confirm = d.getByRole("button", { name: "Confirmer", exact: true }),
      ack = d.getByRole("checkbox");
    await d.waitFor();
    check(await confirm.isDisabled(), "Risk gate blocks initially");
    check(
      (await d.textContent()).includes("N/C"),
      "Missing values shown as N/C",
    );
    await confirm.evaluate((b) => b.click());
    check(
      f.stats().cancel_or_confirm_requests === 0,
      "No request without explicit risk acceptance",
    );
    await page.keyboard.press("Tab");
    check(
      await ack.evaluate((e) => e === document.activeElement),
      "Acknowledgement keyboard reachable",
    );
    await page.keyboard.press("Space");
    check(await ack.isChecked(), "Keyboard acceptance works");
    check(await confirm.isEnabled(), "Exact confirmation unlocked");
    await page.keyboard.press("Tab");
    check(
      await confirm.evaluate((e) => e === document.activeElement),
      "Confirmation keyboard reachable",
    );
    await page.screenshot({
      path: path.join(out, "risk-confirmation-desktop.png"),
      fullPage: true,
    });
    await confirm.click();
    await d
      .getByText("Exécution partielle fictive : 0.01 BTC.", { exact: true })
      .waitFor();
    check(
      f.stats().last_confirmation.acknowledge_warnings === true,
      "Acceptance travels with exact confirmation",
    );
    check(
      typeof f.stats().last_confirmation.digest === "string" &&
        f.stats().last_confirmation.digest.length === 64,
      "Exact digest submitted",
    );
    check(
      f.stats().cancel_or_confirm_requests === 1,
      "Exactly one confirmation",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    check((await d.boundingBox()).width <= 390, "Mobile dialog fits");
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "No horizontal overflow",
    );
    await page.screenshot({
      path: path.join(out, "partial-result-mobile.png"),
      fullPage: true,
    });
    check(errors.length === 0, errors.join(","));
    const result = {
      status: "PASS",
      checks,
      browser: await browser.version(),
      backend:
        "UI-only fixture; real Companion assets; financial authority covered by separate real-service E2E",
      real_orders: 0,
      external_requests: 0,
    };
    fs.writeFileSync(
      path.join(out, "advanced-ui.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
    await f.close();
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
module.exports = { main };
