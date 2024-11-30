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
chmod -R 755 ./certbot

# Start nginx
docker-compose up -d nginx
echo "### Waiting for nginx to start..."
sleep 10

# Test nginx configuration
docker-compose exec nginx nginx -t

# Test the challenge path
echo "Testing challenge path..."
curl -I http://phatd.xyz/.well-known/acme-challenge/test

# Get staging certificate first
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --staging \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

# If staging successful, get real certificate
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