"""Check spatial contracts and provenance without rerunning ML inference."""
from pathlib import Path
import json
import struct
import hashlib
import math

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'perception'
data=json.loads((OUT/'analysis.json').read_text(encoding='utf-8'))
assert hashlib.sha256((ROOT/data['source']).read_bytes()).hexdigest()==data['sourceSHA256']
w,h=data['imageWidth'],data['imageHeight']
for item in data['detections']:
    left,top,right,bottom=item['box']
    assert 0<=left<right<=w and 0<=top<bottom<=h,item
    assert data['detectionThreshold']<=item['score']<=1,item
count=data['gridWidth']*data['gridHeight']
raw=(OUT/'depth-grid.bin').read_bytes()
assert len(raw)==count*4
values=struct.unpack('<'+'f'*count,raw)
assert all(math.isfinite(v) and 0<=v<=1 for v in values)
assert max(values)-min(values)>.8,'Depth field must contain real spatial variation'
class_grid=(OUT/'class-grid.bin').read_bytes()
assert len(class_grid)==count
assert set(class_grid).issubset({c['id'] for c in data['classes']})
assert sum(c['pixels'] for c in data['classes'])==w*h
for group in ['road','trees','vehicles','buildings','water','sky']:
    assert data['groups'][group],group
glb=(OUT/'scene.glb').read_bytes()
magic,version,length=struct.unpack_from('<4sII',glb)
assert magic==b'glTF' and version==2 and length==len(glb)
json_length,kind=struct.unpack_from('<II',glb,12)
assert kind==0x4e4f534a
model=json.loads(glb[20:20+json_length])
assert 'Blender' in model['asset']['generator'],model['asset']
assert all(node['name'] in data['groups'] for node in model['nodes'] if 'mesh' in node)
assert all(primitive.get('targets') for mesh in model['meshes'] for primitive in mesh['primitives'])
assert len(glb)<6_000_000,'Keep the local scene below the transfer budget'
print(json.dumps({'result':'PASS','detections':len(data['detections']),'depthSamples':count,
    'semanticClasses':len(data['classes']),'blenderMeshes':len(model['meshes']),
    'glbBytes':len(glb),'generator':model['asset']['generator']},indent=2))
