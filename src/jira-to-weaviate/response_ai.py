from weaviate_client import search_tickets, generate_response

def main():
    retrieved_data = ""
    while True:
        user_query = input("\nEnter your Jira-related query (or type 'exit' to quit): ")
        
        if user_query.lower() == 'exit':
            print("Exiting the Jira chatbot. Goodbye!")
            break
        
        # Fetch Jira tickets using Weaviate (RAG retrieval)
        retrieved_data += search_tickets(user_query)
        
        if retrieved_data == "No relevant Jira tickets found.":
            print("\nAI Message: No relevant Jira tickets found. Please try again.")
            continue
        
        # Generate AI response using retrieved tickets as context
        ai_response = generate_response(retrieved_data, user_query)
        
        # Display AI response in terminal
        print(f"\nAI Message: {ai_response}")

if __name__ == "__main__":
    main()
