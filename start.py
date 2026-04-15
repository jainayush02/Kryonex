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
        
    # 3. Server dependencies (Python) with venv and uv
    server_dir = os.path.join(root_dir, "server")
    venv_dir = os.path.join(server_dir, ".venv")
    
    if platform.system() == "Windows":
        venv_python = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        venv_python = os.path.join(venv_dir, "bin", "python")
        
    if not os.path.exists(venv_dir):
        print("Creating Python virtual environment with uv...")
        run_command(f"{sys.executable} -m uv venv .venv", server_dir)
        
    print("Verifying server (Python) dependencies with uv...")
    # Using uv pip install targeting the .venv
    run_command(f"{sys.executable} -m uv pip install --python .venv -r requirements.txt", server_dir)

    print("\nAll dependencies verified. Starting project...")
    print("Frontend: http://localhost:3000")
    print("Backend: http://localhost:5000\n")
    
    # 4. Run the project concurrently
    if platform.system() == "Windows":
        cmd = f'npx concurrently "npm run dev --prefix client" "{venv_python} server/main.py"'
        run_command(cmd, root_dir)
    else:
        cmd = f'npx concurrently "npm run dev --prefix client" "{venv_python} server/main.py"'
        run_command(cmd, root_dir)

if __name__ == "__main__":
    main()
