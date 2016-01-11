========
StackViz
========
A visualization utility to help analyze the performance of DevStack setup and
Tempest executions.

Installation - Frontend
=======================
Installation of the frontend requires Node.js and Gulp. On Ubuntu::

    sudo apt-get install nodejs npm nodejs-legacy
    sudo npm install -g gulp

Then, install the Node modules by running, from the project directory::

    npm install

Installation - Processing
=========================
The data processor is a small Python module located in the same source tree. To
install, run::

    sudo pip install .

Usage - Development
===================
A development server can be run as follows::

    gulp dev

This will open a web browser and reload code automatically as it changes on the
filesystem.

If you have subunit and dstat logs, you can create a config.json to display
your runs::

    stackviz-export -f <path/to/subunit> --dstat <path/to/dstat> app/data/

During :code:`gulp dev`, files written to :code:`app/data/` will be
automatically synchronized with the browser. Note that these files will *not* be
copied to :code:`build/` during :code:`gulp prod`, but you can copy them
manually using :code:`gulp data`.

Usage - Production
==================
The production application can be build using::

    gulp prod

The result will be written to :code:`./build` and should be appropriate for
distribution. Note that all files are not required:

- Directory structure (:code:`js/`, :code:`css/`, :code:`fonts/`,
  :code:`images/`): required.
- Static resources (:code:`fonts/`, :code:`images/`): required.
- Core files (:code:`index.html`, :code:`js/main.js`, :code:`css/main.css`):
  required unless gzipped versions are used.
- Gzipped versions of core files (:code:`*.gz`): not required, but preferred.
  Use instead of plain core files to save on disk usage and bandwidth.
- Source maps (:code:`js/main.js.map`, :code:`js/main.js.map.gz`): only required
  for debugging purposes.

Data should be written to :code:`build/data/` using :code:`stackviz-export` like
above. Note that the static production code generated above is portable, and can
be generated anywhere and copied to another host to be combined with exported
data.

Testing
=======
* Python tests: :code:`tox -epy27`
* JavaScript unit tests: :code:`gulp unit`
* JavaScript E2E tests: :code:`gulp e2e`

Roadmap and Planning
====================
- Planning: https://etherpad.openstack.org/p/stackviz
- Gate integration planning: https://etherpad.openstack.org/p/BKgWlKIjgQ
