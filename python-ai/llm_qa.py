import sys
import json
from transformers import pipeline

qa = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")
question = sys.argv[1]
context = sys.argv[2] if len(sys.argv) > 2  and sys.argv[2].strip() else "Redis is an in-memory database widely used for caching and real-time data."
result = qa(question=question, context=context)
print(json.dumps({"answer": result['answer']}))
