#!/bin/bash

HR_TOOLS_PATH='/home/colin/git/hr-tool';
echo "Start deployment"
cd $HR_TOOLS_PATH
echo "pulling source code..."
git pull
echo "Finished."
