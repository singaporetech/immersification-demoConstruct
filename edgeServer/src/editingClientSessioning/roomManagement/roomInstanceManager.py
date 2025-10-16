"""
This script defines a helper class RoomFileManager that handles file io of room instances.
Editing_Server stores instance of this and relies on this class for serialization of rooms.

#CONSIDER MIGRATING THIS INTO A DATABASE FEATURE INSTEAD
"""
import os.path

from editingClientSessioning.roomManagement.roomInstance import RoomInstance, RoomPreview
from database.mongoDB import documentWriter, types

class RoomInstanceManager:
    DEFAULT_FILE_NAME = "New Room"

    def __init__(self, room_directory: str):
        self.room_directory = room_directory
        self.filename_to_id_dict = {}

    def __Handle_filename_conflict(self, fileName: str):
        # For the time being, just allow overwrite to same file without checking.
        if fileName.endswith(".json"):
            fileName = fileName.replace(".json", "")

        splits = fileName.split("-")
        number = 0
        if splits[-1].isdigit():
            number = int(splits[-1])
            number += 1
            del(splits[-1])

        new_file_name = "-".join(splits) + str(number) + ".json"

        return new_file_name

    # def save_to_file(self, room_instance: RoomInstance, fileName: str, overwrite_existing: bool = False):
    #     if len(fileName) == 0:
    #         fileName = RoomInstanceManager.DEFAULT_FILE_NAME
        
    #     # Check if file name exists. If already exists, handle filename conflict
    #     while os.path.exists(self.room_directory + fileName) == True and overwrite_existing == False:
    #         fileName = self.__Handle_filename_conflict(fileName)
    #         break
        
    #     room_instance.remove_deleted_instances()
    #     room_instance.serialize(self.room_directory, fileName)
        
    #     return fileName

    def save_to_mongodb(self, room_instance: RoomInstance):

        result = documentWriter.upload_unique_object(
            types.CollectionType.ROOMS,
            room_instance, 
            {"room_id": room_instance.room_id},
            overwrite=True)
        if result:
            print("- Saved room to MongoDB: ", room_instance.name)
        else:
            print("- Room upload to MongoDB failed.")

    def load_room_preview(self, fileName):
        try:
            return RoomPreview.deserialize(self.room_directory, fileName)
        except:
            print("File does not exist in load preview")
        return None

    def load_room_previews(self):
        model_previews = []

        with os.scandir(self.room_directory) as entries:
            for entry in entries:
                if entry.is_file() == False:
                    continue
                if entry.name.endswith(".json") == False:
                    continue
                preview = RoomPreview.deserialize(self.room_directory, entry.name)
                model_previews.append(preview)

        return model_previews

    def load_room_instance(self, room_id: int):
        new_instance = None

        filter = {
            "room_id":  room_id
        }

        doc = types.collections_dict[types.CollectionType.ROOMS].find_one(filter)

        new_instance = RoomInstance.load_from_dict(doc)

        return new_instance
