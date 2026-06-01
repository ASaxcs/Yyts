# Vercel API Proxy 🔀

Proxy ringan berbasis **Vercel Edge Runtime** — IP rotating otomatis, bandwidth 100GB/bulan gratis.

---

## 🚀 Deploy ke Vercel

### Cara 1 — Via CLI
```bash
npm i -g vercel
vercel
```

### Cara 2 — Via GitHub
1. Push folder ini ke repo GitHub
2. Buka [vercel.com](https://vercel.com) → New Project → Import repo
3. Deploy (tanpa config tambahan)

---

## ⚙️ Environment Variables

Set di Vercel Dashboard → Settings → Environment Variables:

| Variable | Wajib | Keterangan |
|---|---|---|
| `PROXY_TOKEN` | Opsional | Token rahasia. Kalau diisi, semua request wajib kirim header `x-proxy-token` |
| `BLACKLIST_DOMAINS` | Opsional | Domain dilarang, pisah koma. Contoh: `localhost,127.0.0.1` |
| `CORS_ORIGIN` | Opsional | Origin CORS. Default `*` (semua) |

---

## 📡 Cara Pakai

### GET Request
```
GET https://proxy-kamu.vercel.app/api/proxy?url=https://httpbin.org/get
```

### POST Request
```bash
curl -X POST "https://proxy-kamu.vercel.app/api/proxy?url=https://httpbin.org/post" \
  -H "Content-Type: application/json" \
  -H "x-proxy-token: token_kamu" \
  -d '{"key": "value"}'
```

### Dari JavaScript / Bot
```js
const res = await fetch('https://proxy-kamu.vercel.app/api/proxy?url=https://api-target.com/data', {
  method: 'GET',
  headers: {
    'x-proxy-token': 'token_kamu'
  }
});
const data = await res.json();
```

---

## 📁 Struktur File

```
vercel-proxy/
├── api/
│   └── proxy.js      ← handler utama (Edge Runtime)
├── vercel.json        ← routing config
├── package.json
├── .env.example       ← contoh env vars
└── README.md
```

---

## ⚠️ Catatan

- Pakai untuk **proxy API aplikasimu sendiri**, bukan sebagai proxy internet umum (melanggar ToS Vercel)
- Kalau `PROXY_TOKEN` tidak diset, siapapun bisa pakai proxy kamu → bandwidth bisa habis
- Free tier Vercel: **100GB bandwidth** + **100k invocations/hari**
