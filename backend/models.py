from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class Priority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Task(SQLModel, table=True):
    """Task model for SQLite database"""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    done: bool = False
    priority: str = Field(default="medium")  # low, medium, high
    created_at: datetime = Field(default_factory=datetime.now)
    order: Optional[int] = Field(default=0)  # For drag and drop ordering

class TaskUpdate(SQLModel):
    """Task update model (no table, just for API requests)"""
    title: Optional[str] = None
    description: Optional[str] = None
    done: Optional[bool] = None
    priority: Optional[str] = None
    order: Optional[int] = None

