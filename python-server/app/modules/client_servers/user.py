class User:
    def __init__(self, websocket, user_info: dict= None):
        self.id = -1
        self.websocket = websocket
        self.room_id = None
        self.username = "John Doe"
        self.color = [0.2, 0.2, 0.2]
        self.position = [0.0, 0.0, 0.0]
        self.rotation = [0.0, 0.0, 0.0]
        
        self.mark_delete = False
        self.deleted = False

        if(user_info == None):
            return
        
        if "user_id" in user_info:
            self.id = user_info["user_id"]
        if "username" in user_info:
            self.username = user_info["username"]
        if "color" in user_info:
            self.color = user_info["color"]

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "color": self.color,
            "position": self.position,
            "rotation": self.rotation,
            "deleted": self.mark_delete
        }