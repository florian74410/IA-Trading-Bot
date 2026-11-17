#!/usr/bin/env python3
"""Verify every source file in BUILD.json and reject extra or unsafe entries."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile

filename = Path(sys.argv[1])
with zipfile.ZipFile(filename) as archive:
    names = archive.namelist()
    if len(names) != len(set(names)):
        raise RuntimeError('Duplicate archive members')
    manifest = json.loads(archive.read('BUILD.json'))
    expected = manifest['files']
    if set(names) != set(expected) | {'BUILD.json'}:
        raise RuntimeError('Source inventory mismatch')
    for name, digest in expected.items():
        p = PurePosixPath(name)
        if p.is_absolute() or '..' in p.parts:
            raise RuntimeError('Unsafe archive path')
        if hashlib.sha256(archive.read(name)).hexdigest() != digest:
            raise RuntimeError('Source hash mismatch: ' + name)
    checksum = hashlib.sha256(filename.read_bytes()).hexdigest()
    recorded = filename.with_suffix(filename.suffix + '.sha256').read_text().split()[0]
    if checksum != recorded:
        raise RuntimeError('Archive checksum mismatch')
print(json.dumps({'version': manifest['version'], 'files_verified': len(expected), 'sha256': checksum, 'deployment': 'NONE'}))
