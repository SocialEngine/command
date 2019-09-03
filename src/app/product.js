const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const dir = require('./dir');
const str = require('./str');
const obj = require('./obj');
const parse = require('./parse');
const config = require('./config');
const {error, handleCatch} = require('./output');

const cwd = process.cwd();

async function push (product) {
    const currentConfig = config.get();
    const sep = path.sep;
    const dirPath = path.join(process.cwd(), '/src/', product.id.replace(product.vendor + '/', ''));
    if (fs.existsSync(dirPath)) {
        const data = {
            files: []
        };
        const files = dir.open(dirPath);
        for (const file of files) {
            const originalFile = fs.readFileSync(file, 'utf-8');
            const relativeFile = product.vendor + '/' + file.split(sep + 'src' + sep)[1];
            const parsed = await parse.file(relativeFile, originalFile);
            const js = parse.js(parsed.code, false, relativeFile);
            data.files.push({
                component: relativeFile,
                source: originalFile,
                sourceParsed: js.code
            });
        }
        const request = await fetch(currentConfig.url + '/api/site/products/' + product.id, {
            method: 'PUT',
            body: JSON.stringify({
                push: data
            }),
            headers: {
                'se-client': 'acp',
                'se-api-key': currentConfig.apiKey,
                'se-viewer-token': currentConfig.apiToken,
                'content-type': 'application/json'
            }
        });
        return request.json().catch(handleCatch);
    }
}

async function get (options = {}) {
    const currentConfig = config.get();
    let query = '';
    let iteration = 0;
    for (const key of Object.keys(options)) {
        iteration++;
        if (iteration !== 1) {
            query += '&';
        }
        let value = options[key];
        if (typeof value === 'boolean') {
            value = (value ? 'true' : 'false');
        }
        query += key + '=' + options[key];
    }

    const request = await fetch(currentConfig.url + '/api/site/products?' + query, {
        headers: {
            'se-client': 'acp',
            'se-api-key': currentConfig.apiKey,
            'se-viewer-token': currentConfig.apiToken
        }
    });
    const products = await request.json().catch(handleCatch);
    if (!Array.isArray(products) && products.error !== undefined) {
        error(products.error);
    }
    if (!products) {
        error('Unable to connect to the API with your credentials.');
    }

    const records = [];
    for (const record of products) {
        if (record.id.substr(0, 4) === '@SE/') {
            continue;
        }
        records.push(record);
    }

    return records;
}

function newFile ({productId, file, body, pushFile = false}) {
    const folder = productId.split('/')[1];
    const absolutePath = path.join(cwd, '/src', folder, file.replace(productId, ''));
    const dirPath = path.dirname(absolutePath);
    const absolutePathTmp = absolutePath + '.tmp';
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }

    if (pushFile) {
        fs.writeFileSync(absolutePathTmp, '---', 'utf-8');
    }
    fs.writeFileSync(absolutePath, body, 'utf-8');
}

