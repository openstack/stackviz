===============================================
Python Data-Processing Module (stackviz-export)
===============================================

The main purpose of :code:`stackviz-export` is to parse subunit and dstat logs
in order to generate configuration files for the AngularJS front-end.

Installation
============
Once Stackviz has been cloned into a suitable directory, setting up the module
is as simple as::

    sudo pip install .

Usage
=====

:code:`stackviz-export [options] <DEST>`

Where DEST is the output directory of the module. If DEST does not exist, a new
directory will be created. One of the following input options must be chosen:

  **-f, --streamfile FILE**
      Specifies a subunit stream file to be used with the exporter. This
      argument can be used multiple times to specify additional subunit files.

  **-i, --stdin**
      Instructs stackviz-export to read a subunit stream from stdin.

  **-r, --repository REPOSITORY**
      Specifies a :code:`.testrepository` to read subunit streams from. This
      argument can be used multiple times to specify additional repositories.

Stackviz also visualizes machine utilization statistics using dstat. To attach
a dstat.csv log to the subunit output, specify the following option:

  **--dstat FILE**
      Specifies a csv-formatted dstat log file that corresponds with the
      provided subunit stream file.

Additional options:

  **-h --help**
      Print help message.

  **-z --gzip**
      Enables gzip compression for data files.
