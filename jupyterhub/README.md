# Jupyterhub with Docker Compose

This repository contains a docker-compose definition for launching Jupyterhub, generating a custom docker image that allows users to install Python packages, edit user/group permissions, etc. With JupyterHub you can create a multi-user Hub that spawns, manages, and proxies multiple instances of the single-user Jupyter notebook server. Upon starting the container, an Oauth flow to connect to KDP4 is initiated and the user's access token is passed into Jupyter Notebooks.

## Installation

1. Create a new application with KDP4.
For local use set the Url to `http://localhost:8000` and the redirect URL `http://localhost:8000/hub/oauth_callback`

2. Client ID and Secret

Next add your client ID and secret into the jupyterhub_config.py file within the project. Replace vales for ```c.GenericOAuthenticator.client_id``` and ```c.GenericOAuthenticator.client_id``` - should be at bottom of config.

Place examples within `/examples`.

## Control the container:

* ```docker build -t koverse/jupyterhub .``` builds off the jupyterhub/jupyterhub image. Sets up users, contains installs to make kdp4 authentication and integration possible, and adds a directory containing example notebooks.
* ```docker-compose up``` starts the container
* ```docker-compose down``` destroys the container
