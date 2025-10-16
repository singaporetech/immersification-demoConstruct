#
# Testing purposes only.
#

from typing import Dict
from fastapi import APIRouter
from database.mongoDB import clientRequests

router = APIRouter(tags=["mongodbTestsRouter"], prefix="/mongodbTestsRouter")

@router.on_event("startup")
def startup_msg():
    print("# MongoDB test router is mounted")

@router.get("/ad-hoc-test")
def adhoc_test():
    data = None

    data = clientRequests.fetch_edit_room_previews()

    return {
        "msg": "ok",
        "data": data
        }