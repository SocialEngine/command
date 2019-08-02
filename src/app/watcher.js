const config = require('./config');
const path = require('path');
const fs = require('fs');
const parse = require('../app/parse');

module.exports = function (socket, event) {
    return async function (file) {
        const ext = file.split('.').pop();
        if (!['js'].includes(ext)) {
            return;
        }

        if (event === 'unlink') {
            return;
        }

        const relativeFile = file.split('/src/')[1];
        const productId = relativeFile.split('/')[0];
        const manifestDir = path.join(process.cwd(), '/.se', productId);
        if (!fs.existsSync(manifestDir)) {
            return;
        }
        const manifest = require(path.join(manifestDir, '/manifest.json'));
        const fileName = manifest.id + relativeFile.replace(productId, '');
        console.log('[' + event + ']:', fileName);

        const originalFile = fs.readFileSync(file, 'utf-8');
        const parsed = await parse.file(fileName, originalFile);
        const js = parse.js(parsed.code, false, fileName);
        let newPhrases = {};
        const phrases = js.phrases;
        for (let phrase of Object.keys(phrases)) {
            const sub = phrase.substr(0, 2);
            const hashPath = path.join(manifestDir, '/phrases', sub, phrase + '.txt');
            if (!fs.existsSync(hashPath)) {
                console.log('[new][phrase][' + phrase + ']:', phrases[phrase]);
                newPhrases[phrase] = phrases[phrase];
                const subDir = path.dirname(hashPath);
                if (!fs.existsSync(subDir)) {
                    fs.mkdirSync(subDir);
                }
                fs.writeFileSync(hashPath, phrases[phrase], 'utf-8');
            }
        }

        const data = {
            component: fileName,
            source: originalFile,
            sourceParsed: js.code,
            phrases: newPhrases
        };
        socket.emit('devops', {
            file: {
                event: event,
                ...data
            },
            manifest: {
                id: manifest.id
            },
            config: config.get()
        });
    };
};
