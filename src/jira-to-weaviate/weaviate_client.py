# uvicorn fastapi_server:app --host 0.0.0.0 --port 5000 --reload


import weaviate
from weaviate.auth import AuthApiKey
import openai
import os
import json
import numpy as np
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# print("1")

# Weaviate & OpenAI API Keys
WEAVIATE_API_URL = os.getenv("WEAVIATE_API_URL")
WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI & Weaviate
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
client = weaviate.Client(
    additional_headers={"X-OpenAI-Api-Key": OPENAI_API_KEY},
    url=WEAVIATE_API_URL,
    auth_client_secret=AuthApiKey(WEAVIATE_API_KEY) if WEAVIATE_API_KEY else None
)

# Logging setup
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
# print("2")


# Define Weaviate Schema for Jira Tickets
def add_weaviate_schema():
    schema = {
        "classes": [
            {
                "class": "JiraTicketNew",
                "description": "Stores Jira ticket details",
                "vectorizer": "none",  # We provide our own embeddings
                "properties": [
                    {"name": "ticket_id", "dataType": ["string"]},
                    {"name": "key", "dataType": ["string"]},
                    {"name": "summary", "dataType": ["text"]},
                    {"name": "description", "dataType": ["text"]},
                    {"name": "status", "dataType": ["string"]},
                    {"name": "assign", "dataType": ["string"], },
                    {"name": "created_at", "dataType": ["string"]},
                    {"name": "update", "dataType": ["string"]},
                    {"name": "link", "dataType":["string"]},
                    {"name": "issuetype", "dataType":["string"]},
                    {"name": "storypoint", "dataType":["string","number"]},
                    {"name": "sprint", "dataType":["array","string"]},
                    {"name": "rootcause", "dataType":["string"]},
                ]
            }
        ]
    }

    existing_schema = client.schema.get()
    if "classes" in existing_schema and any(cls["class"] == "JiraTicketNew" for cls in existing_schema["classes"]):
        logging.info("JiraTicketNew schema already exists in Weaviate.")
    else:
        client.schema.create(schema)
        logging.info("JiraTicketNew schema added to Weaviate.")

# print("3")
# Generates an embedding using OpenAI
def generate_embedding(text: str):
    try:
        #  Ensure text is a string, not a list
        if isinstance(text, list):
            text = " ".join(text)  # Convert list to a single string

        if not isinstance(text, str) or not text.strip():
            logging.error(f" Invalid input for embedding: {text}")
            return [[0.0] * 1536]  # Return a single zero-vector

        # Trim text to 8000 characters to avoid exceeding OpenAI token limits
        # text = text[:8000]

        response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=[text]  # Pass a single string, not a list
        )

        embedding = response.data[0].embedding
        return  np.array(embedding, dtype=np.float32).tolist()  # Return the correct embedding

    except Exception as e:
        logging.error(f" Error generating embedding: {e}")
        return [[0.0] * 1536]  # Return a single zero-vector if OpenAI fails

# print("4")

# Stores Jira tickets in Weaviate in batches
# async def store_tickets_batch(tickets):
#     try:
#         with client.batch(batch_size=500) as batch:
#             for ticket in tickets:
#                 text_to_embed = f"{ticket.get('summary', '')}. {ticket.get('description', '')}"
#                 embedding = generate_embedding(text_to_embed)

#                 # Log and verify embedding format
#                 if not isinstance(embedding, list) or not all(isinstance(num, float) for num in embedding):
#                     logging.error(f" Invalid embedding format for ticket {ticket.get('ticket_id')} → {type(embedding)}")
#                     embedding = [0.0] * 1536  # Ensure it's a flat list

#                 batch.add_data_object(
#                     {
#                         "ticket_id": str(ticket.get("ticket_id")),
#                         "key": ticket.get("key"),
#                         "summary": ticket.get("summary"),
#                         "description": ticket.get("description"),
#                         "status": ticket.get("status"),
#                         "assign": ticket.get("assign"),
#                         "created_at": ticket.get("created_at"),
#                         "update": ticket.get("update"),
#                     },
#                     class_name="JiraTicket",
#                     vector=embedding  #  Correctly formatted embedding
#                 )

#         logging.info(f" Successfully stored {len(tickets)} tickets in Weaviate")

#     except Exception as e:
#         logging.error(f" Error storing tickets: {e}", exc_info=True)



