# 00-Architecture-Manifesto.md

## 1. General Vision and Philosophy

This document establishes the principles, decisions, and architectural justifications for the "SLS To-Do App" project. Our guiding philosophy is **Deliberate Excellence**. We do not seek simplicity for its own sake, but rather the clarity and robustness that emerge from well-reasoned decisions. Each component and workflow will be designed to be secure, scalable, and maintainable, reflecting the standards of a high-performance production environment. This is a demonstration of professional competence.

## 2. Domain: General System Design

**Principle:** *"Our architecture will be decoupled, secure, and event-orchestrated."*

Communication between system components (Frontend, Backend, Automation) will not be direct or monolithic. It will be based on a "publisher-subscriber" model where database events act as the central nexus, ensuring that each service operates independently and securely.

**Decision: Database Trigger-Based Data Flow.**

1. **Client Operation (Frontend):** The client (Next.js) will interact exclusively with the secure API exposed by Supabase for all CRUD operations. The frontend will have no direct knowledge of n8n, WhatsApp, or any subsequent business logic.

2. **Database Event (Supabase):** Any significant insertion (INSERT) or update (UPDATE) in the `tasks` table will trigger a database function in PostgreSQL.

3. **Orchestrator Invocation (n8n):** This database function will securely invoke an n8n webhook, passing only the necessary data and an authorization token. Sensitive business logic and external service credentials (such as WhatsApp) will reside exclusively in n8n, never exposed to the client or database.

4. **Workflow Execution (n8n):** n8n receives the event, executes the defined workflow (e.g., AI text enhancement, notification preparation) and communicates with the WhatsApp API to send the final message.

**Justification:**

This event-based model is architecturally superior for several critical reasons:

- **Security:** Decoupling is a fundamental security measure. The frontend contains no API keys or knowledge of downstream services like n8n. A compromised client cannot abuse the notification system. Communication is unidirectional (DB → n8n), minimizing the attack surface.

- **Loose Coupling:** The frontend and automation system are completely independent. We can replace n8n with another workflow engine, or change the frontend application to a mobile one, without any part being affected, as long as the contract (the database event) is maintained.

- **Reliability & Resilience:** If n8n or the WhatsApp API are down, the user's main operation (creating a task) does not fail. The event can be logged and retried. In a coupled model (Frontend → n8n), a failure in the notification system could prevent task creation, degrading the user experience.

- **Scalability:** The database can efficiently handle thousands of writes. Workflows in n8n can scale independently, processing events from a queue without impacting the main application's performance.

## 3. Domain: Backend and Data (Supabase)

**Principle:** *"The database is the fortress; data security and integrity are non-negotiable."*

We will not rely on client logic for security. The database itself will impose access rules and critical business logic, treating the frontend as an inherently insecure environment (Zero Trust).

**Decisions:**

- **Authentication:** Supabase Auth service will be used as the sole identity provider. All API requests will require a valid JWT (JSON Web Token).

- **Authorization:** Row Level Security (RLS) will be implemented on all tables containing user data. RLS policies will ensure that a query (SELECT, INSERT, UPDATE, DELETE) can only operate on rows whose `user_id` matches the `uid()` of the authenticated user's JWT.

- **Business Logic:** Logic that is critical for data integrity (e.g., complex validations, multi-table operations) will be encapsulated in Database Functions (RPC - Remote Procedure Call). The client will call these secure functions instead of directly manipulating tables when necessary.

**Justification:**

RLS is the cornerstone of a professional and robust multi-user application. Relying on client-side filters (`.eq('user_id', userId)`) is fragile and insecure; a developer can forget it or an attacker can bypass it. RLS moves security policy to the data layer, making it inevitable and centralized. Every query is implicitly and mandatorily filtered by user identity, ensuring that a frontend breach cannot result in data leakage between users.

## 4. Domain: Frontend (Next.js)

**Principle:** *"The frontend will be reactive, with strict typing and predictable state management."*

The user interface must feel instantaneous and be resistant to errors, even when dealing with asynchronous data. Long-term maintainability will be achieved through clear separation of responsibilities and a rigorous data contract with the backend.

**Decisions:**

- **Server State Management:** React Query (or SWR) will be adopted. This will manage the entire lifecycle of data obtained from Supabase: fetching, caching, automatic background revalidation, and optimistic mutations. This eliminates the need to manually manage `isLoading`, `error` states, and data synchronization.

- **Global Client State Management (UI State):** For non-persistent and UI-specific state (e.g., modal visibility, light/dark theme), Zustand will be used. Its simplicity, minimal API, and performance make it ideal for avoiding the overhead of more complex solutions when they are not necessary.

- **End-to-End Typing:** The project will be 100% TypeScript. Supabase CLI tools will be used to automatically generate TypeScript type definitions directly from the database schema. These types will be shared throughout the frontend, ensuring that the data contract between the database and UI never diverges, thus eliminating an entire class of runtime errors.

**Justification:**

Modern data-centric applications suffer from complex state management. Separating "server state" from "client state" is a key architectural decision. React Query expertly solves the server state problem, which is asynchronous and lives outside the application. Zustand, on the other hand, handles synchronous and ephemeral UI state without the complexity of Context or Redux. This combination (React Query + Zustand) provides a powerful and scalable solution that fits the specific needs of each type of state, promoting cleaner and more predictable code.

## 5. Domain: Code Quality and Testing

**Principle:** *"Quality is not an act, it's a habit; it is automated and demanded from the start."*

We will not leave quality to chance or manual discipline. Automated quality barriers will be established to ensure consistency, and the testing strategy will focus on business value and confidence in the system as a whole.

**Decisions:**

- **Static Code Analysis (Linting & Formatting):** A strict pipeline will be configured with ESLint and Prettier, automatically executed as a pre-commit hook (using husky). Code that does not comply with the rules will not be allowed to reach the codebase.

- **Testing Strategy:** The main focus will be on End-to-End (E2E) testing with Playwright.
  - **Critical Coverage:** Tests will cover the most important user flows: registration, login, task creation, editing, and completion.
  - **Real Interaction:** These tests will interact with a real Supabase test database, not mocks, to validate RLS policies and Supabase Auth integration.
  - **Decoupling Verification:** The "task creation" test will validate that the task is correctly saved in the database. The n8n webhook call will be mocked to verify that the database trigger fires correctly, thus confirming that the event that initiates the automation workflow has been emitted.

- **Unit Tests:** Unit tests will be written with vitest only for complex and reusable business logic (e.g., utility functions, complex custom hooks) that is not easily covered by E2E tests.

**Justification:**

In a distributed architecture heavily integrated with third-party services like Supabase, isolated unit tests offer low return on investment. They do not guarantee that the system works together. E2E tests, on the other hand, provide maximum confidence by simulating the real user journey through all layers (UI, authentication, database API, RLS). By verifying that the database trigger fires, we are validating the "contract" with the automation system without needing to execute the entire n8n workflow in each test, achieving a balance between confidence and test complexity.
