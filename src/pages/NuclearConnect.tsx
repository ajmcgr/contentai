import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function NuclearConnect() {
  const [searchParams] = useSearchParams();
  const userId = 'demo-user-id'; // Replace with real auth user id when available
  const [message, setMessage] = useState<string | null>(null);
  
  useEffect(() => {
    const error = searchParams.get('error');
    const err = searchParams.get('err');
    const connected = searchParams.get('connected');
    const shopify = searchParams.get('shopify');
    const wix = searchParams.get('wix');
    
    if (error) {
      setMessage(`❌ Error: ${error}`);
    } else if (err) {
      setMessage(`❌ Error: ${err}`);
    } else if (connected) {
      setMessage(`✅ ${connected} connected successfully!`);
    } else if (shopify === 'connected') {
      setMessage('✅ Shopify connected successfully!');
    } else if (wix === 'connected') {
      setMessage('✅ Wix connected successfully!');
    }
  }, [searchParams]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  
  return (
    <main style={{maxWidth: 560, margin: '40px auto', fontFamily: 'Inter, system-ui', padding: '0 20px'}}>
      <h1>Nuclear Connect (JS-free)</h1>
      <p>Use this page to force a full-page redirect into the OAuth flow.</p>

      {message && (
        <div style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          backgroundColor: message.startsWith('✅') ? '#d4edda' : '#f8d7da',
          color: message.startsWith('✅') ? '#155724' : '#721c24',
          border: `1px solid ${message.startsWith('✅') ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message}
          <button 
            onClick={() => setMessage(null)} 
            style={{marginLeft: 8, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer'}}
          >
            dismiss
          </button>
        </div>
      )}

      <section style={{marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 12}}>
        <h2>Shopify</h2>
        <form method="GET" action={`${supabaseUrl}/functions/v1/shopify-oauth-start`} style={{display:'flex', gap:8, marginTop:12}}>
          <input 
            name="shop" 
            placeholder="mystore.myshopify.com" 
            required
            style={{flex:1, padding:'10px 12px', border:'1px solid #ccc', borderRadius:8}} 
          />
          <input type="hidden" name="userId" value={userId}/>
          <button 
            type="submit" 
            style={{padding:'10px 14px', borderRadius:8, background:'#000', color:'#fff', border: 'none', cursor: 'pointer'}}
          >
            Connect → (HTML form)
          </button>
        </form>
        <p style={{marginTop:8, fontSize:12, color:'#666'}}>Must end with <code>.myshopify.com</code>.</p>
      </section>

      <section style={{marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 12}}>
        <h2>Wix</h2>
        <a 
          href={`${supabaseUrl}/functions/v1/wix-oauth-start?userId=${userId}`} 
          style={{display:'inline-block', padding:'10px 14px', borderRadius:8, background:'#000', color:'#fff', textDecoration: 'none'}}
        >
          Connect → (Plain anchor)
        </a>
        <p style={{marginTop:8, fontSize:12, color:'#666'}}>This is a normal link. If clicking doesn't navigate, the API is not reachable.</p>
      </section>

      <section style={{marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 12}}>
        <h2>API Ping</h2>
        <a 
          href={`${supabaseUrl}/functions/v1/ping`} 
          style={{display:'inline-block', padding:'8px 12px', border:'1px solid #ccc', borderRadius:8, textDecoration: 'none', color: '#000'}}
        >
          /functions/v1/ping
        </a>
        <p style={{marginTop:8, fontSize:12, color:'#666'}}>Should return <code>{`{ "ok": true, "where": "server" }`}</code>.</p>
      </section>

      <section style={{marginTop: 24, padding: 16, border: '1px solid #eee', borderRadius: 12}}>
        <h3 style={{marginTop: 0}}>Troubleshooting</h3>
        <ol style={{fontSize:12, color:'#666', paddingLeft: 20}}>
          <li>Make sure pop-up blockers are off (we use full-page redirect, not popup).</li>
          <li>Enter the full Shopify domain ending in <code>.myshopify.com</code>.</li>
          <li>On redirect hang, check DevTools → Console and Network for the last request.</li>
          <li>If buttons don't work, the Supabase functions may not be deployed or accessible.</li>
        </ol>
      </section>
    </main>
  );
}