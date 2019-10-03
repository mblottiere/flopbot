const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const url = require("url");
const path = require("path");
const axios = require("axios");
const config = require("../config/floppy.json");

const DEFAULT_ROOM = "floppy-test";

let masterProcess = null;

const restartFlopmaster = () => {
  spawn("killall", ["pmidi"]);
  if (masterProcess) {
    masterProcess.kill("SIGTERM");
  }
  console.log("Restarting flopmaster");
  masterProcess = spawn("FlopMaster", ["/dev/ttyACM0", "-d8", "-o"]);
}

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
        file.on('finish', () => {
          resolve(filename);
        });
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
  restartFlopmaster();
  robot.respond(/download (.*)/i, res => {
    const target = res.match[1];
    res.reply(`Downloading ${target}`);
    downlader(target)
      .then(player)
      .catch(console.error);
  });
  robot.respond(/play (.*)/i, res => {
    const target = res.match[1];
    res.reply(`Playing ${target}`);
    player(target);
  });
  robot.respond(/stop/, res => {
    restartFlopmaster();
  });
  config.triggers.forEach(({regex, file}) => {
    console.debug(`Registering trigger for /${regex}/ -> ${file}`);
    robot.hear(new RegExp(regex), res => {
      player(file);
    });
  });
};
