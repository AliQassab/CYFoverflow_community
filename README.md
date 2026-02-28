# CYFoverflow

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](LICENSE)

CYFoverflow is a community-driven Q&A platform built for the [CodeYourFuture](https://codeyourfuture.io/) community. Inspired by Stack Overflow, it lets learners ask questions, post answers, vote on content, and support each other through their coding journey.

---

## Features

- **Ask & Answer** — Post questions with rich text formatting, tag them with labels, and accept the best answer
- **Voting** — Upvote and downvote answers to surface the most helpful content
- **Comments** — Add comments to questions and answers for clarification
- **Notifications** — Get notified when someone answers your question or accepts your answer
- **User Profiles** — Customisable profiles with avatar upload, public email, and CYF Trainee badge
- **Similar Questions** — Automatic text-based similarity detection to reduce duplicates
- **Admin Dashboard** — Manage users, moderate content, and view platform statistics
- **File Uploads** — Upload profile images (local or S3 storage)
- **Authentication** — JWT-based auth with refresh tokens, email verification, and account lockout protection

---

## Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| **Frontend**   | React 19, Vite, Tailwind CSS, React Router    |
| **Backend**    | Node.js 24, Express.js                        |
| **Database**   | PostgreSQL 17 with `node-postgres`            |
| **Auth**       | JWT, bcrypt, refresh tokens                   |
| **Testing**    | Vitest, SuperTest, TestContainers, Playwright |
| **Deployment** | Docker (multi-stage build), Coolify / Render  |

---

## Getting Started

### Prerequisites

- **Node.js** `^20.19 || ^22.12 || ^24`
- **npm** `^10 || ^11`
- **PostgreSQL** running locally (or use the devcontainer)

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

```bash
DATABASE_URL=postgres://localhost:5432/cyfoverflow
JWT_SECRET=your_secret_here
LOG_LEVEL=debug
ADMIN_EMAILS=your@email.com
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
| `lint`           | `npm run lint`           | Lint and format check with ESLint + Prettier        |
| `lint:fix`       | `npm run lint:fix`       | Auto-fix lint and formatting issues                 |
| `ship`           | `npm run ship`           | Run lint + test + e2e before pushing                |
| `migration up`   | `npm run migration up`   | Apply pending database migrations                   |
| `migration down` | `npm run migration down` | Roll back the last migration                        |

---

## Deployment

### Render

1. Create a **PostgreSQL** service on Render — copy the Internal Database URL
2. Create a **Web Service** — connect this repo, set Runtime to **Docker**
3. Add environment variables:

```
NODE_ENV=production
DATABASE_URL=<Internal Database URL from step 1>
JWT_SECRET=<generated secret>
ADMIN_EMAILS=your@email.com
APP_URL=https://<your-service>.onrender.com
```

### Coolify

1. Add your server in Coolify → **Servers**
2. Create a new application, connect this repo
3. Set **Ports Exposes** to `80`
4. Add the same environment variables as above
5. Deploy — migrations run automatically on startup

---

## Project Structure

```
CYFoverflow/
├── api/                  # Express.js backend
│   ├── admin/            # Admin dashboard routes and service
│   ├── answers/          # Answer CRUD, voting, acceptance
│   ├── auth/             # Authentication (JWT, refresh tokens)
│   ├── comments/         # Comment management
│   ├── migrations/       # Database migrations
│   ├── notifications/    # In-app notification system
│   ├── questions/        # Question CRUD, search, similar questions
│   ├── uploads/          # File upload handling (local/S3)
│   ├── users/            # User profiles and reputation
│   └── utils/            # Config, middleware, auth helpers
├── web/                  # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (Auth)
│   │   ├── pages/        # Page components
│   │   └── services/     # API client functions
├── e2e/                  # Playwright end-to-end tests
├── bin/                  # Startup scripts
└── Dockerfile            # Multi-stage production build
```

---

## Contributing

Contributions are welcome! Please open an issue to discuss what you'd like to change, then submit a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes
4. Push and open a pull request

---

## License

ISC License © CodeYourFuture Community
