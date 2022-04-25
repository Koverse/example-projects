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
