import os
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)
from supabase import create_client, Client
from upstash_redis import Redis
from typing import List, Optional
import json

from pathlib import Path
import json
from functools import lru_cache
try:
    from pywebpush import webpush, WebPushException
except ImportError:
    webpush = None
    WebPushException = Exception
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

app = FastAPI(title="Kryonex API", description="FastAPI Backend for Kryonex Studio")

# Admin Email Configuration
ADMIN_EMAIL = os.getenv("VITE_ADMIN_EMAIL", "ayushsancheti098@gmail.com").lower()

async def verify_admin(auth: HTTPAuthorizationCredentials = Depends(security)):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not connected")
    
    try:
        # Verify the user using the provided JWT
        user_response = supabase.auth.get_user(auth.credentials)
        if not user_response.user or user_response.user.email.lower() != ADMIN_EMAIL:
            raise HTTPException(status_code=403, detail="Unauthorized Administrative Access")
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid Authentication Protocol: {str(e)}")

# CORS configuration
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
# Default origins for production and development
default_origins = [
    "https://kryonex.dev",
    "https://www.kryonex.dev",
    "https://kryonex-three.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5000",
]
# Combine and filter empty strings
allowed_origins = [o for o in set(origins + default_origins) if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initial Data
MOCK_PROJECTS = []

DEFAULT_CATEGORIES = []

# Initialize external services
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
REDIS_URL = os.getenv("UPSTASH_REDIS_REST_URL")
REDIS_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"--- Kryonex Engine Started ---")
        print(f"Mode: {'Production (Vercel)' if os.getenv('VERCEL') else 'Local Development'}")
        print(f"Database: Supabase Connected")
        print(f"Redis: {'Connected' if REDIS_URL else 'Missing'}")
        print(f"------------------------------")
    except Exception as e:
        print(f"Supabase connection failed: {str(e)}")

# Settings Persistence
SETTINGS_FILE = Path(__file__).parent / "settings.json"

@lru_cache(maxsize=1)
def get_persisted_settings():
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {"allow_publish": True}

def save_persisted_settings(settings):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f)
    get_persisted_settings.cache_clear()

# Vault Persistence (Personal Credentials)
VAULT_FILE = Path(__file__).parent / "vault.json"

def get_persisted_vault():
    if VAULT_FILE.exists():
        try:
            with open(VAULT_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_persisted_vault(vault_data):
    with open(VAULT_FILE, "w") as f:
        json.dump(vault_data, f)

# Models
class SettingsModel(BaseModel):
    allow_publish: bool

class ProjectModel(BaseModel):
    id: Optional[str] = None
    title: str
    shortDescription: Optional[str] = ""
    description: str
    categories: List[str]
    features: Optional[List[str]] = []
    authorName: Optional[str] = "Admin"
    status: Optional[str] = "approved"
    techStack: Optional[List[str]] = []
    performance: Optional[int] = 100
    liveUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    report: Optional[str] = None
    display_order: Optional[int] = 0

class PushSubscriptionModel(BaseModel):
    endpoint: str
    keys: dict

@app.get("/")
async def root():
    return {"message": "Welcome to Kryonex API", "stack": "FastAPI + Supabase + Upstash"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "supabase": "connected" if supabase else "missing"
        }
    }

@app.get("/api/projects")
async def get_projects():
    if supabase:
        try:
            # Use v2 table to bypass cache issues, ordered by display_order
            response = supabase.table("projects_v2").select("*").order("display_order").execute()
            return response.data if response.data else MOCK_PROJECTS
        except:
            return MOCK_PROJECTS
    return MOCK_PROJECTS

