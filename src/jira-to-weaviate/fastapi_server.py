# uvicorn fastapi_server:app --host 0.0.0.0 --port 5001 --reload


from fastapi import FastAPI, HTTPException, Request
from feedback import router as feedback_router
from weaviate_client import store_tickets_batch, search_tickets, generate_response
from pydantic import BaseModel
from pydantic import Field
from typing import List, Union,Optional
import asyncio
import logging

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = FastAPI()
app.include_router(feedback_router)

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
    storypoint: Optional[Union[str, float]] = Field(default=None, description="Story point can be a float or a descriptive string")
    sprint: List[str] = Field(default_factory=lambda: ["No Sprint Assigned"], description="List of sprints")
    rootcause: str = "No Root Cause Provided"


# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "FastAPI is running"}


    # Convert invalid property names into valid Weaviate GraphQL names.
def sanitize_property_name(value: Union[str, float, None]) -> Union[str, float, None]:
    if isinstance(value, str):
        return value.replace(" ", "_").replace("-", "_")
    elif isinstance(value, (int, float)):
        return value  # Directly return if it's a number
    return value


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
                "description": ticket.description,
                "status": ticket.status,
                "assign": ticket.assign,
                "created_at": ticket.created_at,
                "update": ticket.update,
                "link": ticket.link,
                "issuetype": ticket.issuetype,
                "storypoint": sanitize_property_name(ticket.storypoint) if ticket.storypoint is not None else None,
                "sprint": [sanitize_property_name(s) for s in ticket.sprint] if ticket.sprint else [],
                "rootcause": ticket.rootcause
            }
            for ticket in tickets
        ]

        print(tickets_data)
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
        retrived_data = search_tickets(query_text)

        if not retrived_data :
            return {"response": "No relevant Jira Ticket found Please refine your query"}
        
        # generating ai response 

        ai_response = generate_response(retrived_data, request.query)

        return {"response": ai_response}
    except Exception as e:
        logging.error(f"Error processing query: {e}")

async def remove_old_query(query_text):
    await asyncio.sleep(100)
    processed_queryies.remove(query_text)