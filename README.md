# Data Operations Dashboard (Task Management System)

A comprehensive task management system designed for Data Managers to track multiple concurrent data provision projects across different platforms. The system replaces manual weekly reporting with a centralized tool enabling real-time progress monitoring across three user roles: Operator, Leader, and Manager.

## Features
- **Project Management**: Create, read, update, and manage project lifecycles.
- **Task Management**: Track tasks, assign team members, and monitor progress.
- **Issue Tracking**: Report and resolve issues linked to tasks and projects.
- **Role-Based Access Control**: Tailored workflows for Operators, Leaders, and Managers.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Recharts, Framer Motion
- **Backend**: Python, FastAPI
- **Data Store**: In-memory data store with JSON seeding (for development)
- **Deployment**: Docker Compose for backend

## Project Structure
- `/backend`: FastAPI backend application.
- `/frontend`: React frontend application built with Vite.
- `REQUIREMENTS.md`: Detailed functional and non-functional requirements.

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) and Docker Compose (recommended for backend)
- Alternatively, Python 3.12+ (for manual backend setup)

### Running the Backend

**Option 1: Using Docker (Recommended)**
From the root of the project, run:
```bash
docker-compose up --build
```
This will start the backend service on `http://localhost:8000`.

**Option 2: Manual Setup**
Navigate to the backend directory and start the server:
```bash
cd backend
pip install fastapi "uvicorn[standard]" pyjwt python-multipart
uvicorn main:app --reload
```
The backend API documentation (Swagger UI) will be available at `http://localhost:8000/docs`.

### Running the Frontend
Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.
