const config = require('./config');
const output = require('./output');
const path = require('path');
const fs = require('fs');

const findUp = function findCacheFolder (folder, lookingFor) {
    const currentDir = path.dirname(folder);
    const last = currentDir.split('/').pop();
    if (!last) {
        return false;
    }
    const checkDir = path.join(currentDir, lookingFor);
    if (fs.existsSync(checkDir)) {
        return checkDir;
    }
    return findCacheFolder(path.join(currentDir, '../'), lookingFor);
};

module.exports = function (socket, event) {
    return function (file) {
        const ext = file.split('.').pop();
        if (!['js'].includes(ext)) {
            return;
        }

        const dir = findUp(file, '/.se');
        if (!dir) {
            output.error('/.se cache directory not found.');
            return null;
        }
        const manifest = require(path.join(dir, '/manifest.json'));
        const fileName = file.replace(path.join(dir, '../'), manifest.id + '/');
        // const parts = path.split('/src/');

        socket.emit('devops', {
            file: {
                event: event,
                name: fileName
            },
            manifest: {
                id: manifest.id
            },
            config: config.get()
        });
    };
};
