.PHONY: serve test visual-test verify-render clean-cache debug-render auto-test

# Core development server
serve:
	@python3 -m http.server 8000 --bind localhost || python -m SimpleHTTPServer 8000

# Visual testing infrastructure
visual-test:
	@open http://localhost:8000/visual_test.html || xdg-open http://localhost:8000/visual_test.html

# Render verification
verify-render:
	@open http://localhost:8000/render_verify.html

# Cache management
clean-cache:
	@echo "Browser cache clear: Ctrl+Shift+R (Win) or Cmd+Shift+R (Mac)"

# Debug render pipeline
debug-render:
	@open http://localhost:8000/debug_render.html

# Automated test suite
auto-test:
	@node test_runner.js || python test_runner.py 

# Force start server (kills existing server first)
force-serve:
	@echo "Stopping any existing servers..."
	@pkill -f "python.*http.server" || true
	@sleep 1
	@echo "Starting wabbazzar development server on http://localhost:8000"
	@echo "For mobile device testing, use your local IP address"
	@python3 -m http.server 8000