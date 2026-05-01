import numpy as np
import json
import os

class SpeakerManager:
    def __init__(self, db_path="speaker_registry.json"):
        self.db_path = db_path
        self.registry = self._load_registry()

    def _load_registry(self):
        if os.path.exists(self.db_path):
            with open(self.db_path, "r") as f:
                return json.load(f)
        return []

    def save_registry(self):
        with open(self.db_path, "w") as f:
            json.dump(self.registry, f, indent=4)

    def add_speaker(self, name, embedding):
        """
        Adds a new speaker with their voice embedding.
        embedding: A list of floats (vector).
        """
        self.registry.append({
            "name": name,
            "embedding": embedding
        })
        self.save_registry()

    def identify_speaker(self, current_embedding, threshold=0.8):
        """
        Compares current embedding against the registry using Cosine Similarity.
        """
        if not self.registry:
            return None

        best_match = None
        highest_sim = -1

        vec_a = np.array(current_embedding)
        norm_a = np.linalg.norm(vec_a)

        for entry in self.registry:
            vec_b = np.array(entry["embedding"])
            norm_b = np.linalg.norm(vec_b)
            
            # Cosine Similarity
            similarity = np.dot(vec_a, vec_b) / (norm_a * norm_b)
            
            if similarity > highest_sim:
                highest_sim = similarity
                best_match = entry["name"]

        if highest_sim >= threshold:
            return best_match
        return None

if __name__ == "__main__":
    # Demo logic
    manager = SpeakerManager()
    
    # Mock embeddings
    hammad_voice = [0.1, 0.5, 0.2, 0.8]
    manager.add_speaker("Hammad", hammad_voice)
    
    # Test identification
    test_voice = [0.11, 0.49, 0.21, 0.79] # Slightly different
    match = manager.identify_speaker(test_voice)
    print(f"[*] Voice ID Match: {match}")
