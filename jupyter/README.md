# Jupyter with Docker Compose

This repository contains a docker-compose definition for launching Jupyter Notebook.

## Jupyter Token:
Be sure to set your ```JUPYTER_TOKEN``` in your yaml file, if you don't want to leave it as is

## Control the container:
* ```docker build -t jupyterdatascienceimage .   ```
* ```docker-compose up ``` mounts the directory and starts the container
* ```docker-compose down``` destroys the container


## Launch your Notebook:

* ```localhost:8888/lab``` will launch your notebook, where you will be prompted to enter your ```JUPYTER_TOKEN```


