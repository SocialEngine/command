const commander = require('commander');
const readline = require('readline-sync');
const store = require('../app/store');
const fetch = require('node-fetch');
const output = require('../app/output');

commander.command('store:login').action(async function () {
    const email = readline.questionEMail('Email: ');
    const password = readline.question('Password: ', {
        hideEchoBack: true
    });
    const xhrToken = await store.getXhrToken();

    if (xhrToken) {
        const authRequest = await fetch(store.getUrl() + '/api/auth', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password,
                xhrToken: true
            }),
            headers: {
                'se-client': 'frontend',
                'se-xhr-token': xhrToken,
                'content-type': 'application/json'
            }
        });
        const authResponse = await authRequest.json();
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
    }
});

commander.command('store:push <product>').action(async function (product) {
    await store.push(product);
});

commander.command('store:create <product>').action(async function (product) {
    await store.push(product, true);
});
