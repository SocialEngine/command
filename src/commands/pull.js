const commander = require('commander');
const path = require('path');
const fs = require('fs');
const product = require('../app/product');
const {Spinner} = require('../app/output');

commander.command('pull').action(async () => {
    const spinner = Spinner();
    spinner.start();
    const records = await product.get({
        include: 'files,install',
        notSE: true
    });
    spinner.stop();
    console.log('---');
    for (const record of records) {
        console.log('#', record.id);
        const folder = record.id.split('/')[1];
        const folderPath = path.join(process.cwd(), '/src', folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
        if (record.files !== undefined && Array.isArray(record.files)) {
            for (const file of record.files) {
                const filePath = path.join(folderPath, file.name.replace(record.id, ''));
                const base = path.dirname(filePath);
                if (!fs.existsSync(base)) {
                    fs.mkdirSync(base, {
                        recursive: true
                    });
                }
                if (filePath.indexOf('module:') === -1) {
                    console.log('[local][save]:', filePath.replace(process.cwd(), ''));
                    fs.writeFileSync(filePath, file.source, 'utf-8');
                }
            }
        }

        product.save(record);
    }
});
