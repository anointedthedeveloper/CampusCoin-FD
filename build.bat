@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js 20 or newer with npm included.
  pause
  exit /b 1
)

node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
  echo Node.js 20 or newer is required. Current version: 
  node --version
  pause
  exit /b 1
)

if not exist "Backend\.env" (
  copy "Backend\.env.example" "Backend\.env" >nul
  if errorlevel 1 (
    echo Could not create Backend\.env from its example file.
    pause
    exit /b 1
  )
  for /f "delims=" %%S in ('node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))"') do set "DEV_JWT_SECRET=%%S"
  node -e "const fs=require('fs');const p='Backend/.env';let s=fs.readFileSync(p,'utf8');s=s.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+process.env.DEV_JWT_SECRET).replace(/^MONGO_URI=.*$/m,'MONGO_URI=mongodb://127.0.0.1:27017/campuscoin');fs.writeFileSync(p,s)"
  if errorlevel 1 (
    echo Could not configure Backend\.env.
    pause
    exit /b 1
  )
)

if not exist "Frontend\.env.local" (
  copy "Frontend\.env.example" "Frontend\.env.local" >nul
  if errorlevel 1 (
    echo Could not create Frontend\.env.local from its example file.
    pause
    exit /b 1
  )
)

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

echo.
echo Starting Campus Coin. Ensure MongoDB is running locally, or update Backend\.env MONGO_URI to your Atlas connection string.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
start "Campus Coin Backend" /D "%~dp0Backend" cmd /k "npm run dev"
start "Campus Coin Frontend" /D "%~dp0Frontend" cmd /k "npm run dev"

endlocal