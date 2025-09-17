import React from "react";
import ReactDOM from "react-dom/client";
import AppProviders from "./safe/AppProviders";
import App from "./App"; // ← your real app

// single-root mount (prevents double createRoot)
let container = document.getElementById("root");
if (!container) { container = document.createElement("div"); container.id = "root"; document.body.appendChild(container); }
const anyC = container as any;
const root = anyC.__reactRoot ?? ReactDOM.createRoot(container!);
anyC.__reactRoot = root;

root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);