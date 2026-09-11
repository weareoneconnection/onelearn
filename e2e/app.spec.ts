import { expect, test } from "@playwright/test";

// Main flows in demo mode: no AI key and in-memory storage, so nothing here costs
// credits or touches real data.

test("home page shows today's mission and real (empty) mastery", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /你好/ })).toBeVisible();
  await expect(page.getByText("今日任务")).toBeVisible();
  await expect(page.getByText("0 个节点待复习")).toBeVisible();
});

test("legal pages render in Chinese and English", async ({ page }) => {
  for (const [path, zh, en] of [["/terms", "OneLearn 用户协议", "OneLearn Terms of Service"], ["/privacy", "OneLearn 隐私政策", "OneLearn Privacy Policy"], ["/refund", "OneLearn 退款规则", "OneLearn Refund Policy"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: zh })).toBeVisible();
    await expect(page.getByRole("heading", { name: en })).toBeVisible();
  }
});

test("user guide renders in both languages with working contents links", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /3 分钟上手指南/ }).click();
  await expect(page.getByRole("heading", { name: "OneLearn 使用手册" })).toBeVisible();
  await page.getByRole("link", { name: "套餐与 AI 点数" }).click();
  await expect(page.getByRole("heading", { name: "12. 套餐与 AI 点数" })).toBeInViewport();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "OneLearn User Guide" })).toBeVisible();
});

test("demo practice question can be answered", async ({ page }) => {
  await page.goto("/?view=practice");
  await expect(page.getByText("单项最佳答案")).toBeVisible();
  await page.getByRole("button", { name: /Schema 契约/ }).click();
  await page.getByRole("button", { name: "检查答案" }).click();
  await expect(page.getByText("回答正确")).toBeVisible();
});

test("feedback can be sent from the help button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "帮助与反馈" }).click();
  await page.getByPlaceholder(/请描述发生了什么/).fill("端到端测试：反馈提交流程");
  await page.getByRole("button", { name: "发送反馈" }).click();
  await expect(page.getByText("已收到，谢谢你")).toBeVisible();
});

test("bottom tab bar navigates on phones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The tab bar only exists on phone widths");
  await page.goto("/");
  const tabs = page.getByRole("navigation", { name: "主要导航" });
  await expect(tabs).toBeVisible();
  await tabs.getByRole("button", { name: /复习/ }).click();
  await expect(page.getByRole("heading", { name: "你的复习队列" })).toBeVisible();
  await tabs.getByRole("button", { name: /更多/ }).click();
  await expect(page.getByText("掌握证明").first()).toBeVisible();
});

test("page never scrolls sideways on phones", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone layout check");
  // Wait for rendered content rather than network idle: the auth script keeps a session poll open.
  for (const [path, marker] of [["/", "今日任务"], ["/?view=catalog", "ONELEARN COURSE UNIVERSE"], ["/?view=billing", "ONELEARN MEMBERSHIP"], ["/terms", "OneLearn 用户协议"]]) {
    await page.goto(path);
    await expect(page.getByText(marker).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("API guards reject unauthorized or invalid requests", async ({ request }) => {
  const device = { "x-onelearn-device-id": "e2e-device" };
  const workspace = await request.get("/api/workspace?locale=zh", { headers: device });
  expect(workspace.status()).toBe(200);
  expect((await workspace.json()).workspace.storage).toBe("ephemeral");
  expect((await request.get("/api/referral?locale=zh", { headers: device })).status()).toBe(401);
  expect((await request.get("/api/proof/share?locale=zh", { headers: device })).status()).toBe(401);
  expect((await request.get("/api/admin/metrics?locale=zh", { headers: device })).status()).toBe(403);
  expect((await request.post("/api/feedback", { headers: device, data: { locale: "zh", category: "bug", message: "hi" } })).status()).toBe(400);
  expect((await request.get("/api/cron/review-reminders")).status()).toBe(503);
  expect((await request.get("/api/email/unsubscribe?u=clerk:x&t=bad")).status()).toBe(400);
  expect((await request.post("/api/lesson", { headers: device, data: { locale: "zh", courseVersionId: "nope", lessonId: "l1" } })).status()).toBe(404);
});

test("unknown public proof links return 404", async ({ page }) => {
  const response = await page.goto("/p/doesnotexist12345");
  expect(response?.status()).toBe(404);
});
