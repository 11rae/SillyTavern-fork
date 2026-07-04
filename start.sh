#!/usr/bin/env bash

# Make sure pwd is the directory of the script
cd "$(dirname "$0")"

if ! command -v deno &> /dev/null
then
    echo -e "\033[0;31mdeno could not be found in PATH. If the startup fails, please install Deno from https://deno.com/\033[0m"
fi

echo "Installing Deno Modules..."
export NODE_ENV=production
deno install --prod -q

echo "Entering SillyTavern..."
# Since Deno refuses to work when LD_PRELOAD is set and Termux sets LD_PRELOAD for compatibility reasons, we unset it temporarily.
(unset LD_PRELOAD && deno task start:deno $@)
