"""Flag inserted comment blocks in .ts/.tsx files that might sit inside JSX.

For every block of added lines, look at the code line just above and just
below it. A comment between two JS statements is fine; anything that looks
like markup around it is printed for a manual look.

Usage: python -I jsxcheck.py <repo_root>
"""
import re
import subprocess
import sys

root = sys.argv[1]
diff = subprocess.run(["git", "-C", root, "diff", "-U0", "--no-color", "--", "*.tsx", "*.ts"],
                      capture_output=True, text=True, encoding="utf-8").stdout

blocks = {}  # file -> list of (start, count) in the new file
cur = None
for line in diff.splitlines():
    if line.startswith("+++ "):
        cur = line[6:]
        blocks[cur] = []
    m = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", line)
    if m and cur:
        blocks[cur].append((int(m.group(1)), int(m.group(2) or 1)))

SAFE_NEXT = re.compile(r"^($|import |interface |export |async |function |const |let |type |interface |class |if \(|return|use[A-Z]\w*\(|[a-z]\w*\(|[a-zA-Z]\w*: |['\"]?\w+['\"]?\s*:|\w+\.|\}|>>|//|/\*)")
flagged = 0
total = 0
for path, hunks in blocks.items():
    with open(f"{root}/{path}", encoding="utf-8", newline="") as fh:
        lines = fh.read().splitlines()
    for start, count in hunks:
        total += 1
        before = next((lines[i].strip() for i in range(start - 2, -1, -1) if lines[i].strip()), "")
        after = lines[start - 1 + count].strip() if start - 1 + count < len(lines) else ""
        markup = before.endswith(">") or before.startswith("<") or after.startswith("<") or after.startswith("{")
        if start == 1:
            markup = False  # file header
        if markup or not SAFE_NEXT.match(after):
            flagged += 1
            print(f"{path}:{start}\n   above: {before[:110]}\n   below: {after[:110]}")
print(f"checked {total} insertion points in .ts/.tsx files, {flagged} flagged")
