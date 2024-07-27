#
# Testing purposes only.
#

from typing import Dict
from fastapi import APIRouter
from ..modules.model_database import document_writer
from ..modules.model_database import client_requests

mongodb_test_router = APIRouter(tags=["mongodb_config"], prefix="/configdb-tests")


@mongodb_test_router.on_event("startup")
def startup_msg():
    print("# MongoDB test router is mounted")

@mongodb_test_router.get("/ad-hoc-test")
def adhoc_test():
    data = None

    data = client_requests.fetch_edit_room_previews()

    return {
        "msg": "ok",
        "data": data
        }