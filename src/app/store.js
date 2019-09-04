const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const output = require('./output');
const product = require('./product');
const str = require('./str');

exports.getUrl = function () {
    return process.env['SE_STORE_URL'] || 'https://www.socialengine.com';
};

exports.getSiteId = function () {
    return process.env['SE_STORE_ID'] || '1-6ac007b9-95da-4c76-a3c7-5d8a4b2c753b';
};

exports.getXhrToken = async function () {
    const url = this.getUrl();
    const request = await fetch(url + '/storage/' + this.getSiteId() + '/' + str.random(8) + '/js/viewer.js');
    const content = await request.text();
    const parts = content.split('\n');
    let xhrToken = null;
    for (let part of parts) {
        part = part.trim();
        const match = part.match(/xhrToken: '(.*?)',/i);
        if (match && match[1] !== undefined) {
            xhrToken = match[1];
        }
    }
    return xhrToken;
};

exports.saveConfig = function (data) {
    const configFile = path.join(process.cwd(), '/.cache/store.json');
    const newData = {
        ...data
    };
    fs.writeFileSync(
        configFile,
        JSON.stringify(newData, null, 4),
        'utf-8'
    );
};

exports.push = async function (productId) {
    const name = productId.split('/')[1];
    const manifestFile = path.join(process.cwd(), '/.se/' + name, 'manifest.json');
    if (!fs.existsSync(manifestFile)) {
        return output.error('Not a valid product to push.');
    }
    const manifest = require(manifestFile);
    const data = await product.getFiles(manifest);
    console.log(data);
};
