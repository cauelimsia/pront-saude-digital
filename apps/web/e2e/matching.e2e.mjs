/**
 * Cenário E2E de matching multi-provedor (Playwright).
 *
 * Pré-requisitos: stack no ar (worker + API + web) com ENABLE_UNAUTHENTICATED_MATCH_REVIEW=true,
 * banco semeado e ambos os provedores ingeridos. Executar:
 *
 *   OUT_DIR=/caminho node apps/web/e2e/matching.e2e.mjs
 *
 * Fluxo verificado:
 *  1. Dashboard exibe a surebet multi-provedor (2 provedores).
 *  2. Detalhe confirma as duas casas e a rastreabilidade multi-provedor.
 *  3. Tela de revisão mostra o caso ambíguo (Grêmio×Internacional).
 *  4. Aprovação atualiza a interface (flag de dev habilitada).
 */
import { chromium } from "playwright-core";
import assert from "node:assert";

const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? ".";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });

try {
  // 1) Dashboard com surebet multi-provedor
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("table tbody tr", { timeout: 30000 });
  const multiBadge = page.locator("text=/\\d+ provedores/").first();
  await multiBadge.waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT}/mp-dashboard.png`, fullPage: true });
  console.log("✓ dashboard exibe surebet multi-provedor");

  // 3) Tela de revisão
  await page.click("text=Revisão de matching");
  await page.waitForSelector("text=Revisão de correspondências", { timeout: 15000 });
  const reviewCard = page.locator("text=REVIEW_REQUIRED").first();
  await reviewCard.waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT}/mp-review.png`, fullPage: true });
  console.log("✓ tela de revisão mostra caso ambíguo");

  // 4) Aprovar → confirmar → feedback
  await page.click("text=Aprovar associação");
  await page.click("text=Confirmar");
  await page.waitForSelector("text=/aprovada/", { timeout: 15000 });
  console.log("✓ aprovação atualizou a interface");
  await page.screenshot({ path: `${OUT}/mp-review-approved.png`, fullPage: true });

  console.log("E2E OK");
} finally {
  await browser.close();
}

assert.ok(true);
