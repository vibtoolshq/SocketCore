# SocketCore Security Policy

**A reusable WebSocket core for real-time Node.js applications.**

SocketCore provides configurable WebSocket transport controls, but no software can be represented as vulnerability-free. The repository has not published a security certification or guaranteed response time.

## Reporting a Vulnerability

Please do not publish an unpatched vulnerability, exploit details, credentials, or personal data in a public issue or pull request. Send a private report to [support@vib.tools](mailto:support@vib.tools) with:

- Affected SocketCore version or commit.
- A concise description of the security impact.
- A minimal, non-destructive reproduction or proof of concept.
- Relevant environment details and any mitigations already identified.

Redact tokens, private keys, production URLs, and user data. Do not attach real credentials or customer information.

No response or remediation SLA is currently published. The project owner can acknowledge, investigate, and coordinate disclosure after a fix or mitigation is available.

## Deployment Security Notes

- The standalone sample reads tokens from environment variables, uses plain HTTP, accepts a missing `Origin`, and does not provide token issuance or rotation.
- Origin validation is not authentication. Require an authentication callback and application-level authorization for protected actions.
- The engine default denies group subscriptions. Configure and test a subscription authorizer if groups are used.
- The standalone app does not set a URL path policy, inspect trusted proxy headers, provide TLS, or include a health endpoint.
- Optional global message-rate and aggregate buffered-byte limits are disabled by default; choose finite deployment values based on tested workload.
- Do not expose secrets through logs, URLs, metrics attributes, or public support reports.

See [Production Deployment Boundaries](docs/PRODUCTION_DEPLOYMENT.md) for the operator checklist. These notes describe current implementation boundaries and are not a security certification.
