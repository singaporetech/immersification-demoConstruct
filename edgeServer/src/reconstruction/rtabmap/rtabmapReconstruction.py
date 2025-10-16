import os, shutil, subprocess
from colorama import Back, Style

# Generic functions inmport
from utililites import directoryTools

from datetime import datetime
from reconstruction.postProcessing.blender.blenderPostProcess import (
    run_model_conversion,
    run_thumbnail_generation,
)


# Function used to run RTAB-Map recosonstruction using .db files
def runRtabmapReconstruction(
    inputPathRoot: str,
    tempModelOutputPathRoot: str,
    ModelOutputPathRoot: str,
    databaseFileName: str,
    captureID: str,
    iterationID: str,
):
    reconstructionSuccess = False

    print(
        "========================================================\n"
        + f" STARTING RECONSTRUCTION FOR {captureID}  \n"
        + f" ITERATION ID: {iterationID}  \n"
        + "========================================================\n"
    )

    now = datetime.now()
    print("Start time: ")
    print(now.strftime("%H:%M:%S"))

    inputName = databaseFileName + ".db"
    reprocessedDB = databaseFileName + "_reprocessed.db"

    # To run preprocessing of .db file using rtabmap's reprocess.
    reprocessOptions = ""
    reprocessCmd = "rtabmap-reprocess"

    # To run reconstruction of .db file using rtabmap's export.
    reconstructOptions = '--mesh --texture --texture_size 8192 --texture_count 1 --texture_range 3 --texture_angle 0 --texture_depth_error 0 --texture_roi_ratios "0 0 0 0" --min_cluster 50 --poisson_depth 0 --poisson_size  0.03m --max_polygons 300000'
    reconstructCmd = "rtabmap-export"

    # Prepend the current working directory to the input path
    inputDir = os.path.abspath(inputPathRoot)
    outputDir = os.path.abspath(tempModelOutputPathRoot)

    # Output file path for the reconstructed model
    tempOutputPrefix = os.path.join(outputDir, f"{databaseFileName}_mesh")
    tempOutputOBJ = f"{tempOutputPrefix}.obj"
    tempOutputMTL = f"{tempOutputPrefix}.mtl"
    tempOutputJPG = f"{tempOutputPrefix}.jpg"

    # If Windows, run outside of Docker
    if os.name == "nt":
        reprocessCmd += (
            f" {inputDir}/{inputName} {reprocessOptions} {inputDir}/{reprocessedDB}"
        )
        print(reprocessCmd)

        # system cmd to call preprocessing of db file
        os.system(reprocessCmd)

        reconstructCmd += f" {reconstructOptions} --output_dir {outputDir} --output {databaseFileName} {inputDir}/{reprocessedDB}"
        print(reconstructCmd)

        # run reconstruction cmd
        os.system(reconstructCmd)

        # set to True, as os.system does not return error code on Windows
        reconstructionSuccess = True

    else:
        reprocessCmd += f" {inputName} {reprocessOptions} {reprocessedDB}"
        # Run the command with Docker image `introlab3it/rtabmap:focal`
        dockerReprocess = f'docker run --rm -v "{inputDir}":/temp -w /temp introlab3it/rtabmap:focal {reprocessCmd}'

        print(dockerReprocess)

        # system cmd to call preprocessing of db file
        subprocess.run(dockerReprocess, shell=True)

        # create strings for reconstruction cmd
        reconstructCmd += f" {reconstructOptions} --output_dir /output --output {databaseFileName} input/{reprocessedDB}"
        dockerOpts = f"--rm -w / -v {inputDir}:/input -v {outputDir}:/output"
        dockerImg = "introlab3it/rtabmap:focal"
        dockerRecon = f"docker run {dockerOpts} {dockerImg} {reconstructCmd}"

        print(dockerRecon)

        # run reconstruction cmd
        reconstructionSuccess = subprocess.run(dockerRecon, shell=True).returncode == 0

    over = datetime.now()
    print("End time: ")
    print(over.strftime("%H:%M:%S"))

    # reconstructionSuccess if all commands were successful and output files exist
    reconstructionSuccess = (
        reconstructionSuccess
        and os.path.isfile(tempOutputOBJ)
        and os.path.isfile(tempOutputMTL)
        and os.path.isfile(tempOutputJPG)
    )

    if reconstructionSuccess:
        # If the output directory does not exist, create it
        # finalOutputDir = os.path.abspath(ModelOutputPathRoot + "/" + iterationID)
        # if not os.path.exists(finalOutputDir):
        #     directoryTools.create_directory(finalOutputDir)

        finalOutputOBJ = os.path.join(tempModelOutputPathRoot, f"{iterationID}.obj")
        # finalOutputOBJ = f"{finalOutputDir}/{iterationID}.obj"
        # finalOutputMTL = f"{finalOutputDir}/{iterationID}.mtl"
        # finalOutputJPG = f"{finalOutputDir}/texture.jpg"

        # Move the generated files to the final output directory
        # os.rename(tempOutputJPG, finalOutputJPG)
        # os.rename(tempOutputMTL, finalOutputMTL)
        os.rename(tempOutputOBJ, finalOutputOBJ)

        print("Model available at: " + finalOutputOBJ)
        color = Back.GREEN

    else:
        print("Model failed to reconstruct.")
        color = Back.RED

    print(
        f"{color}========================================================\n"
        f" ENDING RECONSTRUCTION FOR {captureID} \n"
        f" ITERATION ID: {iterationID} \n"
        f" RECONSTRUCT RESULTS: {reconstructionSuccess} \n"
        f"========================================================\n{Style.RESET_ALL}"
    )

    return {
        "success": reconstructionSuccess,
        "Capture ID": databaseFileName,
        "iteration": iterationID,
    }


