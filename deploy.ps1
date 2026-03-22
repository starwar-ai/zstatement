<#
.SYNOPSIS
    Deploy zstatement to Ubuntu server.
.DESCRIPTION
    Builds the React client, uploads all necessary files via SCP,
    and runs the remote deployment script on the server.
.PARAMETER Key
    Path to SSH private key file (e.g. "~/.ssh/id_rsa" or "C:\keys\server.pem").
    Omit if using default SSH key or password auth.
.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -Key "C:\keys\ubuntu.pem"
#>
param(
    [string]$Server = "110.40.190.51",
    [string]$User   = "ubuntu",
    [string]$Remote = "/home/ubuntu/zstatement",
    [string]$Key    = ""
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# ── Helpers ──────────────────────────────────────────────────────────────────

function Build-SshArgs {
    $a = @("-o", "StrictHostKeyChecking=accept-new", "-o", "BatchMode=yes")
    if ($Key) { $a += "-i", $Key }
    return $a
}

function Invoke-Ssh([string]$Cmd) {
    $a = (Build-SshArgs) + @("${User}@${Server}", $Cmd)
    & ssh @a
    if ($LASTEXITCODE -ne 0) { throw "SSH failed (exit $LASTEXITCODE): $Cmd" }
}

function Invoke-Scp([string]$Src, [string]$Dest, [switch]$Recurse) {
    $a = Build-SshArgs
    if ($Recurse) { $a += "-r" }
    $a += $Src, "${User}@${Server}:${Dest}"
    & scp @a
    if ($LASTEXITCODE -ne 0) { throw "SCP failed: $Src -> $Dest" }
}

function Write-Step([string]$Msg) {
    Write-Host "`n$Msg" -ForegroundColor Cyan
}

# ── Step 1: Build Client ──────────────────────────────────────────────────────

Write-Step "[1/4] Building React client..."
Push-Location "$Root\client"
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
} finally {
    Pop-Location
}

# ── Step 2: Prepare Remote Directories ───────────────────────────────────────

Write-Step "[2/4] Preparing remote directories..."
Invoke-Ssh "mkdir -p $Remote/server/prisma/migrations $Remote/client/dist $Remote/deploy"

# ── Step 3: Upload Files ──────────────────────────────────────────────────────

Write-Step "[3/4] Uploading files to server..."

# Server application
Invoke-Scp -Recurse "$Root\server\src"                      "$Remote/server/"
Invoke-Scp          "$Root\server\package.json"             "$Remote/server/"
Invoke-Scp          "$Root\server\package-lock.json"        "$Remote/server/"
Invoke-Scp          "$Root\server\ecosystem.config.cjs"     "$Remote/server/"

# Prisma schema + migrations (skip dev.db — keep production database intact)
Invoke-Scp          "$Root\server\prisma\schema.prisma"     "$Remote/server/prisma/"
Invoke-Scp -Recurse "$Root\server\prisma\migrations"        "$Remote/server/prisma/"

# Client build output
Invoke-Scp -Recurse "$Root\client\dist"                     "$Remote/client/"

# Remote deploy script
Invoke-Scp          "$Root\deploy\remote.sh"                "$Remote/deploy/"

# ── Step 4: Remote Deployment ─────────────────────────────────────────────────

Write-Step "[4/4] Running remote deployment script..."
Invoke-Ssh "chmod +x $Remote/deploy/remote.sh && bash $Remote/deploy/remote.sh"

# ── Done ──────────────────────────────────────────────────────────────────────

Write-Host "`n✔  Deployment successful!" -ForegroundColor Green
Write-Host "   App: http://$Server" -ForegroundColor Green
