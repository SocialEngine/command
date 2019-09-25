const commander = require('commander');
const readline = require('readline-sync');
const store = require('../app/store');
const fetch = require('node-fetch');
const output = require('../app/output');
const config = require('../app/config');
const fs = require('fs');
const path = require('path');
const url = require('url');

commander.command('store:login').action(async function () {
    const spinner = output.Spinner();
    const email = readline.questionEMail('Email: ');
    const password = readline.question('Password: ', {
        hideEchoBack: true
    });
    spinner.start();
    const xhrToken = await store.getXhrToken();

    if (xhrToken) {
        const authRequest = await fetch(store.getUrl() + '/api/auth', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password,
                xhrToken: true,
                params: {
                    licenseGuid: config.get('licenseGuid')
                }
            }),
            headers: {
                'se-client': 'frontend',
                'se-xhr-token': xhrToken,
                'content-type': 'application/json'
            }
        });
        const authResponse = await authRequest.json();
        spinner.stop();
        if (authResponse.error !== undefined) {
            return output.error(authResponse.error);
        }

        if (!authResponse.user.warehouse.expertGuid) {
            return output.error('Not a developer account.');
        }
        let cookieToken = '';
        for (const cookie of authRequest.headers.raw()['set-cookie']) {
            if (cookie.indexOf(':token') !== -1) {
                cookieToken = cookie;
                break;
            }
        }
        store.saveConfig({
            xhrToken: authResponse.xhrToken,
            cookieToken: cookieToken
        });
        console.log('Login successful!');
    } else {
        spinner.stop();
        output.error('Unable to retrieve XHR token.');
    }
});

commander.command('store:push <product>').action(async function (product) {
    const spinner = output.Spinner();
    spinner.start();
    await store.push(product);
    spinner.stop();
    console.log('Successfully pushed!');
});

commander.command('store:create <product>').action(async function (product) {
    const spinner = output.Spinner();
    spinner.start();
    await store.push(product, true);
    spinner.stop();
    console.log('Successfully created:', product);
});

commander.command('store:set <storeUrl>')
    .description('Set the store URL')
    .action(async function (storeUrl) {
        const spinner = output.Spinner();
        spinner.start();
        const parsed = url.parse(storeUrl);
        const manifest = 'https://' + parsed.hostname + '/manifest.json';
        const request = await fetch(manifest);
        const response = await request.json();
        if (!response.display) {
            output.error('Not a valid Unite site.');
        }
        const siteId = request.headers.raw()['se-id'][0];
        const envPath = path.join(process.cwd(), '/.cache/env');
        let lines = '';
        lines += 'SE_STORE_URL="https://' + parsed.hostname + '"\n';
        lines += 'SE_STORE_ID="' + siteId + '"';
        fs.writeFileSync(envPath, lines);
        spinner.stop();
        console.log('Store location set.');
    });
