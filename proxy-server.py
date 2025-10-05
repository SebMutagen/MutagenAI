#!/usr/bin/env python3
"""
Simple proxy server to handle Claude API calls and avoid CORS issues
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.parse
import urllib.error

class CORSRequestHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/claude':
            self.handle_claude_request()
        else:
            self.send_error(404)

    def handle_claude_request(self):
        try:
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse the JSON data
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Prepare the request to Claude API
            claude_url = 'https://api.anthropic.com/v1/messages'
            claude_headers = {
                'Content-Type': 'application/json',
                'x-api-key': request_data.get('api_key'),
                'anthropic-version': '2023-06-01'
            }
            
            # Create the request
            req = urllib.request.Request(claude_url, data=post_data, headers=claude_headers)
            
            # Make the request to Claude API
            with urllib.request.urlopen(req) as response:
                claude_data = response.read()
                
                # Send the response back to the client
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(claude_data)
                
        except urllib.error.HTTPError as e:
            # Handle HTTP errors from Claude API
            error_data = e.read().decode('utf-8')
            self.send_response(e.code)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_data.encode('utf-8'))
            
        except Exception as e:
            # Handle other errors
            error_response = {
                'error': str(e),
                'type': 'proxy_error'
            }
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_GET(self):
        # Serve static files
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        
        try:
            with open(self.path[1:], 'rb') as f:
                content = f.read()
                self.send_response(200)
                if self.path.endswith('.html'):
                    self.send_header('Content-Type', 'text/html')
                elif self.path.endswith('.css'):
                    self.send_header('Content-Type', 'text/css')
                elif self.path.endswith('.js'):
                    self.send_header('Content-Type', 'application/javascript')
                elif self.path.endswith('.png'):
                    self.send_header('Content-Type', 'image/png')
                else:
                    self.send_header('Content-Type', 'application/octet-stream')
                self.end_headers()
                self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), CORSRequestHandler)
    print("Proxy server running on http://localhost:8080")
    print("Serving Mutagen AI with Claude API proxy...")
    server.serve_forever()
