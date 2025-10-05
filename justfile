_red := '\033[1;31m'
_cyan := '\033[1;36m'
_green := '\033[1;32m'
_yellow := '\033[1;33m'
_nc := '\033[0m'

default:
    just --list

# start a local web server
[group('build')]
build:
    npx quartz build --serve

# build, commit and push to GitHub, then triggers GitHub pages deployment
[group('deploy')]
deploy:
    npx quartz sync