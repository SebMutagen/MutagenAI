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
        if self.path == '/api/deepseek':
            self.handle_deepseek_request()
        else:
            self.send_error(404)

    def handle_deepseek_request(self):
        try:
            # Read the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse the JSON data
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Prepare the request to DeepSeek API
            deepseek_url = 'https://api.deepseek.com/v1/chat/completions'
            deepseek_headers = {
                'Content-Type': 'application/json',
                'Authorization': f"Bearer {request_data.get('api_key')}"
            }
            
            # Create the request
            req = urllib.request.Request(deepseek_url, data=post_data, headers=deepseek_headers)
            
            # Make the request to DeepSeek API
            with urllib.request.urlopen(req) as response:
                deepseek_data = response.read()
                
                # Send the response back to the client
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(deepseek_data)
                
        except urllib.error.HTTPError as e:
            # Handle HTTP errors from DeepSeek API
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
        
        # Add CORS headers for all responses
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        
        try:
            with open(self.path[1:], 'rb') as f:
                content = f.read()
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
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            error_html = b'<h1>404 - File Not Found</h1><p>Please make sure you are accessing the correct URL.</p>'
            self.wfile.write(error_html)

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), CORSRequestHandler)
    print("Proxy server running on http://localhost:8080")
    print("Serving Mutagen AI with Claude API proxy...")
    server.serve_forever()
