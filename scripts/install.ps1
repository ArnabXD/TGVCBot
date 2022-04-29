Invoke-WebRequest -Uri "https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz" -OutFile archive.tgz
tar xf archive.tgz
Remove-Item archive.tgz -Force
Move-Item package tgvcbot

cd tgvcbot
cp .env.sample .env
npm install --production

echo "Success."