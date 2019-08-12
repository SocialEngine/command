const Spinner = require('cli-spinner').Spinner;

exports.error = function (msg) {
    console.error(msg);
    process.exit(1);
};

exports.handleCatch = function (e) {
    console.error(e);
    return false;
};

exports.Spinner = function () {
    const spinner = new Spinner();
    spinner.setSpinnerString('|/-\\');

    return spinner;
};