# Post reconstruction that utilizes blender to create an image thumbnail
# and rotate the reconstructed model to be parallel to the ground
def runPostReconstruction(
    oldModelPathRoot: str,
    newModelPathRoot: str,
    iterationID: str,
    oldFile_extension: str,
    deleteOldPathContains: bool,
):
    oldModelPathRoot = str(oldModelPathRoot)
    newModelPathRoot = str(newModelPathRoot)
    iterationID = str(iterationID)
    oldFile_extension = "." + str(oldFile_extension)

    allProcessesSuccessful: bool = False
    glbSuccess: bool = False
    objSuccess: bool = False
    thumbnailSuccess: bool = False

    outputFileExtension: str = "." + oldFile_extension
    has_thumbnail: bool = False

    oldFileName = iterationID + oldFile_extension
    oldFilePath = oldModelPathRoot + "/" + oldFileName

    newFileGLBName = iterationID + ".glb"
    newFileOBJName = iterationID + ".obj"

    newFileFolderPath = newModelPathRoot + "/" + iterationID

    if os.path.isfile(oldFilePath):
        # newName = nextModelID + ".obj"
        # newNamePath = tempPath + "/" + newName
        # outputPath = modelPath + "/" + nextModelID
        # outputPath is iteration ID folder only, not path to file
        # #Run post-processing.
        # post_process_complete = blend_utils.run_post_processing_windows(newNamePath, outputPath, nextModelID + ".glb", "thumbnail")

        # Run conversion to GLB
        processComplete = run_model_conversion(
            oldFilePath, newFileFolderPath, newFileGLBName
        )
        if processComplete == True:
            print(
                "========================================================\n"
                + f" GLB CONVERSION SUCCESSFUL FOR RECONSTRUCTION {oldFileName}  \n"
                + f" NEW FILE NAME: {newFileGLBName}  \n"
                + "========================================================\n"
            )
            print("Model available at: " + newFileFolderPath)

            outputFileExtension = ".glb"
            glbSuccess = True

        # Reset the process bool for the next process
        processComplete = False

        # Run conversion to OBJ
        processComplete = run_model_conversion(
            oldFilePath, newFileFolderPath, newFileOBJName
        )
        if processComplete == True:
            print(
                "========================================================\n"
                + f" OBJ CONVERSION SUCCESSFUL FOR RECONSTRUCTION {oldFileName}  \n"
                + f" NEW FILE NAME: {newFileOBJName}  \n"
                + "========================================================\n"
            )
            print("Model available at: " + newFileFolderPath)

            # outputFileExtension = ".obj"
            objSuccess = True

        # TODO: Rename from {captureID}-{iterationID}_mesh.jpg to texture.jpg
        # Change line in corresponding `.mtl` file
        # map_Kd {captureID}-{iterationID}_mesh.jpg -->
        # map_Kd texture.jpg
        processComplete = False

        # Run thumbnail generation
        processComplete = run_thumbnail_generation(
            oldFilePath, newFileFolderPath, "thumbnail"
        )
        if processComplete == True:
            print(
                "========================================================\n"
                + f" THUMNAIL GENERATION SUCCESSFUL FOR RECONSTRUCTION {oldFileName}  \n"
                + "========================================================\n"
            )
            print("Thumbnail available at: " + newFileFolderPath)

            has_thumbnail = True
            thumbnailSuccess = True

        if objSuccess == True and glbSuccess == True and thumbnailSuccess == True:
            allProcessesSuccessful = True

        if deleteOldPathContains == True and allProcessesSuccessful == True:
            print("Deleting temporary files at: " + oldModelPathRoot)
            shutil.rmtree(oldModelPathRoot)

    return {
        "success": allProcessesSuccessful,
        "version": iterationID,
        "file_type": outputFileExtension,
        "has_thumbnail": has_thumbnail,
    }
