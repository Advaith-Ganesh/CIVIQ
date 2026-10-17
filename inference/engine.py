"""Real zero-shot vision and mean-pooled sentence embeddings. CPU by default."""
import os,json,time,base64,io,threading,hashlib,sqlite3
from datetime import datetime,timezone
from pathlib import Path
from collections import OrderedDict
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('HF_HOME',str(ROOT/'.cache'/'huggingface'))
os.environ.setdefault('HF_HUB_DISABLE_XET','1')
MODELS=json.loads((ROOT/'models.json').read_text())
LABELS=[
 ('pothole','a photograph of a road pothole, a hole in the asphalt surface'),
 ('road','a photograph of a cracked or damaged road surface'),
 ('dumping','a photograph of illegally dumped rubbish and discarded waste'),
 ('bin','a photograph of an overflowing public rubbish bin'),
 ('graffiti','a photograph of graffiti painted on a wall'),
 ('pavement','a photograph of broken paving slabs or damaged pavement'),
 ('obstruction','a photograph of a road obstruction or fallen tree blocking a path'),
 ('drain','a photograph of a blocked drainage grate or flooded drain'),
 ('sign','a photograph of a damaged or bent road traffic sign'),
 ('light','a photograph of visibly damaged streetlight infrastructure, a broken pole or lamp'),
 ('other','a photograph of general street infrastructure'),
 ('unclear','an unclear photograph unrelated to street infrastructure')]

def now():return datetime.now(timezone.utc).isoformat()

def decide(candidates,min_score,margin):
    best,runner=candidates[0],candidates[1]
    abstained=best['score']<min_score or best['rawScore']-runner['rawScore']<margin or best['categoryId']=='unclear'
    return {'categoryId':'other' if abstained else best['categoryId'],'suggestedCategoryId':best['categoryId'],'abstained':abstained,'reliabilityWarning':'Ambiguous or low-support image. Select a category manually.' if abstained else 'Experimental zero-shot suggestion; an officer must review it. Similarities are not calibrated probabilities.'}

