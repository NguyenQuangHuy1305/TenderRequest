#!/bin/bash
# Windows (Git Bash / MINGW64) / Linux (Ubuntu)

# Set location to script directory
cd "$(dirname "$0")"
echo "Current working directory: `pwd`"

# Check environment dependencies
# Check os
if [ `uname | grep -i mingw | wc -l` -eq 1 ]; then
    # Windows
    if ! command -v python &> /dev/null
    then
        echo "python is not installed! Please install it from https://www.python.org/downloads/"
        exit 1
    fi

else
    # Linux
    if ! command -v python &> /dev/null
    then
        echo "python is not installed! Installing!"
        sudo apt update && sudo apt install python3 python-is-python3
    fi
fi

# Setup variables
VENV_NAME=".venv"

# Setup the virtual environment
if [ -d "${1:-"$VENV_NAME"}" ]; then
    echo "Virtual environment '${1:-"$VENV_NAME"}' already exists"
else
    echo "Creating virtual environment $VENV_NAME"
    python -m venv "$VENV_NAME" || exit
fi

# Enter venv
if [ `uname | grep -i mingw | wc -l` -eq 1 ]; then
    # Windows
    source "./$VENV_NAME/Scripts/activate" || exit
else
    # Linux
    source "./$VENV_NAME/bin/activate" || exit
fi

# Update pip
python -m pip install -U pip || exit

# Pull dependencies
python -m pip install python-dotenv
python -m pip install "fastapi[standard]" python-multipart
python -m pip install langchain langchain-core langchain-community
python -m pip install openai langchain-openai
python -m pip install azure-storage-blob azure-search-documents azure-identity

# Success
echo "Setup complete!"