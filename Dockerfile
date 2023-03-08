FROM node:16.13.2-bullseye-slim
RUN apt update && apt upgrade -y && apt install ffmpeg git -y
RUN wget -qO- https://raw.githubusercontent.com/ArnabXD/TGVCBot/main/scripts/install.sh | sh
WORKDIR /tgvcbot
CMD yarn start