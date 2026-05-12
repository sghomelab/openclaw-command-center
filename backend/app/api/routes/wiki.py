"""LLM Wiki routes — file upload, ingest, query, lint, browse."""
import os
import pathlib
import shutil
import subprocess
import json
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter(prefix="/v3", tags=["LLM Wiki"])

WIKI_DIR = pathlib.Path("/home/node/.openclaw/knowledge-vault/main")
RAW_DIR = WIKI_DIR / "raw"
INDEX_FILE = WIKI_DIR / "index.md"
LOG_FILE = WIKI_DIR / "log.md"
SCHEMA_FILE = WIKI_DIR / "SCHEMA.md"


def _ensure_wiki_dirs():
    for subdir in ["raw", "entities", "concepts", "sources", "analysis", "assets"]:
        (WIKI_DIR / subdir).mkdir(exist_ok=True)


def _read_wiki_files(directory):
    """Read all .md files in a directory, return list of {name, content, size, modified}."""
    results = []
    dir_path = WIKI_DIR / directory
    if not dir_path.exists():
        return results
    for f in sorted(dir_path.glob("*.md")):
        results.append({
            "name": f.stem,
            "path": str(f),
            "size": f.stat().st_size,
            "modified": f.stat().st_mtime,
            "content": f.read_text()[:2000],  # First 2000 chars
        })
    return results


def _append_log(entry: str):
    """Append entry to log.md."""
    with open(LOG_FILE, "a") as f:
        f.write(f"\n{entry}\n")


def _get_page_stats():
    """Count pages by directory."""
    stats = {}
    for subdir in ["entities", "concepts", "sources", "analysis"]:
        dir_path = WIKI_DIR / subdir
        if dir_path.exists():
            stats[subdir] = len(list(dir_path.glob("*.md")))
        else:
            stats[subdir] = 0
    total = sum(stats.values())
    stats["total"] = total
    return stats


@router.get("/wiki/index")
async def get_index():
    """Get the wiki index.md content."""
    if INDEX_FILE.exists():
        return {"content": INDEX_FILE.read_text()}
    return {"content": "# Wiki Index\n\n(No pages yet)"}


@router.get("/wiki/schema")
async def get_schema():
    """Get the wiki SCHEMA.md content."""
    if SCHEMA_FILE.exists():
        return {"content": SCHEMA_FILE.read_text()}
    return {"content": ""}


@router.get("/wiki/log")
async def get_log(limit: int = 50):
    """Get recent log entries."""
    if LOG_FILE.exists():
        lines = LOG_FILE.read_text().split("\n")[-limit:]
        return {"entries": lines, "total": len(lines)}
    return {"entries": [], "total": 0}


@router.get("/wiki/stats")
async def get_stats():
    """Get wiki page statistics."""
    return _get_page_stats()


@router.get("/wiki/pages/{directory}")
async def list_pages(directory: str):
    """List pages in a wiki directory (entities, concepts, sources, analysis)."""
    allowed = ["entities", "concepts", "sources", "analysis", "raw"]
    if directory not in allowed:
        raise HTTPException(400, f"Invalid directory: {directory}. Allowed: {allowed}")
    pages = _read_wiki_files(directory)
    return {"directory": directory, "pages": pages, "total": len(pages)}


@router.get("/wiki/page/{directory}/{name}")
async def read_page(directory: str, name: str):
    """Read a specific wiki page."""
    allowed = ["entities", "concepts", "sources", "analysis"]
    if directory not in allowed:
        raise HTTPException(400, f"Invalid directory: {directory}")
    page_file = WIKI_DIR / directory / f"{name}.md"
    if not page_file.exists():
        raise HTTPException(404, f"Page not found: {directory}/{name}")
    return {
        "directory": directory,
        "name": name,
        "content": page_file.read_text(),
        "size": page_file.stat().st_size,
    }


@router.post("/wiki/upload")
async def upload_source(file: UploadFile = File(...)):
    """Upload a file to the raw/ directory for later ingestion."""
    _ensure_wiki_dirs()
    filename = file.filename or "uploaded-file"
    # Sanitize filename
    safe_name = "".join(c for c in filename if c.isalnum() or c in "._- ")
    dest = RAW_DIR / safe_name
    with open(dest, "wb") as f:
        content = await file.read()
        f.write(content)
    return {
        "filename": safe_name,
        "path": str(dest),
        "size": len(content),
        "status": "uploaded",
    }


