const path = require('path');
const fs = require('fs');
const dir = require('./dir');
const str = require('./str');
const obj = require('./obj');

const cwd = process.cwd();

exports.newFile = function ({productId, file, body}) {
    const folder = productId.split('/')[1];
    const absolutePath = path.join(cwd, '/src', folder, file.replace(productId, ''));
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }
    console.log(absolutePath);

    fs.writeFileSync(absolutePath, body, 'utf-8');
};

exports.save = function (ordered) {
    let isNew = false;
    const productDir = path.join(cwd, '/.se', ordered.id.split('/')[1]);
    if (!fs.existsSync(productDir)) {
        isNew = true;
        fs.mkdirSync(productDir, {
            recursive: true
        });
    }

    console.log('productDir', productDir);

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
        console.log('its a theme');
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
};
