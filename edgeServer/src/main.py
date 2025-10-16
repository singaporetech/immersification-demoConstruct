import os
import sys

demoConstructPath = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'edgeServer', 'src'))
sys.path.insert(0, demoConstructPath)

from serverConfig import severStartUp

if __name__ == "__main__":
    severStartUp()