@router.post("/wiki/ingest")
async def ingest_source(filename: str = Form(...)):
    """Ingest a raw source file into the wiki.

    This returns a task description that the agent should execute.
    Actual wiki page creation is done by the LLM agent following SCHEMA.md.
    """
    source_file = RAW_DIR / filename
    if not source_file.exists():
        raise HTTPException(404, f"Source file not found: {filename}")

    content = source_file.read_text()[:5000]  # Preview
    return {
        "status": "ready-for-ingest",
        "filename": filename,
        "path": str(source_file),
        "preview": content,
        "size": source_file.stat().st_size,
        "note": "Ingestion requires LLM agent processing. The agent should read the source, create entity/concept/source pages per SCHEMA.md, update index.md, and log the operation.",
    }


@router.post("/wiki/query")
async def query_wiki(question: str = Form(...)):
    """Query the wiki. Returns relevant pages for the agent to read and synthesize."""
    # Read index to find relevant pages
    index_content = INDEX_FILE.read_text() if INDEX_FILE.exists() else ""

    # Search across wiki pages for keywords from the question
    keywords = [w for w in question.lower().split() if len(w) > 3]
    relevant_pages = []

    for subdir in ["entities", "concepts", "sources", "analysis"]:
        dir_path = WIKI_DIR / subdir
        if not dir_path.exists():
            continue
        for page in dir_path.glob("*.md"):
            content = page.read_text().lower()
            if any(kw in content for kw in keywords):
                relevant_pages.append({
                    "directory": subdir,
                    "name": page.stem,
                    "path": str(page),
                    "preview": page.read_text()[:500],
                })

    return {
        "question": question,
        "index": index_content,
        "relevant_pages": relevant_pages,
        "total": len(relevant_pages),
        "note": "Agent should read relevant pages and synthesize an answer with citations.",
    }


@router.post("/wiki/lint")
async def lint_wiki():
    """Run a lint check on the wiki. Returns issues found."""
    issues = []

    # Check for orphan pages (no inbound links from other pages)
    all_pages = []
    for subdir in ["entities", "concepts", "sources", "analysis"]:
        dir_path = WIKI_DIR / subdir
        if dir_path.exists():
            for page in dir_path.glob("*.md"):
                all_pages.append(page)

    # Find pages that are never linked to
    linked_pages = set()
    for page in all_pages:
        content = page.read_text()
        for kw in content.split("[[")[1:]:
            if "]]" in kw:
                linked_pages.add(kw.split("]]")[0])

    for page in all_pages:
        page_name = page.stem
        if page_name not in linked_pages:
            # Check if it's linked from the index
            index_content = INDEX_FILE.read_text() if INDEX_FILE.exists() else ""
            if page_name not in index_content:
                issues.append({
                    "type": "orphan",
                    "page": f"{page.parent.name}/{page_name}",
                    "message": f"Page '{page_name}' has no inbound links and is not in index.md",
                })

    # Check for pages without cross-references
    for page in all_pages:
        content = page.read_text()
        if "[[" not in content:
            issues.append({
                "type": "no-cross-refs",
                "page": f"{page.parent.name}/{page.stem}",
                "message": f"Page '{page.stem}' has no cross-references to other wiki pages",
            })

    stats = _get_page_stats()
    return {
        "issues": issues,
        "total_issues": len(issues),
        "stats": stats,
        "lint_time": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/wiki/search")
async def search_wiki(q: str):
    """Search across all wiki pages for matching content."""
    results = []
    query = q.lower()

    for subdir in ["entities", "concepts", "sources", "analysis"]:
        dir_path = WIKI_DIR / subdir
        if not dir_path.exists():
            continue
        for page in dir_path.glob("*.md"):
            content = page.read_text()
            if query in content.lower():
                # Find matching line
                for i, line in enumerate(content.split("\n")):
                    if query in line.lower():
                        results.append({
                            "directory": subdir,
                            "name": page.stem,
                            "line": i + 1,
                            "match": line.strip(),
                            "context": "\n".join(content.split("\n")[max(0, i-2):i+3]),
                        })
                        break

    return {"query": q, "results": results, "total": len(results)}
