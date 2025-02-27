import torch

def rerank(tickets, query):
    pairs = [(query, ticket['summary']) for ticket in tickets if 'summary' in ticket]
    inputs = tokenizer(pairs, padding=True, truncation=True, return_tensors="pt")
    scores = model(**inputs).logits.squeeze().tolist()
    return [x for _, x in sorted(zip(scores, tickets), reverse=True)]