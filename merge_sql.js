const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql') && f !== 'MASTER-SUPABASE-FULL-BUILD.sql');

// Sort files to put base schema first, then migrations, etc. if needed
// Actually, sorting alphabetically usually works, but supabase-schema.sql should ideally be first.
files.sort((a, b) => {
    if (a === 'supabase-schema.sql') return -1;
    if (b === 'supabase-schema.sql') return 1;
    return a.localeCompare(b);
});

let output = '';
for (const file of files) {
    output += `-- ==============================================================================\n`;
    output += `-- FILE: ${file}\n`;
    output += `-- ==============================================================================\n\n`;
    output += fs.readFileSync(path.join(dir, file), 'utf8');
    output += '\n\n';
}

fs.writeFileSync(path.join(dir, 'MASTER-SUPABASE-FULL-BUILD.sql'), output);
console.log('Successfully generated MASTER-SUPABASE-FULL-BUILD.sql with ' + files.length + ' files.');
