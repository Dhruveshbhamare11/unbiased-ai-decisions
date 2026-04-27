from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

with open('biased_engineers_v5.csv', 'rb') as f:
    response = client.post('/api/debias', files={'file': ('biased_engineers_v5.csv', f, 'text/csv')})

print("Status:", response.status_code)
print(response.json() if response.status_code != 500 else response.text)
