========================
Team and repository tags
========================

.. image:: http://governance.openstack.org/badges/stackviz.svg
    :target: http://governance.openstack.org/reference/tags/index.html

.. Change things from this point on

========
StackViz
========
A visualization utility to help analyze the performance of DevStack setup and
Tempest executions. This repository can be cloned and built to use Stackviz
with local run data. Stackviz is currently in the process of being implemented
upstream (see Roadmap and Planning). To use Stackviz with upstream gate runs,
please see the server deployment project at:

    https://github.com/timothyb89/stackviz-deployer

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

Usage
========
Usage - Development
-------------------
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
------------------
The production application can be build using::

    gulp prod

This will automatically build portable html/javascript and python
utilities into ``dist/stackviz-VERSION.tar.gz``.

You should probably install this into a ``virtualenv`` on the target
system::

  virtualenv stackviz
  ./virtualenv/bin/pip install /path/to/stackviz-VERSION.tar.gz
  # to run stackviz export
  ./virtualenv/bin/stackviz-export

Note the required html will be placed in ``virtualenv/share/stackviz-html``
as a data-file (or elsewhere, if installed as a system package; this
may vary on distributions).  This can be moved as required.  Note that
all files in there are not required:

- Directory structure (:code:`js/`, :code:`css/`, :code:`fonts/`,
  :code:`images/`): required.
- Static resources (:code:`fonts/`, :code:`images/`): required.
- Core files (:code:`index.html`, :code:`js/main.js`, :code:`css/main.css`):
  required unless gzipped versions are used.
- Gzipped versions of core files (:code:`*.gz`): not required, but preferred.
  Use instead of plain core files to save on disk usage and bandwidth.
- Source maps (:code:`js/main.js.map`, :code:`js/main.js.map.gz`): only required
  for debugging purposes.

Data should be written to :code:`stackviz-html/data/` using
:code:`stackviz-export` like above.

Testing
=======
* Python tests: :code:`tox -epy27`
* JavaScript unit tests: :code:`gulp unit`
* JavaScript E2E tests: :code:`gulp e2e`

Manuals & Developer Docs
========================
For more detailed information on how Stackviz works, please see the manuals
located at doc/source/man/

Roadmap and Planning
====================
- Planning: https://etherpad.openstack.org/p/stackviz
- Gate integration planning: https://etherpad.openstack.org/p/BKgWlKIjgQ
