const html = `<!doctype html><meta charset="utf-8">
<title>Wix app installed</title>
<body style="font-family:system-ui;padding:24px">
  <h1>Wix app installed</h1>
  <p>You can close this tab.</p>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ provider:'wix', status:'installed' }, '*');
      }
    } catch(e){}
    setTimeout(function(){ window.close(); }, 800);
  </script>
</body>`;

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
});