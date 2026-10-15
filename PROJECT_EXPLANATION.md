# Project Explanation Document
## Smart Canteen Pre-Order & Queue Management System
**Problem-Solving Hackathon Project**

---

### 1. Executive Summary & Architecture Overview
The **Smart Canteen Pre-Order & Queue Management System** eliminates physical canteen lines, reduces order confusion, and optimizes kitchen preparation during rush hours in universities, colleges, offices, and large organizations.

```
+-------------------------------------------------------------+
|               Client Applications (Web / Mobile)            |
|       (Customer Portal, Kitchen Display, Manager Panel)     |
+-------------------------------------------------------------+
                               |
                               | REST API & WebSockets (Socket.io)
                               v
+-------------------------------------------------------------+
|                    Express & Node.js Backend                |
|  - Auth & Role Middleware (Customer, Staff, Manager, Admin) |
|  - Pre-Order & 15-Minute Slot Manager                       |
|  - Live Kitchen Queue & Priority Engine                     |
|  - Collection & Token Verification Engine (QR / C-023)      |
|  - 7 Core AI & Predictive Intelligence Services             |
|  - Analytics & Real-Time Dashboard Service                  |
+-------------------------------------------------------------+
                               |
                               | Mongoose ODM
                               v
+-------------------------------------------------------------+
|                       MongoDB Database                      |
| (Users, MenuItems, Orders, CanteenSettings, Logs, Alerts)   |
+-------------------------------------------------------------+
```

---

