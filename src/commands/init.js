const config = require('../app/config');
const {error, handleCatch} = require('../app/output');
const str = require('../app/str');
const product = require('../app/product');
const commander = require('commander');
const readline = require('readline-sync');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const url = require('url');
const cwd = process.cwd();
const Spinner = require('cli-spinner').Spinner;

async function syncProducts () {
    const currentConfig = config.get();

    const request = await fetch(currentConfig.url + '/api/site/products?forExport=true', {
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
        error('Unable to connect to the API with your credentials.')
    }

    for (const data of products) {
        product.save(data);
    }
    console.log('Ready!');
}

commander.command('init').action(async () => {
    const createDirs = ['/src', '/.se'];
    for (const dir of createDirs) {
        const dirPath = path.join(cwd, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }

    if (!config.exits()) {
        let uniteUrl = readline.question('SocialEngine Unite URL: ');

        if (!uniteUrl) {
            error('Provide a Unite URL.');
        }

        if (uniteUrl.slice(-1) === '/') {
            uniteUrl = uniteUrl.substr(0, uniteUrl.length - 1);
        }
        const parsed = url.parse(uniteUrl);

        uniteUrl = 'https://' + parsed.hostname;

        const response = await fetch(uniteUrl + '/manifest.json');
        const manifest = await response.json().catch(() => false);
        if (!manifest) {
            error('Does not look like its a Unite site.');
        }

        const siteId = response.headers.get('se-id');
        if (!siteId) {
            error('Cannot identify the sites ID.');
        }

        const connectToken = str.random(64);
        const link = uniteUrl + '/acp/devops?connect=' + connectToken;

        console.log('Click/Follow link to connect to DevOps:');
        console.log(link);

        const spinner = new Spinner();
        spinner.setSpinnerString('|/-\\');
        spinner.start();

        let checkIteration = 0;
        const check = setInterval(async () => {
            const response = await fetch(uniteUrl + '/acp/devops/verify?token=' + connectToken);
            const manifest = await response.json().catch(() => false);
            if (manifest.tokens !== null) {
                clearInterval(check);
                const tokens = manifest.tokens;
                const data = {
                    url: uniteUrl,
                    apiKey: tokens.apiKey.publicKey + ':' + tokens.apiKey.privateKey,
                    apiToken: tokens.apiToken.token,
                    hash: tokens.hash,
                    siteId: siteId
                };
                config.save(data);
                spinner.stop();
                await syncProducts();
                process.exit(0);
                return null;
            }
            checkIteration++;
            if (checkIteration > 50) {
                clearInterval(check);
                console.log('Failed to connect...');
                process.exit(1);
            }
        }, 1000);
    } else {
        await syncProducts();
    }
});
