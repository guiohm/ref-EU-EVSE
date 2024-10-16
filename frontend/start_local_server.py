#!/usr/bin/env python3

import http.server
import os

symlinks = { # source -> destination
    "../output/irve.db": "irve.db",
    "../output/index.html": "index.html",
}

def create_symlinks():
    try:
        # Don't do it if for some reason they exists
        if all([os.path.islink(sym_name) for sym_name in symlinks.values()]):
            return
        if not all([os.path.isfile(file_name) for file_name in symlinks.keys()]):
            print("You should generate the sqlite db and report file first!\n"
                "Try running:\n"
                "python group_opendata_by_station.py --html-report --create-sqlite")
            exit(1)
        for (file_name, sym_name) in symlinks.items():
            os.symlink(file_name, sym_name)
    except Exception as e:
        e.add_note(f"symlinking to here failed!")
        raise e

create_symlinks()
port = 8081
http.server.SimpleHTTPRequestHandler.extensions_map[".wasm"] = "application/wasm"

httpd = http.server.HTTPServer(
    ("localhost", port), http.server.SimpleHTTPRequestHandler
)

sa = httpd.socket.getsockname()
print(f"Listening on {sa[0]} port {port}... You may go to http://localhost:{port}/")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    # cleanup our mess
    [os.remove(sym_name) for sym_name in symlinks.values()]
    # ... and say goodbye because we are very polite :)
    print("\nGoodbye")