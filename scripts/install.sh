# Credits - https://github.com/xorgram/xor

wget --no-check-certificate https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz
tar xf archive.tgz
rm archive.tgz

if [ -d "tgvcbot" ]
then
  cp -r package/* tgvcbot/
  rm -rf package
else
  mv -f package tgvcbot
fi

cd tgvcbot
npm install --production

echo "Success."
