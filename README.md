# Smart Canteen

Smart Canteen is a full-stack pre-order and queue-management system for campus
canteens. It gives customers a faster way to browse food, reserve a pickup
window, place an order, and follow its preparation status. At the same time,
the kitchen receives a prioritized live queue and managers receive operational
analytics and AI-assisted recommendations.

The project is designed around a simple goal: move ordering and pickup out of
the physical queue while giving canteen staff the tools to manage rush-hour
capacity, preparation progress, and collection securely.

## What has been built

The current application includes:

- A customer-facing web application for browsing the menu, filtering items,
  managing a cart, selecting a pickup slot, and placing pre-orders.
- Live order tracking with preparation progress, estimated ready time, pickup
  counter, digital token, and QR code information.
- A kitchen display system (KDS) for viewing a prioritized queue, changing
  order states, and flagging delayed orders.
- Manager dashboards for order volume, revenue, queue load, preparation
  performance, reports, and AI-generated operational insights.
- An admin dashboard for user-role management, account status, canteen
  settings, and audit logs.
- JWT authentication and role-based access control across the API and frontend.
- MongoDB/Mongoose data models with startup seeding for demo users, settings,
  and menu items.
- Socket.io rooms for customer notifications and kitchen queue
  synchronization.
- Validation, security middleware, centralized error handling, request
  logging, and rate limiting for authentication endpoints.
- A resilient in-memory store path so the API can remain responsive when a
  MongoDB connection is unavailable during local development.

## Core user journeys

### Customer

1. Sign in or register.
2. Browse the categorized menu and inspect price, preparation time,
   availability, and dietary metadata.
3. Add items and special instructions to the cart.
4. Choose an available 15-minute pickup slot.
5. Submit a pre-order and receive a token such as `C-023` and a QR code.
6. Track the order through `Placed`, `Accepted`, `Preparing`, `Ready`,
   `Collected`, and `Completed`.
7. Review order history and update dietary, budget, pickup, and notification
   preferences.

### Kitchen staff

1. Open the live kitchen queue.
2. View orders sorted using queue priority and estimated preparation effort.
3. Move orders through the permitted preparation states.
4. Mark orders as delayed with a reason.
5. Verify a customer's digital token or QR payload at collection.
6. Confirm collection or mark an order as not collected.

### Manager

1. Monitor live canteen KPIs and operational reports.
2. Manage menu items, prices, availability, and preparation data.
3. Review demand, peak-time, preparation, waste, delay, recommendation, and
   sales insights.
4. Adjust operational settings such as slot capacity and kitchen limits.

### Administrator

1. Manage all accounts, roles, and account status.
2. Review system and staff activity logs.
3. Configure canteen-wide settings and limits.
4. Access the manager and kitchen operational surfaces.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 16 + React 19                       │
│                                                                 │
│ Customer UI │ Cart │ Live Order │ Kitchen KDS │ Manager │ Admin │
│                         │                                       │
│              AppContext + typed API client                      │
└─────────────────────────┼───────────────────────────────────────┘
                          │ REST / JSON
                          │ Socket.io
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js + Express 5                         │
│                                                                 │
│ Helmet │ CORS │ Morgan │ JSON parsing │ Rate limiting           │
│ JWT authentication │ RBAC │ Zod request validation              │
│ Controllers │ Queue/slot services │ AI service │ Notifications  │
└─────────────────────────┼───────────────────────────────────────┘
                          │ Mongoose
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         MongoDB                                │
│ Users │ MenuItems │ Orders │ PickupSlotBookings │ Settings      │
│ Notifications │ SystemLogs │ DailyCounters                     │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend

The frontend is a Next.js App Router application written in TypeScript. The
shared `AppContext` coordinates authentication state, the current user, menu
data, cart contents, active orders, preferences, and dashboard data. The
typed API module maps backend documents into frontend types and centralizes
token handling.

Implemented routes include:

