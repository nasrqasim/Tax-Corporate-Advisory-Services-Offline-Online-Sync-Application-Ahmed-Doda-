@echo off
title Tax Customer Management System - Arslan Tax & Corporate Advisory Services
echo ====================================================================
echo   TAX CUSTOMER MANAGEMENT SYSTEM - OFFLINE-FIRST DESKTOP
echo   Pakistani Tax Services ^| CRM ^| Accounts Ledger ^| SQLite
echo ====================================================================
echo.

if not exist node_modules (
  echo Installing dependencies...
  call npm install --prefer-offline
)

echo Building latest production assets...
call npm run build

echo.
echo Launching Tax Customer Management System in Windows Desktop Application mode...
start "" "http://localhost:4173"
call npx vite preview --port 4173 --host
pause
