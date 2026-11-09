const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Vietcaplink] Antigravity Exit Watcher đang chạy ngầm...');

let wasRunning = false;
const projectRoot = path.resolve(__dirname, '..');
const syncScript = path.join(__dirname, 'sync_and_push.js');

function isAntigravityRunning() {
  try {
    const stdout = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf-8' });
    return stdout.toLowerCase().includes('antigravity.exe');
  } catch (e) {
    return false;
  }
}

function promptUserAndSync() {
  try {
    const vbsCode = `
      Set WshShell = CreateObject("WScript.Shell")
      answer = MsgBox("Bạn vừa đóng Antigravity." & vbCrLf & vbCrLf & "Bạn có muốn tự động sao lưu LỊCH SỬ HỘI THOẠI và GIT PUSH toàn bộ dự án lên GitHub ngay bây giờ không?", 4 + 32, "Vietcaplink - Nhắc nhở đồng bộ GitHub")
      If answer = 6 Then
        WScript.Quit(1)
      Else
        WScript.Quit(0)
      End If
    `;
    const tmpVbs = path.join(__dirname, '_prompt.vbs');
    fs.writeFileSync(tmpVbs, vbsCode, 'utf-8');
    
    let shouldSync = false;
    try {
      execSync(`cscript //nologo "${tmpVbs}"`);
    } catch (err) {
      if (err.status === 1) shouldSync = true;
    }
    
    if (fs.existsSync(tmpVbs)) fs.unlinkSync(tmpVbs);

    if (shouldSync) {
      console.log('[Watcher] Người dùng chọn YES. Đang thực thi đồng bộ & push...');
      execSync(`node "${syncScript}"`, { stdio: 'inherit' });
    } else {
      console.log('[Watcher] Người dùng chọn NO. Bỏ qua đồng bộ.');
    }
  } catch (e) {
    console.error('[Watcher Prompt Error]:', e.message);
  }
}

setInterval(() => {
  const isRunning = isAntigravityRunning();
  if (isRunning) {
    wasRunning = true;
  } else if (wasRunning && !isRunning) {
    wasRunning = false;
    promptUserAndSync();
  }
}, 2500);
