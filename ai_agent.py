import os
import json
from datetime import date
from typing import Optional, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from dotenv import load_dotenv

load_dotenv()

# Initialize LLM with fallback strategy
# 1. Try OPENAI_API_KEY
# 2. Try GROQ_API_KEY
openai_key = os.getenv("OPENAI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

if openai_key:
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
    print("AI Agent: Using OpenAI (GPT-3.5)")
elif groq_key:
    # User requested qwen/qwen3-32b but it was decommissioned. 
    # Switching to Llama 3.3 70B (Versatile) for high performance.
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
    print("AI Agent: Using Groq (Llama 3.3 70B)")
else:
    # Fallback/Error state (will likely fail on invoke if no key)
    print("AI Agent: No API Key found (OpenAI or Groq). Chatbot will fail.")
    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0) # Default to error out nicely via LangChain


# Using LangChain's template syntax directly. 
# We use {{ doubled braces }} for JSON literals that LangChain should treat as text.
# We use {today} for the variable we will pass to invoke.
SYSTEM_PROMPT = """You are a helpful financial assistant for a personal income and expense tracker.
Your job is to extract structured data from natural language input.
The input can be in English, Bangla, or mixed (Banglish).

You need to extract the following fields:
- type: "income" or "expense"
- amount: number (e.g., 500.0)
- category: string (short category name, e.g., "Food", "Salary", "Transport")
- date: string (ISO format YYYY-MM-DD). If no date is mentioned, use today's date: {today}
- note: string (optional, brief description)

Rules:
1. If the input is not related to income or expense, return null or empty json but try your best to interpret.
2. Convert currency to numbers (remove "taka", "tk", etc.).
3. Standardize categories where possible (e.g., "rickshaw" -> "Transport", "rice" -> "Food").
4. Output MUST be valid JSON only.

Example Input: "Spent 450 taka for dinner" 
Example Output: {{ "type": "expense", "amount": 450, "category": "Food", "date": "2024-10-12", "note": "Dinner" }} 

Example Input: "450 taka bazar e khoroc koresi" 
Example Output: {{ "type": "expense", "amount": 450, "category": "shopping", "date": "2024-10-12", "note": "Bazar khoroc" }}

Example Input: "450 টাকা বাজারে খরচ করেছি"
Example Output: {{ "type": "expense", "amount": 450, "category": "shopping", "date": "2024-10-12", "note": "বাজার খরচ" }}
"""

def extract_transaction_data(text: str) -> Dict[str, Any]:
    today_str = date.today().isoformat()
    # We do NOT use .format() here. We pass the variable to LangChain.
    # LangChain interprets {today} as a variable and {{...}} as literal braces.
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("user", "{input}")
    ])
    
    chain = prompt | llm | JsonOutputParser()
    
    try:
        # Pass both 'input' and 'today' to the chain
        result = chain.invoke({"input": text, "today": today_str})
        return result
    except Exception as e:
        print(f"Error extracting data: {e}")
        return {}
