const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const url = require("url");
const path = require("path");
const isURL = require("validator/lib/isURL");
const axios = require("axios");

const DEFAULT_ROOM = "floppy-test";

const playSong = robot => file => {
  const process = spawn("pmidi", ["-p", "128:0", `./songs/${file}`]);
  process.on("error", err => {
    robot.messageRoom(
      DEFAULT_ROOM,
      `Oh noes, something went wrong while playing ${file}: \`${err}\``
    );
  });
};

const createDownloader = robot => link => {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(link);
    const filename = path.basename(parsed.pathname);
    const file = fs.createWriteStream(`./songs/${filename}`);
    axios({ url: link, method: "GET", responseType: "stream" })
      .then(({ data }) => {
        data.pipe(file);
        resolve(filename);
      })
      .catch(err => {
        robot.messageRoom(
          DEFAULT_ROOM,
          `Oh noes, something went wrong while downloading ${link}: \`${err}\``
        );
        fs.unlink(`./songs/${filename}`, () => {
          console.error(`Could not unlink ${file}`);
        });
        reject(err);
      });
  });
};

module.exports = robot => {
  const player = playSong(robot);
  const downlader = createDownloader(robot);
  robot.respond(/play (.*)/i, res => {
    const target = res.match[1];
    if (fs.existsSync(target)) {
      res.reply(`Playing ${target}`);
      player(target);
    } else if (isURL(target)) {
      res.reply(`Downloading ${target}`);
      downlader(target)
        .then(player)
        .catch(console.error);
    } else {
      res.reply("I can't play this");
    }
  });
};
