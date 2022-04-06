# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
# mypy: ignore-errors
import os
import stat
import subprocess
import logging
import requests
import json

from jupyterhub.auth import LocalAuthenticator
from tornado.auth import OAuth2Mixin
from tornado.httpclient import AsyncHTTPClient
from tornado.httpclient import HTTPError
from tornado.httpclient import HTTPRequest
from tornado.httputil import url_concat

from oauthenticator.oauth2 import OAuthenticator
from oauthenticator.oauth2 import OAuthLoginHandler


from jupyter_core.paths import jupyter_data_dir
from oauthenticator.generic import GenericOAuthenticator

c = get_config()  # noqa: F821
c.ServerApp.ip = "0.0.0.0"
c.ServerApp.port = 8888
c.ServerApp.open_browser = False



#c.JupyterHub.redirect_to_server = False
#c.JupyterHub.default_url = 'https://api.dev.koverse.com/me'
#c.JupyterHub.hub_port = 8888


c.JupyterHub.authenticator_class = "generic"

c.GenericOAuthenticator.oauth_callback_url = 'https://{host}/hub/oauth_callback'
c.GenericOAuthenticator.client_id = 'fa3a5acf13722f7195a25ab09cac2e1ffd39fb9b7756f132f1827bd1bf4a6121'
c.GenericOAuthenticator.client_secret = 'f28f0e89f0244169a738853835ad4b5c32bbbd361aecc755cd6d59500b818388'
c.GenericOAuthenticator.login_service = 'KDP'
#c.GenericOAuthenticator.userdata_url = 'url-retrieving-user-data-with-access-token'
c.GenericOAuthenticator.token_url = 'https://api.dev.koverse.com/login/oauth/token'
#c.GenericOAuthenticator.username_key = 'username-key-for-USERDATA-URL'


#####################












#
# # https://github.com/jupyter/notebook/issues/3130
# c.FileContentsManager.delete_to_trash = False
#
# # Generate a self-signed certificate
# OPENSSL_CONFIG = """\
# [req]
# distinguished_name = req_distinguished_name
# [req_distinguished_name]
# """
# if "GEN_CERT" in os.environ:
#     dir_name = jupyter_data_dir()
#     pem_file = os.path.join(dir_name, "notebook.pem")
#     os.makedirs(dir_name, exist_ok=True)
#
#     # Generate an openssl.cnf file to set the distinguished name
#     cnf_file = os.path.join(os.getenv("CONDA_DIR", "/usr/lib"), "ssl", "openssl.cnf")
#     if not os.path.isfile(cnf_file):
#         with open(cnf_file, "w") as fh:
#             fh.write(OPENSSL_CONFIG)
#
#     # Generate a certificate if one doesn't exist on disk
#     subprocess.check_call(
#         [
#             "openssl",
#             "req",
#             "-new",
#             "-newkey=rsa:2048",
#             "-days=365",
#             "-nodes",
#             "-x509",
#             "-subj=/C=XX/ST=XX/L=XX/O=generated/CN=generated",
#             f"-keyout={pem_file}",
#             f"-out={pem_file}",
#         ]
#     )
#     # Restrict access to the file
#     os.chmod(pem_file, stat.S_IRUSR | stat.S_IWUSR)
#     c.ServerApp.certfile = pem_file
#
# # Change default umask for all subprocesses of the notebook server if set in
# # the environment
# if "NB_UMASK" in os.environ:
#     os.umask(int(os.environ["NB_UMASK"], 8))


