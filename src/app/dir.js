const fs = require('fs');
const path = require('path');

exports.open = function (directory) {
    const read = (dir) => {
        return fs.readdirSync(dir)
            .reduce((files, file) =>
                    fs.statSync(path.join(dir, file)).isDirectory()
                        ? files.concat(read(path.join(dir, file)))
                        : files.concat(path.join(dir, file)),
                []);
    };

    return read(directory);
};

exports.delete = function (dir) {
    this.open(dir).forEach(file => {
        fs.unlinkSync(file);
    });
    const baseFiles = [];
    const read = (dir) => {
        return fs.readdirSync(dir)
            .reduce((files, file) => {
                    if (fs.statSync(path.join(dir, file)).isDirectory()) {
                        baseFiles.push(path.join(dir, file));
                        if (Array.isArray(files)) {
                            files.concat(read(path.join(dir, file)));
                        }
                    }
                },
                []);
    };
    try {
        read(dir);
        baseFiles.reverse().forEach(directory => {
            fs.rmdirSync(directory);
        });
        fs.rmdirSync(dir);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
