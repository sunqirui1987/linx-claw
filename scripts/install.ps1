# LinClaw Installer for Windows
# Usage: irm <url>/install.ps1 | iex
#    or: .\install.ps1 [-Version X.Y.Z] [-FromSource [DIR]] [-Extras "llamacpp,mlx"]
#
# Installs LinClaw into ~/.aicraw with a uv-managed Python environment.
# Users do NOT need Python pre-installed — uv handles everything.
#
# The entire script is wrapped in & { ... } @args so that `irm | iex` works
# correctly (param() is only valid inside a scriptblock/function/file scope).

& {
param(
    [string]$Version = "",
    [switch]$FromSource,
    [string]$SourceDir = "",
    [string]$Extras = "",
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# ── Defaults ──────────────────────────────────────────────────────────────────
$LinClawHome = if ($env:AICRAW_HOME) { $env:AICRAW_HOME } else { Join-Path $HOME ".aicraw" }
$LinClawVenv = Join-Path $LinClawHome "venv"
$LinClawBin = Join-Path $LinClawHome "bin"
$PythonVersion = "3.12"
$LinClawRepo = "https://github.com/sunqirui1987/linx-craw.git"

# ── Colors ────────────────────────────────────────────────────────────────────
function Write-Info { param([string]$Message) Write-Host "[aicraw] " -ForegroundColor Green -NoNewline; Write-Host $Message }
function Write-Warn { param([string]$Message) Write-Host "[aicraw] " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
function Write-Err  { param([string]$Message) Write-Host "[aicraw] " -ForegroundColor Red -NoNewline; Write-Host $Message }
function Stop-WithError { param([string]$Message) Write-Err $Message; exit 1 }

# ── Help ──────────────────────────────────────────────────────────────────────
if ($Help) {
    @"
LinClaw Installer for Windows

Usage: .\install.ps1 [OPTIONS]

Options:
  -Version <VER>        Install a specific version (e.g. 0.0.2)
  -FromSource [DIR]     Install from source. If DIR is given, use that local
                        directory; otherwise clone from GitHub.
  -Extras <EXTRAS>      Comma-separated optional extras to install
                        (e.g. llamacpp, mlx, llamacpp,mlx)
  -Help                 Show this help

Environment:
  AICRAW_HOME           Installation directory (default: ~/.aicraw)
"@
    exit 0
}

Write-Host "[aicraw] " -ForegroundColor Green -NoNewline
Write-Host "Installing LinClaw into " -NoNewline
Write-Host "$LinClawHome" -ForegroundColor White

# ── Execution Policy Check ────────────────────────────────────────────────────
$policy = Get-ExecutionPolicy
if ($policy -eq "Restricted") {
    Write-Info "Execution policy is 'Restricted', setting to RemoteSigned for current user..."
    try {
        Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
        Write-Info "Execution policy updated to RemoteSigned"
    } catch {
        Write-Err "PowerShell execution policy is set to 'Restricted' which prevents script execution."
        Write-Err "Please run the following command and retry:"
        Write-Err ""
        Write-Err "  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
        Write-Err ""
        exit 1
    }
}

# ── Step 1: Ensure uv is available ───────────────────────────────────────────
function Ensure-Uv {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        Write-Info "uv found: $((Get-Command uv).Source)"
        return
    }

    # Check common install locations not yet on PATH
    $candidates = @(
        (Join-Path $HOME ".local\bin\uv.exe"),
        (Join-Path $HOME ".cargo\bin\uv.exe"),
        (Join-Path $env:LOCALAPPDATA "uv\uv.exe")
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            $dir = Split-Path $candidate -Parent
            $env:PATH = "$dir;$env:PATH"
            Write-Info "uv found: $candidate"
            return
        }
    }

    Write-Info "Installing uv..."
    try {
        irm https://astral.sh/uv/install.ps1 | iex
    } catch {
        Stop-WithError "Failed to install uv. Please install it manually: https://docs.astral.sh/uv/"
    }

    # Refresh PATH after uv install
    $uvPaths = @(
        (Join-Path $HOME ".local\bin"),
        (Join-Path $HOME ".cargo\bin"),
        (Join-Path $env:LOCALAPPDATA "uv")
    )
    foreach ($p in $uvPaths) {
        if ((Test-Path $p) -and ($env:PATH -notlike "*$p*")) {
            $env:PATH = "$p;$env:PATH"
        }
    }

    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        Stop-WithError "Failed to install uv. Please install it manually: https://docs.astral.sh/uv/"
    }
    Write-Info "uv installed successfully"
}

Ensure-Uv

# ── Step 2: Create / update virtual environment ──────────────────────────────
if (Test-Path $LinClawVenv) {
    Write-Info "Existing environment found, upgrading..."
} else {
    Write-Info "Creating Python $PythonVersion environment..."
}

uv venv $LinClawVenv --python $PythonVersion --quiet
if ($LASTEXITCODE -ne 0) { Stop-WithError "Failed to create virtual environment" }

