'use client';
import { useEffect, useState } from 'react';

function scanFontRules() {
  const hits: any[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try { rules = (sheet as CSSStyleSheet).cssRules; } catch { continue; } // cross-origin stylesheet
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      // @media/@supports nesting
      // @ts-ignore
      const inner = (rule.cssRules && Array.from(rule.cssRules)) || [rule];
      for (const r of inner) {
        // @ts-ignore
        const st = (r as any).style as CSSStyleDeclaration | undefined;
        if (!st) continue;
        const ff = (st as any).fontFamily || '';
        const f = (st as any).font || '';
        if (ff || f) {
          // @ts-ignore
          hits.push({
            selector: ((r as any).selectorText || (r as any).parentRule?.conditionText || '(unknown)').toString().slice(0, 120),
            fontFamily: ff,
            font: f,
            source: ((sheet as CSSStyleSheet).href || 'inline <style>'),
          });
        }
      }
    }
  }
  return hits;
}

export default function FontOverrideAudit() {
  const [computed, setComputed] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const target = document.querySelector('[data-font-target]') || document.body;
    const cs = getComputedStyle(target as Element);
    setComputed({ family: cs.fontFamily, weight: cs.fontWeight, style: cs.fontStyle, target: (target as Element).tagName });
    setRules(scanFontRules());
  }, []);

  // Dev switch to force Reckless across the tree (proves it's cascade only)
  useEffect(() => {
    const id = 'reckless-force-style';
    const prev = document.getElementById(id);
    if (prev) prev.remove();
    if (!forced) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      :root, html, body, * { font-family: "RecklessLocal","Reckless", serif !important; }
      code, pre, kbd, samp { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace !important; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [forced]);

  return (
    <div style={{position:'fixed',bottom:10,left:10,zIndex:2147483647, background:'rgba(0,0,0,.85)',color:'#fff',padding:'10px 12px',borderRadius:10,fontSize:12,width:'min(92vw,720px)',maxHeight:'60vh',overflow:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
        <b>Font Override Audit</b>
        <button onClick={()=>setForced(v=>!v)} style={{background:forced?'#0a0':'#444',color:'#fff',border:'none',borderRadius:6,padding:'6px 8px'}}>
          {forced ? 'Forced Reckless ON' : 'Force Reckless'}
        </button>
      </div>
      <div style={{marginTop:6}}>
        <div>Computed (on <code>[data-font-target]</code> or <code>body</code>):</div>
        {computed && (
          <div style={{marginTop:4}}>
            family: <code>{computed.family}</code> • weight: <code>{computed.weight}</code> • style: <code>{computed.style}</code>
          </div>
        )}
      </div>
      <div style={{marginTop:10}}>
        <div><b>Rules that set font-family/font:</b></div>
        <div style={{fontFamily:'system-ui, -apple-system, Segoe UI',whiteSpace:'pre-wrap',wordBreak:'break-word',marginTop:6}}>
          {rules.map((r, i)=>(
            <div key={i} style={{borderTop:'1px solid #555',paddingTop:6,marginTop:6}}>
              <div>selector: <code>{r.selector}</code></div>
              {r.fontFamily && <div>font-family: <code>{r.fontFamily}</code></div>}
              {r.font && <div>font: <code>{r.font}</code></div>}
              <div>source: <code>{r.source}</code></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:10,opacity:.8}}>
        Tip: Add <code>data-font-target</code> to any element you want to inspect.
      </div>
    </div>
  );
}
