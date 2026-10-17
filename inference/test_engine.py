import base64,io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app import app,engine
from engine import decide
client=TestClient(app,raise_server_exceptions=False)
HEADERS={'x-inference-token':'local-development-only'}
def test_private_service_rejects_missing_token():assert client.get('/health').status_code==401
def test_real_state_not_fabricated():assert client.get('/health',headers=HEADERS).json()['loaded'] is False
def test_unavailable_model_returns_explicit_error():
    r=client.post('/classify',headers=HEADERS,json={'imageBase64':base64.b64encode(b'invalid').decode()})
    assert r.status_code==503 and r.json()['fallback']=='manual' and not r.json()['available']
def test_validates_batch_limit():assert client.post('/embed',headers=HEADERS,json={'texts':['x']*33}).status_code==422
def test_image_safety():
    with pytest.raises(Exception):engine.image(b'not an image')
    with pytest.raises(ValueError):engine.image(b'0'*(5*1024*1024+1))
def test_abstention_is_not_probability_claim():
    candidates=[{'categoryId':'pothole','score':.2,'rawScore':-1.4},{'categoryId':'road','score':.19,'rawScore':-1.5}]
    assert decide(candidates,.1,.35)['abstained']
    assert decide(candidates,.1,.01)['categoryId']=='pothole'
