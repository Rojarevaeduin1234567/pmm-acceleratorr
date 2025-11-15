from sqlmodel import SQLModel, create_engine, Session
import os

# SQLite database file path
DATABASE_URL = "sqlite:///tasks.db"

# Create engine
engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    """Create all database tables on startup"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session

