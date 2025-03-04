#!/bin/bash
# Windows (Git Bash / MINGW64) / Linux (Ubuntu)

# Set location to script directory
cd "$(dirname "$0")"
echo "Current working directory: `pwd`"

# Setup variables
VENV_NAME=".venv"

# Enter venv
if [ `uname | grep -i mingw | wc -l` -eq 1 ]; then
    # Windows
    source "./$VENV_NAME/Scripts/activate" || exit
else
    # Linux
    source "./$VENV_NAME/bin/activate" || exit
fi

# Start web server
fastapi dev main.py