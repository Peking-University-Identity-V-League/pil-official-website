#!/usr/bin/env python3
"""Loopback-only, component-scoped static release upload service."""
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from receive import DeployError, MAX_ARCHIVE, receive


class LimitedReader:
    def __init__(self, stream, length):
        self.stream, self.remaining = stream, length

    def read(self, size):
        if self.remaining <= 0:
            return b''
        result = self.stream.read(min(size, self.remaining))
        self.remaining -= len(result)
        if not result:
            raise DeployError('incomplete-upload')
        return result


class DeployServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, tokens, root):
        super().__init__(address, Handler)
        self.tokens, self.root = tokens, root
        self.slots = threading.BoundedSemaphore(2)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def reply(self, status, value):
        data = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(data)
        self.close_connection = True

    def do_POST(self):
        component = {'/_deploy/home': 'home', '/_deploy/tactical': 'tactical'}.get(self.path)
        if component is None:
            self.reply(404, {'ok': False, 'error': 'not-found'})
            return
        expected = self.server.tokens.get(component, '')
        supplied = self.headers.get('Authorization', '')
        if len(expected) < 40 or not hmac.compare_digest(supplied.encode(), ('Bearer ' + expected).encode()):
            self.reply(403, {'ok': False, 'error': 'unauthorized'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if self.headers.get('Transfer-Encoding') or length <= 0 or length > MAX_ARCHIVE:
            self.reply(413, {'ok': False, 'error': 'invalid-upload-size'})
            return
        if not self.server.slots.acquire(blocking=False):
            self.reply(503, {'ok': False, 'error': 'deployment-busy'})
            return
        try:
            self.connection.settimeout(30)
            result = receive(component, LimitedReader(self.rfile, length), self.server.root)
            self.reply(200, result)
        except DeployError as error:
            self.reply(422, {'ok': False, 'error': str(error)})
        except Exception:
            self.reply(500, {'ok': False, 'error': 'deployment-failed'})
        finally:
            self.server.slots.release()

    def do_GET(self):
        self.reply(405, {'ok': False, 'error': 'method-not-allowed'})


if __name__ == '__main__':
    tokens = json.loads(Path('/etc/pkuidv/deploy-tokens.json').read_text())
    DeployServer(('127.0.0.1', 18303), tokens, Path('/srv/pkuidv')).serve_forever()
