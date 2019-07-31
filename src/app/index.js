const output = require('./output');
const config = require('./config');
const str = require('./str');
const product = require('./product');

exports.error = output.error;

exports.handleCatch = output.handleCatch;

exports.config = config;

exports.str = str;

exports.product = product;
