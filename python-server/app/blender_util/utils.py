import subprocess
import shutil
import os.path

# input_path: input .obj filepath
# output_path: output .glb filepath
def run_post_processing_linux(input_path, output_path):
    blender_bin = shutil.which('blender')
    if blender_bin:
        print('Found:', blender_bin)
    else:
        print('Unable to find blender!')
        return

    command_string = f'{blender_bin} --background --render-output output --python post_processing.py -- {input_path} {output_path}'
    subprocess.run(command_string, shell=True)


# input_path: input .obj filepath
# output_path: output .glb filepath ending with "/" character
# model_name: name of model file
# render_name: name of rendered image
def run_post_processing_windows(input_model_path, output_path, model_name, render_name):
    render_output = os.path.abspath(output_path) + "/" + render_name
    blender_bin = shutil.which('blender')
    if blender_bin:
        print('Found:', blender_bin)
    else:
        print('Unable to find blender!')
        return False

    print("-#-\n-#-\n-#-\n")
    print("Abs Path: " + os.path.abspath(""))
    print("Input Path: " + input_model_path)
    print("Output Path: " + output_path)

    print("Model Name: " + model_name)
    print("Render Name: " + render_name)

    command_string = f'"{blender_bin}" --background --render-output {render_output} --python app/blender_util/post_processing.py -- {input_model_path} {output_path + "/" + model_name}'
    subprocess.run(command_string, shell=True)
    return True