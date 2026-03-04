# -*- coding: utf-8 -*-
"""Agent file management API."""

from typing import Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

from ...config import (
    load_config,
    save_config,
    AgentsRunningConfig,
)
from ...config.config import (
    ActiveHoursConfig,
    HeartbeatConfig,
)

from ...agents.memory.agent_md_manager import AGENT_MD_MANAGER
from ...agents.utils import copy_md_files
from ...providers import get_active_llm_config, load_providers_json, mask_api_key

router = APIRouter(prefix="/agent", tags=["agent"])


class InitStatusResponse(BaseModel):
    """Whether first-time init is needed."""

    needs_init: bool = Field(..., description="True if config missing or no active LLM")
    reason: Optional[str] = Field(None, description="Reason when needs_init is True")


@router.get(
    "/init-status",
    response_model=InitStatusResponse,
    summary="Check if first-time init is needed",
    description="Returns needs_init=True when no active LLM is configured (primary blocker).",
)
async def get_init_status() -> InitStatusResponse:
    """Check if the user needs to run first-time setup."""
    active_llm = get_active_llm_config()
    if active_llm is None:
        return InitStatusResponse(needs_init=True, reason="no_active_llm")
    return InitStatusResponse(needs_init=False)


class MdFileInfo(BaseModel):
    """Markdown file metadata."""

    filename: str = Field(..., description="File name")
    path: str = Field(..., description="File path")
    size: int = Field(..., description="Size in bytes")
    created_time: str = Field(..., description="Created time")
    modified_time: str = Field(..., description="Modified time")


class MdFileContent(BaseModel):
    """Markdown file content."""

    content: str = Field(..., description="File content")


class ActiveHoursRequest(BaseModel):
    """Active hours for heartbeat (e.g. 08:00–22:00)."""

    start: str = Field(default="08:00", description="Start time (HH:MM)")
    end: str = Field(default="22:00", description="End time (HH:MM)")


class HeartbeatConfigRequest(BaseModel):
    """Heartbeat configuration request."""

    every: str = Field(default="30m", description="Interval (e.g. 30m, 1h)")
    target: str = Field(
        default="main",
        description="Target: main (no dispatch) or last (dispatch to last channel)",
    )
    active_hours: Optional[ActiveHoursRequest] = Field(
        default=None,
        description="Optional active window; null = run 24h",
    )


class DefaultsConfigResponse(BaseModel):
    """Defaults config (heartbeat, show_tool_details, language, openai_api_key)."""

    heartbeat: Optional[HeartbeatConfig] = None
    show_tool_details: bool = True
    language: str = "zh"
    openai_api_key: str = ""


class DefaultsConfigRequest(BaseModel):
    """Defaults config update request."""

    heartbeat: Optional[HeartbeatConfigRequest] = None
    show_tool_details: bool = True
    language: str = "zh"
    openai_api_key: Optional[str] = None


class InstallMdTemplatesRequest(BaseModel):
    """Install MD templates request."""

    language: str = Field(default="zh", description="Language: zh or en")


