from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List
import asyncio
import logging
from weaviate_client import store_tickets_batch

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()

# Define Data Model for Jira Tickets
class JiraTicket(BaseModel):
    id: str
    key: str
    summary: str
    description: str = "No description provided"
    status: str
    assign: str
    created_at: str
    update: str

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "FastAPI is running"}

# Endpoint to receive Jira tickets and store them in Weaviate
@app.post("/store-tickets")
async def store_tickets(request: Request, tickets: List[JiraTicket]):
    try:
        logging.info(f"Received {len(tickets)} tickets for processing...")

        raw_body = await request.json()
        logging.info(f"Received raw json : {raw_body}")

        # Convert tickets to dict format required for Weaviate
        tickets_data = [
            {
                "ticket_id": ticket.id,
                "key": ticket.key,
                "summary": ticket.summary,
                "description": ticket.description or "No description provided",
                "status": ticket.status,
                "assign": ticket.assign,
                "created_at": ticket.created_at,
                "update": ticket.update
            }
            for ticket in tickets
        ]

        # Store data asynchronously to prevent blocking
        asyncio.create_task(store_tickets_batch(tickets_data))

        return {"message": f"Processing started for {len(tickets)} Jira tickets!"}
    
    except Exception as e:
        logging.error(f"Error processing tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# User query from the chatgpt to get 



