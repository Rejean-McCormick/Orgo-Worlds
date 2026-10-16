@echo off
cd /d "%~dp0"
node tools\fakeplant\validate.mjs
if errorlevel 1 goto end
if exist "..\Orgo\tools\scenario-injector\cli.mjs" node tools\world-scenario\cli.mjs validate-all fakeplant --orgo-root ..\Orgo
:end
pause
