// Fail fast if React imported in the browser is wrong.
import * as ReactNS from "react";

if (!ReactNS || typeof ReactNS.useEffect !== "function" || typeof ReactNS.useState !== "function") {
  // eslint-disable-next-line no-console
  console.error("[SafeBoot] Invalid React import:", ReactNS);
  throw new Error("React is not resolving correctly (hooks missing).");
}
