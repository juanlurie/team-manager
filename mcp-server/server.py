#!/usr/bin/env python3
"""Team Manager MCP server — wraps the REST API at BASE_URL."""

import os
import json
from typing import Any
import httpx
import mcp.server.stdio
import mcp.types as types
from mcp.server import Server

BASE_URL = os.environ.get("TEAM_MANAGER_API_URL", "http://localhost:5000")
API_KEY = os.environ.get("TEAM_MANAGER_API_KEY")

app = Server("team-manager")
_http: httpx.AsyncClient | None = None


def http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        headers = {}
        if API_KEY:
            headers["X-API-Key"] = API_KEY
        _http = httpx.AsyncClient(base_url=BASE_URL, timeout=30, headers=headers)
    return _http


def _ok(data: Any) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=json.dumps(data, indent=2))]


def _err(msg: str) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=f"Error: {msg}")]


async def _get(path: str, params: dict | None = None) -> list[types.TextContent]:
    r = await http().get(path, params={k: v for k, v in (params or {}).items() if v is not None})
    r.raise_for_status()
    return _ok(r.json())


async def _post(path: str, body: dict) -> list[types.TextContent]:
    r = await http().post(path, json={k: v for k, v in body.items() if v is not None})
    r.raise_for_status()
    return _ok(r.json())


async def _put(path: str, body: dict) -> list[types.TextContent]:
    r = await http().put(path, json={k: v for k, v in body.items() if v is not None})
    r.raise_for_status()
    return _ok(r.json())


async def _patch(path: str, body: dict | None = None) -> list[types.TextContent]:
    r = await http().patch(path, json={k: v for k, v in (body or {}).items() if v is not None} if body else None)
    r.raise_for_status()
    return _ok(r.json())


async def _delete(path: str) -> list[types.TextContent]:
    r = await http().delete(path)
    if r.status_code == 204:
        return _ok({"success": True})
    r.raise_for_status()
    return _ok(r.json())


