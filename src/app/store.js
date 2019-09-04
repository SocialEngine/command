const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const output = require('./output');
const dir = require('./dir');
const str = require('./str');
const parse = require('./parse');
const config = require('./config');

const sep = path.sep;

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
    const parts = productId.split('/');
    if (parts[1] === undefined) {
        return output.error('Not a valid product.');
    }
    const name = parts[1];
    const manifestDir = path.join(process.cwd(), '/.se', name);
    const manifestFile = path.join(manifestDir, 'manifest.json');
    const migrationDir = path.join(manifestDir, '/migrations');
    if (!fs.existsSync(manifestFile)) {
        return output.error('Not a valid product to push.');
    }
    const manifest = require(manifestFile);
    const data = {};

    data.manifest = manifest;
    data.migrations = {};
    data.source = {};

    if (fs.existsSync(migrationDir)) {
        for (const file of dir.open(migrationDir)) {
            data.migrations[file.replace(migrationDir, '')] = fs.readFileSync(
                file, 'utf-8'
            );
        }
    }

    const params = [
        '_createComponent',
        '_require'
    ];

    let clientContent = '';
    let clientAdminContent = '';
    clientContent += 'Breeze.extend(function (' + params.join(',') + ') {\n';
    clientAdminContent += 'Breeze.extend(function (' + params.join(',') + ') {\n';
    const dirPath = path.join(process.cwd(), '/src/', parts[1]);
    for (const file of dir.open(dirPath)) {
        const code = fs.readFileSync(file, 'utf-8');
        const component = parts[0] + '/' + file.split(sep + 'src' + sep)[1];
        const js = await parse.file(component, code);

        if (js.info.isAdmin) {
            clientAdminContent += js.code;
        } else {
            clientContent += js.code;
        }

        data.source[component.replace(productId, '')] = code;
    }
    clientAdminContent += '});\n';
    clientContent += '});\n';

    const parseClient = parse.js(clientContent, true, productId + '.js');
    const parseAdmin = parse.js(clientAdminContent, true, productId + '-acp.js');

    data.sourceParsed = parseClient.minified;
    data.sourceParsedAcp = parseAdmin.minified;
    const response = await this.request(manifest, {push: data}, 'PUT');
    if (response.guid !== undefined) {
        console.log('Successfully pushed!');
    }
};

exports.request = async function (product, data, method = 'POST') {
    const currentConfig = config.get();
    const props = {};
    if (method !== 'GET') {
        props.body = JSON.stringify(data);
    }
    const request = await fetch(currentConfig.url + '/api/warehouse/products/' + product.guid, {
        method: method,
        ...props,
        headers: {
            'se-client': 'frontend',
            'se-api-key': currentConfig.apiKey,
            'se-viewer-token': currentConfig.apiToken,
            'content-type': 'application/json'
        }
    });
    return request.json().catch(output.handleCatch);
};
