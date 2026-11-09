param (
    [switch]$Silent
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

# 1. Gọi Node script trích xuất lịch sử hội thoại sạch và chuẩn UTF-8
node "$projectRoot\scripts\export_chat.js"

# 2. Chạy Git Add, Commit và Push
Set-Location $projectRoot
git add .
$status = git status --porcelain
if ($status) {
    $nowStr = Get-Date -Format "yyyy-MM-dd HH:mm"
    git commit -m "sync(auto): backup code and full conversation history [$nowStr]"
    git push origin main
} else {
    git push origin main
}

# 3. Hiển thị thông báo hoàn tất
if (-not $Silent -and [Environment]::UserInteractive) {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Đã lưu lịch sử hội thoại và GIT PUSH toàn bộ dự án lên GitHub thành công!`n`nKhi về máy ở nhà, bạn chỉ cần gõ 'git pull' là có thể tiếp tục công việc ngay.",
            "Vietcaplink - Đồng bộ hoàn tất",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
    } catch {}
}
