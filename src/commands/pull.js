const commander = require('commander');
const path = require('path');
const fs = require('fs');
const product = require('../app/product');

commander.command('pull').action(async () => {
    const records = await product.get({
        include: 'files'
    });
    for (const record of records) {
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
                console.log('[file]:', file);
                fs.writeFileSync(filePath, file.source, 'utf-8');
            }
        }
    }
});
