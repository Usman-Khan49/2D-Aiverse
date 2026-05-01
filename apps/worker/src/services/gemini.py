import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in .env file.")
        
        genai.configure(api_key=api_key)
        # Using YOUR original working model name
        self.model = genai.GenerativeModel("gemini-flash-latest")

    def summarize_chunk(self, transcript_text):
        """
        Summarizes a transcript chunk and extracts structured information.
        """
        prompt = f"""
        Analyze the following meeting transcript segment and provide a concise summary.
        Extract the following in a structured JSON format:
        1. title: A catchy title for the meeting.
        2. overview: A one-paragraph summary of the discussion.
        3. keyPoints: A list of the most important takeaways or decisions.
        4. actionItems: A list of specific tasks or next steps.
        5. decisions: (Same as keyPoints, for database storage)
        6. openQuestions: Any unresolved points.
        7. risks: Any blockers or risks mentioned.

        Transcript:
        {transcript_text}

        Return ONLY valid JSON.
        """
        
        try:
            response = self.model.generate_content(prompt)
            content_text = response.text
            
            # Find JSON block if it exists
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0].strip()
            elif "```" in content_text:
                content_text = content_text.split("```")[1].split("```")[0].strip()
                
            return json.loads(content_text)
        except Exception as e:
            print(f"[!] Error in chunk summarization job: {e}")
            return {
                "decisions": [],
                "openQuestions": [],
                "risks": [],
                "mainTopics": ["Error during summarization"]
            }

    def synthesize_summaries(self, chunk_summaries):
        """
        Synthesizes multiple chunk summaries into a final meeting summary.
        """
        prompt = f"""
        Combine the following meeting segment summaries into a single, cohesive final meeting report.
        Identify consolidated decisions, unresolved questions, and overall project risks.
        
        Segment Summaries:
        {json.dumps(chunk_summaries, indent=2)}

        Return a final structured JSON report with:
        1. overallSummary: A paragraph summarizing the whole meeting.
        2. consolidatedDecisions: List of all final decisions.
        3. unresolvedItems: List of all open questions or pending tasks.
        4. riskAssessment: Summary of risks identified.
        
        Return ONLY valid JSON.
        """
        
        try:
            response = self.model.generate_content(prompt)
            content_text = response.text
            if "```json" in content_text:
                content_text = content_text.split("```json")[1].split("```")[0].strip()
            
            return json.loads(content_text)
        except Exception as e:
            print(f"[!] Error in final synthesis job: {e}")
            return {"error": "Failed to synthesize summaries"}