@router.get(
    "/files",
    response_model=list[MdFileInfo],
    summary="List working files",
    description="List all working files",
)
async def list_working_files() -> list[MdFileInfo]:
    """List working directory markdown files."""
    try:
        files = [
            MdFileInfo.model_validate(file)
            for file in AGENT_MD_MANAGER.list_working_mds()
        ]
        return files
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/files/{md_name}",
    response_model=MdFileContent,
    summary="Read a working file",
    description="Read a working markdown file",
)
async def read_working_file(
    md_name: str,
) -> MdFileContent:
    """Read a working directory markdown file."""
    try:
        content = AGENT_MD_MANAGER.read_working_md(md_name)
        return MdFileContent(content=content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put(
    "/files/{md_name}",
    response_model=dict,
    summary="Write a working file",
    description="Create or update a working file",
)
async def write_working_file(
    md_name: str,
    request: MdFileContent,
) -> dict:
    """Write a working directory markdown file."""
    try:
        AGENT_MD_MANAGER.write_working_md(md_name, request.content)
        return {"written": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/memory",
    response_model=list[MdFileInfo],
    summary="List memory files",
    description="List all memory files",
)
async def list_memory_files() -> list[MdFileInfo]:
    """List memory directory markdown files."""
    try:
        files = [
            MdFileInfo.model_validate(file)
            for file in AGENT_MD_MANAGER.list_memory_mds()
        ]
        return files
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/memory/{md_name}",
    response_model=MdFileContent,
    summary="Read a memory file",
    description="Read a memory markdown file",
)
async def read_memory_file(
    md_name: str,
) -> MdFileContent:
    """Read a memory directory markdown file."""
    try:
        content = AGENT_MD_MANAGER.read_memory_md(md_name)
        return MdFileContent(content=content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put(
    "/memory/{md_name}",
    response_model=dict,
    summary="Write a memory file",
    description="Create or update a memory file",
)
async def write_memory_file(
    md_name: str,
    request: MdFileContent,
) -> dict:
    """Write a memory directory markdown file."""
    try:
        AGENT_MD_MANAGER.write_memory_md(md_name, request.content)
        return {"written": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get(
    "/running-config",
    response_model=AgentsRunningConfig,
    summary="Get agent running config",
    description="Retrieve agent runtime behavior configuration",
)
async def get_agents_running_config() -> AgentsRunningConfig:
    """Get agent running configuration."""
    config = load_config()
    return config.agents.running


@router.put(
    "/running-config",
    response_model=AgentsRunningConfig,
    summary="Update agent running config",
    description="Update agent runtime behavior configuration",
)
async def put_agents_running_config(
    running_config: AgentsRunningConfig = Body(
        ...,
        description="Updated agent running configuration",
    ),
) -> AgentsRunningConfig:
    """Update agent running configuration."""
    config = load_config()
    config.agents.running = running_config
    save_config(config)
    return running_config


@router.get(
    "/defaults-config",
    response_model=DefaultsConfigResponse,
    summary="Get defaults config",
    description="Retrieve heartbeat, show_tool_details, and language config",
)
async def get_defaults_config() -> DefaultsConfigResponse:
    """Get defaults configuration."""
    config = load_config()
    return DefaultsConfigResponse(
        heartbeat=config.agents.defaults.heartbeat,
        show_tool_details=config.show_tool_details,
        language=config.agents.language,
        openai_api_key=mask_api_key(getattr(config, "openai_api_key", "") or ""),
    )


@router.put(
    "/defaults-config",
    response_model=DefaultsConfigResponse,
    summary="Update defaults config",
    description="Update heartbeat, show_tool_details, and language config",
)
async def put_defaults_config(
    body: DefaultsConfigRequest = Body(
        ...,
        description="Updated defaults configuration",
    ),
) -> DefaultsConfigResponse:
    """Update defaults configuration."""
    config = load_config()
    if body.heartbeat is not None:
        active_hours = None
        if body.heartbeat.active_hours is not None:
            active_hours = ActiveHoursConfig(
                start=body.heartbeat.active_hours.start,
                end=body.heartbeat.active_hours.end,
            )
        config.agents.defaults.heartbeat = HeartbeatConfig(
            every=body.heartbeat.every,
            target=body.heartbeat.target,
            active_hours=active_hours,
        )
    config.show_tool_details = body.show_tool_details
    if body.language in ("zh", "en"):
        config.agents.language = body.language
    if body.openai_api_key is not None:
        val = body.openai_api_key or ""
        # Skip update if value looks like masked (user did not change it)
        if "*" not in val:
            config.openai_api_key = val
    save_config(config)
    return DefaultsConfigResponse(
        heartbeat=config.agents.defaults.heartbeat,
        show_tool_details=config.show_tool_details,
        language=config.agents.language,
        openai_api_key=mask_api_key(getattr(config, "openai_api_key", "") or ""),
    )


@router.post(
    "/install-md-templates",
    response_model=dict,
    summary="Install MD templates",
    description="Copy MD templates (SOUL.md, HEARTBEAT.md, etc.) to working dir",
)
async def install_md_templates(
    body: InstallMdTemplatesRequest = Body(
        ...,
        description="Language for templates",
    ),
) -> dict:
    """Install MD templates for the given language."""
    if body.language not in ("zh", "en"):
        raise HTTPException(
            status_code=400,
            detail="language must be 'zh' or 'en'",
        )
    copied = copy_md_files(body.language, skip_existing=True)
    config = load_config()
    config.agents.language = body.language
    config.agents.installed_md_files_language = body.language
    save_config(config)
    return {"copied": copied, "language": body.language}
