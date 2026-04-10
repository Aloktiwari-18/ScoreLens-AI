# 🎓 ScoreLens AI

> **AI-Powered Answer Sheet Evaluation Platform** — Automate grading, detect plagiarism, and provide rich feedback using GPT-4, LangChain, and OCR.

![ScoreLens AI](https://img.shields.io/badge/ScoreLens-AI%20Powered-6172f3?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-MERN-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [AI Pipeline](#ai-pipeline)

---

## 🌟 Overview

ScoreLens AI is a production-ready, full-stack MERN application that brings Generative AI into academic grading. Teachers create assignments with custom rubrics; students upload answer sheets (PDF/images); the platform automatically extracts text via OCR, evaluates each answer using GPT-4 via LangChain, detects plagiarism using OpenAI embeddings + cosine similarity, and delivers rich structured feedback.

---

## ✨ Features

### 👩‍🏫 Teacher Features
- Create assignments with multi-question rubrics
- Publish/unpublish assignments
- View all student submissions with AI evaluation results
- Grade override capability
- Run plagiarism checks across all submissions
- Analytics: score distribution, top performers, pass rates, assignment stats

### 🎓 Student Features
- Browse and submit assignments (PDF/image upload with drag-and-drop)
- Real-time processing status (OCR → AI Eval → Done)
- Per-question detailed feedback with rubric breakdown
- Ideal answer suggestions
- Personal analytics: performance trend, skills radar chart

### 🤖 AI Features
- **OCR Agent** — Tesseract.js for text extraction from PDFs and images
- **Evaluation Agent** — LangChain + GPT-4o-mini for rubric-based answer scoring
- **Plagiarism Agent** — OpenAI `text-embedding-3-small` + cosine similarity
- **Feedback Agent** — Personalized improvement suggestions and ideal answers
- **Multi-Agent Pipeline** — Fully async, runs in background after upload

---

## 🛠 Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | React 18, Tailwind CSS, Chart.js, React Router |
| Backend    | Node.js, Express, Mongoose                  |
| Database   | MongoDB Atlas                               |
| AI/ML      | OpenAI API, LangChain, Tesseract.js         |
| Auth       | JWT (JSON Web Tokens), bcrypt               |
| File Upload| Multer (PDF + image)                        |
| Embeddings | OpenAI text-embedding-3-small               |

---

## 📁 Project Structure

```
scorelens-ai/
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── assignmentController.js
│   │   ├── submissionController.js
│   │   ├── analyticsController.js
│   │   └── userController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Assignment.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── assignments.js
│   │   ├── submissions.js
│   │   ├── analytics.js
│   │   └── users.js
│   ├── services/
│   │   ├── ocrService.js          ← Tesseract OCR
│   │   ├── aiEvaluationService.js ← LangChain + GPT
│   │   ├── plagiarismService.js   ← Embeddings + Cosine
│   │   └── pipelineService.js     ← Multi-agent orchestrator
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── uploads/                   ← Uploaded files (gitignored)
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── AppLayout.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── AssignmentsPage.js
│   │   │   ├── AssignmentDetailPage.js
│   │   │   ├── CreateAssignmentPage.js
│   │   │   ├── SubmitAssignmentPage.js
│   │   │   ├── SubmissionDetailPage.js
│   │   │   ├── MySubmissionsPage.js
│   │   │   ├── AnalyticsPage.js
│   │   │   └── ProfilePage.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.css
│   ├── public/index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json   ← Root (runs both with concurrently)
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Node.js** >= 18.0.0
- **MongoDB Atlas** account (free tier works)
- **OpenAI API Key** (GPT-4o-mini + embeddings)

### Step 1: Clone the repository
```bash
git clone <your-repo-url>
cd scorelens-ai
```

### Step 2: Install all dependencies
```bash
npm run install:all
```
Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

### Step 3: Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/scorelens
JWT_SECRET=your_very_long_random_secret_at_least_32_characters
JWT_EXPIRE=7d
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=20971520
PLAGIARISM_THRESHOLD=0.85
```

---

## 🔑 Adding Your OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Copy the key
4. Paste into `server/.env` as `OPENAI_API_KEY=sk-...`

> **Note:** You need access to `gpt-4o-mini` (or `gpt-4o`) and `text-embedding-3-small`. The mini model is very cost-effective for evaluation.

---

## 🍃 Connecting MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user under **Security → Database Access**
3. Whitelist your IP under **Security → Network Access** (or allow `0.0.0.0/0` for development)
4. Click **Connect → Connect your application**
5. Copy the connection string and replace `<username>`, `<password>`, and set the database name to `scorelens`

```
mongodb+srv://myuser:mypass@cluster0.abcde.mongodb.net/scorelens
```

---

## 🚀 Running the App

### Development (both server + client)
```bash
# From root directory
npm run dev
```

### Individually
```bash
# Terminal 1 — Backend (port 5000)
cd server && npm run dev

# Terminal 2 — Frontend (port 3000)
cd client && npm start
```

### Production Build
```bash
npm run build       # builds React
npm start           # runs Express server
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 API Reference

| Method | Endpoint                              | Auth     | Description                      |
|--------|---------------------------------------|----------|----------------------------------|
| POST   | `/api/auth/register`                  | Public   | Register new user                |
| POST   | `/api/auth/login`                     | Public   | Login                            |
| GET    | `/api/auth/me`                        | JWT      | Get current user                 |
| GET    | `/api/assignments`                    | JWT      | List assignments                 |
| POST   | `/api/assignments`                    | Teacher  | Create assignment                |
| GET    | `/api/assignments/:id`                | JWT      | Get assignment details           |
| PUT    | `/api/assignments/:id`                | Teacher  | Update assignment                |
| DELETE | `/api/assignments/:id`                | Teacher  | Delete assignment                |
| POST   | `/api/assignments/:id/publish`        | Teacher  | Publish assignment               |
| GET    | `/api/assignments/:id/submissions`    | JWT      | Get submissions for assignment   |
| POST   | `/api/submissions`                    | Student  | Upload submission (multipart)    |
| GET    | `/api/submissions/my`                 | Student  | Get my submissions               |
| GET    | `/api/submissions/:id`                | JWT      | Get submission detail            |
| POST   | `/api/submissions/:id/reprocess`      | JWT      | Re-run AI pipeline               |
| POST   | `/api/submissions/:id/plagiarism-check`| Teacher | Run plagiarism check             |
| PUT    | `/api/submissions/:id/grade-override` | Teacher  | Override grade                   |
| GET    | `/api/analytics/teacher`             | Teacher  | Teacher analytics                |
| GET    | `/api/analytics/student`             | Student  | Student analytics                |

---

## 🧠 AI Pipeline

```
Upload File (PDF / Image)
        │
        ▼
 ┌─────────────┐
 │  OCR Agent  │  Tesseract.js + pdf-parse
 │             │  → Extract raw text
 │             │  → Parse Q&A structure
 └──────┬──────┘
        │
        ▼
 ┌──────────────────┐
 │ Evaluation Agent │  LangChain + GPT-4o-mini
 │                  │  → Per-question scoring
 │                  │  → Rubric breakdown
 │                  │  → Feedback + ideal answer
 └────────┬─────────┘
          │
          ▼
 ┌──────────────────┐
 │ Plagiarism Agent │  OpenAI Embeddings
 │                  │  → Generate vectors
 │                  │  → Cosine similarity
 │                  │  → Flag suspicious pairs
 └────────┬─────────┘
          │
          ▼
 ┌─────────────────┐
 │ Feedback Agent  │  Summary generation
 │                 │  → Overall grade
 │                 │  → Study recommendations
 └─────────────────┘
          │
          ▼
   Saved to MongoDB
```

---

## 📝 Evaluation JSON Format

The AI returns structured JSON per question:

```json
{
  "marks": 7,
  "maxMarks": 10,
  "rubric": {
    "Content Accuracy": { "score": 4, "maxScore": 5, "comment": "Good coverage of main concepts" },
    "Depth & Analysis":  { "score": 2, "maxScore": 3, "comment": "Could elaborate more" },
    "Structure & Clarity":{ "score": 1, "maxScore": 2, "comment": "Minor grammar issues" }
  },
  "feedback": "The answer demonstrates solid understanding of the core concepts...",
  "improvements": "Include more specific examples to support your arguments...",
  "ideal_answer": "An ideal answer would cover X, Y, Z with examples...",
  "confidence": 88
}
```

---

## 🔒 Security Notes

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens expire in 7 days
- File uploads validated by MIME type and size
- CORS restricted to `CLIENT_URL`
- Helmet.js security headers
- Role-based access control on all protected routes

---

## 📄 License

MIT © ScoreLens AI
