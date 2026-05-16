# 🌿 Serenity — AI-Powered Mindfulness, Journaling & Habit Tracking

> Built for **Code Without Barriers Hackathon 2026** · Microsoft Azure Stack

Serenity is a web application that helps users build self-awareness, reflect intentionally, and form sustainable habits through natural, supportive AI interactions. It combines a multi-agent AI system with mindfulness exercises, a journaling space, and an intelligent habit board — all in one calm, beautifully designed interface.

You can view the completed project at this link: https://serenity-frontend-a3c5ewguhth7gfck.southeastasia-01.azurewebsites.net

---

## ✨ Features

| Feature | Description |
|---|---|
| **AI Chat** | Multi-agent system (Orchestrator, Mindfulness Coach, Journal Guide, Habit Coach, Insights Analyst, Memory Agent) powered by GPT-4.1-mini |
| **Journal** | Free-form and voice journaling with AI follow-up questions, mood analysis, emotion/theme tagging, and a timeline view |
| **Mindfulness** | Exercise library (8 exercises) with guided AI sessions, voice input/output, and journal-based recommendations |
| **Habit Board** | Create, track, and adapt habits with streaks, recurring schedules, AI reframing on misses, and automatic adaptation suggestions |
| **Insight Page** | Weekly/monthly/yearly AI-generated reports on mood trends, patterns, and personalised next steps |
| **Dashboard** | Daily mood check-in, today's habit focus, wearable-style body data, and an insight snippet |
| **Push Notifications** | Browser push notifications for habit reminders via Web Push API (VAPID) + Azure Function |
| **AI Voice** | Text-to-speech for all AI responses (Web Speech API) with voice, speed, and pitch customisation |
| **Voice Input** | Speech-to-text in journal editor, follow-up chat, and mindfulness sessions (Web Speech API) |
| **Settings** | Profile, reminders, mindfulness duration, voice preferences |
| **Responsive** | Desktop sidebar, tablet icon-only sidebar, mobile bottom navigation |

---

## 🏗 Architecture

```
Browser (React + Vite)
        │
        │  HTTPS — all requests
        ▼
Frontend App Service (Node/Express — server.js)
        │  resolves userId from /.auth/me (Easy Auth session)
        │  proxies /api/* with x-user-id header injected
        ▼
Backend App Service (Node/Express — src/app.js)
    ├── auth.js middleware — reads x-user-id / x-ms-client-principal-id
    ├── Routes → Controllers → Services → Repositories
    └── Agents (GPT-4.1-mini via Azure AI Foundry)
              │                │
              ▼                ▼
    Azure Cosmos DB     Azure AI Search

Azure Function App (serenity-functions)
    ├── midnightAutoMiss  — timer, runs at 00:00:01 UTC daily
    └── sendHabitReminders — timer, runs every minute, sends push via Web Push
```

### Multi-Agent System

| Agent | Responsibility |
|---|---|
| **Orchestrator** | Classifies intent (MINDFULNESS / JOURNAL / HABIT / CONVERSATION), routes to specialist |
| **Mindfulness Coach** | Guides breathing exercises, grounding, body scans — uses journal mood context |
| **Journaling & Reflection** | Generates prompts, analyses entries (emotions, themes, mood score), directs to Mindfulness page |
| **Habit Coach** | Conversational habit support, reframing on misses, adaptation suggestions |
| **Insights Analyst** | Generates structured weekly/monthly/yearly reports from journal summaries |
| **Memory Agent** | Updates user context (mood trend, goals, last session) after each conversation |

---

## 🗂 Project Structure