| Route | Purpose |
|---|---|
| `/` | Customer home and menu |
| `/login` | Role-aware login and registration entry point |
| `/cart` | Cart review and checkout |
| `/live-order` | Active order tracking |
| `/history` | Customer order history |
| `/preferences` | Customer dietary and notification preferences |
| `/kitchen` | Live kitchen display and order status controls |
| `/manager` | Manager analytics and AI insights |
| `/admin` | Administration, users, settings, and logs |

Reusable UI components in `components/` provide the header/navigation,
protected routes, customer home, checkout, live tracking, kitchen display,
manager dashboard, admin dashboard, order history, and preferences controls.
Tailwind CSS v4 provides the visual styling and responsive layout.

### Backend

The backend is an Express application exposed through an HTTP server that also
hosts Socket.io. Requests pass through security and parsing middleware before
being handled by modular routers and controllers. Authentication is handled
with JWTs and passwords are hashed with `bcryptjs`. Role authorization
distinguishes customer, staff, manager, and admin operations.

The server attempts to connect to MongoDB at startup, seeds initial data after
a successful connection, and starts a one-minute background monitor for
delays, pickup reminders, and uncollected orders. When the database is not
available, the application uses the in-memory fallback services used by the
API layer.

### Real-time communication

Socket.io is used for event-driven updates:

- Customers join a personal `user_<id>` room for order notifications.
- Kitchen clients join the `kitchen_staff` room for live queue updates.
- The backend notification service broadcasts order status and delay events.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React |
| API | Node.js, Express 5, REST, Socket.io 4 |
| Persistence | MongoDB, Mongoose 9, in-memory fallback store |
| Authentication | JSON Web Tokens, bcryptjs, role-based middleware |
| Validation | Zod schemas and ObjectId validation |
| Security/operations | Helmet, CORS, Morgan, express-rate-limit |
| Utilities | QRCode generation, Nodemon |

## API surface

The backend is mounted under `/api`.

