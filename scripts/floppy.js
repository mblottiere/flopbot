const { spawn } = require('child_process');

const DEFAULT_ROOM = 'floppy-test';

const playSong = robot => file => {
  const process = spawn("pmidi", ["-p", "128:0", `./songs/${file}`]);
  process.on('error', err => {
    robot.messageRoom(DEFAULT_ROOM, `Oh noes, something went wrong while playing ${file}: \`${err}\``);
  });
}

module.exports = (robot) => {
  const player = playSong(robot);
  robot.respond(/play (.*)/i, (res) => {
    const file = res.match[1];
    res.reply(`Playing ${file}`);
    player(file);
  });
};
