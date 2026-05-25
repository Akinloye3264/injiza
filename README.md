# INJIZA — kwinjiza amafaranga / making income visible

AI-powered bookkeeping over USSD for Rwanda's informal micro-businesses.

---

## Project Structure

```
injiza/
├── backend/          Node.js + Express — Claude AI engine + USSD endpoint
│   ├── src/
│   │   ├── server.js   Express app, REST API, USSD callback
│   │   ├── claude.js   Anthropic API calls (parseEntry, weeklyInsight)
│   │   ├── ussd.js     USSD flow state machine
│   │   └── sessions.js In-memory session store
│   ├── .env            Your secrets (copy from .env.example)
│   └── package.json
│
└── frontend/         React 18 + Vite + TypeScript — web dashboard
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api.ts        callClaude() — the single AI engine
    │   ├── anim.ts       All anime.js helpers
    │   ├── types.ts      TypeScript interfaces
    │   ├── components/
    │   │   ├── SmsSkin.tsx   SMS/USSD phone mockup UI
    │   │   └── AppSkin.tsx   Smartphone dashboard UI
    │   └── styles/global.css
    ├── .env
    └── package.json
```

---

## Run Steps

### 1. Backend

```bash
cd backend
npm install
# Edit .env — add your Africa's Talking credentials
npm run dev
# → Running on http://localhost:3001
# → USSD callback: http://localhost:3001/ussd
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Africa's Talking USSD Setup

1. Log in to [Africa's Talking dashboard](https://account.africastalking.com)
2. Go to **USSD → Create Channel**
3. Set the **Callback URL** to:
   - **Local dev (ngrok):** `https://<your-ngrok-id>.ngrok.io/ussd`
   - **Production:** `https://your-domain.com/ussd`
4. To expose your local backend with ngrok:
   ```bash
   npx ngrok http 3001
   # Copy the https URL → paste into AT dashboard as callback
   ```
5. Add your `AT_API_KEY`, `AT_USERNAME`, and `AT_SHORTCODE` to `backend/.env`

### USSD Flow

```
Dial shortcode
  → Main menu (1. Record entry / 2. Today's profit / 3. Weekly insight / 4. Exit)
  → Option 1: type entry in Kinyarwanda/English → AI parses → shows profit + insight
  → Option 2: shows total profit + entry count
  → Option 3: AI generates weekly coaching sentence
```

---

## Environment Variables

### `backend/.env`
| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | Africa's Talking username |
| `AT_SHORTCODE` | Your USSD shortcode e.g. `*384*123#` |
| `PORT` | Server port (default 3001) |

### `frontend/.env`
| Variable | Description |
|---|---|
| `VITE_API_BASE` | Backend URL e.g. `http://localhost:3001` |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ussd` | Africa's Talking USSD callback |
| `POST` | `/api/parse` | Parse a bookkeeping entry via Claude |
| `POST` | `/api/weekly-insight` | Generate weekly coaching insight |
| `GET` | `/health` | Health check |

---

## Security Note

The Anthropic API key lives **only in the backend**. The frontend never touches it — all AI calls are proxied through `/api/*`. Never commit `.env` files to version control.
