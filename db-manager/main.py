from sqlalchemy import create_engine
import os
from fastapi import FastAPI

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://povuser:povpassword@postgres:5432/povdb")

engine = create_engine(DATABASE_URL)

app = FastAPI()

@app.get("/db-health")
def db_health():
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

# TODO: Add models and Alembic migration logic
if __name__ == "__main__":
    print("DB Manager ready. Connects to:", DATABASE_URL)
