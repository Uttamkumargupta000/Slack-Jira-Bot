from weaviate_client import search_tickets, generate_response
import logging

# def main():

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

async def process_user_query(user_query: str) -> str:
    try:
        retrieved_data = ""
        logging.info(f"Processing query: {user_query}")

        # fetched all ticket related to the user query
        retrieved_data = await search_tickets(user_query)
        
        if retrieved_data == "No relevant Jira tickets found.":
            return "No relevant Jira tickets found. Please try again."
        
        ai_response = await generate_response(retrieved_data, user_query)

        remaining_tickets = len(retrieved_data) - 10

        # If more than 10 tickets are found, append the link for the remaining tickets
        if len(retrieved_data) > 10:
            ai_response += f"\n\n🔗 [View Remaining {remaining_tickets} Tickets](https://jira.example.com/browse/ALLTICKETS)"

        return ai_response
    except Exception as e:
        logging.error(f"Error processing query: {str(e)}")
        return "Internal server error. Please try again later."


# if __name__ == "__main__":
#     process_user_query(user_query)
