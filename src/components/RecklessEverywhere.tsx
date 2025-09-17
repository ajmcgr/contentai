'use client';
import { useEffect } from 'react';

const FACE = `
@font-face {
  font-family: "RecklessLocal";
  src: url("/fonts/reckless/Reckless-Regular.woff2") format("woff2"),
       url("/fonts/reckless/Reckless-Regular.woff") format("woff");
  font-weight: 400; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "RecklessLocal";
  src: url("/fonts/reckless/Reckless-Medium.woff2") format("woff2"),
       url("/fonts/reckless/Reckless-Medium.woff") format("woff");
  font-weight: 500; font-style: normal; font-display: swap;
}
@font-face {
  font-family: "RecklessLocal";
  src: url("/fonts/reckless/Reckless-Bold.woff2") format("woff2"),
       url("/fonts/reckless/Reckless-Bold.woff") format("woff");
  font-weight: 700; font-style: normal; font-display: swap;
}
`;

const HEADINGS = `
h1,h2,h3,h4,h5,h6,.font-heading {
  font-family: "RecklessLocal", serif !important;
}
h1,h2,h3,h4,h5,h6 { font-weight: 500 }
`;

function injectIntoDocument(doc: Document | ShadowRoot) {
  // font faces
  let a = (doc as Document).getElementById?.('reckless-face') as HTMLStyleElement | null;
  if (!a) {
    a = document.createElement('style');
    a.id = 'reckless-face';
    (doc as Document).head ? (doc as Document).head.appendChild(a) : (doc as ShadowRoot).appendChild(a);
  }
  a.textContent = FACE;

  // heading rules
  let b = (doc as Document).getElementById?.('reckless-headings') as HTMLStyleElement | null;
  if (!b) {
    b = document.createElement('style');
    b.id = 'reckless-headings';
    (doc as Document).head ? (doc as Document).head.appendChild(b) : (doc as ShadowRoot).appendChild(b);
  }
  b.textContent = HEADINGS;
}

function injectEverywhere() {
  // main document
  injectIntoDocument(document);

  // same-origin iframes
  document.querySelectorAll('iframe').forEach((f) => {
    const fr = f as HTMLIFrameElement;
    const onload = () => {
      try {
        if (fr.contentDocument) injectIntoDocument(fr.contentDocument);
      } catch { /* cross-origin; can't touch */ }
    };
    fr.addEventListener('load', onload, { once: false });
    // if already loaded
    onload();
  });

  // open shadow roots
  const walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
  const seen = new Set<ShadowRoot>();
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement & { shadowRoot?: ShadowRoot | null };
    if (el && el.shadowRoot && !seen.has(el.shadowRoot)) {
      try {
        injectIntoDocument(el.shadowRoot);
        seen.add(el.shadowRoot);
      } catch { /* some locked roots may throw */ }
    }
  }
}

export default function RecklessEverywhere() {
  useEffect(() => {
    injectEverywhere();

    // Re-inject after route transitions/mutations
    const mo = new MutationObserver(() => injectEverywhere());
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}