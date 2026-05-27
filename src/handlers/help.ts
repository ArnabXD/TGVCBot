import { Composer } from "@mtkruto/node";

const composer = new Composer();

const HELP =
  `<b>Available commands:</b>\n\n` +
  `/jiosaavn &lt;query&gt; — Play from JioSaavn (first result)\n` +
  `/jsvnsearch &lt;query&gt; — Search JioSaavn and pick a result\n` +
  `/youtube &lt;query&gt; — Play from YouTube (first result)\n` +
  `/ytsearch &lt;query&gt; — Search YouTube and pick a result\n` +
  `/play — Reply to an audio file to play it\n` +
  `/radio &lt;url&gt; — Stream a direct HTTP audio URL\n` +
  `/queue — Show queued tracks\n` +
  `/shuffle — Shuffle the queue\n` +
  `/p — Pause\n` +
  `/r — Resume\n` +
  `/skip — Skip current track\n` +
  `/stopvc — Stop and clear queue\n` +
  `/leave — Leave voice chat\n` +
  `/help — Show this menu`;

composer.command("help", (ctx) => ctx.reply(HELP, { parseMode: "HTML" }));

export default composer;
