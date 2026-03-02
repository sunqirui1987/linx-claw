#!/usr/bin/env python3
"""Optional post-install: run aicraw init --defaults --accept-security if not yet initialized."""
from __future__ import annotations

import subprocess
import sys


def main() -> int:
    from aicraw.config.utils import get_config_path

    if get_config_path().is_file():
        return 0
    return subprocess.call(
        [sys.executable, "-m", "aicraw", "init", "--defaults", "--accept-security"],
    )


if __name__ == "__main__":
    sys.exit(main())
