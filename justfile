_red := '\033[1;31m'
_cyan := '\033[1;36m'
_green := '\033[1;32m'
_yellow := '\033[1;33m'
_nc := '\033[0m'

default:
    just --list

[group('build')]
build:
    npx quartz build --serve

[group('deploy')]
deploy:
    npx quartz sync