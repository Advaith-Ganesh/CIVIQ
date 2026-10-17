"""Fetch only declared licensed image samples; never create issue locations."""
import json,urllib.request,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'datasets/manifests/commons-smoke.json').read_text())
target=ROOT/'datasets/cache/commons-smoke';target.mkdir(parents=True,exist_ok=True)
for sample in manifest['samples']:
    if sample['dataType']!='MODEL_EVALUATION' or sample['licence'] not in ('CC0-1.0','CC-BY-SA-4.0'):raise ValueError('Sample licence or data classification not reviewed.')
    url=sample['downloadUrl']
    if not url.startswith('https://thumb.wikimedia.org/'):raise ValueError('Unexpected image origin.')
    path=target/sample['file']
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'CIVIQ-AI-evaluation/2.0 (educational local prototype)'})
        with urllib.request.urlopen(request,timeout=30) as response:data=response.read(5*1024*1024+1)
        if len(data)>5*1024*1024:raise ValueError('Sample exceeds image limit.')
        path.write_bytes(data)
    sample['sha256']=hashlib.sha256(path.read_bytes()).hexdigest();sample['bytes']=path.stat().st_size
    print(sample['file'],sample['bytes'])
(target/'download-receipt.json').write_text(json.dumps(manifest,indent=2))
