# Jupyterhub with Docker Compose

This repository contains a docker-compose definition for launching Jupyterhub, generating a custom docker image that allows users to install Python packages, install spark and dependencies, edit user/group permissions, etc. With JupyterHub you can create a multi-user Hub that spawns, manages, and proxies multiple instances of the single-user Jupyter notebook server. Upon starting the container, an Oauth flow to connect to KDP4 is initiated and the logged in user's access token is stored as an environment variable. Within Jupyter Notebooks, this token can be retrieved via python's os module using this method: ```os.getenv('ACCESS_TOKEN')```.

## Installation

1. Create a new application with KDP4.
For local use set the Url to `http://localhost:8000` and the redirect URL `http://localhost:8000/hub/oauth_callback`

2. Client ID and Secret

Next add your client ID and secret into the jupyterhub_config.py file within the project. Replace vales for ```c.GenericOAuthenticator.client_id``` and ```c.GenericOAuthenticator.client_secret``` - should be at bottom of config file.

Place additional examples within `/examples`.

3. Create a new personal access token on GitHub and store it in a secure place.

## Control the container / Usage:

### For Mac OS users

1. Open System Preferences -> Security & Privacy -> Privacy -> Full Disk Access and add two applications. 1. Automator.app 2. Script Editor.app. Give access to other applications as needed if there is a prompt for them in a future step.

2. Run Build.app and right-click to paste in your GitHub access token when prompted. It will automatically build the image, run docker-compose, and open the Jupyter window. (Only need to run once to build the image)

3. For future usage, you can run ComposeUp.app to run the docker-compose up and launch the Jupyter window automatically.

4. When you're done with the container, run Terminate.app to run docker-compose down and close all localhost:8000 windows.

### For Other OS

1. Create a GithubToken.txt file into this directory and copy paste your personal access token into it.
2. Navigate to this directory on a command prompt / shell before moving on to the build image stage.
3. Use ```DOCKER_BUILDKIT=1 docker build --secret id=accesstoken,src=$(pwd)/GithubToken.txt -t koverse/jupyterhub .``` to build the image.
This sets up users, contains installs to make KDP4 authentication and integration possible, and adds a directory containing example notebooks. It integrates a GitHub access token login to automatically install the KDP packages and ensures access token is not stored inside the container.

* ```docker-compose up``` starts the container
* ```docker-compose down``` destroys the container

- Go to localhost:8000/hub on a web browser after running docker-compose up and authenticate with Koverse to get to jupyter.

## Running Example Notebooks

* Follow directions in README located in examples directory to install KDP4 python client and python connector before running example notebooks.

# KDP4 Jupyter notebook extension

The main purpose of this extension is to improve the usability of the two main KDP python packages in terms of the typical read and write flow from outside sources reading from KDP and writing to KDP.

Each time a new notebook is opened or a current one is restarted, the hidden cells at the beginning of the notebook will run automatically to retrieve the access token from the environmental variable and store it into the python jwt variable. Additionally, it will give you the workspace_id, email, firstName, lastName, fullName, and set up the kdp_conn variable automatically.

You also have access to the overwrite_to_kdp, write_to_new_kdp, and write_to_existing_kdp functions from the /examples/KDP4 Reading and Writing Flow with Pandas.ipynb notebook.

The pre-loaded cells are protected meaning that they can't be deleted or edited, so in case you accidentally overwrite one of the variables. To run only the hidden cells, you need to go to the `Kernel` dropdown menu and click `Restart`.

## Future features to implement backlog

1. Automatic variable protection - if an essential variable is overwritten, immediately change the value back to the original value and warn the user that this occurred by creating a markdown cell below the cell the user just executed.

2. A sub problem that comes up if the above or any similar feature involving executing hidden cells beyond the initialization of a notebook is that the execution number may be off. Ex. a user expects to see In [1], In [2], In [3] but instead sees something like In [4] because a hidden cell ran in between which may cause user confusion. Need to find a way to reliable track the cell IDs of the hidden cells and not increase the execution number when one of those cells are run.

3. Tutorial/Examples within the extension and loaded with each notebook w/ hide/show toggle buttons (which are written as separate extensions, so you are able to turn them off and on as needed to save memory within each notebook)

4. Change the Jupyter favicon icon at the top left to a combined Koverse/Jupyter image or just Koverse.

5. Change the Jupyter favicon icon inside of Google Chrome's tab to a different icon. Additionally, change the background color scheme based on if the kernel is busy or not, and if it ran successfully or ran into an error.

6. Add a font size drop down menu for users to increase CSS font size of the notebook.

7. Add an option to be notified when jobs are completed with a notification to an email or phone number (with user input inside the notebook), particularly useful with long-running jobs and especially when unexpected errors occur.

8. Active timer to track how much time left before access token expiration on the main menu bar.

9. Add a button on the main menu bar to re-authenticate at any time.