| Area | Main endpoints |
|---|---|
| Health | `GET /api/health` |
| Authentication | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `GET/PATCH /api/auth/preferences` |
| Menu | `GET /api/menu`, `GET /api/menu/:id`, `POST /api/menu`, `PUT /api/menu/:id`, `PATCH /api/menu/:id/availability`, `DELETE /api/menu/:id` |
| Orders | `GET /api/orders/pickup-slots`, `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel`, `PATCH /api/orders/:id/payment` (staff/manager/admin), `PATCH /api/orders/:id/pickup-time` (staff/manager/admin) |
| Kitchen queue | `GET /api/queue/live`, `PATCH /api/queue/:id/status`, `PATCH /api/queue/:id/delayed` |
| Collection | `POST /api/collection/verify`, `POST /api/collection/confirm`, `PATCH /api/collection/:id/not-collected` |
| Analytics | `GET /api/analytics/dashboard`, `GET /api/analytics/reports` |
| AI services | `GET /api/ai/demand-prediction`, `/peak-time-prediction`, `/prep-forecasting`, `/recommendations`, `/waste-prediction`, `/delay-prediction`, `/sales-insights` |
| Administration | `GET/PUT /api/admin/settings`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/role-status`, `GET /api/admin/logs` |

Most endpoints require a bearer token. The API additionally checks the user's
role before allowing staff, manager, or administrator operations. Order
status changes follow a strict transition map so invalid or duplicate
transitions are rejected. Customer-scoped order reads, cancellation, and
reorder requests enforce object ownership, and payment/pickup-time mutations
are restricted to staff, manager, and administrator roles with an additional
ownership guard in the controller (defense in depth against IDOR/BOLA).

## AI and operational intelligence

The backend exposes seven focused service operations:

1. **Demand prediction** for expected food volume.
2. **Peak-time prediction** for upcoming rush pressure.
3. **Preparation forecasting** for batch-preparation planning.
4. **Food recommendations** for customer-specific suggestions.
5. **Waste prediction** for slow-moving or at-risk stock.
6. **Delay prediction** for likely order bottlenecks.
7. **Sales insights** for manager-facing summaries and actions.

> **Honest implementation note.** These capabilities are implemented as
> deterministic, rule-based and statistical heuristics in
> `backend/src/services/aiService.js` (aggregation, bucketing, ratios, and
> weighted scoring). They are **not** trained machine-learning models. The
> endpoints are named "AI" for product framing, and each returns explainable
> output plus a graceful fallback when there is not enough order data. A future
> iteration can add a real ML baseline (for example, time-series demand
> forecasting) behind the same API contract without changing the frontend.

These capabilities are integrated into the manager, kitchen, and customer
experiences through the API client and dashboard components.

## Data and business rules

The main MongoDB models are:

- `User` — identity, role, account status, and preferences.
- `MenuItem` — catalog data, price, availability, quantity, and preparation
  time.
- `Order` — customer, items, pickup slot, amount, token, QR data, status, and
  delay/collection information.
- `PickupSlotBooking` — reservation and capacity tracking for pickup windows.
- `CanteenSetting` — slot interval, order limits, kitchen capacity, and
  uncollected-order timeout.
- `Notification` — customer-facing order and system notifications.
- `SystemLog` — administrative and staff audit events.
- `DailyCounter` — daily token/order numbering.

Default operational settings use 15-minute pickup intervals, a maximum of 20
orders per slot, a maximum of 10 items per order, a kitchen capacity of 15
active orders, and a 60-minute not-collected timeout. These values are
configurable through the admin API.

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB locally or a MongoDB Atlas connection string

### Installation

```powershell
cd SmartCanteen-main
cd backend && npm install && cd ../frontend && npm install && cd ..
```

### Environment configuration

Copy `.env.example` to `.env` and adjust the values for the local environment:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_canteen
JWT_SECRET=replace-with-a-development-secret
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:3000
```

The frontend API client currently targets `http://localhost:5000` for local
development. If the frontend and backend are hosted separately, update the API
and Socket.io URLs in the frontend configuration before deployment.

### Run the application

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the Next.js frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open:

- Web application: <http://localhost:3000>
- Backend root: <http://localhost:5000>
- Health check: <http://localhost:5000/api/health>

The backend seeds four sample accounts and the initial menu when the database
is empty:

| Role | Email | Password |
|---|---|---|
| Customer | `customer@canteen.com` | `password123` |
| Kitchen staff | `staff@canteen.com` | `password123` |
| Manager | `manager@canteen.com` | `password123` |
| Admin | `admin@canteen.com` | `password123` |

These credentials are for local demonstration only. Change them and replace
the JWT secret before using the application outside development.

## Testing

The backend ships with an automated test suite built on **Jest** and
**Supertest**. Tests run against the in-memory fallback store, so they do not
require a MongoDB instance and are safe to run in CI.

```powershell
cd backend
npm test              # run the suite
npm run test:coverage # run with a coverage report (text + lcov + html)
```

Coverage focuses on the highest-risk behavior:

- **Authentication** — registration/login validation, token issuance,
  protected-route rejection for missing or malformed tokens.
- **RBAC and IDOR/BOLA** — customers cannot change payment status or pickup
  time, cannot read or cancel another customer's order; staff/manager/admin
  can perform the permitted operations.
- **Order lifecycle** — pre-order creation, online-vs-counter payment status,
  insufficient-stock rejection (409), and idempotent replay of duplicate
  requests.
- **State machine (A3)** — the full `Placed → … → Completed` path and
  rejection of invalid or replayed transitions.

The suite currently contains 23 tests across `tests/auth.test.js`,
`tests/security.test.js`, and `tests/orders.test.js`.

## Project structure

