# Campus Coin — App Overview

Campus Coin is a student budgeting and expense tracking web app. Students can record income and expenses, organize them by category, set budgets and savings goals, and review reports and AI-generated insights. The app does not connect to bank accounts or move money.

---

## Tech Stack

| Area | Technology | What it does |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Builds the user interface |
| Styling and UI | Tailwind CSS, Framer Motion, Lucide React | Layout, transitions, and icons |
| Navigation | React Router | Routes users through public, student, and admin sections |
| Charts and exports | Recharts, html-to-image, xlsx, jszip | Charts, image exports, spreadsheets, and file handling |
| API client | Axios | Sends frontend requests to the backend |
| Backend | Node.js and Express 5 | Provides the application API |
| Database | MongoDB through Mongoose | Stores users, transactions, budgets, and other app records |
| Auth and security | bcryptjs, JWT, Google Auth Library, Helmet, CORS, rate limiting | Password hashing, sessions, Google sign-in, and API protection |
| Hosting | Vercel | Hosts the frontend and backend |

The frontend's default API address is configured in `Frontend/src/constants/config.ts`. The backend registers its routes under both `/api/v1` and `/api/ccoin` in `Backend/server.js`.

---

## Main Pages

### Public
- `/` — Home
- `/about` — About Campus Coin
- `/features` — Feature overview
- `/faq` — Frequently asked questions
- `/help` — Help centre and contact options
- `/contact` — Redirects to the Help page's contact section

### Sign-in and Account
- `/login` — Student sign-in
- `/adlg` — Admin sign-in
- `/register` — Student registration
- `/forgot-password` — Request a password reset
- `/set-password` — Set a password using a reset link

### Student
- `/onboarding`
- `/dashboard`
- `/transactions`, `/transactions/new`, `/transactions/:id`, `/transactions/:id/edit`
- `/categories`
- `/budgets`
- `/reports`, `/reports/monthly`
- `/insights`
- `/saving-tips`
- `/savings-goals`
- `/bookmarks`
- `/import`
- `/profile`
- `/settings`
- `/notifications`
- `/recurring`
- `/support`

### Admin
- `/admin/dashboard`
- `/admin/users`, `/admin/users/:id`
- `/admin/categories`
- `/admin/announcements`
- `/admin/statistics`
- `/admin/support`
- `/admin/system`
- `/admin/profile`

The route table is in `Frontend/src/routes/AppRoutes.tsx`; path constants are in `Frontend/src/constants/routes.ts`.

---

## Student Features

- Income and expense tracking, including edits, deletion, change history, and restore
- Personal categories and default categories
- Monthly budgets and spending progress
- Recurring income or expenses
- Savings goals with contributions and milestones
- CSV import, category suggestions, and transaction exports
- Monthly and six-month reports
- Notifications, saving tips, pinned tips, and insights
- AI categorization and an AI assistant
- Profile, currency, budget alert, theme, and text size settings
- Backups and session management

Screens live in `Frontend/src/pages/student`. Reusable UI elements are in `Frontend/src/components`.

---

## Admin Functionality

- **Overview** — Platform totals, recent sign-ups, and shortcut links
- **Users** — Search and view accounts; create accounts; update roles and details; send reset links; set passwords; suspend, reset, or delete accounts
- **Categories** — Manage default income and expense categories for students
- **Announcements & Tips** — Publish announcements and manage saving tip templates
- **Support inbox** — Read and reply to student support conversations
- **Statistics** — View user, transaction, and category activity
- **System** — Check email status and backup statistics, and run backups
- **My Profile** — View and manage the administrator's profile

API implementation: `Backend/src/routes/admin.routes.js`. Admin UI: `Frontend/src/pages/admin`.

---

## Authentication and Password Recovery

Email and password registration and login use `/auth/register` and `/auth/login`. Passwords are hashed with bcryptjs before storage.

The backend issues:
- An access JWT lasting 15 minutes
- A refresh JWT lasting 7 days
- A server-stored session that can be revoked on logout or device sign-out

The frontend stores tokens in browser local storage. Its Axios client refreshes expiring tokens and retries eligible requests. Protected routes require a signed-in user; admin routes also check for the admin role.

