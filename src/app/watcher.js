const config = require('./config');
const path = require('path');
const fs = require('fs');
const parse = require('../app/parse');

function throwError (e) {
    console.log('Caught Error:');
    console.error(e);
}

function serverFiles (socket, event) {
    return async function (file) {
        const ext = file.split('.').pop();
        if (!['js'].includes(ext)) {
            return;
        }
        const relativeFile = file.split('/srv/')[1];
        const productId = relativeFile.split('/')[0];
        const manifestDir = path.join(process.cwd(), '/.se', productId);
        if (!fs.existsSync(manifestDir)) {
            return;
        }
        const manifest = require(path.join(manifestDir, '/manifest.json'));
        const actualFile = relativeFile.replace(productId + '/', '');
        if (!actualFile) {
            return;
        }

        console.log('[' + event + ']:', relativeFile);

        const data = {
            serverFile: actualFile,
            code: fs.readFileSync(file, 'utf-8')
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
}

async function handleFile (socket, event, file) {
    const ext = file.split('.').pop();
    if (!['js', 'html'].includes(ext)) {
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
    const originalFile = fs.readFileSync(file, 'utf-8');
    const newPhrases = {};
    let sourceParsed = null;

    console.log('[' + event + ']:', fileName);

    if (ext === 'js') {
        try {
            const parsed = await parse.file(fileName, originalFile);
            const js = parse.js(parsed.code, false, fileName);
            const phrases = js.phrases;
            for (let phrase of Object.keys(phrases)) {
                const sub = phrase.substr(0, 2);
                const hashPath = path.join(manifestDir, '/phrases', sub, phrase + '.txt');
                if (!fs.existsSync(hashPath)) {
                    console.log('[new][phrase][' + phrase + ']:', phrases[phrase]);
                    newPhrases[phrase] = phrases[phrase];
                    const subDir = path.dirname(hashPath);
                    if (!fs.existsSync(subDir)) {
                        fs.mkdirSync(subDir, {
                            recursive: true
                        });
                    }
                    fs.writeFileSync(hashPath, phrases[phrase], 'utf-8');
                }
            }

            sourceParsed = js.code;
        } catch (e) {
            throwError(e);
            return;
        }
    }

    const data = {
        component: fileName,
        source: originalFile,
        sourceParsed: sourceParsed,
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
}

function srcFiles (socket, event) {
    return function (file) {
        handleFile(socket, event, file)
            .catch(throwError);
    };
}

module.exports = {
    srcFiles: srcFiles,
    serverFiles: serverFiles
};
