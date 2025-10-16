import bpy
from bpy import ops
from bpy import context
from sys import argv
from math import radians

# get a copy of the actual current context as basis
override = context.copy()

# select all objects in the default scene
# override['selected_objects'] = list(context.scene.objects)

# or just select the default cube to keep the camera and the light in the scene
override['selected_objects'] = [context.scene.objects['Cube']]

# remove the selected objects
with context.temp_override(**override):
    ops.object.delete()

# import obj model

# get arguments for the script
script_argv = argv[argv.index('--') + 1:]
input_path = script_argv[0]
output_path = script_argv[1]

print('import obj model from file: ', input_path)

inputExension = input_path.split(".")
inputExension = inputExension[1]
print(output_path)

outputExension = output_path.split(".")
print(outputExension)

outputExension = outputExension[1]
print(outputExension)

if inputExension == "obj":
    ops.wm.obj_import(filepath=input_path)
elif inputExension == "ply":
    ops.import_mesh.ply(filepath=input_path)

importedModel = context.scene.objects[-1]
print('Model in the scene: ', importedModel)

# select the obj model to fix pose
override = context.copy()
override['selected_objects'] = [importedModel]

# transform the model, fix pose
with context.temp_override(**override):
    ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS')
    ops.object.location_clear()
    importedModel.rotation_euler = (0, 0, 0)

    # Save the model as the format specified in the output path
    if outputExension == "glb":
        ops.export_scene.gltf(filepath=output_path, export_format='GLB', check_existing=False)
    elif outputExension == "obj":
        ops.wm.obj_export(filepath=output_path, path_mode='COPY')
    elif outputExension == "fbx":
        ops.wm.fbx_export(filepath=output_path)