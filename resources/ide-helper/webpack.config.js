
const fs = require('fs');
const path = require('path');

const componentDir = path.join(__dirname, '/components');
const alias = {};

for (const dir of fs.readdirSync(componentDir)) {
    alias['@SE/' + dir] = path.join(componentDir, dir);
}

module.exports = {
    resolve: {
        alias: alias
    }
};
