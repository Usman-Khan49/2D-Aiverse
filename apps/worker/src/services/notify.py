import json
import redis
import os
from dotenv import load_dotenv

load_dotenv()

class NotificationService:
    def __init__(self):
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

    def notify_summary_ready(self, session_id):
        """
        Publishes a message to Redis to notify the backend that a summary is ready.
        """
        message = {
            "type": "summary:ready",
            "sessionId": session_id
        }
        self.redis_client.publish("session:complete", json.dumps(message))
        print(f"[+] Notified backend: Summary ready for session {session_id}")
