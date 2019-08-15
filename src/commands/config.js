const commander = require('commander');
const config = require('../app/config');
const output = require('../app/output');

const accepted = [
    'sentry'
];

commander.command('config:add <key> <value>').action(async function (key, value) {
    if (!accepted.includes(key)) {
        return output.error(`${key} is not a valid config setting.`);
    }
    config.update(key, value);
    console.log(`Config updated!`);
});
