from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.routers import auth, products, preorders, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DSM — Digital Shopping Mall",
    description="API de test du modèle de précommande DSM avec journal comptable automatisé",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(preorders.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"status": "ok", "message": "DSM API v1.0 — Digital Shopping Mall"}

@app.get("/health")
def health():
    return {"status": "healthy"}
