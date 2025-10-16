import socket
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from editingClientSessioning import editingServer

router = APIRouter(tags=["networkingRouter"])

@router.get("/ip")
def get_server_ip():
    try:
        response = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        response.connect(("8.8.8.8", 80))
        ip = response.getsockname()[0]
        response.close()

        # # For getting public IP. Requires internets cannot be done on private.
        # response = urllib.request.urlopen('https://ident.me').read().decode('utf8')

        response = JSONResponse(content={"ip": ip})
        return response
    except:
        return None

@router.on_event("startup")
async def startup_event():
    edit_server = editingServer.create_instance()
    edit_server.initialize()

    # cap_server = capture_server.create_instance()
    # cap_server.initialize()

    pass

@router.on_event("shutdown")
async def shutdown_event():
    editingServer.shutdown_instance()
    # capture_server.shutdown_instance()

# # Testing only function
# @networkingRouter.get("/getbabylon")
# def get_babylon():
#     path = "17.customization"

#     response = FileResponse(path)

#     return response(path)