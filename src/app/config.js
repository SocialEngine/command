
const path = require('path');
const fs = require('fs');
const {error} = require('./output');

function getConfigFile () {
    let file = 'config.json';
    if (process.env['SE_USE_PREFIX']) {
        file = process.env['SE_USE_PREFIX'] + '.' + file;
    }
    return path.join(process.cwd(), '/.cache/', file);
}

const configDir = path.dirname(getConfigFile());
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
}

exports.update = function (key, value) {
    if (this.exits()) {
        const current = this.get();
        this.save({
            ...current,
            [key]: value
        });
    }
};

exports.exits = function () {
    return fs.existsSync(getConfigFile());
};

exports.save = function (config) {
    fs.writeFileSync(getConfigFile(), JSON.stringify(config, null, 4), 'utf-8');
};

exports.get = function (key = null) {
    if (!this.exits()) {
        error('Config file does not exist.');
    }
    const config = require(getConfigFile());
    if (key) {
        return config[key] || null;
    }
    return config;
};
