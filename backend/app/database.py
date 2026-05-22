from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

# 1. We added '+psycopg' to force the working driver
# 2. We updated user/password/database to match standard Laragon defaults
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:@localhost:5432/postgres")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()