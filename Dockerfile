FROM node:16.13.2-bullseye-slim
RUN apt update && apt upgrade -y && apt install ffmpeg git wget -y
RUN wget --no-check-certificate https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz
RUN tar xf archive.tgz
RUN rm archive.tgz
RUN mv -f package tgvcbot
RUN cd tgvcbot && yarn install
WORKDIR /tgvcbot
RUN yarn run start