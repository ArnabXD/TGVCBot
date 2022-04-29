# Credits - https://github.com/xorgram/xor

wget https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz
tar xf archive.tgz
rm archive.tgz
mv -f package tgvcbot

cd tgvcbot
npm install --production

echo "Success."