$VenvPython = Join-Path $LinClawVenv "Scripts\python.exe"
if (-not (Test-Path $VenvPython)) { Stop-WithError "Failed to create virtual environment" }

$pyVersion = & $VenvPython --version 2>&1
Write-Info "Python environment ready ($pyVersion)"

# ── Step 3: Install LinClaw ────────────────────────────────────────────────────
# Build extras suffix: "" or "[llamacpp,mlx]"
$ExtrasSuffix = ""
if ($Extras) {
    $ExtrasSuffix = "[$Extras]"
}

$script:ConsoleCopied = $false
$script:ConsoleAvailable = $false

function Prepare-Console {
    param([string]$RepoDir)

    $consoleSrc = Join-Path $RepoDir "console\dist"
    $consoleDest = Join-Path $RepoDir "src\aicraw\console"

    # Already populated
    if (Test-Path (Join-Path $consoleDest "index.html")) { $script:ConsoleAvailable = $true; return }

    # Copy pre-built assets if available
    if ((Test-Path $consoleSrc) -and (Test-Path (Join-Path $consoleSrc "index.html"))) {
        Write-Info "Copying console frontend assets..."
        New-Item -ItemType Directory -Path $consoleDest -Force | Out-Null
        Copy-Item -Path "$consoleSrc\*" -Destination $consoleDest -Recurse -Force
        $script:ConsoleCopied = $true
        $script:ConsoleAvailable = $true
        return
    }

    # Try to build if npm is available
    $packageJson = Join-Path $RepoDir "console\package.json"
    if (-not (Test-Path $packageJson)) {
        Write-Warn "Console source not found - the web UI won't be available."
        return
    }

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        if (Get-Command corepack -ErrorAction SilentlyContinue) {
            Write-Info "Enabling pnpm via corepack..."
            corepack enable 2>$null
            corepack prepare pnpm@latest --activate 2>$null
        }
        if (-not (Get-Command pnpm -ErrorAction SilentlyContinue) -and (Get-Command npm -ErrorAction SilentlyContinue)) {
            Write-Info "Installing pnpm..."
            npm install -g pnpm 2>$null
        }
    }
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        Write-Warn "pnpm not found - skipping console frontend build."
        Write-Warn "Install Node.js from https://nodejs.org/ then run: corepack enable; corepack prepare pnpm@latest --activate"
        Write-Warn "or run 'cd console; pnpm install; pnpm run build' manually."
        return
    }

    Write-Info "Building console frontend (pnpm install && pnpm run build)..."
    Push-Location (Join-Path $RepoDir "console")
    try {
        pnpm install
        if ($LASTEXITCODE -ne 0) { Write-Warn "pnpm install failed - the web UI won't be available."; return }
        pnpm run build
        if ($LASTEXITCODE -ne 0) { Write-Warn "pnpm run build failed - the web UI won't be available."; return }
    } finally {
        Pop-Location
    }
    if (Test-Path (Join-Path $consoleSrc "index.html")) {
        New-Item -ItemType Directory -Path $consoleDest -Force | Out-Null
        Copy-Item -Path "$consoleSrc\*" -Destination $consoleDest -Recurse -Force
        $script:ConsoleCopied = $true
        $script:ConsoleAvailable = $true
        Write-Info "Console frontend built successfully"
        return
    }

    Write-Warn "Console build completed but index.html not found - the web UI won't be available."
}

