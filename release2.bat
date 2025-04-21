@echo off

set newVersion=%NEW_VERSION%

git add .
git commit -m "released v%newVersion%"
git push gh
git push origin
call npm publish --access public
