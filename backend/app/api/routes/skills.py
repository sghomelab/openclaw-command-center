"""Skill manager routes — list installed skills, parse SKILL.md files."""
import os
import re
from fastapi import APIRouter

router = APIRouter(prefix="/v3", tags=["Skills"])

SKILLS_DIR = "/app/skills"
WORKSPACE_SKILLS = os.path.expanduser("~/.openclaw/skills")


def _parse_skill_md(skill_dir: str) -> dict:
    """Parse a SKILL.md file to extract name, description, metadata."""
    skill_file = os.path.join(skill_dir, "SKILL.md")
    if not os.path.exists(skill_file):
        return None

    try:
        with open(skill_file, "r") as f:
            content = f.read()

        name = os.path.basename(skill_dir)
        description = ""

        # Try to extract from YAML frontmatter
        if "---" in content:
            parts = content.split("---")
            if len(parts) >= 2:
                frontmatter = parts[1]
                for line in frontmatter.split("\n"):
                    if line.strip().startswith("description:"):
                        description = line.split("description:", 1)[1].strip().strip('"\'')
                        break

        # Fallback: extract first H1 title
        if not description:
            h1_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
            if h1_match:
                description = h1_match.group(1).strip()

        return {
            "name": name,
            "description": description,
            "location": skill_dir,
            "enabled": True,  # Skills are always enabled (installed)
            "file": "SKILL.md",
        }
    except Exception:
        return None


def _list_skills() -> list:
    """Scan all skill directories and return installed skills."""
    skills = []
    for base_dir in [SKILLS_DIR, WORKSPACE_SKILLS]:
        if not os.path.isdir(base_dir):
            continue
        for entry in os.listdir(base_dir):
            skill_dir = os.path.join(base_dir, entry)
            if os.path.isdir(skill_dir) and os.path.exists(os.path.join(skill_dir, "SKILL.md")):
                skill = _parse_skill_md(skill_dir)
                if skill and not any(s["name"] == skill["name"] for s in skills):
                    skills.append(skill)
    return sorted(skills, key=lambda s: s["name"])


@router.get("/skills")
async def list_skills():
    """List all installed skills."""
    skills = _list_skills()
    return {"skills": skills, "total": len(skills)}


@router.get("/skills/{skill_name}")
async def get_skill(skill_name: str):
    """Get details for a specific skill."""
    for base_dir in [SKILLS_DIR, WORKSPACE_SKILLS]:
        skill_dir = os.path.join(base_dir, skill_name)
        skill = _parse_skill_md(skill_dir)
        if skill:
            # Read full SKILL.md content
            skill_file = os.path.join(skill_dir, "SKILL.md")
            try:
                with open(skill_file, "r") as f:
                    skill["content"] = f.read()
            except Exception:
                skill["content"] = ""
            return skill
    raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
