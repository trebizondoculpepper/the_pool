#!/bin/sh
# Start the Browser MCP bridge (browsermcp.io), the local MCP server the
# Chrome extension connects to. OpenCode's config points at
# http://127.0.0.1:8765/mcp (see mcp.servers.browsermcp in opencode.json).
# The Chrome extension must be installed and enabled for the browser tools
# to reach this browser. Stop it with Ctrl-C.
set -eu

cd "$(dirname "$0")"
exec npx -y @browsermcp/mcp
