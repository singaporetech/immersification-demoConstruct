# Project Information

Digital twin technology is a primary area of interest for smart manufacturing. Digital twins also serve as the foundation for AR/VR/MR experiences that are key to Industry 4.0. Constructing high-fidelity 3D digital twins typically require expertise and resources that are not easily accessible to the common consumer. For most development tasks, it is not uncommon to require experienced 3D technical artists working with expensive 3D software.

demoConstruct aims to serve as a branching platform to allow users to adapt and accommodate the source code for the development digital twins in the context of their own use case. With demoConstruct, many untrained users aimming to create digital twin of existing physical locations collaboratively create digital replica of objects and environments any common consumer mobile device and computers, without needing to depend on specialized technical artists and costly resources.

To enable this, on the front facing end demoConstruct has 2 web-based applications for users to create 3D models and virtual environments for digital twins. Additionally there is a "back-end" server which is used to off-load resource intensive tasks from the 2 front facinb web-based applications, and perform other data sychronization tasks to enable efficient collaboration.

Capture and Reconstruction Client - A web-based application to enable users to capture reconstruction data (images) of physical objects and perform 3D reconstruction (supported by a server) using the captured reconstruction data.

Collaborative editing Client - A web-based collaborative application that allows users to, 1) collaborate with Capture and Reconstruction Client users to assist them by viewig 3D reconstructed models and annotate both these 3D reconstructions as well as and captured reconstruction data and, 2) collaborate with other collaborative editing client users to construct a virtual environment using 3D reconstructed models previously reconstructed with the Capture and Reconstruction client.

Server - Additionally, a server is employed to off-load computationally intensive tasks (e.g. 3D reconstruction) for both clients, and provide them as remote services. The server also manages model data and datambases to enable online collaboration and act as a master copy where all data and changes are written to.

This is a joint project inconjnuction with the SIT's Future Communication Translation Lab (FCTLabs).
 
# Project Contributors

Tan Chek Tien, Jeannie Lee, Leon Foo Cewei, Sukumaran Nair Nirmal, Liuziyi, Shen Songjia

# Related Projects

None
