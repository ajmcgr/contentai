import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './index.css'

// Sanity check: if React resolves wrong, fail fast with context
(async () => {
  const ReactNS = await import("react");
  if (!ReactNS || typeof ReactNS.useEffect !== "function" || typeof ReactNS.useState !== "function") {
    console.error("[React sanity check] Invalid React import:", ReactNS);
    throw new Error("React is not resolving correctly (hooks missing). Check duplicate React or Vite alias/external.");
  }
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
