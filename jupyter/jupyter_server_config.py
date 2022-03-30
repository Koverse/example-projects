# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
# mypy: ignore-errors
import os
import stat
import subprocess
import logging
#import requests
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

c = get_config()  # noqa: F821
c.ServerApp.ip = "0.0.0.0"
c.ServerApp.port = 8888
c.ServerApp.open_browser = False

#########set auth here ##########
#c.ServerApp.token = password
c.JupyterHub.authenticator_class = "generic"

c.GenericOAuthenticator.oauth_callback_url = 'https://{host}/hub/oauth_callback'
c.GenericOAuthenticator.client_id = os.environ.get('KDP_CLIENT_ID')
c.GenericOAuthenticator.client_secret = os.environ.get('KDP_CLIENT_SECRET')
c.GenericOAuthenticator.login_service = 'Koverse Data Platform'

#c.GenericOAuthenticator.userdata_url = 'https://api.dev.koverse.com/oauth2/token'
c.GenericOAuthenticator.token_url = 'https://api.dev.koverse.com/oauth2/token'
#c.GenericOAuthenticator.username_key = 'username-key-for-USERDATA-URL'



class MyServiceMixin(OAuth2Mixin):
    # authorize is the URL users are redirected to authorize your service
    _OAUTH_AUTHORIZE_URL = "https://api.dev.koverse.com/oauth2/auth"
    # token is the URL JupyterHub accesses to finish the OAuth process
    _OAUTH_ACCESS_TOKEN_URL = "https://api.dev.koverse.com/oauth2/token"


class MyServiceLoginHandler(OAuthLoginHandler, MyServiceMixin):
    pass


class MyServiceOAuthenticator(OAuthenticator):

    # login_service is the text displayed on the "Login with..." button
    login_service = "Koverse Data Platform"

    login_handler = MyServiceLoginHandler

    async def authenticate(self, handler, data=None):
        """We set up auth_state based on additional My Service info if we
        receive it.
        """
        code = handler.get_argument("code")
        # TODO: Configure the curl_httpclient for tornado
        http_client = AsyncHTTPClient()

        # Exchange the OAuth code for an Access Token
        # this is the TOKEN URL in your provider

        params = dict(
            client_id=self.client_id, client_secret=self.client_secret, code=code
        )

        url = url_concat("https://api.dev.koverse.com/oauth2/token", params)

        req = HTTPRequest(
            url, method="POST", headers={"Accept": "application/json"}, body=''
        )

        resp = await http_client.fetch(req)
        resp_json = json.loads(resp.body.decode('utf8', 'replace'))

        if 'access_token' in resp_json:
            access_token = resp_json['access_token']
            print("access_token: ", access_token)
        elif 'error_description' in resp_json:
            raise HTTPError(
                403,
                "An access token was not returned: {}".format(
                    resp_json['error_description']
                ),
            )
        else:
            raise HTTPError(500, "Bad response: {}".format(resp))

        # Determine who the logged in user is
        # by using the new access token to make a request
        # check with your OAuth provider for this URL.
        # it could also be in the response to the token request,
        # making this request unnecessary.

        # remember, this is an intermediate step... So, attempting to pull that in here...
        req = HTTPRequest(
            "https://api.dev.koverse.com/me",
            method="GET",
            headers={"Authorization": f"Bearer {access_token}"},
        )


        user = json.loads(req.headers['Koverse-User'])
        kdp_access_token = req.headers['Koverse-Jwt']

        print("kdp_access_token: ", kdp_access_token)

        resp = await http_client.fetch(req)
        resp_json = json.loads(resp.body.decode('utf8', 'replace'))

        # check the documentation for what field contains a unique username
        # it might not be the 'username'! - either this is "'Koverse-User'"
        username = resp_json['Koverse-User']

        if not username:
            print("username ", user['displayName'], "email ", user['email'], "kdp_access_token ", kdp_access_token)
            # return None means that no user is authenticated
            # and login has failed
            return None

        ####AND THIS is where I stop today because if it's not username above... need to change

        # here we can add additional checks such as against team allowed lists
        # if the OAuth provider has such a concept

        # 'name' is the JupyterHub username
        user_info = {"name": username}

        # We can also persist auth state,
        # which is information encrypted in the Jupyter database
        # and can be passed to the Spawner for e.g. authenticated data access
        # these fields are up to you, and not interpreted by JupyterHub
        # see Authenticator.pre_spawn_start for how to use this information
        user_info["auth_state"] = auth_state = {}
        auth_state['access_token'] = access_token
        auth_state['auth_reply'] = resp_json

        return user_info


class LocalMyServiceOAuthenticator(LocalAuthenticator, MyServiceOAuthenticator):
    """A version that mixes in local system user creation"""

    pass















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

