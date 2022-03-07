# Airflow on KDP4

## Setup

`docker build -t koverse/airflow .`

`docker-compose up airflow-init`

`docker-compose up`

## Installation

1. Setup application with KDP4.
Redirect URL `http://localhost:8080/oauth-authorized/Koverse%20Data%20Platform`

2. Client ID and Secret

Environment Variables:
Koverse API Url
Client ID
Client Secret

Place DAG files within `/dags`.


## Options

## Security

### Authentication

