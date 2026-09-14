"""Precompute model-derived representations for the Las Vegas portfolio hero.

Uses existing torch/transformers installations. Downloads only official model
configuration and safetensors weights; no remote Python code is executed.
The photograph remains local. Model weights are not part of the website.
"""
from pathlib import Path
import os
import json
import hashlib
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'perception'
CACHE = ROOT / 'output' / 'model-cache'
os.environ['HF_HUB_DISABLE_XET'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'
os.environ['HF_HOME'] = str(CACHE)
os.environ['TORCH_HOME'] = str(CACHE / 'torch')

import numpy as np
import torch
import cv2
from PIL import Image
from huggingface_hub import snapshot_download, HfApi
from transformers import AutoImageProcessor, AutoModelForObjectDetection
from transformers import AutoModelForDepthEstimation, SegformerForSemanticSegmentation

OUT.mkdir(parents=True, exist_ok=True)
torch.manual_seed(0)
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
IMAGE = Image.open(ROOT/'las-vegas.jpeg').convert('RGB')
W,H = IMAGE.size
MODELS = {
    'detection':'PekingU/rtdetr_r50vd',
    'segmentation':'nvidia/segformer-b0-finetuned-ade-512-512',
    'depth':'depth-anything/Depth-Anything-V2-Small-hf',
}
provenance = {}


def load_model(task, model_class):
    """Load a locally cached, official safetensors snapshot and retain its revision."""
    repo = MODELS[task]
    print('LOADING', task, repo, flush=True)
    revision = HfApi().model_info(repo).sha
    local = snapshot_download(repo, revision=revision, local_dir=str(CACHE/task),
        allow_patterns=['*.json','*.safetensors','README.md','LICENSE*'])
    provenance[task] = {'repository':repo,'revision':revision}
    processor = AutoImageProcessor.from_pretrained(local, local_files_only=True, use_fast=False)
    model = model_class.from_pretrained(local, local_files_only=True,
        use_safetensors=True, trust_remote_code=False).to(DEVICE).eval()
    return processor, model


def release(model):
    """Release GPU tensors between independent tasks to bound peak memory."""
    model.cpu()
    if DEVICE == 'cuda':
        torch.cuda.empty_cache()


processor, model = load_model('detection', AutoModelForObjectDetection)
# Tiles preserve the tiny cars in this elevated, portrait photograph. All boxes
# are transformed back into the ORIGINAL image before cross-tile suppression.
windows = [(0,0,W,H),(0,480,700,1180),(385,550,W,1250)]
candidates = []
with torch.inference_mode():
    for left,top,right,bottom in windows:
        crop = IMAGE.crop((left,top,right,bottom))
        inputs = processor(images=crop,return_tensors='pt').to(DEVICE)
        result = processor.post_process_object_detection(model(**inputs),
            target_sizes=torch.tensor([[crop.height,crop.width]],device=DEVICE),threshold=.4)[0]
        for score,label,box in zip(result['scores'],result['labels'],result['boxes']):
            name = model.config.id2label[int(label)]
            if name not in ['car','truck','bus','motorcycle','person','bicycle']:
                continue
            x1,y1,x2,y2 = box.tolist()
            candidates.append({'label':name,'score':round(float(score),4),
                'box':[max(0,x1+left),max(0,y1+top),min(W,x2+left),min(H,y2+top)]})


def intersection_over_union(a,b):
    """Compare original-image boxes so tiled detections do not count objects twice."""
    left,top,right,bottom = max(a[0],b[0]),max(a[1],b[1]),min(a[2],b[2]),min(a[3],b[3])
    intersection = max(0,right-left)*max(0,bottom-top)
    return intersection/max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersection)


detections = []
for candidate in sorted(candidates,key=lambda item:item['score'],reverse=True):
    if not any(intersection_over_union(candidate['box'],item['box'])>.45 for item in detections):
        candidate['box'] = [round(value,2) for value in candidate['box']]
        detections.append(candidate)
release(model)
del model
print('DETECTIONS',len(detections),flush=True)

