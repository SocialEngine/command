const commander = require('commander');
const config = require('../app/config');
const output = require('../app/output');
const store = require('../app/store');

const accepted = [
    'sentry'
];

commander.command('config:add <key> <value>').action(async function () {
    console.log(`"config:add" has been replaced with "config:set".`);
});

commander.command('config:set <key> <value>').action(async function (key, value) {
    if (!accepted.includes(key)) {
        return output.error(`${key} is not a valid config setting.`);
    }
    config.update(key, value);
    console.log(`Config updated!`);
});

commander.command('config:list').action(async function () {
    console.log({
        ...config.get(),
        store: {
            url: store.getUrl(),
            siteId: store.getSiteId(),
            ...store.getConfig()
        }
    });
});
