# Construction Materials Online Shop

## Product

A customer-facing construction materials shop using a buy-after-order, supplier-based model. Customers purchase from the shop brand; supplier details remain internal administration data.

## MVP Business Flow

Customer -> Online Shop -> Customer Order -> Check Supplier Availability -> Purchase from Supplier -> Prepare/Dispatch -> Deliver -> Close Order -> Calculate Profit

## Technology Direction

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Authentication: JWT with secure password hashing
- Validation: Zod or an equivalent schema validation library
- API: REST
- Images: Cloudinary or another controlled image-storage service
- Currency: RWF

## Initial Roles

- Admin: manage products, suppliers, purchasing, orders, customers, delivery, pricing, reports, and settings
- Customer: browse products, manage cart, checkout, view orders, and manage profile
- Supplier: internal data initially; no supplier-facing portal in the MVP
- Staff operations role: deferred until permissions are better defined

## Core Rules

- Supplier cost and customer selling price are separate values.
- Supplier cost, supplier identity, and internal purchasing data must never be exposed through customer APIs.
- Order and purchase records use price snapshots so later price changes do not alter history.
- Order totals are recalculated on the server; browser-supplied prices, roles, and totals are never trusted.
- Gross profit = selling revenue - supplier purchase cost.
- Net profit = gross profit - delivery cost - payment fees - other approved order costs.
- Every order-state transition must be validated and recorded.
- An order cannot be marked delivered without delivery confirmation.
- Money handling must be integer- or decimal-safe and consistently represented in RWF.
- Sensitive administrative actions require audit logging.

## Planned Phases

1. Business planning and MVP scope approval
2. Repository audit and project rules
3. Architecture and database design
4. Development environment
5. Backend foundation
6. Database models
7. Authentication and RBAC
8. Product, category, and brand APIs
9. Product images
10. Frontend foundation
11. Customer catalog
12. Cart
13. Checkout and customer orders
14. Supplier purchasing
15. Inventory and traceability
16. Delivery
17. Profit and reports
18. Admin dashboard
19. Notifications and communications

## Current Status

