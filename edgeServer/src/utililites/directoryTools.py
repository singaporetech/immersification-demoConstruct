import os
import shutil
import zipfile

def create_directory(path):
    try:
        os.makedirs(path, exist_ok=True)
        print(f"Folder '{path}' created sucessfully")
    except OSError as e:
        print(f"Failed to create directory: {e}")
        return {"error": "Failed to create directory"}

def delete_directory(path):
    try:
        shutil.rmtree(path)
        print(f"Folder '{path}' deleted sucessfully")
    except FileNotFoundError:
        print(f"Folder '{path}' not found.")
    except OSError as e:
        print(f"Failed to delete directory: {e}")
        return {"error": "Failed to delete directory"}

def unzip_file(zip_file_path, extract_to_path):
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to_path)