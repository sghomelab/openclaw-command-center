"""Config validator — validates config changes against known schema rules."""
import json
import os
import re
from typing import Any

CONFIG_PATH = os.path.expanduser("~/.openclaw/openclaw.json")

# Known top-level config keys and their expected types
KNOWN_KEYS = {
    "agents": dict,
    "gateway": dict,
    "session": dict,
    "tools": dict,
    "models": dict,
    "memory": dict,
    "skills": dict,
    "plugins": dict,
    "bindings": list,
    "meta": dict,
    "diagnostics": dict,
    "cron": dict,
}

# Nested key validation rules
VALIDATION_RULES = {
    "gateway.auth.mode": {"type": str, "allowed": ["token", "password", "none", "trusted-proxy"]},
    "gateway.mode": {"type": str, "allowed": ["local", "remote", "auto"]},
    "gateway.bind": {"type": str, "allowed": ["local", "lan", "all"]},
    "gateway.tls.enabled": {"type": bool},
    "gateway.port": {"type": int, "min": 1, "max": 65535},
    "session.dmScope": {"type": str, "allowed": ["per-channel-peer", "global"]},
    "tools.profile": {"type": str, "allowed": ["default", "coding", "full"]},
    "memory.backend": {"type": str, "allowed": ["qmd", "sqlite", "none"]},
    "agents.defaults.model": {"type": str},
    "agents.defaults.heartbeat.every": {"type": str, "regex": r"^\d+(s|m|h|d)$"},
    "agents.defaults.contextPruning.mode": {"type": str, "allowed": ["default", "cache-ttl", "none"]},
    "agents.defaults.compaction.mode": {"type": str, "allowed": ["default", "none", "always"]},
    "agents.defaults.compaction.reserveTokens": {"type": int, "min": 1000, "max": 100000},
    "agents.defaults.compaction.maxHistoryShare": {"type": (int, float), "min": 0.0, "max": 1.0},
}


def validate_config_path(config_path: str, value: Any) -> list[dict]:
    """Validate a single config path change against known rules.
    
    Returns list of validation error dicts: {"path", "error", "rule"}
    """
    errors = []
    
    # Check if the path matches any validation rule
    for rule_path, rule in VALIDATION_RULES.items():
        if config_path == rule_path or config_path.startswith(rule_path + "."):
            expected_type = rule.get("type")
            if expected_type and not isinstance(value, expected_type):
                errors.append({
                    "path": config_path,
                    "error": f"Expected type {expected_type.__name__}, got {type(value).__name__}",
                    "rule": "type_mismatch"
                })
                continue
            
            if "allowed" in rule and value not in rule["allowed"]:
                errors.append({
                    "path": config_path,
                    "error": f"Value '{value}' not in allowed: {rule['allowed']}",
                    "rule": "invalid_value"
                })
                continue
            
            if "min" in rule and isinstance(value, (int, float)) and value < rule["min"]:
                errors.append({
                    "path": config_path,
                    "error": f"Value {value} below minimum {rule['min']}",
                    "rule": "below_minimum"
                })
            
            if "max" in rule and isinstance(value, (int, float)) and value > rule["max"]:
                errors.append({
                    "path": config_path,
                    "error": f"Value {value} exceeds maximum {rule['max']}",
                    "rule": "above_maximum"
                })
            
            if "regex" in rule and isinstance(value, str):
                if not re.match(rule["regex"], value):
                    errors.append({
                        "path": config_path,
                        "error": f"Value '{value}' doesn't match pattern '{rule['regex']}'",
                        "rule": "pattern_mismatch"
                    })
            break
    
    # Check for empty strings in fields that shouldn't be empty
    if isinstance(value, str) and not value and config_path.endswith(".token") or config_path.endswith(".password"):
        errors.append({
            "path": config_path,
            "error": "Credential field cannot be empty",
            "rule": "empty_credential"
        })
    
    # Check for reasonable string lengths
    if isinstance(value, str) and len(value) > 10000:
        errors.append({
            "path": config_path,
            "error": f"String value too long ({len(value)} chars, max 10000)",
            "rule": "string_too_long"
        })
    
    return errors


def validate_full_config(config: dict) -> list[dict]:
    """Validate an entire config dict against known rules.
    
    Returns list of validation error dicts.
    """
    errors = []
    
    # Check for unknown top-level keys
    for key in config:
        if key not in KNOWN_KEYS:
            errors.append({
                "path": key,
                "error": f"Unknown top-level key '{key}'. Known keys: {list(KNOWN_KEYS.keys())}",
                "rule": "unknown_key"
            })
        elif isinstance(KNOWN_KEYS[key], type):
            if not isinstance(config[key], KNOWN_KEYS[key]):
                errors.append({
                    "path": key,
                    "error": f"Expected type {KNOWN_KEYS[key].__name__}, got {type(config[key]).__name__}",
                    "rule": "type_mismatch"
                })
    
    # Check critical required fields
    if "agents" in config and "list" in config["agents"]:
        agent_list = config["agents"]["list"]
        if not isinstance(agent_list, list):
            errors.append({
                "path": "agents.list",
                "error": "agents.list must be an array",
                "rule": "type_mismatch"
            })
        else:
            for i, agent in enumerate(agent_list):
                if not isinstance(agent, dict):
                    continue
                if "id" not in agent:
                    errors.append({
                        "path": f"agents.list[{i}].id",
                        "error": "Agent must have an 'id' field",
                        "rule": "missing_required"
                    })
                if "workspace" not in agent:
                    errors.append({
                        "path": f"agents.list[{i}].workspace",
                        "error": "Agent must have a 'workspace' field",
                        "rule": "missing_required"
                    })
    
    # Check gateway config
    if "gateway" in config:
        gw = config["gateway"]
        if "port" in gw and not isinstance(gw["port"], int):
            errors.append({
                "path": "gateway.port",
                "error": f"Port must be an integer, got {type(gw['port']).__name__}",
                "rule": "type_mismatch"
            })
        if "auth" in gw and isinstance(gw["auth"], dict):
            auth = gw["auth"]
            if "mode" in auth and auth["mode"] not in ["token", "password", "none", "trusted-proxy"]:
                errors.append({
                    "path": "gateway.auth.mode",
                    "error": f"Invalid auth mode '{auth['mode']}'",
                    "rule": "invalid_value"
                })
    
    return errors


def validate_diff(old_config: dict, new_config: dict) -> list[dict]:
    """Validate proposed changes by diffing old vs new config.
    
    Returns list of validation error dicts.
    """
    errors = []
    
    # Check for removed critical keys
    critical_keys = ["agents", "gateway"]
    for key in critical_keys:
        if key in old_config and key not in new_config:
            errors.append({
                "path": key,
                "error": f"Cannot remove critical config section '{key}'",
                "rule": "critical_section_removed"
            })
    
    # Check for changed values against rules
    for rule_path, rule in VALIDATION_RULES.items():
        parts = rule_path.split(".")
        old_val = old_config
        new_val = new_config
        
        for part in parts:
            if isinstance(old_val, dict) and part in old_val:
                old_val = old_val[part]
            else:
                old_val = None
                break
            
            if isinstance(new_val, dict) and part in new_val:
                new_val = new_val[part]
            else:
                new_val = None
                break
        
        if old_val != new_val and new_val is not None:
            path_errors = validate_config_path(rule_path, new_val)
            errors.extend(path_errors)
    
    return errors
