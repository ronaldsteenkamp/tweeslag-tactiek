import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { branding } from "./config/branding";
import "./features/install/installPrompt";
import "./styles/global.css";

document.documentElement.style.setProperty(
  "--color-brand",
  branding.primaryColor,
);
document.documentElement.style.setProperty(
  "--color-on-brand",
  branding.onPrimaryColor,
);
document.documentElement.style.setProperty(
  "--color-focus",
  branding.primaryColor,
);

const root = document.getElementById("root");
if (!root) throw new Error("Element #root ontbreekt in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
