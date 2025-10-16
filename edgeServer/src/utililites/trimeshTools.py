import trimesh
import trimesh.viewer
import trimesh.scene
from PIL import Image
import pyglet.app

count = 0
_sceneViewer = None
hasTriggered = False

folderPath = None;

renderName = "thumbnail.png"

def _viewerCallback(x):
    global folderPath
    global hasTriggered
    global _sceneViewer
    global count

    count += 1

    if hasTriggered == False and count > 2:
        hasTriggered = True
        _sceneViewer.save_image(folderPath + "/" + renderName)
        #_sceneViewer.close()
        pyglet.app.exit()

def GenerateThumbnail(path):
    splits = path.split("/")
    modelName = splits[-1]
    del(splits[-1])
    path = "/".join(splits)

    print("Creating thumbnail for ", modelName, " in ", path)
    global folderPath
    folderPath = path
    mesh = trimesh.load_mesh(path + "/" + modelName)
    scene = trimesh.Scene()
    
    resultNode = scene.add_geometry(mesh)
    resultNode = scene.add_geometry(mesh)
    corners = scene.bounds
    mat = scene.graph.nodes
    what = mat.mapping.values()
    keys = list(what)
    global _sceneViewer
    _sceneViewer = trimesh.viewer.SceneViewer(
        scene,
        resolution=(512,512),
        background=(255,0,255,0),
        #flags=["cull","wireframe"],
        visible=False,
        callback=_viewerCallback,
        start_loop=False
    )
    _sceneViewer.toggle_culling()
    pyglet.app.run()

    _sceneViewer.close()
    
    global renderName
    global hasTriggered
    global count

    hasTriggered = False
    count = 0

    #Process image
    thumbnailPath = path + "/" + renderName
    image = Image.open(thumbnailPath)
    image = image.convert("RGBA")
    pixdata = image.load()

    width, height = image.size
    for y in range(height):
        for x in range(width):
            if pixdata[x, y] == (255,0,255,255):
                pixdata[x,y] = (0, 0, 0, 0)
    image.save(thumbnailPath, "PNG")
    return thumbnailPath