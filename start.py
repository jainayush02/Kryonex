import os
import subprocess
import sys
import platform

def run_command(command, cwd=None):
    print(f"Running: {command} in {cwd if cwd else 'root'}")
    try:
        shell = platform.system() == "Windows"
        subprocess.run(command, shell=shell, cwd=cwd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        sys.exit(1)

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Install root dependencies if needed
    if not os.path.exists(os.path.join(root_dir, "node_modules")):
        print("Installing root dependencies...")
        run_command("npm install", root_dir)
    
    # 2. Install client dependencies if needed
    client_dir = os.path.join(root_dir, "client")
    if not os.path.exists(os.path.join(client_dir, "node_modules")):
        print("Installing client dependencies...")
        run_command("npm install", client_dir)
        
    # 3. Install server dependencies (Python)
    server_dir = os.path.join(root_dir, "server")
    print("Verifying server (Python) dependencies...")
    run_command(f"{sys.executable} -m pip install -r requirements.txt", server_dir)

    print("\nAll dependencies verified. Starting project...")
    print("Frontend: http://localhost:3000")
    print("Backend: http://localhost:5000\n")
    
    # 4. Run the project concurrently
    # On Windows, we'll use a simple approach to run both
    if platform.system() == "Windows":
        cmd = f'npx concurrently "npm run dev --prefix client" "{sys.executable} server/main.py"'
        run_command(cmd, root_dir)
    else:
        cmd = f'npx concurrently "npm run dev --prefix client" "python3 server/main.py"'
        run_command(cmd, root_dir)

if __name__ == "__main__":
    main()
