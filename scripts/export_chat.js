const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs', 'chat_history');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const brainDir = 'C:\\Users\\ADMIN\\.gemini\\antigravity\\brain';
const conversationId = 'f6e7e92d-c6ed-4fbe-9e74-04897dc40f83';
const transcriptFile = path.join(brainDir, conversationId, '.system_generated', 'logs', 'transcript.jsonl');

if (fs.existsSync(transcriptFile)) {
  const destTranscript = path.join(docsDir, 'transcript.jsonl');
  fs.copyFileSync(transcriptFile, destTranscript);
  console.log('[OK] Co chép thành công transcript.jsonl vào docs/chat_history/');

  const lines = fs.readFileSync(transcriptFile, 'utf-8').trim().split('\n');
  const summary = [
    '# 💬 LỊCH SỬ HỘI THOẠI & YÊU CẦU DỰ ÁN (VIETCAPLINK STOCK)',
    `> Tự động đồng bộ lúc: ${new Date().toLocaleString('vi-VN')}`,
    '',
    '---',
    ''
  ];

  let reqIdx = 1;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content) {
        const match = /<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/.exec(obj.content);
        const reqText = match ? match[1].trim() : obj.content.trim();
        const time = obj.created_at || '';
        summary.push(`### Yêu cầu #${reqIdx} (${time})`);
        summary.push('```markdown');
        summary.push(reqText);
        summary.push('```');
        summary.push('');
        reqIdx++;
      }
    } catch (e) {}
  }

  const summaryFile = path.join(docsDir, 'CONVERSATION_SUMMARY.md');
  fs.writeFileSync(summaryFile, summary.join('\n'), 'utf-8');
  console.log(`[OK] Đã tạo CONVERSATION_SUMMARY.md (${reqIdx - 1} yêu cầu được trích xuất).`);
} else {
  console.log('[WARN] Không tìm thấy transcript.jsonl tại đường dẫn brain.');
}
