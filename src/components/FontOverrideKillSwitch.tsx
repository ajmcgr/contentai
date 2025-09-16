'use client';
import { useEffect, useState } from 'react';

export default function FontOverrideKillSwitch() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on) return;
    const style = document.createElement('style');
    style.setAttribute('data-reckless-kill', '1');
    style.textContent = `
      /* highest-specificity nuke: apply Reckless to everything */
      :where(html):not(.no-reckless) , :where(body):not(.no-reckless), :where(*) :where(*) {
        font-family: "Reckless", serif !important;
      }
      /* keep code/pre monospaced */
      code, pre, kbd, samp { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace !important; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [on]);

  return (
    <button
      onClick={() => setOn(v => !v)}
      style={{
        position:'fixed', bottom:12, left:12, zIndex:9999,
        background:on?'#0a0':'#000', color:'#fff',
        border:'none', borderRadius:8, padding:'8px 10px', fontSize:12,
      }}>
      {on ? 'Reckless ON (Kill Overrides)' : 'Force Reckless'}
    </button>
  );
}