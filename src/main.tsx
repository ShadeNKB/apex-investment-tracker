import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Persistent aria-live region for toast announcements
const liveRegion = document.createElement("div");
liveRegion.id = "apex-live";
liveRegion.setAttribute("aria-live", "polite");
liveRegion.setAttribute("aria-atomic", "true");
liveRegion.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
document.body.appendChild(liveRegion);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
