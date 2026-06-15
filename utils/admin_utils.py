import os
from pathlib import Path

SERVERS_FILE = Path(__file__).parent.parent / "configs" / "premium.conf"

def get_servers_from_file():
    if not SERVERS_FILE.exists():
        return []
    servers = []
    with open(SERVERS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if line and not line.startswith('#'):
            servers.append({"id": i, "name": line[:50] + "..." if len(line) > 50 else line, "full": line})
    return servers

def add_server_to_file(server_link: str):
    SERVERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SERVERS_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{server_link}\n")

def remove_server_from_file(server_id: int):
    if not SERVERS_FILE.exists():
        return
    with open(SERVERS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    new_lines = []
    for i, line in enumerate(lines, 1):
        if i != server_id:
            new_lines.append(line)
    with open(SERVERS_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

def clear_servers_file():
    if SERVERS_FILE.exists():
        SERVERS_FILE.unlink()
