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

from __future__ import print_function

import datetime
import gzip
import json
import os
import shutil

from argparse import ArgumentParser

from stackviz.parser import tempest_subunit

_base = os.path.dirname(os.path.abspath(__file__))


def environment_params():
    r = {}

    if 'ZUUL_PROJECT' in os.environ:
        r['change_project'] = os.environ['ZUUL_PROJECT']

    if 'ZUUL_CHANGE' in os.environ:
        r['change_id'] = os.environ['ZUUL_CHANGE']

    if 'ZUUL_PATCHSET' in os.environ:
        r['revision'] = os.environ['ZUUL_PATCHSET']

    if 'ZUUL_PIPELINE' in os.environ:
        r['pipeline'] = os.environ['ZUUL_PIPELINE']

    if 'JOB_NAME' in os.environ:
        r['name'] = os.environ['JOB_NAME']

    return r


def open_compressed(output_dir, file_name, compress):
    if compress:
        file_name += ".gz"
        open_func = gzip.open
    else:
        open_func = open

    return open_func(os.path.join(output_dir, file_name), 'wb'), file_name


def json_date_handler(object):
    if isinstance(object, (datetime.datetime, datetime.date)):
        return object.isoformat()

    return None


def build_artifact(path, artifact_name, artifact_type, content_type, primary,
                   compress):
    ret = {
        'path': path,
        'artifact_name': artifact_name,
        'artifact_type': artifact_type,
        'content_type': content_type,
        'primary': primary
    }

    if compress:
        ret['content_encoding'] = 'gzip'

    return ret


def export_tempest_raw(name, subunit, output_dir, prefix, compress):
    converted = tempest_subunit.convert_stream(subunit, strip_details=True)

    stream, path = open_compressed(output_dir,
                                   prefix + '-raw.json',
                                   compress)
    json.dump(converted, stream, default=json_date_handler)
    stream.close()

    return converted, build_artifact(path, name,
                                     'subunit', 'application/json',
                                     True, compress)


def export_tempest_details(name, subunit, output_dir, prefix, compress):
    converted = tempest_subunit.convert_stream(subunit, strip_details=False)
    output = {}
    for entry in converted:
        output[entry['name']] = entry['details']

    stream, path = open_compressed(output_dir,
                                   prefix + '-details.json',
                                   compress)
    json.dump(output, stream, default=json_date_handler)
    stream.close()

    return build_artifact(path, name,
                          'subunit-details', 'application/json',
                          False, compress)


def export_stats(name, subunit_parsed, output_dir, prefix, compress):
    start = None
    end = None
    total_duration = 0
    failures = []
    skips = []

    for entry in subunit_parsed:
        # find min/max dates
        entry_start, entry_end = entry['timestamps']
        if start is None or entry_start < start:
            start = entry_start

        if end is None or entry_end > end:
            end = entry_end

        total_duration += entry['duration']

        # find details for unsuccessful tests (fail or skip)
        if entry['status'] == 'fail':
            # if available, the error message will be the last non-empty line
            # of the traceback
            msg = None
            if 'traceback' in entry['details']:
                msg = entry['details']['traceback'].strip().splitlines()[-2:]
                if 'Details' not in msg[1]:
                    msg.remove(msg[0])

            failures.append({
                'name': entry['name'],
                'duration': entry['duration'],
                'details': msg
            })
        elif entry['status'] == 'skip':
            skips.append({
                'name': entry['name'],
                'duration': entry['duration'],
                'details': entry['details'].get('reason')
            })

    stream, path = open_compressed(
        output_dir, prefix + '-stats.json', compress)

    json.dump({
        'count': len(subunit_parsed),
        'start': start,
        'end': end,
        'total_duration': total_duration,
        'failures': failures,
        'skips': skips
    }, stream, default=json_date_handler)
    stream.close()

    return build_artifact(path, name,
                          'subunit-stats', 'application/json',
                          False, compress)


def export_tempest(provider, output_dir, compress):
    ret = []

    for i in range(provider.count):
        prefix = '%s-%d' % (provider.name, i)

        # convert and save raw (without details)
        raw, artifact = export_tempest_raw(provider.name,
                                           provider.get_stream(i),
                                           output_dir, prefix, compress)
        ret.append(artifact)

        # convert and save details
        ret.append(export_tempest_details(provider.name,
                                          provider.get_stream(i),
                                          output_dir, prefix, compress))

        # generate and save stats
        ret.append(export_stats(provider.name, raw, output_dir, prefix,
                                compress))

    return ret


def export_dstat(path, output_dir, compress):
    f = open(path, 'rb')
    out_stream, out_file = open_compressed(
        output_dir,
        'dstat.csv',
        compress)

    shutil.copyfileobj(f, out_stream)

    f.close()
    out_stream.close()

    return build_artifact(out_file, os.path.basename(path),
                          'dstat', 'text/csv',
                          False, compress)


def main():
    parser = ArgumentParser(description="Generates JSON data files for a "
                                        "StackViz site.")
    parser.add_argument("path",
                        help="The output directory. Will be created if it "
                             "doesn't already exist.")
    parser.add_argument("-z", "--gzip",
                        help="Enable gzip compression for data files.",
                        action="store_true")
    parser.add_argument("-e", "--env",
                        help="Include Zuul metadata from environment "
                             "variables.",
                        action="store_true")
    parser.add_argument("-f", "--stream-file",
                        action="append",
                        help="Include the given direct subunit stream; can be "
                             "used multiple times.")
    parser.add_argument("-r", "--repository",
                        help="A directory containing a `.testrepository` to "
                             "include; can be used multiple times.")
    parser.add_argument("-i", "--stdin",
                        help="Read a direct subunit stream from standard "
                             "input.",
                        action="store_true")
    parser.add_argument("--dstat",
                        help="The path to the DStat log file (CSV-formatted) "
                             "to include.")

    args = parser.parse_args()

    if not os.path.exists(args.path):
        os.mkdir(args.path)

    artifacts = []
    dataset = {
        'name': None,
        'url': None,
        'status': None,
        'ci_username': None,
        'pipeline': None,
        'change_id': None,
        'revision': None,
        'change_project': None,
        'change_subject': None,
        'artifacts': artifacts
    }

    if args.env:
        dataset.update(environment_params())

    if args.dstat:
        print("Exporting DStat log")
        dstat = export_dstat(args.dstat, args.path, args.gzip)
        artifacts.append(dstat)

    providers = tempest_subunit.get_providers(
        args.repository,
        args.stream_file,
        args.stdin)

    for provider in providers.values():
        print("Exporting Tempest provider: %s (%d)" % (provider.description,
                                                       provider.count))
        artifacts.extend(export_tempest(provider, args.path, args.gzip))

    with open(os.path.join(args.path, 'config.json'), 'w') as f:
        json.dump({
            'deployer': False,
            'datasets': [dataset]
        }, f, default=json_date_handler)


if __name__ == '__main__':
    main()
