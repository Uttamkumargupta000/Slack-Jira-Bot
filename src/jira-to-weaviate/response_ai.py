from weaviate_client import search_tickets, generate_response
import logging

# def main():

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def process_user_query(user_query: str) -> str:
    retrieved_data = ""
    logging.info(f"Processing query: {user_query}")

    retrieved_data = search_tickets(user_query)
    
    if retrieved_data == "No relevant Jira tickets found.":
        return "No relevant Jira tickets found. Please try again."
    
    ai_response = generate_response(retrieved_data, user_query)
    
    return ai_response


# if __name__ == "__main__":
#     process_user_query(user_query)
