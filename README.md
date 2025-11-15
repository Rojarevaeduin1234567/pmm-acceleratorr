# 🚀 Task Manager Application — Full Stack (React + FastAPI + SQLite)

A clean and simple full-stack Task Manager application built using **React** (frontend) and **FastAPI** (backend) with **SQLite** as the database.  
This project demonstrates full CRUD operations, REST APIs, and frontend–backend integration.

---

## 🛠️ Tech Stack

### Frontend
- React
- Axios (API calls)
- Custom CSS

### Backend
- FastAPI
- SQLModel
- SQLite Database
- Pydantic Models

---

## ✨ Features

### Task Management
- Create tasks  
- Optional description  
- Priority (Low / Medium / High)  
- Edit tasks  
- Mark task as Done / Undo  
- Delete tasks  

### Filters & Sorting
- All / Active / Completed  
- Sort by date  
- Search tasks by title or description  

### Note
❌ Alarm / Notification feature is **not included**

---

## 📁 Project Structure

pmm-acceleratorr/
│
├── backend/
│ ├── main.py
│ ├── database.py
│ ├── models.py
│ ├── tasks.db
│ └── requirements.txt
│
└── frontend/
├── src/
├── public/
├── package.json
└── package-lock.json

---

## ▶️ Run Backend (FastAPI)

Install dependencies:
pip install -r requirements.txt


Start server:


uvicorn main:app --reload


Backend URL:  
http://127.0.0.1:8000

---

## ▶️ Run Frontend (React)

Install packages:


npm install


Start app:


npm start


Frontend URL:  
http://localhost:3000

---

## 🔗 API Endpoints

| Method | Endpoint      | Description      |
|--------|----------------|------------------|
| GET    | /tasks         | Get all tasks    |
| POST   | /tasks         | Add task         |
| PUT    | /tasks/{id}    | Update task      |
| DELETE | /tasks/{id}    | Delete task      |

---

## 👤 Author

**Roja**  
GitHub: https://github.com/Rojarevaeduin1234567
