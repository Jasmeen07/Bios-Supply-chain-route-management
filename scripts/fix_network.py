import json
import os

# 1. Fix build_network.py
path_script = 'scripts/build_network.py'
if os.path.exists(path_script):
    with open(path_script, 'r', encoding='utf-8') as f:
        content = f.read()
    old_line = 'coords = f"{ba[\'lng\']},{ba[\'lat\']};{la[\'lng\']},{la[\'lat\']}"'
    new_line = 'coords = f"{la[\'lng\']},{la[\'lat\']};{ba[\'lng\']},{ba[\'lat\']}"'
    if old_line in content:
        content = content.replace(old_line, new_line)
        with open(path_script, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Updated scripts/build_network.py")

# 2. Fix network.json in both locations
for net_path in ['backend/data/network.json', 'backend_files_to_push/backend/data/network.json']:
    if not os.path.exists(net_path):
        continue
    with open(net_path, 'r', encoding='utf-8') as f:
        net = json.load(f)
    locs = {l['id']: l for l in net['locations']}
    
    # Reverse backwards coordinates
    reversed_count = 0
    for lane in net['lanes']:
        a, b = lane['from_id'], lane['to_id']
        coords = lane['geometry']['coordinates']
        first_pt = coords[0]
        dist_to_a = (first_pt[0] - locs[a]['lng'])**2 + (first_pt[1] - locs[a]['lat'])**2
        dist_to_b = (first_pt[0] - locs[b]['lng'])**2 + (first_pt[1] - locs[b]['lat'])**2
        if dist_to_b < dist_to_a:
            lane['geometry']['coordinates'] = list(reversed(coords))
            reversed_count += 1
    
    existing_lane_ids = {l['id'] for l in net['lanes']}
    
    # Pune-Mumbai Expressway
    pune_mumbai_coords = [
        [73.8567, 18.5204], # Pune
        [73.6800, 18.7300], # Talegaon
        [73.4077, 18.7537], # Lonavala / Khandala
        [73.2800, 18.8300], # Khalapur
        [73.1175, 18.9894], # Panvel
        [73.0297, 19.0330], # Navi Mumbai
        [72.8777, 19.0760]  # Mumbai
    ]
    
    if 'L_pune_mumbai' not in existing_lane_ids:
        net['lanes'].append({
            'id': 'L_pune_mumbai',
            'from_id': 'pune',
            'to_id': 'mumbai',
            'distance_km': 149.0,
            'baseline_duration_s': 10080.0,
            'cost': 2288.0,
            'geometry': {'type': 'LineString', 'coordinates': pune_mumbai_coords},
            'approximate': False
        })
        
    if 'L_mumbai_pune' not in existing_lane_ids:
        net['lanes'].append({
            'id': 'L_mumbai_pune',
            'from_id': 'mumbai',
            'to_id': 'pune',
            'distance_km': 149.0,
            'baseline_duration_s': 10080.0,
            'cost': 2288.0,
            'geometry': {'type': 'LineString', 'coordinates': list(reversed(pune_mumbai_coords))},
            'approximate': False
        })

    # Bengaluru-Chennai NH 40 Arterial Bypass
    bengaluru_chennai_nh40 = [
        [77.5946, 12.9716], # Bengaluru
        [78.1340, 13.1367], # Kolar Gold Fields bypass
        [79.1003, 13.2172], # Chittoor Northern Expressway (NH 40)
        [79.6000, 13.0800], # Arakkonam Perimeter Corridor
        [80.2707, 13.0827]  # Chennai
    ]
    if 'L_bengaluru_chennai_nh40' not in existing_lane_ids:
        net['lanes'].append({
            'id': 'L_bengaluru_chennai_nh40',
            'from_id': 'bengaluru',
            'to_id': 'chennai',
            'distance_km': 362.0,
            'baseline_duration_s': 18720.0,
            'cost': 5200.0,
            'geometry': {'type': 'LineString', 'coordinates': bengaluru_chennai_nh40},
            'approximate': False
        })
    if 'L_chennai_bengaluru_nh40' not in existing_lane_ids:
        net['lanes'].append({
            'id': 'L_chennai_bengaluru_nh40',
            'from_id': 'chennai',
            'to_id': 'bengaluru',
            'distance_km': 362.0,
            'baseline_duration_s': 18720.0,
            'cost': 5200.0,
            'geometry': {'type': 'LineString', 'coordinates': list(reversed(bengaluru_chennai_nh40))},
            'approximate': False
        })

    with open(net_path, 'w', encoding='utf-8') as f:
        json.dump(net, f, indent=2)
    print(f"{net_path}: reversed {reversed_count} backwards lanes, total lanes now {len(net['lanes'])}")
