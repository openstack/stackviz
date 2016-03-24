Installation
============

Installation - Frontend
-----------------------
Installation of the frontend requires Node.js and Gulp. On Ubuntu::

    sudo apt-get install nodejs npm nodejs-legacy
    sudo npm install -g gulp

Then, install the Node modules by running, from the project directory::

    npm install

Installation - Processing
-------------------------
The data processor is a small Python module located in the same source tree. To
install, run::

    sudo pip install .
