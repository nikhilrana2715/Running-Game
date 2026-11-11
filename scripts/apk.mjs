// Build the Android debug APK (works from cmd, PowerShell, Git Bash, Linux/macOS) -> dist/FunnyJump-debug.apk
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// absolute + quoted path: some shells don't search the cwd, and the project path may contain spaces
const gw = path.resolve('android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
execSync(`"${gw}" assembleDebug --console=plain`, { cwd: 'android', stdio: 'inherit' });
fs.copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'dist/FunnyJump-debug.apk');
console.log('✔ dist/FunnyJump-debug.apk');
