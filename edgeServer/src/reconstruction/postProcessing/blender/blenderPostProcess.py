import subprocess
import shutil
import os.path


# input_path: input .obj filepath
# output_path: output .glb filepath ending with "/" character
# model_name: name of model file
# render_name: name of rendered image
def run_model_conversion(input_model_path, output_model_path, model_output_name):
    blender_bin = shutil.which("blender")
    if not blender_bin:
        # Fallback to Scoop installation on Windows
        scoop_proc = subprocess.run(
            "scoop prefix blender", shell=True, capture_output=True
        )
        scoop_prefix = scoop_proc.stdout.decode().strip().strip('"')
        candidate_path = scoop_prefix + "\\blender.exe"
        if os.path.exists(candidate_path):
            blender_bin = candidate_path

    if blender_bin:
        print("Found:", blender_bin)
    else:
        print("Unable to find blender!")
        return False

    command_string = f'"{blender_bin}" --background --python src/reconstruction/postProcessing/blender/blenderModelConversion.py -- {input_model_path} {output_model_path + "/" + model_output_name}'
    print(command_string)
    subprocess.run(command_string, shell=True)
    return True


def run_thumbnail_generation(
    input_model_path, output_thumbnail_path, thumbnail_render_name
):
    render_output = os.path.abspath(output_thumbnail_path) + "/" + thumbnail_render_name
    blender_bin = shutil.which("blender")
    if blender_bin:
        print("Found:", blender_bin)
    else:
        print("Unable to find blender!")
        return False

    command_string = f'"{blender_bin}" --background --render-output {render_output} --python src/reconstruction/postProcessing/blender/blenderthumnailGenerator.py -- {input_model_path}'
    print(command_string)
    subprocess.run(command_string, shell=True)
    return True
