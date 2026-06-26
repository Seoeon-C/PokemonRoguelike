from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import boss_ai, health, run_feedback

app = FastAPI(title="PokemonRoguelike API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(boss_ai.router)
app.include_router(run_feedback.router)
