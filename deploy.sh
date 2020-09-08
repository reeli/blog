#!/bin/bash

npm run docs:build

npm install --global surge
surge --project ./docs/.vuepress/dist --domain reeli.surge.sh
