const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

// 1. Xuất lịch sử hội thoại sang docs/chat_history/
require('./export_chat.js');

// 2. Git add, commit, push
try {
  process.chdir(projectRoot);
  execSync('git add .', { stdio: 'inherit' });
  const status = execSync('git status --porcelain').toString().trim();
  const dateStr = new Date().toLocaleString('vi-VN');
  
  if (status) {
    console.log('[Git] Đang commit các thay đổi mới...');
    execSync(`git commit -m "sync(auto): backup code and conversation history [${dateStr}]"`, { stdio: 'inherit' });
  }
  
  console.log('[Git] Đang đẩy lên GitHub (origin main)...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('[Git] Push thành công!');
} catch (e) {
  console.error('[Git Error]:', e.message);
}

// 3. Hiển thị thông báo nếu không ở chế độ silent
if (!process.argv.includes('--silent')) {
  try {
    const vbs = `
      Set WshShell = CreateObject("WScript.Shell")
      WshShell.Popup "Đã lưu lịch sử hội thoại và GIT PUSH toàn bộ dự án lên GitHub thành công!" & vbCrLf & vbCrLf & "Khi về máy ở nhà, bạn chỉ cần gõ 'git pull' là có thể tiếp tục công việc ngay.", 0, "Vietcaplink - Đồng bộ hoàn tất", 64
    `;
    const tmpVbs = path.join(__dirname, '_notify.vbs');
    fs.writeFileSync(tmpVbs, vbs, 'utf-8');
    execSync(`cscript //nologo "${tmpVbs}"`);
    fs.unlinkSync(tmpVbs);
  } catch (err) {}
}
