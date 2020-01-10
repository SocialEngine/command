
const path = require('path');
const commander = require('commander');
const fs = require('fs');
const Sentry = require('@sentry/node');
const dotenv = require('dotenv');

let iteration = 0;
let useFile = 0;
for (const arg of process.argv) {
    iteration++;
    if (arg === '-u') {
        useFile = iteration;
        break;
    }
}

if (useFile && process.argv[useFile] !== undefined) {
    process.env['SE_USE_PREFIX'] = process.argv[useFile];
}

const config = require('./app/config');

if (config.exits() && config.get('sentry')) {
    Sentry.init({
        dsn: config.get('sentry')
    });
}

let envFile = path.join(
    process.cwd(),
    '/.cache/',
    (process.env['SE_USE_PREFIX'] ? process.env['SE_USE_PREFIX'] + '.' : '') + 'env'
);

if (fs.existsSync(envFile)) {
    dotenv.config({
        path: envFile
    });
}

const commandDir = path.join(__dirname, '/commands');
const files = fs.readdirSync(commandDir);
const appBoot = path.join(process.cwd(), '/app/boot.js');

for (const file of files) {
    if (path.extname(file) === '.js') {
        require(path.join(commandDir, file));
    }
}

if (fs.existsSync(appBoot)) {
    require(appBoot)(commander);
}

async function main () {
    commander.option('-u, --use <prefix>', 'Use a global prefix');
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
