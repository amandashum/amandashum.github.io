"""Build Blender geometry from REAL semantic predictions and estimated depth.

Unlike the earlier art study, classes share one coherent depth field: roads,
vehicles, trees, and buildings are not assigned arbitrary stacked distances.
The optional shape key flattens the scene back to its source photograph.
"""
from pathlib import Path
import json
import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'assets'/'perception'
data = json.loads((OUT/'analysis.json').read_text(encoding='utf-8'))
GW,GH = data['gridWidth'],data['gridHeight']
WIDTH,HEIGHT = 3.5,3.5*data['imageHeight']/data['imageWidth']
depth = np.fromfile(OUT/'depth-grid.bin',dtype='<f4').reshape(GH,GW)
labels = np.fromfile(OUT/'class-grid.bin',dtype=np.uint8).reshape(GH,GW)
NAMES = {item['id']:item['name'] for item in data['classes']}
GROUPS = {
    'road':['road'], 'trees':['tree','palm','plant'],
    'vehicles':['car','truck','bus','van','motorcycle','bicycle'],
    'buildings':['building','house','skyscraper','tower','wall'],
    'water':['water','swimming pool','pool','fountain','sea','river','lake'],
    'sky':['sky'],
}


def group_for(class_id):
    """Map model classes to a small disclosed set of display filters."""
    name = NAMES.get(int(class_id),'other')
    return next((group for group,names in GROUPS.items() if name in names),'other')


def material(name):
    """Use the photograph as a physical material with a modest emissive contribution."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    mat.node_tree.links.new(texture.outputs['Color'],shader.inputs['Base Color'])
    mat.node_tree.links.new(texture.outputs['Color'],shader.inputs['Emission Color'])
    shader.inputs['Emission Strength'].default_value = .3
    shader.inputs['Roughness'].default_value = .85
    return mat


def build_group(name, triangles):
    """Build a class-specific part of the shared depth surface, preserving UV alignment."""
    used = sorted(set(index for triangle in triangles for index in triangle))
    index_map = {old:new for new,old in enumerate(used)}
    flat, spatial, uvs = [], [], []
    for index in used:
        row,col = divmod(index,GW)
        u,v = col/(GW-1),row/(GH-1)
        x,z = (u-.5)*WIDTH,(.5-v)*HEIGHT
        # A display camera assumption, not calibrated world coordinates. With a
        # camera eight units away this preserves the reference view in projection.
        forward = (float(depth[row,col])-.5)*3.6
        factor = (8-forward)/8
        flat.append((x,0,z))
        spatial.append((x*factor,-forward,z*factor))
        uvs.append((u,1-v))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(flat,[],[tuple(index_map[i] for i in triangle) for triangle in triangles])
    mesh.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons))
    mesh.update()
    uv_layer = mesh.uv_layers.new(name='Source image coordinates')
    for loop in mesh.loops:
        uv_layer.data[loop.index].uv = uvs[loop.vertex_index]
    obj = bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(material(name+' photograph'))
    obj.shape_key_add(name='Image plane')
    key = obj.shape_key_add(name='Estimated geometry')
    for vertex,position in zip(key.data,spatial):
        vertex.co = position
    key.value = 1
    obj['representation'] = 'Depth-derived surface'
    obj['semantic_group'] = name
    obj['calibrated'] = False
    return obj


def aim(obj,target):
    """Point a Blender camera or light at the reconstructed scene."""
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
image = bpy.data.images.load(str(ROOT/'las-vegas.jpeg'))
image.pack()
triangles_by_group = {name:[] for name in [*GROUPS,'other']}
for row in range(GH-1):
    for col in range(GW-1):
        a = row*GW+col
        for triangle in [(a,a+GW,a+1),(a+1,a+GW,a+GW+1)]:
            ids = [labels[divmod(i,GW)] for i in triangle]
            majority = max(set(ids),key=ids.count)
            triangles_by_group[group_for(majority)].append(triangle)
objects = [build_group(name,triangles) for name,triangles in triangles_by_group.items() if triangles]
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'scene.glb'),export_format='GLB',
    use_selection=True,export_extras=True,export_yup=True,export_morph=True,export_morph_normal=False)

world = bpy.context.scene.world
world.use_nodes = True
world.node_tree.nodes.get('Background').inputs[0].default_value = (.02,.028,.034,1)
world.node_tree.nodes.get('Background').inputs[1].default_value = .4
bpy.ops.object.camera_add(location=(3,-8,1.7))
camera = bpy.context.object
camera.name = 'Scene understanding camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 6.3
aim(camera,(0,0,0))
bpy.context.scene.camera = camera
bpy.ops.object.light_add(type='AREA',location=(0,-5,6))
light = bpy.context.object
light.name = 'Softbox'
light.data.energy = 650
light.data.size = 7
aim(light,(0,0,0))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.quality = 90
scene.render.filepath = str(OUT/'scene-poster.webp')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'scene.blend'))
bpy.ops.render.render(write_still=True)
data['groups'] = {group:[item['id'] for item in data['classes'] if group_for(item['id'])==group] for group in triangles_by_group}
data['surface'] = {'width':WIDTH,'height':HEIGHT,'cameraDistance':8,'depthScale':3.6,'triangles':sum(len(t) for t in triangles_by_group.values())}
(OUT/'analysis.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print('DEPTH_SURFACE_COMPLETE',len(objects),'semantic groups')
