from fastapi import testclient, FastAPI
import argparse
import threading
import keyboard
from app.server_globals import fastapi_app
from app import server_globals

watched_key = "`"
test_client: testclient.TestClient = None

def _handle_key(event):
    if event.name == watched_key:
        run_test_api()

def run_test_api():
    global test_client
    response = test_client.post("/v2/launchreconstruction/9999")
    
def start_test_client():
    print("# Starting Test Client")
    global test_client
    test_client = testclient.TestClient(fastapi_app)

def keystroke_start_listening():
    keyboard.on_press(_handle_key)
    keyboard.wait("esc")

def initialise():
    #Initializing arg parser and retrieving args used to start python app
    arg_parser = argparse.ArgumentParser(description="Parser for server debug actions")
    arg_parser.add_argument('-test', "--test_api", action="store_true", help="Enable to turn on custom testing of fastapi endpoints")
    arg_parser.add_argument('-key', "--keystroke", help="Key stroke to listen to for testing.")
    arg_parser.add_argument('-false-recon', "--false_reconstruction", action="store_true", help="To disable reconstruction and rely on copying burger model instead")
    args = arg_parser.parse_args()

    keystroke = args.keystroke
    test_api = args.test_api
    false_recon = args.false_reconstruction

    if keystroke:
        global watched_key
        watched_key = keystroke

    if test_api:
        print("Keystroke found: ", watched_key, "\nStarting testing client.")
        start_test_client()
        thread = threading.Thread(target=keystroke_start_listening)
        thread.start()

    if false_recon:
        print("Enabled false reconstruction mode")
        server_globals.false_reconstruction = True
        
