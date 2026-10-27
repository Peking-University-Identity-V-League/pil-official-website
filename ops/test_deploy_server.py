import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from deploy_server import DeployServer
from test_receive import archive


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / 'site'
        self.tokens = {'home': 'h' * 48, 'tactical': 't' * 48}
        self.server = DeployServer(('127.0.0.1', 0), self.tokens, self.root)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temporary.cleanup()

    def request(self, path, token, body):
        client = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        client.request('POST', path, body, {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/gzip'})
        response = client.getresponse()
        result = response.status, json.loads(response.read())
        client.close()
        return result

    def test_component_tokens_are_isolated_and_activate_only_valid_static_releases(self):
        payload = archive().getvalue()
        self.assertEqual(self.request('/_deploy/home', 'wrong', payload)[0], 403)
        self.assertEqual(self.request('/_deploy/home', self.tokens['tactical'], payload)[0], 403)
        self.assertFalse(self.root.exists())
        status, result = self.request('/_deploy/home', self.tokens['home'], payload)
        self.assertEqual(status, 200)
        self.assertTrue(result['ok'])
        self.assertTrue((self.root / 'home/current/index.html').is_file())
        self.assertFalse((self.root / 'tactical').exists())

    def test_an_authenticated_traversal_upload_is_rejected_without_publishing(self):
        status, result = self.request('/_deploy/home', self.tokens['home'], archive(extra=[('../escape.txt', b'bad')]).getvalue())
        self.assertEqual(status, 422)
        self.assertEqual(result['error'], 'invalid-archive-path')
        self.assertFalse((self.root / 'home/current').exists())

    def test_oversized_upload_is_refused_before_waiting_for_its_body(self):
        client = http.client.HTTPConnection(*self.server.server_address, timeout=5)
        client.request('POST', '/_deploy/home', b'', {'Authorization': 'Bearer ' + self.tokens['home'], 'Content-Length': str(25 * 1024 * 1024)})
        response = client.getresponse()
        self.assertEqual(response.status, 413)
        self.assertEqual(json.loads(response.read())['error'], 'invalid-upload-size')
        client.close()
        self.assertFalse(self.root.exists())


if __name__ == '__main__':
    unittest.main()
