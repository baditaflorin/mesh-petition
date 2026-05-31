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

// Load-bearing reverse-direction assertion: the advertised core action is
// "collect signatures with a live count + signatures feed". This proves that
// when peer B signs, peer A's *live count* increments and the signature shows
// up in peer A's feed — the result of B's action is read on the opposite peer.
// Fails on any regression that breaks the Y.Map<peerId, Sig> propagation (e.g.
// signatures written to React useState instead of the shared doc); passes only
// when the CRDT genuinely crosses the mesh.
test("B signs → A's live count increments and the signature appears in A's feed", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Sanity: before B signs, A's header count is 0 and A's feed is empty.
    await expect(a.locator("header .viral-status").first()).toContainText("0 signatures");
    await expect(a.locator(".viral-empty")).toContainText("no signatures yet");

    // Peer B performs the advertised core action.
    await b.getByPlaceholder("your name").fill("bob");
    await b.getByPlaceholder("why you're signing (optional)").fill("save the park");
    await b.getByRole("button", { name: /sign petition/ }).click();

    // Peer A — the OPPOSITE peer — must see the live count tick to 1 and bob's
    // signature (with his comment) land in A's feed.
    await expect(a.locator("header .viral-status").first()).toContainText("1 signatures");
    await expect(a.locator(".pe-list")).toContainText("bob");
    await expect(a.locator(".pe-list em")).toContainText("save the park");
    // The signatures section header also carries the live count.
    await expect(a.getByText(/signatures \(1\)/)).toBeVisible();
  } finally {
    await cleanup();
  }
});
