@echo off
setlocal
cd /d "%~dp0"

:: ── Node.js check ────────────────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20 or newer from https://nodejs.org, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js 20 or newer with npm included.
  pause
  exit /b 1
)

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)" >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Installed version:
  node --version
  pause
  exit /b 1
)

:: ── MongoDB check ────────────────────────────────────────────────────────
sc query MongoDB >nul 2>nul
if errorlevel 1 (
  where mongod >nul 2>nul
  if errorlevel 1 (
    echo.
    echo MongoDB is not installed or not on PATH.
    echo Install MongoDB Community Edition from https://www.mongodb.com/try/download/community
    echo then run this file again.
    pause
    exit /b 1
  )
  echo Starting mongod in the background...
  start "" /B mongod --dbpath "%USERPROFILE%\data\db" >nul 2>nul
  timeout /t 2 >nul
) else (
  sc start MongoDB >nul 2>nul
)

:: ── Create .env files if missing ─────────────────────────────────────────
if not exist "Backend\.env" (
  copy "Backend\.env.example" "Backend\.env" >nul
  if errorlevel 1 (
    echo Could not create Backend\.env from its example file.
    pause
    exit /b 1
  )
  for /f "delims=" %%S in ('node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"') do set "DEV_JWT_SECRET=%%S"
  node -e "const fs=require('fs');const p='Backend/.env';let s=fs.readFileSync(p,'utf8');s=s.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET=\"'+process.env.DEV_JWT_SECRET+'\"').replace(/^MONGO_URI=.*$/m,'MONGO_URI=mongodb://127.0.0.1:27017/campuscoin');fs.writeFileSync(p,s)"
  if errorlevel 1 (
    echo Could not configure Backend\.env.
    pause
    exit /b 1
  )
  echo Backend\.env created with a local MongoDB URI and a random JWT secret.
)

if not exist "Frontend\.env.local" (
  copy "Frontend\.env.example" "Frontend\.env.local" >nul
  if errorlevel 1 (
    echo Could not create Frontend\.env.local from its example file.
    pause
    exit /b 1
  )
  echo Frontend\.env.local created.
)

:: ── Install dependencies (only when node_modules is absent) ──────────────
if not exist "Backend\node_modules" (
  echo Installing backend dependencies...
  pushd "Backend"
  call npm install
  if errorlevel 1 (
    popd
    echo Backend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

if not exist "Frontend\node_modules" (
  echo Installing frontend dependencies...
  pushd "Frontend"
  call npm install
  if errorlevel 1 (
    popd
    echo Frontend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

:: ── Build frontend if dist is missing or env has changed ────────────────
set "REBUILD_NEEDED=0"
if not exist "Frontend\dist\index.html" set "REBUILD_NEEDED=1"
if exist "Frontend\dist\index.html" (
  for /f %%A in ('powershell -NoProfile -Command "(Get-Item Frontend\.env.local).LastWriteTime -gt (Get-Item Frontend\dist\index.html).LastWriteTime"') do (
    if "%%A"=="True" set "REBUILD_NEEDED=1"
  )
)
if "%REBUILD_NEEDED%"=="1" (
  echo Building frontend with local API URL...
  pushd "Frontend"
  call npm run build
  if errorlevel 1 (
    popd
    echo Frontend build failed.
    pause
    exit /b 1
  )
  popd
  echo Frontend built successfully.
)

:: ── Ensure admin account exists ───────────────────────────────────────────
echo Checking admin account...
pushd "Backend"
node scripts\ensureAdmin.js
if errorlevel 1 (
  popd
  echo Warning: Could not verify/create admin account. The app will still start.
) else (
  popd
)

:: ── Launch both servers ───────────────────────────────────────────────────
echo.
echo  Campus Coin is starting...
echo  Frontend : http://localhost:5173
echo  Backend  : http://localhost:5000
echo  Database : mongodb://127.0.0.1:27017/campuscoin
echo  Admin    : admin@campuscoin.tw7
echo.

start "Campus Coin — Backend" /D "%~dp0Backend" cmd /k "npm run dev"
start "Campus Coin — Frontend" /D "%~dp0Frontend" cmd /k "npm run dev"

endlocal
