import { useEffect, useState } from "react";

interface HeadStatus { file: string; status: number | string; type: string | null }

const checkUrls = [
  "/fonts/reckless/Reckless-Regular.woff2",
  "/fonts/reckless/Reckless-Medium.woff2",
  "/fonts/reckless/Reckless-Bold.woff2",
];

export default function FontDebug() {
  const [forced, setForced] = useState<boolean>(false);
  const [heads, setHeads] = useState<HeadStatus[]>([]);
  const [checks, setChecks] = useState<{ ok400?: boolean; ok500?: boolean; ok700?: boolean }>({});
  const [computed, setComputed] = useState<{ family?: string; weight?: string }>({});

  useEffect(() => {
    // toggle body class
    document.body.classList.toggle("force-reckless", forced);
  }, [forced]);

  useEffect(() => {
    (async () => {
      const rows: HeadStatus[] = [];
      for (const u of checkUrls) {
        try {
          const r = await fetch(u, { method: "HEAD", cache: "no-store" });
          rows.push({ file: u.split("/").pop() || u, status: r.status, type: r.headers.get("content-type") });
        } catch (e) {
          rows.push({ file: u.split("/").pop() || u, status: "ERR", type: null });
        }
      }
      setHeads(rows);

      try { await (document.fonts as any)?.ready; } catch {}
      const ok400 = (document.fonts as any)?.check?.("400 16px \"Reckless\"") ?? false;
      const ok500 = (document.fonts as any)?.check?.("500 16px \"Reckless\"") ?? false;
      const ok700 = (document.fonts as any)?.check?.("700 16px \"Reckless\"") ?? false;
      setChecks({ ok400, ok500, ok700 });

      const el = document.querySelector("h1") || document.body;
      const cs = getComputedStyle(el as Element);
      setComputed({ family: cs.fontFamily, weight: cs.fontWeight });
    })();
  }, []);

  useEffect(() => {
    document.title = "Font Debug — Reckless";
  }, []);

  // Conflict detector: scans nested nodes inside headings for non-Reckless fonts
  useEffect(() => {
    const BOX_ID = 'heading-font-conflicts';
    const renderConflicts = () => {
      // cleanup any existing box
      document.getElementById(BOX_ID)?.remove();

      const hs = document.querySelectorAll('h1,h2,h3,h4,.h1,.h2,.h3,.h4,[data-typography="heading"],[data-heading]');
      const bad: Array<{ node: string; cls: string; fam: string; wt: string }> = [];
      hs.forEach((h) => {
        (h as Element).querySelectorAll('*').forEach((n) => {
          const cs = getComputedStyle(n as Element);
          if (!cs.fontFamily.includes('Reckless')) {
            bad.push({ node: (n as Element).tagName.toLowerCase(), cls: (n as Element).className as string, fam: cs.fontFamily, wt: cs.fontWeight });
          }
        });
      });

      if (bad.length) {
        const box = document.createElement('div');
        box.id = BOX_ID;
        box.style.cssText = 'position:fixed;right:12px;bottom:12px;max-width:360px;background:#111;color:#fff;padding:12px;border-radius:10px;font:12px/1.4 system-ui;z-index:99999;opacity:.95;overflow:auto;max-height:50vh';
        box.innerHTML = '<div style="font-weight:700;margin-bottom:6px">Heading Font Conflicts</div>'
          + bad.slice(0, 20).map(b => `<div><code>&lt;${b.node} class="${(b.cls||'').toString().slice(0,80)}"&gt;</code><br><small>${b.fam} • ${b.wt}</small></div>`).join('');
        if (bad.length > 20) box.innerHTML += `<div style="opacity:.7;margin-top:6px">(+${bad.length - 20} more)</div>`;
        document.body.appendChild(box);
      }
    };

    renderConflicts();
    return () => { document.getElementById(BOX_ID)?.remove(); };
  }, [forced]);

  return (
    <main className="container mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-reckless font-medium">Font Debug</h1>
        <p className="text-muted-foreground mt-2">Verify local Reckless fonts and heading weights.</p>
      </header>

      <section className="mb-6">
        <button
          className="px-4 py-2 rounded-md border bg-background hover:bg-accent"
          onClick={() => setForced((f) => !f)}
        >
          {forced ? "Disable" : "Enable"} Force Reckless
        </button>
        <p className="text-sm text-muted-foreground mt-2">Toggles body.force-reckless to hard-enforce Reckless 500 on headings.</p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="p-4 rounded-lg border">
          <h2 className="font-medium mb-3">HTTP Status (HEAD)</h2>
          <ul className="space-y-1 text-sm">
            {heads.map((r, i) => (
              <li key={i}>
                <code>{r.file}</code>: <b>{r.status}</b> <span className="text-muted-foreground">{r.type || ""}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="p-4 rounded-lg border">
          <h2 className="font-medium mb-3">document.fonts.check</h2>
          <ul className="space-y-1 text-sm">
            <li>400 Reckless: <b>{checks.ok400 ? "YES" : "NO"}</b></li>
            <li>500 Reckless: <b>{checks.ok500 ? "YES" : "NO"}</b></li>
            <li>700 Reckless: <b>{checks.ok700 ? "YES" : "NO"}</b></li>
          </ul>
          <div className="mt-3 text-sm">
            <div>H1 computed family: <code>{computed.family}</code></div>
            <div>H1 computed weight: <code>{computed.weight}</code></div>
          </div>
        </article>
      </section>

      <section className="mt-8">
        <h2 className="font-medium mb-2">Sample Headings</h2>
        <div className="space-y-2">
          <h1 className="text-4xl">Heading One</h1>
          <h2 className="text-3xl">Heading Two</h2>
          <h3 className="text-2xl">Heading Three</h3>
          <h4 className="text-xl">Heading Four</h4>
        </div>
      </section>
    </main>
  );
}
