
FROM apache/airflow:latest
USER airflow
COPY requirements.txt /tmp/
RUN /usr/local/bin/python -m pip install --upgrade pip ipython ipykernel && \
    ipython kernel install --name "python3" --user && \
    pip3 install -r /tmp/requirements.txt