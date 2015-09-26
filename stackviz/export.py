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
from functools import partial

from stackviz.parser import tempest_subunit

_base = os.path.dirname(os.path.abspath(__file__))
_tempest_count = 0


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


def export_tempest_tree(stream, output_stream):
    converted = tempest_subunit.convert_stream(stream, strip_details=True)
    tree = tempest_subunit.reorganize(converted)
    json.dump(tree, output_stream, default=json_date_handler)
    output_stream.close()


def export_tempest_raw(stream, output_stream):
    converted = tempest_subunit.convert_stream(stream, strip_details=True)
    json.dump(converted, output_stream, default=json_date_handler)
    output_stream.close()


def export_tempest_details(stream, output_stream):
    converted = tempest_subunit.convert_stream(stream, strip_details=True)

    output = {}
    for entry in converted:
        output[entry['name']] = entry['details']

    json.dump(output, output_stream, default=json_date_handler)
    output_stream.close()


def export_tempest(provider, output_dir, dstat, compress):
    global _tempest_count

    ret = []

    for i in range(provider.count):
        path_base = 'tempest_%s_%d' % (provider.name, i)
        if provider.count > 1:
            name = '%s (%d)' % (provider.description, i)
        else:
            name = provider.description

        open_ = partial(open_compressed,
                        output_dir=output_dir,
                        compress=compress)

        stream_raw, path_raw = open_(file_name=path_base + '_raw.json')
        export_tempest_raw(provider.get_stream(i), stream_raw)

        stream_tree, path_tree = open_(file_name=path_base + '_tree.json')
        export_tempest_tree(provider.get_stream(i), stream_tree)

        stream_details, path_details = open_(
            file_name=path_base + '_details.json')
        export_tempest_details(provider.get_stream(i), stream_details)

        entry = {
            'id': _tempest_count,
            'name': name,
            'raw': path_raw,
            'tree': path_tree,
            'details': path_details
        }
        entry.update({'dstat': dstat} if dstat else {})

        ret.append(entry)
        _tempest_count += 1

    return ret


def export_dstat(path, output_dir, compress):
    f = open(path, 'rb')
    out_stream, out_file = open_compressed(
        output_dir,
        'dstat_log.csv',
        compress)

    shutil.copyfileobj(f, out_stream)

    f.close()
    out_stream.close()

    return out_file


def main():
    parser = ArgumentParser(description="Generates JSON data files for a "
                                        "StackViz site.")
    parser.add_argument("path",
                        help="The output directory. Will be created if it "
                             "doesn't already exist.")
    parser.add_argument("-z", "--gzip",
                        help="Enable gzip compression for data files.",
                        action="store_true")
    parser.add_argument("-f", "--stream-file",
                        action="append",
                        help="Include the given direct subunit stream; can be "
                             "used multiple times.")
    parser.add_argument("-r", "--repository",
                        action="append",
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

    dstat = None
    if args.dstat:
        print("Exporting DStat log")
        dstat = export_dstat(args.dstat, args.path, args.gzip)

    providers = tempest_subunit.get_providers(
        args.repository,
        args.stream_file,
        args.stdin)

    tempest_config_entries = []

    for provider in providers.values():
        print("Exporting Tempest provider: %s (%d)" % (provider.description,
                                                       provider.count))
        tempest_config_entries.extend(
            export_tempest(provider, args.path, dstat, args.gzip)
        )

    with open(os.path.join(args.path, 'config.json'), 'w') as f:
        json.dump({
            'tempest': tempest_config_entries
        }, f)


if __name__ == '__main__':
    main()
