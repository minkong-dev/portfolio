from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json

app = FastAPI(title="Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

BASE = Path(__file__).parent
DATA = BASE / "data"
FRONTEND = BASE.parent / "frontend"


def load_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/about")
def get_about():
    return load_json(DATA / "about.json")


@app.get("/api/projects")
def get_projects():
    projects = load_json(DATA / "projects.json")
    keys = ["id", "num", "category", "badge", "badge_type", "title", "subtitle", "summary", "tags"]
    return [{k: p[k] for k in keys if k in p} for p in projects]


@app.get("/api/projects/{pid}")
def get_project(pid: str):
    projects = load_json(DATA / "projects.json")
    for p in projects:
        if p["id"] == pid:
            return p
    raise HTTPException(status_code=404, detail="Project not found")


# Image serving
img_dir = DATA / "images"
img_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=str(img_dir)), name="images")

# Frontend — must be last
app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="frontend")
