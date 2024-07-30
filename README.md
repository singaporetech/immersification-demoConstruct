# Overview

This project aims to **demo**cratize the **construct**ion of digital twin environments by providing an accessible platform that allows different users to populate, edit and interact with shared 3D digital replicas, all at the same time.

<img src="/images/overview.png" width="90%">

Existing digital twinning tools often suffer from complexities that render them inaccessible to non-technical users. These tools typically require specialized expertise and hardware sensors to synchronize real-world environments with their digital counterparts, limiting their usability and scalability across diverse settings. To address these issues, we developed the demoConstruct open-source library, designed to empower non-technical users to easily create and maintain high-fidelity, interactive 3D models in real-time. By simplifying the process and reducing the dependency on extensive hardware, demoConstruct aims to democratize digital twinning technology, making it accessible and practical for a broader range of applications, including healthcare, education, etc.

A simplified architecture of demoConstruct is as shown below.

<img src="/images/architecture.jpg" width="50%">

# Project Contributors

Tan Chek Tien (chek@immersification.com), Leon Foo Cewei, Sukumaran Nair Nirmal, Shen Songjia, Liuziyi, Jeannie Lee, Indriyati Atmosukarto

# Publications

This repo was released as part of a SIGGRAPH Labs presented at SIGGRAPH 2025. The paper can be accessed [here](https://dl.acm.org/doi/10.1145/1234567.1234567), and the bibtex to cite our paper is as below:

```
@inproceedings{10.1145/3641236.3664424,
    author = {Foo, Leon and Tan, Chek Tien and Liu, Liuziyi and Nair, Nirmal Sukumaran and Shen, Songjia and Lee, Jeannie},
    title = {demoConstruct: Democratizing Scene Construction for Digital Twins through Progressive Reconstruction},
    year = {2024},
    isbn = {9798400705182},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3641236.3664424},
    doi = {10.1145/3641236.3664424},
    booktitle = {ACM SIGGRAPH 2024 Labs},
    articleno = {2},
    numpages = {2},
    keywords = {3D Reconstruction, Collaborative Scene Authoring},
    location = {Denver, CO, USA},
    series = {SIGGRAPH '24}
}
```

The architecture was been presented at the 2023 AAAI Summer Symposium. The paper can be accessed [here](https://ojs.aaai.org/index.php/AAAI-SS/article/view/27466/27239), and the bibtex to cite our paper is as below:

```
@inproceedings{foo2023collabreconstruct,
    title={Progressive 3D Reconstruction for Collaborative Construction of Digital Twins},
    author={Leon Foo, Songjia Shen, Ambrose Wee, Chek Tien Tan},
    booktitle={Proceedings of the AAAI Symposium Series},
    volume={1},
    number={1},
    pages={7--10},
    year={2023},
    issue_date = {November 2023},
    publisher = {AAAI Press},
    address = {Washington, DC, USA}
}
```

---

# What is in this repository?

This demoConstruct repository has 3 main folders 
```
├── python-server 
├── editing-client-web
└── capture-client-mobile
```

### python-server
This contains the files and python code used to initialize the server, connect to mongoDB, and provide server-side services such as storing of capture and model data, 3D reconstruction, and post-processing with blender.

### capture-client-mobile
This contains the files and code for building the iOS app version of the capture client for iPhone or iPad. The code in this folder was derived from the Xcode project in the [RTAB-Map repository](https://github.com/introlab/rtabmap) and modified for the purpose of the demoConstruct project.

### editing-client-web
This contains the files needed to host the editing client web app for PC and VR.

For the server and clients to work and communicate, currently the devices need to be connected to the same network (e.g., internal network, or a network served by a router).

<!--NOTE: the 'capture-client-web' folder contains an older web-app version of the capture-client, that utilizes Alicevision Meshroom for 3D reconstruction via photogrammetry. It is not updated and may have issues functioning properly either alone, or with the server or other editing clients.-->

---

# Python Server

The Python Server refers to the 'python-server' folder and its contents.
It contains the files and code necessary to hosts the server which will handle the following:
- Retrieve and storage files
- Read and write documents to MongDB
- Provide 3D reconstruction and post-processing services

## Prerequisites 

### Python

The server is written in Python. It is recommended that you have Python 3.11.4 and above. Please install using your favourite package manager, or the installers from the [official Python website](https://www.python.org/downloads/).

After installing Python, just check that python has been added to the PATH so that you can run python commands properly through a CLI. You may wish to work in a python virtual environment for this project, you can find out more about that [here](https://docs.python.org/3/library/venv.html).

From this project's root folder, use `pip install -r python-server/requirements.txt` to install the necessary packages for the server to run. 

### MongoDB

We are using MongoDB as the database platform. Install MongoDB community using your favourite package manager or the installers from the [official MongoDB website](https://www.mongodb.com/try/download/community).

MongoDB shell (mongosh) should be installed as well. You can check if it is installed by typing `mongosh` in the CLI. If it is not installed, you can install it via the MongoDB website.

In Windows, during installation of MongoDB community, you may check "install MongoDB as a service". If you do not, you need to start up this service every first time you use the database via windows services.

In MacOS,
1. Install MongoDB community using `brew install mongodb-community`
2. Start MongoDB service by running `brew services start path/to/mongodb/mongodb-community` in the CLI. You should see a message that the service has started.

After installing and starting the MongoDB service in your OS, connect to your localhost MongoDB server by running `mongosh` in the CLI to start the MongoDB shell. You should see a message that you are connected to the localhost server.

To setup the demoConstruct database, you need to perform the following steps through mongosh:
- create a new database with name `democonstructdb` by running `use democonstructdb` in the MongoDB shell. You should see a message that you have switched to the `democonstructdb` database (automatically created if it does not exist).
- create 3 collections inside `democonstructdb` with names `prefabs`, `reconstructions`, and `rooms` by running `db.createCollection('prefabs')`, `db.createCollection('reconstructions')`, and `db.createCollection('rooms')` respectively in the MongoDB shell. You should see 'ok' messages.

If you'd prefer to use a GUI for MongoDB, you can use the MongoDB's web interface when you login, or [MongoDB Compass](https://www.mongodb.com/try/download/compass) to perform the above steps.

### Blender
We use Blender for post-processing of 3D reconstructions. Download and install Blender from the [official Blender website](https://www.blender.org/download/).

After installing Blender, you need to add the Blender executable to the PATH so that the server can run Blender commands through the CLI. E.g., in MacOS, you can add the following line to your `.bash_profile` or `.zshrc` file: `export PATH="/Applications/Blender.app/Contents/MacOS:$PATH"`. In Windows, you can add the Blender executable to the PATH via the system's Environment Variables.

<!--**For Meshroom (photogrammetry reconstruction using web-app 'capture-client-web'**-->

<!--Download any Source code zip package from [Alicevision Meshroom](https://github.com/alicevision/Meshroom)'s release section and extract into `.../demoConstruct/projects/demoConstruct/python-server`. Rename the extracted folder to `Meshroom`.-->

<!--NOTE:As stated, the web-app is no longer updated and may not function properly.-->

## How to start the server

From this projects root folder, `cd python-server`, then run `python -m app.main` to start the server. The server will start up and you should see a message in the CLI that the server has started.

If you want to want to test the server alone and any of the python functions, can you use a browser of your choice and navigate to `http://localhost:8000/docs`.

<!--If you wish to use the older web-app capture client from the "capture-client-web" folder, you will need to install/copy meshroom in the server directory as well.-->
<!--- (For 3D reconstruction using the web-app capture client and meshroom photogrammetry) [Meshroom](https://github.com/alicevision/Meshroom) 2021.1.0 or above (copy over to the "python-server" folder)-->

---

# Capture Client (iOS)

The Capture Client (CC) source code resides in the `capture-client-xcode` folder. Currently, only the iOS app client is fully functional. The iOS app resides in the `app/ios` folder.

NOTE: python-server needs to be started for CC be able to send .db files to the server. 3D reconstruction will also not be available. As a standalone iOS, you may still use the app to capture data, which will locally store .db files on the iPhone or iPad.

## Building with Xcode for iOS

### Prerequisites

As an Xcode project, the following are needed to build the app:
- macOS device with Xcode installed
- Apple developer account
- iPhone or iPad to build the app on (iPhone tested only on 14 Pro, iPad tested on M2 2022 edition)

### Installing libraries for Xcode

Navigate to `capture-client-xcode/app/ios/RTABMapApp` and run `sh install_deps.sh` to install all dependencies. This should create a `libraries` folder when done. 

### Building the app with Xcode

Follow the instructions on Apple's [official developer website](https://developer.apple.com/documentation/xcode/building_a_project) to build the app using Xcode.

### Using the iOS app

Upon first use, the app will request camera and network permissions. Please allow these permissions for the app to function properly.

During startup, enter the IP address of the host machine running the python server.

---

# Editing Client

The Editing Client (EC) refers to the 'editing-client-web' folder and its contents. It is a web-app that enables users to edit reconstructed models, and populate scenes using these reconstructed models.

NOTE: 'python-server' needs to be started or the EC will not be able to retrieve 3D models and view or edit 3D environments. Other functions may not work as intended as well.

## Prerequisites

The following need to be downloaded and/or installed
  - NPM packages listed in package.json (Refer below for how to install this with Node.js)
- (For VR only) Download the [SDK platform tools](https://developer.android.com/tools/releases/platform-tools) for android and the [oculus PC app](https://www.meta.com/help/quest/articles/headsets-and-accessories/oculus-rift-s/install-app-for-link/)

### For Node.js and installing packages

Node.js provides the core foundation for the editing client to run. You can download and install Node.js from the [official Node.js website](https://nodejs.org/en/download/).

After installing Node.js, use the node package manager (`npm`) to install all the required javascript (js) dependencies. In the main `editing-client-web` folder, run `npm install` in the CLI. This will install the packages specified in package.json.

### For SDK platform tools and Oculus PC app for VR

If you want to use the editing client in VR, you need to communicate with the Oculus head-mounted display (HMD) using the Android Debug Bridge (`adb`). `adb` is part of the Android SDK platform tools. You can download the SDK platform tools from the [official Android developer website](https://developer.android.com/studio/releases/platform-tools). You should ensure that `adb` is added to the PATH so that you can run `adb` commands in the CLI. A standard way to check is to run `adb devices` in the CLI after you have connected your Oculus device to your computer via a wired connection. Note that there are more nuances to connecting properly to the Oculus device (e.g., enabling developer mode), and you can find more information on the [official Oculus website](https://developer.oculus.com/documentation/native/android/mobile-adb/).

If you're on Windows, you can download the Oculus PC app from the [official Oculus website](https://www.meta.com/help/quest/articles/headsets-and-accessories/oculus-rift-s/install-app-for-link/) and startup a wired oculus link connection to your PC hosting the editing client.
- note that this is due a limitation of the current implementation, that the VR client can only be accessed via localhost via a desktop browser

## How to start the editing client

### Configure client to use the server's IP address

In the main editing-client-web folder open the `websocket.ts` file located in `editing-client-web/src/lib/babylon-scripts` folder.

Edit line 88 `serverURL: string = "ws://<your IP>:8000/start_websocket`. and replace <your IP> with the IP address of the machine running the python server.

### Start the client (PC)

In the `editing-client-web` folder, run `npm run dev`. This will start the editing client and  you should see few lines in the CLI showing that your client is running.

We highly recommend using the Chrome browser:
- go to `localhost:4000` (if you are on the host machine), 
- or `http://<ip address>:4000` on other machines.

### Starting the client (VR)

Currently VR can only be accessed via the localhost of a PC browser running the editing client.
- join an editing room using the steps for the PC client (joining rooms within VR is not supported at the moment)
- connect your Oculus HMD (if you haven't) to your machine via wired link connection and start `adb` in the CLI
- click on the VR icon at the bottom right of the editing client web interface

**VR controls**

*Grab and release objects* - right controller trigger

*Access tools menu* - left controller 'A' button

*Select tool from tools menu* - move "hand" into the tool model

*Move (when not grabbing)* - left controller thumbstick

*Move (walking)* - use real walking motion
