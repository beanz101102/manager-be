#!/bin/bash

domains=(phatd.xyz www.phatd.xyz)
rsa_key_size=4096
data_path="./certbot"
email="thaisieupham7@gmail.com"

# Stop and remove all containers
docker-compose down
sleep 2

# Remove old certificates
rm -rf ./certbot
mkdir -p ./certbot/conf
mkdir -p ./certbot/www

# Start nginx
docker-compose up -d nginx
echo "### Waiting for nginx to start..."
sleep 5

# Get certificate
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --staging \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Once staging succeeds, get real certificate
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Generate strong DH parameters
docker-compose run --rm --entrypoint "\
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048" certbot

echo "### Restarting nginx..."
docker-compose restart nginx

# Start all services
docker-compose up -d