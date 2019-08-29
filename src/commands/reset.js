const commander = require('commander');
const readline = require('readline-sync');
const path = require('path');
const fs = require('fs');
const dir = require('../app/dir');

commander.command('reset').action(() => {
    const toDelete = ['/.se', '/src', '/srv', '/.cache/config.json'];
    const answer = readline.question('Are you sure? [y/n]: ');
    if (typeof answer === 'string' && answer === 'y') {
        console.log('Resetting:', toDelete);
        for (const item of toDelete) {
            const absolutePath = path.join(process.cwd(), item);
            if (fs.existsSync(absolutePath)) {
                const stat = fs.statSync(absolutePath);
                if (stat.isDirectory()) {
                    dir.delete(absolutePath);
                    fs.mkdirSync(absolutePath);
                    fs.writeFileSync(path.join(absolutePath, '/.gitkeep'), '', 'utf-8');
                } else {
                    fs.unlinkSync(absolutePath);
                }
            }
        }
    }
});
