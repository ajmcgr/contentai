import React from "react";
import ReactDOM from "react-dom/client";
import AppWithProviders from "./safe/AppWithProviders";

const Root = () => (
  <div style={{ fontFamily: "system-ui", padding: 24 }}>
    <h1 style={{ fontSize: 28, marginBottom: 8 }}>✅ Preview stable</h1>
    <p>No hook providers are running. You can build UI safely.</p>
  </div>
);

// Ensure #root exists
let container = document.getElementById("root");
if (!container) {
  container = document.createElement("div");
  container.id = "root";
  document.body.appendChild(container);
}

// Reuse or create exactly one root
const anyContainer = container as any;
const root = anyContainer.__reactRoot ?? ReactDOM.createRoot(container!);
anyContainer.__reactRoot = root;

root.render(
  <React.StrictMode>
    <AppWithProviders>
      <Root />
    </AppWithProviders>
  </React.StrictMode>
);