TOOLS = [
    # ═══════════════════════════════════════════════════════════
    # PIs
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_pis",
        description="List all Program Increments (PIs).",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_pi",
        description="Get a single PI by ID.",
        inputSchema={
            "type": "object",
            "properties": {"pi_id": {"type": "string", "description": "PI UUID"}},
            "required": ["pi_id"],
        },
    ),
    types.Tool(
        name="create_pi",
        description="Create a new Program Increment.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "description": {"type": "string"},
            },
            "required": ["name", "start_date", "end_date"],
        },
    ),
    types.Tool(
        name="update_pi",
        description="Update an existing PI.",
        inputSchema={
            "type": "object",
            "properties": {
                "pi_id": {"type": "string"},
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "description": {"type": "string"},
            },
            "required": ["pi_id"],
        },
    ),
    types.Tool(
        name="delete_pi",
        description="Delete a PI.",
        inputSchema={
            "type": "object",
            "properties": {"pi_id": {"type": "string"}},
            "required": ["pi_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Sprints
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_sprints",
        description="List sprints, optionally filtered by PI or date range.",
        inputSchema={
            "type": "object",
            "properties": {
                "pi_id": {"type": "string", "description": "Filter by PI UUID"},
                "from": {"type": "string", "description": "From date YYYY-MM-DD"},
                "to": {"type": "string", "description": "To date YYYY-MM-DD"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="get_sprint",
        description="Get a sprint by ID.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="create_sprint",
        description="Create a new sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "pi_id": {"type": "string"},
                "sprint_number": {"type": "integer"},
                "is_innovation_sprint": {"type": "boolean"},
                "goal": {"type": "string"},
            },
            "required": ["name", "start_date", "end_date"],
        },
    ),
    types.Tool(
        name="update_sprint",
        description="Update an existing sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "name": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "pi_id": {"type": "string"},
                "sprint_number": {"type": "integer"},
                "is_innovation_sprint": {"type": "boolean"},
                "goal": {"type": "string"},
            },
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="delete_sprint",
        description="Delete a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="close_sprint",
        description="Close (complete) a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="clone_sprint",
        description="Clone a sprint (create a copy with new dates).",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "new_start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "new_end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "new_name": {"type": "string"},
            },
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="initialize_sprint_members",
        description="Initialize members for a sprint based on team configuration.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="update_sprint_retro",
        description="Update retro data for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "went_well": {"type": "array", "items": {"type": "string"}},
                "to_improve": {"type": "array", "items": {"type": "string"}},
                "action_items": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_velocity",
        description="Get velocity data across sprints, optionally scoped to a PI.",
        inputSchema={
            "type": "object",
            "properties": {"pi_id": {"type": "string"}},
            "required": [],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Team Members
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_team_members",
        description="List team members, optionally filtered by role, team lead, or active status.",
        inputSchema={
            "type": "object",
            "properties": {
                "role": {"type": "string", "enum": ["Member", "TeamLead", "TechLead"]},
                "team_lead_id": {"type": "string"},
                "is_active": {"type": "boolean"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="get_team_member",
        description="Get a team member by ID.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_team_member",
        description="Add a new team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "role": {"type": "string", "enum": ["Member", "TeamLead", "TechLead"]},
                "team_lead_id": {"type": "string"},
                "crafts": {"type": "array", "items": {"type": "string"}},
                "birth_date": {"type": "string", "description": "YYYY-MM-DD"},
                "join_date": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": ["first_name", "last_name", "email", "role"],
        },
    ),
    types.Tool(
        name="update_team_member",
        description="Update an existing team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "first_name": {"type": "string"},
                "last_name": {"type": "string"},
                "email": {"type": "string"},
                "role": {"type": "string", "enum": ["Member", "TeamLead", "TechLead"]},
                "team_lead_id": {"type": "string"},
                "crafts": {"type": "array", "items": {"type": "string"}},
                "birth_date": {"type": "string", "description": "YYYY-MM-DD"},
                "join_date": {"type": "string", "description": "YYYY-MM-DD"},
                "is_active": {"type": "boolean"},
            },
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="delete_team_member",
        description="Delete a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Work Items
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_work_items",
        description="List work items for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_member_id": {"type": "string"}},
            "required": ["sprint_member_id"],
        },
    ),
    types.Tool(
        name="get_work_item",
        description="Get a work item by ID.",
        inputSchema={
            "type": "object",
            "properties": {"work_item_id": {"type": "string"}},
            "required": ["work_item_id"],
        },
    ),
    types.Tool(
        name="create_work_item",
        description="Create a work item for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_member_id": {"type": "string"},
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["Task", "Analysis", "Design", "Dev", "QA", "Bug", "Release"]},
                "status": {"type": "string", "enum": ["Planned", "InProgress", "Blocked", "Completed", "ReadyForRelease", "Released"]},
                "description": {"type": "string"},
                "feature_id": {"type": "string"},
                "external_ticket_ref": {"type": "string"},
                "estimated_points": {"type": "number"},
                "actual_points": {"type": "number"},
                "completed_date": {"type": "string", "description": "YYYY-MM-DD"},
                "blocked_reason": {"type": "string"},
            },
            "required": ["sprint_member_id", "title", "type", "status"],
        },
    ),
    types.Tool(
        name="update_work_item",
        description="Update a work item.",
        inputSchema={
            "type": "object",
            "properties": {
                "work_item_id": {"type": "string"},
                "title": {"type": "string"},
                "type": {"type": "string", "enum": ["Task", "Analysis", "Design", "Dev", "QA", "Bug", "Release"]},
                "status": {"type": "string", "enum": ["Planned", "InProgress", "Blocked", "Completed", "ReadyForRelease", "Released"]},
                "description": {"type": "string"},
                "feature_id": {"type": "string"},
                "external_ticket_ref": {"type": "string"},
                "estimated_points": {"type": "number"},
                "actual_points": {"type": "number"},
                "completed_date": {"type": "string", "description": "YYYY-MM-DD"},
                "blocked_reason": {"type": "string"},
            },
            "required": ["work_item_id"],
        },
    ),
    types.Tool(
        name="update_work_item_status",
        description="Update the status of a work item.",
        inputSchema={
            "type": "object",
            "properties": {
                "work_item_id": {"type": "string"},
                "status": {"type": "string", "enum": ["Planned", "InProgress", "Blocked", "Completed", "ReadyForRelease", "Released"]},
            },
            "required": ["work_item_id", "status"],
        },
    ),
    types.Tool(
        name="carry_over_work_item",
        description="Carry over a work item to the next sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "work_item_id": {"type": "string"},
                "target_sprint_id": {"type": "string"},
            },
            "required": ["work_item_id"],
        },
    ),
    types.Tool(
        name="delete_work_item",
        description="Delete a work item.",
        inputSchema={
            "type": "object",
            "properties": {"work_item_id": {"type": "string"}},
            "required": ["work_item_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Dashboard
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_sprint_dashboard",
        description="Get the full sprint dashboard (member cards, progress, leave).",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "team_lead_id": {"type": "string", "description": "Filter dashboard to a specific team lead's members"},
            },
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_summary",
        description="Get a high-level summary for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_sprint_blockers",
        description="List all blocked work items for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="get_leave_summary",
        description="Get the leave summary (who is off, how many days) for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Leave Records
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_leave_records",
        description="List leave records, optionally filtered by member, sprint, or date range.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "sprint_id": {"type": "string"},
                "from": {"type": "string", "description": "YYYY-MM-DD"},
                "to": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="create_leave_record",
        description="Record leave for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "type": {"type": "string", "enum": ["Annual", "Sick", "Other", "Birthday", "Loyalty", "Discretionary", "FamilyResponsibility"]},
                "days_count": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["team_member_id", "start_date", "end_date", "type", "days_count"],
        },
    ),
    types.Tool(
        name="update_leave_record",
        description="Update a leave record.",
        inputSchema={
            "type": "object",
            "properties": {
                "leave_id": {"type": "string"},
                "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                "end_date": {"type": "string", "description": "YYYY-MM-DD"},
                "type": {"type": "string", "enum": ["Annual", "Sick", "Other", "Birthday", "Loyalty", "Discretionary", "FamilyResponsibility"]},
                "days_count": {"type": "number"},
                "notes": {"type": "string"},
            },
            "required": ["leave_id"],
        },
    ),
    types.Tool(
        name="delete_leave_record",
        description="Delete a leave record.",
        inputSchema={
            "type": "object",
            "properties": {"leave_id": {"type": "string"}},
            "required": ["leave_id"],
        },
    ),
    types.Tool(
        name="import_leave_records",
        description="Import leave records from uploaded data.",
        inputSchema={
            "type": "object",
            "properties": {
                "records": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["records"],
        },
    ),
    types.Tool(
        name="fetch_leave_preview",
        description="Preview leave data from external source before importing.",
        inputSchema={
            "type": "object",
            "properties": {},
            "required": [],
        },
    ),
    types.Tool(
        name="fetch_leave_records",
        description="Fetch and import leave records from external source.",
        inputSchema={
            "type": "object",
            "properties": {},
            "required": [],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Leaderboard
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_leaderboard",
        description="Get the team leaderboard (points rankings).",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_leaderboard_member_stats",
        description="Get leaderboard stats for a specific member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="get_leaderboard_member_history",
        description="Get point history for a specific member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="award_points",
        description="Award leaderboard points to a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "team_member_id": {"type": "string"},
                "points": {"type": "integer"},
                "reason": {"type": "string"},
            },
            "required": ["team_member_id", "points", "reason"],
        },
    ),
    types.Tool(
        name="revoke_points",
        description="Revoke a leaderboard point award.",
        inputSchema={
            "type": "object",
            "properties": {"award_id": {"type": "string"}},
            "required": ["award_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Sprint Members
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_sprint_members",
        description="Get all members assigned to a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="update_sprint_member_notes",
        description="Update notes for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_member_id": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["sprint_member_id", "notes"],
        },
    ),
    types.Tool(
        name="update_sprint_member_capacity",
        description="Update capacity for a sprint member.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_member_id": {"type": "string"},
                "capacity": {"type": "number"},
            },
            "required": ["sprint_member_id", "capacity"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Features
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_sprint_features",
        description="List features for a specific sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="create_sprint_feature",
        description="Create a feature for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string"},
            },
            "required": ["sprint_id", "title"],
        },
    ),
    types.Tool(
        name="update_sprint_feature",
        description="Update a sprint feature.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "feature_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string"},
            },
            "required": ["sprint_id", "feature_id"],
        },
    ),
    types.Tool(
        name="delete_sprint_feature",
        description="Delete a sprint feature.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}, "feature_id": {"type": "string"}},
            "required": ["sprint_id", "feature_id"],
        },
    ),
    types.Tool(
        name="toggle_feature_active",
        description="Toggle the active status of a feature.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}, "feature_id": {"type": "string"}},
            "required": ["sprint_id", "feature_id"],
        },
    ),
    types.Tool(
        name="list_all_features",
        description="List all features across sprints, optionally filtered.",
        inputSchema={
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "pi_id": {"type": "string"},
            },
            "required": [],
        },
    ),
    types.Tool(
        name="set_feature_status",
        description="Set the status of a feature.",
        inputSchema={
            "type": "object",
            "properties": {
                "feature_id": {"type": "string"},
                "status": {"type": "string"},
            },
            "required": ["feature_id", "status"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Retro Actions
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_retro_actions",
        description="List retro actions, optionally filtered by sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": [],
        },
    ),
    types.Tool(
        name="create_retro_action",
        description="Create a retro action.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "assignee_id": {"type": "string"},
            },
            "required": ["sprint_id", "title"],
        },
    ),
    types.Tool(
        name="update_retro_action",
        description="Update a retro action.",
        inputSchema={
            "type": "object",
            "properties": {
                "retro_action_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "assignee_id": {"type": "string"},
                "is_completed": {"type": "boolean"},
            },
            "required": ["retro_action_id"],
        },
    ),
    types.Tool(
        name="delete_retro_action",
        description="Delete a retro action.",
        inputSchema={
            "type": "object",
            "properties": {"retro_action_id": {"type": "string"}},
            "required": ["retro_action_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Sprint Votes
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_sprint_votes",
        description="Get votes for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {"sprint_id": {"type": "string"}},
            "required": ["sprint_id"],
        },
    ),
    types.Tool(
        name="cast_sprint_vote",
        description="Cast a vote in a sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "target_id": {"type": "string"},
                "vote_type": {"type": "string"},
            },
            "required": ["sprint_id", "target_id"],
        },
    ),
    types.Tool(
        name="award_sprint_mvp",
        description="Award MVP for a sprint.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "member_id": {"type": "string"},
            },
            "required": ["sprint_id", "member_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Comments
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_comments",
        description="Get comments for an entity.",
        inputSchema={
            "type": "object",
            "properties": {
                "entity_type": {"type": "string", "description": "e.g. work-item, feature, sprint"},
                "entity_id": {"type": "string"},
            },
            "required": ["entity_type", "entity_id"],
        },
    ),
    types.Tool(
        name="create_comment",
        description="Create a comment on an entity.",
        inputSchema={
            "type": "object",
            "properties": {
                "entity_type": {"type": "string"},
                "entity_id": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["entity_type", "entity_id", "content"],
        },
    ),
    types.Tool(
        name="delete_comment",
        description="Delete a comment.",
        inputSchema={
            "type": "object",
            "properties": {"comment_id": {"type": "string"}},
            "required": ["comment_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Achievements
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_achievements",
        description="List all available achievements.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_member_achievements",
        description="Get achievements for a specific member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="award_achievement",
        description="Award an achievement to a member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "achievement_type": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["member_id", "achievement_type"],
        },
    ),
    types.Tool(
        name="revoke_achievement",
        description="Revoke an achievement.",
        inputSchema={
            "type": "object",
            "properties": {"achievement_id": {"type": "string"}},
            "required": ["achievement_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Timesheets
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_timesheets",
        description="Get timesheet entries for a member by month.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "year": {"type": "integer"},
                "month": {"type": "integer"},
            },
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_timesheet_entry",
        description="Create a timesheet entry.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "hours": {"type": "number"},
                "description": {"type": "string"},
                "project": {"type": "string"},
                "category": {"type": "string"},
            },
            "required": ["member_id", "date", "hours"],
        },
    ),
    types.Tool(
        name="update_timesheet_entry",
        description="Update a timesheet entry.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "entry_id": {"type": "string"},
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "hours": {"type": "number"},
                "description": {"type": "string"},
                "project": {"type": "string"},
                "category": {"type": "string"},
            },
            "required": ["member_id", "entry_id"],
        },
    ),
    types.Tool(
        name="delete_timesheet_entry",
        description="Delete a timesheet entry.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}, "entry_id": {"type": "string"}},
            "required": ["member_id", "entry_id"],
        },
    ),
    types.Tool(
        name="export_timesheet",
        description="Export timesheet for a member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "year": {"type": "integer"},
                "month": {"type": "integer"},
            },
            "required": ["member_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Timesheet Config
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_timesheet_config",
        description="Get timesheet configuration for a member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="update_timesheet_config",
        description="Update timesheet configuration for a member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "config": {"type": "object"},
            },
            "required": ["member_id", "config"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Member Personal (skills, notes, tasks)
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_member_personal",
        description="Get personal info for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="update_member_personal",
        description="Update personal info for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "personal_info": {"type": "object"},
            },
            "required": ["member_id", "personal_info"],
        },
    ),
    types.Tool(
        name="get_member_skills",
        description="Get skills for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_member_skill",
        description="Add a skill to a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "skill_name": {"type": "string"},
                "level": {"type": "string"},
            },
            "required": ["member_id", "skill_name"],
        },
    ),
    types.Tool(
        name="add_skill_rating",
        description="Add a rating to a member's skill.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "skill_id": {"type": "string"},
                "rating": {"type": "integer"},
                "notes": {"type": "string"},
            },
            "required": ["member_id", "skill_id", "rating"],
        },
    ),
    types.Tool(
        name="delete_member_skill",
        description="Delete a skill from a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}, "skill_id": {"type": "string"}},
            "required": ["member_id", "skill_id"],
        },
    ),
    types.Tool(
        name="get_member_notes",
        description="Get notes for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_member_note",
        description="Create a note for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["member_id", "content"],
        },
    ),
    types.Tool(
        name="delete_member_note",
        description="Delete a note for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}, "note_id": {"type": "string"}},
            "required": ["member_id", "note_id"],
        },
    ),
    types.Tool(
        name="get_member_tasks",
        description="Get tasks for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}},
            "required": ["member_id"],
        },
    ),
    types.Tool(
        name="create_member_task",
        description="Create a task for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "due_date": {"type": "string", "description": "YYYY-MM-DD"},
            },
            "required": ["member_id", "title"],
        },
    ),
    types.Tool(
        name="update_member_task",
        description="Update a task for a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "task_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "due_date": {"type": "string", "description": "YYYY-MM-DD"},
                "is_completed": {"type": "boolean"},
            },
            "required": ["member_id", "task_id"],
        },
    ),
    types.Tool(
        name="delete_member_task",
        description="Delete a task for a team member.",
        inputSchema={
            "type": "object",
            "properties": {"member_id": {"type": "string"}, "task_id": {"type": "string"}},
            "required": ["member_id", "task_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Squads
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_squads",
        description="List all squads.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_squad",
        description="Get a squad by ID.",
        inputSchema={
            "type": "object",
            "properties": {"squad_id": {"type": "string"}},
            "required": ["squad_id"],
        },
    ),
    types.Tool(
        name="create_squad",
        description="Create a new squad.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "member_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="update_squad",
        description="Update a squad.",
        inputSchema={
            "type": "object",
            "properties": {
                "squad_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "member_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["squad_id"],
        },
    ),
    types.Tool(
        name="delete_squad",
        description="Delete a squad.",
        inputSchema={
            "type": "object",
            "properties": {"squad_id": {"type": "string"}},
            "required": ["squad_id"],
        },
    ),
    types.Tool(
        name="set_squad_members",
        description="Set all members of a squad.",
        inputSchema={
            "type": "object",
            "properties": {
                "squad_id": {"type": "string"},
                "member_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["squad_id", "member_ids"],
        },
    ),
    types.Tool(
        name="set_member_squads",
        description="Set all squads a member belongs to.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "squad_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["member_id", "squad_ids"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Discussion Points
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_discussion_points",
        description="List all discussion points.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="create_discussion_point",
        description="Create a discussion point.",
        inputSchema={
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["title"],
        },
    ),
    types.Tool(
        name="update_discussion_point",
        description="Update a discussion point.",
        inputSchema={
            "type": "object",
            "properties": {
                "discussion_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["discussion_id"],
        },
    ),
    types.Tool(
        name="delete_discussion_point",
        description="Delete a discussion point.",
        inputSchema={
            "type": "object",
            "properties": {"discussion_id": {"type": "string"}},
            "required": ["discussion_id"],
        },
    ),
    types.Tool(
        name="get_discussion_tasks",
        description="Get tasks for a discussion point.",
        inputSchema={
            "type": "object",
            "properties": {"discussion_id": {"type": "string"}},
            "required": ["discussion_id"],
        },
    ),
    types.Tool(
        name="create_discussion_task",
        description="Create a task for a discussion point.",
        inputSchema={
            "type": "object",
            "properties": {
                "discussion_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["discussion_id", "title"],
        },
    ),
    types.Tool(
        name="update_discussion_task",
        description="Update a discussion task.",
        inputSchema={
            "type": "object",
            "properties": {
                "discussion_id": {"type": "string"},
                "task_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "is_completed": {"type": "boolean"},
            },
            "required": ["discussion_id", "task_id"],
        },
    ),
    types.Tool(
        name="delete_discussion_task",
        description="Delete a discussion task.",
        inputSchema={
            "type": "object",
            "properties": {"discussion_id": {"type": "string"}, "task_id": {"type": "string"}},
            "required": ["discussion_id", "task_id"],
        },
    ),
    types.Tool(
        name="toggle_discussion_task",
        description="Toggle completion status of a discussion task.",
        inputSchema={
            "type": "object",
            "properties": {"discussion_id": {"type": "string"}, "task_id": {"type": "string"}},
            "required": ["discussion_id", "task_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Meeting Series
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_meeting_series",
        description="List all meeting series.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_meeting_series",
        description="Get a meeting series by ID.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="create_meeting_series",
        description="Create a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "recurrence": {"type": "string"},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="update_meeting_series",
        description="Update a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "recurrence": {"type": "string"},
            },
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="delete_meeting_series",
        description="Delete a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="get_meeting_series_slots",
        description="Get slots for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="create_meeting_series_slots",
        description="Create slots for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "slots": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["series_id", "slots"],
        },
    ),
    types.Tool(
        name="update_meeting_series_slot",
        description="Update a slot in a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "slot_id": {"type": "string"},
                "time": {"type": "string"},
                "location_id": {"type": "string"},
            },
            "required": ["series_id", "slot_id"],
        },
    ),
    types.Tool(
        name="delete_meeting_series_slot",
        description="Delete a slot from a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}, "slot_id": {"type": "string"}},
            "required": ["series_id", "slot_id"],
        },
    ),
    types.Tool(
        name="get_meeting_series_items",
        description="Get items for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="create_meeting_series_item",
        description="Create an item for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["series_id", "title"],
        },
    ),
    types.Tool(
        name="update_meeting_series_item",
        description="Update an item in a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "item_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["series_id", "item_id"],
        },
    ),
    types.Tool(
        name="delete_meeting_series_item",
        description="Delete an item from a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}, "item_id": {"type": "string"}},
            "required": ["series_id", "item_id"],
        },
    ),
    types.Tool(
        name="unconfirm_meeting_item",
        description="Unconfirm a meeting item.",
        inputSchema={
            "type": "object",
            "properties": {"item_id": {"type": "string"}},
            "required": ["item_id"],
        },
    ),
    types.Tool(
        name="get_my_meeting_series",
        description="Get meeting series I'm part of.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_my_meetings",
        description="Get my upcoming meetings.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_item_availability",
        description="Get availability for a meeting item.",
        inputSchema={
            "type": "object",
            "properties": {"item_id": {"type": "string"}},
            "required": ["item_id"],
        },
    ),
    types.Tool(
        name="add_item_availability",
        description="Add your availability for a meeting item.",
        inputSchema={
            "type": "object",
            "properties": {
                "item_id": {"type": "string"},
                "slot_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["item_id", "slot_ids"],
        },
    ),
    types.Tool(
        name="remove_item_availability",
        description="Remove your availability for a meeting item.",
        inputSchema={
            "type": "object",
            "properties": {"item_id": {"type": "string"}, "availability_id": {"type": "string"}},
            "required": ["item_id", "availability_id"],
        },
    ),
    types.Tool(
        name="get_bulk_availability",
        description="Get bulk availability for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="submit_bulk_availability",
        description="Submit bulk availability for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "availability": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["series_id", "availability"],
        },
    ),
    types.Tool(
        name="get_my_availability",
        description="Get my availability for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {"series_id": {"type": "string"}},
            "required": ["series_id"],
        },
    ),
    types.Tool(
        name="set_my_availability",
        description="Set my availability for a meeting series.",
        inputSchema={
            "type": "object",
            "properties": {
                "series_id": {"type": "string"},
                "slot_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["series_id", "slot_ids"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Meeting Sessions
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_meeting_sessions",
        description="List all meeting sessions.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_meeting_session",
        description="Get a meeting session by ID.",
        inputSchema={
            "type": "object",
            "properties": {"session_id": {"type": "string"}},
            "required": ["session_id"],
        },
    ),
    types.Tool(
        name="create_meeting_session",
        description="Create a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "series_id": {"type": "string"},
                "session_type_id": {"type": "string"},
            },
            "required": ["name", "date"],
        },
    ),
    types.Tool(
        name="update_meeting_session",
        description="Update a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "name": {"type": "string"},
                "date": {"type": "string", "description": "YYYY-MM-DD"},
                "series_id": {"type": "string"},
                "session_type_id": {"type": "string"},
            },
            "required": ["session_id"],
        },
    ),
    types.Tool(
        name="delete_meeting_session",
        description="Delete a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {"session_id": {"type": "string"}},
            "required": ["session_id"],
        },
    ),
    types.Tool(
        name="update_meeting_session_status",
        description="Update the status of a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "status": {"type": "string"},
            },
            "required": ["session_id", "status"],
        },
    ),
    types.Tool(
        name="book_meeting_slot",
        description="Book a slot in a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "slot_id": {"type": "string"},
            },
            "required": ["session_id", "slot_id"],
        },
    ),
    types.Tool(
        name="unbook_meeting_slot",
        description="Unbook a slot in a meeting session.",
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {"type": "string"},
                "slot_id": {"type": "string"},
            },
            "required": ["session_id", "slot_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Session Types
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_session_types",
        description="List all session types.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_session_type",
        description="Get a session type by ID.",
        inputSchema={
            "type": "object",
            "properties": {"type_id": {"type": "string"}},
            "required": ["type_id"],
        },
    ),
    types.Tool(
        name="create_session_type",
        description="Create a session type.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "duration_minutes": {"type": "integer"},
                "description": {"type": "string"},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="update_session_type",
        description="Update a session type.",
        inputSchema={
            "type": "object",
            "properties": {
                "type_id": {"type": "string"},
                "name": {"type": "string"},
                "duration_minutes": {"type": "integer"},
                "description": {"type": "string"},
            },
            "required": ["type_id"],
        },
    ),
    types.Tool(
        name="delete_session_type",
        description="Delete a session type.",
        inputSchema={
            "type": "object",
            "properties": {"type_id": {"type": "string"}},
            "required": ["type_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Slot Locations
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_slot_locations",
        description="List all slot locations.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_slot_location",
        description="Get a slot location by ID.",
        inputSchema={
            "type": "object",
            "properties": {"location_id": {"type": "string"}},
            "required": ["location_id"],
        },
    ),
    types.Tool(
        name="create_slot_location",
        description="Create a slot location.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="update_slot_location",
        description="Update a slot location.",
        inputSchema={
            "type": "object",
            "properties": {
                "location_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["location_id"],
        },
    ),
    types.Tool(
        name="delete_slot_location",
        description="Delete a slot location.",
        inputSchema={
            "type": "object",
            "properties": {"location_id": {"type": "string"}},
            "required": ["location_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Wheels
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_wheels",
        description="List all wheels.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="create_wheel",
        description="Create a new wheel.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["name"],
        },
    ),
    types.Tool(
        name="delete_wheel",
        description="Delete a wheel.",
        inputSchema={
            "type": "object",
            "properties": {"wheel_id": {"type": "string"}},
            "required": ["wheel_id"],
        },
    ),
    types.Tool(
        name="add_wheel_participant",
        description="Add a participant to a wheel.",
        inputSchema={
            "type": "object",
            "properties": {
                "wheel_id": {"type": "string"},
                "member_id": {"type": "string"},
            },
            "required": ["wheel_id", "member_id"],
        },
    ),
    types.Tool(
        name="remove_wheel_participant",
        description="Remove a participant from a wheel.",
        inputSchema={
            "type": "object",
            "properties": {
                "wheel_id": {"type": "string"},
                "member_id": {"type": "string"},
            },
            "required": ["wheel_id", "member_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Win of the Week
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_win_of_week_current",
        description="Get the current win of the week.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="create_win_week_nomination",
        description="Create a nomination for win of the week.",
        inputSchema={
            "type": "object",
            "properties": {
                "member_id": {"type": "string"},
                "description": {"type": "string"},
            },
            "required": ["member_id", "description"],
        },
    ),
    types.Tool(
        name="vote_win_week",
        description="Vote for a win of the week nomination.",
        inputSchema={
            "type": "object",
            "properties": {"nomination_id": {"type": "string"}},
            "required": ["nomination_id"],
        },
    ),
    types.Tool(
        name="remove_vote_win_week",
        description="Remove vote from a win of the week nomination.",
        inputSchema={
            "type": "object",
            "properties": {"nomination_id": {"type": "string"}},
            "required": ["nomination_id"],
        },
    ),
    types.Tool(
        name="close_win_week",
        description="Close the current win of the week.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="open_next_win_week",
        description="Open the next win of the week.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="open_win_week_voting",
        description="Open voting for win of the week.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_win_week_history",
        description="Get win of the week history.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_win_week_detail",
        description="Get detail for a specific win of the week.",
        inputSchema={
            "type": "object",
            "properties": {"week_id": {"type": "string"}},
            "required": ["week_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Win of the Month
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_win_of_month_current",
        description="Get the current win of the month.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_win_of_month_history",
        description="Get win of the month history.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="vote_win_month",
        description="Vote for a win of the month nomination.",
        inputSchema={
            "type": "object",
            "properties": {"nomination_id": {"type": "string"}},
            "required": ["nomination_id"],
        },
    ),
    types.Tool(
        name="remove_vote_win_month",
        description="Remove vote from a win of the month nomination.",
        inputSchema={
            "type": "object",
            "properties": {"nomination_id": {"type": "string"}},
            "required": ["nomination_id"],
        },
    ),
    types.Tool(
        name="close_win_month",
        description="Close the current win of the month.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="generate_win_month",
        description="Generate win of the month from closed weeks.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="open_win_month",
        description="Open voting for win of the month.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),

    # ═══════════════════════════════════════════════════════════
    # Export
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="export_pptx",
        description="Export a PowerPoint presentation.",
        inputSchema={
            "type": "object",
            "properties": {
                "sprint_id": {"type": "string"},
                "template": {"type": "string"},
            },
            "required": [],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Progress
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_progress",
        description="Get all progress data.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),

    # ═══════════════════════════════════════════════════════════
    # Auth / Users
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="get_auth_mode",
        description="Get the current authentication mode.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="exchange_auth_code",
        description="Exchange an auth code for tokens.",
        inputSchema={
            "type": "object",
            "properties": {"code": {"type": "string"}},
            "required": ["code"],
        },
    ),
    types.Tool(
        name="get_unlinked_users",
        description="Get users that are not linked to team members.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="link_user",
        description="Link a user to a team member.",
        inputSchema={
            "type": "object",
            "properties": {
                "user_id": {"type": "string"},
                "member_id": {"type": "string"},
            },
            "required": ["user_id", "member_id"],
        },
    ),
    types.Tool(
        name="toggle_user_active",
        description="Toggle active status of a user.",
        inputSchema={
            "type": "object",
            "properties": {"user_id": {"type": "string"}},
            "required": ["user_id"],
        },
    ),

    # ═══════════════════════════════════════════════════════════
    # Coffee Run Menu Templates
    # ═══════════════════════════════════════════════════════════
    types.Tool(
        name="list_menu_templates",
        description="List all coffee run menu templates.",
        inputSchema={"type": "object", "properties": {}, "required": []},
    ),
    types.Tool(
        name="get_menu_template",
        description="Get a menu template detail by ID.",
        inputSchema={
            "type": "object",
            "properties": {"template_id": {"type": "string", "description": "Template UUID"}},
            "required": ["template_id"],
        },
    ),
    types.Tool(
        name="create_menu_template",
        description="Create a new menu template from an existing coffee run.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "copy_from_run_id": {"type": "string", "description": "Coffee run ID to copy menu from"},
            },
            "required": ["name", "copy_from_run_id"],
        },
    ),
    types.Tool(
        name="import_menu_template",
        description="Import a menu template from a JSON array of items.",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "items": {"type": "array", "items": {"type": "object"}, "description": "Array of {name, price?} objects"},
            },
            "required": ["name", "items"],
        },
    ),
    types.Tool(
        name="update_menu_template",
        description="Update a menu template name.",
        inputSchema={
            "type": "object",
            "properties": {
                "template_id": {"type": "string"},
                "name": {"type": "string"},
            },
            "required": ["template_id", "name"],
        },
    ),
    types.Tool(
        name="delete_menu_template",
        description="Delete a menu template.",
        inputSchema={
            "type": "object",
            "properties": {"template_id": {"type": "string"}},
            "required": ["template_id"],
        },
    ),
    types.Tool(
        name="add_menu_template_item",
        description="Add an item to a menu template.",
        inputSchema={
            "type": "object",
            "properties": {
                "template_id": {"type": "string"},
                "name": {"type": "string"},
                "price": {"type": "number", "description": "Optional price"},
            },
            "required": ["template_id", "name"],
        },
    ),
    types.Tool(
        name="update_menu_template_item",
        description="Update an item in a menu template.",
        inputSchema={
            "type": "object",
            "properties": {
                "template_id": {"type": "string"},
                "item_id": {"type": "string"},
                "name": {"type": "string"},
                "price": {"type": "number", "description": "Optional price"},
            },
            "required": ["template_id", "item_id"],
        },
    ),
    types.Tool(
        name="delete_menu_template_item",
        description="Delete an item from a menu template.",
        inputSchema={
            "type": "object",
            "properties": {"template_id": {"type": "string"}, "item_id": {"type": "string"}},
            "required": ["template_id", "item_id"],
        },
    ),
]


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return TOOLS


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    try:
        match name:
            # ── PIs ──
            case "list_pis":
                return await _get("/api/v1/pis")
            case "get_pi":
                return await _get(f"/api/v1/pis/{arguments['pi_id']}")
            case "create_pi":
                return await _post("/api/v1/pis", {
                    "name": arguments["name"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "description": arguments.get("description"),
                })
            case "update_pi":
                return await _put(f"/api/v1/pis/{arguments['pi_id']}", {
                    "name": arguments.get("name"),
                    "startDate": arguments.get("start_date"),
                    "endDate": arguments.get("end_date"),
                    "description": arguments.get("description"),
                })
            case "delete_pi":
                return await _delete(f"/api/v1/pis/{arguments['pi_id']}")

            # ── Sprints ──
            case "list_sprints":
                return await _get("/api/v1/sprints", {
                    "piId": arguments.get("pi_id"),
                    "from": arguments.get("from"),
                    "to": arguments.get("to"),
                })
            case "get_sprint":
                return await _get(f"/api/v1/sprints/{arguments['sprint_id']}")
            case "create_sprint":
                return await _post("/api/v1/sprints", {
                    "name": arguments["name"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "piId": arguments.get("pi_id"),
                    "sprintNumber": arguments.get("sprint_number"),
                    "isInnovationSprint": arguments.get("is_innovation_sprint", False),
                    "goal": arguments.get("goal"),
                })
            case "update_sprint":
                return await _put(f"/api/v1/sprints/{arguments['sprint_id']}", {
                    "name": arguments.get("name"),
                    "startDate": arguments.get("start_date"),
                    "endDate": arguments.get("end_date"),
                    "piId": arguments.get("pi_id"),
                    "sprintNumber": arguments.get("sprint_number"),
                    "isInnovationSprint": arguments.get("is_innovation_sprint"),
                    "goal": arguments.get("goal"),
                })
            case "delete_sprint":
                return await _delete(f"/api/v1/sprints/{arguments['sprint_id']}")
            case "close_sprint":
                return await _patch(f"/api/v1/sprints/{arguments['sprint_id']}/close")
            case "clone_sprint":
                return await _post(f"/api/v1/sprints/{arguments['sprint_id']}/clone", {
                    "newStartDate": arguments.get("new_start_date"),
                    "newEndDate": arguments.get("new_end_date"),
                    "newName": arguments.get("new_name"),
                })
            case "initialize_sprint_members":
                return await _post(f"/api/v1/sprints/{arguments['sprint_id']}/initialize-members", {})
            case "update_sprint_retro":
                return await _patch(f"/api/v1/sprints/{arguments['sprint_id']}/retro", {
                    "wentWell": arguments.get("went_well"),
                    "toImprove": arguments.get("to_improve"),
                    "actionItems": arguments.get("action_items"),
                })
            case "get_sprint_velocity":
                return await _get("/api/v1/sprints/velocity", {"piId": arguments.get("pi_id")})

            # ── Team Members ──
            case "list_team_members":
                return await _get("/api/v1/team-members", {
                    "role": arguments.get("role"),
                    "teamLeadId": arguments.get("team_lead_id"),
                    "isActive": arguments.get("is_active"),
                })
            case "get_team_member":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}")
            case "create_team_member":
                return await _post("/api/v1/team-members", {
                    "firstName": arguments["first_name"],
                    "lastName": arguments["last_name"],
                    "email": arguments["email"],
                    "role": arguments["role"],
                    "teamLeadId": arguments.get("team_lead_id"),
                    "crafts": arguments.get("crafts"),
                    "birthDate": arguments.get("birth_date"),
                    "joinDate": arguments.get("join_date"),
                })
            case "update_team_member":
                return await _put(f"/api/v1/team-members/{arguments['member_id']}", {
                    "firstName": arguments.get("first_name"),
                    "lastName": arguments.get("last_name"),
                    "email": arguments.get("email"),
                    "role": arguments.get("role"),
                    "teamLeadId": arguments.get("team_lead_id"),
                    "crafts": arguments.get("crafts"),
                    "birthDate": arguments.get("birth_date"),
                    "joinDate": arguments.get("join_date"),
                    "isActive": arguments.get("is_active"),
                })
            case "delete_team_member":
                return await _delete(f"/api/v1/team-members/{arguments['member_id']}")

            # ── Work Items ──
            case "list_work_items":
                return await _get(f"/api/v1/sprint-members/{arguments['sprint_member_id']}/work-items")
            case "get_work_item":
                return await _get(f"/api/v1/work-items/{arguments['work_item_id']}")
            case "create_work_item":
                return await _post(
                    f"/api/v1/sprint-members/{arguments['sprint_member_id']}/work-items",
                    {
                        "title": arguments["title"],
                        "type": arguments["type"],
                        "status": arguments["status"],
                        "description": arguments.get("description"),
                        "featureId": arguments.get("feature_id"),
                        "externalTicketRef": arguments.get("external_ticket_ref"),
                        "estimatedPoints": arguments.get("estimated_points"),
                        "actualPoints": arguments.get("actual_points"),
                        "completedDate": arguments.get("completed_date"),
                        "blockedReason": arguments.get("blocked_reason"),
                    },
                )
            case "update_work_item":
                return await _put(
                    f"/api/v1/work-items/{arguments['work_item_id']}",
                    {
                        "title": arguments.get("title"),
                        "type": arguments.get("type"),
                        "status": arguments.get("status"),
                        "description": arguments.get("description"),
                        "featureId": arguments.get("feature_id"),
                        "externalTicketRef": arguments.get("external_ticket_ref"),
                        "estimatedPoints": arguments.get("estimated_points"),
                        "actualPoints": arguments.get("actual_points"),
                        "completedDate": arguments.get("completed_date"),
                        "blockedReason": arguments.get("blocked_reason"),
                    },
                )
            case "update_work_item_status":
                return await _patch(
                    f"/api/v1/work-items/{arguments['work_item_id']}/status",
                    {"status": arguments["status"]},
                )
            case "carry_over_work_item":
                return await _post(
                    f"/api/v1/work-items/{arguments['work_item_id']}/carry-over",
                    {"targetSprintId": arguments.get("target_sprint_id")},
                )
            case "delete_work_item":
                return await _delete(f"/api/v1/work-items/{arguments['work_item_id']}")

            # ── Dashboard ──
            case "get_sprint_dashboard":
                return await _get(
                    f"/api/v1/dashboard/sprint/{arguments['sprint_id']}",
                    {"teamLeadId": arguments.get("team_lead_id")},
                )
            case "get_sprint_summary":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/summary")
            case "get_sprint_blockers":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/blockers")
            case "get_leave_summary":
                return await _get(f"/api/v1/dashboard/sprint/{arguments['sprint_id']}/leave-summary")

            # ── Leave Records ──
            case "list_leave_records":
                return await _get("/api/v1/leave-records", {
                    "teamMemberId": arguments.get("team_member_id"),
                    "sprintId": arguments.get("sprint_id"),
                    "from": arguments.get("from"),
                    "to": arguments.get("to"),
                })
            case "create_leave_record":
                return await _post("/api/v1/leave-records", {
                    "teamMemberId": arguments["team_member_id"],
                    "startDate": arguments["start_date"],
                    "endDate": arguments["end_date"],
                    "type": arguments["type"],
                    "daysCount": arguments["days_count"],
                    "notes": arguments.get("notes"),
                })
            case "update_leave_record":
                return await _put(f"/api/v1/leave-records/{arguments['leave_id']}", {
                    "startDate": arguments.get("start_date"),
                    "endDate": arguments.get("end_date"),
                    "type": arguments.get("type"),
                    "daysCount": arguments.get("days_count"),
                    "notes": arguments.get("notes"),
                })
            case "delete_leave_record":
                return await _delete(f"/api/v1/leave-records/{arguments['leave_id']}")
            case "import_leave_records":
                return await _post("/api/v1/leave-records/import", {
                    "records": arguments["records"],
                })
            case "fetch_leave_preview":
                return await _post("/api/v1/leave-records/fetch-preview", {})
            case "fetch_leave_records":
                return await _post("/api/v1/leave-records/fetch", {})

            # ── Leaderboard ──
            case "get_leaderboard":
                return await _get("/api/v1/leaderboard")
            case "get_leaderboard_member_stats":
                return await _get(f"/api/v1/leaderboard/member/{arguments['member_id']}")
            case "get_leaderboard_member_history":
                return await _get(f"/api/v1/leaderboard/member/{arguments['member_id']}/history")
            case "award_points":
                return await _post("/api/v1/leaderboard/award", {
                    "teamMemberId": arguments["team_member_id"],
                    "points": arguments["points"],
                    "reason": arguments["reason"],
                })
            case "revoke_points":
                return await _delete(f"/api/v1/leaderboard/award/{arguments['award_id']}")

            # ── Sprint Members ──
            case "get_sprint_members":
                return await _get(f"/api/v1/sprint-members/sprint/{arguments['sprint_id']}")
            case "update_sprint_member_notes":
                return await _patch(f"/api/v1/sprint-members/{arguments['sprint_member_id']}/notes", {
                    "notes": arguments["notes"],
                })
            case "update_sprint_member_capacity":
                return await _patch(f"/api/v1/sprint-members/{arguments['sprint_member_id']}/capacity", {
                    "capacity": arguments["capacity"],
                })

            # ── Features ──
            case "list_sprint_features":
                return await _get(f"/api/v1/sprints/{arguments['sprint_id']}/features")
            case "create_sprint_feature":
                return await _post(f"/api/v1/sprints/{arguments['sprint_id']}/features", {
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                    "status": arguments.get("status"),
                })
            case "update_sprint_feature":
                return await _put(f"/api/v1/sprints/{arguments['sprint_id']}/features/{arguments['feature_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                    "status": arguments.get("status"),
                })
            case "delete_sprint_feature":
                return await _delete(f"/api/v1/sprints/{arguments['sprint_id']}/features/{arguments['feature_id']}")
            case "toggle_feature_active":
                return await _patch(f"/api/v1/sprints/{arguments['sprint_id']}/features/{arguments['feature_id']}/toggle-active", {})
            case "list_all_features":
                return await _get("/api/v1/features", {
                    "status": arguments.get("status"),
                    "piId": arguments.get("pi_id"),
                })
            case "set_feature_status":
                return await _patch(f"/api/v1/features/{arguments['feature_id']}/status", {
                    "status": arguments["status"],
                })

            # ── Retro Actions ──
            case "list_retro_actions":
                return await _get("/api/v1/retro-actions", {"sprintId": arguments.get("sprint_id")})
            case "create_retro_action":
                return await _post("/api/v1/retro-actions", {
                    "sprintId": arguments["sprint_id"],
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                    "assigneeId": arguments.get("assignee_id"),
                })
            case "update_retro_action":
                return await _put(f"/api/v1/retro-actions/{arguments['retro_action_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                    "assigneeId": arguments.get("assignee_id"),
                    "isCompleted": arguments.get("is_completed"),
                })
            case "delete_retro_action":
                return await _delete(f"/api/v1/retro-actions/{arguments['retro_action_id']}")

            # ── Sprint Votes ──
            case "get_sprint_votes":
                return await _get(f"/api/v1/sprints/{arguments['sprint_id']}/votes")
            case "cast_sprint_vote":
                return await _post(f"/api/v1/sprints/{arguments['sprint_id']}/votes", {
                    "targetId": arguments["target_id"],
                    "voteType": arguments.get("vote_type"),
                })
            case "award_sprint_mvp":
                return await _post(f"/api/v1/sprints/{arguments['sprint_id']}/votes/award-mvp", {
                    "memberId": arguments["member_id"],
                })

            # ── Comments ──
            case "get_comments":
                return await _get(f"/api/v1/comments/{arguments['entity_type']}/{arguments['entity_id']}")
            case "create_comment":
                return await _post("/api/v1/comments", {
                    "entityType": arguments["entity_type"],
                    "entityId": arguments["entity_id"],
                    "content": arguments["content"],
                })
            case "delete_comment":
                return await _delete(f"/api/v1/comments/{arguments['comment_id']}")

            # ── Achievements ──
            case "list_achievements":
                return await _get("/api/v1/achievements")
            case "get_member_achievements":
                return await _get(f"/api/v1/achievements/member/{arguments['member_id']}")
            case "award_achievement":
                return await _post("/api/v1/achievements/award", {
                    "memberId": arguments["member_id"],
                    "achievementType": arguments["achievement_type"],
                    "reason": arguments.get("reason"),
                })
            case "revoke_achievement":
                return await _delete(f"/api/v1/achievements/{arguments['achievement_id']}")

            # ── Timesheets ──
            case "get_timesheets":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/timesheets", {
                    "year": arguments.get("year"),
                    "month": arguments.get("month"),
                })
            case "create_timesheet_entry":
                return await _post(f"/api/v1/team-members/{arguments['member_id']}/timesheets", {
                    "date": arguments["date"],
                    "hours": arguments["hours"],
                    "description": arguments.get("description"),
                    "project": arguments.get("project"),
                    "category": arguments.get("category"),
                })
            case "update_timesheet_entry":
                return await _put(f"/api/v1/team-members/{arguments['member_id']}/timesheets/{arguments['entry_id']}", {
                    "date": arguments.get("date"),
                    "hours": arguments.get("hours"),
                    "description": arguments.get("description"),
                    "project": arguments.get("project"),
                    "category": arguments.get("category"),
                })
            case "delete_timesheet_entry":
                return await _delete(f"/api/v1/team-members/{arguments['member_id']}/timesheets/{arguments['entry_id']}")
            case "export_timesheet":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/timesheets/export", {
                    "year": arguments.get("year"),
                    "month": arguments.get("month"),
                })

            # ── Timesheet Config ──
            case "get_timesheet_config":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/timesheet-config")
            case "update_timesheet_config":
                return await _put(f"/api/v1/team-members/{arguments['member_id']}/timesheet-config", {
                    "config": arguments["config"],
                })

            # ── Member Personal ──
            case "get_member_personal":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/personal")
            case "update_member_personal":
                return await _put(f"/api/v1/team-members/{arguments['member_id']}/personal", {
                    "personalInfo": arguments["personal_info"],
                })
            case "get_member_skills":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/skills")
            case "create_member_skill":
                return await _post(f"/api/v1/team-members/{arguments['member_id']}/skills", {
                    "skillName": arguments["skill_name"],
                    "level": arguments.get("level"),
                })
            case "add_skill_rating":
                return await _post(f"/api/v1/team-members/{arguments['member_id']}/skills/{arguments['skill_id']}/ratings", {
                    "rating": arguments["rating"],
                    "notes": arguments.get("notes"),
                })
            case "delete_member_skill":
                return await _delete(f"/api/v1/team-members/{arguments['member_id']}/skills/{arguments['skill_id']}")
            case "get_member_notes":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/notes")
            case "create_member_note":
                return await _post(f"/api/v1/team-members/{arguments['member_id']}/notes", {
                    "content": arguments["content"],
                })
            case "delete_member_note":
                return await _delete(f"/api/v1/team-members/{arguments['member_id']}/notes/{arguments['note_id']}")
            case "get_member_tasks":
                return await _get(f"/api/v1/team-members/{arguments['member_id']}/tasks")
            case "create_member_task":
                return await _post(f"/api/v1/team-members/{arguments['member_id']}/tasks", {
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                    "dueDate": arguments.get("due_date"),
                })
            case "update_member_task":
                return await _patch(f"/api/v1/team-members/{arguments['member_id']}/tasks/{arguments['task_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                    "dueDate": arguments.get("due_date"),
                    "isCompleted": arguments.get("is_completed"),
                })
            case "delete_member_task":
                return await _delete(f"/api/v1/team-members/{arguments['member_id']}/tasks/{arguments['task_id']}")

            # ── Squads ──
            case "list_squads":
                return await _get("/api/v1/squads")
            case "get_squad":
                return await _get(f"/api/v1/squads/{arguments['squad_id']}")
            case "create_squad":
                return await _post("/api/v1/squads", {
                    "name": arguments["name"],
                    "description": arguments.get("description"),
                    "memberIds": arguments.get("member_ids"),
                })
            case "update_squad":
                return await _put(f"/api/v1/squads/{arguments['squad_id']}", {
                    "name": arguments.get("name"),
                    "description": arguments.get("description"),
                    "memberIds": arguments.get("member_ids"),
                })
            case "delete_squad":
                return await _delete(f"/api/v1/squads/{arguments['squad_id']}")
            case "set_squad_members":
                return await _put(f"/api/v1/squads/{arguments['squad_id']}/members", {
                    "memberIds": arguments["member_ids"],
                })
            case "set_member_squads":
                return await _put(f"/api/v1/team-members/{arguments['member_id']}/squads", {
                    "squadIds": arguments["squad_ids"],
                })

            # ── Discussion Points ──
            case "list_discussion_points":
                return await _get("/api/v1/discussion-points")
            case "create_discussion_point":
                return await _post("/api/v1/discussion-points", {
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                })
            case "update_discussion_point":
                return await _put(f"/api/v1/discussion-points/{arguments['discussion_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                })
            case "delete_discussion_point":
                return await _delete(f"/api/v1/discussion-points/{arguments['discussion_id']}")
            case "get_discussion_tasks":
                return await _get(f"/api/v1/discussion-points/{arguments['discussion_id']}/tasks")
            case "create_discussion_task":
                return await _post(f"/api/v1/discussion-points/{arguments['discussion_id']}/tasks", {
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                })
            case "update_discussion_task":
                return await _put(f"/api/v1/discussion-points/{arguments['discussion_id']}/tasks/{arguments['task_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                    "isCompleted": arguments.get("is_completed"),
                })
            case "delete_discussion_task":
                return await _delete(f"/api/v1/discussion-points/{arguments['discussion_id']}/tasks/{arguments['task_id']}")
            case "toggle_discussion_task":
                return await _post(f"/api/v1/discussion-points/{arguments['discussion_id']}/tasks/{arguments['task_id']}/toggle", {})

            # ── Meeting Series ──
            case "list_meeting_series":
                return await _get("/api/v1/meeting-series")
            case "get_meeting_series":
                return await _get(f"/api/v1/meeting-series/{arguments['series_id']}")
            case "create_meeting_series":
                return await _post("/api/v1/meeting-series", {
                    "name": arguments["name"],
                    "description": arguments.get("description"),
                    "recurrence": arguments.get("recurrence"),
                })
            case "update_meeting_series":
                return await _put(f"/api/v1/meeting-series/{arguments['series_id']}", {
                    "name": arguments.get("name"),
                    "description": arguments.get("description"),
                    "recurrence": arguments.get("recurrence"),
                })
            case "delete_meeting_series":
                return await _delete(f"/api/v1/meeting-series/{arguments['series_id']}")
            case "get_meeting_series_slots":
                return await _get(f"/api/v1/meeting-series/{arguments['series_id']}/slots")
            case "create_meeting_series_slots":
                return await _post(f"/api/v1/meeting-series/{arguments['series_id']}/slots", {
                    "slots": arguments["slots"],
                })
            case "update_meeting_series_slot":
                return await _put(f"/api/v1/meeting-series/{arguments['series_id']}/slots/{arguments['slot_id']}", {
                    "time": arguments.get("time"),
                    "locationId": arguments.get("location_id"),
                })
            case "delete_meeting_series_slot":
                return await _delete(f"/api/v1/meeting-series/{arguments['series_id']}/slots/{arguments['slot_id']}")
            case "get_meeting_series_items":
                return await _get(f"/api/v1/meeting-series/{arguments['series_id']}/items")
            case "create_meeting_series_item":
                return await _post(f"/api/v1/meeting-series/{arguments['series_id']}/items", {
                    "title": arguments["title"],
                    "description": arguments.get("description"),
                })
            case "update_meeting_series_item":
                return await _put(f"/api/v1/meeting-series/{arguments['series_id']}/items/{arguments['item_id']}", {
                    "title": arguments.get("title"),
                    "description": arguments.get("description"),
                })
            case "delete_meeting_series_item":
                return await _delete(f"/api/v1/meeting-series/{arguments['series_id']}/items/{arguments['item_id']}")
            case "unconfirm_meeting_item":
                return await _post(f"/api/v1/meeting-series/items/{arguments['item_id']}/unconfirm", {})
            case "get_my_meeting_series":
                return await _get("/api/v1/meeting-series/my-series")
            case "get_my_meetings":
                return await _get("/api/v1/meeting-series/my-meetings")
            case "get_item_availability":
                return await _get(f"/api/v1/meeting-series/items/{arguments['item_id']}/availability")
            case "add_item_availability":
                return await _post(f"/api/v1/meeting-series/items/{arguments['item_id']}/availability", {
                    "slotIds": arguments["slot_ids"],
                })
            case "remove_item_availability":
                return await _delete(f"/api/v1/meeting-series/items/{arguments['item_id']}/availability/{arguments['availability_id']}")
            case "get_bulk_availability":
                return await _get(f"/api/v1/meeting-series/{arguments['series_id']}/bulk-availability")
            case "submit_bulk_availability":
                return await _post(f"/api/v1/meeting-series/{arguments['series_id']}/bulk-availability", {
                    "availability": arguments["availability"],
                })
            case "get_my_availability":
                return await _get(f"/api/v1/meeting-series/{arguments['series_id']}/my-availability")
            case "set_my_availability":
                return await _post(f"/api/v1/meeting-series/{arguments['series_id']}/my-availability", {
                    "slotIds": arguments["slot_ids"],
                })

            # ── Meeting Sessions ──
            case "list_meeting_sessions":
                return await _get("/api/v1/meeting-sessions")
            case "get_meeting_session":
                return await _get(f"/api/v1/meeting-sessions/{arguments['session_id']}")
            case "create_meeting_session":
                return await _post("/api/v1/meeting-sessions", {
                    "name": arguments["name"],
                    "date": arguments["date"],
                    "seriesId": arguments.get("series_id"),
                    "sessionTypeId": arguments.get("session_type_id"),
                })
            case "update_meeting_session":
                return await _put(f"/api/v1/meeting-sessions/{arguments['session_id']}", {
                    "name": arguments.get("name"),
                    "date": arguments.get("date"),
                    "seriesId": arguments.get("series_id"),
                    "sessionTypeId": arguments.get("session_type_id"),
                })
            case "delete_meeting_session":
                return await _delete(f"/api/v1/meeting-sessions/{arguments['session_id']}")
            case "update_meeting_session_status":
                return await _patch(f"/api/v1/meeting-sessions/{arguments['session_id']}/status", {
                    "status": arguments["status"],
                })
            case "book_meeting_slot":
                return await _post(f"/api/v1/meeting-sessions/{arguments['session_id']}/slots/{arguments['slot_id']}/book", {})
            case "unbook_meeting_slot":
                return await _delete(f"/api/v1/meeting-sessions/{arguments['session_id']}/slots/{arguments['slot_id']}/book")

            # ── Session Types ──
            case "list_session_types":
                return await _get("/api/v1/session-types")
            case "get_session_type":
                return await _get(f"/api/v1/session-types/{arguments['type_id']}")
            case "create_session_type":
                return await _post("/api/v1/session-types", {
                    "name": arguments["name"],
                    "durationMinutes": arguments.get("duration_minutes"),
                    "description": arguments.get("description"),
                })
            case "update_session_type":
                return await _put(f"/api/v1/session-types/{arguments['type_id']}", {
                    "name": arguments.get("name"),
                    "durationMinutes": arguments.get("duration_minutes"),
                    "description": arguments.get("description"),
                })
            case "delete_session_type":
                return await _delete(f"/api/v1/session-types/{arguments['type_id']}")

            # ── Slot Locations ──
            case "list_slot_locations":
                return await _get("/api/v1/slot-locations")
            case "get_slot_location":
                return await _get(f"/api/v1/slot-locations/{arguments['location_id']}")
            case "create_slot_location":
                return await _post("/api/v1/slot-locations", {
                    "name": arguments["name"],
                    "description": arguments.get("description"),
                })
            case "update_slot_location":
                return await _put(f"/api/v1/slot-locations/{arguments['location_id']}", {
                    "name": arguments.get("name"),
                    "description": arguments.get("description"),
                })
            case "delete_slot_location":
                return await _delete(f"/api/v1/slot-locations/{arguments['location_id']}")

            # ── Wheels ──
            case "list_wheels":
                return await _get("/api/v1/wheels")
            case "create_wheel":
                return await _post("/api/v1/wheels", {
                    "name": arguments["name"],
                    "description": arguments.get("description"),
                })
            case "delete_wheel":
                return await _delete(f"/api/v1/wheels/{arguments['wheel_id']}")
            case "add_wheel_participant":
                return await _post(f"/api/v1/wheels/{arguments['wheel_id']}/participants/{arguments['member_id']}", {})
            case "remove_wheel_participant":
                return await _delete(f"/api/v1/wheels/{arguments['wheel_id']}/participants/{arguments['member_id']}")

            # ── Win of the Week ──
            case "get_win_of_week_current":
                return await _get("/api/v1/win-of-the-week/current")
            case "create_win_week_nomination":
                return await _post("/api/v1/win-of-the-week/nominations", {
                    "memberId": arguments["member_id"],
                    "description": arguments["description"],
                })
            case "vote_win_week":
                return await _post(f"/api/v1/win-of-the-week/nominations/{arguments['nomination_id']}/vote", {})
            case "remove_vote_win_week":
                return await _delete(f"/api/v1/win-of-the-week/nominations/{arguments['nomination_id']}/vote")
            case "close_win_week":
                return await _post("/api/v1/win-of-the-week/close", {})
            case "open_next_win_week":
                return await _post("/api/v1/win-of-the-week/open-next", {})
            case "open_win_week_voting":
                return await _post("/api/v1/win-of-the-week/open-voting", {})
            case "get_win_week_history":
                return await _get("/api/v1/win-of-the-week/history")
            case "get_win_week_detail":
                return await _get(f"/api/v1/win-of-the-week/weeks/{arguments['week_id']}")

            # ── Win of the Month ──
            case "get_win_of_month_current":
                return await _get("/api/v1/win-of-the-month/current")
            case "get_win_of_month_history":
                return await _get("/api/v1/win-of-the-month/history")
            case "vote_win_month":
                return await _post(f"/api/v1/win-of-the-month/nominations/{arguments['nomination_id']}/vote", {})
            case "remove_vote_win_month":
                return await _delete(f"/api/v1/win-of-the-month/nominations/{arguments['nomination_id']}/vote")
            case "close_win_month":
                return await _post("/api/v1/win-of-the-month/close", {})
            case "generate_win_month":
                return await _post("/api/v1/win-of-the-month/generate", {})
            case "open_win_month":
                return await _post("/api/v1/win-of-the-month/open", {})

            # ── Export ──
            case "export_pptx":
                return await _post("/api/v1/export/pptx", {
                    "sprintId": arguments.get("sprint_id"),
                    "template": arguments.get("template"),
                })

            # ── Progress ──
            case "get_progress":
                return await _get("/api/v1/progress")

            # ── Auth / Users ──
            case "get_auth_mode":
                return await _get("/api/auth-mode")
            case "exchange_auth_code":
                return await _post("/api/auth/exchange", {"code": arguments["code"]})
            case "get_unlinked_users":
                return await _get("/api/users/unlinked")
            case "link_user":
                return await _post("/api/users/link", {
                    "userId": arguments["user_id"],
                    "memberId": arguments["member_id"],
                })
            case "toggle_user_active":
                return await _patch(f"/api/users/{arguments['user_id']}/toggle", {})

            # ── Coffee Run Menu Templates ──
            case "list_menu_templates":
                return await _get("/api/v1/coffee-run-menu-templates")
            case "get_menu_template":
                return await _get(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}")
            case "create_menu_template":
                return await _post("/api/v1/coffee-run-menu-templates", {
                    "name": arguments["name"],
                    "copyFromRunId": arguments["copy_from_run_id"],
                })
            case "import_menu_template":
                return await _post("/api/v1/coffee-run-menu-templates/import", {
                    "name": arguments["name"],
                    "items": arguments["items"],
                })
            case "update_menu_template":
                return await _put(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}", {
                    "name": arguments.get("name"),
                })
            case "delete_menu_template":
                return await _delete(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}")
            case "add_menu_template_item":
                body = {"name": arguments["name"]}
                if "price" in arguments:
                    body["price"] = arguments["price"]
                return await _post(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}/items", body)
            case "update_menu_template_item":
                body = {}
                if "name" in arguments:
                    body["name"] = arguments["name"]
                if "price" in arguments:
                    body["price"] = arguments["price"]
                return await _put(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}/items/{arguments['item_id']}", body)
            case "delete_menu_template_item":
                return await _delete(f"/api/v1/coffee-run-menu-templates/{arguments['template_id']}/items/{arguments['item_id']}")

            case _:
                return _err(f"Unknown tool: {name}")
    except httpx.HTTPStatusError as e:
        return _err(f"HTTP {e.response.status_code}: {e.response.text}")
    except httpx.RequestError as e:
        return _err(f"Request failed: {e}")


async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
