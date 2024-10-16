#!/usr/bin/env bash

mkdir -p lib
pushd lib
curl -L -O https://github.com/cferdinandi/reef/raw/refs/tags/v13.0.5/dist/reef.es.js
curl -L -O https://github.com/sql-js/sql.js/releases/download/v1.11.0/sqljs-worker-wasm.zip
unzip -o sqljs-worker-wasm.zip && rm sqljs-worker-wasm.zip
popd