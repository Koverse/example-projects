"""
Custom Authenticator to use generic OAuth2 with JupyterHub
"""
import base64
import os
import json
from urllib.parse import urlencode
import warnings
import requests
import inspect, concurrent,asyncio
from notebook.base.handlers import IPythonHandler

from jupyterhub.auth import LocalAuthenticator
from tornado.httpclient import AsyncHTTPClient, HTTPRequest
from tornado.httputil import url_concat
from traitlets import Bool, Dict, List, Unicode, Union, default

from oauthenticator.oauth2 import OAuthenticator
from oauthenticator.traitlets import Callable

class GenericOAuthenticator(OAuthenticator):
    login_service = Unicode("OAuth 2.0", config=True)

    extra_params = Dict(help="Extra parameters for first POST request").tag(config=True)

    claim_groups_key = Union(
        [Unicode(os.environ.get('OAUTH2_GROUPS_KEY', 'groups')), Callable()],
        config=True,
        help="""
        Userdata groups claim key from returned json for USERDATA_URL.
        Can be a string key name or a callable that accepts the returned
        json (as a dict) and returns the groups list. The callable is useful
        e.g. for extracting the groups from a nested object in the response.
        """,
    )

    allowed_groups = List(
        Unicode(),
        config=True,
        help="Automatically allow members of selected groups",
    )

    admin_groups = List(
        Unicode(),
        config=True,
        help="Groups whose members should have Jupyterhub admin privileges",
    )

    username_key = Union(
        [Unicode(os.environ.get('OAUTH2_USERNAME_KEY', 'username')), Callable()],
        config=True,
        help="""
        Userdata username key from returned json for USERDATA_URL.
        Can be a string key name or a callable that accepts the returned
        json (as a dict) and returns the username.  The callable is useful
        e.g. for extracting the username from a nested object in the
        response.
        """,
    )


    userdata_params = Dict(
        help="Userdata params to get user data login information"
    ).tag(config=True)

    userdata_token_method = Unicode(
        os.environ.get('OAUTH2_USERDATA_REQUEST_TYPE', 'header'),
        config=True,
        help="Method for sending access token in userdata request. Supported methods: header, url. Default: header",
    )

    tls_verify = Bool(
        os.environ.get('OAUTH2_TLS_VERIFY', 'True').lower() in {'true', '1'},
        config=True,
        help="Disable TLS verification on http request",
    )

    basic_auth = Bool(
        os.environ.get('OAUTH2_BASIC_AUTH', 'True').lower() in {'true', '1'},
        config=True,
        help="Disable basic authentication for access token request",
    )

    @default("http_client")
    def _default_http_client(self):
        return AsyncHTTPClient(
            force_instance=True, defaults=dict(validate_cert=self.tls_verify)
        )

    def _get_headers(self):
        headers = {"Accept": "application/json", "User-Agent": "JupyterHub"}

        if self.basic_auth:
            b64key = base64.b64encode(
                bytes("{}:{}".format(self.client_id, self.client_secret), "utf8")
            )
            headers.update({"Authorization": "Basic {}".format(b64key.decode("utf8"))})
        return headers

    def _get_token(self, headers, params):
        if self.token_url:
            url = self.token_url
        else:
            raise ValueError("Please set the $OAUTH2_TOKEN_URL environment variable")

        req = HTTPRequest(
            url,
            method="POST",
            headers=headers,
            body=urlencode(params),
        )
        return self.fetch(req, "fetching access token")

    def _get_user_data(self, token_response):
        access_token = token_response['access_token']
        token_type = token_response['token_type']
        print(access_token)
        print(token_type)
        self.log.info(access_token)

        # Determine who the logged in user is
        headers = {
            "Accept": "application/json",
            "User-Agent": "JupyterHub",
            "Authorization": "Bearer {}".format(access_token),
        }
        if self.userdata_url:
            url = url_concat(self.userdata_url, self.userdata_params)
        else:
            raise ValueError("Please set the OAUTH2_USERDATA_URL environment variable")

        if self.userdata_token_method == "url":
            url = url_concat(self.userdata_url, dict(access_token=access_token))

        params = dict(
            strategy="jwt",
            accessToken=access_token
        )

        req = HTTPRequest(
            url,
            method="POST",
            headers=headers,
            body=urlencode(params),
        )
        #res = self.fetch(req, "fetching user data")

        return self.fetch(req)
        # try:
        #     res = self.fetch(req)
        # except Exception as e:
        #     print("Error: %s" % e)
        # else:
        #     self.log.info(res.headers)

    @staticmethod
    def _create_auth_state(token_response, user_data_response):
        access_token = token_response['access_token']
        refresh_token = token_response.get('refresh_token', None)
        scope = token_response.get('scope', '')
        if isinstance(scope, str):
            scope = scope.split(' ')

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'oauth_user': user_data_response,
            'scope': scope,
        }


    @staticmethod
    def check_user_in_groups(member_groups, allowed_groups):
        return bool(set(member_groups) & set(allowed_groups))

    async def pre_spawn_start(self, user, spawner):
        """Pass upstream_token to spawner via environment variable"""
        auth_state = await user.get_auth_state()
        self.log.info(user)
        if not auth_state:
            # auth_state not enabled
            return
        #access_token added to spawner environment
        spawner.environment['ACCESS_TOKEN'] = auth_state['access_token']




    async def authenticate(self, handler, data=None):
        code = handler.get_argument("code")

        params = dict(
            redirect_uri=self.get_callback_url(handler),
            code=code,
            grant_type='authorization_code',
        )
        params.update(self.extra_params)

        headers = self._get_headers()

        token_resp_json = await self._get_token(headers, params)

        user_data_resp_json = await self._get_user_data(token_resp_json)

        print(user_data_resp_json)
        self.log.error("test", user_data_resp_json)
        #user = json.loads(user_data_resp_json.headers['Koverse-User'])
        #user_jwt = user_data_resp_json.headers['Koverse-Jwt']

        user_info = {
            'name': user_data_resp_json['user']['email'],
            'auth_state': {
                "access_token": user_data_resp_json['accessToken']
            },
        }

        #os.environ['ACCESS_TOKEN'] = user_data_resp_json['accessToken']



        if self.allowed_groups:
            self.log.info(
                'Validating if user claim groups match any of {}'.format(
                    self.allowed_groups
                )
            )

            if callable(self.claim_groups_key):
                groups = self.claim_groups_key(user_data_resp_json)
            else:
                groups = user_data_resp_json.get(self.claim_groups_key)

            if not groups:
                self.log.error(
                    "No claim groups found for user! Something wrong with the `claim_groups_key` {}? {}".format(
                        self.claim_groups_key, user_data_resp_json
                    )
                )
                groups = []

            if self.check_user_in_groups(groups, self.allowed_groups):
                user_info['admin'] = self.check_user_in_groups(
                    groups, self.admin_groups
                )
            else:
                user_info = None



        return user_info




