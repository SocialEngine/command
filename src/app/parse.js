
const str = require('./str');
const path = require('path');
const babel = require('babel-core');
const uglify = require('uglify-es');
const fs = require('fs');

let modulePath = path.join(process.cwd(), '/node_modules');
if (!fs.existsSync(modulePath)) {
    modulePath = path.join(__dirname, '/../../node_modules');
}

const internals = [
    'react',
    'react-dom',
    'prop-types',
    'path-to-regexp',
    'breeze',
    'validator',
    'open-graph',
    'jquery',
    'moment'
];

const browserList = {
    development: {
        chrome: 60
    },
    production: {
        browsers: ['last 2 versions', 'not ie 10', 'not android 4.4.3']
    }
};

function content (content) {
    let phrases = {};
    const replacer = function (all, $1) {
        const id = str.md5($1);
        phrases[id] = $1.replace('\\\'', '\'');
        return '_t(\'' + id + '\')';
    };
    content = content.replace(/_t\('(.*?)'\)/g, replacer);
    content = content.replace(/_t\(`(.*?)`\)/g, replacer);
    return {
        content: content,
        phrases: phrases
    };
}

exports.js = function js (data, minify = true, name = 'unknown') {
    const parsed = content(data);
    let code = parsed.content;

    const result = babel.transform(code, {
        filename: name,
        presets: [
            [path.join(modulePath, '/babel-preset-env'), {
                targets: browserList.production,
                debug: false
            }]
        ],
        plugins: [
            path.join(modulePath, 'babel-plugin-transform-react-jsx'),
            path.join(modulePath, 'babel-plugin-transform-class-properties'),
            path.join(modulePath, 'babel-plugin-transform-object-rest-spread')
        ]
    });

    let minified = {
        code: ''
    };
    if (minify) {
        minified = uglify.minify(result.code);
    }
    return {
        code: result.code,
        minified: minified.code,
        phrases: parsed.phrases
    };
};

exports.css = async function css (name, content) {
    let css = '';
    let vars = {};
    content = content.replace(/css\(`(.*?)`\)/gs, function (all, data) {
        data = data.replace(/<(?:.|\n)*?>/gm, '');
        css += data.replace(/\${style.([a-zA-Z0-9.]+)}/gs, function (all, varName) {
            vars[varName] = '';
            return 'var(--' + varName + ')';
        });
        data = data.replace(/\n/g, ' ');
        const id = str.md5(data);
        return 'css(\'' + id + '\', \'' + name + '\', `' + data + '`)';
    });
    return {
        content: content,
        css: css,
        cssVars: vars
    };
};

exports.file = async function file (name, content, options = {}) {
    const dependencies = [];
    name = name.replace(/\\/g, '/');
    if (typeof content !== 'string') {
        throw new Error('' + name + ' is not passing a string.');
    }
    let isAdmin = (content.indexOf('@breeze-acp') !== -1);

    if (typeof name !== 'string') {
        throw new Error('name is not a string.');
    }

    const fileExt = path.extname(name).replace('.', '');
    content = content.replace(/import '(.*?)'/g, 'require(\'$1\')');
    content = content.replace(/import ([^{]*?) from '(.*?)'/g, 'const $1 = require(\'$2\')');
    content = content.replace(/export default ([^ ]*)/g, 'module.exports = $1');
    content = content.replace(
        /export (var|let|const) ([a-zA-Z0-9_$]*)/g,
        '$1 $2 = exports.$2'
    );
    content = content.replace(
        /export function ([a-zA-Z0-9_$]*)/g,
        'var $1 = exports.$1 = function'
    );
    content = content.replace(
        /export class ([a-zA-Z0-9_$]*)/g,
        'var $1 = exports.$1 = class'
    );
    content = content.replace(/import {([\s\S]*?)} from '(.*?)'/g, (all, $1, $2) => {
        return $1.split(',')
            .map(part => {
                if (part.indexOf('default as') !== -1) {
                    return 'var ' + part.replace('default as', '') + ' = require(\'' + $2 + '\');';
                }
                return 'var ' + part + ' = require(\'' + $2 + '\').' + part.trim() + ';';
            })
            .join('');
    });

    content = content.replace(/require\('(.*?)'\)/g, (e, file) => {
        file = file.replace('~', '');
        if (file.substr(0, 1) !== '@') {
            if (internals.includes(file)) {
                return '_require(\'' + file + '\')';
            }
            throw new Error('Unknown required component: ' + file);
        }

        if (file.indexOf('.') === -1) {
            file += '.js';
        }

        if (name !== file) {
            let parts = file.split('/');
            let productId = parts[0] + '/' + parts[1];
            if (!dependencies.includes(productId)) {
                dependencies.push(productId);
            }
        }

        return '_require(\'' + file + '\')';
    });

    const parsed = await this.css(name, content);
    let output = parsed.content;
    output = 'function (module, exports) {\n' + output + '\n}';
    output = '\t_createComponent(\'' + name + '\', ' + output + ');\n';

    return {
        info: {
            ext: fileExt,
            dependencies: dependencies,
            name: name,
            isAdmin: isAdmin
        },
        code: output,
        css: parsed.css,
        cssVars: parsed.cssVars
    };
};
