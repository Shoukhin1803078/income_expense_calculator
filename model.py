from enum import Enum
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"

class Transaction(BaseModel):
    id: str  # UUID
    type: TransactionType
    amount: float
    category: str
    date: date
    note: Optional[str] = None
    created_at: datetime = datetime.now()

class ChatRequest(BaseModel):
    text: str
