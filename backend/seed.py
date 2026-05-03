import json
import os
from sqlmodel import Session, select
from models import User, Project, Task, Issue, Attachment
from database import engine

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load(filename: str) -> list:
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)


def load_all():
    with Session(engine) as session:
        user = session.exec(select(User).limit(1)).first()
        if user:
            print("[seed] DB already seeded.")
            return

        users = [User(**u) for u in _load("users.json")]
        projects = [Project(**p) for p in _load("projects.json")]
        tasks = [Task(**t) for t in _load("tasks.json")]
        issues = [Issue(**i) for i in _load("issues.json")]

        session.add_all(users)
        session.add_all(projects)
        session.add_all(tasks)
        session.add_all(issues)

        attachments_path = os.path.join(DATA_DIR, "attachments.json")
        if os.path.exists(attachments_path):
            attachments = [Attachment(**a) for a in _load("attachments.json")]
            session.add_all(attachments)

        session.commit()
        print(
            f"[seed] Loaded {len(users)} users, {len(projects)} projects, "
            f"{len(tasks)} tasks, {len(issues)} issues."
        )