function Cleanup-Console {
    param([string]$RepoDir)
    if ($script:ConsoleCopied) {
        $consoleDest = Join-Path $RepoDir "src\aicraw\console"
        if (Test-Path $consoleDest) {
            Remove-Item -Path "$consoleDest\*" -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

$VenvLinClaw = Join-Path $LinClawVenv "Scripts\aicraw.exe"

if ($FromSource) {
    if ($SourceDir) {
        $SourceDir = (Resolve-Path $SourceDir).Path
        Write-Info "Installing LinClaw from local source: $SourceDir"
        Prepare-Console $SourceDir
        Write-Info "Installing package from source..."
        uv pip install "${SourceDir}${ExtrasSuffix}" --python $VenvPython --prerelease=allow
        if ($LASTEXITCODE -ne 0) { Stop-WithError "Installation from source failed" }
        Cleanup-Console $SourceDir
    } else {
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            Stop-WithError "git is required for -FromSource without a local directory. Please install Git from https://git-scm.com/ or pass a local path: .\install.ps1 -FromSource -SourceDir C:\path\to\LinClaw"
        }
        Write-Info "Installing LinClaw from source (GitHub)..."
        $cloneDir = Join-Path $env:TEMP "aicraw-install-$(Get-Random)"
        try {
            git clone --depth 1 $LinClawRepo $cloneDir
            if ($LASTEXITCODE -ne 0) { Stop-WithError "Failed to clone repository" }
            Prepare-Console $cloneDir
            Write-Info "Installing package from source..."
            uv pip install "${cloneDir}${ExtrasSuffix}" --python $VenvPython --prerelease=allow
            if ($LASTEXITCODE -ne 0) { Stop-WithError "Installation from source failed" }
        } finally {
            if (Test-Path $cloneDir) {
                Remove-Item -Path $cloneDir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
} else {
    $package = "aicraw"
    if ($Version) {
        $package = "aicraw==$Version"
    }

    Write-Info "Installing ${package}${ExtrasSuffix} from PyPI..."
    uv pip install "${package}${ExtrasSuffix}" --python $VenvPython --prerelease=allow --quiet
    if ($LASTEXITCODE -ne 0) { Stop-WithError "Installation failed" }
}

# Verify the CLI entry point exists
if (-not (Test-Path $VenvLinClaw)) { Stop-WithError "Installation failed: aicraw CLI not found in venv" }

Write-Info "LinClaw installed successfully"

# Check console availability (for PyPI installs, check the installed package)
if (-not $script:ConsoleAvailable) {
    $consoleCheck = & $VenvPython -c "import importlib.resources, aicraw; p=importlib.resources.files('aicraw')/'console'/'index.html'; print('yes' if p.is_file() else 'no')" 2>&1
    if ($consoleCheck -eq "yes") { $script:ConsoleAvailable = $true }
}

# ── Step 4: Create wrapper script ────────────────────────────────────────────
New-Item -ItemType Directory -Path $LinClawBin -Force | Out-Null

$wrapperPath = Join-Path $LinClawBin "aicraw.ps1"
$wrapperContent = @'
# LinClaw CLI wrapper — delegates to the uv-managed environment.
$ErrorActionPreference = "Stop"

$LinClawHome = if ($env:AICRAW_HOME) { $env:AICRAW_HOME } else { Join-Path $HOME ".aicraw" }
$RealBin = Join-Path $LinClawHome "venv\Scripts\aicraw.exe"

if (-not (Test-Path $RealBin)) {
    Write-Error "LinClaw environment not found at $LinClawHome\venv"
    Write-Error "Please reinstall: irm <install-url> | iex"
    exit 1
}

& $RealBin @args
'@

Set-Content -Path $wrapperPath -Value $wrapperContent -Encoding UTF8
Write-Info "Wrapper created at $wrapperPath"

# Also create a .cmd wrapper for use from cmd.exe
$cmdWrapperPath = Join-Path $LinClawBin "aicraw.cmd"
$cmdWrapperContent = @"
@echo off
REM LinClaw CLI wrapper — delegates to the uv-managed environment.
set "AICRAW_HOME=%AICRAW_HOME%"
if "%AICRAW_HOME%"=="" set "AICRAW_HOME=%USERPROFILE%\.aicraw"
set "REAL_BIN=%AICRAW_HOME%\venv\Scripts\aicraw.exe"
if not exist "%REAL_BIN%" (
    echo Error: LinClaw environment not found at %AICRAW_HOME%\venv >&2
    echo Please reinstall: irm ^<install-url^> ^| iex >&2
    exit /b 1
)
"%REAL_BIN%" %*
"@

Set-Content -Path $cmdWrapperPath -Value $cmdWrapperContent -Encoding UTF8
Write-Info "CMD wrapper created at $cmdWrapperPath"

# ── Step 5: Update PATH via User Environment Variable ────────────────────────
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentUserPath -notlike "*$LinClawBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$LinClawBin;$currentUserPath", "User")
    $env:PATH = "$LinClawBin;$env:PATH"
    Write-Info "Added $LinClawBin to user PATH"
} else {
    Write-Info "$LinClawBin already in PATH"
}

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "LinClaw installed successfully!" -ForegroundColor Green
Write-Host ""

# Install summary
Write-Host "  Install location:  " -NoNewline; Write-Host "$LinClawHome" -ForegroundColor White
Write-Host "  Python:            " -NoNewline; Write-Host "$pyVersion" -ForegroundColor White
if ($script:ConsoleAvailable) {
    Write-Host "  Console (web UI):  " -NoNewline; Write-Host "available" -ForegroundColor Green
} else {
    Write-Host "  Console (web UI):  " -NoNewline; Write-Host "not available" -ForegroundColor Yellow
    Write-Host "                     Install Node.js and re-run to enable the web UI."
}
Write-Host ""

Write-Host "To get started, open a new terminal and run:"
Write-Host ""
Write-Host "  aicraw app" -ForegroundColor White -NoNewline; Write-Host "        # start LinClaw (configure in browser)"
Write-Host "  aicraw init" -ForegroundColor White -NoNewline; Write-Host "       # optional: interactive setup"
Write-Host ""
Write-Host "To upgrade later, re-run this installer."
Write-Host "To uninstall, run: " -NoNewline
Write-Host "aicraw uninstall" -ForegroundColor White

} @args
