#!/usr/bin/env python3
"""Report who authored the code a branch removed or replaced, to suggest reviewers.

Usage:
    python3 blame_removed_lines.py [--base <ref>] [--include-tests] [--max-symbols N]

Compares the working tree (committed + staged + unstaged) against the merge-base of HEAD and
``--base`` (default: ``main``). For every file that had a previous version, it blames *only the
lines the branch deleted or rewrote*, at the merge-base, and prints:

* per-author totals (production code, then tests/docs separately)
* per-file author and commit breakdown
* for each removed ``def`` / ``class`` / model field / constraint name, the commit that introduced it

Files that are brand new on the branch have no previous author and are listed separately.
Output is plain markdown on stdout; nothing is modified or posted.
"""

import argparse
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field

_HUNK_HEADER = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@")
_NOREPLY_EMAIL = re.compile(r"^(?:\d+\+)?(?P<login>[^@]+)@users\.noreply\.github\.com$")
_SYMBOL_PATTERNS = (
    (re.compile(r"^\s*(?:async\s+)?def\s+(\w+)\("), "def {}("),
    (re.compile(r"^\s*class\s+(\w+)"), "class {}"),
    (re.compile(r"^\s*(\w+)\s*=\s*models\.\w+\("), "{} = models."),  # model fields, not `on_delete=models.X` kwargs
    (re.compile(r"""\bname=["'](\w+)["']"""), 'name="{}"'),  # constraint/index names, not `related_name=`
)
_IGNORED_PATH_PARTS = ("/migrations/", "/fixtures/")
_IGNORED_SUFFIXES = (".lock", ".json", ".svg", ".png", ".jpg")


@dataclass
class ChangedFile:
    old_path: str
    new_path: str
    removed_line_numbers: set[int] = field(default_factory=set)
    removed_text: list[str] = field(default_factory=list)


@dataclass
class BlamedCommit:
    author_name: str
    author_email: str
    summary: str
    lines: int = 0


def git(*arguments: str) -> str:
    return subprocess.run(["git", *arguments], capture_output=True, text=True, check=False).stdout


def categorize(path: str) -> str:
    if "/tests/" in path or path.rsplit("/", 1)[-1].startswith("test_"):
        return "test"
    if path.endswith((".md", ".rst")) or "/docs/" in path or "/openspec/" in path:
        return "docs"
    return "production"


def parse_diff(diff: str) -> list[ChangedFile]:
    changed_files: list[ChangedFile] = []
    current: ChangedFile | None = None
    old_path = ""
    old_line = 0
    for line in diff.splitlines():
        if line.startswith("--- "):
            old_path = line[4:].removeprefix("a/")
            current = None
        elif line.startswith("+++ "):
            new_path = line[4:].removeprefix("b/")
            if old_path != "/dev/null":  # brand-new files have nothing to blame
                current = ChangedFile(old_path=old_path, new_path=new_path if new_path != "/dev/null" else old_path)
                changed_files.append(current)
        elif current is not None:
            hunk = _HUNK_HEADER.match(line)
            if hunk:
                old_line = int(hunk.group(1))
            elif line.startswith("-"):
                current.removed_line_numbers.add(old_line)
                current.removed_text.append(line[1:])
                old_line += 1
    return [changed for changed in changed_files if changed.removed_line_numbers]


def blame_removed(base_commit: str, changed: ChangedFile) -> dict[str, BlamedCommit]:
    blamed: dict[str, BlamedCommit] = {}
    blame_output = git("blame", "--line-porcelain", "-w", "-M", "-C", base_commit, "--", changed.old_path)
    current_hash = ""
    current_line = 0
    for line in blame_output.splitlines():
        header = re.match(r"^([0-9a-f]{40}) \d+ (\d+)", line)
        if header:
            current_hash, current_line = header.group(1), int(header.group(2))
            blamed.setdefault(current_hash, BlamedCommit("", "", ""))
        elif line.startswith("author "):
            blamed[current_hash].author_name = line[7:]
        elif line.startswith("author-mail "):
            blamed[current_hash].author_email = line[12:].strip("<>").lower()
        elif line.startswith("summary "):
            blamed[current_hash].summary = line[8:]
        elif line.startswith("\t") and current_line in changed.removed_line_numbers:
            blamed[current_hash].lines += 1
    return {commit_hash: commit for commit_hash, commit in blamed.items() if commit.lines}


