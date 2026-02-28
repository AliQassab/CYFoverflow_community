# CYFoverflow

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED)](https://www.docker.com/)
[![PWA](https://img.shields.io/badge/PWA-enabled-purple)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](LICENSE)

CYFoverflow is a full-stack, community-driven Q&A platform built for the [CodeYourFuture](https://codeyourfuture.io/) community. Inspired by Stack Overflow, it lets learners ask questions, post answers, vote on content, and support each other through their coding journey. It is installable as a Progressive Web App (PWA) on mobile and desktop.

---

## Features

### Core Q&A

- **Ask questions** with rich text formatting (TinyMCE editor), template types (general, bug report, documentation), labels, and browser/OS metadata
- **Answer questions** with full rich text support
- **Accept answers** — question authors can mark the best answer, which marks the question as solved
- **Edit & delete** questions and answers (authors only)
- **Comments** on both questions and answers
- **Voting** — upvote and downvote answers; vote counts displayed in real time
- **Question labels** — tag questions by topic; filter by label on the home page
- **Similar questions** — automatic text-based similarity detection shown while posting and on question pages
- **Search** — full-text search with filters (solved status, date range, label, sort order)
- **Pagination** — all lists paginated throughout

### Users & Profiles

- **Registration & login** — JWT-based authentication with refresh tokens
- **Email verification** — account activation via email link
- **Password reset** — forgot-password email flow
- **Account lockout** — protection after repeated failed login attempts
- **User profiles** — customisable with avatar upload, public email, CYF Trainee badge, reputation score
- **My Questions / My Responses** — personal history pages

### Notifications

- **In-app notifications** — real-time via Server-Sent Events (SSE) for new answers and accepted answers
- **Push notifications** — browser push notifications via Web Push API
- **Email notifications** — answer alerts via AWS SES

### Admin Dashboard

- **Statistics** — total users, questions, answers, comments, new users this week
- **User management** — search, block/unblock, delete users
- **Content moderation** — view and delete questions, answers, comments
- **Soft-delete visibility** — admins can view deleted questions and answers with a DELETED banner
- **Race condition handling** — if a question is deleted while an admin is reviewing it, a graceful error is shown with a back link

### PWA (Progressive Web App)

- **Installable** — install on Android, iOS, Windows, macOS, or Linux from the browser
- **Offline support** — static assets cached; SPA navigation works offline
- **Install prompt** — native install banner on Android/Chrome/Edge; manual instructions for iOS Safari
- **Push notifications** — works when the app is installed and running in the background

### Security

- Passwords hashed with **bcrypt**
- JWT access tokens + **refresh token rotation**
- Rate limiting and speed limiting on all API routes
- Helmet security headers
- HTML sanitisation on user-generated content
- HTTPS-only enforcement in production (with `trust proxy` for reverse proxies)
- Admin routes protected by role check (`is_admin` flag)

---

## Tech Stack

| Layer                | Technology                                       |
| -------------------- | ------------------------------------------------ |
| **Frontend**         | React 19, Vite 7, Tailwind CSS 4, React Router 7 |
| **Rich text editor** | TinyMCE                                          |
| **Backend**          | Node.js 24, Express.js                           |
| **Database**         | PostgreSQL 17, `node-postgres` (`pg`)            |
| **Authentication**   | JWT (`jsonwebtoken`), bcrypt, refresh tokens     |
| **Real-time**        | Server-Sent Events (SSE)                         |
| **Email**            | AWS SES via `@aws-sdk/client-ses`                |
| **File uploads**     | Multer (local) or AWS S3                         |
| **Migrations**       | `node-pg-migrate`                                |
| **Testing**          | Vitest, SuperTest, TestContainers, Playwright    |
| **Containerisation** | Docker (multi-stage build), tini                 |
| **Deployment**       | Render / Coolify                                 |

---

## Project Structure

```
CYFoverflow/
├── api/                              # Express.js backend
│   ├── admin/                        # Admin dashboard (stats, user mgmt, moderation)
│   ├── answers/                      # Answer CRUD, voting, accept/unaccept
│   ├── auth/                         # Login, signup, JWT, refresh tokens
│   ├── comments/                     # Comment create/delete
│   ├── deviceTokens/                 # Push notification device registration
│   ├── emails/                       # AWS SES email templates and service
│   ├── migrations/                   # Database migration files (node-pg-migrate)
│   ├── notifications/                # In-app notifications + SSE
│   ├── passwordReset/                # Forgot password / reset flow
│   ├── pushNotifications/            # Web Push API service
│   ├── questions/                    # Question CRUD, search, labels
│   ├── refreshTokens/                # Refresh token rotation
│   ├── reputation/                   # User reputation scoring
│   ├── similarQuestions/             # Text-based similarity detection
│   ├── uploads/                      # File upload (local / S3)
│   ├── users/                        # User profiles, public email, CYF trainee
│   ├── votes/                        # Upvote / downvote
│   ├── utils/                        # Config, middleware, auth, rate limiter, logger
│   ├── app.js                        # Express app setup
│   ├── db.js                         # PostgreSQL connection pool
│   └── server.js                     # Server entry point
│
├── web/                              # React frontend
│   ├── public/
│   │   ├── favicon.svg               # App icon
│   │   ├── manifest.json             # PWA manifest
│   │   └── sw.js                     # Service worker (caching + push notifications)
│   └── src/
│       ├── components/
│       │   ├── Answer.jsx            # Answer card with voting, accept, edit, delete
│       │   ├── AnswerForm.jsx        # Rich text answer editor
│       │   ├── Comment.jsx           # Comment display and delete
│       │   ├── CommentForm.jsx       # Comment input
│       │   ├── EditAnswerForm.jsx    # Inline answer editing
│       │   ├── ImageUpload.jsx       # Drag-and-drop avatar uploader
│       │   ├── InstallPrompt.jsx     # PWA install banner (Android + iOS)
│       │   ├── Navbar.jsx            # Top navigation with search and notifications
│       │   ├── NotificationBell.jsx  # Notification icon with unread count
│       │   ├── NotificationDropdown.jsx # Notification list panel
│       │   ├── PushNotificationHandler.jsx # Push permission request
│       │   ├── QuestionList.jsx      # Paginated question list with filters
│       │   ├── SearchBar.jsx         # Search with history and suggestions
│       │   ├── Sidebar.jsx           # Label filter sidebar
│       │   ├── SimilarQuestions.jsx  # Related questions panel
│       │   └── UserLink.jsx          # Clickable user name/avatar
│       ├── contexts/
│       │   ├── AuthContext.jsx       # Global auth state (user, token, login/logout)
│       │   ├── NotificationContext.jsx # Notification state + SSE connection
│       │   ├── SearchContext.jsx     # Search state across pages
│       │   ├── LabelFilterContext.jsx # Active label filter state
│       │   └── ToastContext.jsx      # Toast notification system
│       ├── pages/
│       │   ├── AdminPage.jsx         # Admin dashboard (stats, users, content)
│       │   ├── EditQuestion.jsx      # Edit question form
│       │   ├── ForgotPassword.jsx    # Forgot password page
│       │   ├── Home.jsx              # Question list with search and filters
│       │   ├── LabelsPage.jsx        # Browse questions by label
│       │   ├── Login.jsx             # Login page
│       │   ├── MyQuestionsPage.jsx   # User's own questions
│       │   ├── MyResponsesPage.jsx   # User's own answers
│       │   ├── QuestionDetailPage.jsx # Question + answers + comments
│       │   ├── QuestionPage.jsx      # Ask a question form
│       │   ├── ResetPassword.jsx     # Password reset form
│       │   ├── SignUp.jsx            # Registration page
│       │   └── UserProfilePage.jsx   # Public user profile + edit mode
│       ├── services/
│       │   ├── api.js                # All API client functions
│       │   ├── pushNotifications.js  # Web Push subscription management
│       │   └── sse.js                # SSE connection helper
│       ├── hooks/
│       │   └── usePushNotifications.js # Push notification React hook
│       └── utils/
│           ├── questionUtils.jsx     # Shared question formatting helpers
│           ├── searchHistory.js      # localStorage search history
│           └── errorMessages.js      # User-facing error message mapping
│
├── e2e/                              # Playwright end-to-end tests
├── bin/
│   └── start.sh                      # Container startup: runs migrations then starts server
├── Dockerfile                        # Multi-stage production build
├── .env.example                      # Example environment variables
└── package.json                      # Workspace root (npm workspaces)
```

---

## Getting Started

### Prerequisites

- **Node.js** `^20.19 || ^22.12 || ^24`
- **npm** `^10 || ^11`
- **PostgreSQL** running locally

### 1. Clone the repository

```bash
git clone https://github.com/AliQassab/CYFoverflow_community.git
cd CYFoverflow_community
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgres://localhost:5432/cyfoverflow
JWT_SECRET=your_jwt_secret_here
LOG_LEVEL=debug
ADMIN_EMAILS=your@email.com
APP_URL=http://localhost:3000
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Run database migrations

```bash
npm run migration up
```

### 5. Start the development server

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3100](http://localhost:3100)

---

## Scripts

| Script           | Command                  | Description                                         |
| ---------------- | ------------------------ | --------------------------------------------------- |
| `dev`            | `npm run dev`            | Start frontend + backend concurrently in watch mode |
| `build`          | `npm run build`          | Build the React frontend                            |
| `serve`          | `npm run serve`          | Build and run in local production mode              |
| `test`           | `npm run test`           | Run unit and integration tests (Vitest + SuperTest) |
| `test:cover`     | `npm run test:cover`     | Run tests with coverage report                      |
| `e2e`            | `npm run e2e`            | Run end-to-end tests with Playwright                |
| `lint`           | `npm run lint`           | Lint and format check (ESLint + Prettier)           |
| `lint:fix`       | `npm run lint:fix`       | Auto-fix lint and formatting issues                 |
| `ship`           | `npm run ship`           | Run lint + test + e2e before pushing                |
| `migration up`   | `npm run migration up`   | Apply pending database migrations                   |
| `migration down` | `npm run migration down` | Roll back the last migration                        |

---

## Environment Variables

| Variable                | Required         | Description                                                    |
| ----------------------- | ---------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | Yes (production) | PostgreSQL connection string                                   |
| `JWT_SECRET`            | Yes              | Secret key for signing JWT tokens                              |
| `NODE_ENV`              | Yes (production) | Set to `production` in deployed environments                   |
| `ADMIN_EMAILS`          | Yes              | Comma-separated list of admin email addresses                  |
| `APP_URL`               | Yes              | Public URL of the deployed app                                 |
| `LOG_LEVEL`             | No               | Logging level (`debug`, `info`, `warn`, `error`)               |
| `FRONTEND_URL`          | No               | Frontend origin for CORS (defaults to `http://localhost:5173`) |
| `STORAGE_TYPE`          | No               | File storage: `local` (default) or `s3`                        |
| `EMAIL_SOURCE`          | No               | Sender email address for AWS SES                               |
| `EMAIL_REGION`          | No               | AWS region for SES (default `eu-west-1`)                       |
| `AWS_ACCESS_KEY_ID`     | No               | AWS credentials (if not using IAM role)                        |
| `AWS_SECRET_ACCESS_KEY` | No               | AWS credentials (if not using IAM role)                        |

---

## Deployment

### Render (recommended)

1. **Create a PostgreSQL service** on Render → copy the **Internal Database URL**
2. **Create a Web Service** → connect this GitHub repo → set Runtime to **Docker**
3. **Add environment variables:**

```
NODE_ENV=production
DATABASE_URL=<Internal Database URL>
JWT_SECRET=<generated secret>
ADMIN_EMAILS=your@email.com
APP_URL=https://<your-service>.onrender.com
```

4. Render builds the Docker image and deploys automatically on every push to `main`
5. Migrations run automatically on container startup

> **Note:** The free tier sleeps after 15 minutes of inactivity. Upgrade to the Starter plan ($7/mo) to keep the service always on.

### Coolify (self-hosted)

1. Add your VPS server to Coolify under **Servers**
2. Create a new application and connect this repository
3. Set **Ports Exposes** to `80`
4. Add the same environment variables as above
5. Deploy — migrations run automatically on startup via `bin/start.sh`

---

## PWA Installation

CYFoverflow is installable as a native-like app on any platform:

| Platform                                  | How to install                                                |
| ----------------------------------------- | ------------------------------------------------------------- |
| **Android (Chrome)**                      | Tap the install banner or browser menu → "Add to Home Screen" |
| **iOS (Safari)**                          | Tap Share → "Add to Home Screen"                              |
| **Windows / macOS / Linux (Chrome/Edge)** | Click the install icon in the browser address bar             |

Once installed, the app works offline for previously visited pages and receives push notifications in the background.

---

## API Overview

All API routes are under `/api`.

| Resource       | Endpoint                                                | Notes                                      |
| -------------- | ------------------------------------------------------- | ------------------------------------------ |
| Auth           | `/api/auth`                                             | Login, signup, logout, refresh token       |
| Password reset | `/api/auth/forgot-password`, `/api/auth/reset-password` | Email-based reset flow                     |
| Questions      | `/api/questions`                                        | CRUD, search, labels, similar              |
| Answers        | `/api/answers`                                          | CRUD, accept, vote                         |
| Comments       | `/api/comments`                                         | Create, delete                             |
| Votes          | `/api/votes`                                            | Upvote / downvote answers                  |
| Notifications  | `/api/notifications`                                    | List, mark read, SSE stream                |
| Users          | `/api/users`                                            | Profile, avatar upload                     |
| Uploads        | `/api/upload`                                           | File upload (image)                        |
| Admin          | `/api/admin`                                            | Stats, user management, content moderation |
| Health         | `/healthz`                                              | Container health check                     |

---

## Database Schema (key tables)

| Table                   | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `users`                 | Accounts, auth, profile, reputation, admin flag         |
| `questions`             | Questions with soft delete, answer count, solved status |
| `answers`               | Answers with soft delete, accepted flag                 |
| `comments`              | Comments on questions and answers                       |
| `votes`                 | Upvote/downvote records per user per answer             |
| `labels`                | Topic tags                                              |
| `question_labels`       | Many-to-many: questions ↔ labels                       |
| `notifications`         | In-app notification records                             |
| `refresh_tokens`        | JWT refresh token store                                 |
| `password_reset_tokens` | One-time reset tokens                                   |
| `similar_questions`     | Manual and auto-detected question relationships         |
| `file_uploads`          | Uploaded file metadata                                  |
| `device_tokens`         | Push notification subscription records                  |

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes and run `npm run ship` (lint + test + e2e)
4. Push and open a pull request

---

## License

ISC License © CodeYourFuture Community
