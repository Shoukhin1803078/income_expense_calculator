from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
from datetime import date
from model import Transaction, TransactionType, ChatRequest
import storage
import ai_agent

app = FastAPI(title="Income Expense Tracker")

# Mount static files (Frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse('index.html')

# --- API Endpoints ---

@app.get("/api/transactions", response_model=List[Transaction])
def get_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    type: Optional[TransactionType] = None,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    user_id = x_user_id or "default_user"
    transactions = storage.load_data(user_id)
    
    # Filtering
    if start_date:
        transactions = [t for t in transactions if t.date >= start_date]
    if end_date:
        transactions = [t for t in transactions if t.date <= end_date]
    if type:
        transactions = [t for t in transactions if t.type == type]
        
    # Sort by date descending
    transactions.sort(key=lambda x: x.date, reverse=True)
    return transactions

@app.post("/api/transactions", response_model=Transaction)
def add_transaction(
    transaction: Transaction,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    user_id = x_user_id or "default_user"
    storage.add_transaction(transaction, user_id)
    return transaction

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    user_id = x_user_id or "default_user"
    storage.delete_transaction(transaction_id, user_id)
    return {"message": "Transaction deleted"}

@app.get("/api/summary")
def get_summary(x_user_id: Optional[str] = Header(None, alias="X-User-ID")):
    user_id = x_user_id or "default_user"
    transactions = storage.load_data(user_id)
    today = date.today()
    
    total_income = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
    total_expense = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
    balance = total_income - total_expense
    
    # Category breakdown (Expense)
    category_expense = {}
    for t in transactions:
        if t.type == TransactionType.EXPENSE:
            category_expense[t.category] = category_expense.get(t.category, 0) + t.amount

    # Time-based breakdowns
    daily_expense = {}  # "YYYY-MM-DD": amount
    monthly_expense = {} # "YYYY-MM": amount
    yearly_expense = {} # "YYYY": amount
    
    daily_income = {}
    monthly_income = {}
    yearly_income = {}

    for t in transactions:
        d_str = t.date.isoformat() # YYYY-MM-DD
        m_str = t.date.isoformat()[:7] # YYYY-MM
        y_str = t.date.isoformat()[:4] # YYYY
        
        if t.type == TransactionType.EXPENSE:
            daily_expense[d_str] = daily_expense.get(d_str, 0) + t.amount
            monthly_expense[m_str] = monthly_expense.get(m_str, 0) + t.amount
            yearly_expense[y_str] = yearly_expense.get(y_str, 0) + t.amount
        else:
            daily_income[d_str] = daily_income.get(d_str, 0) + t.amount
            monthly_income[m_str] = monthly_income.get(m_str, 0) + t.amount
            yearly_income[y_str] = yearly_income.get(y_str, 0) + t.amount
            
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "category_expense": category_expense,
        "breakdown": {
            "daily": {"income": daily_income, "expense": daily_expense},
            "monthly": {"income": monthly_income, "expense": monthly_expense},
            "yearly": {"income": yearly_income, "expense": yearly_expense}
        }
    }

@app.post("/api/chat")
def chat_transaction(
    request: ChatRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    user_id = x_user_id or "default_user"
    data = ai_agent.extract_transaction_data(request.text)
    
    if not data or not data.get("amount"):
        raise HTTPException(status_code=400, detail="Could not extract valid transaction data.")
    
    # Create Transaction object
    # AI might return date as string, Pydantic will handle parsing if it's ISO format
    try:
        new_transaction = Transaction(
            id=str(uuid.uuid4()),
            type=data["type"],
            amount=data["amount"],
            category=data["category"],
            date=data["date"], # Should be ISO YYYY-MM-DD from LLM
            note=data.get("note") or request.text
        )
        storage.add_transaction(new_transaction, user_id)
        return {
            "message": "Processed successfully",
            "data": new_transaction,
            "original_extraction": data
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Error saving transaction: {str(e)}")