class LocalGenericOAuthenticator(LocalAuthenticator, GenericOAuthenticator):
    """A version that mixes in local system user creation"""

    pass


######## JUPYTERHUB CONFIG ##########
c = get_config()

#obviously not making it into os.environ - some extras do here - comment out!!!
#for var in os.environ:
#    print(var)
    #c.Spawner.env_keep.append(var)


# Path to SSL certificate and key

# Logging
c.JupyterHub.log_level = 'DEBUG'


# Shared notebooks
##c.Spawner.notebook_dir = '/srv/ipython/examples'
c.Spawner.args = ['--NotebookApp.default_url=/notebooks']



# OAuth and user configuration
c.JupyterHub.authenticator_class = GenericOAuthenticator

c.KDPOAuthenticator.create_system_users = True
c.Authenticator.add_user_cmd = ['adduser', '--force-badname', '-q', '--gecos', '""', '--ingroup', 'jupyter', '--disabled-password']

#c.Authenticator.whitelist = whitelist = set()
#c.Authenticator.admin_users = admin = set()

from subprocess import check_call

def pre_spawn_hook(spawner):
    username = spawner.user.name
    try:
        check_call(['useradd', '-ms', '/bin/bash', username])

    except Exception as e:
        print(f'{e}')


#persistence
# notebook_dir = os.environ.get('DOCKER_NOTEBOOK_DIR')
# c.DockerSpawner.notebook_dir = notebook_dir
# # Mount the real user's Docker volume on the host to the notebook user's
# # notebook directory in the container
# c.DockerSpawner.volumes = {'jupyterhub-user-{username}': notebook_dir}



c.Spawner.pre_spawn_hook = pre_spawn_hook


#c.KDPOAuthenticator.enable_auth_state = True
c.Authenticator.enable_auth_state = True

#set up encryption to make export of environment vars possible (access_token -> jupyter notebook)
if 'JUPYTERHUB_CRYPT_KEY' not in os.environ:
    warnings.warn(
        "Need JUPYTERHUB_CRYPT_KEY env for persistent auth_state.\n"
        "    export JUPYTERHUB_CRYPT_KEY=$(openssl rand -hex 32)"
    )
    c.CryptKeeper.keys = [os.urandom(32)]



###### This is for generic oauth, not working w/ out
c.KDPOAuthenticator.oauth_callback_url = 'http://localhost:8000/hub/oauth_callback'
c.GenericOAuthenticator.client_id = '8b4192aa46328e2fc4946dc10cda34d77ce05e608d9a2a6e31c46cdc1cdcbf4f'
c.GenericOAuthenticator.client_secret = '1d1ccf39f89e98bef8ec45c37192c15a70be74ee8016a21c17d214ff8c6b8854'
c.GenericOAuthenticator.login_service = 'KDP'
c.GenericOAuthenticator.authorize_url = "https://api.dev.koverse.com/oauth2/auth"
c.GenericOAuthenticator.token_url = 'https://api.dev.koverse.com/oauth2/token'
c.GenericOAuthenticator.userdata_url = 'https://api.dev.koverse.com/authentication'
