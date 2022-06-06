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

from datetime import datetime
from dateutil.relativedelta import relativedelta

from dotenv import load_dotenv
from traitlets import traitlets

import shutil

class GenericOAuthenticator(OAuthenticator):

    def __init__(self, value='', *args, **kwargs):
        super(GenericOAuthenticator, self).__init__(*args, **kwargs)
        load_dotenv()

    @staticmethod
    def get_env_variables():
        return {'G_OAUTH_CALLBACK_URL':os.getenv('G_OAUTH_CALLBACK_URL'),
                'G_CLIENT_ID':os.getenv('G_CLIENT_ID'),
                'G_CLIENT_SECRET':os.getenv('G_CLIENT_SECRET'),
                'G_LOGIN_SERVICE':os.getenv('G_LOGIN_SERVICE'),
                'G_AUTHORIZE_URL':os.getenv('G_AUTHORIZE_URL'),
                'G_TOKEN_URL':os.getenv('G_TOKEN_URL'),
                'G_USERDATA_URL':os.getenv('G_USERDATA_URL'),
                'PHONE_NUMBER_ALERTS':os.getenv('PHONE_NUMBER_ALERTS'),
                'EMAIL_ALERTS':os.getenv('EMAIL_ALERTS'),
                'TEXTNOW_EMAIL':os.getenv('TEXTNOW_EMAIL'),
                'TEXTNOW_USERNAME':os.getenv('TEXTNOW_USERNAME'),
                'TEXTNOW_PASSWORD':os.getenv('TEXTNOW_PASSWORD'),
                'SENDGRID_API_KEY': os.getenv('SENDGRID_API_KEY')}

    login_service = Unicode("OAuth 2.0", config=True)

    extra_params = Dict(
             help="Extra parameters for first POST request"
         ).tag(config=True)

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
        access_token_expire = token_response['expires_in']
        token_type = token_response['token_type']

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
            accessToken=access_token,
            accessTokenExpire=access_token_expire
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
    def _get_token_expire(token_response):
        access_token_expire = token_response['expires_in']
        return access_token_expire

    @staticmethod
    def _create_auth_state(token_response, user_data_response):
        access_token = token_response['access_token']
        access_token_expire = token_response['expires_in']
        refresh_token = token_response.get('refresh_token', None)
        scope = token_response.get('scope', '')
        self.log.info('test')
        if isinstance(scope, str):
            scope = scope.split(' ')

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'oauth_user': user_data_response,
            'scope': scope,
            "access_token_expire": access_token_expire
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
        spawner.environment['ACCESS_TOKEN_EXPIRE'] = auth_state['access_token_expire']
        spawner.environment['DISPLAY_NAME'] = auth_state['displayName']
        spawner.environment['FIRST_NAME'] = auth_state['firstName']
        spawner.environment['LAST_NAME'] = auth_state['lastName']
        spawner.environment['WORKSPACE_ID'] = auth_state['workspaceId']

    async def authenticate(self, handler, data=None):
        code = handler.get_argument("code")

        params = dict(
            redirect_uri=self.get_callback_url(handler),
            code=code,
            grant_type='authorization_code',
        )
        params.update(self.extra_params)

        headers = self._get_headers()

        current_time = datetime.now()
        token_resp_json = await self._get_token(headers, params)

        token_expire_time = (current_time + relativedelta(hours = round(token_resp_json['expires_in']/3600)))\
        .strftime('%Y-%m-%d %I:%M:%S %p')

        user_data_resp_json = await self._get_user_data(token_resp_json)
        self.log.info(user_data_resp_json)
        self.log.info(token_resp_json)

        #user = json.loads(user_data_resp_json.headers['Koverse-User'])
        #user_jwt = user_data_resp_json.headers['Koverse-Jwt']

        user_info = {
            'name': user_data_resp_json['user']['email'],
            'auth_state': {
                'access_token': user_data_resp_json['accessToken'],
                'access_token_expire': token_expire_time,
                'displayName': user_data_resp_json['user']['displayName'],
                'firstName': user_data_resp_json['user']['firstName'],
                'lastName': user_data_resp_json['user']['lastName'],
                'workspaceId': user_data_resp_json['user']['workspaceId']
            },
        }

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

#c.NotebookApp.allow_origin='*'
#c.NotebookApp.allow_remote_access = True
#c.NotebookApp.allow_root = True

env_variables = c.JupyterHub.authenticator_class.get_env_variables()

c.KDPOAuthenticator.oauth_callback_url = env_variables['G_OAUTH_CALLBACK_URL']
c.GenericOAuthenticator.client_id = env_variables['G_CLIENT_ID']
c.GenericOAuthenticator.client_secret = env_variables['G_CLIENT_SECRET']
c.GenericOAuthenticator.login_service = env_variables['G_LOGIN_SERVICE']
c.GenericOAuthenticator.authorize_url = env_variables['G_AUTHORIZE_URL']
c.GenericOAuthenticator.token_url = env_variables['G_TOKEN_URL']
c.GenericOAuthenticator.userdata_url = env_variables['G_USERDATA_URL']
c.GenericOAuthenticator.phone_number_alerts = env_variables['PHONE_NUMBER_ALERTS']
c.GenericOAuthenticator.email_alerts = env_variables['EMAIL_ALERTS']
c.GenericOAuthenticator.textnow_email= env_variables['TEXTNOW_EMAIL']
c.GenericOAuthenticator.textnow_username = env_variables['TEXTNOW_USERNAME']
c.GenericOAuthenticator.textnow_password = env_variables['TEXTNOW_PASSWORD']

c.Spawner.environment =  {'PHONE_NUMBER_ALERTS': env_variables['PHONE_NUMBER_ALERTS'],
                          'EMAIL_ALERTS': env_variables['EMAIL_ALERTS'],
                          'TEXTNOW_EMAIL': env_variables['TEXTNOW_EMAIL'],
                          'TEXTNOW_USERNAME': env_variables['TEXTNOW_USERNAME'],
                          'TEXTNOW_PASSWORD': env_variables['TEXTNOW_PASSWORD'],
                          'SENDGRID_API_KEY': env_variables['SENDGRID_API_KEY']}
