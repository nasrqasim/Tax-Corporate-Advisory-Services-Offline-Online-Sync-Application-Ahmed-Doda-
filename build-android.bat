@echo off
title Build Android APK - Tax Customer Management System
echo ====================================================================
echo   BUILDING ANDROID APK - TAX CUSTOMER MANAGEMENT SYSTEM
echo ====================================================================
echo.

echo 1. Building React web application...
call npm run build

echo 2. Syncing assets with Android native platform...
call npx cap sync android

echo 3. Checking Android Gradle Toolchain...
cd android
if exist gradlew.bat (
  echo Building Android Debug APK...
  call gradlew.bat assembleDebug
  echo.
  echo Android APK built successfully at:
  echo android\app\build\outputs\apk\debug\app-debug.apk
) else (
  echo Gradle wrapper not found. Ensure Android SDK / Gradle is installed.
)
cd ..

echo.
echo Done!
pause
