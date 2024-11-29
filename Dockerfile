# Dockerfile
# Sử dụng Node.js làm base image
FROM node:18-alpine

# Thiết lập thư mục làm việc
WORKDIR /usr/src/app

# Sao chép package.json và package-lock.json
COPY package*.json ./

# Cài đặt các phụ thuộc
RUN npm install --legacy-peer-deps && \
    npm install -g typescript

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Biên dịch TypeScript
RUN npm run build

# Mở cổng mà ứng dụng sẽ chạy
EXPOSE 8000

# Lệnh để chạy ứng dụng
CMD ["npm", "run", "dev"]