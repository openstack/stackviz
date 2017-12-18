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

**-f, --stream-file FILE**
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

Output
======
:code:`stackviz-export` outputs the following files to the destination directory.
Note that <source> in the details, raw, and tree logs refer to what stream
source the

**config.json**
    Contains all the basic information about a dataset that the front-end needs.
    There will be one `tempest` entry for every dataset that was generated in
    :code:`stackviz-export`. Each `tempest` entry has general information about
    each run, as well as the locations of the details, raw, and tree JSON files.

**dstat_log.csv**
    This file will only be present if a dstat log was used in the corresponding
    :code:`stackviz-export` run. Has a wide variety of system statistics
    including CPU, memory, and disk utilization. This information is displayed
    on the timeline graph.

**tempest_<source>_<id>_details.json**
    The details log contains timestamp and status information for tests in
    addition to all of the logs associated with the test (e.g. tracebacks).
    These artifacts are displayed in the test details page.

**tempest_<source>_<id>_raw.json**
    Contains nearly all information available about tests:
        - :code:`status`: pass, fail, or skipped
        - :code:`name`: full name of test
        - :code:`tags`: which worker the test was run on
        - :code:`details`: empty, this info is available in the details JSON
        - :code:`duration`: how long the test took, in seconds
        - :code:`timestamps`: timestamps at test begin and test end

    This file is used in the timeline and test details page.

**tempest_<source>_<id>_tree.json**
    Stores test names in a hierarchy for display on the deprecated
    sunburst diagram. Not currently used by any page in Stackviz.
