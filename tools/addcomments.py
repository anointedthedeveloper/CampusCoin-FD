"""Insert comment lines into source files without touching any code.

Usage: python -I addcomments.py <repo_root> <spec.txt>

Spec format (plain text, one block per file):

    @@ path/relative/to/repo
    ^^
    header comment line 1
    header comment line 2
    >> exact stripped text of the target line
    comment line(s) inserted above it, indented to match the target
    >>2 target text   (the "2" picks the 2nd match when the text repeats)

Header lines go at the very top of the file. Lines already starting with
//, /*, * or */ are inserted as-is; anything else gets a "// " prefix.
Every target must match exactly (after strip) or the whole run aborts
before writing anything.
"""
import sys
import pathlib


def as_comment(line: str) -> str:
    s = line.strip()
    if not s:
        return "//"
    if s.startswith(("//", "/*")):
        return s
    if s.startswith("*"):  # JSDoc continuation / closing line
        return " " + s
    return "// " + s


def parse(spec_text: str):
    files = []
    cur = None
    block = None
    for raw in spec_text.splitlines():
        if raw.startswith("@@ "):
            cur = {"path": raw[3:].strip(), "header": [], "inserts": []}
            files.append(cur)
            block = None
            continue
        if cur is None:
            continue
        if raw.strip() == "^^":
            block = cur["header"]
            continue
        if raw.startswith(">>"):
            rest = raw[2:]
            nth = 1
            digits = ""
            while rest and rest[0].isdigit():
                digits += rest[0]
                rest = rest[1:]
            if digits:
                nth = int(digits)
            ins = {"target": rest.strip(), "nth": nth, "explicit": bool(digits), "lines": []}
            cur["inserts"].append(ins)
            block = ins["lines"]
            continue
        if block is not None:
            if raw.strip() == "" and not block:
                continue
            block.append(raw)
    for f in files:
        for ins in f["inserts"]:
            while ins["lines"] and not ins["lines"][-1].strip():
                ins["lines"].pop()
        while f["header"] and not f["header"][-1].strip():
            f["header"].pop()
    return files


def apply(root: pathlib.Path, f):
    path = root / f["path"]
    # newline="" keeps CRLF files as CRLF (the default read would normalise them).
    with open(path, encoding="utf-8", newline="") as fh:
        text = fh.read()
    nl = "\r\n" if "\r\n" in text else "\n"
    trailing = text.endswith(("\n", "\r\n"))
    lines = text.splitlines()

    plan = []  # (index, [new lines])
    for ins in f["inserts"]:
        hits = [i for i, l in enumerate(lines) if l.strip() == ins["target"]]
        if len(hits) < ins["nth"]:
            raise SystemExit(f"{f['path']}: target not found (#{ins['nth']}): {ins['target']!r} ({len(hits)} hits)")
        if not ins["explicit"] and len(hits) > 1:
            raise SystemExit(f"{f['path']}: ambiguous target ({len(hits)} hits), use >>N: {ins['target']!r}")
        idx = hits[ins["nth"] - 1]
        indent = lines[idx][: len(lines[idx]) - len(lines[idx].lstrip())]
        plan.append((idx, [indent + as_comment(c) for c in ins["lines"]]))

    for idx, new in sorted(plan, key=lambda p: p[0], reverse=True):
        lines[idx:idx] = new

    if f["header"]:
        head = [as_comment(c) for c in f["header"]]
        # Keep a "use client"/shebang/triple-slash directive first if present.
        start = 0
        while start < len(lines) and (lines[start].startswith("#!") or lines[start].startswith("///")):
            start += 1
        gap = [""] if start < len(lines) and lines[start].strip() else []
        lines[start:start] = head + gap

    out = nl.join(lines) + (nl if trailing else "")
    return path, out


def main():
    root = pathlib.Path(sys.argv[1])
    files = parse(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
    results = [apply(root, f) for f in files]  # validate everything first
    for path, out in results:
        path.write_text(out, encoding="utf-8", newline="")
    print(f"updated {len(results)} files")


if __name__ == "__main__":
    main()
