# Start from a core stack version
FROM jupyter/datascience-notebook:latest
# Install from requirements.txt file
COPY --chown=${NB_UID}:${NB_GID} requirements.txt /tmp/
RUN mamba install --yes --file /tmp/requirements.txt && \
    mamba clean --all -f -y && \
    fix-permissions "${CONDA_DIR}" && \
    fix-permissions "/home/${NB_USER}"


COPY ./jupyter_server_config.py /home/jovyan/.jupyter/jupyter_server_config.py
RUN fix-permissions /home/jovyan/.jupyter

COPY jupyter_server_config.py /etc/jupyter/
RUN fix-permissions /etc/jupyter/


# Fix permissions on /etc/jupyter as root

# Legacy for Jupyter Notebook Server, see: [#1205](https://github.com/jupyter/docker-stacks/issues/1205)
#RUN fix-permissions /etc/jupyter/
#sed -re "s/c.ServerApp/c.NotebookApp/g" && \
#/etc/jupyter/jupyter_server_config.py > /etc/jupyter/jupyter_notebook_config.py && \


# Switch back to jovyan to avoid accidental container runs as root
#USER ${NB_UID}
#WORKDIR "${HOME}"