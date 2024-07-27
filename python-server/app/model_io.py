import os
import base64
import shutil
import datetime

capture_directory = "captures"
model_directory = "models"
image_directory = "images"
download_model_endpoint = "/downloadModel"

#Scans directory for sub-folders and returns a list of directory names.
def get_path_directories(path):
    directories = []
    with os.scandir(path) as entries:
        for entry in entries:
            if entry.is_dir():
                directories.append(entry.name)
    return directories

def list_to_string(list):
    return ",".join(str(item) for item in list)

def GetBase64Data(path: str):
    file = open(path, "rb")
    data = file.read()
    file.close()
    return base64.b64encode(data).decode("utf-8")

def CreateZipFileFromPath(outputPath, pathToZip):
    shutil.make_archive(outputPath,"zip", pathToZip)

def get_file_meta_data(file_path: str):
    def to_string_dt(dt):
        timestamp = datetime.date.fromtimestamp(dt)
        return timestamp.strftime("%d/%m/%Y")
    
    if os.path.exists(file_path) != True:
        return {}
    
    file_stats: os.stat_result = os.stat(file_path)
    
    return {
        "created_date" : to_string_dt(file_stats.st_ctime),
        "modified_date": to_string_dt(file_stats.st_mtime),
        "accessed_date": to_string_dt(file_stats.st_atime)
    }