```
serenity-app/
├── .github/
│   └── workflows/
│       ├── main_serenity-backend.yml    ← deploys ./backend to serenity-backend App Service
│       ├── main_serenity-frontend.yml   ← builds Vite, zips with server.js, deploys to serenity-frontend
│       └── main_serenity-functions.yml  ← deploys ./backend/functions to serenity-functions Function App
│
├── backend/
│   ├── .env.example
│   ├── host.json                        ← Azure Functions host config (required at backend root)
│   ├── package.json
│   ├── functions/                       ← Azure Function App source
│   │   ├── host.json
│   │   ├── package.json
│   │   ├── midnightAutoMiss/
│   │   │   ├── function.json            ← timer: "0 1 0 * * *" (00:00:01 UTC daily)
│   │   │   └── index.js                 ← writes completed:false for missed habits
│   │   └── sendHabitReminders/
│   │       ├── function.json            ← timer: "0 0 * * * *" (every minute)
│   │       └── index.js                 ← sends Web Push notifications via VAPID
│   └── src/
│       ├── app.js                       ← Express entry point, route mounting
│       ├── config/index.js              ← Centralised env vars
│       ├── agents/                      ← LLM agent logic
│       │   ├── habitAgent.js
│       │   ├── insightsAgent.js
│       │   ├── journalAgent.js
│       │   ├── memoryAgent.js
│       │   ├── openaiClient.js
│       │   ├── orchestrator.js
│       │   └── prompts.js
│       ├── controllers/                 ← HTTP request/response handlers
│       │   ├── chatController.js
│       │   ├── habitController.js
│       │   ├── insightController.js
│       │   ├── journalController.js
│       │   ├── searchController.js
│       │   └── userController.js
│       ├── middleware/
│       │   ├── auth.js                  ← reads x-user-id / x-ms-client-principal-id / x-ms-client-principal
│       │   ├── errorHandler.js
│       │   ├── requestLogger.js
│       │   └── validate.js
│       ├── repositories/               ← Cosmos DB + AI Search data access
│       │   ├── cosmosClient.js
│       │   ├── habitRepository.js
│       │   ├── journalRepository.js
│       │   ├── searchRepository.js
│       │   └── userRepository.js
│       ├── routes/
│       │   ├── chat.js
│       │   ├── habits.js
│       │   ├── insights.js
│       │   ├── journal.js
│       │   ├── push.js                  ← POST /api/push/subscribe (saves Web Push subscription)
│       │   ├── search.js
│       │   └── users.js
│       └── services/
│           ├── habitService.js
│           ├── insightService.js
│           ├── journalService.js
│           ├── searchService.js
│           └── userService.js
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── server.js                        ← Production Node server: resolves Easy Auth identity,
    │                                      proxies /api/* to backend, serves Vite build
    ├── vite.config.js
    └── src/
        ├── App.jsx + App.css            ← Router, global notifications, TTS stop on nav
        ├── main.jsx                     ← React entry point, initAuthFromEasyAuth(), TTSProvider
        ├── index.css                    ← Design tokens, animations, responsive
        ├── context/
        │   └── TTSContext.jsx           ← Global text-to-speech state
        ├── hooks/
        │   ├── useApi.js
        │   ├── useChat.js
        │   ├── useTTS.js
        │   ├── useUser.js
        │   └── useVoiceInput.js
        ├── lib/
        │   ├── api.js                   ← All API calls; reads userId from localStorage
        │   ├── exercises.js
        │   ├── pushNotifications.js     ← registerServiceWorker, subscribeToPush (VAPID)
        │   └── wearable.js
        ├── components/
        │   ├── layout/
        │   │   ├── Layout.jsx           ← Sidebar + mobile bottom nav
        │   │   └── Layout.css
        │   └── ui/
        │       ├── AddHabitModal.jsx / .css
        │       ├── ChatPanel.jsx / .css
        │       ├── ConfirmModal.jsx / .css
        │       ├── HabitCard.jsx / .css
        │       └── MicButton.jsx / .css
        └── pages/
            ├── Dashboard.jsx / .css
            ├── HabitBoard.jsx / .css
            ├── Insight.jsx / .css
            ├── Journal.jsx / .css
            ├── Mindfulness.jsx / .css
            └── Settings.jsx / .css
```

---

## 🔧 Azure Resources Required

| Resource | Azure name | Purpose |
|---|---|---|
| **App Service** | `serenity-frontend` | Node 22, serves Vite build + proxies `/api/*` |
| **App Service** | `serenity-backend` | Node 22, Express REST API |
| **Function App** | `serenity-functions` | Node 22, timer functions |
| **Azure AI Foundry** | `serenity-agents-resource` | GPT-4.1-mini deployment |
| **Azure Cosmos DB** | `serenity-db` | Users, journals, habits, push subscriptions (NoSQL) |
| **Azure AI Search** | `serenity-search` | Semantic journal recall |

### Cosmos DB Containers

| Container | Partition Key | Description |
|---|---|---|
| `users` | `/userId` | Profile, preferences, memory context, streaks |
| `journals` | `/userId` | Journal entries with AI analysis |
| `habits` | `/userId` | Habits with check-in history and schedules |
| `pushSubscriptions` | `/userId` | Browser Web Push subscriptions |

### Azure AI Search Index (`journal-entries`)

