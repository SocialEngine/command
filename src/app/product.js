const path = require('path');
const fs = require('fs');
const dir = require('./dir');
const str = require('./str');
const obj = require('./obj');

exports.save = function (ordered) {
    const productDir = path.join(process.cwd(), '/.se', ordered.id.replace('@', ''));
    if (!fs.existsSync(productDir)) {
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

    const file = path.join(productDir, '/manifest.json');
    fs.writeFileSync(file, JSON.stringify(obj.without(ordered, [
        'install',
        'phrases'
    ]), null, 4) + '\n', 'utf-8');
};
