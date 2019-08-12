
const commander = require('commander');
const io = require('socket.io-client');
const chokidar = require('chokidar');
const path = require('path');
const watcher = require('../app/watcher');
const product = require('../app/product');
const config = require('../app/config');
const {error} = require('../app/output');

const srcDir = path.join(process.cwd(), '/src');
const serverDir = path.join(process.cwd(), '/srv');

commander.command('watch').action(async () => {
    if (!config.exits()) {
        error('Config file is missing. Run "socialengine init" first.');
    }

    const client = io.connect(config.get('url'));
    let connections = 0;

    client.on('connect', function () {
        if (connections >= 1) {
            return null;
        }

        console.log('Connected to SocialEngine Unite...');

        client.emit('devops:connect', {
            config: config.get()
        });

        const watchFor = ['add', 'change', 'unlink'];
        console.log('Watching:');
        console.log(' -', srcDir);
        console.log(' -', serverDir);

        const watch = chokidar.watch(srcDir, {
            ignoreInitial: true
        });

        for (const event of watchFor) {
            watch.on(event, watcher.srcFiles(client, event));
        }

        const watchServerDir = chokidar.watch(serverDir, {
            ignoreInitial: true
        });

        for (const event of watchFor) {
            watchServerDir.on(event, watcher.serverFiles(client, event));
        }

        connections++;
    });

    client.on('devops:' + config.get('hash'), function (params) {
        switch (params.action) {
            case 'eventListener':
                product.saveEventListener(params.data);
                break;
            case 'moduleCode':
                product.saveModuleCode(params.data);
                break;
            case 'newFile':
                product.newFile(params.data);
                break;
            default:
                product.save(params.data);
                break;
        }
    });
});
