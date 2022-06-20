---
layout: main
title: Stream Music on Telegram Group Voice Chat
---

## Prerequisites

- ### NodeJS

  - #### Ubuntu

    ```bash
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

  - #### Windows

    Download from [nodejs.org](https://nodejs.org/en/download)

- ### FFMPEG

  - #### Ubuntu

    ```bash
    sudo apt-get install ffmpeg -y
    ```

  - #### Windows

    Download from https://www.gyan.dev/ffmpeg/builds and set path for FFMPEG so that FFMPEG can be accessed through command.

## Install

- Windows

  ```powershell
  iwr https://raw.githubusercontent.com/ArnabXD/TGVCBot/main/scripts/install.ps1 -useb | iex
  ```

- Linux

  ```bash
  wget -qO- https://raw.githubusercontent.com/ArnabXD/TGVCBot/main/scripts/install.sh | sh
  ```

Now fill the .env file and start the bot using `npm run start`.

## Environment Variables

| Name        | Description                                                                            | Required |
| ----------- | -------------------------------------------------------------------------------------- | -------- |
| API_ID      | Your telegram app's API_ID. Get it from https://my.telegram.org/apps                   | True     |
| API_HASH    | Your telegram app's API_HASH. Get it from https://my.telegram.org/apps                 | True     |
| BOT_TOKEN   | Bot Token from [@BotFather](https://telegram.dog/BotFather)                            | True     |
| LOG_CHANNEL | Chat ID of Channel/Group to keep logs. (Make sure to add VC User and Bot to the group) | True     |
| SESSION     | GramJS/Telethon session string of the VC User. [Session Gen](https://ssg.roj.im)       | True     |
| THUMBNAIL   | Direct link for default thumbnail (used if audio has no thumbnails).                   | False    |
| WATERMARK   | Text to render on bottom left corner of Banner. Default: `TGVCBot`. (10-14 chars)      | False    |

## Commands

- `/jiosaavn | /jsvn <song name>` : Play Song from JioSaavn.
- `/yt | /youtube` : Play songs from YouTube
- `/radio | stream link` : Stream any direct link.
- `/queue | /q` : Show Queue List
- `/pause | /p` : Pause the Stream
- `/resume | /r` : Resume the Stream
- `/skip | /next` : Skip the Stream
- `/shuffle` : Shuffle the playlist
- `/stopvc` : Stop the Stream
- `/leave` : Leave VC (works if stream is finished but VC user not left)
