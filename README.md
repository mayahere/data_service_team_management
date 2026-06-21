# Data Operations Dashboard (Task Management System)

A comprehensive task management system designed for Data Managers to track multiple concurrent data provision projects across different platforms. The system replaces manual weekly reporting with a centralized tool enabling real-time progress monitoring across three user roles: Operator, Leader, and Manager.

## Features

- **Project Management**: Create, read, update, and manage project lifecycles.
- **Task Management**: Track tasks, assign team members, and monitor progress.
- **Issue Tracking**: Report, attach files (images), and resolve issues linked to tasks and projects.
- **Role-Based Access Control**: Tailored workflows and restricted views for Operators, Leaders, and Managers.
- **User Activity Audit Stream**: Automatic logging of mutations on tasks/issues for traceability.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion, Axios, Lucide React
- **Backend**: Python, FastAPI, SQLModel (ORM wrapping SQLAlchemy and Pydantic)
- **Data Store**: SQLite (default local DB) / PostgreSQL (Docker environment)
- **Containerization**: Docker & Docker Compose for all services

## Project Structure

- `/backend`: FastAPI backend application.
- `/frontend`: React frontend application built with Vite.
- `Documentation.md`: Detailed functional, non-functional requirements, database schemas, and permission matrices.

## Setup Instructions

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) and Docker Compose (recommended for full stack setup)
- Alternatively, Python 3.12+ (for manual local backend setup)

### Running with Docker Compose (Recommended)

You can start the entire stack (Database, Backend API, Frontend) at once. From the root of the project, run:

```bash
docker compose up --build
```

This will start:

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000` (Swagger UI documentation is available at `http://localhost:8000/docs`)
- **PostgreSQL Database:** `localhost:5432`

---

### Running Manually (Development Setup)

#### 1. Running the Backend

Navigate to the backend directory and start the server:

```bash
cd backend
# Recommended: Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows, use `.venv\Scripts\activate`

# Install dependencies and start server
pip install -r requirements.txt
uvicorn main:app --reload

```

The backend API documentation will be available at `http://localhost:8000/docs`.

#### 2. Running the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.
