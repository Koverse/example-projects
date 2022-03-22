# Airflow on Koverse Data Platform

This project shows how to use [Apache Airflow](https://airflow.apache.org) and the [Koverse Data Platform](https://koverse.com) (KDP) together, this self contained docker-compose generates a custom docker image that allows users to install Python packages into Airflow. The docker-compose can then be deployed locally, or on a server to allow Airflow to connect via Oauth to KDP. We've included a couple of sample dags to get started with simple operations that can be automated within the KDP API. 

## Installation

1. Create a new application with KDP4.
For local use set the Url to `http://localhost:8080` and the redirect URL `http://localhost:8080/oauth-authorized/Koverse%20Data%20Platform`

2. Client ID and Secret

Next add your client ID and secret into the docker-compose.yml file within the project. Update docker-compose.yml lines 52 and 53 with the Client ID and Secret from the Application Secrets section in KDP4.

Place DAG files within `/dags`.

## Setup

### First time setup

First build the custom image that contains the necessary Python packages on top of the standard Apache Airflow image. 

`docker build -t koverse/airflow .`

The airflow-init command only needs to be run once, this will generate the database migrations neccessary to use airflow
`docker-compose up airflow-init`

### Run airflow
`docker-compose up`

Once docker compose finishes starting up access Airflow at `localhost:8080`

## Options

We have included a set of sample DAGs within the /dags directory that can serve as a jump off point for creating your own functionality within Airflow on top of KDP4

*Add examples and descriptions of DAGs here*

## Security

When signing in via KDP Oauth an access token is returned and stored as a global airflow variable scoped to your account. This can accessed within your DAG code using:

```
from airflow.models import Variable
token = Variable.get('kdp4_access_token')
```

## Authentication

The authentication manager is built into /scripts/webserver_config.py. 

## Configuration

