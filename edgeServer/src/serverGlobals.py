from dotenv import dotenv_values
from pymongo import MongoClient
from pymongo.database import Database
from fastapi import FastAPI

dotenv_config = dotenv_values(".env") 
fastapiServer: FastAPI = None #The fast api app running in this program

mongo_client: MongoClient = None
mongo_database: Database = None

false_reconstruction: bool = False