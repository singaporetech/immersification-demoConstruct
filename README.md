# demoConstruct Open Source

## Introduction

As the name implies, we aim to democratize the construction of digital twin environments. The eventual artifact is a tool for users to collaborate on creating virtual scenes through any platform, for various purposes

![representative_image_16x9](https://github.com/singaporetech/immersification-demoConstruct/assets/51155060/28ba1296-a79a-4823-96e3-ed0b17c93fd7)

## Background

Digital twin technology is a primary area of interest for smart manufacturing. Digital twins also serve as the foundation for AR/VR/MR experiences that are key to Industry 4.0. Constructing high-fidelity 3D digital twins typically require expertise and resources that are not easily accessible to the common consumer. For most development tasks, it is not uncommon to require experienced 3D technical artists working with expensive 3D software.

demoConstruct aims to serve as a branching platform to allow users to adapt and accommodate the source code for the development digital twins in the context of their own use case. With demoConstruct, many untrained users aimming to create digital twin of existing physical locations collaboratively create digital replica of objects and environments any common consumer mobile device and computers, without needing to depend on specialized technical artists and costly resources.

To enable this, on the front facing end demoConstruct has 2 web-based applications for users to create 3D models and virtual environments for digital twins. Additionally there is a "back-end" server which is used to off-load resource intensive tasks from the 2 front facing web-based applications, and perform other data sychronization tasks to enable efficient collaboration.

**Capture and Reconstruction Client**

<img src="https://github.com/singaporetech/democonstruct-research-packet/assets/51155060/4e6e8047-419d-4574-bd8f-2c30085ac556" width="45%">

The capture client allows users to capture imagery which are continuously sent to the edge node to perform progressive reconstruction.

**Collaborative editing Client**

<img src="https://github.com/singaporetech/democonstruct-research-packet/assets/51155060/f0735155-5c29-40f0-8130-0b0a35bdb7fa" width="75%">

The editing client enables users to use progressively reconstructed 3D models to build digital twin environments that are kept current from incremental updates sent by the edge node..

**Edge Node and Server**

The edge node acts as the reconstruction provider and central repository to store data and sync model and editing changes.

## Simplified systems and data flow diagram

**System**

<img src="https://github.com/singaporetech/immersification-demoConstruct/assets/51155060/7bf9e7c0-8d56-48be-b06d-23d4fefd0634" width="35%">

**Data Flow for Progresive Reconstruction and near real-time collaboration**

<img src="https://github.com/singaporetech/immersification-demoConstruct/assets/51155060/238c065c-4343-4de7-936c-786c96ace5a2" width="25%">

# Project Contributors

Tan Chek Tien, Jeannie Lee, Leon Foo Cewei, Sukumaran Nair Nirmal, Liuziyi, Shen Songjia, Ambrose Wee

## Acknowledgements

This work is funded by by the National Research Foundation, Singapore and Infocomm Media Development Authority under its Future Communications Research & Development Programme.

This is a joint project inconjnuction with the SIT's Future Communication Translation Lab (FCTLabs). 
