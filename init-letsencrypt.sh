#!/bin/bash

domains=(phatd.xyz www.phatd.xyz)
rsa_key_size=4096
data_path="./certbot"
email="thaisieupham7@gmail.com"

# Tạo thư mục certbot nếu chưa tồn tại
if [ ! -e "$data_path" ]; then
  mkdir -p "$data_path/conf/live/$domains"
  mkdir -p "$data_path/www"
fi

# Dừng container nginx nếu đang chạy
docker-compose down

# Xóa các chứng chỉ cũ
rm -rf ./certbot/conf/*

# Tạo chứng chỉ
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $email \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d ${domains[0]} -d ${domains[1]}" certbot

# Khởi động lại containers
docker-compose up -d 