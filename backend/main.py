from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import smtplib
import ssl
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .config import SMTP_EMAIL, SMTP_PASSWORD, SMTP_SERVER, SMTP_PORT

app = FastAPI(title="Traffic AI Backend")

# Allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class LogEntry(BaseModel):
    time: str
    msg: str

class Junction(BaseModel):
    name: str
    baseWait: int
    currentWait: int
    status: str

class EmailSettings(BaseModel):
    email: str
    autoExport: bool
    exportHour: str
    exportMinute: str
    exportPeriod: str

# In-Memory Database Simulation
# Pre-populated with some initial logs
fake_db_logs: List[LogEntry] = [
    LogEntry(time=datetime.now().strftime("%I:%M:%S %p"), msg='System: TNY-SRV-01 boot sequence complete.'),
    LogEntry(time=datetime.now().strftime("%I:%M:%S %p"), msg='AI Core: Python Model YOLOv8.1-PRO loaded successfully.'),
    LogEntry(time=datetime.now().strftime("%I:%M:%S %p"), msg='Network: Connected to FastAPI Backend on port 8000.')
]

# Shared Global State
global_state = {
    "isRaining": False,
    "sosJunction": None
}

base_junctions = [
    {"name": "Vannarpettai", "baseWait": 12, "currentWait": 12, "status": "Optimal"},
    {"name": "Junction", "baseWait": 45, "currentWait": 45, "status": "Busy"},
    {"name": "Town Arch", "baseWait": 8, "currentWait": 8, "status": "Smooth"},
    {"name": "KTC Nagar", "baseWait": 22, "currentWait": 22, "status": "Steady"},
]


@app.get("/api/logs", response_model=List[LogEntry])
def get_logs():
    return list(reversed(fake_db_logs[-50:]))  # Return top 50 logs, newest first


@app.post("/api/logs")
def add_log(log: LogEntry):
    fake_db_logs.append(log)
    return {"status": "success", "message": "Log stored successfully"}


@app.get("/api/junctions", response_model=List[Junction])
def get_junctions():
    # Recalculate based on global state
    is_rain = global_state["isRaining"]
    sos_junc = global_state["sosJunction"]
    
    current_health = []
    for j in base_junctions:
        # Clone dict
        curr = dict(j)
        
        # Apply SOS modifier
        if sos_junc == curr["name"]:
            curr["status"] = "BLOCKED"
        else:
            # Apply Rain modifier
            if is_rain:
                curr["currentWait"] = curr["baseWait"] + 15
                curr["status"] = "Caution"
            else:
                curr["currentWait"] = curr["baseWait"]
                curr["status"] = "Busy" if curr["baseWait"] > 30 else "Optimal"
                
        current_health.append(curr)
        
    return current_health


class StateUpdate(BaseModel):
    isRaining: bool = None
    sosJunction: str = None


@app.post("/api/state")
def update_state(update: StateUpdate):
    if update.isRaining is not None:
        global_state["isRaining"] = update.isRaining
    if update.sosJunction is not None:
        global_state["sosJunction"] = update.sosJunction
    
    return {"status": "success", "state": global_state}


@app.get("/api/state")
def get_state():
    return global_state

# --- Email & Scheduling Logic ---

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "settings.json")

def load_email_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {
        "email": SMTP_EMAIL,
        "autoExport": False,
        "exportHour": "09",
        "exportMinute": "00",
        "exportPeriod": "AM"
    }

def save_email_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f)

def send_real_email():
    settings = load_email_settings()
    if not settings.get("autoExport"):
        return

    recipient = settings.get("email")
    
    # Prepare Content
    subject = f"Traffic Status Report - {datetime.now().strftime('%Y-%m-%d')}"
    
    # Generate a simple report from current junctions
    junction_stats = ""
    for j in base_junctions:
        junction_stats += f"- {j['name']}: {j['status']} (Base Wait: {j['baseWait']}s)\n"

    body = f"""
AI Traffic Management System - Daily Report
Generated at: {datetime.now().strftime('%I:%M %p')}

Current Junction Status:
{junction_stats}

Total Monitor Logs: {len(fake_db_logs)}
System Health: Optimal

This is an automated report from your Traffic AI Dashboard.
    """

    message = MIMEMultipart()
    message["From"] = SMTP_EMAIL
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, recipient, message.as_string())
        
        # Log success to internal logs
        fake_db_logs.append(LogEntry(
            time=datetime.now().strftime("%I:%M:%S %p"),
            msg=f"System: Email report successfully sent to {recipient}"
        ))
    except Exception as e:
        fake_db_logs.append(LogEntry(
            time=datetime.now().strftime("%I:%M:%S %p"),
            msg=f"Error: Failed to send email: {str(e)}"
        ))

# --- Scheduler Setup ---
scheduler = BackgroundScheduler()
scheduler.start()

def update_scheduler():
    settings = load_email_settings()
    
    # Remove existing job if any
    if scheduler.get_job('daily_report'):
        scheduler.remove_job('daily_report')
    
    if settings.get("autoExport"):
        hour = int(settings.get("exportHour"))
        minute = int(settings.get("exportMinute"))
        period = settings.get("exportPeriod")
        
        if period == "PM" and hour < 12:
            hour += 12
        elif period == "AM" and hour == 12:
            hour = 0
            
        scheduler.add_job(
            send_real_email,
            CronTrigger(hour=hour, minute=minute),
            id='daily_report'
        )

# Initialize on startup
update_scheduler()

@app.post("/api/settings/email")
def update_email_settings_endpoint(settings: EmailSettings):
    save_email_settings(settings.dict())
    update_scheduler()
    return {"status": "success", "message": "Email settings updated and scheduler synced"}

@app.get("/api/settings/email")
def get_email_settings_endpoint():
    return load_email_settings()