### 2. Folder and File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── constants.js          # System roles, order statuses, item statuses, default limits
│   │   └── db.js                 # Database connection handling with graceful timeout and fallbacks
│   ├── models/
│   │   ├── User.js               # User accounts (roles: customer, staff, manager, admin)
│   │   ├── MenuItem.js           # Menu items with real-time stock and auto Sold-Out enforcement
│   │   ├── Order.js              # Orders, digital tokens (C-023), sub-items, pickup slots, QR codes
│   │   ├── CanteenSetting.js     # Configurable limits (max 20 orders/slot, max items/customer)
│   │   ├── Notification.js       # User and kitchen event notifications
│   │   └── SystemLog.js          # Staff activity logs and system audit trails
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & customer identification
│   │   ├── rbac.js               # Role-Based Access Control
│   │   └── errorHandler.js       # Centralized error handler
│   ├── services/
│   │   ├── queueService.js       # Live kitchen queue prioritization, delay detection & prep time
│   │   ├── slotService.js        # 15-minute pickup slot management & capacity validation
│   │   ├── notificationService.js# Real-time event notifications & Socket.io dispatch
│   │   └── aiService.js          # All 7 AI & predictive intelligence features
│   ├── controllers/
│   │   ├── authController.js     # Registration, login, profile inspection
│   │   ├── menuController.js     # Search/filter menu, real-time availability, CRUD
│   │   ├── orderController.js    # Pre-orders, limit validation, idempotency, cancellation
│   │   ├── queueController.js    # Kitchen queue state updates (Placed->Accepted->Preparing->Ready)
│   │   ├── collectionController.js# Token/QR verification and double-collection prevention
│   │   ├── analyticsController.js # Dashboard KPIs and management reports
│   │   ├── aiController.js       # Endpoints for AI predictions and insights
│   │   └── adminController.js    # User management, staff permissions, system audit logs
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── menuRoutes.js         # /api/menu
│   │   ├── orderRoutes.js        # /api/orders
│   │   ├── queueRoutes.js        # /api/queue
│   │   ├── collectionRoutes.js   # /api/collection
│   │   ├── analyticsRoutes.js    # /api/analytics
│   │   ├── aiRoutes.js           # /api/ai
│   │   └── adminRoutes.js        # /api/admin
│   ├── utils/
│   │   ├── tokenGenerator.js     # Sequential digital token generator (C-001, C-002, etc.)
│   │   └── qrCodeGenerator.js    # Base64 QR code generator for contactless collection
│   ├── seed/
│   │   └── seedData.js           # Automated seed data (default roles, menu items, settings)
│   ├── app.js                    # Express app initialization, security headers, route mounting
│   └── server.js                 # HTTP + Socket.io server bootstrap & connection management
├── package.json
└── README.md
```

---

### 3. Purpose of Each Component

#### A. Order & Pre-Order Workflow
- **Where**: `backend/src/controllers/orderController.js`, `backend/src/services/slotService.js`
- **What it does**:
  - Generates 15-minute pickup slots from **12:00 PM to 9:00 PM**; slots are marked past after their end time.
  1. Validates that the customer does not exceed `max_items_per_customer`.
  2. Enforces the 15-minute slot capacity (e.g. maximum 20 orders per slot).
  3. Atomically checks item stock; automatically transitions items to `Sold Out` when stock reaches 0.
  4. Prevents duplicate order submission via `idempotency_key`.
  5. Generates the digital order token (`C-023`) and a secure QR code.
  6. Allows customer cancellation before preparation starts, instantly restoring inventory.

#### B. Kitchen Queue & Order Prioritization
- **Where**: `backend/src/services/queueService.js`, `backend/src/controllers/queueController.js`
- **What it does**:
  1. Computes dynamic priority scores based on:
     - Order arrival time (FIFO baseline)
     - Scheduled pickup proximity (does not cook distant orders prematurely)
     - Delay status (heavily boosts delayed or overdue orders to the front)
     - Quick-preparation items
  2. Calculates **Estimated Preparation Time** considering:
     - Item preparation durations
     - Multi-item quantities
     - Current active kitchen backlog vs. kitchen capacity
  3. Detects delayed risks and unusually long prep times (> 20 mins).

#### C. Order Collection & Double-Collection Prevention
- **Where**: `backend/src/controllers/collectionController.js`, `backend/src/utils/qrCodeGenerator.js`
- **What it does**:
  1. Staff verifies the order via Token Number (`C-023`), Order ID, or QR code scan.
  2. Strict verification ensures an already collected/completed order **cannot be collected twice**.
  3. Transitions order status: `Ready` -> `Collected` -> `Completed`.
  4. Supports marking uncollected orders as `Not Collected`.

#### D. AI & Intelligent Features
- **Where**: `backend/src/services/aiService.js`, `backend/src/controllers/aiController.js`
- **What it implements (All 7 specification features)**:
  1. **Food Demand Prediction**: Estimates demand volume by day of week and target hour.
  2. **Peak-Time Prediction**: Identifies rush windows (e.g. 12:30 PM - 2:00 PM) for staff allocation.
  3. **Food Preparation Forecasting**: Suggests pre-rush prep batches for high-velocity items.
  4. **Smart Food Recommendation**: Recommends items based on customer preference history and top sellers.
  5. **Food Waste Prediction**: Flags slow-moving stock with high spoilage/waste risk.
  6. **Order Delay Prediction**: Predicts probability of active orders running late based on current kitchen load.
  7. **AI Sales Insights**: Synthesizes natural language managerial insights.

#### E. Real-Time Dashboard & Analytics
- **Where**: `backend/src/controllers/analyticsController.js`
- **What it does**:
  - Live KPIs: Today's orders, active in queue, preparing, ready, completed, cancelled, total sales, average preparation time, most/least ordered items, peak ordering time, average queue size.
  - Managerial reports: Sales by day, sales by food item, pickup slot usage, cancellation breakdown, delayed order percentage.

---

### 4. How the Frontend, Backend, and Database Connect

1. **Authentication**: Customers and staff authenticate via `/api/auth/login`. A signed JWT is returned and passed in the `Authorization: Bearer <token>` header for subsequent requests.
2. **REST API**:
   - Menu browsing & filtering: `GET /api/menu`
   - Pre-ordering: `POST /api/orders`
   - Kitchen queue management: `GET /api/queue/live` & `PATCH /api/queue/:id/status`
   - Handover verification: `POST /api/collection/verify` & `POST /api/collection/confirm`
   - Management & AI telemetry: `GET /api/analytics/dashboard` & `GET /api/ai/*`
3. **Real-time WebSockets (Socket.io)**:
   - Customers join individual rooms `user_<userId>` to receive instant notifications when their order is accepted, preparing, delayed, or ready.
   - Kitchen staff join `kitchen_staff` room to receive real-time queue additions and status changes without polling.
4. **Database (MongoDB via Mongoose)**:
   - All state is persisted across standard schemas with indexes, validation hooks, and relational references.
