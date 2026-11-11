// Build the Android debug APK (works from cmd, PowerShell, Git Bash, Linux/macOS) -> dist/FunnyJump-debug.apk
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const win = process.platform === 'win32';
execFileSync(win ? 'gradlew.bat' : './gradlew', ['assembleDebug', '--console=plain'], { cwd: 'android', stdio: 'inherit', shell: win });
fs.copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk', 'dist/FunnyJump-debug.apk');
console.log('✔ dist/FunnyJump-debug.apk');
