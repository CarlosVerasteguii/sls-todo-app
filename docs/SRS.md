# Software Requirements Specification (SRS) – AI-Powered To-Do App Project

## 1. Introduction

**Document Purpose**: This document is a Software Requirements Specification (SRS) for the development of a task management application (To-Do App) with Artificial Intelligence (AI) integration and chatbot functionality. The SRS describes in detail what the software must do and how it should behave, serving as a technical guide and reference throughout the entire development cycle. It is directed both to the development team (for estimating and designing solutions) and to other stakeholders: for example, testers use it to plan test cases, and users or product owners to validate that the development team understands the requirements. In summary, the SRS establishes a common and unambiguous vision of the project for all involved parties.

**Product Scope**: The project consists of a personal task management application with advanced functionalities: it will allow users to create, organize, and complete tasks through a web interface and via an integrated chatbot with WhatsApp. It will also incorporate an AI service to interpret user commands in natural language (e.g., adding tasks dictated via chat) and provide intelligent assistance (e.g., suggesting priorities or automatic responses). The application will use Supabase as a cloud database (PostgreSQL) and authentication platform, and will be deployed on Vercel (serverless environment). This document covers the functional and non-functional requirements of the system, data models, interfaces with users and external systems, as well as technical constraints, use scenarios, and acceptance criteria.

**Standards and Best Practices**: The structure and content of this SRS follow standard software engineering guidelines for requirement documents (based on IEEE 830-1998 standard and ISO/IEC/IEEE 29148-2011). The document aims to be correct, complete, coherent, and unambiguous, so that everyone shares the same interpretation of each requirement. Following best practices, visual representations (diagrams or models) are also included to illustrate the system structure and facilitate understanding. This SRS is a living document subject to controlled updates; each requirement is tagged to maintain its traceability throughout development and facilitate its verification in testing and final validation.

## 2. Use Scenarios

Below are some key use scenarios that illustrate how users will interact with the application in different situations. These scenarios help contextualize functional requirements in real usage situations:

**Scenario 1: Task Management via Web Interface**. A user accesses the web application (hosted on Vercel) and logs in with their credentials. From the main panel, they create a new task by providing a title, description, and due date. The system saves the task in the Supabase database and displays it in the user's pending tasks list. Later, the user marks the task as completed; the system updates its status in the database and moves it to the completed tasks section. (Related requirements: FR-1, FR-2, FR-3, FR-4, FR-5)

**Scenario 2: WhatsApp Chatbot Interaction**. A user sends a WhatsApp message to the application number to add a task: "Remind me to pay the internet bill on Friday". The message arrives at the integrated WhatsApp API, which forwards it to the application backend. The AI chatbot processes the message; it recognizes the intention to create a task with content "pay the internet bill" and deadline next Friday. The system creates the task in the Supabase database associated with the user and responds via WhatsApp confirming: "Task added: Pay the internet bill (due: Friday 11/10/2025)". (Related requirements: FR-1, FR-6, FR-7, FR-8)

**Scenario 3: Query and Intelligent Assistance**. The user interacts with the chatbot (either via web or WhatsApp) asking: "What urgent tasks do I have for today?". The system, through AI, interprets the query and searches the database for the user's tasks with deadline today or overdue. It responds with a list of those tasks. The user then writes: "Mark the send report task as completed"; the chatbot understands the command to complete a specific task, marks it as done in the database, and confirms the operation to the user. In another interaction, the user might ask "Suggest a new task to improve my productivity" and the system, using a third-party AI integration, generates a recommendation (for example, "Organize computer files") that the user can accept to create as a new task. (Related requirements: FR-4, FR-7, FR-9)

*Note: Each use scenario describes a typical sequence; the system must also handle alternative cases (e.g., authentication errors, commands not understood by the chatbot, unavailability of external services, etc.), which are implicitly addressed in non-functional requirements (e.g., error handling, resilience).*

## 3. Functional Requirements

