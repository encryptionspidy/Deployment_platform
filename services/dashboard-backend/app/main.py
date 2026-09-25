from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.core.config import settings
from app.db.models import init_db
from app.api.routes import auth, projects, deployments, slo

app = FastAPI(title="Deploy Platform Dashboard API")

init_db()

# Add SessionMiddleware first for cookie session management
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)

# Add CORSMiddleware to allow Next.js frontend at http://localhost:3000 with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(deployments.router)
app.include_router(slo.router)


@app.get("/")
def read_root():
    return {"message": "Deploy Platform Dashboard API Running"}