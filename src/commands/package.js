const commander = require('commander');
const parse = require('../app/parse');
const output = require('../app/output');
const io = require('socket.io-client');
const config = require('../app/config');

commander.command('package:add <product> <module>').action(async function (product, name) {
    if (!config.exits()) {
        output.error('Config file is missing. Run "socialengine init" first.');
    }
    const spinner = output.Spinner();
    const client = io.connect(config.get('url'));

    client.on('devops:externalFile:' + product + ':module:' + name, function () {
        console.log(`Module "${name}" added.`);
        process.exit(0);
    });

    spinner.start();
    client.on('connect', function () {
        parse.buildExternal(name)
            .then(response => {
                const data = {
                    externalFile: 'module:' + name,
                    code: response
                };
                client.emit('devops', {
                    file: {
                        event: 'add',
                        ...data
                    },
                    manifest: {
                        id: product
                    },
                    config: config.get()
                });
            })
            .catch(output.error);
    });
});
