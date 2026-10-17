import os,base64,threading,hmac
from fastapi import FastAPI,HTTPException,Header,Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel,Field
try:from .engine import Engine
except ImportError:from engine import Engine
engine=Engine()
app=FastAPI(title='CIVIQ Local Inference',version='2.0.0',docs_url=None,redoc_url=None)
def auth(x_inference_token:str=Header(default='')):
    if not hmac.compare_digest(x_inference_token,os.environ.get('INFERENCE_TOKEN','local-development-only')):raise HTTPException(401,'Inference authorization required.')
class ImageRequest(BaseModel):
    imageBase64:str=Field(max_length=7_000_000)
    reviewThreshold:float=Field(default=.10,ge=0,le=1)
    marginThreshold:float=Field(default=.35,ge=0,le=5)
class TextRequest(BaseModel):
    texts:list[str]=Field(min_length=1,max_length=32)
class Comparison(BaseModel):
    beforeBase64:str=Field(max_length=7_000_000)
    afterBase64:str=Field(max_length=7_000_000)
@app.exception_handler(Exception)
async def failure(_,exc):
    return JSONResponse(status_code=429 if isinstance(exc,BlockingIOError) else 503 if isinstance(exc,RuntimeError) else 400,content={'error':str(exc)[:400],'available':False,'fallback':'manual'})
@app.get('/health',dependencies=[Depends(auth)])
def health():return engine.status()
@app.post('/load',dependencies=[Depends(auth)])
def load():
    if engine.state not in ('loading','ready'):
        def work():
            try:engine.load()
            except Exception:pass
        threading.Thread(target=work,daemon=True).start()
    return engine.status()
@app.post('/classify',dependencies=[Depends(auth)])
def classify(request:ImageRequest):return engine.classify(base64.b64decode(request.imageBase64,validate=True),request.reviewThreshold,request.marginThreshold)
@app.post('/embed',dependencies=[Depends(auth)])
def embed(request:TextRequest):
    if any(not t.strip() or len(t)>3000 for t in request.texts):raise HTTPException(422,'Descriptions must be nonempty and at most 3000 characters.')
    return engine.embed(request.texts)
@app.post('/compare',dependencies=[Depends(auth)])
def compare(request:Comparison):return engine.compare(base64.b64decode(request.beforeBase64,validate=True),base64.b64decode(request.afterBase64,validate=True))
