# -*- coding: utf-8 -*-

# Copyright 2015 Hewlett-Packard Development Company, L.P.
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

"""
test_stackviz
----------------------------------

Tests for `stackviz` module.
"""

import json
import os.path
import sys  # noqa for monkeypatching below

import fixtures

import stackviz.export as export
from stackviz.parser import tempest_subunit
from stackviz.tests import base


class TestStackviz(base.TestCase):

    def test_export_file(self):
        tmp_fixture = self.useFixture(fixtures.TempDir())
        output_dir = tmp_fixture.path
        subunit_path = os.path.join(os.path.dirname(__file__),
                                    'fixtures', 'tempest.subunit')
        providers = tempest_subunit.get_providers(None, [subunit_path], None)
        export.export_tempest(list(providers.values())[0], output_dir, False)
        output_file = os.path.join(output_dir,
                                   'tempest.subunit-0-details.json')
        j = json.load(open(output_file))
        assert "tempest.api.compute.admin" \
               ".test_agents.AgentsAdminTestJSON.test_create_agent" in j

    def test_export_stdin(self):
        tmp_fixture = self.useFixture(fixtures.TempDir())
        output_dir = tmp_fixture.path
        subunit_path = os.path.join(os.path.dirname(__file__),
                                    'fixtures', 'tempest.subunit')
        subunit_stream = open(subunit_path)
        with fixtures.MonkeyPatch('sys.stdin', subunit_stream):
            providers = tempest_subunit.get_providers(None, None, True)
            export.export_tempest(list(providers.values())[0],
                                  output_dir, False)
        output_file = os.path.join(output_dir, 'stdin-0-details.json')
        j = json.load(open(output_file))
        assert "tempest.api.compute.admin" \
               ".test_agents.AgentsAdminTestJSON.test_create_agent" in j