class Engine:
    def __init__(self):
        self.vision=None;self.processor=None;self.text=None;self.tokenizer=None;self.label_features=None
        self.device=os.environ.get('MODEL_DEVICE','cpu');self.lock=threading.Lock();self.load_lock=threading.Lock()
        self.state='not_loaded';self.error=None;self.loaded_at=None;self.embedding_cache=OrderedDict()
        self.database=ROOT/'.cache'/'observations.db';self.database.parent.mkdir(parents=True,exist_ok=True)
        with sqlite3.connect(self.database) as conn:conn.execute('CREATE TABLE IF NOT EXISTS observation (id INTEGER PRIMARY KEY, kind TEXT, duration REAL, timestamp TEXT)')
    def status(self):
        with sqlite3.connect(self.database) as conn:
            count,mean=conn.execute("SELECT count(*),avg(duration) FROM observation WHERE kind='vision'").fetchone()
        return {'state':self.state,'loaded':self.vision is not None and self.text is not None,'device':self.device,'vision':MODELS['vision'],'text':MODELS['text'],'loadedAt':self.loaded_at,'lastError':self.error,'classifications':count,'averageInferenceMs':round(mean,1) if mean is not None else None,'busy':self.lock.locked(),'queueLimit':1,'rawScoresAreProbabilities':False}
    def load(self):
        if self.state=='ready':return
        if not self.load_lock.acquire(blocking=False):return
        self.state='loading';self.error=None
        try:
            import torch
            from transformers import AutoModel,AutoProcessor,AutoTokenizer
            torch.set_num_threads(min(4,os.cpu_count() or 1))
            if self.device=='auto':self.device='cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
            offline=os.environ.get('MODEL_ALLOW_DOWNLOAD','false')!='true'
            v=MODELS['vision'];t=MODELS['text']
            self.processor=AutoProcessor.from_pretrained(v['id'],revision=v['revision'],local_files_only=offline,trust_remote_code=False)
            self.vision=AutoModel.from_pretrained(v['id'],revision=v['revision'],local_files_only=offline,use_safetensors=True,trust_remote_code=False).to(self.device).eval()
            self.tokenizer=AutoTokenizer.from_pretrained(t['id'],revision=t['revision'],local_files_only=offline,trust_remote_code=False)
            self.text=AutoModel.from_pretrained(t['id'],revision=t['revision'],local_files_only=offline,use_safetensors=True,trust_remote_code=False).to(self.device).eval()
            encoded=self.processor(text=[label for _,label in LABELS],padding='max_length',return_tensors='pt').to(self.device)
            with torch.inference_mode():
                features=self.vision.get_text_features(**encoded);self.label_features=torch.nn.functional.normalize(features,dim=-1)
            self.state='ready';self.loaded_at=now()
        except Exception as exc:
            self.state='failed';self.error=f'{type(exc).__name__}: {str(exc)[:300]}'
            self.vision=None;self.text=None
            raise
        finally:self.load_lock.release()
    def image(self,data):
        from PIL import Image,ImageOps
        if len(data)>5*1024*1024:raise ValueError('Image exceeds 5 MB.')
        Image.MAX_IMAGE_PIXELS=25_000_000
        with Image.open(io.BytesIO(data)) as img:
            if img.format not in ('JPEG','PNG','WEBP'):raise ValueError('Only JPEG, PNG and WebP images are accepted.')
            if img.width*img.height>25_000_000:raise ValueError('Image exceeds 25 million pixels.')
            return ImageOps.exif_transpose(img).convert('RGB')
    def classify(self,data,min_score=.10,margin=.35):
        if self.state!='ready':raise RuntimeError(f'Model unavailable: {self.state}. Load cached weights in AI Lab.')
        if not self.lock.acquire(blocking=False):raise BlockingIOError('Inference busy; retry or classify manually.')
        started=time.perf_counter()
        try:
            import torch
            image=self.image(data);inputs=self.processor(images=image,return_tensors='pt').to(self.device)
            with torch.inference_mode():
                features=self.vision.get_image_features(**inputs);features=torch.nn.functional.normalize(features,dim=-1)
                logits=(features@self.label_features.T)*self.vision.logit_scale.exp()+self.vision.logit_bias
                raw=logits[0].cpu();scores=raw.sigmoid()
            candidates=sorted([{'categoryId':cat,'label':label,'rawScore':round(float(raw[i]),5),'score':round(float(scores[i]),6)} for i,(cat,label) in enumerate(LABELS)],key=lambda c:c['rawScore'],reverse=True)
            duration=(time.perf_counter()-started)*1000
            with sqlite3.connect(self.database) as conn:conn.execute('INSERT INTO observation(kind,duration,timestamp) VALUES(?,?,?)',('vision',duration,now()))
            return {**decide(candidates,min_score,margin),'available':True,'provider':'local','modelId':MODELS['vision']['id'],'revision':MODELS['vision']['revision'],'inferredAt':now(),'durationMs':round(duration,1),'candidates':candidates,'scoreType':'Raw SigLIP logits and sigmoid similarities, not calibrated probabilities','reviewThreshold':min_score,'marginThreshold':margin}
        finally:self.lock.release()
    def embed(self,texts):
        if self.state!='ready':raise RuntimeError('Embedding model unavailable; geographic and keyword matching remain usable.')
        if not self.lock.acquire(blocking=False):raise BlockingIOError('Inference busy.')
        try:
            import torch
            result=[None]*len(texts);missing=[];indices=[]
            for i,text in enumerate(texts):
                key=hashlib.sha256(text.encode()).hexdigest()
                if key in self.embedding_cache:result[i]=self.embedding_cache[key]
                else:missing.append(text);indices.append(i)
            if missing:
                inputs=self.tokenizer(missing,padding=True,truncation=True,max_length=256,return_tensors='pt').to(self.device)
                with torch.inference_mode():
                    output=self.text(**inputs).last_hidden_state;mask=inputs['attention_mask'].unsqueeze(-1).expand(output.size()).float()
                    vectors=torch.nn.functional.normalize((output*mask).sum(1)/mask.sum(1).clamp(min=1e-9),p=2,dim=1).cpu().tolist()
                for i,vector in zip(indices,vectors):
                    result[i]=vector;self.embedding_cache[hashlib.sha256(texts[i].encode()).hexdigest()]=vector
                    while len(self.embedding_cache)>1024:self.embedding_cache.popitem(last=False)
            return {'embeddings':result,'modelId':MODELS['text']['id'],'revision':MODELS['text']['revision'],'dimensions':384}
        finally:self.lock.release()
    def compare(self,before,after):
        if self.state!='ready':raise RuntimeError('Vision model unavailable.')
        if not self.lock.acquire(blocking=False):raise BlockingIOError('Inference busy.')
        try:
            import torch
            images=[self.image(before),self.image(after)];inputs=self.processor(images=images,return_tensors='pt').to(self.device)
            with torch.inference_mode():
                vectors=torch.nn.functional.normalize(self.vision.get_image_features(**inputs),dim=-1);cosine=float((vectors[0]@vectors[1]).cpu())
            return {'cosineSimilarity':round(cosine,5),'recommendation':'Possibly unresolved' if cosine>.98 else 'Visually changed' if cosine<.85 else 'Insufficient evidence','warning':'Unvalidated heuristic supporting human comparison. Similarity does not establish repair quality or safety. Camera viewpoint and lighting can dominate.','modelId':MODELS['vision']['id'],'revision':MODELS['vision']['revision'],'inferredAt':now()}
        finally:self.lock.release()
