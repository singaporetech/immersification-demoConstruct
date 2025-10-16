### Real-time 3D Reconstruction and Collaborative Authoring Platform

`r3cap` aims to democratize the construction of digital twin environments by providing an accessible platform that allows different users to populate, edit and interact with shared 3D digital replicas, all at the same time.

<p align="center">
  <img src="/images/overview.png" width="90%">
</p>

Existing digital twinning tools often suffer from complexities that render them inaccessible to non-technical users. These tools typically require specialized expertise and hardware sensors to synchronize real-world environments with their digital counterparts, limiting their usability and scalability across diverse settings. To address these issues, we developed the r3cap open-source library, designed to empower non-technical users to easily create and maintain high-fidelity, interactive 3D models in real-time. By simplifying the process and reducing the dependency on extensive hardware, r3cap aims to democratize digital twinning technology, making it accessible and practical for a broader range of applications, including healthcare, education, etc.

A simplified architecture of r3cap is as shown below.

<img src="/images/architecture.jpg" width="50%">

Here's a video demonstrating r3cap's key interactions.

[<img src="/images/r3cap-youtube-thumbnail.png" alt="Video demonstrating r3cap" width="50%">](https://www.youtube.com/watch?v=8J5kFBGt28Q)

# Project Contributors

Tan Chek Tien, Leon Foo Cewei, Sukumaran Nair Nirmal, Shen Songjia, Liuziyi, Jeannie Lee, Indriyati Atmosukarto

# Publications

This repo (under its previous name, `demoConstruct`) was released as part of a SIGGRAPH Labs presented at SIGGRAPH 2025. The paper can be accessed [here](https://dl.acm.org/doi/10.1145/1234567.1234567), and the bibtex to cite our paper is as below:

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

Note: The 3D models and other large files in this repository are stored using Git Large File Storage. Thus, you need to have `git-lfs` installed to clone this repository successfully.

The `r3cap` repository has 3 main folders

```
├── edgeServer
├── captureClient
└── editingClient
```

## edgeServer (Python Server)
This contains the files and python code used to initialize the server, connect to mongoDB, and provide server-side services such as storing of capture and model data, 3D reconstruction, and post-processing with blender.

## captureClient (Mobile)
This contains the files and code for building the iOS app version of the capture client for iPhone or iPad. The code in this folder was derived from the Xcode project in the [RTAB-Map repository](https://github.com/introlab/rtabmap) and modified for the purpose of the r3cap project.

## editingClient (WebXR)
This contains the files needed to host the editing client web app for PC and VR.

For the server and clients to work and communicate, currently the devices need to be connected to the same network (e.g., internal network, or a network served by a router).

<!--NOTE: the 'capture-client-web' folder contains an older web-app version of the capture-client, that utilizes Alicevision Meshroom for 3D reconstruction via photogrammetry. It is not updated and may have issues functioning properly either alone, or with the server or other editing clients.-->

---

# Installation, Usage, and Development

## Prerequisites

Below are the OS-specific pre-requisites needed to run the various components of r3cap. For each component, you may also need to install additional dependencies (e.g. node modules), the installation instructions for which will be listed under the respective sections of those components.

### macOS

You may install all required dependencies using [brew](https://brew.sh/) by running the following command in your terminal (assuming you already have `brew` installed):
``` bash
brew install uv mongodb-community mkcert cmake node mongosh fastlane
brew tap mongodb/brew && brew install mongodb-database-tools
```

You will also need the following applications, which you may install via `brew` as well:

``` bash
brew install --cask docker blender
```

After installing docker, you will also need to pull the `rtabmap` image by running the following command:
``` bash
docker pull introlab3it/rtabmap:focal
```

### Windows

All commands on a Windows machine should be run in PowerShell. While installing the dependencies below, we recommend using a privileged PowerShell instance (i.e., "Run as Administrator").

You may install the most of the required dependencies using [scoop](https://scoop.sh/) by running the following command (assuming you already have `scoop` installed):
```
scoop install git
scoop bucket add extras
scoop install uv mongodb cmake nodejs mongodb-database-tools blender mkcert mongosh vcredist
```

You will also need to manually install `rtabmap`. Download and install release 0.23.1 from the releases section of the official RTABMap repository, linked [here](https://github.com/introlab/rtabmap/releases/tag/0.23.1). Make sure to download the `rtabmap-<version>-win64.exe` file and _not_ the `rtabmap-<version>-win64.zip` file. Please select "Add RTABMap to the system PATH for all users" when prompted by the installation wizard.

## edgeServer (Python Server)

The edgeServer refers to the 'edgeServer' folder and its contents.
It contains the files and code necessary to hosts the server which will handle the following:
- Retrieve and storage files
- Read and write documents to MongDB
- Provide 3D reconstruction and post-processing services

### Dependencies

#### Python Libraries

We manage our Python dependencies using [uv](https://docs.astral.sh/uv). You may setup your Python virtual environment by running:
``` bash
uv sync --frozen
```

This should create a virtual environment with the correct Python version (Python <=3.12.*) and all the necessary dependencies installed. From hereon, execute all python commands in the virtual environment, either by activating the virtual environment (macOS: `source .venv/bin/activate`, Windows: `.\.venv\Scripts\activate.ps1`), or by adding the prefix `uv run` to your python commands.


#### MongoDB

We use [MongoDB](https://www.mongodb.com) to manage our rooms, reconstructions and prefabs.

The instructions below are to be run in your terminal. As the commands only have to be copy-pasted in to your terminal, we recommend following these steps through a CLI to ensure everything is setup correctly. However, if you feel more comfortable using a GUI, you may use [MongoDB Compass](https://www.mongodb.com/products/compass) instead. For instructions on how to setup the database via MongoDB Compass, please refer to the instructions at the end of this section.

1. Start the MongoDB service.

   To start the MongoDB service on macOS, run:
   ``` bash
   brew services start mongodb-community
   ```

   To start the MongoDB service on Windows, run:
   ``` bash
   mongod
   ```
   The MongoDB service will now continue to run until you stop it by either closing the PowerShell instance or pressing `Ctrl+C`. Thus, you must run the following commands in a new PowerShell instance.

2. Start the MongoDB shell by running `mongosh`. The following commands should then be run in the `mongosh` shell instance that opens.

3. Create a database named `democonstructdb` by running:
  ```
  use democonstructdb
  ```

  You should see a message that you have switched to the `democonstructdb` database (automatically created if it does not exist).

4. Create three collections inside `democonstructdb` by running:
  ```
  db.createCollection('prefabs')
  db.createCollection('reconstructions')
  db.createCollection('rooms')
  ```
  You should see `{ok: 1}` after the commands.

5. Quit the `mongosh` shell instance by pressing `Ctrl+D` and navigate to the `edgeServer` directory in your terminal. There, use `mongoimport` to import the initial reconstruction and room data into the respective collections by running:
  ```
  mongoimport --db democonstructdb --collection reconstructions --file democonstructdb.reconstructions.json --jsonArray
  mongoimport --db democonstructdb --collection rooms --file democonstructdb.rooms.json --jsonArray
  ```

##### MongoDB Compass (GUI alternative for steps 1-5)

If you have already followed the above instructions to setup MongoDB via the terminal, you may skip this section. It produces the same end result as the above instructions, but using the GUI provided by MongoDB Compass.

1. Open MongoDB Compass and connect to your MongoDB instance (for local setups, this is usually `mongodb://localhost:27017`).

2. Create or select the `democonstructdb` database:
   - If it already exists, select it in the left sidebar.
   - If it does not exist, click "Create Database", set Database Name to `democonstructdb` and Collection Name to `prefabs`, then click "Create Database".

3. Ensure the following collections exist under `democonstructdb` (create them if they are missing):
   - `prefabs`
   - `reconstructions`
   - `rooms`

4. Import initial data into the collections:

   - `reconstructions` collection:
     - Click the "reconstructions" collection.
     - Click "Add Data" > "Import JSON".
     - Select `democonstructdb.reconstructions.json` and ensure "JSON Array" is checked.
     - Click "Import".

   - `rooms` collection:
     - Click the "rooms" collection.
     - Click "Add Data" > "Import JSON".
     - Select `democonstructdb.rooms.json` and ensure "JSON Array" is checked.
     - Click "Import".

#### Blender

We use Blender for the post-processing of 3D reconstructions. If you used the methods above to install Blender, *or* running `blender --version` in your terminal returns a version number, then you may skip this step.

However, if you did not install Blender through `scoop` on Windows or `brew` on macOS, *and* Blender is not on your `PATH`, you will need to add the Blender executable to your `PATH` so that the server can run Blender commands through the command line.

Note: On Windows, when Blender is installed via `scoop`, it is not added to your `PATH`. Thus, running `blender --version` will not yield a version number. **However**, you may still skip this step, as our code leverages `scoop prefix blender` to get the appropriate path to the Blender executable.

On macOS, you may add the following line to your `~/.zshrc` file to add Blender to your `PATH` (assuming you installed Blender in the default location):
``` bash
export PATH="/Applications/Blender.app/Contents/MacOS:$PATH"
```

On Windows, you may add the path to the Blender executable (likely `C:\Program Files\Blender Foundation\Blender <version>\`) by updating the `PATH` environment variable under `System Properties` > `Environment Variables`.

 #### `mkcert`

We use `mkcert` to create a local certificate authority and generate locally-trusted certificates so that we can access the server via HTTPS on localhost.


Navigate to the `edgeServer` directory in your terminal and run the following command to create a local certificate:

``` bash
mkcert -install
mkcert -cert-file ssl-cert.pem -key-file ssl-key.pem 127.0.0.1 ::1 localhost
```

To use the Capture Client with your computer, you'll need to append your IP address to the end of the above command.

### Usage

In your terminal, navigate to the `edgeServer` folder and run the following command:
``` bash
python -m src.main
```
The server will start up and you should see a message in the CLI that the server has started.

If you want to want to test the server by itself, you may navigate to `http://localhost:8000/docs` on a browser of your coice. You may use this to test the `edgeServer` without setting up the capture client.

<!--If you wish to use the older web-app capture client from the "capture-client-web" folder, you will need to install/copy meshroom in the server directory as well.-->
<!--- (For 3D reconstruction using the web-app capture client and meshroom photogrammetry) [Meshroom](https://github.com/alicevision/Meshroom) 2021.1.0 or above (copy over to the "python-server" folder)-->

---

### Testing

The repository includes a simple shell script to test the upload endpoint locally (to the server that runs on https://localhost:8000).

To use the shell script, make sure the server is running first by following the instructions above. Then, from anywhere in the repository, run the `upload-dataset.sh` script found in the `scripts` directory. For example, from repository root:

``` bash
bash scripts/upload-dataset.sh
```

This will use curl to send a POST request to `/uploaddataset`, allowing you to simulate what would would happen when the Capture Client uploads some data to the reconstruction server.

By default, it will upload the capture found at `edgeServer/captures/sofa_partial/datasets/2042-10.db`. You may try a different capture by adding an argument at the end, `<path_to_db>`, like so:

``` bash
bash scripts/upload-dataset.sh edgeServer/captures/sofa_partial/datasets/2042-10.db
```

Please note that this path must be relative to the root of the repository. Thus, when specifying a `.db` file to upload, you must run the script from the repository root.

## Capture Client

The Capture Client (CC) source code resides in the `capture-client-xcode` folder.

Currently, only the iOS app client is fully functional (available under the `app/ios` directory). Thus, you will only need a macOS device to develop and use the Capture Client.

NOTE: The `edgeServer` needs to be started for the CC to be able to send `.db` files to the server. Thus, without the server running, 3D reconstruction will not be available. As a standalone iOS app, you may still use the app to capture raw data that will reside as local `.db` files on the iPhone or iPad, which you may then process at a later date.

### Prerequisites

As an Xcode project, the following are needed to build the app:
- macOS device with Xcode installed
- Apple developer account
- iPhone or iPad to build the app on (iPhone tested only on 14 Pro, iPad tested on M2 2022 edition)

#### Installing libraries required for RTABMap

Navigate to `capture-client-xcode/app/ios/RTABMapApp` and run `sh install_deps.sh` to install all dependencies. This should create a `libraries` folder when done.

### Building the app with Xcode for iOS

We use [`gym`](https://docs.fastlane.tools/actions/gym/) to automate building and signing the iOS app.

Navigate to `capture-client-xcode/app/ios` and run:

``` bash
fastlane gym
```

### Using the iOS app

Upon first use, the app will request camera and network permissions. Please allow these permissions for the app to function properly.

During startup, enter the IP address of the host machine running the python server.

---

## Editing Client

The Editing Client (EC) refers to the `editingClient` folder and its contents. It is a web-app that enables users to edit reconstructed models, and populate scenes using these reconstructed models.

NOTE: 'edgeServer' needs to be started or the EC will not be able to retrieve 3D models and view or edit 3D environments. Other functions may not work as intended as well.

## Prerequisites

The following need to be downloaded and/or installed
  - NPM packages listed in package.json (Refer below for how to install this with Node.js)
- (For VR only) Download the [SDK platform tools](https://developer.android.com/tools/releases/platform-tools) for android and the [oculus PC app](https://www.meta.com/help/quest/articles/headsets-and-accessories/oculus-rift-s/install-app-for-link/)

### For Node.js and installing packages

Node.js provides the core foundation for the editing client to run. You can download and install Node.js from the [official Node.js website](https://nodejs.org/en/download/).

If using Windows CLI, start the CLI as administrator, and also use `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` to execute the scripts needed for proper installation.
After installing Node.js, use the node package manager (`npm`) to install all the required javascript (js) dependencies. In the main `editingClient` folder, run `npm install` in the CLI. This will install the packages specified in package.json.

### For SDK platform tools and Oculus PC app for VR

If you want to use the editing client in VR, you need to communicate with the Oculus head-mounted display (HMD) using the Android Debug Bridge (`adb`). `adb` is part of the Android SDK platform tools. You can download the SDK platform tools from the [official Android developer website](https://developer.android.com/studio/releases/platform-tools). You should ensure that `adb` is added to the PATH so that you can run `adb` commands in the CLI. A standard way to check is to run `adb devices` in the CLI after you have connected your Oculus device to your computer via a wired connection. Note that there are more nuances to connecting properly to the Oculus device (e.g., enabling developer mode), and you can find more information on the [official Oculus website](https://developer.oculus.com/documentation/native/android/mobile-adb/).

If you're on Windows, you can download the Oculus PC app from the [official Oculus website](https://www.meta.com/help/quest/articles/headsets-and-accessories/oculus-rift-s/install-app-for-link/) and startup a wired oculus link connection to your PC hosting the editing client.
- note that this is due a limitation of the current implementation, that the VR client can only be accessed via localhost via a desktop browser

## Starting the Editing Client

### Desktop

In the `editingClient` folder, run `npm run dev`. This will start the editing client and  you should see few lines in the CLI showing that your client is running.

We highly recommend using the Chrome browser:
- go to `localhost:4000` (if you are on the host machine),
- or `http://<ip address>:4000` on other machines.

To find your IP address, you may run `ipconfig` (Windows) or `ipconfig getifaddr en0` (MacOS/Linux) on your preferred terminal.

### VR (connected via Quest Link)

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

---

# Editing Client (Medica Twin)

## Regarding New Packages for Medica Twin

Due to `package-lock.json` being in `.gitignore`, any new packages have to be added through Github!

## Prerequisites

Follows the same prerequisites for Editing Client (PC).

## How to create a library from Editing Client(PC) to use in Editing Client(Medica Twin)

First, in your `editingClient` folder, run:
```
npm run pack:lib
```
This will generate and pack `editingClient` into a tarbell in `editingClient` directory named democonstruct-editing-versionno (versionno can be different).
Then change directory to the editingClientMedicaTwin. Run the command:
```
npm update democonstruct-editing
npm install
```
to update and install the `editingClient` library (or any other missing dependencies).

You only need to do this whenever the editingClient source code changes.

### Start the client (PC)

In the `editingClientMedicaTwin` folder, run `npm run dev`. This will start the editing client and  you should see few lines in the CLI showing that your client is running.

We highly recommend using the Chrome browser:

- go to `https://localhost:5000/` (if you are on the host machine),
- or `https://<ip address>:5000` on other machines.
