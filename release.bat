@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Please provide the new version as an argument.
    exit /b 1
)

set newVersion=%~1
set tempFile=pack_temp.json

(for /f "usebackq delims=" %%A in ("package.json") do (
    set line=%%A
    echo !line! | findstr /r "\"version\":.*" >nul
    if !errorlevel! == 0 (
        echo   "version": "!newVersion!", >> "!tempFile!"
    ) else (
        echo !line! >> "!tempFile!"
    )
)) || exit /b 1

move /y "!tempFile!" package.json >nul
git add .
git commit -m "released v%newVersion%"
git push gh
git push origin
call npm publish --access public
if errorlevel 1 (
    echo npm publish
    exit /b 1
)
