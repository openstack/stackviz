========
StackViz
========
A visualization utility to help analyze the performance of DevStack setup and
Tempest executions. This repository can be cloned and built to use Stackviz
with local run data. Stackviz is currently in the process of being implemented
upstream (see Roadmap and Planning). To use Stackviz with upstream gate runs,
please see the server deployment project at:

    https://github.com/timothyb89/stackviz-deployer

.. include:: ./installation.rst

.. include:: ./usage.rst

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
