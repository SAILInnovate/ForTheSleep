FROM node:18-slim

# 1. Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 2. Setup App
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

# 3. Expose Port
EXPOSE 3000
CMD ["node", "index.js"]
