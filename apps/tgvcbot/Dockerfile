FROM node:16.13.2-bullseye-slim
RUN apt update && apt upgrade -y && apt install ffmpeg git -y
COPY . /tgvcbot
WORKDIR /tgvcbot
RUN yarn install
RUN yarn build
RUN rm -rf src
CMD yarn start