Below are the Functional Requirements (FR) of the system. Each functional requirement describes a specific capability or behavior that the To-Do App software must implement. Requirements are tagged for reference (FR-#) and traceability.

**FR-1. Task CRUD Management**: The system must allow users to Create, Read, Update, and Delete (CRUD) tasks. This includes: creating new tasks with at least a title, editing task attributes (description, date, priority, etc.), marking tasks as completed or reopening them, and deleting tasks that are no longer needed.

**FR-2. Task Listing and Organization**: The user will be able to view a list of their pending and completed tasks in the web interface. There must be the ability to sort and filter tasks (by date, completion status, priority, etc.) to facilitate their organization.

**FR-3. User Authentication**: The application must provide user registration and login (account management). Only authenticated users can access their tasks. (Supabase's authentication functionality will be leveraged.)

**FR-4. Reminders and Notifications**: The system will send reminder notifications to users for tasks approaching their due date. These notifications can be made via email, push notification, or WhatsApp message, according to user configuration. (Requires integration with a messaging service; in this project, it's contemplated via WhatsApp if the user has linked their number.)

**FR-5. User-Friendly Web Interface**: Provide an intuitive and responsive web user interface where the user can perform all task management operations (create/edit/mark/delete) through buttons, forms, and clear views. The interface must show appropriate confirmations or error messages according to user actions.

**FR-6. WhatsApp-Integrated Chatbot**: The system will offer a chatbot with which users can interact via WhatsApp messages. The chatbot must understand common natural language commands related to tasks (e.g., add a task, list tasks, mark as completed, etc.) and respond appropriately with text. (This involves connecting to the WhatsApp Business API and processing incoming/outgoing messages.)

**FR-7. Natural Language Processing (AI)**: The chatbot will use an Artificial Intelligence service to interpret user commands or queries in natural language. For example, upon receiving "Add a task to call the doctor on Monday", the system must extract the intention ("create task") and details ("call the doctor", date "next Monday") to create the corresponding task. A third-party AI API can be integrated (for example, OpenAI GPT-4 or similar) to achieve this semantic understanding.

**FR-8. Conversation Context Management**: The chatbot must handle basic conversation context to maintain fluid exchanges. For example, if the user first asks "What are my tasks for today?" and then says "Add a note to the second one", the system must infer that they refer to the second task listed previously and update it with the provided note. (This requires maintaining conversation state and recent references.)

**FR-9. Automated Suggestions (AI)**: The system could provide AI-based task suggestions or improvements. For example, it could analyze completed tasks and suggest habits or new tasks ("I see you complete your exercise tasks in the afternoon; would you like to add a recurring task to walk every morning?"). This requirement is complementary to demonstrate AI integration, and its implementation can be refined based on data availability and AI services.

*(The previous functional requirements are based on the expected functionalities of an advanced To-Do system. They are numbered to facilitate cross-referencing in traceability and testing.)*

## 4. Non-Functional Requirements

Non-Functional Requirements (NFR) define quality criteria, constraints, and system properties that do not refer to specific functionalities but to how it behaves or what its qualities are. Below are the main NFRs, organized by common categories (based on recognized software requirements engineering taxonomies):

**NFR-1 (Performance)**: The system must respond quickly. User actions in the web interface (e.g., creating or marking a task) must be processed in <2 seconds on average. Chatbot queries (via WhatsApp) must be interpreted and responded to ideally in <3 seconds, offering an agile conversational experience. The Vercel design must scale to handle at least 1000 concurrent users without notable performance degradation.

**NFR-2 (Security)**: All access to the application will require authentication; each user can only view and modify their own tasks (data isolation). Sensitive data (e.g., authentication tokens, credentials) will be stored securely (encrypted when appropriate). Communication between frontend, backend, and Supabase must occur through encrypted channels (HTTPS/TLS), including interactions with the WhatsApp API and external AI service. Additionally, basic privacy policies will be complied with: user information will not be shared with third parties except for the mentioned integrations, and users will be notified about the use of AI services.

**NFR-3 (Availability and Reliability)**: The system must be highly available, with a monthly uptime objective ≥ 99%. Given that it's deployed on Vercel (serverless architecture) and uses cloud services (Supabase, WhatsApp API, AI service), partial unavailability of these external components must be handled appropriately. For example, if the AI API fails or is slow, the chatbot must respond with a generic error message instead of hanging, and retry the request or indicate to the user to try later. Basic fault tolerance will be implemented: exponential retries in external API calls, and fallback mechanisms (for example, if the AI service doesn't respond, the chatbot could use predefined simple commands for some critical operations).

**NFR-4 (Usability and User Experience)**: The web interface must follow intuitive design principles: be clean, easy to navigate, and adapted to mobile devices (responsive design). The chatbot must communicate with clear and natural language in Spanish, guiding the user in case of misunderstood inputs (e.g., "I didn't understand you, can you rephrase the request?"). Basic documentation or help will be provided in the interface about how to use the chatbot (e.g., command examples). Additionally, the application must be accessible, complying at least with basic accessibility guidelines (color contrast, alt text in images, keyboard navigation, etc.).

**NFR-5 (Scalability)**: The architecture must be horizontally scalable. The use of Supabase (managed PostgreSQL) and Vercel will allow scaling the database and serverless functions as users increase. The database and queries must be designed efficiently (e.g., indexes on search fields) to maintain constant performance even with growth in the number of stored tasks (the application should support at least 100,000 tasks without significant performance loss in queries).

**NFR-6 (Maintainability and Extensibility)**: Project code will be written following good coding practices (style standards, internal documentation, unit testing) to facilitate maintenance. The software's modular structure must allow incorporating new functionalities (for example, integrating another chatbot channel like Telegram in the future, or adding task categories) with limited changes. Version control (Git) will be used to manage SRS and code evolution, documenting requirement changes in this file with version histories. A good SRS allows controlled modifications without losing consistency, so each document version will be approved by relevant parties.

**NFR-7 (Compatibility and Integration)**: The system must be compatible with modern web browsers (Chrome, Firefox, Safari, Edge) in their latest two versions. WhatsApp integration requires complying with WhatsApp Business API requirements (for example, handling webhooks and specific message formats). Likewise, any integration with external AI services must adhere to their rate limits and usage policies. The design must isolate external dependencies in separate modules so that, for example, if it's decided to change AI provider or messaging platform, this doesn't imply rewriting the entire system.

*(The previous NFRs reflect important quality attributes for this project. They must be considered in design and implementation, and will serve to define measurable acceptance criteria later in this document.)*

## 5. Data Model

This section describes the main data model of the application, illustrating how data is structured and related in the Supabase database (PostgreSQL). Having a clear data model is fundamental to ensure consistent information persistence and to guide the implementation of the data layer.

**Main entities**:

**User**: represents each registered person who uses the application. Key attributes: user_id (unique identifier, primary key), name (or alias), email (login credential, unique), password (stored hashed), phone (linked WhatsApp number, if provided), among other profile fields.

**Task**: represents a task or pending item created by a user. Key attributes: task_id (unique task identifier, primary key), user_id (foreign key that associates the task with its owner, referencing User), title (brief descriptive text), description (optional detail), creation_date, due_date, status (pending, completed, etc.), priority (low, medium, high), and possible additional fields like category or tags.

**ChatInteraction** (optional): to support conversational context, there could be an entity to record recent chatbot messages or interactions with the user. Fields: interaction_id, user_id (relationship with User), user_message, system_response, timestamp. (This table is not strictly necessary if context is handled in memory/state, but could serve for auditing or AI service improvement.)

**Relationships**: A user can have many tasks (1-to-N relationship between User and Task), while each task belongs to only one user. Task sharing between users is not currently planned (but the model could be expanded for that in the future, for example with a collaborators table). The possible ChatInteraction table would record a linear message history; each interaction associated with a user.

For greater clarity, below is a simplified diagram of the data model, showing the User and Task entities and their relationship:

*[Data Model Diagram (Entity-Relationship)†embed_image]*
*(Simplified ER diagram: User (user_id, name, email, phone, ...) —< Task (task_id, user_id, title, description, due_date, status, ...).)*

*(The data model must be implemented in Supabase. Its features will be leveraged –for example, foreign key definition to ensure referential integrity between tasks and users– and Supabase security policies can be used to restrict that each user only accesses their own rows.)*

## 6. System Interfaces

This section describes the system interfaces, including the user interface and integrations with other systems or external platforms. The objective is to detail how the system communicates both with its human users and with third-party services.

**6.1 User Interface (Web Frontend)**: The application will offer a web interface likely developed with React/Next.js (deployed on Vercel). This UI presents screens for login, task list, new task form, etc. Users interact through their web browser; frontend actions are translated into API calls or serverless functions hosted on Vercel, or directly to Supabase services. The interface will follow modern web application conventions, with simple navigation and dynamic content updates (AJAX/Fetch for CRUD operations without page reload). No installation is required by the user (it's a web app accessible via URL) although it could be enabled as a PWA (Progressive Web App) for improved mobile experience.

**6.2 Chatbot Interface (WhatsApp)**: In addition to the web interface, users can interact via WhatsApp messages thanks to a chatbot. This conversational interface doesn't have its own graphical elements from our app, but leverages the user's WhatsApp client. The integration is implemented through the WhatsApp Business API (or Twilio API for WhatsApp). When the user sends a message to the application's official number, WhatsApp sends a notification (webhook) to our backend with the message content. Our system then processes the message (using AI if it's a natural language command) and responds by sending a message back via the WhatsApp API. The user experience is that of chatting with one more contact on WhatsApp, which is actually our system's bot. Note: To use this interface, the user must have linked their phone number with their account (possibly during registration or in settings) to authenticate that who sends messages is a valid user. Messages must follow WhatsApp policies (response format within 24h windows, etc.).

**6.3 AI Service Integration**: The core of the intelligent chatbot is the AI/NLP service used. The application will integrate with an external AI provider (for example, OpenAI's GPT-4 API) to send user texts and receive responses or interpretations. This communication typically occurs via HTTP calls from our backend to the AI provider's API, sending for example the user's prompt or message and some parameters, and receiving as response the model's prediction (the response text or interpreted structure). Given that these calls can have cost and latency, the system must call them optimally (e.g., send short conversations, handle errors or timeouts appropriately). The AI service API key will be stored securely in our backend (environment variable in Vercel, not exposed to the client). Example: upon receiving a message "Add task 'buy milk' tomorrow", the backend calls the AI with a prompt to extract intention, gets something like {"intent": "add_task", "task": "buy milk", "due_date": "2025-11-08"}, and proceeds to create the task in the database, returning a confirmatory response to the user.

**6.4 Database (Supabase) and Internal API**: The application interacts with Supabase for everything related to persistent storage. Supabase offers a REST-type API and client libraries; the frontend can communicate directly with Supabase (for example, to get the task list after authentication, using queries protected by access rules) and/or through server functions (e.g., a Next.js function that validates something extra and then queries Supabase). Supabase Edge Functions can also be used for backend logic. Regarding the development interface, Supabase appears as an external service, but for the application it's part of the infrastructure. It's clearly defined which system modules perform database queries (for example, a DataAccess module in the backend) to avoid duplication.

**6.5 Vercel Deployment**: Although it's not an interface with which an end user interacts, the deployment environment imposes certain interfaces for developers. Vercel will provide URLs for the frontend and backend functions (serverless APIs). The system must comply with Vercel's contractual interfaces: for example, HTTP functions exported in certain files to act as endpoints (e.g., /api/* routes), and typical serverless execution time limitations (a function must not take more than X seconds). Likewise, there will be Git integration (each push can deploy automatically). These technical considerations ensure that the application integrates seamlessly into the Vercel ecosystem during development and operation.

In summary, the system interfaces cover: human-system interaction via web and chat (user-friendly UI, conversational chatbot) and system-system interaction via APIs (WhatsApp, OpenAI, Supabase, Vercel). Each external interface considered has official documentation that will be followed to ensure compatibility (for example, Supabase API JSON formats, WhatsApp webhooks, OpenAI endpoints) – respecting those contracts is an implicit part of our requirements.

## 7. Technical Constraints

This section details the technical and design constraints imposed on the project, whether by previous decisions, technological dependencies, external regulations, or other factors. Constraints define the context in which the solution must operate and may limit implementation options:

**Mandatory technologies**: By project guidelines, the agreed technology stack must be used: Frontend in Next.js/React, serverless backend deployed on Vercel, database on Supabase (PostgreSQL), chatbot integration through official WhatsApp API, and AI service integration for natural language processing. This excludes the use of other databases or backend languages (for example, a traditional persistent Node server will not be used, but Vercel's Lambda functions). Any library or SDK used must be compatible with these technologies (for example, Supabase SDK for JavaScript, Twilio/WhatsApp SDK for Node.js, etc.).

**External service limits**: Integrated platforms bring their own constraints. For example, Supabase (free plan) has limits on calls per minute and database size; OpenAI API has cost per token and speed limitations; WhatsApp API requires approval of predefined message templates to initiate conversations and could imply cost per sent message. The design must consider these limits to avoid service failures or excessive costs. Constraint: The system must function within initially defined free quotas; if exceeded, scaling plans or usage optimization will be evaluated (but this remains as infrastructure consideration).

**Regulations and privacy**: Since potentially personal data is handled (e.g., task lists could contain sensitive user information, and their phone number is used for WhatsApp), basic privacy considerations must be complied with. While it's not a system at the level of massive personal data processing, applicable regulations must be respected (for example, GDPR if there are European users: right to be forgotten – possibility to delete account and data). Also, any AI usage must inform the user that their messages could be processed by a third-party service (OpenAI) and possibly stored there, according to that service's policies. Constraint: User data will not be stored beyond what's necessary for operation (data minimization), and account deletion mechanism will be offered that deletes their tasks.

**Compatibility and versions**: The application will initially be designed for modern environments; compatibility with obsolete browsers (for example IE 11) or very old operating systems is not planned. It's assumed that users have a device with an updated browser and/or the possibility to use WhatsApp. In server terms, Node.js will be used in the version supported by Vercel (for example Node 18) and development will be done with that version in mind. Constraint: If any dependency is not compatible with said version, an alternative will be sought.

**Schedule and deliverables**: Although it's not an intrinsic technical constraint of the software, it's relevant to mention any temporal constraint that influences technical decisions. For example, if the project must have a functional MVP in 3 months, that restricts the initial scope of AI implementation (maybe starting with simple predefined cases before integrating a complex model). Likewise, if there are defined milestones (delivery of a prototype, beta testing phase on a certain date), decisions about what to include or leave for later will be affected. These planning constraints are documented to keep them in mind when reading the requirements (since some could be postponed outside the MVP if the schedule requires it).

In synthesis, technical constraints frame development within a concrete reality of tools, limits, and rules to follow. The team must respect these conditions when designing the solution to ensure viability and compliance from the start.

## 8. Requirements Traceability

Traceability ensures that each requirement defined in this SRS can be tracked through the different stages of the project lifecycle: design, implementation, testing, and validation. Each requirement has a unique identifier (for example, FR-3, NFR-2) for easy reference. A traceability matrix will be maintained that relates requirements to other artifacts (use scenarios, design modules, test cases, etc.), so that any change in a requirement can be evaluated in terms of its impact.

Below is a fragment of the traceability matrix, relating functional requirements to use scenarios and test cases (hypothetical test IDs) to illustrate how this control will be carried out:

| Requirement | Use Scenarios | Test Case(s) |
|-------------|---------------|--------------|
| FR-1: Task CRUD | Scenario 1 (Web Management) | TC-01: Create Task UI<br>TC-02: Edit Task UI |
| FR-3: Authentication | Scenario 1 (Web Management) | TC-05: User Registration<br>TC-06: Correct/Incorrect Login |
| FR-6: WhatsApp Chatbot | Scenario 2 (WA Chatbot) | TC-15: Send Add Task Command via WA<br>TC-16: WA Confirmation Response |
| FR-7: AI NLP | Scenario 2, 3 (Chatbot) | TC-17: Complex Phrase Interpretation<br>TC-18: Response if AI Unavailable |
| NFR-2: Security | N/A (global) | TC-25: Unauthenticated Access Blocked<br>TC-26: Data Isolation Test |
| NFR-3: Availability | N/A (global) | TC-30: Simulate AI Service Failure (retry)<br>TC-31: Database Disconnection Resilience |

*Table 1: Traceability Matrix Extract - relationships between requirements, scenarios, and tests*

As observed, each requirement can be associated with one or more use scenarios (where said requirement comes into action) and with one or more test cases designed to verify its compliance. For example, requirement FR-6 (WhatsApp Chatbot) is covered by Use Scenario 2 and is verified through test cases TC-15 and TC-16 that simulate communication via WhatsApp. Likewise, global non-functional requirements, such as NFR-2 (Security), don't correspond to a single scenario but to general conditions, and specific security test cases are assigned to them.

Traceability is also applied in reverse direction: given a test case or design module, it's possible to identify what requirement(s) it covers. This will ensure that all requirements defined here are implemented and verified, and that no functionalities are implemented without justified requirement (avoiding scope creep). Additionally, in case of requirement changes (which can occur in a living document like the SRS), this matrix allows evaluating what parts of the system and what tests need updating.

The complete Traceability Matrix will be maintained in the project repository (possibly in a spreadsheet or requirements management tool) and will be updated as requirements and corresponding tests evolve.

## 9. Acceptance Metrics

For the software product to be accepted by the client or stakeholders at the end of development, objective acceptance metrics will be defined that must be met. These metrics largely derive from requirements (especially non-functional ones) and serve to verify in a measurable way that project objectives have been achieved. Below are some of the main proposed acceptance metrics:

**9.1 Requirements Coverage**: 100% of functional requirements implemented and verified through test cases. Criterion: each FR and NFR requirement must have at least one associated test case that has been approved (successfully passed) in the testing phase. This will guarantee the verifiability of all requirements.

**9.2 Chatbot Performance (Response Time)**: The system must respond to chatbot queries or commands in less than 3 seconds in 90% of cases. The time from when the user sends a message until they receive the response will be measured. Acceptance metric: during load testing with N users simulating concurrent conversations, the average response time and 90th percentile must be within the stipulated limits.

**9.3 Scalability (Maximum Load)**: The application must support at least 500 active users simultaneously (on Web or WhatsApp) performing common operations, without errors or severe degradation. Acceptance criterion: stress test where 500 users create tasks, list them, and send messages to the chatbot in a short interval, the system maintains < 5% errors and response times within 2x normal.

**9.4 Reliability and Availability**: No more than 1 hour of unplanned downtime per month. This metric will be evaluated during a pilot or beta period: the system must be available (responding) 99% of the time, counting any unplanned downtime. Likewise, fault tolerance: in tests where AI API or database failure is simulated, the system must automatically recover or gracefully degrade (e.g., chatbot reports unavailability) without data loss.

**9.5 Security and Privacy**: A basic security audit will be performed before acceptance. Metric: 0 critical level vulnerabilities open. This includes testing that it's not possible for a user to access another's tasks (effective isolation) nor inject malicious commands via inputs (XSS/SQLi prevention by the nature of used frameworks). Additionally, all user personal data must be deletable upon request (verify account deletion function). Acceptance requires meeting these security conditions.

**9.6 User Satisfaction (Usability)**: Although more difficult to measure quantitatively, it can be defined as a success criterion that at least 80% of pilot users rate the experience as satisfactory in terms of ease of use and utility. This will be measured through surveys during beta testing. Serious usability problems identified must be corrected before the final version.

**9.7 User Story Compliance**: (If agile methodology with user stories is used) Each story must have clear acceptance criteria. Criterion: All stories planned for the final release are marked as "Done" with their acceptance criteria validated by the Product Owner. This is a qualitative measure that expected functionalities were covered.

Upon completion of development, an Acceptance Report will be prepared that contrasts these metrics with actual results obtained in testing and evaluations. Only when all (or the vast majority, according to agreement) of the acceptance metrics have been achieved, will the product be considered accepted by the client/user. This approach ensures that acceptance is not subjective but based on measurable criteria agreed upon from the start (in this SRS), complying with what's outlined in the project requirements and objectives.

---

*This SRS document is subject to controlled updates and version control. Each requirement is tagged for traceability throughout the development lifecycle. For questions or clarifications about requirements, please refer to the development team or project stakeholders.*