Google sign-in is optional. The frontend uses Google Identity Services; the backend verifies the ID token with Google's Auth Library.

Password recovery creates a six-digit code, stores only its SHA-256 hash, and expires it after 15 minutes. The code is emailed with a reset link. The backend limits code attempts and rate-limits recovery requests.

Key files: `Backend/src/routes/auth.routes.js`, `Backend/src/services/session.service.js`, `Frontend/src/api/auth.api.ts`, `Frontend/src/pages/auth/ForgotPasswordPage.tsx`.

---

## Email Sending

Handled by `Backend/src/services/email.service.js`. Supports Brevo, Resend, and SMTP with automatic fallback between configured providers. Used for welcome messages, password recovery, reports, announcements, and support replies.

Email credentials are backend environment variables and must not be placed in frontend code.

---

## AI Features

The frontend calls Campus Coin's own backend API — it does not call Groq or Gemini directly.

| Endpoint | Purpose |
|---|---|
| `POST /ai/categorize` | Suggest a transaction category |
| `POST /ai/answer` and `POST /ai/chat` | Answer student questions with financial context |
| `POST /ai/insights/generate` | Create a monthly insight |
| Additional routes | Spending trends, affordability explanations, budget status, saving suggestions |

The backend AI service tries Groq first, then Gemini if a provider or key fails. It supports multiple keys per provider and temporarily cools down failing keys. Defaults are Groq model `openai/gpt-oss-20b` and Gemini model `gemini-3.5-flash-lite`; environment variables can override these.

Students can enable or disable AI categorization and AI insights in Settings.

Key files: `Backend/src/services/ai.service.js`, `Backend/src/services/gemini.service.js`, `Backend/src/services/groq.service.js`, `Backend/src/routes/ai.routes.js`.

---

## Frontend Routes

41 route declarations in `AppRoutes.tsx`: 39 page routes, a `/contact` redirect, and a catch-all 404.

### Public
`/` · `/about` · `/features` · `/faq` · `/help` · `/contact`

### Authentication
`/login` · `/adlg` · `/register` · `/forgot-password` · `/set-password`

### Student
`/onboarding` · `/dashboard` · `/transactions` · `/transactions/new` · `/transactions/:id` · `/transactions/:id/edit` · `/categories` · `/budgets` · `/reports` · `/reports/monthly` · `/insights` · `/saving-tips` · `/savings-goals` · `/bookmarks` · `/import` · `/profile` · `/settings` · `/notifications` · `/recurring` · `/support`

### Admin
`/admin/dashboard` · `/admin/users` · `/admin/users/:id` · `/admin/categories` · `/admin/announcements` · `/admin/statistics` · `/admin/profile` · `/admin/support` · `/admin/system`

### Fallback
`*` — Not found page

---

## Backend API Routes

Prepend `/api/v1` (or `/api/ccoin`) to all paths below. 130 route handlers total.

### Authentication — `/auth`
`POST /register` · `GET /google/config` · `POST /google` · `POST /login` · `POST /logout` · `GET /sessions` · `DELETE /sessions/:sessionId` · `DELETE /sessions` · `POST /refresh` · `POST /forgot-password` · `POST /reset-password` · `PATCH /change-password`

### Profile — `/profile`
`GET /` · `PATCH /` · `PATCH /onboarding` · `GET /settings` · `PATCH /settings`

### Dashboard — `/dashboard`
`GET /`

### Transactions — `/transactions`
`GET /` · `GET /export` · `GET /activity` · `GET /deleted` · `POST /deleted/:revisionId/restore` · `GET /:id` · `GET /:id/history` · `POST /` · `PATCH /:id` · `DELETE /:id` · `POST /import/preview` · `POST /import/categorize` · `POST /import/confirm`

### Categories — `/categories`
`GET /` · `POST /` · `PATCH /:id` · `DELETE /:id`

### Budgets — `/budgets`
`GET /` · `POST /` · `PATCH /:id` · `DELETE /:id`

### Reports — `/reports`
`GET /monthly` · `GET /monthly/pdf` · `POST /monthly/email` · `GET /six-months`

