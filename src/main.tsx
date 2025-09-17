import React from "react";
import ReactDOM from "react-dom/client";
import "./reactSanity";
import AppWithProviders from "./safe/AppWithProviders";

const Root = () => (
  <div style={{ fontFamily: "system-ui", padding: 24 }}>
    <h1 style={{ fontSize: 28, marginBottom: 8 }}>🧪 Provider Bring-Up</h1>
    <p>React is mounted. Providers are enabled via <code>AppWithProviders</code>.</p>
    <ul>
      <li><b>SubscriptionProvider</b>: ON</li>
      <li><b>React Query</b>: ON</li>
    </ul>
    <p>Toggle flags in <code>src/safe/AppWithProviders.tsx</code> if something crashes.</p>
  </div>
);

let rootEl = document.getElementById("root");
if (!rootEl) { rootEl = document.createElement("div"); rootEl.id = "root"; document.body.appendChild(rootEl); }

ReactDOM.createRoot(rootEl!).render(
  <React.StrictMode>
    <AppWithProviders>
      <Root />
    </AppWithProviders>
  </React.StrictMode>
);
