
FROM apache/airflow:latest
USER airflow
RUN /usr/local/bin/python -m pip install --upgrade pip && \
    pip3 install "apache-airflow[jdbc]" && \
    pip3 install "apache-airflow[ldap]" && \
    pip3 install "apache-airflow[password]" && \
    pip3 install "apache-airflow[postgres]" && \
    pip3 install "apache-airflow[kubernetes]" && \
    pip3 install oauth2client authlib requests && \
    pip3 install gtfs-realtime-bindings && \
    pip3 install protobuf3-to-dict