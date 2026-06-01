/**
 * Vercel API Proxy
 * Usage: GET/POST /api/proxy?url=https://target.com/endpoint
 * Header: x-proxy-token: YOUR_SECRET_TOKEN (opsional, set di env)
 */

export const config = {
  runtime: 'edge', // pakai edge runtime → lebih cepat, IP rotating otomatis
};

// Header yang TIDAK diteruskan ke target (bisa di-custom)
const BLOCKED_REQ_HEADERS = [
  'host',
  'x-proxy-token',
  'x-forwarded-for',
  'x-vercel-id',
  'x-vercel-deployment-url',
  'x-vercel-forwarded-for',
  'cf-connecting-ip',
  'cf-ipcountry',
];

// Header dari response target yang TIDAK diteruskan balik ke client
const BLOCKED_RES_HEADERS = [
  'set-cookie', // uncomment kalau mau forward cookie: hapus baris ini
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
];

export default async function handler(req) {
  // ── CORS preflight ──────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // ── Auth token (opsional) ───────────────────────────────────────
  const SECRET = process.env.PROXY_TOKEN;
  if (SECRET) {
    const token =
      req.headers.get('x-proxy-token') ||
      new URL(req.url).searchParams.get('token');
    if (token !== SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  // ── Ambil target URL ────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return jsonResponse(
      { error: 'Parameter "url" wajib diisi', example: '/api/proxy?url=https://httpbin.org/get' },
      400
    );
  }

  // Validasi URL target
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return jsonResponse({ error: 'URL tidak valid' }, 400);
  }

  // Blacklist domain (opsional, tambah sesuai kebutuhan)
  const BLACKLIST = (process.env.BLACKLIST_DOMAINS || '').split(',').filter(Boolean);
  if (BLACKLIST.includes(parsedTarget.hostname)) {
    return jsonResponse({ error: 'Domain tidak diizinkan' }, 403);
  }

  // ── Forward request ─────────────────────────────────────────────
  // Salin headers dari request asal, buang yang di-block
  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (!BLOCKED_REQ_HEADERS.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  // Tambah query params lain (selain 'url' dan 'token') ke target URL
  const extraParams = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'url' && key !== 'token') {
      extraParams.append(key, value);
    }
  }
  const finalUrl =
    parsedTarget.toString() + (extraParams.toString() ? `&${extraParams}` : '');

  let targetResponse;
  try {
    targetResponse = await fetch(finalUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'follow',
    });
  } catch (err) {
    return jsonResponse({ error: 'Gagal menghubungi target', detail: err.message }, 502);
  }

  // ── Balik response ──────────────────────────────────────────────
  const resHeaders = new Headers();

  // Salin headers response, buang yang di-block
  for (const [key, value] of targetResponse.headers.entries()) {
    if (!BLOCKED_RES_HEADERS.includes(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  }

  // Tambah CORS headers
  for (const [key, value] of Object.entries(corsHeaders())) {
    resHeaders.set(key, value);
  }

  // Info tambahan (opsional, bisa dihapus)
  resHeaders.set('x-proxy-by', 'vercel-proxy');
  resHeaders.set('x-original-url', targetUrl);

  return new Response(targetResponse.body, {
    status: targetResponse.status,
    headers: resHeaders,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
