import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pos-session',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const encoder = new TextEncoder();
const STORE_ID = 'default';

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

async function requireSession(request: Request, supabase: ReturnType<typeof createClient>) {
  const token = request.headers.get('x-pos-session') || '';
  if (!token) return false;

  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabase
    .from('pin_sessions')
    .select('id')
    .eq('token_hash', tokenHash)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return false;

  await supabase
    .from('pin_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return true;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'missing_server_config' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const isAllowed = await requireSession(request, supabase);
  if (!isAllowed) return json({ error: 'invalid_pin_session' }, 401);

  const body = await request.json().catch(() => ({}));
  if (body.method === 'GET') return json({ state: await loadState(supabase) });
  if (body.method === 'POST') {
    await saveState(supabase, body.state || {});
    return json({ success: true });
  }

  return json({ error: 'invalid_action' }, 400);
});

async function loadState(supabase: ReturnType<typeof createClient>) {
  const [
    settingsResult,
    categoriesResult,
    productsResult,
    sessionsResult,
    expensesResult,
    salesResult,
    itemsResult
  ] = await Promise.all([
    supabase.from('store_settings').select('key,value').eq('store_id', STORE_ID),
    supabase.from('categories').select('id,name').eq('store_id', STORE_ID).order('sort_order'),
    supabase.from('products').select('id,category_id,name,price').eq('store_id', STORE_ID).order('sort_order'),
    supabase.from('cash_sessions').select('id,opened_at,closed_at,opening_amount').eq('store_id', STORE_ID).order('opened_at', { ascending: false }),
    supabase.from('expenses').select('id,session_id,description,amount,created_at').eq('store_id', STORE_ID).order('created_at', { ascending: false }),
    supabase.from('sales').select('id,session_id,number,created_at,discount,payment_method,total,paid_amount,change_amount').eq('store_id', STORE_ID).order('created_at', { ascending: false }),
    supabase.from('sale_items').select('sale_id,product_id,name,price,quantity').eq('store_id', STORE_ID)
  ]);

  const itemsBySale = new Map<string, unknown[]>();
  for (const item of itemsResult.data || []) {
    const saleItems = itemsBySale.get(item.sale_id) || [];
    saleItems.push({
      productId: item.product_id,
      name: item.name,
      price: Number(item.price),
      quantity: item.quantity
    });
    itemsBySale.set(item.sale_id, saleItems);
  }

  return {
    settings: Object.fromEntries((settingsResult.data || []).map((row) => [row.key, row.value])),
    categories: (categoriesResult.data || []).map((row) => ({ id: row.id, name: row.name })),
    products: (productsResult.data || []).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      price: Number(row.price)
    })),
    cashSessions: (sessionsResult.data || []).map((row) => ({
      id: row.id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      openingAmount: Number(row.opening_amount)
    })),
    expenses: (expensesResult.data || []).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      description: row.description,
      amount: Number(row.amount),
      createdAt: row.created_at
    })),
    orders: (salesResult.data || []).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      number: row.number,
      createdAt: row.created_at,
      discount: Number(row.discount || 0),
      paymentMethod: row.payment_method,
      total: Number(row.total),
      paidAmount: row.paid_amount == null ? null : Number(row.paid_amount),
      change: row.change_amount == null ? null : Number(row.change_amount),
      items: itemsBySale.get(row.id) || []
    }))
  };
}

async function saveState(supabase: ReturnType<typeof createClient>, state: Record<string, unknown>) {
  const settings = state.settings && typeof state.settings === 'object' ? state.settings as Record<string, unknown> : {};
  const categories = Array.isArray(state.categories) ? state.categories as Record<string, unknown>[] : [];
  const products = Array.isArray(state.products) ? state.products as Record<string, unknown>[] : [];
  const sessions = Array.isArray(state.cashSessions) ? state.cashSessions as Record<string, unknown>[] : [];
  const expenses = Array.isArray(state.expenses) ? state.expenses as Record<string, unknown>[] : [];
  const orders = Array.isArray(state.orders) ? state.orders as Record<string, unknown>[] : [];

  await supabase.from('sale_items').delete().eq('store_id', STORE_ID);
  await supabase.from('sales').delete().eq('store_id', STORE_ID);
  await supabase.from('expenses').delete().eq('store_id', STORE_ID);
  await supabase.from('cash_sessions').delete().eq('store_id', STORE_ID);
  await supabase.from('products').delete().eq('store_id', STORE_ID);
  await supabase.from('categories').delete().eq('store_id', STORE_ID);
  await supabase.from('store_settings').delete().eq('store_id', STORE_ID);

  const settingRows = Object.entries(settings).map(([key, value]) => ({ store_id: STORE_ID, key, value }));
  if (settingRows.length) await supabase.from('store_settings').insert(settingRows);

  if (categories.length) {
    await supabase.from('categories').insert(categories.map((category, index) => ({
      store_id: STORE_ID,
      id: String(category.id),
      name: String(category.name || ''),
      sort_order: index
    })));
  }

  if (products.length) {
    await supabase.from('products').insert(products.map((product, index) => ({
      store_id: STORE_ID,
      id: String(product.id),
      category_id: String(product.categoryId),
      name: String(product.name || ''),
      price: Number(product.price || 0),
      sort_order: index
    })));
  }

  if (sessions.length) {
    await supabase.from('cash_sessions').insert(sessions.map((session) => ({
      store_id: STORE_ID,
      id: String(session.id),
      opened_at: String(session.openedAt),
      closed_at: session.closedAt ? String(session.closedAt) : null,
      opening_amount: Number(session.openingAmount || 0)
    })));
  }

  if (expenses.length) {
    await supabase.from('expenses').insert(expenses.map((expense) => ({
      store_id: STORE_ID,
      id: String(expense.id),
      session_id: expense.sessionId ? String(expense.sessionId) : null,
      description: String(expense.description || ''),
      amount: Number(expense.amount || 0),
      created_at: String(expense.createdAt)
    })));
  }

  if (orders.length) {
    await supabase.from('sales').insert(orders.map((order) => ({
      store_id: STORE_ID,
      id: String(order.id),
      session_id: order.sessionId ? String(order.sessionId) : null,
      number: Number(order.number || 0),
      created_at: String(order.createdAt),
      discount: Number(order.discount || 0),
      payment_method: String(order.paymentMethod || 'cash'),
      total: Number(order.total || 0),
      paid_amount: order.paidAmount == null ? null : Number(order.paidAmount),
      change_amount: order.change == null ? null : Number(order.change)
    })));

    const itemRows = orders.flatMap((order) => {
      const items = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
      return items.map((item) => ({
        store_id: STORE_ID,
        sale_id: String(order.id),
        product_id: item.productId ? String(item.productId) : null,
        name: String(item.name || ''),
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1)
      }));
    });

    if (itemRows.length) await supabase.from('sale_items').insert(itemRows);
  }
}
