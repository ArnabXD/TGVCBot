Invoke-WebRequest -Uri "https://github.com/ArnabXD/TGVCBot/releases/latest/download/archive.tgz" -OutFile archive.tgz
tar xf archive.tgz
Remove-Item archive.tgz -Force
Move-Item package tgvcbot -Force

cd tgvcbot
npm install --production

echo "Success."