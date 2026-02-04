#!/usr/bin/env python3
"""Add blanket tool permissions to .claude/settings.local.json"""
import json, shutil

path = '.claude/settings.local.json'

shutil.copy2(path, path + '.backup4')
print(f"Backed up to {path}.backup4")

with open(path) as f:
    data = json.load(f)

blanket = ['Bash', 'Read', 'Edit', 'Write', 'Grep', 'Glob']
existing = data['permissions']['allow']

to_add = [t for t in blanket if t not in existing]

if not to_add:
    print("All blanket permissions already present.")
else:
    data['permissions']['allow'] = to_add + existing
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
    print(f"Added: {to_add}")
    print(f"Total allow rules: {len(data['permissions']['allow'])}")
