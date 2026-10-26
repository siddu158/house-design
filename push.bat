@echo off
setlocal
title Push HomeHue to GitHub

echo ============================================================
echo   Pushing HomeHue to https://github.com/siddu158/Homedesign
echo ============================================================
echo.

set "PATH=C:\Users\sidde\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;C:\Users\sidde\AppData\Local\Programs\Git Credential Manager;%PATH%"

cd /d "%~dp0"

echo Current remote:
git remote -v
echo.

echo Pushing main branch to origin...
echo (If prompted by GitHub, sign in via your browser or paste your token)
echo.

git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo   Repository: https://github.com/siddu158/Homedesign
    echo ============================================================
) else (
    echo.
    echo [ERROR] Push failed. If authentication was cancelled, please try again
    echo or provide a GitHub Personal Access Token (PAT).
)

echo.
pause
