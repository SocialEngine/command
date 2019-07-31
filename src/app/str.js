const crypto = require('crypto');

exports.random = function (length = 32, special = false) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if (special) {
        possible += '$*()&%#!+=';
    }
    let isGuid = false;
    for (let i = 0; i < length; i++) {
        if (isGuid && [9, 14, 19, 24].includes(i)) {
            text += '-';
            continue;
        }
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

exports.md5 = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
};
