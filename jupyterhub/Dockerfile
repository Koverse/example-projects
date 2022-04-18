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

RUN pip install jupyter \
jupyter_client


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
#change $USER to root below if necessary
RUN mkdir -p /srv/examples
RUN chown $USER:jupyter /srv/examples \
    && chmod 777 /srv/examples \
    #&& chmod g+s /srv/examples \
    && ln -s /srv/examples /etc/skel/examples
ADD /examples /srv/examples


