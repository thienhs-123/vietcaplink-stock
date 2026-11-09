Set WshShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "node """ & scriptDir & "\scripts\antigravity_watcher.js""", 0, False
