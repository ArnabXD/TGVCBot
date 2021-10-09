# TGVCBot (Beta)

[![Deploy to Heroku](https://github.com/ArnabXD/TGVCBot/actions/workflows/heroku.yml/badge.svg?branch=main)](https://github.com/ArnabXD/TGVCBot/actions/workflows/heroku.yml)
[![TypeScript Build](https://github.com/ArnabXD/TGVCBot/actions/workflows/typescript.yml/badge.svg?branch=main)](https://github.com/ArnabXD/TGVCBot/actions/workflows/typescript.yml)

[![Total alerts](https://img.shields.io/lgtm/alerts/g/ArnabXD/TGVCBot.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ArnabXD/TGVCBot/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/ArnabXD/TGVCBot.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ArnabXD/TGVCBot/context:javascript)

![LOGO](https://telegra.ph/file/e9dd76aadf0b500e02738.jpg)

### Requirements ([wiki](../../wiki/Requirements))

- FFMPEG
- NodeJs > V14. (Latest is better)
- Yarn

### Environment Variables

| Name         | Description                                                                            | Required |
| ------------ | -------------------------------------------------------------------------------------- | -------- |
| API_ID       | Your telegram app's API_ID. Get it from https://my.telegram.org/apps                   | True     |
| API_HASH     | Your telegram app's API_HASH. Get it from https://my.telegram.org/apps                 | True     |
| BOT_TOKEN    | Bot Token from [@BotFather](https://telegram.dog/BotFather)                            | True     |
| LOG_CHANNEL  | Chat ID of Channel/Group to keep logs. (Make sure to add VC User and Bot to the group) | True     |
| SESSION      | GramJS/Telethon session string of the VC User. [Session Gen](https://ssg.rojser.best)  | True     |
| MAX_DURATION | Set maximum duration of the stream. Default: `36000` seconds                           | False    |
| THUMBNAIL    | Direct link for default thumbnail (used if audio has no thumbnails).                   | False    |

### Tutorial

- VPS/Local : [Tutorial](https://blog.arnabxd.me/deploy-tgvcbot-in-a-ubuntu-vps)

### Memes

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

[![Deploy on Railway](https://railway.app/button.svg)](<https://railway.app/new/template?template=https://github.com/ArnabXD/TGVCBot&envs=API_ID,API_HASH,BOT_TOKEN,LOG_CHANNEL,SESSION,CODEC,MAX_DURATION&optionalEnvs=CODEC,MAX_DURATION&API_IDDesc=Get%20API_ID%20from%20https://my.telegram.org/apps.&API_HASHDesc=Get%20API_HASH%20from%20https://my.telegram.org/apps.&BOT_TOKENDesc=Bot%20Token%20from%20@BotFather&LOG_CHANNELDesc=LOG%20Channel%20ID%20(Make%20sure%20bot%20and%20VC%20User%20are%20added%20in%20the%20group)&SESSIONDesc=GramJS/Telethon%20Session%20of%20the%20VC%20User%22&THUMBNAILDesc=Direct%20link%20for%20default%20thumbnail&MAX_DURATIONDesc=Maximum%20Duration%20Support%20for%20Each%20Stream>)

## Bot Usage

- `/jiosaavn | /jsvn <song name>` : Play Song from JioSaavn.
- `/youtube | /yt <song name | link>`: Play Song from Youtube.
- `/queue | /q` : Show Queue List
- `/pause | /p` : Pause the Stream
- `/resume | /r` : Resume the Stream
- `/skip | /next` : Skip the Stream
- `/stopvc` : Stop the Stream

## Thanks to

- [@cachecleanerjeet](https://github.com/cachecleanerjeet) for [JioSaavn API](https://github.com/cachecleanerjeet/JiosaavnAPI)
- Respective devs of all the packages/libraries used.

---

**_Loved the project? Consider sponsoring._**