processor, model = load_model('segmentation', SegformerForSemanticSegmentation)
with torch.inference_mode():
    inputs = processor(images=IMAGE,return_tensors='pt').to(DEVICE)
    logits = model(**inputs).logits
    full = torch.nn.functional.interpolate(logits,size=(H,W),mode='bilinear',align_corners=False)
    segmentation = full.argmax(dim=1)[0].cpu().numpy().astype(np.uint8)
id2label = {str(key):value for key,value in model.config.id2label.items()}
release(model)
del model,logits,full,inputs
# Preserve model labels exactly; grouping is a separate, documented display step.
Image.fromarray(segmentation).save(OUT/'semantic-labels.png')
palette = {
    'building':[158,171,215], 'sky':[76,123,158], 'tree':[125,207,161],
    'road':[224,169,102], 'sidewalk':[164,138,108], 'car':[244,125,140],
    'water':[66,193,217], 'pool':[66,193,217], 'fountain':[104,216,237],
    'plant':[125,207,161], 'palm':[125,207,161], 'earth':[166,145,110],
    'mountain':[137,154,163], 'bridge':[181,153,120], 'person':[244,125,140],
}
semantic_rgb = np.zeros((H,W,3),dtype=np.uint8)
classes = []
for class_id,count in zip(*np.unique(segmentation,return_counts=True)):
    name = id2label[str(class_id)]
    color = palette.get(name,[105,117,130])
    semantic_rgb[segmentation==class_id] = color
    classes.append({'id':int(class_id),'name':name,'color':color,'pixels':int(count),'fraction':round(float(count/(W*H)),5)})
Image.fromarray(semantic_rgb).save(OUT/'semantics.webp',quality=95)
print('CLASSES',sorted(classes,key=lambda item:-item['pixels'])[:10],flush=True)

processor, model = load_model('depth', AutoModelForDepthEstimation)
with torch.inference_mode():
    inputs = processor(images=IMAGE,return_tensors='pt').to(DEVICE)
    predicted = model(**inputs).predicted_depth.unsqueeze(1)
    depth = torch.nn.functional.interpolate(predicted,size=(H,W),mode='bicubic',align_corners=False)[0,0].cpu().numpy()
release(model)
del model,inputs,predicted
low,high = np.percentile(depth,[1,99])
near = np.clip((depth-low)/max(float(high-low),1e-6),0,1)
# This is relative inverse depth, not metres. Percentiles normalize visualization.
Image.fromarray((near*65535).astype(np.uint16)).save(OUT/'relative-depth.png')
depth_rgb = cv2.cvtColor(cv2.applyColorMap((near*255).astype(np.uint8),cv2.COLORMAP_VIRIDIS),cv2.COLOR_BGR2RGB)
Image.fromarray(depth_rgb).save(OUT/'depth.webp',quality=95)

gw,gh = 180,round(180*H/W)
grid_depth = cv2.resize(near,(gw,gh),interpolation=cv2.INTER_AREA).astype('<f4')
grid_labels = cv2.resize(segmentation,(gw,gh),interpolation=cv2.INTER_NEAREST)
grid_depth.tofile(OUT/'depth-grid.bin')
grid_labels.tofile(OUT/'class-grid.bin')
metadata = {
    'generated':datetime.now(timezone.utc).isoformat(),
    'source':'las-vegas.jpeg','sourceSHA256':hashlib.sha256((ROOT/'las-vegas.jpeg').read_bytes()).hexdigest(),
    'imageWidth':W,'imageHeight':H,'gridWidth':gw,'gridHeight':gh,
    'models':provenance,'device':DEVICE,'torch':torch.__version__,
    'detections':detections,'classes':sorted(classes,key=lambda item:-item['pixels']),
    'detectionThreshold':.4,'nmsIoU':.45,'detectionWindows':windows,
    'depthConvention':'Normalized relative inverse depth: 0 far, 1 near; not metric.',
    'geometryConvention':'Single-view depth surface; unknown camera calibration; hidden surfaces are not reconstructed.',
    'semanticConvention':'Raw ADE20K class predictions, no hand-edited labels.',
}
(OUT/'analysis.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
print('PERCEPTION_COMPLETE',gw,gh,'points',gw*gh,flush=True)