async def store_tickets_batch(tickets):
    try:
        with client.batch(batch_size=500) as batch:
            if not tickets:
                print("No tickets to store in Weaviate")
            else:
                for ticket in tickets:
                    # Convert entire ticket JSON to a string
                    text_to_embed = json.dumps(ticket, ensure_ascii=False)

                    # Generate embedding for the entire ticket
                    embedding = generate_embedding(text_to_embed)
                    # print(embedding)

                    # Validate embedding format
                    if not isinstance(embedding, list) or not all(isinstance(num, float) for num in embedding):
                        logging.error(f"Invalid embedding format for ticket {ticket.get('ticket_id')} → {type(embedding)}")
                        embedding = [0.0] * 1536  # Ensure valid fallback embedding
                    # Store ticket in Weaviate
                    batch.add_data_object(
                        ticket,  # Stores entire ticket JSON
                        class_name="JiraSlack2",
                        vector=embedding  # Store entire ticket embedding
                    )
                    logging.info(ticket)

            logging.info(f"Successfully stored {len(tickets)} tickets in Weaviate")
    except Exception as e:
        logging.error(f"Error storing tickets: {e}", exc_info=True)
        


# store_tickets_batch([{
#       "id": "158137",
#       "key": "TABPEM-1650",
#       "summary": "Request for Repayment schedule",
#       "description": "By (User's email): kunal.rane80@gmail.com\nHi Team,\nRequest you to kindly send the repaymnet schedule for the below mentioned deals. as the portfolio is not giving entire schedule. Till its getting fixed by the tech team, need the resolution.\nClient email id :  Kunalrane80@gmail.com\n\n--\n  \nNote: To add internal comments, specify /i in the start.  Ex: /i - Test comment which is meant for internal use.",
#       "status": "Waiting for support",
#       "assign": "Nitish Kumar",
#       "created_at": "2025-02-13T05:02:39.754Z",
#       "update": "2025-02-13T05:05:03.398Z"
#     },])
# print("5")

# Add schema before storing tickets
# add_weaviate_schema()


# Use the new OpenAI client initialization
def search_tickets(query):
    try:
        # Ensure embedding is a flat list
        embedding_vector = generate_embedding(query)  # This should return a flat list

        response = (
            client.query.get(
                "JiraSlack2",
                ["ticket_id", "key", "summary","description", "status", "assign", "update", "created_at","link", "issuetype","storypoint", "sprint", "rootcause"]
            )
            .with_near_vector({"vector": embedding_vector})  # Use flat list
            # .with_limit(50)
            # .with_after("cursor_id")
            .do()
        )

        # Extract and format results
        results = response.get('data', {}).get('Get', {}).get('JiraSlack2', [])
        
        if not results:
            return "No relevant Jira tickets found."

        formatted_results = "\n".join([
            (
                f"  Ticket ID: {item.get('ticket_id', 'Not Available')}\n"
                f"- Key: {item.get('key', 'N/A')}\n"
                f"  Summary: {item.get('summary', 'No Summary Provided')}\n"
                f"  Description: {item.get('description', 'N/A') if item.get('description') else 'Not Available'}\n"
                f"  Status: {item.get('status', 'Pending')}\n"
                f"  Assigned To: {item.get('assign', 'Unassigned')}\n"
                f"  Last Updated: {item.get('update', 'Not Updated yet')}\n"
                f"  Created At: {item.get('created_at', 'Unknown')}\n"
                f"  Jira Ticket Link: {item.get('link', 'Ticket_Link')}\n"
                f"  Issue Type: {item.get('issuetype', 'Not Specified')}\n"
                f"  Story Point: {str(item.get('storypoint')) if item.get('storypoint') else 'Not Estimated'}\n"
                f"  Sprint: {', '.join(item.get('sprint', ['No Sprint Assigned'])) if isinstance(item.get('sprint'), list) else item.get('sprint', 'No Sprint Assigned')}\n"
                f"  Root Cause {item.get('rootcause', 'No Root Cause Identified') if item.get('rootcause') else 'No Root Cause Identified'}\n"
            )
            for item in results
        ])

        return formatted_results

    except Exception as e:
        return f"Error searching tickets: {str(e)}"

# print(search_tickets("What are the tasks that are still not completed?"))

# def generate_response(context, user_query):
#     # Uses RAG by providing retrieved Jira ticket data as context to OpenAI's GPT-4.
#     openai.api_key = OPENAI_API_KEY 

#     # Check if the user is trying to fetch entire ticket data
#     restricted_queries = ["fetch all tickets", "get complete jira data", "retrieve entire database", "list all tickets"]
#     if any(restricted_phrase in user_query.lower() for restricted_phrase in restricted_queries):
#         return " Sorry, I can't provide the entire Jira ticket database."
    
#     # *Restrict response if no relevant data is found in Weaviate*
#     if not context:
#         return "Sorry i can't provide you this but Mean while you ask question related to the Jira Tickets."

#     # Call OpenAI's GPT-4o mini with context and user query
#     try:
#         client = openai.OpenAI()
#         response = client.chat.completions.create(
#             model="gpt-4o-mini",
#             messages=[
#                 {"role": "system", "content": "You are an AI assistant that ONLY provides Jira ticket information. If the query is unrelated, respond with 'I am restricted to Jira tickets only.'"},
#                 {"role": "user", "content": f"User Query: {user_query}\n\nRelevant Tickets:\n{context}"}
#             ]
#         )

