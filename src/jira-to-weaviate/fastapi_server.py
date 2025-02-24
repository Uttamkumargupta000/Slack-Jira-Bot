# uvicorn fastapi_server:app --host 0.0.0.0 --port 5000 --reload


from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import List, Union
import asyncio
import logging
from weaviate_client import store_tickets_batch, search_tickets, generate_response

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
    link: str
    issuetype: str
    storypoint: Union[str, float] = "Not Estimated"
    sprint: List[str] = ["NoSprint_Assigned"]
    rootcause: str = "No_Root_Cause_Provided"


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "FastAPI is running"}


def sanitize_property_name(value: str) -> str:
    # Convert invalid property names into valid Weaviate GraphQL names.
    if isinstance(value, str):
        return value.replace(" ", "_").replace(" ", "-")  # Convert spaces & hyphens to underscores
    return value  # Return as-is if it's not a string


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
                "ticket_id": sanitize_property_name(ticket.id),
                "key": sanitize_property_name(ticket.key),
                "summary": sanitize_property_name(ticket.summary),
                "description": sanitize_property_name(ticket.description),
                "status": sanitize_property_name(ticket.status),
                "assign": sanitize_property_name(ticket.assign),
                "created_at": sanitize_property_name(ticket.created_at),
                "update": sanitize_property_name(ticket.update),
                "link": sanitize_property_name(ticket.link),
                "issuetype": sanitize_property_name(ticket.issuetype),
                "storypoint": sanitize_property_name(str(ticket.storypoint)),  # Convert storypoint to string if needed
                "sprint": [sanitize_property_name(s) for s in ticket.sprint],  # Sanitize each sprint
                "rootcause": sanitize_property_name(ticket.rootcause)
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
class UserQuery(BaseModel):
    query: str

processed_queryies = set()
@app.post("/query")

async def process_query(request: UserQuery):
    query_text= request.query.strip().lower()

    if query_text in processed_queryies:
        logging.info(f"Duplicate query detected : {query_text}, Ignoring ")
        return {"response": "Duplicate request detected No additionl Response provided"}
    
    # removed the old queryies
    processed_queryies.add(query_text)
    asyncio.create_task(remove_old_query(query_text))

    try:
        logging.info(f"Received query: {request.query}")

        # retrived jira ticket using weaviate
        retrived_data = search_tickets(request.query)

        if retrived_data == "NO relevant jira tickets found.":
            return {"response": "No relevant Jira Ticket found Please refine your query"}
        
        # generating ai response 

        ai_response = generate_response(retrived_data, request.query)

        return {"response": ai_response}
    except Exception as e:
        logging.error(f"Error processing query: {e}")

async def remove_old_query(query_text):
    await asyncio.sleep(100)
    processed_queryies.remove(query_text)