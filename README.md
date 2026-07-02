# AI Candidate Discovery Platform

AI-powered platform to discover, rank, and evaluate candidates with semantic search, interview question generation, fraud detection, and multilingual support.

# WEBSITE [
(https://ai-candidate-discovery-frontend.onrender.com)
## Architecture

```
Frontend (React) → Backend (Node.js) → AI Service (Python) → ChromaDB + MongoDB
```

## Focus Features

1. **Interview Question Generation** — Role-tailored technical, behavioral, and situational questions with follow-ups via Gemini.
2. **Fraud Detection** — Timeline inconsistencies, skill inflation, duplicate content, and risk scoring.
3. **Multilingual Support** — Language detection, resume translation, and cross-language job matching.

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (or use Docker)

### Setup

```bash
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# AI Service
cd ai-service
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Swagger docs: http://localhost:4000/api/docs
- AI Service: http://localhost:8000/docs

## Key platform features

- OCR support for scanned PDF resumes and images via `tesseract.js`
- PWA-ready service worker with offline caching
- API documentation available at `/api/docs`
- GitHub Actions CI pipeline for backend tests and frontend build

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | JWT authentication |
| POST | `/api/auth/register` | Create recruiter account |
| POST | `/api/upload` | Upload resume (PDF/DOCX/TXT) |
| GET | `/api/jobs` | List job postings |
| POST | `/api/search` | Semantic candidate search |
| POST | `/api/rank` | AI rank candidates for a job |
| POST | `/api/compare` | Compare multiple candidates |
| POST | `/api/interview/generate` | **Generate interview questions** |
| POST | `/api/fraud/analyze` | **Fraud detection analysis** |
| POST | `/api/i18n/detect` | **Detect resume language** |
| POST | `/api/i18n/translate` | **Translate resume content** |

## Tech Stack

- **Frontend:** React, Vite, TypeScript
- **Backend:** Node.js, Express, MongoDB, JWT
- **AI Service:** Python, FastAPI, Gemini API, ChromaDB, sentence-transformers
