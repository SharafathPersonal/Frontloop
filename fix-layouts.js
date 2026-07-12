const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Wrap table logic
      // Find <table... and its nearest wrapping div. 
      // Instead of complex AST, let's just do a regex replace if it's already inside a generic overflow div or bare
      if (content.includes('<table')) {
         // This regex approach might be brittle, let's just replace the exact wrappers where known or generic ones
         content = content.replace(/<div className="overflow-x-auto">\s*<table/g, '<div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">\n          <table');
         content = content.replace(/<div className="overflow-x-auto">\n\s*<table/g, '<div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">\n          <table');
         // Or just globally replace generic overflow wrappers:
         content = content.replace(/className="overflow-x-auto"/g, 'className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"');
         
         changed = true;
      }
      
      // Fix p-8 paddings
      if (content.includes('p-8')) {
          content = content.replace(/p-8/g, 'p-4 sm:p-6 md:p-8');
          changed = true;
      }
      
      if (changed) {
          fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'app', 'dashboard'));
processDir(path.join(__dirname, 'src', 'app', 'admin'));
console.log('Done');
