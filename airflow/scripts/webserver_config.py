# -*- coding: utf-8 -*-
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

import os
import json

from airflow import configuration as conf
from airflow.www.security import AirflowSecurityManager
from flask_appbuilder.security.manager import AUTH_DB
# from flask_appbuilder.security.manager import AUTH_LDAP
from flask_appbuilder.security.manager import AUTH_OAUTH
# from flask_appbuilder.security.manager import AUTH_OID
# from flask_appbuilder.security.manager import AUTH_REMOTE_US
basedir = os.path.abspath(os.path.dirname(__file__))

class KDPSecurity(AirflowSecurityManager):
    def oauth_user_info(self, provider, response=None):
        if provider == "Koverse Data Platform":
            print(self.appbuilder.sm.oauth_remotes[provider])
            print(self.appbuilder)
            #me = self.appbuilder.sm.oauth_remotes[provider].get("userInfo")
            #data = json.loads(me.raw_data)
            print("User info from aws_cognito: {0}".format(self.appbuilder.sm.oauth_remotes[provider].get("userinfo")))
            return {"username": "garrett criss", "email": "garrettcriss@koverse.com"}
        else:
            return {}

# The SQLAlchemy connection string.
SQLALCHEMY_DATABASE_URI = conf.get('core', 'SQL_ALCHEMY_CONN')

# Flask-WTF flag for CSRF
CSRF_ENABLED = True

# ----------------------------------------------------
# AUTHENTICATION CONFIG
# ----------------------------------------------------
# For details on how to set up each of the following authentication, see
# http://flask-appbuilder.readthedocs.io/en/latest/security.html# authentication-methods
# for details.

# The authentication type
# AUTH_OID : Is for OpenID
# AUTH_DB : Is for database
# AUTH_LDAP : Is for LDAP
# AUTH_REMOTE_USER : Is for using REMOTE_USER from web server
# AUTH_OAUTH : Is for OAuth
AUTH_TYPE = AUTH_OAUTH

# Uncomment to setup Full admin role name
# AUTH_ROLE_ADMIN = 'Admin'

# Uncomment to setup Public role name, no authentication needed
# AUTH_ROLE_PUBLIC = 'Public'

# Will allow user self registration
AUTH_USER_REGISTRATION = True

# The default user self registration role
AUTH_USER_REGISTRATION_ROLE = "Admin"

# When using OAuth Auth, uncomment to setup provider(s) info
# Google OAuth example:
OAUTH_PROVIDERS = [{
	'name':'Koverse Data Platform',
    'token_key':'access_token',
    'icon':'fa-lock',
        'remote_app': {
            'base_url':'https://api.koverse.dev/oauth2/',
            'request_token_params':{
                'scope': 'email profile'
            },
            'access_token_url':'https://api.koverse.dev/oauth2/token',
            'authorize_url':'https://api.koverse.dev/oauth2/auth',
            'request_token_url': None,
            'client_id': '4cf1f40acd2cc63b076df80ad5c234cfd0fbc79418703f1a9f67ad6fa2b4f832',
            'client_secret': 'a07a394c67435990aeddb1218360cc23166a767d06e349e53359b869a053c311',
        }
}]

# When using LDAP Auth, setup the ldap server
# AUTH_LDAP_SERVER = "ldap://ldapserver.new"

# When using OpenID Auth, uncomment to setup OpenID providers.
# example for OpenID authentication
OPENID_PROVIDERS = [
    {
        'name': os.getenv('AIRFLOW_OPENID_NAME'),
        'url': os.getenv('AIRFLOW_OPENID_DISCOVERY_URL')
    }
]
#    { 'name': 'Yahoo', 'url': 'https://me.yahoo.com' },
#    { 'name': 'AOL', 'url': 'http://openid.aol.com/<username>' },
#    { 'name': 'Flickr', 'url': 'http://www.flickr.com/<username>' },
#    { 'name': 'MyOpenID', 'url': 'https://www.myopenid.com' }]

# ----------------------------------------------------
# Theme CONFIG
# ----------------------------------------------------
# Flask App Builder comes up with a number of predefined themes
# that you can use for Apache Airflow.
# http://flask-appbuilder.readthedocs.io/en/latest/customizing.html#changing-themes
# Please make sure to remove "navbar_color" configuration from airflow.cfg
# in order to fully utilize the theme. (or use that property in conjunction with theme)
# APP_THEME = "bootstrap-theme.css"  # default bootstrap

# from fab_oidc.security import AirflowOIDCSecurityManager
SECURITY_MANAGER_CLASS = KDPSecurity