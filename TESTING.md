# 🧪 Testing Guide — Serenity

This document covers how to manually test every feature of Serenity, plus what to check in the browser console and what correct behaviour looks like.

---

## Before You Start

Make sure both servers are running:

```bash
# Terminal 1 — Backend (port 3001)
cd backend && npm run dev
# Should print: 🌿 Serenity backend running on port 3001
#               Health: http://localhost:3001/health

# Terminal 2 — Frontend (port 5173, Vite dev server proxies /api/* to port 3001)
cd frontend && npm run dev
# Should print: Local: http://localhost:5173
```

Open `http://localhost:5173` in **Chrome or Edge** (required for voice features).

---

## 1 — Local Login

**What to do:**
1. Open `http://localhost:5173`
2. You should see the Serenity login screen (`DevLoginGate`) with two fields: name and user ID
3. Enter any name (e.g. `Mia`) and a user ID (e.g. `user-001`)
4. Click **Enter Serenity**

**Expected result:**
- You land on the Dashboard page
- The sidebar shows your name at the bottom
- Browser console shows no errors
- `localStorage` has `serenity_user_id` and `serenity_display_name` set

**To test multiple users:**
- Open a second browser tab in incognito mode
- Enter a different user ID (e.g. `user-002`)
- Both users have separate journal entries, habits, and profiles

> **Note:** This login screen only appears on `localhost`. On Azure, Microsoft Entra ID (Easy Auth) handles authentication automatically via `/.auth/login/aad`. The `DevLoginGate` component is completely bypassed in production.

---

## 2 — Production Authentication (Azure)

**What to do:**
1. Open the frontend App Service URL in your browser
2. You should be redirected to Microsoft login (`login.microsoftonline.com`)
3. Log in with your Microsoft account
4. You should land on the Dashboard

**Expected result:**
- After login, the browser has an `AppServiceAuthSession` cookie
- `/.auth/me` returns your user identity (OID, display name, claims)
- `localStorage` has `serenity_user_id` (your OID) and `serenity_display_name` populated by `initAuthFromEasyAuth()`
- All `/api/*` calls return 200 (not 401)

**To verify identity resolution in DevTools:**
- Open DevTools → Console
- Run `localStorage.getItem('serenity_user_id')` — should return your OID (a GUID)
- Run `fetch('/.auth/me').then(r=>r.json()).then(console.log)` — should return your claims

**To verify the proxy is forwarding correctly:**
- Visit `https://<frontend-url>/api/debug-proxy`
- Should return JSON with `resolvedIdentity.userId` matching your OID

---

## 3 — Dashboard

**What to do:**
1. Click one of the mood emoji buttons (😔 😕 😐 🙂 😊)
2. Observe the stats row (journal streak, mindfulness streak, habits today, mood trend)
3. Check the "Today's focus" section

**Expected result:**
- Tapping a mood emoji saves a journal entry silently and shows a confirmation message
- Stats cards are clickable — each navigates to the relevant page
- "Today's focus" shows only habits scheduled for today (or every day), sorted by time
- The mood trend shows 📈 📉 or 〰️
- The wearable data card shows steps, heart rate, sleep, and stress
- Clicking the wearable suggestion navigates to the correct mindfulness exercise
- The insight snippet pulls from this week's report

---

## 4 — Journal

### 4a — Writing an entry

**What to do:**
1. Navigate to **Journal**
2. Read the AI-generated prompt at the top
3. Type a journal entry of at least 3–4 sentences describing how you feel
4. Click **Save & Reflect**

**Expected result:**
- After saving, the reflection section appears with:
  - Emotion and theme tags (e.g. "anxious", "work")
  - A reflective question from Serenity
  - If emotions suggest stress, a "Recommended exercise" button appears linking to Mindfulness

### 4b — AI follow-up chat

**What to do:**
1. After saving an entry, type a reply in the follow-up input
2. Try: "I feel like I should exercise more"

**Expected result:**
- Serenity responds with a reflective question (not an exercise guide)
- If you mention stress, Serenity says something like "Head to the Mindfulness page" rather than guiding the exercise inline
- The 🔇/🔈/🔊 voice toggle appears above the chat — click it to enable AI voice

### 4c — Voice journaling

**What to do:**
1. Click the 🎙 microphone button next to the journal editor
2. Speak a few sentences
3. Watch the text appear in the editor

**Expected result:**
- Button pulses red while recording
- Interim text appears as a small pill next to the button
- Final text appends to the editor field

### 4d — Timeline view

**What to do:**
1. Click the **Timeline** tab
2. Click on any past entry

**Expected result:**
- Entries are grouped by date: "Today", "Yesterday", then formatted dates
- Clicking an entry opens a modal showing the full text, AI reflection, and tags
- Dates reflect your local timezone (not UTC)

---

## 5 — Mindfulness

### 5a — Exercise library

**What to do:**
1. Navigate to **Mindfulness**
2. If you have journal entries, look for the "Recommended for you" section
3. Use the filter chips (breathing, grounding, body scan, reflection)
4. Click **Start →** on any exercise

