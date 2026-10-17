"""Download only pinned official safetensors/tokenizer files; no remote code."""
import json,os,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
os.environ.setdefault('HF_HOME',str(ROOT/'.cache'/'huggingface'))
os.environ.setdefault('HF_HUB_DISABLE_XET','1')
from huggingface_hub import snapshot_download

def download():
    results=[]
    for kind,model in json.loads((ROOT/'models.json').read_text()).items():
        started=time.perf_counter()
        path=snapshot_download(repo_id=model['id'],revision=model['revision'],allow_patterns=['*.json','*.safetensors','*.model','vocab.txt','README.md'],max_workers=2)
        size=sum(p.stat().st_size for p in Path(path).rglob('*') if p.is_file())
        results.append({'kind':kind,**model,'snapshot':path,'downloaded_file_bytes':size,'elapsed_seconds':round(time.perf_counter()-started,2)})
        print(json.dumps(results[-1]),flush=True)
    (ROOT/'.cache'/'download-manifest.json').write_text(json.dumps(results,indent=2))
if __name__=='__main__':download()
