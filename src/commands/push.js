const commander = require('commander');
const product = require('../app/product');
const {Spinner} = require('../app/output');

commander.command('push').action(async () => {
    const spinner = Spinner();
    spinner.start();
    const records = await product.get({
        notSE: true
    });
    spinner.stop();
    console.log('---');
    for (const record of records) {
        await product.push(record);
        console.log(' ->', record.id);
    }
});
