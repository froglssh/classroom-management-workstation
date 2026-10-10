#!/bin/zsh
WORKSTATION_LAUNCH_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
exec /usr/bin/env python3 "$WORKSTATION_LAUNCH_DIR/班級工作站啟動器.py"
