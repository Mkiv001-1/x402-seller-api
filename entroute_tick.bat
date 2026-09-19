@echo off
REM EntRoute queue driver - submits ONE x402 endpoint per hour (API rate limit is 1/hour/IP).
REM Scheduled by Task Scheduler task "MoneyAgentEntRouteSubmit" (every 60 min).
REM NOTE: do NOT redirect stdout to entroute_submit.log here - the script appends to that
REM same file itself and a shell-held handle makes the append fail with PermissionError.
cd /d "%~dp0"
set PY="C:\Users\admin\AppData\Roaming\uv\python\cpython-3.11-windows-x86_64-none\python.exe"
if not exist %PY% set PY=python
%PY% entroute_submit.py next
exit /b %ERRORLEVEL%