### AI — `/ai`
`POST /answer` · `POST /chat` · `POST /categorize` · `POST /insights/generate` · `POST /affordability` · `GET /spending-trend` · `GET /saving-suggestions` · `GET /budget-status` · `GET /monthly-insight` · `POST /savings-scenario` · `GET /conversations` · `GET /conversations/:conversationId` · `PATCH /conversations/:conversationId` · `DELETE /conversations/:conversationId` · `DELETE /conversations` · `POST /conversations/:conversationId/messages/:messageId/actions/:actionId/apply` · `POST /conversations/:conversationId/messages/:messageId/actions/:actionId/reject` · `POST /conversations/:conversationId/messages/:messageId/actions/apply-all`

### Insights, Tips, and Bookmarks
`GET /insights` · `GET /saving-tips` · `POST /saving-tips/dismiss` · `POST /saving-tips/pin` · `POST /saving-tips/restore` · `GET /money-moves` · `GET /bookmarks` · `POST /bookmarks` · `DELETE /bookmarks/:id`

### Savings Goals — `/savings-goals`
`GET /` · `POST /` · `POST /import` · `PATCH /:id` · `POST /:id/adjust` · `POST /:id/milestones` · `DELETE /:id`

### Recurring Money Routines — `/money-routines`
Also available under `/recurring-transactions`.

`GET /` · `POST /` · `PATCH /:id` · `DELETE /:id` · `POST /process`

### Notifications — `/notifications`
`GET /` · `GET /announcements` · `PATCH /:id/read` · `PATCH /:id/dismiss` · `PATCH /read-all` · `PATCH /clear-all`

### Backups — `/backups`
`GET /` · `POST /` · `GET /:id/download` · `POST /:id/restore` · `POST /restore-file` · `DELETE /:id`

### Support — `/support`
`POST /messages` · `GET /threads` · `GET /threads/:id` · `POST /threads/:id/replies`

### Admin — `/admin`
`GET /users` · `POST /users` · `GET /users/:id` · `PATCH /users/:id` · `POST /users/:id/send-password-reset` · `POST /users/:id/set-password` · `POST /users/:id/reset` · `DELETE /users/:id` · `GET /users/:id/backup` · `GET /categories` · `POST /categories` · `PATCH /categories/:id` · `DELETE /categories/:id` · `GET /announcements` · `POST /announcements` · `PATCH /announcements/:id` · `DELETE /announcements/:id` · `GET /saving-tips` · `POST /saving-tips` · `PATCH /saving-tips/:id` · `DELETE /saving-tips/:id` · `GET /support` · `GET /support/:id` · `POST /support/:id/replies` · `PATCH /support/:id` · `DELETE /support/:id` · `GET /statistics` · `GET /backups` · `POST /backups/run` · `GET /email/status` · `POST /email/test`

### Other Server Routes (defined in `server.js`)
`GET /` · `GET /api/v1/health` · `GET /api/ccoin/health` · `GET /api/v1/cron/daily-backups`

---

## Where to Look

| Area | Path |
|---|---|
| Route screens | `Frontend/src/pages` |
| Shared UI components | `Frontend/src/components` |
| HTTP wrappers | `Frontend/src/api` |
| Frontend feature logic | `Frontend/src/services` |
| Auth, theme, notification state | `Frontend/src/contexts` |
| API endpoints | `Backend/src/routes` |
| MongoDB schemas | `Backend/src/models` |
| Email, AI, backups, sessions | `Backend/src/services` |
| MongoDB connection | `Backend/src/config/db.js` |
| API auth middleware | `Backend/src/middleware/auth.js` |

---

## Strengths and Known Caveats

**Strengths:** Clear separation between pages, services, API wrappers, and backend routes. Includes revocable sessions, role checks, import/export support, backups, and AI provider fallback. Designed around common student costs with multi-currency support.

**Caveats:**
- The frontend README still describes the project as frontend-only, which no longer matches the actual repository.
- The monthly report PDF and transaction PDF export endpoints both returned HTTP 500 in recent testing.
- The frontend build reported large output chunks and a ~91 MB video asset.
