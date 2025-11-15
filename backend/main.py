from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from models import Task, TaskUpdate
from database import init_db, get_session

# Initialize FastAPI app
app = FastAPI(title="Task Manager API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Task Manager API is running"}

@app.post("/tasks", response_model=Task)
def create_task(task: Task, session: Session = Depends(get_session)):
    """Create a new task"""
    if not task.title or not task.title.strip():
        raise HTTPException(status_code=400, detail="Task title cannot be empty")
    
    # Set default priority if not provided
    if not hasattr(task, 'priority') or not task.priority:
        task.priority = "medium"
    elif task.priority not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Priority must be 'low', 'medium', or 'high'")
    
    # Set default order if not provided
    if not hasattr(task, 'order') or task.order is None:
        all_tasks = session.exec(select(Task)).all()
        max_order = max([t.order for t in all_tasks] + [0]) if all_tasks else 0
        task.order = max_order + 1
    
    task.created_at = datetime.now()
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.get("/tasks", response_model=List[Task])
def get_all_tasks(session: Session = Depends(get_session)):
    """Get all tasks"""
    statement = select(Task).order_by(Task.order, Task.created_at.desc())
    tasks = session.exec(statement).all()
    return tasks

@app.get("/tasks/{task_id}", response_model=Task)
def get_task(task_id: int, session: Session = Depends(get_session)):
    """Get a single task by ID"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate, session: Session = Depends(get_session)):
    """Update a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields if provided
    if task_update.title is not None:
        if not task_update.title.strip():
            raise HTTPException(status_code=400, detail="Task title cannot be empty")
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.done is not None:
        task.done = task_update.done
    if task_update.priority is not None:
        if task_update.priority not in ["low", "medium", "high"]:
            raise HTTPException(status_code=400, detail="Priority must be 'low', 'medium', or 'high'")
        task.priority = task_update.priority
    if task_update.order is not None:
        task.order = task_update.order
    
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    """Delete a task"""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session.delete(task)
    session.commit()
    return {"message": "Task deleted successfully"}

@app.post("/tasks/bulk-delete")
def bulk_delete_tasks(task_ids: List[int], session: Session = Depends(get_session)):
    """Delete multiple tasks"""
    deleted_count = 0
    for task_id in task_ids:
        task = session.get(Task, task_id)
        if task:
            session.delete(task)
            deleted_count += 1
    session.commit()
    return {"message": f"{deleted_count} task(s) deleted successfully", "deleted_count": deleted_count}

