#!/usr/bin/env node

import { execSync } from 'child_process';

const ports = [3000, 3001, 3002, 3003, 3004, 3005];

console.log('🔍 Finding and killing processes on ports:', ports.join(', '));

for (const port of ports) {
  try {
    const result = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (result) {
      const pids = result.split('\n');
      console.log(`\n📍 Port ${port} is being used by PID(s): ${pids.join(', ')}`);

      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`);
          console.log(`  ✅ Killed process ${pid}`);
        } catch (err) {
          console.log(`  ⚠️  Could not kill process ${pid}:`, err.message);
        }
      }
    } else {
      console.log(`✓ Port ${port} is free`);
    }
  } catch (err) {
    // Port is not in use or lsof failed
    console.log(`✓ Port ${port} is free (or lsof check failed)`);
  }
}

console.log('\n✅ Done! All specified ports have been checked and cleared.');
