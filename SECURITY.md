# Security Policy

[中文版本](SECURITY.zh-CN.md)

## Supported versions

Security fixes are provided on the latest `main` branch.

| Version | Supported |
| --- | --- |
| main (latest) | Yes |
| historical snapshots | No |

## How to report a vulnerability

Please avoid public disclosure before triage.

1. If GitHub Security Advisories is enabled, use private vulnerability reporting.
2. If not available, contact maintainers privately and include:
- vulnerability type and impact
- affected file(s)/endpoint(s)
- proof-of-concept or reproduction steps
- suggested remediation (if any)

## Response targets

- Initial acknowledgment: within 72 hours
- Triage decision: within 7 days
- Fix timeline: depends on severity and exploitability

## Scope focus

- backend API input validation and injection risks
- SSR/API proxy behavior in frontend
- secret management and environment isolation
- third-party data source trust boundaries

## Safe harbor

Good-faith research and responsible disclosure are appreciated.
Do not access user funds, private keys, or production systems without explicit permission.
