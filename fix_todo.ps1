# Fix todo.js by removing problematic duplicate lines
$content = Get-Content "todo.js" -Raw
# Remove the corrupted section with regex
$fixed = $content -replace '(?s)console\.log\([''"][^''"]*(Showing custom iOS|�)[^''"]*[''"][)];\s*console\.log[^;]*;\s*window\.oneSignalEnabled = false;\s*}\s*\}\);\s*\}\);\s*(?=\s*return true;)', ''
$fixed | Set-Content "todo.js" -NoNewline
Write-Host "Fixed todo.js"