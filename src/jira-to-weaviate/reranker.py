import openai
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Ensure your API key is set correctly
openai.api_key = OPENAI_API_KEY  

def rerank(tickets, query):
    try:
        # Create prompt for reranking
        prompt = f"User Query: {query}\n\nRelevant Tickets:"
        for ticket in tickets:
            if ticket in tickets:
                prompt += f"\n- ID: {ticket['ticket_id']} | Summary: {ticket['summary']} | Sprint: {ticket['sprint']}"
        
        # Use OpenAI API for reranking
        response =  openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that reranks Jira ticket summaries based on the user's query."},
                {"role": "user", "content": prompt}
            ]
        )

        ranked_text = response.choices[0].message.content.strip()
        ranked_tickets = []

        # Match ranked summaries to original tickets
        for summary in ranked_text.split("\n"):
            summary = summary.strip("- ")
            for ticket in tickets:
                if ticket['summary'] == summary and ticket not in ranked_tickets:
                    ranked_tickets.append(ticket)
                    break

        return ranked_tickets
    except Exception as e:
        print(f"Error during reranking: {e}")
        return tickets  # Return original tickets if reranking fails
