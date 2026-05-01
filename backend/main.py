from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

import seed
from routers import auth_router, projects, tasks, issues, users, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
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

app.include_router(auth_router.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(issues.router)
app.include_router(users.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"message": "Data Operations Dashboard API", "docs": "/docs"}