**Expected result:**
- Recommended section appears if journal entries suggest exercises
- Filter chips correctly narrow the library
- Clicking Start opens the session view with steps overview

### 5b — Guided session

**What to do:**
1. Start the **4-7-8 Breathing** exercise
2. Wait for Serenity's opening message
3. Enable voice with the 🔇 toggle
4. Type or speak a reply

**Expected result:**
- Serenity greets you and references your recent mood if journal entries exist
- AI voice reads the response aloud when enabled
- Mic button works in the session input
- Clicking back returns to the library without navigating to another page

### 5c — Add to Habit Board from Mindfulness

**What to do:**
1. Click **+ Add to Habit Board** during or after a session
2. Adjust the day and time in the modal
3. Click **Add habit**

**Expected result:**
- Modal pre-fills with the exercise name and "mindfulness" category
- Duplicate check warns if same exercise is already scheduled at the same time
- Same exercise can be added with a different day or time without error
- After saving, the exercise appears on the Habit Board page

### 5d — Navigate back from Habit Board exercise

**What to do:**
1. On Habit Board, click **◌ Go to exercise →** on a mindfulness habit
2. Complete the session
3. Click **✓ Done — mark habit complete**

**Expected result:**
- You are taken directly to the correct exercise (not the library home)
- After clicking Done, you are navigated back to Habit Board
- The habit is automatically marked as done for today

---

## 6 — Habit Board

### 6a — Adding a habit (AI suggestion)

**What to do:**
1. Click **+ Add habit**
2. Type: "I want to sleep better"
3. Click **Suggest**

**Expected result:**
- AI returns a habit name, category, suggested day/time, and a reason
- A modal appears pre-filled with these defaults
- You can adjust the day and time before saving
- Duplicate warning appears if same habit+schedule already exists

### 6b — Adding a habit (manually)

**What to do:**
1. Click **+ Add habit** → **+ Add manually**
2. Fill in a name, category, and schedule
3. Click **Add habit**

**Expected result:**
- New habit appears at the top of the grid
- The weekly calendar updates to show it on the correct day column

### 6c — Checking in (Done)

**What to do:**
1. Click **✓ Done** on any habit

**Expected result:**
- A confirmation modal appears: "Mark as done?"
- After confirming, the button is replaced by a green "✓ Completed today" badge
- The streak counter increments
- The streak bar grows
- **Refreshing the page or navigating away and back still shows "Completed today"** — the check-in is persisted in Cosmos DB
- You cannot click Done again for the same habit today

**To verify persistence in DevTools:**
- Open Console → run `await fetch('/api/habits').then(r=>r.json())`
- Find the habit — `checkIns[0]` should have today's date and `completed: true`

> **Note:** If a habit was auto-missed by the Azure Function (`completed: false`) before you clicked Done, the backend overwrites the miss with the completion. This is intentional — you can always mark a habit done even if it was auto-missed.

### 6d — Missing a habit

**What to do:**
1. Click **I missed it today** (small link below Done)

**Expected result:**
- A reframing message appears (warm, non-judgmental)
- After 2+ consecutive misses, an AI adaptation suggestion card appears automatically
- The suggestion includes a new habit name, time, and reason

### 6e — Accepting an adaptation

**What to do:**
1. When a suggestion card appears, click **✏ Adapt this habit**
2. Review the pre-filled modal
3. Click **Add habit**

**Expected result:**
- The existing habit is updated in place (not a new one created)
- The suggestion card disappears
- For 3 days, no new suggestion appears for this habit even if misses continue (suppression)
- After 3 days, if misses resume, a new suggestion may appear

### 6f — Schedule editing

**What to do:**
1. Click the schedule display (e.g. "📅 Set recurring schedule") on any habit card
2. Change the day and time
3. Click **Save**

**Expected result:**
- The schedule display updates to show "🔔 Every Monday at 8:00 AM" format
- The weekly calendar updates to reflect the new day

### 6g — Weekly calendar

**What to do:**
1. Look at the calendar at the top of the Habit Board
2. Click any event chip

**Expected result:**
- Events are sorted by time within each day column
- Long habit names wrap to a new line (not truncated)
- Clicking an event smoothly scrolls to that habit card and highlights it with a green ring
- Today's column header has a dark green background

### 6h — In-app notifications (browser)

**What to do:**
1. Set a habit's reminder time to 2 minutes from now
2. Wait on any page

**Expected result:**
- A toast notification appears in the top-right corner (bottom on mobile)
- It shows "Time for '[habit name]'! 🌿"
- Clicking it navigates to Habit Board and scrolls to that habit
- The notification does not repeat if you stay on the page

---

## 7 — Push Notifications (Azure only)

Push notifications are sent by the `sendHabitReminders` Azure Function and require HTTPS (not available on localhost).

**What to do:**
1. On Azure, navigate to **Settings**
2. Click **Enable push notifications** and allow when the browser prompts
3. Set a habit's reminder time to 2–3 minutes from now
4. Lock your screen or switch to another tab

**Expected result:**
- At the habit's `targetTime`, the browser shows a system push notification: "Time for '[habit name]'! 🌿"
- Clicking the notification opens the app and navigates to Habit Board

