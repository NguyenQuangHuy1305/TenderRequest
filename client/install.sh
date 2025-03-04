#!/bin/bash
# Windows (Git Bash / MINGW64) / Linux (Ubuntu)

# Set location to script directory
cd "$(dirname "$0")"
echo "Current working directory: `pwd`"

# Check environment dependencies
# Check os
if [ `uname | grep -i mingw | wc -l` -eq 1 ]; then
    # Windows
    if ! command -v npm &> /dev/null
    then
        echo "npm is not installed!"
        exit 1
    fi

else
    # Linux
    if ! command -v npm &> /dev/null
    then
        echo "npm is not installed! Installing!"
        sudo apt update && sudo apt install npm
    fi
fi

if [ `uname | grep -i mingw | wc -l` -eq 1 ]; then
    # Windows
    if ! command -v nodejs &> /dev/null
    then
        echo "nodejs is not installed!"
        exit 1
    fi

else
    # Linux
    if ! command -v nodejs &> /dev/null
    then
        echo "nodejs is not installed! Installing!"
        sudo apt update && sudo apt install nodejs
    fi
fi

# Pull dependencies
npm install

# Show audit
npm audit --omit=dev

# Success
echo "Setup complete!"