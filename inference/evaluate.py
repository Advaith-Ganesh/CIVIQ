"""A measured smoke evaluation, never a representative city benchmark."""
import json,base64,collections,datetime,sys
from pathlib import Path
import httpx
ROOT=Path(__file__).resolve().parent.parent
manifest=json.loads((ROOT/'datasets/manifests/commons-smoke.json').read_text())

def metrics(labels,predictions):
    classes=sorted(set(labels));result={}
    for category in classes:
        tp=sum(a==category and p==category for a,p in zip(labels,predictions));fp=sum(a!=category and p==category for a,p in zip(labels,predictions));fn=sum(a==category and p!=category for a,p in zip(labels,predictions));precision=tp/(tp+fp) if tp+fp else 0;recall=tp/(tp+fn) if tp+fn else 0
        result[category]={'support':labels.count(category),'precision':precision,'recall':recall,'f1':2*precision*recall/(precision+recall) if precision+recall else 0,'truePositive':tp,'falsePositive':fp,'falseNegative':fn}
    return {'accuracy':sum(a==p for a,p in zip(labels,predictions))/len(labels),'macroF1':sum(c['f1'] for c in result.values())/len(classes),'perCategory':result}

def run():
    rows=[];labels=[s['categoryId'] for s in manifest['samples']];majority=collections.Counter(labels).most_common(1)[0][0]
    client=httpx.Client(base_url='http://127.0.0.1:8001',headers={'X-Inference-Token':__import__('os').environ.get('INFERENCE_TOKEN','local-development-only')},timeout=60)
    for sample in manifest['samples']:
        image=(ROOT/'datasets/cache/commons-smoke'/sample['file']).read_bytes()
        response=client.post('/classify',json={'imageBase64':base64.b64encode(image).decode()});response.raise_for_status();result=response.json()
        rows.append({'id':sample['id'],'label':sample['categoryId'],'prediction':result['categoryId'],'topCandidate':result['suggestedCategoryId'],'abstained':result['abstained'],'candidates':result['candidates'],'durationMs':result['durationMs'],'sourceUrl':sample['sourceUrl'],'baselinePrediction':majority})
    output={'modelId':result['modelId'],'revision':result['revision'],'dataset':manifest['name'],'sampleSize':len(rows),'classDistribution':dict(collections.Counter(labels)),'evaluatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'metrics':metrics(labels,[r['prediction'] for r in rows]),'topCandidateMetrics':metrics(labels,[r['topCandidate'] for r in rows]),'coverage':sum(not r['abstained'] for r in rows)/len(rows),'baseline':{'method':'Deterministic majority-class baseline fitted to this tiny sample (optimistic convenience baseline, no vision).','category':majority,'metrics':metrics(labels,[majority]*len(rows))},'rows':rows,'limitations':['Only four convenience images in two categories; no holdout set, no confidence intervals, no trained civic classifier evaluation.','Source-description labels were visually checked by the coding agent, not independently adjudicated by human annotators.','No Southampton incident images, no streetlight-outage testing and no evidence of performance on unseen categories.','Zero-shot label prompts and abstention thresholds are experimental. Raw similarities are not probabilities.']}
    target=ROOT/'docs/evaluation';target.mkdir(exist_ok=True);(target/'v2-smoke-evaluation.json').write_text(json.dumps(output,indent=2));print(json.dumps({k:output[k] for k in ['sampleSize','metrics','coverage','baseline']},indent=2))
if __name__=='__main__':run()
