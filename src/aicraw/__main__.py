# -*- coding: utf-8 -*-
"""Allow running LinClaw via ``python -m aicraw``."""
from .cli.main import cli

if __name__ == "__main__":
    cli()  # pylint: disable=no-value-for-parameter
