$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$source = Join-Path $repoRoot "scripts\git-hooks\post-commit"
$targetDir = Join-Path $repoRoot ".git\hooks"
$target = Join-Path $targetDir "post-commit"

if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  Write-Error "Git 저장소가 아닙니다: $repoRoot"
  exit 1
}

Copy-Item -Path $source -Destination $target -Force
Write-Output "post-commit 훅이 설치되었습니다. 이제 커밋할 때마다 origin에 자동 push됩니다."
