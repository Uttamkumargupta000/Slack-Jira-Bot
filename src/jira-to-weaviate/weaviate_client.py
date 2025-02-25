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
        #  Ensure `text` is a string, not a list
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
                        class_name="JiraTicketNew",
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

        # response = (
        #     client.query.get(
        #         "JiraSlack",
        #         ["ticket_id", "key", "summary","description", "status", "assign", "update", "created_at","link", "issuetype","storypoint", "sprint", "rootcause"]
        #     )
        #     .with_near_vector({"vector": embedding_vector})  # Use flat list
        #     # .with_limit(50)
        #     # .with_after("cursor_id")
        #     .do()
        # )

        # Hybrid search 
        response = (
            client.query.get(
                "JiraSlack",
                ["ticket_id", "key", "summary", "description", "status", "assign", "update", "created_at", "link", "issuetype", "storypoint", "sprint", "rootcause"]
            )
            .with_hybrid(
                query="Jira issue not updating",  # Your query text
                vector=embedding_vector,  # Your generated embedding vector
                alpha=0.8  # Balance between keyword search (BM25) and vector similarity (0.5 = equal weight)
            )
            .with_limit(10)  # Limit results
            .do()
        )


        # Extract and format results
        results = response.get('data', {}).get('Get', {}).get('JiraSlack', [])
        
        if not results:
            return "No relevant Jira tickets found."

        # formatted_results = "\n".join([
        #     (
        #         f"  *Ticket ID:* {item.get('ticket_id', 'Not Available')}\n"
        #         f"- *Key:* {item.get('key', 'N/A')}\n"
        #         f"  *Summary:* {item.get('summary', 'No Summary Provided')}\n"
        #         f"  *Description:* {item.get('description', 'N/A') if item.get('description') else 'Not Available'}\n"
        #         f"  *Status:* {item.get('status', 'Pending')}\n"
        #         f"  *Assigned To:* {item.get('assign', 'Unassigned')}\n"
        #         f"  *Last Updated:* {item.get('update', 'Not Updated yet')}\n"
        #         f"  *Created At:* {item.get('created_at', 'Unknown')}\n"
        #         f"  *Jira Ticket Link:* {item.get('link', 'Ticket_Link')}\n"
        #         f"  *Issue Type:* {item.get('issuetype', 'Not Specified')}\n"
        #         f"  *Story Point:* {str(item.get('storypoint')) if item.get('storypoint') else 'Not Estimated'}\n"
        #         f"  *Sprint:* {', '.join(item.get('sprint', ['No Sprint Assigned'])) if isinstance(item.get('sprint'), list) else item.get('sprint', 'No Sprint Assigned')}\n"
        #         f"  *Root Cause* {item.get('rootcause', 'No Root Cause Identified') if item.get('rootcause') else 'No Root Cause Identified'}\n"
        #     )

        # 033[1m → Turns on bold formatting.
        # 033[0m → Resets formatting back to normal.
        formatted_results = "\n".join([
            (
                f"\033[1m  Ticket ID:\033[0m {item.get('ticket_id', 'Not Available')}\n"
                f"\033[1m- Key:\033[0m {item.get('key', 'N/A')}\n"
                f"\033[1m  Summary:\033[0m {item.get('summary', 'No Summary Provided')}\n"
                f"\033[1m  Description:\033[0m {item.get('description', 'N/A') if item.get('description') else 'Not Available'}\n"
                f"\033[1m  Status:\033[0m {item.get('status', 'Pending')}\n"
                f"\033[1m  Assigned To:\033[0m {item.get('assign', 'Unassigned')}\n"
                f"\033[1m  Last Updated:\033[0m {item.get('update', 'Not Updated yet')}\n"
                f"\033[1m  Created At:\033[0m {item.get('created_at', 'Unknown')}\n"
                f"\033[1m  Jira Ticket Link:\033[0m {item.get('link', 'Ticket_Link')}\n"
                f"\033[1m  Issue Type:\033[0m {item.get('issuetype', 'Not Specified')}\n"
                f"\033[1m  Story Point:\033[0m {str(item.get('storypoint')) if item.get('storypoint') else 'Not Estimated'}\n"
                f"\033[1m  Sprint:\033[0m {', '.join(item.get('sprint', ['No Sprint Assigned'])) if isinstance(item.get('sprint'), list) else item.get('sprint', 'No Sprint Assigned')}\n"
                f"\033[1m  Root Cause:\033[0m {item.get('rootcause', 'No Root Cause Identified') if item.get('rootcause') else 'No Root Cause Identified'}\n"
            )
            # print(formatted_results)
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
    
#     # **Restrict response if no relevant data is found in Weaviate**
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
        return "Sorry, I can't provide the entire Jira ticket database."
    
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
                {"role": "system", "content": """You are a JIRA ticket assistant that helps users with JIRA ticket information. Your responses should be *accurate, polite, and human-like*.  

                Follow these rules:  

                1. *Always filter tickets strictly based on the user’s date request.*  
                - If the user asks for "last month," only return tickets created or last updated in the previous month.  
                - Ignore older tickets unless explicitly asked.  

                2. *Acknowledge mistakes and respond in a conversational way.*  
                - If you previously provided incorrect tickets, first acknowledge the mistake and apologize before giving the correct list.  

                3. *Understand the query context before listing tickets.*  
                - Prioritize relevant issue types and categories (e.g., "Adhoc tickets related to Demat").  
                - Avoid returning generic or irrelevant results.  

                4. *Maintain a professional but friendly tone.*  
                - Avoid robotic responses. Use natural phrasing like "I see that I made a mistake earlier..." or "Here's what I found for you!"  

                5. *Format responses clearly:*  
                - List tickets in *descending order by last updated date*.  
                - Provide *ticket ID, summary, description, status, assigned person, last updated, created date, and a link*.  
                - Keep responses concise and readable.  

                6. *Return a maximum of 10 tickets at a time.*  
                - If more tickets exist, mention it and offer to provide additional results.  

                """},
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

