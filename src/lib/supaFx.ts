const SB = 'https://hmrzmafwvhifjhsoizil.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcnptYWZ3dmhpZmpoc29pemlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3OTg0NDgsImV4cCI6MjA1MzM3NDQ0OH0.GxaTSbm_f0R85dRMshUboGQioj5wgzA2h06FDbAzvh8';

export async function callFx(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json');
  headers.set('apikey', ANON);
  headers.set('authorization', `Bearer ${ANON}`);
  const res = await fetch(`${SB}/functions/v1/${path}`, { ...init, headers });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, json: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, json: { raw: text } }; }
}