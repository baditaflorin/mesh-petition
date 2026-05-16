import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("A signs → B sees 1 signature and alice's comment", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await a.getByPlaceholder("why you're signing (optional)").fill("important cause");
    await a.getByRole("button", { name: /sign petition/ }).click();

    await expect(b.locator(".viral-status").first()).toContainText("1");
    await expect(b.locator(".pe-list")).toContainText("alice");
    await expect(b.locator(".pe-list em")).toContainText("important cause");
  } finally {
    await cleanup();
  }
});
