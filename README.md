# 🌿 Serenity — AI-Powered Mindfulness, Journaling & Habit Tracking

> Built for **Code Without Barriers Hackathon 2026** · Microsoft Azure Stack

Serenity is a web application that helps users build self-awareness, reflect intentionally, and form sustainable habits through natural, supportive AI interactions. It combines a multi-agent AI system with mindfulness exercises, a journaling space, and an intelligent habit board — all in one calm, beautifully designed interface.

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
| **AI Voice** | Text-to-speech for all AI responses (Web Speech API) with voice, speed, and pitch customisation |
| **Voice Input** | Speech-to-text in journal editor, follow-up chat, and mindfulness sessions (Web Speech API) |
| **Settings** | Profile, reminders, mindfulness duration, voice preferences |
| **Responsive** | Desktop sidebar, tablet icon-only sidebar, mobile bottom navigation |

---

## 🏗 Architecture

```
Frontend (React + Vite)
        ↓  /api/*
Backend (Express.js)
    ├── Routes → Controllers → Services → Repositories
    └── Agents (GPT-4.1-mini via Azure AI Foundry)
              ↓              ↓
        Azure Cosmos DB   Azure AI Search
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
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js                    ← Express entry point
│       ├── config/index.js           ← Centralised env vars
│       ├── agents/                   ← LLM agent logic (7 files)
│       ├── controllers/              ← HTTP request/response (6 files)
│       ├── middleware/               ← Auth, error, validate, logger (4 files)
│       ├── repositories/             ← Cosmos DB + Search data access (5 files)
│       ├── routes/                   ← Express router definitions (6 files)
│       └── services/                 ← Business logic (5 files)
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    │   └── staticwebapp.config.json  ← Azure SWA auth config
    └── src/
        ├── App.jsx + App.css         ← Router, global notifications, TTS stop on nav
        ├── main.jsx                  ← React entry point + TTSProvider
        ├── index.css                 ← Design tokens, animations, responsive
        ├── context/
        │   └── TTSContext.jsx        ← Global text-to-speech state
        ├── hooks/                    ← useApi, useChat, useUser, useVoiceInput, useTTS
        ├── lib/                      ← api.js, exercises.js, wearable.js
        ├── components/
        │   ├── layout/               ← Layout.jsx (sidebar + mobile bottom nav)
        │   └── ui/                   ← ChatPanel, AddHabitModal, ConfirmModal, MicButton
        └── pages/                    ← Dashboard, Journal, Mindfulness, HabitBoard, Insight, Settings
```

---

## 🔧 Azure Resources Required

| Resource | Name used in dev | Purpose |
|---|---|---|
| **Azure AI Foundry** | `serenity-agents-resource` | GPT-4.1-mini deployment |
| **Azure Cosmos DB** | `serenity-db` | Users, journals, habits (NoSQL) |
| **Azure AI Search** | `serenity-search` | Semantic journal recall |
| **Azure Static Web Apps** | _(your deployment)_ | Frontend + auth |

### Cosmos DB Containers

| Container | Partition Key | Description |
|---|---|---|
| `users` | `/userId` | Profile, preferences, memory context, streaks |
| `journals` | `/userId` | Journal entries with AI analysis |
| `habits` | `/userId` | Habits with check-in history and schedules |

### Azure AI Search Index (`journal-entries`)

Fields: `id` (key), `userId` (filterable), `text` (searchable), `emotions` (searchable + filterable), `themes` (searchable + filterable), `summary` (searchable + retrievable), `date` (sortable)

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 20+
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
AZURE_COSMOS_KEY=<Cosmos DB > Keys > Primary Key>

AZURE_SEARCH_ENDPOINT=https://serenity-search.search.windows.net
AZURE_SEARCH_KEY=<AI Search > Keys > Admin Key 1>
AZURE_SEARCH_INDEX=journal-entries

AZURE_FOUNDRY_ENDPOINT=https://serenity-agents-resource.openai.azure.com
AZURE_FOUNDRY_API_KEY=<Foundry > Keys and Endpoint > Key 1>
AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
AZURE_OPENAI_API_VERSION=2024-12-01-preview

PORT=3001
NODE_ENV=development
```

### 3. Run locally

Open two terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

### 4. Set your dev user ID

Open `http://localhost:5173` in your browser. The app shows a local login screen — enter any name and a user ID (e.g. `user-001`). This simulates the Azure authentication that runs automatically in production.

> **Note:** On Azure Static Web Apps, Microsoft login handles identity automatically. The local login screen never appears in production.

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | Main AI chat (orchestrator routes internally) |
| `POST` | `/api/chat/journal` | Journal-only AI chat (always uses journal prompt) |
| `GET` | `/api/journal` | List journal entries |
| `POST` | `/api/journal` | Save entry + trigger AI analysis |
| `GET` | `/api/journal/prompt` | Generate a contextual journaling prompt |
| `GET` | `/api/journal/:id` | Get single entry |
| `GET` | `/api/habits` | List active habits |
| `POST` | `/api/habits` | Create a habit |
| `POST` | `/api/habits/suggest` | AI suggests a habit from natural language goal |
| `POST` | `/api/habits/:id/checkin` | Check in a habit (complete or miss) |
| `PATCH` | `/api/habits/:id` | Update habit (name, category, goal, schedule) |
| `PATCH` | `/api/habits/:id/status` | Archive / pause a habit |
| `PATCH` | `/api/habits/:id/schedule` | Update habit schedule (day + time) |
| `GET` | `/api/insights` | Get insight report (`?period=week\|month\|year`) |
| `GET` | `/api/search` | Semantic search over journals (`?q=...`) |
| `GET` | `/api/users/me` | Get or create current user profile |
| `PATCH` | `/api/users/me/preferences` | Update profile and preferences |

---

## 🔐 Authentication

**Production (Azure Static Web Apps):**
The `staticwebapp.config.json` in `/frontend/public` redirects all unauthenticated visitors to Microsoft login (`/.auth/login/aad`). After login, Azure injects `x-ms-client-principal-id` on every request. The backend's `auth.js` middleware reads this as the `userId`.

To enable in the Azure portal: Static Web App → Settings → Authentication → Add provider → Microsoft.

**Local development:**
A login gate component in `App.jsx` shows a simple form where you enter a name and user ID. These are stored in `localStorage`. The backend reads `x-user-id` header as the fallback.

---

## 🎤 Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---|---|---|---|---|
| AI Voice (TTS) | ✅ | ✅ | ✅ | ✅ |
| Voice Input (STT) | ✅ | ✅ | Partial | ❌ |
| All other features | ✅ | ✅ | ✅ | ✅ |

> Voice input uses `SpeechRecognition` (Web Speech API). Chrome and Edge provide the best experience. The mic button is hidden on unsupported browsers.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Styling | Plain CSS with design tokens (no Tailwind) |
| Backend | Node.js 20, Express.js (ESM) |
| AI / LLM | GPT-4.1-mini via Azure AI Foundry |
| Database | Azure Cosmos DB (NoSQL) |
| Search | Azure AI Search |
| Auth | Azure Static Web Apps built-in auth (Microsoft) |
| Voice | Web Speech API (SpeechSynthesis + SpeechRecognition) |

---

## 🏆 Hackathon

**Event:** Code Without Barriers Hackathon 2026
**Stack:** Microsoft Foundry, Azure AI Search, Azure Cosmos DB, Azure Static Web Apps
**Team:** Serenity