**To verify the subscription was saved:**
- DevTools → Console → run `await fetch('/api/push/subscribe', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({subscription: null})}).then(r=>r.json())`
- Should return `{error: "No subscription"}` (400) — meaning the route is reachable

**To manually trigger the function (Azure portal):**
1. Go to **serenity-functions → midnightAutoMiss or sendHabitReminders → Code + Test → Test/Run**
2. Click **Run** and watch the log output

---

## 8 — Insight Page

**What to do:**
1. Navigate to **Insight**
2. Switch between **This week**, **This month**, **This year**

**Expected result:**
- Each period generates a report with: headline, mood trend (📈 〰️ 📉), top emotions, habit highlight, and patterns
- The encouragement card changes based on mood trend (improving / stable / declining)
- The suggestion card has a "+ Try this — add to Habit Board" button
- Clicking it opens the AddHabitModal pre-filled with the suggestion

---

## 9 — Settings

**What to do:**
1. Navigate to **Settings** (⚙ in sidebar or avatar click)
2. Change your display name
3. Adjust the daily reminder time
4. Click **Save changes**
5. Navigate away and return to Settings

**Expected result:**
- Your name updates in the sidebar immediately after saving
- Returning to Settings shows the saved values (not defaults)
- The greeting on Dashboard updates to your new name

**Voice settings:**
1. Scroll to the **AI Voice** section
2. Select a different voice from the dropdown
3. Change the speed slider
4. Open a chat panel and enable voice — responses use the new settings

**Sign out (localhost):**
1. Click **Sign out** in the Account section
2. `localStorage` is cleared and the `DevLoginGate` screen appears

**Sign out (Azure):**
1. Click **Sign out**
2. Redirected to `/.auth/logout` → Microsoft logout page

---

## 10 — Voice (TTS)

**What to do:**
1. Open any chat panel (Mindfulness session or Journal follow-up)
2. Click the 🔇 toggle to enable voice
3. Send a message and wait for the AI response

**Expected result:**
- The toggle shows 🔊 and "Speaking…" while the AI reads its response
- Navigating to another page stops the speech immediately
- The voice reflects settings from the Settings page (speed, pitch, voice)

---

## 11 — Responsive / Mobile

**What to do:**
1. Open Chrome DevTools (F12) → Toggle device toolbar
2. Select **iPhone 14** or set width to 390px
3. Navigate through all pages

**Expected result:**
- Sidebar is replaced by: green top bar (logo + avatar) + bottom navigation bar
- Bottom nav shows all 6 pages with icon and label
- Habit grid stacks to one column
- Calendar scrolls horizontally if needed
- Toast notifications appear above the bottom nav
- Tap targets are large enough to use comfortably

---

## Common Issues

| Symptom | Likely cause | Fix |
|---|---|---|
| White screen on load | Missing env var crashes backend | Check `backend/.env` has all vars filled in, check backend log stream |
| `401 Unauthorised` on `/api/*` (Azure) | Easy Auth intercepting API calls | Verify `excludedPaths: ["/api"]` is saved in `authsettingsV2` — run the `az rest GET` command to check |
| `401 Unauthorised` on `/api/*` (Azure) | `x-user-id` not forwarded by proxy | Visit `/api/debug-proxy` — check `resolvedIdentity` is not null |
| Infinite login loop | `getUserId()` redirect guard race condition | Ensure the guard (`window.location.href = '/.auth/login/aad'`) is removed from `api.js` |
| Habit shows incomplete after clicking Done (refresh) | Auto-miss `useEffect` writing `completed:false` that blocks the checkIn | Ensure the auto-miss `useEffect` is removed from `HabitBoard.jsx` and `habitService.js` has the overwrite fix |
| AI chat returns JSON instead of text | Orchestrator routing issue | Check `backend/src/agents/orchestrator.js` |
| Voice input mic not appearing | Unsupported browser | Use Chrome or Edge; Firefox does not support `SpeechRecognition` |
| Journal entries show wrong date | UTC vs local timezone | Dates in Journal use `toLocalDate()` helper — verify system timezone is correct |
| Cosmos DB connection refused | IP not whitelisted | Azure Portal → Cosmos DB → Networking → Add your current IP |
| AI Search errors on journal save | Index fields not Retrievable | Portal → AI Search → journal-entries → Fields → check Retrievable on text, emotions, themes, summary, date |
| Push notifications not arriving | VAPID keys missing from Function App | Add `VAPID_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` to serenity-functions App Settings |
| Push notifications not arriving | `sendHabitReminders` schedule wrong | Verify `function.json` schedule is `"0 0 * * * *"` (every minute), not `"0 * * * * *"` (every second) |
| Function App shows no functions | `host.json` missing | Ensure `backend/functions/host.json` exists and is included in the deployment zip |
| GitHub Actions deploy fails with SCM restart | Management operation fired during deploy | Wait 2–3 minutes after any Azure portal change before pushing; re-run the failed job |
| GitHub Actions OIDC login fails — "No matching federated identity" | Workflow uses `environment: Production` but Entra ID only has `ref:refs/heads/main` credential | Add a second federated credential for Entity type = Environment, name = Production in Entra ID app registration |