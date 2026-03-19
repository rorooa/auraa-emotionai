import struct
import json
import sys

def print_nodes(filepath):
    try:
        with open(filepath, 'rb') as f:
            header = f.read(12)
            chunk_len, chunk_type = struct.unpack('<II', f.read(8))
            json_data = f.read(chunk_len)
            gltf = json.loads(json_data.decode('utf-8'))
            names = [node.get('name', '') for node in gltf.get('nodes', [])]
            for name in names:
                if 'arm' in name.lower() or 'shoulder' in name.lower() or 'leg' in name.lower() or 'spine' in name.lower():
                    print(name)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print_nodes('../myapp/public/models/ai_avatar.glb')
