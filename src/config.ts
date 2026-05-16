import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-petition",
  description: "Collect signatures by QR — live count and signatures feed, no Change.org account",
  accentHex: "#16a34a",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
