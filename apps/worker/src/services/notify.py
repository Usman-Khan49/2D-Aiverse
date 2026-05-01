import os
import json
import redis
from dotenv import load_dotenv

load_dotenv()

class NotifyService:
    def __init__(self):
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.redis_password = os.getenv("REDIS_PASSWORD")
        self.notification_channel = "summary_notifications"

        self.r = redis.Redis(
            host=self.redis_host,
            port=self.redis_port,
            password=self.redis_password,
            decode_responses=True
        )

    def notify_summary_ready(self, session_id):
        """
        Publishes a message to Redis notifying the backend that a summary is ready.
        """
        payload = {
            "type": "SUMMARY_READY",
            "sessionId": session_id,
            "ts": os.times()[4] # Current timestamp
        }
        
        print(f"[*] Notifying backend that summary is ready for session: {session_id}")
        self.r.publish(self.notification_channel, json.dumps(payload))
