# This script is used to upload 3D model iterations to a server at fixed intervals.
# It checks for new iterations in a specified directory and uploads them using curl.
# Usage: ./uploadScheduler.sh <captureID> <datasetName> <iterationID> <endID>
# captureID: Unique identifier. The uploaded models will be written into the database as this ID.
# datasetName: Name of the dataset folder where iterations are stored. Models from this folder will be uploaded.
# iterationID: The iteration ID to start the upload process from.
# endID: The last iteration ID to end the upload process.

# Config variables
interval=2.2

# upload variables (DO NOT CHANGE)
iterationAvailable=true

#model IDs
captureID=SOMETHING_RANDOM
iterationID=1 # updated with UpdateIterationID()
datasetName=""
endID=0
# folder and file paths, built with BuildUpdateCmd()
iterationCheckPath=""
modelFilePath=""
materialFilePath=""
textureFilePath=""
#uploading cmd string, built with BuildUpdateCmd()
uploadCmdBuilt=""



UpdateIterationID() {
    ((iterationID++))
}

VaildateIterationFolderExists() {
    echo "Checking for next vaild iteration..."
    if [ -d "$iterationCheckPath" ]; then
        if [ "$iterationID" -gt "$endID" ]; then # Added spaces and quotes
            iterationAvailable="false"
            echo "Completed uploading of all iterations. Stopped at iteration $endID."
        else
            iterationAvailable="true"
            echo "Iteration directory '$iterationCheckPath' exists!"
        fi
    else
        iterationAvailable="false"
        echo "Iteration directory '$iterationCheckPath' does not exists..."
    fi
}

BuildUpdateCmd() {
    # folder and file paths
    # iterationCheckPath="./captures/sampleupload_progressiveSofa/${iterationID}"
    iterationCheckPath="./captures/${datasetName}/${iterationID}"
    # modelFilePath="${iterationCheckPath}/$iterationID.obj"
    # materialFilePath="${iterationCheckPath}/2907-${iterationID}_mesh.mtl"
    # textureFilePath="${iterationCheckPath}/texture.jpg"
    modelFilePath="${iterationCheckPath}/$iterationID.glb"

    #uploading cmd string
    uploadCmdBuilt=(
    curl
    -v
    -k
    -X POST
    "https://localhost:8000/uploadIndividualGLB?captureID=${captureID}"
    -F "modelFile=@${modelFilePath}"
    # -F "materialFile=@${materialFilePath}"
    # -F "textureFile=@${textureFilePath}"
    )
}

# Initialize settings ------------------------------------------------------------
captureID=$1
# iterationID=1
datasetName=$2
iterationID=$3
endID=$4

BuildUpdateCmd

# Core code starts here! --------------------------------------
echo ""
echo -e "\e[1m*********************** Upload Scheduler started! ***********************\e[0m"
echo "Scheduled to upload at fixed intervals of every $interval seconds."
echo ""

VaildateIterationFolderExists

# Loop and check till no new iterations are left
while [ "$iterationAvailable" == "true" ]
do
    echo -e "\e[1m======================== Uploading iteration $iterationID ========================\e[0m"
    echo "Calling upload cmd: ${uploadCmdBuilt[@]}"
    eval ${uploadCmdBuilt[@]}
    echo -e "\e[1m========================\e[0m \e[1;32mCompleted iteration $iterationID uploading\e[0m \e[1m========================\e[0m"
    echo ""

    UpdateIterationID
    BuildUpdateCmd
    VaildateIterationFolderExists

    if [ "$iterationAvailable" == "true" ]; then
        echo -e "\e[32mNewer iteration found!\e[0m"
        echo ""
        echo "Waiting for $interval seconds before next scheduled upload..."
        sleep $interval
    else
        iterationAvailable="false"
    fi
done
echo ""
echo -e "\e[31mNo newer iteration found. Script will terminate.\e[0m"

echo ""
echo -e "\e[1m*********************************************************************\e[0m"