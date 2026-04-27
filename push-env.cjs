const fs = require('fs');
const { spawnSync } = require('child_process');

const envFile = fs.readFileSync('.env.local', 'utf8');
const lines = envFile.split('\n');

for (const envName of ['production', 'preview', 'development']) {
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        console.log(`Adding ${key} to ${envName}...`);
        const result = spawnSync('npx.cmd', ['vercel', 'env', 'add', key, envName], {
          input: value,
          encoding: 'utf8',
          shell: true
        });
        if (result.status !== 0) {
            console.error(`Failed: ${result.stderr || result.stdout}`);
        } else {
            console.log(`Success`);
        }
      }
    }
  }
}
console.log("Finished adding environment variables.");
