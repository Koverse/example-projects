# NGINX Ingress & Grafana with Certificate Auth

## Generating Certificates

### Development
 - Install [mkcert](https://github.com/FiloSottile/mkcert):
       `brew install mkcert`
       `brew install nss` (if you use Firefox)
    - Create a new local CA:
        - `mkcert -install`
      ```bash
      mkcert koverse.dev "*.koverse.dev"

      Generate CA and client certificate per:

      https://fardog.io/blog/2017/12/30/client-side-certificate-authentication-with-nginx/

      ```bash
      127.0.0.1 grafana.koverse.dev
      127.0.0.1 koverse.dev

### Production Certificates

## Configuration

### Docker Compose 

### Client Cert

### Server HTTPS Certs

### Plugins

Place plugins to deploy within the /plugins folder

### Grafana
By default all certificate authentcated users will have Admin access. This will need to be edited in the Grafana Admin tab to restrict access once a user has first signed in.

## Run

`docker-compose up -d`