import urllib.request
import json
import time

ts = int(time.time())

rubric = {
    "name": "Test Rubric",
    "description": "Phase 2 E2E test",
    "criteria": [
        {"name": "Content", "description": "Quality of content", "weight": 0.6},
        {"name": "Grammar", "description": "Grammar quality", "weight": 0.4},
    ],
}
submissions = [
    {
        "id": f"sub_{ts}_{i:03d}",
        "content": (
            f"This is submission number {i}. It contains some text about "
            f"topic {i % 3} to create distinct groups. "
            f"The student discusses various aspects of the subject matter related to cluster {i % 3}."
        ),
        "content_type": "essay",
    }
    for i in range(10)
]
payload = json.dumps(
    {"rubric": rubric, "submissions": submissions, "content_type": "essay"}
).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/v1/evaluate",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
job_id = data["job_id"]
print(f"Job created: {job_id}")
print(f"Initial status: {data['status']}")
print()

seen_statuses = set()
for i in range(40):
    time.sleep(2)
    req2 = urllib.request.Request(f"http://localhost:8000/api/v1/jobs/{job_id}")
    resp2 = urllib.request.urlopen(req2)
    status_data = json.loads(resp2.read())
    status = status_data["status"]
    cluster_count = status_data.get("cluster_count")
    if status not in seen_statuses:
        print(f"  [{i*2}s] STATUS TRANSITION -> {status}  cluster_count={cluster_count}")
        seen_statuses.add(status)
    else:
        print(f"  [{i*2}s] {status}  cluster_count={cluster_count}")

    if status in ("clustering", "completed", "failed"):
        print()
        print(f"FINAL STATE: {status}")
        if status == "failed":
            print(f"Error: {status_data.get('error_message')}")
        break
