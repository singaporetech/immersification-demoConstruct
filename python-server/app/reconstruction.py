import asyncio
from colorama import Fore, Back, Style

import os
import shutil
from datetime import datetime
from . import utils
from app.blender_util import utils as blend_utils
from app import server_globals

# Deprecated function, no longer user or updated.
# Previously used to run Alicevision Meshroom photogrammetry reconstruction.
def run_Meshroom(captureID: str, modelPath: str, imagePath: str):
    print(
        "************************************ Starting Meshroom reconstruction ************************************\n"
        + "\n**************************************************************************************************"
    )
    now = datetime.now()
    print("Start time: ")
    print(now.strftime("%H:%M:%S"))

    # get a list of all folder names in the directory
    folder_names = [
        f for f in os.listdir(modelPath) if os.path.isdir(os.path.join(modelPath, f))
    ]
    # find the highest numbered folder name
    highest_folder_num = max([int(f) for f in folder_names]) if folder_names else 0
    # determine the next available folder name
    nextModelID = highest_folder_num + 1
    nextModelID = str(nextModelID)

    inputPath = imagePath
    outputPath = modelPath + "/" + nextModelID

    utils.create_directory(outputPath)

    #Create temp folder to store before pre-processing.
    tempPath = modelPath + "/-1"
    if os.path.exists(tempPath) == False:
        utils.create_directory(tempPath)
    

    outputGrap = "out.mg"
    inputGraph = ".\\meshroom-graph\\single-camera.mg"
    imageFilePath = imagePath + "/" + captureID + "-1.png"

    # Old cmd string
    cmdString = (
        '.\Meshroom\meshroom_batch --input '
        + inputPath 
        + ' --output ' 
        + tempPath
    )

    print("Executing command: " + cmdString)

    if server_globals.false_reconstruction:
        burger_directory = "captures/2/models/1/1.obj"
        filename = os.path.basename(burger_directory)
        target_path = tempPath + "/texturedMesh.obj"
        print("Target Path: " + target_path)
        shutil.copy(burger_directory, target_path)
    else:
        print("Regular Reconstruction")
        os.system(cmdString)

    oldNamePath = tempPath + "/texturedMesh.obj"

    success: bool = None
    file_extension: str = None
    has_thumbnail: bool = False

    if os.path.isfile(oldNamePath):
        print( Back.GREEN + 
            "========================= Successful Reconstruction ========================="
        + Style.RESET_ALL)
        print(Style.RESET_ALL + "Reconstruction completed, output file will be renamed.")
        print("Renaming to the next available version ID.")

        newName = nextModelID + ".obj"
        newNamePath = tempPath + "/" + newName
        print("Renaming outout reconstruction model file: " + newName)
        os.rename(oldNamePath, newNamePath)

        #Run post-processing.
        post_process_complete = blend_utils.run_post_processing_windows(newNamePath, outputPath, nextModelID + ".glb", "thumbnail")
        #If post processing failed.
        if post_process_complete == False:
            with os.scandir(tempPath) as files:
                for file in files:
                    shutil.move(file, outputPath)
            file_extension = ".obj"
        else:
            has_thumbnail = True
            file_extension = ".glb"
        
        shutil.rmtree(tempPath)

        success = True
    else:
        print(Back.RED + 
            "========================= Failed Reconstruction ========================="
        + Style.RESET_ALL)
        
        print("No output model.")

        success = False
        shutil.rmtree(tempPath)
        shutil.rmtree(outputPath)

    over = datetime.now()
    print("End time: ")
    print(over.strftime("%H:%M:%S"))
    
    print(
        "************************************* Ending reconstruction **************************************\n"
    )
    
    return {
        "success": success,
        "version": nextModelID,
        "file_type": file_extension,
        "has_thumbnail": has_thumbnail
    }