Fields: `id` (key), `userId` (filterable), `text` (searchable), `emotions` (searchable + filterable), `themes` (searchable + filterable), `summary` (searchable + retrievable), `date` (sortable)

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 22+
- npm 9+
- An Azure account with the resources above provisioned

### 1. Clone and install

```bash
git clone https://github.com/Newweehub/serenity-app.git
cd serenity-app

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your Azure credentials:

```env
AZURE_COSMOS_ENDPOINT=https://serenity-db.documents.azure.com:443/
AZURE_COSMOS_KEY=<Cosmos DB → Keys → Primary Key>
COSMOS_DATABASE_NAME=serenity

AZURE_SEARCH_ENDPOINT=https://serenity-search.search.windows.net
AZURE_SEARCH_KEY=<AI Search → Keys → Admin Key 1>
AZURE_SEARCH_INDEX=journal-entries

AZURE_FOUNDRY_ENDPOINT=https://serenity-agents-resource.openai.azure.com
AZURE_FOUNDRY_API_KEY=<Foundry → Keys and Endpoint → Key 1>
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2024-12-01-preview

VAPID_EMAIL=mailto:your@email.com
VAPID_PUBLIC_KEY=<generate with: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from the same command>

PORT=3001
NODE_ENV=development
```

### 3. Run locally

Open two terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173, proxied to backend via vite.config.js)
cd frontend && npm run dev
```

### 4. Set your dev user ID

Open `http://localhost:5173`. The app shows a local login screen (the `DevLoginGate` component in `App.jsx`) — enter any name and a user ID (e.g. `user-001`). These are stored in `localStorage`. The backend reads `x-user-id` as the fallback when `x-ms-client-principal-id` is absent.

> **Note:** On Azure, Microsoft Entra ID (Easy Auth) handles identity automatically via `/.auth/login/aad`. The local login screen never appears in production.

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | Main AI chat (orchestrator routes internally) |
| `POST` | `/api/chat/journal` | Journal-only AI chat (always uses journal prompt) |
| `GET` | `/api/journal` | List journal entries (`?limit=&offset=`) |
| `POST` | `/api/journal` | Save entry + trigger AI analysis |
| `GET` | `/api/journal/prompt` | Generate a contextual journaling prompt (`?timeOfDay=`) |
| `GET` | `/api/journal/:id` | Get single entry |
| `GET` | `/api/habits` | List active habits |
| `POST` | `/api/habits` | Create a habit |
| `POST` | `/api/habits/suggest` | AI suggests a habit from natural language goal |
| `POST` | `/api/habits/:id/checkin` | Check in a habit (complete or miss); overwrites auto-missed entry if completing |
| `PATCH` | `/api/habits/:id` | Update habit (name, category, goal, schedule) |
| `PATCH` | `/api/habits/:id/status` | Archive / pause / reactivate a habit |
| `PATCH` | `/api/habits/:id/schedule` | Update habit schedule (day + time) |
| `GET` | `/api/insights` | Get insight report (`?period=week\|month\|year`) |
| `GET` | `/api/search` | Semantic search over journals (`?q=...&top=`) |
| `GET` | `/api/users/me` | Get or create current user profile |
| `PATCH` | `/api/users/me/preferences` | Update profile and preferences |
| `POST` | `/api/push/subscribe` | Save browser Web Push subscription |

---

## 🔐 Authentication

### Production (Azure App Service — Easy Auth)

Authentication is handled by **Azure App Service built-in authentication (Easy Auth)** on both App Services:

**Frontend App Service (`serenity-frontend`):**
- Easy Auth is set to **Require authentication**, unauthenticated action = `RedirectToLoginPage`
- `/api/*` is added to `excludedPaths` in `authsettingsV2` so API calls are not intercepted
- After login, Azure injects `x-ms-client-principal-id` on all requests reaching `server.js`
- `server.js` calls `/.auth/me` server-side to resolve the user's OID and display name, then injects `x-user-id` before proxying to the backend

**Backend App Service (`serenity-backend`):**
- Easy Auth is **disabled** — the backend is only called by the frontend proxy, not directly by browsers
- `auth.js` middleware reads identity from `x-ms-client-principal-id` (preferred), `x-ms-client-principal` (base64 decoded fallback), or `x-user-id`

**To enable Easy Auth on the frontend in the Azure portal:**
App Service → Settings → Authentication → Add provider → Microsoft → Require authentication → Save

