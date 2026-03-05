# Security Policy

## Supported Versions

LinClaw is under active development. Security fixes are prioritized on the default branch:

- `main`: supported
- Other branches/tags: best effort

## Reporting a Vulnerability

If you find a security vulnerability, please report it privately:

1. Open a GitHub Security Advisory:
   - `Security` tab -> `Report a vulnerability`
2. Or send an email to the maintainer with:
   - affected version/commit
   - reproduction steps
   - impact/risk description
   - suggested remediation (optional)

Please do not open a public issue for unpatched vulnerabilities.

## Response SLA

- Initial response target: within 3 business days
- Triage target: within 7 business days
- Patch + disclosure timeline: based on severity and ecosystem impact

## Repository Security Baseline

This repository uses:

- GitHub CodeQL (`.github/workflows/codeql.yml`)
- Dependabot updates (`.github/dependabot.yml`)

## Secrets and Keys (Important)

For CodeQL and Dependabot in GitHub Actions:

- No extra API key is required in normal cases.
- `secrets.GITHUB_TOKEN` is automatically provided by GitHub Actions.

Potential exceptions:

- Private repositories may require GitHub Advanced Security entitlement for full Code Scanning features.
- Third-party scanners (for example Snyk/Semgrep SaaS) usually need their own tokens.
