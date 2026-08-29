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
# re-export a .drawio to PNG + theme-correct SVG (draw.io inverts dark-authored diagrams; the script un-inverts them)
[group('build')]
diagram FILE:
    drawio -x -f png --width 2000 -b 0 -o "{{without_extension(FILE)}}.png" "{{FILE}}"
    drawio -x -f svg -o "{{without_extension(FILE)}}.svg" "{{FILE}}"
    python3 scripts/fix-drawio-svg.py "{{without_extension(FILE)}}.svg"
