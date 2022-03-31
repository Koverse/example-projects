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
#from oauthenticator.generic import GenericOAuthenticator

c = get_config()  # noqa: F821
c.ServerApp.ip = "0.0.0.0"
c.ServerApp.port = 8888
c.ServerApp.open_browser = False


#####################


class MyServiceMixin(OAuth2Mixin):
    # authorize is the URL users are redirected to authorize your service
    _OAUTH_AUTHORIZE_URL = "https://api.dev.koverse.com"
    #/oauth2/auth"
    # token is the URL JupyterHub accesses to finish the OAuth process
    _OAUTH_ACCESS_TOKEN_URL = "https://api.dev.koverse.com/oauth2/token"


class MyServiceLoginHandler(OAuthLoginHandler, MyServiceMixin):
    pass


class MyServiceOAuthenticator(OAuthenticator):
    # login_service is the text displayed on the "Login with..." button
    login_service = "Koverse Data Platform"
    #callback_handler = MyServiceOAuthenticator
    login_handler = MyServiceLoginHandler

    ###########it's not the authenticate function to override ##########
    def authenticate(self, handler, data=None):
        if handler == "Koverse Data Platform":
            print(data['access_token'])

        code = handler.get_argument("code")
        # TODO: Configure the curl_httpclient for tornado
        http_client = AsyncHTTPClient()
        # Exchange the OAuth code for an Access Token
        # this is the TOKEN URL in your provider
        params = dict(
            client_id=self.client_id, client_secret=self.client_secret, code=code
        )
        #correct token url????
        url = url_concat("https://api.dev.koverse.com/oauth2/token", params)

        req = HTTPRequest(
            url, method="POST", headers={"Accept": "application/json"}, body=''
        )

        resp = await http_client.fetch(req)
        resp_json = json.loads(resp.body.decode('utf8', 'replace'))

        if 'access_token' in resp_json:
            access_token = resp_json['access_token']
        elif 'error_description' in resp_json:
            raise HTTPError(
                403,
                "An access token was not returned: {}".format(
                    resp_json['error_description']
                ),
            )
        else:
            raise HTTPError(500, "Bad response: {}".format(resp))



        bearer_token = 'Bearer ' + data['access_token']
        headers = {'Authorization': bearer_token}
        user_request = requests.get('https://api.dev.koverse.com/me', headers=headers)
        user = json.loads(user_request.headers['Koverse-User'])
        #Variable.set("kdp_access_token", user_request.headers['Koverse-Jwt'])
        resp = await http_client.fetch(user_request)
        resp_json = json.loads(resp.body.decode('utf8', 'replace'))

        # check the documentation for what field contains a unique username
        # it might not be the 'username'!
        username = resp_json["displayName"]

        if not username:
            # return None means that no user is authenticated
            # and login has failed
            return None

            # 'name' is the JupyterHub username
            user_info = {"name": username}

        return {"name": user['displayName'], "email": user['email']
                    , "auth_state" : {}}



class LocalMyServiceOAuthenticator(LocalAuthenticator, MyServiceOAuthenticator):
    """A version that mixes in local system user creation"""
    pass

c.JupyterHub.authenticator_class = MyServiceOAuthenticator



# https://github.com/jupyter/notebook/issues/3130
c.FileContentsManager.delete_to_trash = False

# Generate a self-signed certificate
OPENSSL_CONFIG = """\
[req]
distinguished_name = req_distinguished_name
[req_distinguished_name]
"""
if "GEN_CERT" in os.environ:
    dir_name = jupyter_data_dir()
    pem_file = os.path.join(dir_name, "notebook.pem")
    os.makedirs(dir_name, exist_ok=True)

    # Generate an openssl.cnf file to set the distinguished name
    cnf_file = os.path.join(os.getenv("CONDA_DIR", "/usr/lib"), "ssl", "openssl.cnf")
    if not os.path.isfile(cnf_file):
        with open(cnf_file, "w") as fh:
            fh.write(OPENSSL_CONFIG)

    # Generate a certificate if one doesn't exist on disk
    subprocess.check_call(
        [
            "openssl",
            "req",
            "-new",
            "-newkey=rsa:2048",
            "-days=365",
            "-nodes",
            "-x509",
            "-subj=/C=XX/ST=XX/L=XX/O=generated/CN=generated",
            f"-keyout={pem_file}",
            f"-out={pem_file}",
        ]
    )
    # Restrict access to the file
    os.chmod(pem_file, stat.S_IRUSR | stat.S_IWUSR)
    c.ServerApp.certfile = pem_file

# Change default umask for all subprocesses of the notebook server if set in
# the environment
if "NB_UMASK" in os.environ:
    os.umask(int(os.environ["NB_UMASK"], 8))

# OAUTH_PROVIDERS = [{
# 	'name':'Koverse Data Platform',
#     'token_key':'access_token',
#     'icon':'fa-lock',
#         'remote_app': {
#             'api_base_url':'https://api.dev.koverse.com/oauth2/',
#             'request_token_params':{
#                 'scope': 'email profile'
#             },
#             'access_token_url':'https://api.dev.koverse.com/oauth2/token',
#             'authorize_url':'https://api.dev.koverse.com/oauth2/auth',
#             'request_token_url': None,
#             'client_id': os.environ.get('KDP4_CLIENT_ID'),
#             'client_secret': os.environ.get('KDP4_CLIENT_SECRET'),
#         }
# }]

