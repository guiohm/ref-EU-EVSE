#!/usr/bin/env python3

import http.server
import os

# We need to host from the root because we are going to be requesting files inside of dist
# os.chdir("../")
port = 8081
print("Listening on http://localhost:%d" % port)

http.server.SimpleHTTPRequestHandler.extensions_map[".wasm"] = "application/wasm"

httpd = http.server.HTTPServer(
    ("localhost", port), http.server.SimpleHTTPRequestHandler
)

print(
    'Mapping ".wasm" to "%s"'
    % http.server.SimpleHTTPRequestHandler.extensions_map[".wasm"]
)
httpd.serve_forever()
