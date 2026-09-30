const express = require("express");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const { spawn, execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 80;
const DOWNLOAD_DIR = path.join(__dirname, "downloads");

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

try {
  console.log("Node:", execSync("node -v").toString().trim());
  console.log("yt-dlp:", execSync("yt-dlp --version").toString().trim());
} catch (e) {
  console.error("Erreur vérification dépendances:", e.message);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function validYoutubeUrl(url) {
  try {
    const u = new URL(url);

    return [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com",
      "youtu.be",
    ].includes(u.hostname);
  } catch {
    return false;
  }
}

function getFormat(quality) {
  switch (quality) {
    case "720":
      return "bestvideo[height<=720]+bestaudio/best[height<=720]";

    case "2160":
      return "bestvideo[height<=2160]+bestaudio/best[height<=2160]";

    default:
      return "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
  }
}

app.post("/api/download", async (req, res) => {
  const {
    url,
    quality = "1080",
    subtitles = false,
    subtitleLang = "fr"
  } = req.body;

  if (!validYoutubeUrl(url)) {
    return res.status(400).json({
      error: "URL YouTube invalide"
    });
  }

  const jobId = crypto.randomUUID();

  res.status(202).json({
    jobId
  });

  const room = `job-${jobId}`;

  const args = [
    "--js-runtimes",
    "node",

    "--newline",

    "--no-playlist",

    "--restrict-filenames",

    "--progress-template",
    "%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",

    "--print",
    "after_move:FINAL_FILE:%(filepath)s",

    "-f",
    getFormat(quality),

    "--merge-output-format",
    "mp4",

    "-P",
    DOWNLOAD_DIR,

    "-o",
    "%(title).180s [%(id)s].%(ext)s"
  ];

  if (subtitles) {
    args.push(
        '--write-subs',
        '--sub-langs',
        subtitleLang,
        '--convert-subs',
        'srt',

        '--ignore-errors'
    );
  }

  args.push(url);

  console.log("yt-dlp", args.join(" "));

  const downloader = spawn("yt-dlp", args);

  downloader.stdout.on("data", data => {
    const line = data.toString().trim();

    const match = line.match(
      /^([\d.]+)%\|([^|]*)\|([^|]*)$/
    );

    if (match) {
      io.to(room).emit("progress", {
        percent: parseFloat(match[1]),
        speed: match[2].trim(),
        eta: match[3].trim()
      });
    }

    if (line.startsWith("FINAL_FILE:")) {
      const filename = path.basename(
        line.replace("FINAL_FILE:", "")
      );

      io.to(room).emit("complete", {
        filename
      });
    }

    console.log(line);
  });

  downloader.stderr.on("data", data => {
    const message = data.toString();

    console.error(message);

    io.to(room).emit("log", {
      message
    });
  });

  downloader.on("close", code => {
    if (code !== 0) {
      io.to(room).emit("failed", {
        error: `yt-dlp a quitté avec le code ${code}`
      });
    }
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true
  });
});

io.on("connection", socket => {
  socket.on("watch", jobId => {
    socket.join(`job-${jobId}`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});