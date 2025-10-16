from fastapi import APIRouter, File, UploadFile, WebSocket
from websocketCommunications import websocketHandler

router = APIRouter(tags=["websocketRouter"])

@router.websocket("/start_websocket")
async def editingClient_websocket_endpoint(websocket: WebSocket):
    print("started")
    await websocketHandler.StartClientSocket(websocket)