const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join(__dirname, 'watcher.log');
function log(msg) {
  const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${msg}\n`;
  try { fs.appendFileSync(logFile, line, 'utf-8'); } catch (e) {}
}

log('Watcher khởi động.');

let wasRunning = false;
const projectRoot = path.resolve(__dirname, '..');
const syncScript = path.join(__dirname, 'sync_and_push.js');

function countAntigravityProcesses() {
  try {
    const stdout = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf-8' });
    const matches = stdout.match(/antigravity\.exe/gi);
    return matches ? matches.length : 0;
  } catch (e) {
    return 0;
  }
}

function promptUserAndSync() {
  log('Phát hiện Antigravity đã đóng hoàn toàn. Đang hiển thị hộp thoại hỏi...');
  try {
    // 4 = Yes/No, 32 = Question icon, 4096 = vbSystemModal (luôn nổi lên trên cùng màn hình)
    const vbsCode = `
      Set WshShell = CreateObject("WScript.Shell")
      answer = MsgBox("Bạn vừa đóng Antigravity." & vbCrLf & vbCrLf & "Bạn có muốn tự động sao lưu LỊCH SỬ HỘI THOẠI và GIT PUSH toàn bộ dự án lên GitHub ngay bây giờ không?", 4 + 32 + 4096, "Vietcaplink - Nhắc nhở đồng bộ GitHub")
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
      log('Người dùng chọn YES. Đang đẩy code & chat lên GitHub...');
      execSync(`node "${syncScript}"`, { stdio: 'inherit' });
      log('Đẩy thành công!');
    } else {
      log('Người dùng chọn NO. Bỏ qua.');
    }
  } catch (e) {
    log('Lỗi hiển thị hộp thoại: ' + e.message);
  }
}

setInterval(() => {
  const count = countAntigravityProcesses();
  if (count > 0) {
    if (!wasRunning) {
      wasRunning = true;
      log(`Phát hiện Antigravity đang chạy (${count} processes).`);
    }
  } else if (wasRunning && count === 0) {
    wasRunning = false;
    promptUserAndSync();
  }
}, 2000);
