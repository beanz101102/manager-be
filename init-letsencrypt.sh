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

echo "### Starting nginx ..."
docker-compose up -d nginx
echo "### Waiting for nginx to start ..."
sleep 10

# Check if nginx is running and listening on port 80
echo "### Checking nginx status ..."
docker-compose ps nginx
docker-compose exec nginx netstat -tulpn | grep :80

# Test the challenge path
echo "### Testing challenge path ..."
curl -v http://localhost/.well-known/acme-challenge/test

# Request the certificate
echo "### Requesting Let's Encrypt certificate ..."
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --staging \
    -d ${domains[0]} -d ${domains[1]}" certbot

# If staging was successful, request the real certificate
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Generate DH parameters
echo "### Generating DH parameters ..."
openssl dhparam -out ./certbot/conf/ssl-dhparams.pem 2048

echo "### Restarting nginx ..."
docker-compose restart nginx

# Start all services
docker-compose up -d