- Source requirements reviewed from `ConstrM.docx`.
- Workspace initialized with project rules and requirements baseline.
- Phase 2 architecture and database design documented in `ARCHITECTURE.md`.
- Phase 3 development scaffold created with React/Vite client and strict TypeScript server package.
- Phase 4 development environment configured with a shared environment template, validated server configuration, and workspace-level verification scripts.
- Phase 5 backend foundation added with MongoDB connection management and degraded health reporting when the database is unavailable.
- Phase 6 foundational database models added for categories, brands, and products with indexes, soft statuses, RWF pricing validation, and protected supplier fields.
- Phase 7 authentication foundation added with customer/admin roles, protected password hashes, JWT identity tokens, registration/login/me routes, and reusable authentication/RBAC middleware.
- Phase 8 catalog APIs added with public category, brand, and product discovery plus admin-only product creation, updates, and archiving.
- Phase 9 product image gallery API added with admin-only validated HTTP(S) image URL replacement and public image DTOs; storage-provider upload integration remains a deployment decision.
- Phase 10 frontend foundation and Phase 11 customer catalog completed with a typed client API, page-based storefront navigation, live category/product loading, product detail views, search/filtering, responsive cards, and loading/error/empty states.
- Phase 12 cart implemented with authenticated customer carts, server-owned price snapshots, quantity validation, add/remove UI, and cart totals.
- Phase 13 checkout and customer orders implemented with server-recalculated RWF totals, immutable selling snapshots, delivery validation, order history/detail APIs, cart clearing, and checkout UI.
- Phase 14 supplier purchasing foundation implemented with admin-only supplier records, purchase orders, protected supplier-cost snapshots, and guarded purchase-order status transitions.
- Phase 15 inventory and traceability foundation implemented with admin inventory views, receipt processing, available stock balances, and append-only stock transactions.
- Phase 16 delivery foundation implemented with checkout-created delivery records, admin assignment/status controls, customer delivery visibility, and confirmation-gated delivery completion.
- Phase 17 admin sales and profit reports implemented from immutable order, purchase, and delivery snapshots; payment and other costs remain explicit zeroes until those workflows are added.
- Phase 18 admin dashboard implemented with role-protected live operational summary metrics, low-stock watch, recent orders, and storefront navigation.
- Phase 19 in-app customer notifications implemented for order creation and delivery updates, with unread counts and read-state APIs.
- Security hardening added persistent audit logs for successful catalogue, supplier, purchasing, inventory-receipt, and delivery admin mutations, plus a bounded admin-only audit feed.
- Authentication route coverage verifies customer account creation, password hashing, duplicate rejection, login, invalid credentials, input validation, and browser role-injection protection without touching the production database.
- Production packaging now excludes server test files from compiled output and provides an explicit compiled-server start command.
- The Atlas catalogue follows the supplied launch blueprint with 12 high-demand departments and a repeatable 24-product seed containing two products per department and project-owned generated imagery.
- Catalog image migration uploads project-owned product assets to stable Cloudinary public IDs and updates MongoDB; configured catalog seeds retain Cloudinary delivery URLs.
- The storefront shell now uses a responsive navigation system, live catalog-driven hero content, and a reusable professional brand lockup; the admin dashboard adds prioritized operational states and searchable product management.
- Frontend platform pass completed with dedicated catalogue, cart/checkout, orders, notifications, account, and admin dashboard views, plus IK Materials logo branding and repeatable placeholder catalogue seed data.
- Catalogue management now uses one complete add/edit workflow for product identity, category, description, unit, cost, selling price, minimum order, and image replacement; product rows expose a clear edit action instead of a limited name prompt.
- The customer experience now includes a professional portal overview with order, notification, cart, spend, and account summaries, plus expanded order cards with line-item and fulfilment status detail.
- Customer accounts now support validated, persisted name, email, and phone updates; saved contact data pre-fills checkout without allowing role changes.
- Customer registration now requires a phone number and matching password confirmation, with validation enforced in both the browser and API before password hashing.
- Customer order history now exposes protected order detail views with fulfilment progress, itemized totals, delivery information, and payment state, while continuing to exclude supplier and cost data.
- The updates inbox now provides clearer event presentation, reliable read-state error handling, and a customer-scoped mark-all-read action.
- The cart and checkout journey now includes product imagery, quantity/removal controls, secure server-owned summaries, complete delivery/contact fields, delivery instructions, customer notes, and explicit order confirmation.
- The authenticated header now keeps a clearly labelled cart and live item count visible on desktop and mobile, while signed-out visitors continue to see no customer cart controls.
- Customer order detail now loads its customer-scoped delivery record and presents pending, assigned, dispatched, delivered, failed, or returned delivery progress without exposing internal supply data.
- Admin operations now include a dedicated delivery workspace for assignment, dispatch, confirmation-gated completion, failure handling, audit logging, and automatic customer notifications.
- Newly placed customer orders now appear in a dedicated recent-orders feed on the admin overview, with order number, timestamp, status, and total; the dashboard refreshes the feed every 30 seconds and supports manual refresh.
- Admin operations now include an authorized customer-management workspace with registration contact details, account activity, order totals, search, audited suspension/reactivation controls, and toast-style action confirmation.
- Client production build, client/server typechecks, and client/server lint pass.
- MongoDB is hosted on Atlas and the configured server health check has verified a connected database.

## Open Decisions Before Implementation

- Final MVP product categories, units, and launch catalog.
- Delivery zones, delivery pricing, and delivery confirmation method.
- Payment methods for launch and whether payment is collected before supplier purchase.
- Exact order, purchase-order, inventory, and return policies.
- Production hosting and MongoDB hosting.
- Image-storage provider and upload/signature workflow.
- Whether customers can cancel after supplier purchasing begins.
- Refresh-token persistence, logout revocation, password reset, and email verification policy.
