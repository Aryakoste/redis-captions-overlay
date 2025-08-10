import os
import json
import redis
import subprocess

r = redis.from_url(os.environ["REDIS_URL"])

print("🚀 LLM Worker started — waiting for jobs...")

while True:
    jobs = r.xread({"llm_jobs": "0-0"}, None, 0)  
    for stream, messages in jobs:
        for msg_id, msg_data in messages:
            try:
                payload = json.loads(msg_data[b'payload'].decode())
                print(f"🤖 Processing LLM job {payload['job_id']}")

                result_raw = subprocess.check_output(
                    ["python", "llm_qa.py", payload["question"], payload["context"]]
                ).decode()

                result_json = json.loads(result_raw)
                result_json["job_id"] = payload["job_id"]

                r.xadd("llm_results", {"result": json.dumps(result_json)})

                r.xdel("llm_jobs", msg_id)

                print(f"✅ Job {payload['job_id']} completed and result sent.")
            except Exception as e:
                print(f"❌ Error processing job {msg_id}: {e}")
