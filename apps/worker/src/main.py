import os
import sys

# Add the app root to path so we can import 'src.*'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.queue.worker import app

def main():
    print("--- 2D AI Metaverse Worker ---")
    print("This script is now a wrapper for Celery.")
    print("To run the worker, use: pnpm dev")
    app.start()

if __name__ == "__main__":
    main()
