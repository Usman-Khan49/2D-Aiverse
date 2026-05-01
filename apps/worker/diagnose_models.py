import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

def list_models():
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Error: GOOGLE_API_KEY not found.")
        return

    client = genai.Client(api_key=api_key)
    print("--- Available Models for your API Key ---")
    try:
        # The new SDK method to list models
        for model in client.models.list():
            # Let's just print the whole model object or specific fields
            print(f"ID: {model.name} | Display Name: {model.display_name}")
    except Exception as e:
        print(f"Failed to list models: {e}")

if __name__ == "__main__":
    list_models()
