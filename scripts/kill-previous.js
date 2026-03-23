const { execSync } = require('child_process');
const isWindows = process.platform === 'win32';

try {
  if (isWindows) {
    execSync('taskkill /F /IM SimpleECommerceStore.API.exe', { stdio: 'ignore' });
  } else {
    execSync('pkill -f "SimpleECommerceStore.API" || true', { stdio: 'ignore' });
  }
} catch {
  // Process not running - ignore
}
