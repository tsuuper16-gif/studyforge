# StudyForge — Deploy to Vercel

A free, public AI study tool. Upload PDF notes → get flashcards, exam questions, and a Pomodoro timer with blurting mode.

Powered by **Groq** (free AI API) + **Vercel** (free hosting). Takes about 10 minutes to deploy.

---

## Step 1 — Get a free Groq API key

1. Go to https://console.groq.com
2. Sign up for a free account (no credit card needed)
3. Click **API Keys** in the sidebar → **Create API Key**
4. Copy the key — you'll need it in Step 3

---

## Step 2 — Deploy to Vercel

### Option A — Drag and drop (easiest, no Git needed)

1. Go to https://vercel.com and sign up for free
2. From your dashboard click **Add New → Project**
3. Choose **"Upload"** and drag this entire `studyforge` folder in
4. Click **Deploy**

### Option B — Via GitHub (recommended for updates)

1. Push this folder to a GitHub repo
2. Go to https://vercel.com → **Add New → Project**
3. Import your GitHub repo
4. Click **Deploy**

---

## Step 3 — Add your Groq API key

After deploying:

1. Go to your project in the Vercel dashboard
2. Click **Settings → Environment Variables**
3. Add a new variable:
   - **Name:** `GROQ_API_KEY`
   - **Value:** your key from Step 1
4. Click **Save**
5. Go to **Deployments** and click **Redeploy** (so the key takes effect)

---

## Done!

Your site is live at `https://your-project-name.vercel.app`

Share the URL with anyone — no setup needed on their end.

---

## Project structure

```
studyforge/
├── api/
│   └── generate.js     ← Serverless API proxy (keeps your key secret)
├── public/
│   └── index.html      ← The full study app
├── vercel.json         ← Routing config
└── README.md
```

## Changing the AI model

In `api/generate.js`, find this line:

```js
model: 'llama-3.1-8b-instant',
```

Other free Groq models you can use:
- `llama-3.3-70b-versatile` — smarter, slightly slower
- `mixtral-8x7b-32768` — good for longer notes
- `gemma2-9b-it` — fast and capable

Redeploy after any changes.
