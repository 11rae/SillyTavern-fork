#!/usr/bin/env bash

# Make sure pwd is the directory of the script
cd "$(dirname "$0")"

if ! command -v npm &> /dev/null
then
    echo -e "\033[0;31mnpm could not be found in PATH. If the startup fails, please install Node.js from https://nodejs.org/\033[0m"
fi

if ! command -v pnpm &> /dev/null
then
    echo -e "\033[0;31mpnpm could not be found in PATH. If the startup fails, please install pnpm from https://pnpm.io\033[0m"
fi

echo "Installing Node Modules..."
export NODE_ENV=production
# Termux workaround: if p/npm isn't fooled by PRoot, force os = linux
if [ -e /system/bin/linker64 ]; then
    export pnpm_config_supported_architectures='{"os":["linux"]}'
    export npm_config_os=linux
fi
pnpm install --prod --loglevel=error || \
npm install --no-save --no-audit --no-fund --loglevel=error --no-progress --omit=dev --ignore-scripts

echo "Entering SillyTavern..."
node "server.js" "$@"
