from fastapi import APIRouter
router = APIRouter()
feedback_db = []

@router.post("/feedback")
async def collect_feedback(feedback: dict):
    feedback_db.append(feedback)
    return {"message": "Thank you for your feedback!"}