
exports.error = function (msg) {
    console.error(msg);
    process.exit(1);
};

exports.handleCatch = function (e) {
    console.error(e);
    return false;
};
