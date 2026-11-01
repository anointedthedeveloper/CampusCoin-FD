"""Check that the working-tree diff only ADDS comment (or blank) lines.

Usage: python -I verify.py <repo_root>
"""
import re
import subprocess
import sys

root = sys.argv[1]
diff = subprocess.run(
    ["git", "-C", root, "diff", "-U0", "--no-color"], capture_output=True, text=True, encoding="utf-8"
).stdout

COMMENT = re.compile(r"^\s*(//|/\*|\*|\*/|$)")
bad = []
files = set()
added = 0
cur = None
for line in diff.splitlines():
    if line.startswith("+++ "):
        cur = line[6:]
        files.add(cur)
        continue
    if line.startswith("--- "):
        continue
    if line.startswith("-"):
        bad.append(f"{cur}: REMOVED {line[1:]!r}")
    elif line.startswith("+"):
        added += 1
        if not COMMENT.match(line[1:]):
            bad.append(f"{cur}: NON-COMMENT {line[1:]!r}")

print(f"{len(files)} files changed, {added} lines added")
if bad:
    print("PROBLEMS:")
    print("\n".join(bad[:50]))
    sys.exit(1)
print("OK: only comment/blank lines were added")
