#!/bin/bash

domains=(phatd.xyz www.phatd.xyz)
rsa_key_size=4096
data_path="./certbot"
email="thaisieupham7@gmail.com"

# Tạo thư mục certbot
if [ ! -e "$data_path" ]; then
  mkdir -p "$data_path/conf/live/$domains"
  mkdir -p "$data_path/www"
fi

# Tạo dummy certificates
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$data_path/conf/live/$domains/privkey.pem' \
    -out '$data_path/conf/live/$domains/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# Khởi động nginx
docker-compose up --force-recreate -d nginx

# Đợi nginx khởi động
echo "### Waiting for nginx to start..."
sleep 5

# Xóa dummy certificates
docker-compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$domains && \
  rm -Rf /etc/letsencrypt/archive/$domains && \
  rm -Rf /etc/letsencrypt/renewal/$domains.conf" certbot

# Yêu cầu Let's Encrypt certificate
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Khởi động lại containers
docker-compose down
docker-compose up -d