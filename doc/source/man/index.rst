
Welcome to Stackviz's Manuals!
========================================================

In this directory, you will find detailed documentation describing Stackviz
components and how they work together.

Stackviz is broken up into two distinct components: a Python processing module
(stackviz/stackviz) and an AngularJS front-end (stackviz/app). Stackviz also
uses Gulp to manage various tasks including building sites and running tests.
For information on each of these components, see their corresponding RST entry.
Below is a listing of each major subdirectory in Stackviz.

Directories:
------------
- :code:`./app/`: AngularJS front-end.
- :code:`./doc/`: Stackviz's documentation.
- :code:`./gulp/`: Gulp used for task management.
- :code:`./stackviz/`: Python processing module.
- :code:`./test/`:  Unit and e2e tests.

Documentation for the Python processing module and AngularJS front-end:

.. toctree::
   :maxdepth: 1

   stackviz-export
   stackviz-front
