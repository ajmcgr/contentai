import React from "react";
import ReactDOM from "react-dom/client";
import "./reactSanity";

// mount a bare-minimum app (no providers)
const Root = () => (
  <div style={{ fontFamily: "system-ui", padding: 24 }}>
    <h1 style={{ fontSize: 28, marginBottom: 8 }}>✅ It boots!</h1>
    <p>If you can see this, React mounted successfully in Lovable.</p>
    <p>Next step: re-enable your providers one-by-one to find the crash.</p>
    <details style={{ marginTop: 12 }}>
      <summary>Debug</summary>
      <pre id="safe-debug" />
    </details>
  </div>
);

// ensure #root exists even if index.html was odd
let rootEl = document.getElementById("root");
if (!rootEl) {
  rootEl = document.createElement("div");
  rootEl.id = "root";
  document.body.appendChild(rootEl);
}

ReactDOM.createRoot(rootEl!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// tiny debug: print React version + hook availability
import("react").then((m: any) => {
  const el = document.getElementById("safe-debug");
  if (el) {
    el.textContent = JSON.stringify(
      { reactVersion: m?.version, hasUseState: !!m?.useState, hasUseEffect: !!m?.useEffect, ua: navigator.userAgent },
      null, 2
    );
  }
});
