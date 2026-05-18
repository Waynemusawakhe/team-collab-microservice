# ITRI615 Theory Component: Secure Team Collaboration Microservice

## 1. Microservice Scenario

This project implements a secure team collaboration platform. Users can register, log in, create teams, add team members, assign team roles, create tasks, and assign those tasks to specific team members.

The data must be protected because it includes user identities, team membership, role assignments, and work tasks. If this data is exposed or modified by an unauthorized user, an attacker could view private project information, assign work to the wrong person, promote themselves to an admin role, delete tasks, or infer sensitive internal team activity.

The system uses a microservice architecture with three backend services:

- API Gateway: entry point for frontend requests, rate limiting, request IDs, security headers, health checks, and proxy routing.
- Auth Service: registration, login, password hashing, JWT issuing, token verification, and user directory lookup.
- Collaboration Service: teams, members, roles, task assignment, authorization, validation, logging, health checks, and metrics.

## 2. Security Analysis

All frontend requests are sent to the API Gateway. This follows the API Gateway pattern by giving the frontend one controlled entry point instead of exposing each microservice directly. The gateway proxies `/auth` requests to the auth service and `/teams` requests to the collaboration service.

Authentication is handled using JSON Web Tokens. After a successful login, the auth service signs a token containing the user's ID and email. The frontend sends the token in the `Authorization: Bearer <token>` header on protected requests. The collaboration service verifies the token before allowing access to team or task data.

Passwords are protected using bcrypt. The auth service never stores plaintext passwords. During registration, the password is hashed before insertion into PostgreSQL. During login, bcrypt compares the submitted password with the stored hash.

Authorization is handled with role-based access control. Roles are team-scoped rather than global. A user can be an admin in one team and a member in another. The team creator automatically becomes the team's admin. Admins can add members, promote members to admin, view all team tasks, and reassign tasks. Members can only see tasks assigned to themselves.

Input validation is implemented with `express-validator`. Emails are validated and normalized. UUID path and body values are checked before database access. Team roles are restricted to `admin` and `member`. Task statuses are restricted to `todo`, `in_progress`, and `done`.

SQL injection is reduced through parameterized PostgreSQL queries. The backend uses placeholders such as `$1` and `$2` instead of building SQL strings from user input.

Rate limiting is implemented in the API Gateway. General requests are limited to 100 requests per 15 minutes, while login requests are limited more strictly to 5 attempts per 15 minutes. This helps reduce brute-force login attempts and basic denial-of-service abuse.

Logging and monitoring are implemented using Morgan, Winston, `/health`, and `/metrics`. Morgan logs HTTP requests. Winston records application and security events. Health endpoints report service status, and metrics endpoints expose request counters and uptime in a Prometheus-style text format.

Security-relevant events are written to audit logs. Examples include successful registration, duplicate registration attempts, failed login attempts, temporary account lockouts, token verification, team creation, role assignment, task creation, task reassignment, and authorization failures. This provides a basic audit trail for investigating misuse or attempted misuse.

Additional hardening is implemented in the API Gateway through security headers and restricted CORS. The gateway adds headers such as `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`, and it limits browser origins to the configured frontend URL.

An extra security measure is temporary account lockout. The auth service tracks repeated failed login attempts by email address and IP address. After too many failures, further login attempts are temporarily blocked. This complements gateway login rate limiting by making repeated attacks against a specific account harder.

## 3. Authentication and Authorization Methods

Common authentication methods include:

- Session cookies: The server stores session state and sends a session ID to the browser. This works well for traditional web applications but requires shared session storage or sticky sessions in distributed microservices.
- JWT authentication: The server signs a token that the client sends with each request. This works well for stateless APIs because services can verify the token without storing server-side session state.
- OAuth 2.0: An authorization framework commonly used when third-party applications need delegated access to resources.
- OpenID Connect: An identity layer built on OAuth 2.0 that supports federated login and user identity claims.
- API keys: Useful for machine-to-machine access, but weaker for user login because keys are long-lived and usually do not represent user sessions well.

Common authorization methods include:

- Role-Based Access Control: Users receive roles such as admin or member, and endpoints check those roles before allowing actions.
- Attribute-Based Access Control: Access decisions are based on attributes such as department, ownership, time, location, or resource metadata.
- Access Control Lists: Each resource stores a list of users or groups allowed to access it.

This project uses JWT authentication with team-scoped RBAC. JWT is suitable because the frontend communicates with backend APIs and the collaboration service can verify the user's identity from the token. RBAC is suitable because the project has clear team permissions: admins manage teams and tasks, while members only work with assigned tasks.

OAuth 2.0 was not selected because the project does not require third-party delegated access. OpenID Connect would be appropriate in a larger production system using an external identity provider, but JWT with local login is sufficient for this academic microservice project.

## 4. Real-World Security Failures

### Uber 2016 Data Breach

Uber experienced a major breach in 2016 involving exposed credentials and access to private repositories. The FTC stated that Uber did not require engineers to enable multi-factor authentication for GitHub repository access. Attackers accessed sensitive data, and the breach was not disclosed for more than a year.

Relevant prevention measures include:

- Enforce multi-factor authentication on source-control and cloud accounts.
- Do not store credentials in repositories.
- Monitor access to sensitive data.
- Rotate exposed credentials immediately.
- Use least privilege for cloud resources.
- Report and respond to incidents transparently.

This project addresses related risks by removing `.env` files from Git tracking, adding `.env.example` files, and documenting that real secrets must not be committed.

### Equifax 2017 Data Breach

Equifax disclosed a breach in 2017 involving an Apache Struts vulnerability. The incident showed the danger of unpatched systems, weak asset visibility, and insufficient monitoring. Sensitive personal information was exposed.

Relevant prevention measures include:

- Maintain an asset inventory.
- Patch critical vulnerabilities quickly.
- Scan dependencies and deployed applications.
- Use monitoring and alerting to detect suspicious behavior.
- Segment systems so one vulnerable component does not expose all data.

This project addresses related risks through service separation, logging, health checks, metrics, validation, and a single gateway entry point.

### Broken Object Level Authorization

Broken Object Level Authorization is a common API security failure where users can access resources by changing IDs in the URL or request body. For example, an attacker might change a `teamId` or `taskId` and retrieve data belonging to another team.

This project defends against that failure by checking team membership before returning team or task data. Members only receive tasks where `assigned_to` matches their authenticated user ID, and admin-only actions check the user's role in the target team.

## References

- IETF. RFC 7519: JSON Web Token (JWT). https://datatracker.ietf.org/doc/rfc7519/
- NIST. SP 800-63B: Digital Identity Guidelines, Authentication and Lifecycle Management. https://www.nist.gov/publications/digital-identity-guidelines-authentication-and-lifecycle-management
- OWASP. API Security Top 10 2023. https://owasp.org/API-Security/
- OWASP. Authentication Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP. Password Storage Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Federal Trade Commission. FTC addresses Uber's undisclosed data breach. https://www.ftc.gov/node/54285
- Equifax. Equifax releases details on cybersecurity incident. https://investor.equifax.com/news-events/press-releases/detail/237/equifax-releases-details-on-cybersecurity-incident
- U.S. Government Accountability Office. Data Protection: Actions Taken by Equifax and Federal Agencies in Response to the 2017 Breach. https://www.gao.gov/products/gao-18-559
