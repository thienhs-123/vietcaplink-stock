const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('======================================================================');
console.log('   VIETCAPLINK - KÍCH HOẠT ĐƯỜNG LINK INTERNET (CLOUDFLARE TUNNEL)');
console.log('======================================================================');
console.log('   * Kết nối máy chủ VN100 (cổng 8088) với mạng lưới toàn cầu Cloudflare');
console.log('   * Bảo mật SSL chuẩn HTTPS (Có biểu tượng ổ khóa xanh)');
console.log('   * Hoàn toàn miễn phí, không giới hạn băng thông, không cần tài khoản');
console.log('======================================================================\n');
console.log('⏳ Đang thiết lập đường hầm bảo mật và tạo link công khai...\n');

const cfPath = path.join(__dirname, 'cloudflared.exe');
if (!fs.existsSync(cfPath)) {
  console.error('[LỖI] Không tìm thấy file cloudflared.exe trong thư mục:', __dirname);
  process.exit(1);
}

const cf = spawn(cfPath, ['tunnel', '--url', 'http://127.0.0.1:8088'], {
  windowsHide: false
});

let tunnelUrl = null;

cf.stderr.on('data', (data) => {
  const text = data.toString();
  // Tìm URL dạng https://xxx.trycloudflare.com
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    
    // Ghi link ra file để người dùng dễ copy
    fs.writeFileSync(path.join(__dirname, 'INTERNET_LINK.txt'), tunnelUrl, 'utf8');

    console.log('\n======================================================================');
    console.log('  🎉 ĐƯỜNG LINK INTERNET CỦA BẠN ĐÃ ĐƯỢC KÍCH HOẠT THÀNH CÔNG!');
    console.log('======================================================================');
    console.log('  👉 Link truy cập công khai: \x1b[32m\x1b[1m' + tunnelUrl + '\x1b[0m');
    console.log('  👉 Đã tự động lưu vào file: \x1b[36mINTERNET_LINK.txt\x1b[0m');
    console.log('======================================================================');
    console.log('  * Hãy sao chép link trên gửi cho 10 – 20 người dùng thử nghiệm.');
    console.log('  * Người dùng có thể mở trên mọi thiết bị (iPhone, Android, PC, Mac).');
    console.log('  * Lưu ý: GIỮ CỬA SỔ NÀY MỞ để mọi người có thể truy cập liên tục.');
    console.log('======================================================================\n');

    // Tự động mở trình duyệt đến đường link công khai
    const { exec } = require('child_process');
    exec(`start ${tunnelUrl}`);
  }
});

cf.on('close', (code) => {
  console.log(`\n[THÔNG BÁO] Đường hầm Cloudflare Tunnel đã dừng (Code: ${code}).`);
});

// Xử lý khi người dùng bấm Ctrl + C
process.on('SIGINT', () => {
  console.log('\nĐang đóng đường hầm Cloudflare...');
  cf.kill();
  process.exit(0);
});
