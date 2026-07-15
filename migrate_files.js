const fs = require('fs');
const path = require('path');

const dir = __dirname;
const targetDir = path.join(dir, 'supabase', 'migrations');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Find all relevant files
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql') && (f.startsWith('supabase-schema') || f.startsWith('supabase-migration')));

// Sort them: supabase-schema.sql first, then others.
// Actually, sorting alphabetically usually works, but supabase-schema.sql must definitely be first.
files.sort((a, b) => {
    if (a === 'supabase-schema.sql') return -1;
    if (b === 'supabase-schema.sql') return 1;
    return a.localeCompare(b);
});

// Generate sequential timestamps
// Supabase CLI expects format: YYYYMMDDHHMMSS_name.sql
let baseTime = new Date('2026-07-01T00:00:00Z').getTime();

let count = 0;
for (const file of files) {
    const d = new Date(baseTime + count * 1000); // add 1 second per file
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    
    const timestamp = `${yyyy}${mm}${dd}${hh}${min}${ss}`;
    
    // Clean up the name for the new format
    let cleanName = file.replace('supabase-', '').replace(/-/g, '_');
    const newName = `${timestamp}_${cleanName}`;
    
    const oldPath = path.join(dir, file);
    const newPath = path.join(targetDir, newName);
    
    fs.renameSync(oldPath, newPath);
    console.log(`Moved: ${file} -> supabase/migrations/${newName}`);
    count++;
}

console.log(`Successfully moved and renamed ${count} files.`);