function save (ordered) {
    let isNew = false;
    const productDir = path.join(cwd, '/.se', ordered.id.split('/')[1]);
    if (!fs.existsSync(productDir)) {
        isNew = true;
        fs.mkdirSync(productDir, {
            recursive: true
        });
    }

    if (ordered.install !== undefined) {
        const hashRules = {
            menus: ['location', 'href'],
            registrationSteps: ['component'],
            fields: ['group', 'name'],
            routes: ['id'],
            widgetPlacements: ['route', 'location', 'widget'],
            widgets: ['id'],
            settings: ['key'],
            storageTypes: ['id'],
            listeners: ['events'],
            postTypes: ['id'],
            userGroupSettings: ['name'],
            userGroupSettingGroups: ['id'],
            adminNotificationTypes: ['id'],
            privacy: ['name'],
            fieldGroups: ['id'],
            plugins: ['component', 'name']
        };
        let migrationParentPath = path.join(productDir, '/migrations');
        if (fs.existsSync(migrationParentPath)) {
            dir.delete(migrationParentPath);
        }
        fs.mkdirSync(migrationParentPath, {
            recursive: true
        });

        for (let key of Object.keys(ordered.install)) {
            let migrationPath = path.join(migrationParentPath, key);
            if (!fs.existsSync(migrationPath)) {
                fs.mkdirSync(migrationPath, {
                    recursive: true
                });
            }
            if (hashRules[key] !== undefined) {
                for (let item of ordered.install[key]) {
                    const hashId = str.md5(
                        hashRules[key]
                            .map(rule => Array.isArray(item[rule]) ? item[rule].join('-') : item[rule])
                            .join('-')
                    );
                    fs.writeFileSync(path.join(migrationPath, hashId + '.json'), JSON.stringify(
                        item,
                        null,
                        4
                    ));
                }
            } else {
                console.log('Missing key:', key);
            }
        }
    }

    if (ordered.phrases !== undefined && Object.keys(ordered.phrases).length) {
        let phrasesPath = path.join(productDir, '/phrases');
        if (fs.existsSync(phrasesPath)) {
            dir.delete(phrasesPath);
        }

        fs.mkdirSync(phrasesPath, {
            recursive: true
        });
        for (let key of Object.keys(ordered.phrases)) {
            let subKey = key.substr(0, 2);
            let subDir = path.join(phrasesPath, subKey);
            if (!fs.existsSync(subDir)) {
                fs.mkdirSync(subDir, {
                    recursive: true
                });
            }
            fs.writeFileSync(path.join(subDir, key + '.txt'), ordered.phrases[key], 'utf-8');
        }
    }

    if (isNew) {
        const stubDir = path.join(__dirname, '/../../resources/stubs/', ordered.type);
        const productDir = path.join(cwd, '/src/', ordered.id.split('/')[1]);
        if (!fs.existsSync(productDir)) {
            fs.mkdirSync(productDir);
        }

        if (fs.existsSync(stubDir)) {
            const stubFiles = dir.open(stubDir);
            for (let file of stubFiles) {
                const relativePath = file.replace(stubDir, '');
                const baseDir = path.dirname(path.join(productDir, relativePath));
                if (!fs.existsSync(baseDir)) {
                    fs.mkdirSync(baseDir, {
                        recursive: true
                    });
                }
                let content = fs.readFileSync(file, 'utf-8');
                content = content.replace(/{{PRODUCT_ID}}/g, ordered.id);
                fs.writeFileSync(path.join(baseDir, path.basename(relativePath)), content);
            }
        }
    }

    const file = path.join(productDir, '/manifest.json');
    fs.writeFileSync(file, JSON.stringify(obj.without(ordered, [
        'install',
        'phrases'
    ]), null, 4) + '\n', 'utf-8');

    if (ordered.moduleCode !== undefined) {
        saveModuleCode({
            productId: ordered.id,
            code: ordered.moduleCode
        });
    }

    if (ordered.install.listeners !== undefined) {
        for (const listener of ordered.install.listeners) {
            saveEventListener({
                productId: ordered.id,
                id: listener.id,
                code: listener.code
            });
        }
    }
}

function getServerDir (productId) {
    const productDir = path.join(cwd, '/srv', productId.split('/')[1]);
    if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, {
            recursive: true
        });
    }
    return productDir;
}

function saveModuleCode ({productId, code}) {
    const productDir = getServerDir(productId);
    const fileName = path.join(productDir, '/module.js');
    fs.writeFileSync(fileName, code, 'utf-8');
    console.log('[local][save]:', fileName);
}

function saveEventListener ({productId, id, code}) {
    const productDir = getServerDir(productId);
    const name = id + '.js';
    const fileName = path.join(productDir, name);
    console.log('[local][save]:', fileName);
    fs.writeFileSync(fileName, code, 'utf-8');
}

module.exports = {
    newFile: newFile,
    save: save,
    get: get,
    push: push,
    saveModuleCode: saveModuleCode,
    saveEventListener: saveEventListener
};