def removed_symbols(changed: ChangedFile, limit: int) -> list[str]:
    symbols: dict[str, None] = {}
    for text in changed.removed_text:
        for pattern, template in _SYMBOL_PATTERNS:
            match = pattern.search(text)
            if match:
                symbols.setdefault(template.format(match.group(1)))
                break
    return list(symbols)[:limit]


def introducing_commit(base_commit: str, old_path: str, symbol: str) -> str:
    log = git(
        "log", "--follow", "--reverse", f"-S{symbol}", "--format=%h|%an|%ad|%s", "--date=short", base_commit, "--", old_path
    )
    first = log.splitlines()[0] if log.strip() else ""
    return first.replace("|", " · ", 3) if first else "(not found)"


def display_author(commit: BlamedCommit) -> str:
    noreply = _NOREPLY_EMAIL.match(commit.author_email)
    handle = f"@{noreply.group('login')}" if noreply else commit.author_email
    return f"{commit.author_name} ({handle})"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base", default="main", help="branch to compare against (default: main)")
    parser.add_argument("--include-tests", action="store_true", help="also blame test files and docs in per-file output")
    parser.add_argument("--max-symbols", type=int, default=40, help="max removed symbols to trace per file")
    arguments = parser.parse_args()

    base_commit = git("merge-base", "HEAD", arguments.base).strip()
    if not base_commit:
        print(f"Could not find a merge-base between HEAD and {arguments.base}.", file=sys.stderr)
        return 1
    current_user_email = git("config", "user.email").strip().lower()

    diff = git("diff", "-M", "-U0", base_commit)
    all_changed = parse_diff(diff)
    new_files = [
        line[4:].removeprefix("b/")
        for line, previous in zip(diff.splitlines()[1:], diff.splitlines())
        if line.startswith("+++ ") and previous == "--- /dev/null"
    ]
    changed_files = [
        changed
        for changed in all_changed
        if not any(part in f"/{changed.old_path}" for part in _IGNORED_PATH_PARTS)
        and not changed.old_path.endswith(_IGNORED_SUFFIXES)
    ]

    print(f"# Reviewer candidates\n\nBase: `{base_commit[:9]}` (merge-base with `{arguments.base}`). "
          f"Includes uncommitted changes. Files with a previous version: {len(changed_files)}.\n")

    totals: dict[str, Counter[str]] = {"production": Counter(), "test": Counter(), "docs": Counter()}
    author_labels: dict[str, str] = {}
    per_file_sections: list[str] = []

    for changed in sorted(changed_files, key=lambda item: -len(item.removed_line_numbers)):
        category = categorize(changed.old_path)
        blamed = blame_removed(base_commit, changed)
        by_author: Counter[str] = Counter()
        for commit in blamed.values():
            by_author[commit.author_email] += commit.lines
            author_labels[commit.author_email] = display_author(commit)
            totals[category][commit.author_email] += commit.lines

        if category != "production" and not arguments.include_tests:
            continue

        section = [f"### `{changed.new_path}` — {category}, {len(changed.removed_line_numbers)} old lines removed/rewritten"]
        section.append("Authors: " + ", ".join(f"{author_labels[email]} {lines}" for email, lines in by_author.most_common()))
        for commit_hash, commit in sorted(blamed.items(), key=lambda item: -item[1].lines)[:5]:
            section.append(f"- `{commit_hash[:9]}` {commit.lines:>3} lines — {commit.author_name} — {commit.summary[:90]}")
        symbols = removed_symbols(changed, arguments.max_symbols) if category == "production" else []
        if symbols:
            section.append("\nRemoved symbols → who introduced them:")
            for symbol in symbols:
                section.append(f"- `{symbol}` — {introducing_commit(base_commit, changed.old_path, symbol)}")
        per_file_sections.append("\n".join(section))

    for category in ("production", "test", "docs"):
        if not totals[category]:
            continue
        print(f"## Old lines replaced, by author — {category}\n")
        for email, lines in totals[category].most_common():
            suffix = "  ← you" if email == current_user_email else ""
            print(f"- {author_labels[email]}: {lines}{suffix}")
        print()

    print("## Per file\n")
    print("\n\n".join(per_file_sections) if per_file_sections else "(none)")

    production_new = [path for path in new_files if categorize(path) == "production"
                      and not any(part in f"/{path}" for part in _IGNORED_PATH_PARTS)
                      and not path.endswith(_IGNORED_SUFFIXES)]
    if production_new:
        print("\n## New production files (no previous author)\n")
        for path in production_new:
            print(f"- `{path}`")
    return 0


if __name__ == "__main__":
    sys.exit(main())
