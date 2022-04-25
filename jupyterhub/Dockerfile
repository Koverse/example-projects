# syntax=docker/dockerfile:1.3
FROM jupyterhub/jupyterhub

# Python libs
RUN apt-get update \
 && apt-get install -yq --no-install-recommends \
    build-essential \
    ca-certificates \
    locales \
    python3-dev \
    python3-pip \
    python3-pycurl \
    nodejs \
    npm \
    git \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

#jupyter
RUN pip install jupyter \
jupyter_client

#additional python packages for data visualization, etc. - Many of the basics ship with jupyterhub base image
RUN pip install seaborn

##### GITHUB OAUTH #####

#Install KDP Python connector and KDP API
RUN --mount=type=secret,id=accesstoken \
export ACCESSTOKEN=$(cat /run/secrets/accesstoken) && \
pip install git+https://"${ACCESSTOKEN}"@github.com/Koverse/kdp-api-python-client.git@main#subdirectory=package && \
pip install git+https://"${ACCESSTOKEN}"@github.com/Koverse/kdp-python-connector.git@main#egg=kdp-python-connector


########## SPARK ##########
## Spark dependencies
## Default values can be overridden at build time
## (ARGS are in lower case to distinguish them from ENV)
ARG spark_version="3.1.2"
ARG hadoop_version="3.2"
ARG spark_checksum="2385CB772F21B014CE2ABD6B8F5E815721580D6E8BC42A26D70BBCDDA8D303D886A6F12B36D40F6971B5547B70FAE62B5A96146F0421CB93D4E51491308EF5D5"
ARG openjdk_version="11"
#
ENV APACHE_SPARK_VERSION="${spark_version}" \
    HADOOP_VERSION="${hadoop_version}"
#
RUN apt-get update --yes && \
    apt-get install --yes --no-install-recommends \
    "openjdk-${openjdk_version}-jre-headless" \
    ca-certificates-java && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
#
# #install wget for below
RUN apt-get update && apt-get install -y wget
#
# # Spark installation
WORKDIR /tmp
RUN wget -q "https://archive.apache.org/dist/spark/spark-${APACHE_SPARK_VERSION}/spark-${APACHE_SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz" && \
    echo "${spark_checksum} *spark-${APACHE_SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz" | sha512sum -c - && \
    tar xzf "spark-${APACHE_SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz" -C /usr/local --owner root --group root --no-same-owner && \
    rm "spark-${APACHE_SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz"
#
WORKDIR /usr/local
#
# # Configure Spark
ENV SPARK_HOME=/usr/local/spark
ENV SPARK_OPTS="--driver-java-options=-Xms1024M --driver-java-options=-Xmx4096M --driver-java-options=-Dlog4j.logLevel=info" \
    PATH="${PATH}:${SPARK_HOME}/bin"

RUN ln -s "spark-${APACHE_SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}" spark && \
    # Add a link in the before_notebook hook in order to source automatically PYTHONPATH
    mkdir -p /usr/local/bin/before-notebook.d && \
    ln -s "${SPARK_HOME}/sbin/spark-config.sh" /usr/local/bin/before-notebook.d/spark-config.sh

# # Fix Spark installation for Java 11 and Apache Arrow library
# # see: https://github.com/apache/spark/pull/27356, https://spark.apache.org/docs/latest/#downloading
RUN cp -p "${SPARK_HOME}/conf/spark-defaults.conf.template" "${SPARK_HOME}/conf/spark-defaults.conf" && \
    echo 'spark.driver.extraJavaOptions -Dio.netty.tryReflectionSetAccessible=true' >> "${SPARK_HOME}/conf/spark-defaults.conf" && \
    echo 'spark.executor.extraJavaOptions -Dio.netty.tryReflectionSetAccessible=true' >> "${SPARK_HOME}/conf/spark-defaults.conf"

#import in IDE to make a spark context available in your code
RUN pip install findspark
########## END SPARK ##########


# Install oauthenticator
RUN python3 -m pip install oauthenticator

# Create oauthenticator directory
WORKDIR /srv/oauthenticator
ENV OAUTHENTICATOR_DIR /srv/oauthenticator

# Get config for jupyterhub and oauth
ADD jupyterhub_config.py /srv/oauthenticator/jupyterhub_config.py
ADD oauth-setup-and-run-jupyterhub /srv/oauthenticator/oauth-setup-and-run-jupyterhub






# Set up users and launch jupyterhub.
RUN groupadd jupyter
ENTRYPOINT ["/bin/bash", "/srv/oauthenticator/oauth-setup-and-run-jupyterhub"]


# add example read/write kdp files to user dir in /examples - no save
RUN mkdir -p /srv/examples
RUN chown $USER:jupyter /srv/examples \
    && chmod 777 /srv/examples \
    && chmod g+s /srv/examples \
    && ln -s /srv/examples /etc/skel/examples
ADD /examples /srv/examples
