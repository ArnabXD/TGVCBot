import { consola } from "consola";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { bot } from "./clients";
import env from "./env";
import { jiosaavn } from "./providers/jiosaavn";
import { yt } from "./providers/youtube";
import { type QueueData, queue } from "./queue";
import { tgcalls } from "./tgcalls";
import { validateInitData, type WebAppUser } from "./utils/auth";

const logger = consola.withTag("server");

type Variables = {
  user: WebAppUser;
};

export function startWebServer() {
  const port = env.PORT;
  const app = new Hono<{ Variables: Variables }>();

  // Enable CORS for API routes
  app.use("/api/*", cors());

  // Authentication Middleware for API routes
  app.use("/api/*", async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const validated = validateInitData(authHeader);

    if (!validated) {
      // Only warn if an authorization was attempted but failed signature check.
      // Avoid spamming the logs during local browser previews where headers are missing.
      if (authHeader) {
        logger.warn(
          `Unauthorized API access attempt to ${c.req.path} (invalid signature)`,
        );
      }
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", validated.user);
    await next();
  });

  // GET /api/status?chatId=...
  app.get("/api/status", async (c) => {
    const chatId = Number(c.req.query("chatId"));
    if (!chatId) {
      return c.json({ error: "Missing chatId" }, 400);
    }

    let chatName: string | undefined;
    try {
      const chat = await bot.getChat(chatId);
      if ("title" in chat) chatName = chat.title;
    } catch {
      // not critical — omit from response
    }

    return c.json({
      active: tgcalls.isActive(chatId),
      current: queue.getCurrent(chatId) || null,
      queue: queue.getAll(chatId),
      chatName,
    });
  });

  // GET /api/search?q=...&provider=...
  app.get("/api/search", async (c) => {
    const query = c.req.query("q") || "";
    const provider = c.req.query("provider") || "youtube";

    if (!query.trim()) {
      return c.json([]);
    }

    try {
      let results: unknown[] = [];
      if (provider === "jiosaavn") {
        const res = await jiosaavn.search(query);
        results = res.map((r) => ({
          id: r.id,
          title: r.name,
          artist: r.artists.primary.map((a) => a.name).join(", ") || "Unknown",
          duration: r.duration
            ? `${Math.floor(r.duration / 60)}:${(r.duration % 60).toString().padStart(2, "0")}`
            : "Unknown",
          image: r.image?.at(-1)?.url || "",
        }));
      } else {
        const res = await yt.search(query);
        results = res.map((r) => ({
          id: r.id,
          title: r.title,
          artist: r.artist,
          duration: r.durationFormatted,
          image: "",
        }));
      }
      return c.json(results);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Search failed";
      logger.error("Search API failed", err);
      return c.json({ error: errMsg }, 500);
    }
  });

  // POST /api/queue/add
  app.post("/api/queue/add", async (c) => {
    try {
      const body = await c.req.json();
      const { chatId, songId, provider } = body;

      if (!chatId || !songId || !provider) {
        return c.json({ error: "Missing fields" }, 400);
      }

      const user = c.get("user");
      const requester = {
        id: user.id,
        first_name: user.first_name,
      };

      logger.info(
        `Adding song to queue via WebApp: chatId=${chatId} songId=${songId} provider=${provider}`,
      );

      // Fetch chat details to get the group title
      let chatName = "Group Voice Chat";
      try {
        const chat = await bot.getChat(chatId);
        if ("title" in chat) {
          chatName = chat.title;
        }
      } catch (_err) {
        logger.warn(
          `Failed to fetch chat details for ${chatId}, using default name`,
        );
      }

      let songData: QueueData;
      if (provider === "jiosaavn") {
        songData = await jiosaavn.getSong(songId, requester);
      } else {
        songData = await yt.getSong(songId, requester);
      }

      await tgcalls.streamOrQueue({ id: chatId, name: chatName }, songData);

      return c.json({ success: true, song: songData });
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Internal server error";
      logger.error("Add queue API failed", err);
      return c.json({ error: errMsg }, 500);
    }
  });

  // POST /api/control
  app.post("/api/control", async (c) => {
    try {
      const body = await c.req.json();
      const { chatId, action } = body;

      if (!chatId || !action) {
        return c.json({ error: "Missing fields" }, 400);
      }

      const user = c.get("user");
      logger.info(
        `Stream control action from WebApp: chatId=${chatId} action=${action} user=${user.first_name}`,
      );

      let ok = false;
      switch (action) {
        case "pause":
          ok = await tgcalls.pause(chatId);
          break;
        case "resume":
          ok = await tgcalls.resume(chatId);
          break;
        case "skip":
          ok = await tgcalls.skip(chatId);
          break;
        case "stop":
          ok = await tgcalls.stop(chatId);
          break;
        case "shuffle":
          if (queue.has(chatId)) {
            queue.shuffle(chatId);
            ok = true;
          }
          break;
        default:
          return c.json({ error: "Unknown action" }, 400);
      }

      return c.json({ success: ok });
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Internal server error";
      logger.error("Control API failed", err);
      return c.json({ error: errMsg }, 500);
    }
  });

  // Static files fallback - serves index.html and assets in public/
  app.use("/*", serveStatic({ root: "./public" }));

  // Serve app using Bun.serve
  Bun.serve({
    port,
    fetch: app.fetch,
  });

  logger.success(`Web server running with Hono on port ${port}`);
}
