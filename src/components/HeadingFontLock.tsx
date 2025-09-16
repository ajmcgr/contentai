'use client';
import { useEffect } from 'react';

const CSS = `
h1,h2,h3,h4,h5,h6,.font-heading{
  font-family:"RecklessLocal", serif !important;
}
.prose :where(h1,h2,h3,h4,h5,h6):not(:where([class~="not-prose"] *)){
  font-family:"RecklessLocal", serif !important;
}
`;

function injectInto(doc: Document) {
  const id = 'reckless-heading-lock';
  let tag = doc.getElementById(id) as HTMLStyleElement | null;
  if (!tag) {
    tag = doc.createElement('style');
    tag.id = id;
    doc.head.appendChild(tag);
  }
  tag.textContent = CSS;
}

export default function HeadingFontLock() {
  useEffect(() => {
    // main document
    injectInto(document);
    // any same-origin iframes (e.g., preview/editor canvases)
    for (const frame of Array.from(document.querySelectorAll('iframe'))) {
      try {
        if (frame.contentDocument) injectInto(frame.contentDocument);
      } catch { /* cross-origin iframe; skip */ }
    }
  }, []);
  return null;
}