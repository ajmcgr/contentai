import { supabase } from '@/integrations/supabase/client';

export async function logEvent(event: {
  userId?: string;
  provider?: 'shopify' | 'wix' | 'sys';
  stage: string;
  level?: 'info' | 'warn' | 'error';
  correlationId?: string;
  detail?: any;
}) {
  try {
    await supabase.from('app_logs').insert({
      user_id: event.userId || null,
      provider: event.provider || 'sys',
      stage: event.stage,
      level: event.level || 'info',
      correlation_id: event.correlationId || null,
      detail: event.detail ? JSON.stringify(event.detail).slice(0, 8000) : null
    });
  } catch (e) {
    // Fail silently to avoid logging loops
  }
}

export async function safeFetch(url: string, init: RequestInit, meta: {
  provider?: 'shopify' | 'wix' | 'sys';
  stage: string;
  correlationId?: string;
}) {
  const rid = meta?.correlationId || globalThis.crypto.randomUUID();
  const started = Date.now();
  
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    
    await logEvent({
      provider: meta.provider,
      stage: meta.stage,
      correlationId: rid,
      detail: {
        url,
        status: res.status,
        duration_ms: Date.now() - started,
        req_headers: init.headers,
        req_body: init.body && String(init.body).slice(0, 2000),
        res_body: text.slice(0, 4000)
      }
    });
    
    return { ok: res.ok, status: res.status, text, rid };
  } catch (error: any) {
    await logEvent({
      provider: meta.provider,
      stage: `${meta.stage}.error`,
      level: 'error',
      correlationId: rid,
      detail: {
        url,
        duration_ms: Date.now() - started,
        error: error.message
      }
    });
    
    throw error;
  }
}