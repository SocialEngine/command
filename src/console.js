
const path = require('path');
const commander = require('commander');
const fs = require('fs');

const commandDir = path.join(__dirname, '/commands');
const files = fs.readdirSync(commandDir);

for (const file of files) {
    if (path.extname(file) === '.js') {
        require(path.join(commandDir, file));
    }
}

async function main () {
    commander.command('*').action((command) => {
        console.error('"' + command + '" is not a valid command.');
        commander.outputHelp();
    });
    if (!process.argv.slice(2).length) {
        commander.outputHelp();
    }
    commander.parse(process.argv);
}

main()
    .catch(e => {
        console.error(e);
    });
