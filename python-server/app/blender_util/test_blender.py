#
# Blender testing purposes only
# 
import utils


def main():
    utils.run_post_processing_windows("input/2.obj", "output" , "2.glb", "blender.png")
    pass

if __name__ == "__main__":
    main()