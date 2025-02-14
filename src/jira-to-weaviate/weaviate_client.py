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
                "class": "JiraTicket",
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
                ]
            }
        ]
    }

    existing_schema = client.schema.get()
    if "classes" in existing_schema and any(cls["class"] == "JiraTicket" for cls in existing_schema["classes"]):
        logging.info("JiraTicket schema already exists in Weaviate.")
    else:
        client.schema.create(schema)
        logging.info("JiraTicket schema added to Weaviate.")

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
        text = text[:8000]

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
async def store_tickets_batch(tickets):
    try:
        with client.batch(batch_size=500) as batch:
            for ticket in tickets:
                text_to_embed = f"{ticket.get('summary', '')}. {ticket.get('description', '')}"
                embedding = generate_embedding(text_to_embed)

                # Log and verify embedding format
                if not isinstance(embedding, list) or not all(isinstance(num, float) for num in embedding):
                    logging.error(f" Invalid embedding format for ticket {ticket.get('ticket_id')} → {type(embedding)}")
                    embedding = [0.0] * 1536  # Ensure it's a flat list

                batch.add_data_object(
                    {
                        "ticket_id": str(ticket.get("ticket_id")),
                        "key": ticket.get("key"),
                        "summary": ticket.get("summary"),
                        "description": ticket.get("description"),
                        "status": ticket.get("status"),
                        "assign": ticket.get("assign"),
                        "created_at": ticket.get("created_at"),
                        "update": ticket.get("update"),
                    },
                    class_name="JiraTicket",
                    vector=embedding  #  Correctly formatted embedding
                )

        logging.info(f" Successfully stored {len(tickets)} tickets in Weaviate")

    except Exception as e:
        logging.error(f" Error storing tickets: {e}", exc_info=True)



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

# 




# Use the new OpenAI client initialization
def search_tickets(query):
    try:
        # Ensure embedding is a flat list
        embedding_vector = generate_embedding(query)  # This should return a flat list

        response = (
            client.query.get(
                "JiraTicket",
                ["ticket_id","description", "status", "summary", "assign", "key", "update", "created_at"]
            )
            .with_near_vector({"vector": embedding_vector})  # Use flat list
            .with_limit(5)
            .do()
        )

        # print(response)  # Debugging step

        # Extract and format results
        results = response.get('data', {}).get('Get', {}).get('JiraTicket', [])
        
        if not results:
            return "No relevant Jira tickets found."

        formatted_results = "\n".join([
            (f"- **Ticket_id:** {item.get('ticket_id', 'N/A')}\n"
             f"- **Key:** {item.get('key', 'N/A')}\n"
             f"  **Summary:** {item.get('summary', 'N/A')}\n"
             f"  **Description:** {item.get('description', 'N/A')}\n"
             f"  **Status:** {item.get('status', 'N/A')}\n"
             f"  **Assigned To:** {item.get('assign', 'Unassigned')}\n"
             f"  **Last Updated:** {item.get('update', 'Unknown')}\n"
             f"  **Created At:** {item.get('created_at', 'Unknown')}")
            for item in results
        ])

        return formatted_results

    except Exception as e:
        return f"Error searching tickets: {str(e)}"

# print(search_tickets("What are the tasks that are still not completed?"))

def generate_response(context, user_query):
    """
    Uses RAG by providing retrieved Jira ticket data as context to OpenAI's GPT-4.
    """
    openai.api_key = OPENAI_API_KEY  # Ensure API key is set

    # Call OpenAI's GPT-4o mini with context and user query
    try:
        client = openai.OpenAI()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an AI assistant providing Jira ticket updates."},
                {"role": "user", "content": f"User Query: {user_query}\n\nRelevant Tickets:\n{context}"}
            ]
        )

        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating AI response: {str(e)}"
