# Credits - https://github.com/xorgram/xor

wget https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz
tar xf archive.tgz
rm archive.tgz
mv package tgvcbot

cd tgvcbot
cp .env.sample .env
pnpm install --prod

echo "Success."