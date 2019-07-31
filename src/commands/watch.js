
const app = require('../app');
const commander = require('commander');
const io = require('socket.io-client');
const chokidar = require('chokidar');
const path = require('path');
const watcher = require('../app/watcher');
const product = require('../app/product');

const srcDir = path.join(process.cwd(), '/src');

commander.command('watch').action(async () => {
    if (!app.config.exits()) {
        app.error('Config file is missing. Run "node socialengine init" first.');
    }

    const config = app.config.get();
    const client = io.connect(config.url);
    let connections = 0;

    client.on('connect', function () {
        if (connections >= 1) {
            console.log('already watching...');
            return null;
        }
        console.log('Connected...');
        client.emit('heartbeat', 'ping');

        const watchFor = ['add', 'change', 'unlink'];
        const watch = chokidar.watch(srcDir, {
            ignoreInitial: true
        });

        for (const event of watchFor) {
            watch.on(event, watcher(client, event));
        }

        connections++;
    });

    client.on('devops:' + config.hash, function (params) {
        product.save(params.data);
    });
});
