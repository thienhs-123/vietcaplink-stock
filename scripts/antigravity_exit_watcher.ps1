# Script: antigravity_exit_watcher.ps1
# Mục đích: Giám sát Antigravity, khi tắt sẽ hiển thị hộp thoại hỏi Git Push kèm lịch sử hội thoại

Add-Type -AssemblyName System.Windows.Forms

$scriptDir = $PSScriptRoot
$exportScript = Join-Path $scriptDir "export_chat_and_push.ps1"

Write-Host "🟢 Trình giám sát Antigravity đang chạy ngầm..." -ForegroundColor Green

$wasRunning = $false

while ($true) {
    Start-Sleep -Seconds 2
    $procs = Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue
    $isRunning = ($procs -ne $null -and $procs.Count -gt 0)

    if ($isRunning) {
        $wasRunning = $true
    } elseif ($wasRunning -and -not $isRunning) {
        # Antigravity vừa được đóng lại!
        $wasRunning = $false

        $msg = "Bạn vừa đóng Antigravity.`n`nBạn có muốn tự động lưu LỊCH SỬ HỘI THOẠI và GIT PUSH toàn bộ dự án lên GitHub ngay bây giờ để về nhà làm tiếp không?"
        $title = "Vietcaplink - Nhắc nhở đồng bộ GitHub"
        
        $result = [System.Windows.Forms.MessageBox]::Show(
            $msg,
            $title,
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Question,
            [System.Windows.Forms.MessageBoxDefaultButton]::Button1
        )

        if ($result -eq [System.Windows.Forms.DialogResult]::Yes) {
            # Thực thi đồng bộ & đẩy code
            powershell.exe -ExecutionPolicy Bypass -File "$exportScript"
        }
    }
}
