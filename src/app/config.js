
const path = require('path');
const fs = require('fs');
const {error} = require('./output');

const configFile = path.join(process.cwd(), '/.cache/config.json');
const configDir = path.dirname(configFile);
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
    return fs.existsSync(configFile);
};

exports.save = function (config) {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 4), 'utf-8');
};

exports.get = function (key = null) {
    if (!this.exits()) {
        error('Config file does not exist.');
    }
    const config = require(configFile);
    if (key) {
        return config[key] || null;
    }
    return config;
};
