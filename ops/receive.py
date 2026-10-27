#!/usr/bin/env python3
"""Validate and atomically activate one component's static release."""
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import tarfile
import tempfile
import uuid

MAX_ARCHIVE = 24 * 1024 * 1024
MAX_EXPANDED = 64 * 1024 * 1024
MAX_FILE = 10 * 1024 * 1024
MAX_ENTRIES = 3000
EXTENSIONS = {'.html', '.css', '.js', '.json', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2', '.ico', '.txt'}
SHA = re.compile(r'^[a-f0-9]{40}$')


class DeployError(Exception):
    pass


def release_name(component, metadata):
    if component == 'home':
        commit = metadata.get('homepage_commit', '')
        if not isinstance(commit, str) or not SHA.fullmatch(commit):
            raise DeployError('invalid-home-metadata')
        return 'home-' + commit
    if component == 'tactical':
        source, config = metadata.get('source_commit', ''), metadata.get('config_revision', '')
        if any(not isinstance(value, str) or not SHA.fullmatch(value) for value in [source, config]):
            raise DeployError('invalid-tactical-metadata')
        return 'tactical-' + source + '-' + config
    raise DeployError('invalid-component')


def safe_path(name):
    path = PurePosixPath(name)
    if path.is_absolute() or '\\' in name or len(name.encode('utf8')) > 240:
        raise DeployError('invalid-archive-path')
    if len(path.parts) > 12 or any(part == '..' or part.startswith('.') for part in path.parts):
        raise DeployError('invalid-archive-path')
    return path


def atomic_json(path, value):
    temporary = path.parent / ('.metadata-' + uuid.uuid4().hex)
    temporary.write_text(json.dumps(value, sort_keys=True) + '\n')
    temporary.chmod(0o644)
    os.replace(temporary, path)


def tree_manifest(directory):
    result = {}
    for path in directory.rglob('*'):
        if path.is_symlink():
            raise DeployError('invalid-existing-release')
        if path.is_file():
            result[path.relative_to(directory).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def point_symlink(path, target):
    temporary = path.parent / ('.pointer-' + uuid.uuid4().hex)
    temporary.symlink_to(target)
    os.replace(temporary, path)


def receive(component, stream, root=Path('/srv/pkuidv')):
    if component not in {'home', 'tactical'}:
        raise DeployError('invalid-component')
    component_dir = root / component
    releases = component_dir / 'releases'
    releases.mkdir(mode=0o755, parents=True, exist_ok=True)
    if releases.is_symlink() or component_dir.is_symlink():
        raise DeployError('invalid-storage-path')
    with (component_dir / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        staging = Path(tempfile.mkdtemp(prefix='.stage-', dir=releases))
        descriptor, upload_name = tempfile.mkstemp(prefix='.upload-', dir=releases)
        upload = Path(upload_name)
        try:
            compressed = 0
            with os.fdopen(descriptor, 'wb') as target:
                while True:
                    data = stream.read(65536)
                    if not data:
                        break
                    compressed += len(data)
                    if compressed > MAX_ARCHIVE:
                        raise DeployError('archive-too-large')
                    target.write(data)
            manifest, seen = {}, set()
            expanded = entries = 0
            with tarfile.open(upload, 'r:gz') as archive:
                for member in archive:
                    entries += 1
                    if entries > MAX_ENTRIES:
                        raise DeployError('too-many-files')
                    path = safe_path(member.name)
                    if str(path) == '.':
                        if not member.isdir():
                            raise DeployError('invalid-archive-root')
                        continue
                    relative = path.as_posix()
                    if relative in seen:
                        raise DeployError('duplicate-archive-path')
                    seen.add(relative)
                    target = staging.joinpath(*path.parts)
                    if member.isdir():
                        target.mkdir(mode=0o755, parents=True, exist_ok=True)
                        continue
                    if not member.isfile() or member.sparse is not None:
                        raise DeployError('links-and-special-files-forbidden')
                    if path.suffix.lower() not in EXTENSIONS or member.size < 0 or member.size > MAX_FILE:
                        raise DeployError('invalid-static-file')
                    expanded += member.size
                    if expanded > MAX_EXPANDED:
                        raise DeployError('expanded-archive-too-large')
                    target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                    content = archive.extractfile(member)
                    if content is None:
                        raise DeployError('invalid-archive-data')
                    digest, written = hashlib.sha256(), 0
                    with target.open('xb') as output:
                        while True:
                            data = content.read(65536)
                            if not data:
                                break
                            written += len(data)
                            if written > member.size:
                                raise DeployError('invalid-archive-size')
                            digest.update(data)
                            output.write(data)
                    if written != member.size:
                        raise DeployError('invalid-archive-size')
                    target.chmod(0o644)
                    manifest[relative] = digest.hexdigest()
            if 'index.html' not in manifest or '__release.json' not in manifest:
                raise DeployError('missing-entry-files')
            try:
                metadata = json.loads((staging / '__release.json').read_text())
            except (ValueError, UnicodeError):
                raise DeployError('invalid-release-json') from None
            if not isinstance(metadata, dict):
                raise DeployError('invalid-release-json')
            release = release_name(component, metadata)
            index = (staging / 'index.html').read_text()
            if component == 'home' and ('hero-title' not in index or 'homeMapGrid' in index):
                raise DeployError('wrong-home-entry')
            if component == 'tactical' and ('homeMapGrid' not in index or 'js/bootstrap.js' not in manifest):
                raise DeployError('wrong-tactical-entry')
            final = releases / release
            if final.exists():
                if not final.is_dir() or final.is_symlink() or tree_manifest(final) != manifest:
                    raise DeployError('release-content-conflict')
            else:
                staging.chmod(0o755)
                os.replace(staging, final)
            current = component_dir / 'current'
            if current.exists() and not current.is_symlink():
                raise DeployError('invalid-current-pointer')
            previous = current.resolve() if current.is_symlink() else None
            if previous and (previous.parent != releases.resolve() or not previous.is_dir()):
                raise DeployError('invalid-current-pointer')
            if previous and previous != final:
                point_symlink(component_dir / 'previous', previous.relative_to(component_dir))
            point_symlink(current, final.relative_to(component_dir))
            atomic_json(component_dir / 'deployment.json', {'component': component, 'release': release, **metadata})
            valid_release = re.compile(r'^' + component + r'-[a-f0-9]{40}' + (r'-[a-f0-9]{40}' if component == 'tactical' else '') + '$')
            candidates = sorted((p for p in releases.iterdir() if p.is_dir() and not p.is_symlink() and valid_release.fullmatch(p.name)), key=lambda p: p.stat().st_mtime, reverse=True)
            protected = {final, previous}
            for old in candidates[5:]:
                if old not in protected and old.resolve().parent == releases.resolve():
                    shutil.rmtree(old)
            return {'ok': True, 'component': component, 'release': release, 'files': len(manifest), 'no_change': previous == final}
        finally:
            upload.unlink(missing_ok=True)
            if staging.exists():
                shutil.rmtree(staging)


