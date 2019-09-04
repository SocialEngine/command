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
                returnToken: true
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
        store.saveConfig({
            token: authResponse.token
        });
        console.log('Login successful!');
    }
});

commander.command('store:push <product>').action(async function (product) {
    await store.push(product);
});
