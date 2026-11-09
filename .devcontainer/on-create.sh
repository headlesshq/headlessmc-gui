#!/bin/bash

set -eo pipefail

sudo chown "$(id -u):$(id -g)" "$GRADLE_USER_HOME" src/main/webui/node_modules

sudo apt-get update
sudo apt-get install -y --no-install-recommends build-essential zlib1g-dev

# SDKMAN's curl calls have no connect timeout or retries, so a flaky
# connection to api.sdkman.io makes it hang and then report versions as
# unavailable. Give them both, for this script only.
CURL_HOME=$(mktemp -d)
export CURL_HOME
printf 'connect-timeout = 10\nretry = 5\n' > "$CURL_HOME/.curlrc"

# shellcheck disable=SC1091
. /usr/local/sdkman/bin/sdkman-init.sh

graal=$(sdk list java | grep -oE '25\.0\.[0-9.+]+-graal( |$)' | tr -d ' ' | sort -V | tail -n 1 || true)
if [ -z "$graal" ]; then
  echo "No GraalVM 25.0.x found in 'sdk list java'" >&2
  exit 1
fi

current=$(readlink -f "$SDKMAN_CANDIDATES_DIR/java/current")
echo n | sdk install java "$graal"
if [ "$(readlink -f "$SDKMAN_CANDIDATES_DIR/java/current")" != "$current" ]; then
  ln -sfn "$current" "$SDKMAN_CANDIDATES_DIR/java/current"
fi

sudo ln -sfn "$SDKMAN_CANDIDATES_DIR/java/$graal" /opt/graalvm-25
