// SPDX-License-Identifier: GPL-3.0-only

import { mount } from "svelte";
//import './app.css'
import App from "./App.svelte";

// 🐛 Trampa global de errores
declare global {
  interface Window {
    __PLAN_TREE_ERROR_HANDLER__?: (err: unknown) => void;
  }
}

const root = document.getElementById("app")!;
try {
  window.__PLAN_TREE_ERROR_HANDLER__ = (err: unknown) => {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    // Usar DOM API segura en vez de innerHTML para evitar XSS
    root.replaceChildren();
    const container = document.createElement("div");
    container.style.cssText =
      "background:#0f1115;color:#ef4444;padding:40px;font-family:monospace;white-space:pre-wrap";
    const strong = document.createElement("strong");
    strong.textContent = "Error:";
    container.append("❌ ", strong, "\n");
    const pre = document.createElement("div");
    pre.textContent = msg;
    container.appendChild(pre);
    root.appendChild(container);
  };
  window.onerror = (_event, _source, _line, _col, err) => {
    window.__PLAN_TREE_ERROR_HANDLER__?.(err);
  };
  window.onunhandledrejection = (event) => {
    window.__PLAN_TREE_ERROR_HANDLER__?.(event.reason);
  };
  mount(App, { target: root });
} catch (err) {
  window.__PLAN_TREE_ERROR_HANDLER__?.(err);
}
