import React from "react";
import ReactDOM from "react-dom/client";
import "./reactSanity"; // keep the sanity check
import AppWithProviders from "./safe/AppWithProviders";

const Root = () => (
  <div style={{ fontFamily: "system-ui", padding: 24 }}>
    <h1 style={{ fontSize: 28, marginBottom: 8 }}>🚀 Preview unblocked</h1>
    <p>SubscriptionProvider is a temporary NO-HOOK shim so the app can render.</p>
  </div>
);

/** Ensure there’s exactly one React root */
let container = document.getElementById("root");
if (!container) {
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
}

const anyContainer = container as any;
const existingRoot = anyContainer.__reactRoot as ReturnType<typeof ReactDOM.createRoot> | undefined;
const root = existingRoot ?? ReactDOM.createRoot(container!);
anyContainer.__reactRoot = root;

root.render(
  <React.StrictMode>
    <AppWithProviders>
      <Root />
    </AppWithProviders>
  </React.StrictMode>
);
