import os
import sys

# Add the app root to path so we can import 'src.*'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.queue.worker import start_worker

def main():
    print("--- 2D AI Metaverse Worker ---")
    print("Worker initialized in restructured format.")
    start_worker()

if __name__ == "__main__":
    main()
