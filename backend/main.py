import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from sqlmodel import SQLModel
from database import engine
import seed
from routers import auth_router, projects, tasks, issues, users, activity


@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    try:
        from sqlmodel import Session, text
        with Session(engine) as session:
            session.exec(text("ALTER TABLE task ADD COLUMN IF NOT EXISTS task_note VARCHAR;"))
            session.commit()
    except Exception:
        pass
    try:
        from sqlmodel import Session, text
        with Session(engine) as session:
            session.exec(text("ALTER TABLE issue ADD COLUMN IF NOT EXISTS issue_note VARCHAR;"))
            session.commit()
    except Exception:
        pass
    try:
        from sqlmodel import Session, text
        with Session(engine) as session:
            session.exec(text("ALTER TABLE issue ADD COLUMN IF NOT EXISTS issue_url VARCHAR;"))
            session.commit()
    except Exception:
        pass
    seed.load_all()
    yield


app = FastAPI(title="Data Operations Dashboard", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(issues.router)
app.include_router(users.router)
app.include_router(activity.router)


@app.get("/")
def root():
    return {"message": "Data Operations Dashboard API", "docs": "/docs"}
