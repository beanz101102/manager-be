#!/bin/bash

domains=(phatd.xyz www.phatd.xyz)
rsa_key_size=4096
data_path="./certbot"
email="thaisieupham7@gmail.com"

# Dừng các container đang chạy
docker-compose down

# Xóa các chứng chỉ cũ nếu có
rm -rf ./certbot/conf/*
rm -rf ./certbot/www/*

# Tạo thư mục certbot với đầy đủ cấu trúc
mkdir -p ./certbot/conf/live/phatd.xyz
mkdir -p ./certbot/www

# Tạo dummy certificate
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:1024 -days 1\
    -keyout '/etc/letsencrypt/live/phatd.xyz/privkey.pem' \
    -out '/etc/letsencrypt/live/phatd.xyz/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting nginx ..."
docker-compose up --force-recreate -d nginx
echo "### Waiting for nginx ..."
sleep 5

# Xóa dummy certificate
docker-compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/phatd.xyz && \
  rm -Rf /etc/letsencrypt/archive/phatd.xyz && \
  rm -Rf /etc/letsencrypt/renewal/phatd.xyz.conf" certbot

echo "### Requesting Let's Encrypt certificate for ${domains[*]} ..."

# Sử dụng staging environment cho test
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --staging \
    --email ${email} \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

echo "### Reloading nginx ..."
docker-compose exec nginx nginx -s reload

# Khởi động lại tất cả các services
docker-compose up -d