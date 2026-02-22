# 📦 Goods Distributor App

This project is a comprehensive **Goods Distributor Application** containing both a modern **Frontend** (React + Vite) and a robust **Backend** (FastAPI). 
It includes authentication, sales tracking, product management, and interactive charts for performance reporting.

---

## 📁 Project Structure

```text
goods-distributor-app/
│
├── backend/       # FastAPI application and SQLite database
├── frontend/      # React application (Vite + Tailwind CSS)
└── README.md      # Project documentation (this file)
```

---

## ⚙️ Backend Setup

The backend is a REST API built with **Python 3**, **FastAPI**, **SQLAlchemy**, and **SQLite**.

### Prerequisites
* Python 3.8+

### Installation & Running

**Backend (from the project root directory):**
```powershell
# Navigate to the backend directory
cd goods-distributor-app\backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate   # (On macOS/Linux use: source venv/bin/activate)

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-jose passlib pydantic

# Run the backend server
uvicorn main:app --reload
```
> 🚀 **API URL:** `http://127.0.0.1:8000`  
> 📖 **API Docs (Swagger UI):** `http://127.0.0.1:8000/docs`

---

## 🎨 Frontend Setup

The frontend is a modern web application built with **React 19**, **Vite**, **Tailwind CSS 4**, and **Recharts**.

### Prerequisites
* Node.js (v18+ recommended)
* npm or yarn

### Installation & Running

**Frontend (from the project root directory - new terminal):**
```powershell
# Navigate to the frontend directory
cd goods-distributor-app\frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
> 🚀 **Frontend URL:** `http://localhost:5173`

---

## ✨ Features

* 🔐 **Authentication:** Role-based access control (Admin & Guest/SR).
* 📊 **Dashboard:** Interactive charts and reports for daily and total sales.
* 📦 **Product Management:** Add, edit, and categorize your goods easily.
* 🛒 **Sales Tracking:** Intuitive interface with dynamic product selection and quantity normalization.

---

## 🔑 Default Credentials

### Admin Access
* **Username:** `admin`
* **Password:** `admin1234`

### Guest / Sales Representative
* **Username:** `guest`
* **Password:** `guest1234`
