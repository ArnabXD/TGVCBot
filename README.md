# TGVCBot

[![Deploy to Heroku](https://github.com/ArnabXD/TGVCBot/actions/workflows/heroku.yml/badge.svg?branch=main)](https://github.com/ArnabXD/TGVCBot/actions/workflows/heroku.yml)
[![TypeScript Build](https://github.com/ArnabXD/TGVCBot/actions/workflows/typescript.yml/badge.svg?branch=main)](https://github.com/ArnabXD/TGVCBot/actions/workflows/typescript.yml)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/ArnabXD/TGVCBot/graphs/commit-activity)
[![forks](https://img.shields.io/github/forks/ArnabXD/TGVCBot)](https://github.com/ArnabXD/TGVCBot/forks)
[![stars](https://img.shields.io/github/stars/ArnabXD/TGVCBot)](https://github.com/ArnabXD/TGVCBot/stars)

[![Total alerts](https://img.shields.io/lgtm/alerts/g/ArnabXD/TGVCBot.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ArnabXD/TGVCBot/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/ArnabXD/TGVCBot.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ArnabXD/TGVCBot/context:javascript)

![LOGO](https://telegra.ph/file/e9dd76aadf0b500e02738.jpg)

### Requirements 💻:  ([wiki](../../wiki/Requirements))

- FFMPEG
- NodeJs >= v16.x (Latest is better)
- Yarn (already provided by [corepack](https://nodejs.org/api/corepack.html) since 16.9.0)

### Environment Variables : 

| Name         | Description                                                                            | Required |
| ------------ | -------------------------------------------------------------------------------------- | -------- |
| API_ID       | Your telegram app's API_ID. Get it from https://my.telegram.org/apps                   | True     |
| API_HASH     | Your telegram app's API_HASH. Get it from https://my.telegram.org/apps                 | True     |
| BOT_TOKEN    | Bot Token from [@BotFather](https://telegram.dog/BotFather)                            | True     |
| LOG_CHANNEL  | Chat ID of Channel/Group to keep logs. (Make sure to add VC User and Bot to the group) | True     |
| SESSION      | GramJS/Telethon session string of the VC User. [Session Gen](https://ssg.roj.im)       | True     |
| MAX_DURATION | Set maximum duration of the stream. Default: `36000` seconds                           | False    |
| THUMBNAIL    | Direct link for default thumbnail (used if audio has no thumbnails).                   | False    |
| WATERMARK    | Text to render on bottom left corner of Banner. Default: `TGVCBot`. (10-14 chars)      | False    |

### Tutorial 🔥: 

- VPS/Local : [Tutorial](https://blog.arnabxd.me/deploy-tgvcbot-in-a-ubuntu-vps), [Video](https://www.youtube.com/watch?v=uc5yWBbrssg) 

### Memes 🤣: 

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

[![Deploy on Railway](https://railway.app/button.svg)](<https://railway.app/new/template?template=https://github.com/ArnabXD/TGVCBot&envs=API_ID,API_HASH,BOT_TOKEN,LOG_CHANNEL,SESSION,CODEC,MAX_DURATION&optionalEnvs=CODEC,MAX_DURATION&API_IDDesc=Get%20API_ID%20from%20https://my.telegram.org/apps.&API_HASHDesc=Get%20API_HASH%20from%20https://my.telegram.org/apps.&BOT_TOKENDesc=Bot%20Token%20from%20@BotFather&LOG_CHANNELDesc=LOG%20Channel%20ID%20(Make%20sure%20bot%20and%20VC%20User%20are%20added%20in%20the%20group)&SESSIONDesc=GramJS/Telethon%20Session%20of%20the%20VC%20User%22&THUMBNAILDesc=Direct%20link%20for%20default%20thumbnail&MAX_DURATIONDesc=Maximum%20Duration%20Support%20for%20Each%20Stream>)

## Bot Usage 👨‍💻:

- `/jiosaavn | /jsvn <song name>` : Play Song from JioSaavn.
- `/radio | stream link` : Stream any direct link.
- `/queue | /q` : Show Queue List
- `/pause | /p` : Pause the Stream
- `/resume | /r` : Resume the Stream
- `/skip | /next` : Skip the Stream
- `/shuffle` : Shuffle the playlist
- `/stopvc` : Stop the Stream
- `/leave` : Leave VC (works if stream is finished but VC user not left)

### For Support :

[![Telegram](https://img.shields.io/badge/Join-Telegram-blue?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAyNCAyNCIgaGVpZ2h0PSI1MTIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtOS40MTcgMTUuMTgxLS4zOTcgNS41ODRjLjU2OCAwIC44MTQtLjI0NCAxLjEwOS0uNTM3bDIuNjYzLTIuNTQ1IDUuNTE4IDQuMDQxYzEuMDEyLjU2NCAxLjcyNS4yNjcgMS45OTgtLjkzMWwzLjYyMi0xNi45NzIuMDAxLS4wMDFjLjMyMS0xLjQ5Ni0uNTQxLTIuMDgxLTEuNTI3LTEuNzE0bC0yMS4yOSA4LjE1MWMtMS40NTMuNTY0LTEuNDMxIDEuMzc0LS4yNDcgMS43NDFsNS40NDMgMS42OTMgMTIuNjQzLTcuOTExYy41OTUtLjM5NCAxLjEzNi0uMTc2LjY5MS4yMTh6IiBmaWxsPSIjMDM5YmU1Ii8+PC9zdmc+)](https://t.me/xdbotschat)


## Thanks To 😘:

- [@cachecleanerjeet](https://github.com/cachecleanerjeet) for [JioSaavn API](https://github.com/cachecleanerjeet/JiosaavnAPI)
- Respective devs of all the packages/libraries used.

---
**_Loved the project? Consider sponsoring._**
___
