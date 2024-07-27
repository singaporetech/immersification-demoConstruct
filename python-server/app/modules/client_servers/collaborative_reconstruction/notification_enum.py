from enum import IntEnum

class NotificationCode(IntEnum):
    UpdatedModelVersion = 1
    ClosedRoom = 2
    CreatedMarker = 3
    DeletedUser = 4