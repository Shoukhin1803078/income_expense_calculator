import json
import os
from typing import List, Optional
from datetime import date, datetime
from model import Transaction, TransactionType

DATA_DIR = "data"

# Helper to handle date serialization
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

def _get_user_file(user_id: str) -> str:
    # Sanitize user_id to prevent path traversal
    safe_id = "".join(c for c in user_id if c.isalnum() or c in "-_")
    if not safe_id:
        safe_id = "default_user"
    return os.path.join(DATA_DIR, f"{safe_id}.json")

def _ensure_data_dir(user_id: str):
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = _get_user_file(user_id)
    if not os.path.exists(file_path):
        with open(file_path, "w") as f:
            json.dump([], f)

def load_data(user_id: str) -> List[Transaction]:
    _ensure_data_dir(user_id)
    file_path = _get_user_file(user_id)
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
            return [Transaction(**item) for item in data]
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def save_data(transactions: List[Transaction], user_id: str):
    _ensure_data_dir(user_id)
    file_path = _get_user_file(user_id)
    with open(file_path, "w") as f:
        # Convert models to dicts, handling enums and dates
        json_data = [t.model_dump(mode='json') for t in transactions]
        json.dump(json_data, f, indent=2, cls=DateTimeEncoder)

def add_transaction(transaction: Transaction, user_id: str):
    transactions = load_data(user_id)
    transactions.append(transaction)
    save_data(transactions, user_id)

def delete_transaction(transaction_id: str, user_id: str):
    transactions = load_data(user_id)
    transactions = [t for t in transactions if t.id != transaction_id]
    save_data(transactions, user_id)
