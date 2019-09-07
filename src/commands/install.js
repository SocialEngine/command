const commander = require('commander');
const product = require('../app/product');
const output = require('../app/output');

commander.command('install <product>').action(async function (productId) {
    const spinner = output.Spinner();
    spinner.start();
    await product.install(productId);
    spinner.stop();
    console.log('Successfully installed:', productId);
});
