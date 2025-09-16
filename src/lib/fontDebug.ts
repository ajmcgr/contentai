// Runs as soon as imported (client-side)
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const search = new URLSearchParams(location.search);
  const FORCE = search.get("forceFont") === "1";

  // Helper: inject a style tag
  function injectStyle(id: string, css: string) {
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      el.setAttribute("data-reckless-debug", "1");
      document.head.appendChild(el);
    }
    el.textContent = css;
    return el;
  }

  // 1) If ?forceFont=1, apply a brutal override that should win no matter what
  if (FORCE) {
    injectStyle(
      "reckless-force",
      `
      :root, html, body, * {
        font-family: "RecklessLocal","Reckless", serif !important;
      }
      code, pre, kbd, samp {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace !important;
      }
    `
    );
  }

  // 2) After next paint, log computed font + try to locate the overriding rule
  requestAnimationFrame(() => {
    const target = document.querySelector("[data-font-target]") || document.body;
    const cs = getComputedStyle(target as Element);
    // eslint-disable-next-line no-console
    console.log("[RecklessDebug] target:", target);
    console.log("[RecklessDebug] computed fontFamily:", cs.fontFamily, "fontWeight:", cs.fontWeight, "fontStyle:", cs.fontStyle);

    // Hunt for global offenders (resets/next-font/etc.)
    const offenders: Array<{selector: string; cssText: string; href: string | null}> = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList | undefined;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        // @ts-ignore
        const st = rule.style as CSSStyleDeclaration | undefined;
        if (!st) continue;
        const hasFamily = !!(st.fontFamily || st.font);
        if (!hasFamily) continue;

        const sel = (rule as any).selectorText || "(at-rule)";
        const text = (rule as CSSStyleRule).cssText || "";
        const href = (sheet as CSSStyleSheet).href || null;
        // flag high-impact selectors
        if (/\b(html|body|\*)\b/.test(String(sel)) || /-apple-system-body/.test(text) || /var\(--font-/.test(text)) {
          offenders.push({ selector: String(sel), cssText: text.slice(0, 300), href });
        }
      }
    }
    console.log("[RecklessDebug] offenders (top likely):", offenders);
  });
})();