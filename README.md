# PivotChart.js


## Installation

To deploy PivotChart.js on a clean Ubuntu 13.04 VM, run the following commands:

```sh
sudo apt-get update
sudo apt-get install build-essential libssl-dev git

# Install node
curl https://raw.githubusercontent.com/creationix/nvm/v0.7.0/install.sh | sh
source ~/.profile
nvm install v0.10.28

# Install bower and grunt
npm install -g bower grunt-cli

# Install pivotchart
git clone git@github.com:scele/pivotchart.git
cd pivotchart
sudo apt-get install imagemagick
npm install
bower install
```
