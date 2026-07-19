@echo off
pushd %~dp0
set NODE_ENV=production
call deno install --prod -q
deno task start %*
pause
popd
