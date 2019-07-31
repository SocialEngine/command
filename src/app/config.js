
const path = require('path');
const fs = require('fs');
const {error} = require('./output');

const configFile = path.join(__dirname, '/../../.cache/config.json');

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
