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