#         return response.choices[0].message.content
#     except Exception as e:
#         return f"Error generating AI response: {str(e)}"

def generate_response(context, user_query):


    # Uses RAG by providing retrieved Jira ticket data as context to OpenAI's GPT-4.
    openai.api_key = OPENAI_API_KEY 

    # Check if the user is trying to fetch entire ticket data
    restricted_queries = ["fetch all tickets", "get complete jira data", "retrieve entire database", "list all tickets"]
    if any(restricted_phrase in user_query.lower() for restricted_phrase in restricted_queries):
        return "For security and performance reasons, I can't provide the entire Jira ticket database."
    
    # Restrict response if no relevant data is found in Weaviate
    if not context:
        return "Sorry I can't provide you this but meanwhile you can ask questions related to the Jira Tickets."

    # Determine if the user is specifically asking for ticket IDs or keys
    is_asking_for_ids = any(phrase in user_query.lower() for phrase in 
                          ["ticket id", "ticket number", "jira id", "ticket key", "jira key"])
    
    # Call OpenAI's GPT-4o mini with context and user query
    try:
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """You are a JIRA ticket assistant for Slack that helps users with JIRA ticket information. First analyse the retrieved ticket details, then give responses should be accurate, polite, and human-like.  

                Follow these rules:
                 **General Guidelines:**  
                1. *Understand the User Query Before Responding*  
                    - Determine if the user is asking for specific tickets which matches the defined properties (by ID), a summary, general status updates , sprint , issue type, story point.  
                    - Prioritize *relevant* tickets based on query keywords (e.g., "Adhoc tickets related to Demat" or "Incidents related to demat").  
                    - give all the related tickets according to the user querry present in the database.
                    - If the query is unclear, ask a *clarifying question* instead of guessing.  

                2. *Filter and Sort Tickets Correctly*  
                    - *Strictly filter tickets by the requested date ,month and year range.*  
                    - "Last month" → Include only tickets created or updated  in the previous month of the current year only.  
                    - Ignore old tickets unless explicitly requested.  
                    - *Sort results by last updated date (Descending).*  

                
                    *Example:*  
                    List adhoc tickets related to Demat from Jan 2025?  
                    - *Last Updated:* January 21, 2025  
                    - *Created At:* January 31, 2024  
                        (Either the updated date or the created date should match the query date.)  

                3. *Maintain a Friendly, Professional Tone*  
                    - Avoid robotic responses.  
                    - Use natural phrasing like:  
                    -  "Here’s what I found for you!"  
                    -  "Looks like I made a small mistake earlier—let me correct that!"  

                4. *Format Responses Clearly*  
                    - Use Markdown (**bold**, - bullet points, etc.) for readability.  
                    - Structure responses as:  

                    *Ticket List Example:*  
                    - *ID:* ABC-123 | *Summary:* Issue with login  
                    - *Status:* In Progress | *Assigned To:* John Doe  
                    - *Last Updated:* Feb 22, 2025 | *Created:* Jan 15, 2025  
                    - *Description:* User unable to log in.  
                    - *[View Ticket](https://jira.example.com/browse/ABC-123)* 
                 
                 5. *Strictly follow the user's query criteria:*
                    If the query specifies an issue type (e.g., Incident, Bug, Task), filter results based on the Issue Type property of the ticket, not from the ticket summary.
                    Example: If asked for an "Incident" related to KYC, return only tickets where Issue Type = Incident and not tickets where "incident" is just a word in the summary (e.g., "RCA on Aadhaar OTP verification incident" should not be considered an incident).

                    

                    Valid Issue Types:

                    The issue type of a ticket can only be one of the following:
                    Adhoc, Bug, Epic, Incident, Spike, Task, Story, Tech Task.
                    Always verify the Issue Type property before responding.

                    **Don't:**
                    1. Do not provide extra responses beyond what the user explicitly requested.
                    (Example: If asked for a demat ticket with only incident as the issue type, return only those tickets which as incident as issue type and issue type is a key and it's value is incident . Do not include demat tickets with other issue types.)
                    
                    2. Do not include irrelevant issue types:

                    If the user asks for demat tickets with only "Incident" as the issue type, return only those tickets. Do not include demat tickets with other issue types (e.g., Bug, Task, or Epic).

                If no relevant tickets exist, say:  
                "No tickets match your criteria. Try adjusting the date range or category."  
                        
                """  },
                {"role": "user", "content": f"""
                User Query: {user_query}
                
                Should include ticket IDs and keys: {"Yes" if is_asking_for_ids else "No"}
                
                Relevant Tickets:
                {context}
                """}
            ]
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating AI response: {str(e)}"

        # return response.choices[0].message.content
    except Exception as e:
        return f"Error generating AI response: {str(e)}"