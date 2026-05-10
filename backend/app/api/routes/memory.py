"""Memory explorer routes — search MEMORY.md and daily files."""
import os
import re
from datetime import datetime
from fastapi import APIRouter, Query

router = APIRouter(prefix="/v3", tags=["Memory"])

MEMORY_DIR = os.path.expanduser("~/.openclaw/workspace-main/memory")
MEMORY_FILE = os.path.expanduser("~/.openclaw/workspace-main/MEMORY.md")


def _search_files(query: str, max_results: int = 50) -> list:
    """Search memory files for matching content."""
    results = []
    files_to_search = [MEMORY_FILE]

    # Add all daily files
    if os.path.isdir(MEMORY_DIR):
        for fname in sorted(os.listdir(MEMORY_DIR)):
            if fname.endswith(".md"):
                files_to_search.append(os.path.join(MEMORY_DIR, fname))

    for filepath in files_to_search:
        if not os.path.exists(filepath):
            continue
        try:
            with open(filepath, "r") as f:
                lines = f.readlines()

            for i, line in enumerate(lines):
                if re.search(re.escape(query), line, re.IGNORECASE):
                    # Get context (3 lines before and after)
                    context_start = max(0, i - 3)
                    context_end = min(len(lines), i + 4)
                    context = "".join(lines[context_start:context_end]).strip()

                    results.append({
                        "file": os.path.basename(filepath),
                        "path": filepath,
                        "line": i + 1,
                        "match": line.strip(),
                        "context": context,
                    })

                    if len(results) >= max_results:
                        return results
        except Exception:
            continue

    return results


def _list_files() -> list:
    """List all memory files with dates and sizes."""
    files = []

    if os.path.exists(MEMORY_FILE):
        stat = os.stat(MEMORY_FILE)
        files.append({
            "name": "MEMORY.md",
            "path": MEMORY_FILE,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })

    if os.path.isdir(MEMORY_DIR):
        for fname in sorted(os.listdir(MEMORY_DIR)):
            filepath = os.path.join(MEMORY_DIR, fname)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "name": fname,
                    "path": filepath,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })

    return sorted(files, key=lambda f: f["name"], reverse=True)


def _read_file(filepath: str) -> dict:
    """Read a memory file."""
    if not os.path.exists(filepath):
        return {"error": f"File not found: {filepath}"}
    try:
        with open(filepath, "r") as f:
            content = f.read()
        lines = content.split("\n")
        return {
            "name": os.path.basename(filepath),
            "path": filepath,
            "content": content,
            "lines": len(lines),
            "size": os.path.getsize(filepath),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/memory/search")
async def search_memory(q: str = Query(..., min_length=1)):
    """Search memory files for matching content."""
    results = _search_files(q)
    return {"query": q, "results": results, "total": len(results)}


@router.get("/memory/files")
async def list_memory_files():
    """List all memory files."""
    files = _list_files()
    return {"files": files, "total": len(files)}


@router.get("/memory/{file_path:path}")
async def read_memory_file(file_path: str):
    """Read a specific memory file."""
    # Resolve path relative to memory dir
    if not file_path.startswith("/"):
        file_path = os.path.join(MEMORY_DIR, file_path)
    return _read_file(file_path)