**To set the `excludedPaths` (required — not available in the portal UI):**
```bash
az rest --method PATCH \
  --url "https://management.azure.com/subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Web/sites/serenity-frontend/config/authsettingsV2?api-version=2022-03-01" \
  --headers "Content-Type=application/json" \
  --body '{"properties":{"globalValidation":{"requireAuthentication":true,"unauthenticatedClientAction":"RedirectToLoginPage","excludedPaths":["/api"]}}}'
```

### Local development

The `DevLoginGate` component in `App.jsx` renders a simple form when `window.location.hostname === 'localhost'`. Submitting it stores `serenity_user_id` and `serenity_display_name` in `localStorage`. The backend `auth.js` reads `x-user-id` as the fallback identity source.

---

## ⚡ Azure Functions

Two timer-triggered functions run in the `serenity-functions` Function App:

| Function | Schedule | Purpose |
|---|---|---|
| `midnightAutoMiss` | `0 1 0 * * *` (00:00:01 UTC) | Writes `completed:false` check-ins for habits that had no entry yesterday |
| `sendHabitReminders` | `0 0 * * * *` (every minute) | Checks habit `targetTime` against current HH:MM, sends Web Push notifications |

**Required environment variables on the Function App** (in addition to the backend vars):

```
AZURE_COSMOS_ENDPOINT
AZURE_COSMOS_KEY
COSMOS_DATABASE_NAME
VAPID_EMAIL
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

Generate VAPID keys once:
```bash
npx web-push generate-vapid-keys
```

---

## 🚢 Deployment

Deployment is fully automated via GitHub Actions on push to `main`. Three workflows run in parallel:

| Workflow | Deploys | Runtime |
|---|---|---|
| `main_serenity-backend.yml` | `./backend` → `serenity-backend` App Service | Node 22 |
| `main_serenity-frontend.yml` | Vite build + `server.js` zip → `serenity-frontend` App Service | Node 20 |
| `main_serenity-functions.yml` | `./backend/functions` → `serenity-functions` Function App | Node 22 |

All three use **OIDC federated identity** (no stored secrets). Required GitHub secrets:

```
AZUREAPPSERVICE_CLIENTID_*
AZUREAPPSERVICE_TENANTID_*
AZUREAPPSERVICE_SUBSCRIPTIONID_*
AZURE_RESOURCE_GROUP
```

### Required App Settings per service

**serenity-backend:**
```
AZURE_COSMOS_ENDPOINT, AZURE_COSMOS_KEY, COSMOS_DATABASE_NAME
AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY, AZURE_SEARCH_INDEX
AZURE_FOUNDRY_ENDPOINT, AZURE_FOUNDRY_API_KEY
AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_API_VERSION
VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
PORT=8080, NODE_ENV=production
```

**serenity-frontend:**
```
BACKEND_URL=https://serenity-backend-<hash>.southeastasia-01.azurewebsites.net
PORT=8080, NODE_ENV=production
```

**serenity-functions:**
```
AZURE_COSMOS_ENDPOINT, AZURE_COSMOS_KEY, COSMOS_DATABASE_NAME
VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
```

---

## 🎤 Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---|---|---|---|---|
| AI Voice (TTS) | ✅ | ✅ | ✅ | ✅ |
| Voice Input (STT) | ✅ | ✅ | Partial | ❌ |
| Push Notifications | ✅ | ✅ | ✅ (iOS 16.4+) | ✅ |
| All other features | ✅ | ✅ | ✅ | ✅ |

> Voice input uses `SpeechRecognition` (Web Speech API). Chrome and Edge provide the best experience. The mic button is hidden on unsupported browsers.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Plain CSS with design tokens (no Tailwind) |
| Frontend server | Node.js 20, Express.js (ESM) — `server.js` |
| Backend | Node.js 22, Express.js (ESM) |
| AI / LLM | GPT-4.1-mini via Azure AI Foundry |
| Database | Azure Cosmos DB (NoSQL) |
| Search | Azure AI Search |
| Auth | Azure App Service Easy Auth (Microsoft Entra ID) |
| Push notifications | Web Push API (VAPID) + Azure Functions |
| Voice | Web Speech API (SpeechSynthesis + SpeechRecognition) |
| CI/CD | GitHub Actions (OIDC, no stored credentials) |

---

## 🏆 Hackathon

**Event:** Code Without Barriers Hackathon 2026
**Stack:** Microsoft Foundry, Azure AI Search, Azure Cosmos DB, Azure App Service, Azure Functions
**Team:** Serenity
