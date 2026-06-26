import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pos-session',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const encoder = new TextEncoder();

async function sha256Hex(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ success: false }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const pinSalt = Deno.env.get('POS_PIN_SALT');
  const expectedPinHash = Deno.env.get('POS_PIN_HASH');
  const sessionDays = Number(Deno.env.get('POS_SESSION_DAYS') || '365');

  if (!supabaseUrl || !serviceRoleKey || !pinSalt || !expectedPinHash) {
    return json({ success: false, error: 'missing_server_config' }, 500);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipHash = await sha256Hex(`ip:${ip}`);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('pin_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('success', false)
    .gte('attempted_at', windowStart);

  if ((count || 0) >= 5) {
    return json({ success: false, locked: true }, 429);
  }

  const { pin } = await request.json().catch(() => ({ pin: '' }));
  const cleanPin = String(pin || '').replace(/\D/g, '').slice(0, 4);
  const receivedPinHash = await sha256Hex(`${pinSalt}:${cleanPin}`);
  const success = cleanPin.length === 4 && receivedPinHash === expectedPinHash;

  await supabase.from('pin_attempts').insert({ ip_hash: ipHash, success });

  if (!success) return json({ success: false });

  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('pin_sessions').insert({
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  return json({ success: true, token });
});
