"""
scripts/run_dev.py – Concurrently launches FastAPI backend and Next.js frontend.
Gracefully terminates both child processes on Ctrl+C.
Cross-platform (Windows, macOS, Linux).
"""
import os
import sys
import subprocess
import signal
import time

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 65)
    print("🚀 SupplySense Unified Development Server")
    print("   Backend:  http://localhost:8000 (API & Docs: /docs)")
    print("   Frontend: http://localhost:3000")
    print("   Press Ctrl+C to shut down both servers.")
    print("=" * 65)

    env = os.environ.copy()
    env["NEXT_PUBLIC_API_URL"] = "http://localhost:8000/api"
    env["NEXT_PUBLIC_WS_URL"] = "ws://localhost:8000/ws/alerts"

    # Start backend
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)

    # Start frontend (use npm.cmd on Windows)
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir, env=env)

    def shutdown(sig, frame):
        print("\nStopping SupplySense services...")
        try:
            frontend_proc.terminate()
            backend_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("Backend server stopped.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend dev server stopped.")
                break
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == "__main__":
    main()
