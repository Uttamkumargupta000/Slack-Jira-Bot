from weaviate_client import client
import time

def store_ticket(ticket_data):
    # Store a Jira ticket in Weaviate
    with client.batch as batch:
        batch.add_data_object(
            data_object=ticket_data,
            class_name="JiraTicketNew"  # Weaviate class name
        )
    print(" Ticket stored successfully in Weaviate!")

def wait_until_stored(ticket_data):
    # Wait until data is stored successfully
    stored = False
    while not stored:
        try:
            store_ticket(ticket_data)
            stored = True
        except Exception as e:
            print(f" Error storing ticket: {e}, retrying in 2s...")
            time.sleep(2)