@app.post("/api/projects")
async def create_project(project: ProjectModel, user=Depends(verify_admin)):
    if supabase:
        try:
            data = project.model_dump()
            # Remove fields that don't exist in Supabase projects_v2 table
            for field in ['imageUrl', 'githubUrl', 'report', 'shortDescription']:
                data.pop(field, None)
                
            if not data.get('id'):
                import uuid
                data['id'] = str(uuid.uuid4())
            
            # Ensure display_order is present
            if 'display_order' not in data:
                data['display_order'] = 0
                
            # Cache issue is resolved via v2 table, so we use standard insert
            response = supabase.table("projects_v2").insert(data).execute()
            
            # Send Push Notifications
            try:
                send_push_notification("New Project!", f"{project.title} by {project.authorName}")
            except:
                pass

            return response.data[0] if response.data else data
        except Exception as e:
            print(f"INSERT ERROR: {str(e)}")
            # If even the explicit select fails, it's likely a column name typo, so we return the raw data as a last resort
            if "imageUrl" in str(e):
                return data
            raise HTTPException(status_code=400, detail=str(e))
    
    MOCK_PROJECTS.insert(0, project.model_dump())
    return project

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, project: ProjectModel, user=Depends(verify_admin)):
    if supabase:
        try:
            data = project.model_dump()
            # Remove fields that don't exist in Supabase projects_v2 table
            for field in ['imageUrl', 'githubUrl', 'report', 'shortDescription']:
                data.pop(field, None)
            # Ensure id is set from the URL path parameter
            data['id'] = project_id
            response = supabase.table("projects_v2").update(data).eq("id", project_id).execute()
            return response.data[0] if response.data else data
        except Exception as e:
            print(f"UPDATE ERROR: {str(e)}")
            if "imageUrl" in str(e):
                 return data
            raise HTTPException(status_code=400, detail=str(e))
    
    for i, p in enumerate(MOCK_PROJECTS):
        if p.get('id') == project_id:
            MOCK_PROJECTS[i] = project.model_dump()
            return MOCK_PROJECTS[i]
    raise HTTPException(status_code=404, detail="Project not found")

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, user=Depends(verify_admin)):
    print(f"Deleting project {project_id}...")
    if supabase:
        try:
            # Delete from v2 table
            response = supabase.table("projects_v2").delete().eq("id", project_id).execute()
            print(f"Delete result: {response}")
            return {"status": "success"}
        except Exception as e:
            print(f"Delete failed: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    global MOCK_PROJECTS
    MOCK_PROJECTS = [p for p in MOCK_PROJECTS if p.get('id') != project_id]
    return {"status": "success"}

@app.post("/api/projects/reorder")
async def reorder_projects(order_data: List[dict], user=Depends(verify_admin)):
    """
    Expects a list of {"id": "...", "display_order": ...}
    """
    if supabase:
        try:
            for item in order_data:
                proj_id = item.get("id")
                order = item.get("display_order")
                if proj_id is not None and order is not None:
                    supabase.table("projects_v2").update({"display_order": order}).eq("id", proj_id).execute()
            return {"status": "success"}
        except Exception as e:
            print(f"REORDER ERROR: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
    
    # Update MOCK_PROJECTS for consistency if no Supabase
    for item in order_data:
        for p in MOCK_PROJECTS:
            if p.get('id') == item.get('id'):
                p['display_order'] = item.get('display_order')
    return {"status": "success"}

@lru_cache(maxsize=1)
@app.get("/api/categories")
async def get_categories():
    if supabase:
        try:
            response = supabase.table("categories").select("*").execute()
            if response.data:
                return [c['name'] for c in response.data]
        except:
            pass
    return DEFAULT_CATEGORIES

# Internal function to clear category cache
def clear_category_cache():
    get_categories.cache_clear()

@app.post("/api/categories")
async def add_category(category: dict, user=Depends(verify_admin)):
    name = category.get('name')
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    if supabase:
        try:
            supabase.table("categories").insert({"name": name}).execute()
            get_categories.cache_clear()
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    if name not in DEFAULT_CATEGORIES:
        DEFAULT_CATEGORIES.append(name)
    return {"status": "success"}

@app.delete("/api/categories/{name}")
async def delete_category(name: str, user=Depends(verify_admin)):
    if supabase:
        try:
            supabase.table("categories").delete().eq("name", name).execute()
            get_categories.cache_clear()
            return {"status": "success"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    global DEFAULT_CATEGORIES
    DEFAULT_CATEGORIES = [c for c in DEFAULT_CATEGORIES if c != name]
    return {"status": "success"}

@app.get("/api/settings")
async def get_settings():
    return get_persisted_settings()

@app.post("/api/settings")
async def update_settings(settings: SettingsModel, user=Depends(verify_admin)):
    save_persisted_settings(settings.model_dump())
    return {"status": "success"}

@app.get("/api/admin/vault")
async def get_vault(user=Depends(verify_admin)):
    return get_persisted_vault()

@app.post("/api/admin/vault")
async def update_vault(vault_data: List[dict], user=Depends(verify_admin)):
    save_persisted_vault(vault_data)
    return {"status": "success"}

# Push Subscriptions
SUBSCRIPTIONS_FILE = Path(__file__).parent / "subscriptions.json"

def get_subscriptions():
    if SUBSCRIPTIONS_FILE.exists():
        try:
            with open(SUBSCRIPTIONS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return []

def save_subscription(sub):
    subs = get_subscriptions()
    # Avoid duplicates
    if not any(s['endpoint'] == sub['endpoint'] for s in subs):
        subs.append(sub)
        with open(SUBSCRIPTIONS_FILE, "w") as f:
            json.dump(subs, f)

@app.post("/api/push/subscribe")
async def subscribe(sub: PushSubscriptionModel):
    save_subscription(sub.model_dump())
    return {"status": "success"}

@app.get("/api/push/vapid-public-key")
async def get_vapid_key():
    # Use a fixed key for this environment or let user provide one
    # If not set, we'll return a placeholder or a generated one
    return {"public_key": os.getenv("VAPID_PUBLIC_KEY", "BJ7q6N_Zk4R4H_4R_4-Oq-u-Q-o-P-L-L-K-J-I-H-G-F-E-D-C-B-A")} # This is a placeholder

def send_push_notification(title, body):
    if not webpush:
        print("pywebpush not installed, skipping push")
        return
        
    subscriptions = get_subscriptions()
    vapid_private_key = os.getenv("VAPID_PRIVATE_KEY")
    
    if not vapid_private_key:
        print("VAPID_PRIVATE_KEY not set, skipping push")
        return

    vapid_claims = {"sub": "mailto:admin@kryonex.dev"}
    
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info=subscription,
                data=json.dumps({"title": title, "body": body}),
                vapid_private_key=vapid_private_key,
                vapid_claims=vapid_claims
            )
        except Exception as ex:
            print("Web Push Error: ", str(ex))

# Server entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
