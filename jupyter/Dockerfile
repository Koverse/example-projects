# Start from a core stack version
FROM jupyter/datascience-notebook:latest
# Install from requirements.txt file
COPY --chown=${NB_UID}:${NB_GID} requirements.txt /tmp/
RUN mamba install --yes --file /tmp/requirements.txt && \
    mamba clean --all -f -y && \
    fix-permissions "${CONDA_DIR}" && \
    fix-permissions "/home/${NB_USER}"

ADD ./jupyter_server_config.py /home/jovyan/.jupyter/jupyter_server_config.py
COPY jupyter_server_config.py /etc/jupyter/