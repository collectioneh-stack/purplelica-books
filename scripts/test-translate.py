import json, requests, re

url = "http://localhost:11434/api/generate"
payload = {
    "model": "exaone-deep:32b",
    "prompt": "Translate this to Korean. Reply in JSON array only:\n[\"IN PROSE BEING A Ghost Story of Christmas\"]",
    "stream": False
}
try:
    r = requests.post(url, json=payload, timeout=60)
    print("Response:", r.json().get("response"))
except Exception as e:
    print("Error:", e)