# Function used to run RTAB-Map recosonstruction using .db files
def run_Rtabmap_Reconstruction(inputPathRoot: str, tempModelOutputPathRoot:str, ModelOutputPathRoot: str, 
                               databaseFileName: str, captureID: str, iterationID: str):
    
    success = False

    print(
        "************************************ Starting Rtab-Map reconstruction ************************************\n"
        + "\n**************************************************************************************************"
    )
    now = datetime.now()
    print("Start time: ")
    print(now.strftime("%H:%M:%S"))

    # inputPathRoot = inputPathRoot + "/" + databaseFileName + ".db"

    # baseReprocessString = "rtabmap-recovery  " + inputPathRoot
    # print("Executing command: " + baseReprocessString)  
    # os.system(baseReprocessString)

    baseReprocessString = "rtabmap-reprocess "
    reprocessInputString = '"' + inputPathRoot + "/" + databaseFileName + '.db"'
    reprocessOptions = " "
    reprocessOutputString = inputPathRoot + "/" + databaseFileName + "_reprocessed.db"

    reprocessCmd = baseReprocessString + reprocessInputString + reprocessOptions + reprocessOutputString
    print("Executing reprocess command: " + reprocessCmd)   

    # system cmd to call reprocessing of db file
    os.system(reprocessCmd)

    reconstructBaseString = "rtabmap-export "
    # options = "--texture --texture_size 8192 --texture_count 1 --texture_range 3 --poisson_depth 9 -texture_angle 0 --texture_depth_error 0 --max_polygons 500000 --color_radius 0 "
    reconstructOptions = "--mesh --texture --texture_size 8192 --texture_count 1 --texture_range 3 --texture_angle 0 --texture_depth_error 0 --texture_roi_ratios \"0 0 0 0\" --min_cluster 50 --poisson_depth 0 --poisson_size  0.03m --max_polygons 300000 "
    # options = "--mesh --texture_size 8192 --texture_count 1 --texture_range 3 --texture_angle 0 --texture_depth_error 0 --texture_roi_ratios \"0 0 0 0\" --min_cluster 50 --poisson_depth 0 --poisson_size  0.03m --max_polygons 300000 "
    # outputString = "--output_dir " + outputPathRoot + " "
    reprocessOutputString = "--output_dir " + tempModelOutputPathRoot  + " " + "--output " + databaseFileName + " "  # + <path> + -1
    reconstructInputPathRoot = inputPathRoot + "/" + databaseFileName + "_reprocessed.db" # + databaseFileName + ".db"

    reconstructionCmd = reconstructBaseString + reconstructOptions + reprocessOutputString + reconstructInputPathRoot
    print("Executing reconstruction command: " + reconstructionCmd)   

    os.system(reconstructionCmd)

    tempOutputFilePath = tempModelOutputPathRoot + "/" + databaseFileName + "_mesh.obj" #check file name here

    if os.path.isfile(tempOutputFilePath):
        print( Back.GREEN + 
            "========================= Successful Reconstruction ========================="
        + Style.RESET_ALL)
        print(Style.RESET_ALL + "Reconstruction completed...")

        # Create new name with string, rename file
        newName = iterationID + ".obj"
        newRenamedPathRootFull = tempModelOutputPathRoot + "/" + newName

        print("Renaming output reconstruct file: " + newName)

        # if not os.path.exists(renamedPathRoot):
        #     utils.create_directory(renamedPathRoot)
            
        os.rename(tempOutputFilePath, newRenamedPathRootFull)

        # Delete tempout folder and files
        # shutil.rmtree(tempModelOutputPathRoot)

        success = True
    else:
        print(Back.RED + 
            "========================= Failed Reconstruction ========================="
        + Style.RESET_ALL)
        
        print("No output model.")

        success = False
        # shutil.rmtree(tempModelOutputPathRoot)
        # shutil.rmtree(ModelOutputPathRoot)

    over = datetime.now()
    print("End time: ")
    print(over.strftime("%H:%M:%S"))
    
    print(
        "************************************* Ending reconstruction **************************************\n"
    )

    return {
        "success": success,
        "iteration": iterationID
    }

# Post reconstruction that utilizes blender to create an image thumbnail
# and rotate the reconstructed model to be parallel to the ground
def runPostReconstruction(oldModelPathRoot: str, newModelPathRoot: str, iterationID: str, oldFile_extension: str, deleteOldPathContains: bool):
    oldModelPathRoot = str(oldModelPathRoot)
    newModelPathRoot =  str(newModelPathRoot)
    iterationID = str(iterationID)
    oldFile_extension = "."+  str(oldFile_extension)

    success: bool = False
    outputFileExtension: str = "."+ oldFile_extension
    has_thumbnail: bool = False

    oldFileName = iterationID + oldFile_extension
    oldFilePath = oldModelPathRoot + "/" + oldFileName

    newFileFolderPath = newModelPathRoot + "/" + iterationID
    newFileName = iterationID + ".glb"
    
    if not os.path.exists(newFileFolderPath):
        utils.create_directory(newFileFolderPath)

    if os.path.isfile(oldFilePath):

        # newName = nextModelID + ".obj"
        # newNamePath = tempPath + "/" + newName
        # outputPath = modelPath + "/" + nextModelID
        # outputPath is iteration ID folder only, not path to file
        # #Run post-processing.
        # post_process_complete = blend_utils.run_post_processing_windows(newNamePath, outputPath, nextModelID + ".glb", "thumbnail")

        #Run post-processing.
        post_process_complete = blend_utils.run_post_processing_windows(oldFilePath, newFileFolderPath, newFileName, "thumbnail")
        if post_process_complete == True:
            print("~~~~~Post reconstruction operations successful~~~~~")
            print("Model iteration and thumbnail available at: " + newFileFolderPath)
            print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
            has_thumbnail = True
            outputFileExtension = ".glb"
            success = True

            if deleteOldPathContains == True:
                print("Deleting tempt files at: " + oldModelPathRoot)
                shutil.rmtree(oldModelPathRoot)


    return {
        "success": success,
        "version": iterationID,
        "file_type": outputFileExtension,
        "has_thumbnail": has_thumbnail
    }
