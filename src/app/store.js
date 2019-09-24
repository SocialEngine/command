const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const output = require('./output');
const dir = require('./dir');
const str = require('./str');
const parse = require('./parse');

const sep = path.sep;
const configFile = path.join(
    process.cwd(),
    '/.cache',
    (process.env['SE_USE_PREFIX'] ? process.env['SE_USE_PREFIX'] + '.' : '') + 'store.json'
);

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

exports.getConfig = function () {
    return require(configFile);
};

exports.saveConfig = function (data) {
    const newData = {
        ...data
    };
    fs.writeFileSync(
        configFile,
        JSON.stringify(newData, null, 4),
        'utf-8'
    );
};

exports.push = async function (productId, isNew = false) {
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
    let manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    const localModuleFile = path.join(process.cwd(), '/srv', name, '/module.js');
    if (fs.existsSync(localModuleFile)) {
        manifest.moduleCode = fs.readFileSync(localModuleFile, 'utf-8');
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 4), 'utf-8');
    }

    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    const data = {};

    data.manifest = manifest;
    data.migrations = {};
    data.source = {};

    if (fs.existsSync(migrationDir)) {
        for (const file of dir.open(migrationDir)) {
            let migration = JSON.parse(fs.readFileSync(
                file, 'utf-8'
            ));
            if (file.indexOf('listeners') !== -1) {
                const fileName = migration.events.map(name => {
                    return name
                        .replace(/:/g, '-')
                        .replace(/\./g, '-');
                }).join('_') + '.js';
                const localFile = path.join(process.cwd(), '/srv', name, fileName);
                if (fs.existsSync(localFile)) {
                    migration.code = fs.readFileSync(localFile, 'utf-8');
                    fs.writeFileSync(file, JSON.stringify(migration, null, 4), 'utf-8');
                }
            }
            migration = JSON.parse(fs.readFileSync(
                file, 'utf-8'
            ));
            data.migrations[file.replace(migrationDir, '')] = migration;
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
    const prefix = isNew ? '' : '/' + manifest.guid;
    return this.request('/warehouse/products' + prefix, {push: data}, isNew ? 'POST' : 'PUT');
};

exports.request = async function (endpoint, data, method = 'POST') {
    const currentConfig = this.getConfig();
    const props = {};
    if (method !== 'GET') {
        props.body = JSON.stringify(data);
    }
    let cookies = '';
    if (currentConfig.cookieToken) {
        const parts = currentConfig.cookieToken.split(';');
        cookies = parts[0].trim();
    }
    const request = await fetch(this.getUrl() + '/api' + endpoint, {
        method: method,
        ...props,
        headers: {
            'se-client': 'frontend',
            'se-xhr-token': currentConfig.xhrToken,
            'content-type': 'application/json',
            cookie: cookies
        }
    });
    const response = await request.json().catch(output.handleCatch);
    if (typeof response === 'object' && !Array.isArray(response) && response.error !== undefined) {
        output.error(response.error);
    }
    return response;
};
