import json
import os
from models import User, Project, Task, Issue, Attachment
import store

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load(filename: str) -> list:
    path = os.path.join(DATA_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)


def load_all():
    store.users       = [User(**u) for u in _load("users.json")]
    store.projects    = [Project(**p) for p in _load("projects.json")]
    store.tasks       = [Task(**t) for t in _load("tasks.json")]
    store.issues      = [Issue(**i) for i in _load("issues.json")]

    attachments_path = os.path.join(DATA_DIR, "attachments.json")
    store.attachments = (
        [Attachment(**a) for a in _load("attachments.json")]
        if os.path.exists(attachments_path)
        else []
    )

    store.rebuild_all()
    print(
        f"[seed] Loaded {len(store.users)} users, {len(store.projects)} projects, "
        f"{len(store.tasks)} tasks, {len(store.issues)} issues."
    )
