#!/bin/bash

# Usage: ./get_version.sh [path_to_go_file] [constant_name]
# Example: ./get_version.sh main.go VERSION

GO_FILE="main.go"
CONSTANT_NAME="version"

if [ ! -f "$GO_FILE" ]; then
    echo "Error: File '$GO_FILE' not found"
    exit 1
fi

# Using grep with regex to find the version constant
# This pattern looks for const NAME = "version" or const NAME string = "version"
VERSION=$(grep -E "const\s+${CONSTANT_NAME}\s+(string)?\s*=\s*\"[^\"]+\"" "$GO_FILE" | sed -E "s/.*\"([^\"]+)\".*/\1/")

if [ -z "$VERSION" ]; then
    echo "Error: Could not find constant '$CONSTANT_NAME' in $GO_FILE"
    exit 1
else
    echo "Building nctsa-backend:$VERSION"
    docker build -t docker.prorickey.xyz/prorickey/nctsa-backend:$VERSION .
    docker push docker.prorickey.xyz/prorickey/nctsa-backend:$VERSION
fi

# Wait for user input before exiting
echo -e "\nBuild finish. Press enter to exit..."
read