```text
SmartCanteen-main/
├── frontend/                    # Next.js 16 + React 19 app (App Router)
│   ├── app/                     # Pages and shared state (AppContext)
│   ├── components/              # Reusable UI/components
│   ├── public/                  # Static assets
│   ├── src/                     # Frontend utilities/forwarder if needed
│   ├── package.json             # Frontend scripts & dependencies
│   └── ...
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── app.js               # Express middleware and route mounting
│   │   ├── server.js            # HTTP, Socket.io, DB startup, and monitor
│   │   ├── config/              # Constants and MongoDB connection
│   │   ├── controllers/         # Request and business-operation handlers
│   │   ├── middleware/          # Authentication, RBAC, validation, errors
│   │   ├── models/              # Mongoose schemas
│   │   ├── routes/              # REST route definitions
│   │   ├── seed/                # Initial users, settings, and menu data
│   │   ├── services/            # Queue, slots, AI, notifications, cron
│   │   └── utils/               # QR, token, and async-handler helpers
│   ├── .env.example
│   └── package.json
├── .env.example                 # Development environment template (root)
├── PROJECT_EXPLANATION.md       # Extended project specification
└── README.md                    # Project documentation
```

## Accomplished so far

The project has progressed from a concept into a working end-to-end prototype:

- The main customer ordering flow is implemented in the browser.
- Customer, kitchen, manager, and admin experiences are represented by
  separate protected routes.
- Frontend types and backend models cover menus, orders, slots, preferences,
  notifications, analytics, and audit records.
- The REST API is split into maintainable route/controller/service modules.
- Authentication, authorization, validation, and error handling are wired
  into the request pipeline.
- Pickup capacity, order lifecycle transitions, token generation, QR
  verification, delay handling, and not-collected handling are represented in
  backend logic.
- Live Socket.io rooms connect customer notifications and kitchen operations.
- Seed data makes the complete demo usable immediately after startup.
- Analytics and seven AI-oriented operational endpoints are exposed to the
  dashboards.
- Local development remains usable without an active MongoDB instance through
  the fallback store path.
- An automated Jest/Supertest backend test suite covers authentication, RBAC,
  IDOR/BOLA, order creation, idempotency, inventory limits, and the order state
  machine.

## Current boundaries and next steps

The current release is a hackathon-ready prototype. Before production use, the
following areas should be completed or hardened:

- Replace demo credentials and development secrets with managed secrets. The
  backend now fails fast in production when `JWT_SECRET` or `MONGO_URI` is
  missing, but secrets should still be supplied by a managed store.
- Add a production payment provider and explicitly reconcile payment status.
- Add frontend test coverage and concurrency/load tests that exercise a real
  MongoDB instance (for example, parallel orders competing for the last item
  and for a pickup slot). The current backend suite validates behavior against
  the in-memory fallback store.
- Move frontend API and Socket.io URLs into environment-driven configuration.
  The API client already reads `NEXT_PUBLIC_API_URL`, but deployment values
  must be set per environment.
- Add production deployment configuration, observability, backups, and
  database migration/versioning procedures.
- Review the fallback-store behavior and data consistency expectations for
  multi-instance deployments.
- Add a production QR scanner workflow if camera-based scanning is required.

## Available scripts

| Location | Command | Description |
|---|---|---|
| `frontend/` | `npm run dev` | Start the Next.js development server |
| `frontend/` | `npm run build` | Create a production Next.js build |
| `frontend/` | `npm run start` | Start the built Next.js application |
| `frontend/` | `npm run lint` | Run the configured ESLint checks |
| `backend/` | `npm run dev` | Start the backend with Nodemon |
| `backend/` | `npm run start` | Start the backend with Node |
| `backend/` | `npm test` | Run the Jest + Supertest API test suite |
| `backend/` | `npm run test:coverage` | Run tests with a coverage report |

## License

This project is open source and was built as a hackathon project for solving
real-world campus canteen ordering and queue-management problems.
