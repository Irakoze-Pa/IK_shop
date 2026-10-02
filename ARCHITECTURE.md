# Architecture and Database Design

## Phase 2 Objective

Define the application boundaries, MongoDB data model, API surface, status transitions, indexes, and security rules required before implementation begins.

## Architecture

The MVP is a TypeScript monorepo with two deployable applications:

```text
Client (React + Vite + TypeScript + Tailwind)
        |
        | HTTPS REST API
        v
Server (Node.js + Express + TypeScript)
        |
        +-- Auth and authorization
        +-- Request validation and error handling
        +-- Domain services and workflow transitions
        +-- MongoDB repositories/models
        +-- Image/payment/delivery adapters
        |
        v
MongoDB
```

### Proposed repository layout

```text
client/
server/
  src/
    config/
    middleware/
    modules/
      auth/
      users/
      catalog/
      suppliers/
      carts/
      orders/
      purchasing/
      inventory/
      deliveries/
      reports/
      audit/
    shared/
      errors/
      http/
      validation/
      money/
      database/
  tests/
PROJECT.md
AGENTS.md
ARCHITECTURE.md
```

Controllers handle HTTP concerns only. Services own business rules and workflow transitions. Mongoose models define persistence indexes and serialization boundaries. Zod schemas validate request input and service input where appropriate.

## Application Boundaries

### Public/customer API

- Product and category discovery
- Authentication and customer profile
- Cart operations
- Checkout and customer order history
- Customer-visible delivery and order status
- Product reviews

Customer responses must exclude `costPrice`, supplier references, supplier stock, purchase orders, internal notes, audit metadata, and payment-provider secrets.

### Admin API

- Product, category, and brand management
- Supplier and supplier availability management
- Customer management
- Order operations and status transitions
- Purchase orders and receiving
- Inventory and stock transactions
- Delivery assignment and confirmation
- Pricing and profit reports
- Audit log and settings access

Every admin route requires authenticated identity plus an explicit admin role check. Authorization is enforced server-side, never by hiding a client control.

## Database Conventions

- MongoDB with Mongoose.
- Use `ObjectId` references for aggregate roots and independent entities.
- Embed order, purchase-order, and cart line items because their snapshots are historical parts of the parent record.
- Store timestamps on every operational document.
- Use `createdAt` and `updatedAt` through Mongoose timestamps.
- Use integer RWF amounts, represented as `number` values in the smallest currency unit because RWF has no fractional launch currency requirement. Do not use floating-point arithmetic for calculations.
- Use `Decimal128` only if a later supported currency requires fractional units; make that a deliberate migration decision.
- Use soft status changes for products, users, suppliers, and categories rather than destructive deletion when records are referenced historically.

## Collections and Key Fields

### users

`name`, `email`, `phone`, `passwordHash`, `role`, `status`, `createdAt`, `updatedAt`, `lastLoginAt`.

Indexes: unique normalized email; sparse unique phone where present; role/status for admin operations.

### categories

`name`, `slug`, `description`, `image`, `status`, timestamps.

Indexes: unique slug; status plus name.

### brands

`name`, `slug`, `status`, timestamps.

Indexes: unique slug; status plus name.

### suppliers

`companyName`, `contactPerson`, `phone`, `whatsapp`, `address`, `taxDetails`, `paymentTerms`, `status`, internal notes, timestamps.

Indexes: status plus company name; normalized phone where useful. Supplier data is admin-only.

### products

`name`, `slug`, `sku`, `categoryId`, `brandId`, `description`, `images`, `unit`, `costPriceRwf`, `sellingPriceRwf`, `supplierId`, `supplierStock`, `minimumOrder`, `status`, timestamps.

Indexes: unique slug; unique SKU; category/status; text or normalized search fields; supplier/status.

`costPriceRwf`, `supplierId`, and `supplierStock` are never serialized in public product responses.

### carts

`customerId`, embedded `items[]` with `productId`, `quantity`, `priceSnapshotRwf`, `nameSnapshot`, `skuSnapshot`, timestamps.

Indexes: unique customer ID; updated-at for cleanup.

Cart prices are advisory and are re-read from current product data during checkout.

### orders

`orderNumber`, `customerId`, embedded `items[]`, `subtotalRwf`, `deliveryFeeRwf`, `discountRwf`, `totalRwf`, `currency`, `deliveryAddress`, `paymentStatus`, `orderStatus`, `deliveryId`, `customerNotes`, `internalNotes`, `statusHistory[]`, timestamps.

Each item stores `productId`, `nameSnapshot`, `skuSnapshot`, `unitSnapshot`, `quantity`, `unitSellingPriceRwf`, and `lineTotalRwf`. Cost information is recorded only in protected operational/profit fields and never returned to customers.

Indexes: unique order number; customer plus created-at; order status plus created-at; payment status; delivery ID.

### purchaseOrders

`purchaseOrderNumber`, `supplierId`, `sourceOrderIds[]`, embedded `items[]`, `subtotalCostRwf`, `currency`, `status`, `expectedDate`, `receivedAt`, `internalNotes`, `statusHistory[]`, timestamps.

Each item stores `productId`, `skuSnapshot`, `nameSnapshot`, `quantityOrdered`, `quantityReceived`, `unitCostRwf`, and `lineTotalCostRwf`.

Indexes: unique purchase-order number; supplier plus status; source order IDs; status plus expected date.

### inventoryItems

`productId`, `skuSnapshot`, `availableQuantity`, `reservedQuantity`, `unit`, timestamps.

Indexes: unique product ID; unique SKU snapshot where required.

### stockTransactions

`productId`, `type`, `quantity`, `source`, `referenceType`, `referenceId`, `unitCostRwf`, `performedBy`, `createdAt`.

Indexes: product plus created-at; reference ID; transaction type plus created-at. Transactions are append-only; corrections use compensating transactions.

### deliveries

`orderId`, `address`, `feeRwf`, `driverOrPartner`, `status`, `assignedAt`, `dispatchedAt`, `deliveredAt`, `confirmation`, `notes`, timestamps.

Indexes: unique order ID; status plus updated-at; driver/partner plus status.

### payments

`orderId`, `amountRwf`, `method`, `providerReference`, `status`, `paidAt`, timestamps.

Indexes: order ID plus created-at; unique provider reference where present; payment status.

Payment-provider secrets and verification details remain server-side.

### reviews

`customerId`, `productId`, `orderId`, `rating`, `comment`, `moderationStatus`, timestamps.

Indexes: product plus moderation status; unique customer/product/order combination where one review per purchased line is the rule.

### auditLogs

`actorId`, `action`, `entityType`, `entityId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.

Indexes: entity plus created-at; actor plus created-at; action plus created-at. Do not store passwords, tokens, or payment secrets in metadata.

## Status Enums and Transitions

### Order status

```text
PENDING -> CONFIRMED -> SUPPLIER_CHECK -> PURCHASING
         -> READY_FOR_DELIVERY -> OUT_FOR_DELIVERY -> DELIVERED

PENDING, CONFIRMED, SUPPLIER_CHECK, PURCHASING, READY_FOR_DELIVERY
         -> CANCELLED
OUT_FOR_DELIVERY, DELIVERED -> RETURNED (only under approved return rules)
Any eligible active state -> FAILED when an operational failure is recorded
```

Transitions are performed by a domain service, checked against the current state, and appended to `statusHistory` with actor, timestamp, and reason.

### Purchase-order status

`DRAFT -> SENT -> CONFIRMED -> PARTIALLY_RECEIVED -> RECEIVED -> CLOSED`, with `CANCELLED` available before receiving begins.

### Delivery status

`PENDING -> ASSIGNED -> DISPATCHED -> DELIVERED`; `FAILED` and `RETURNED` are terminal operational outcomes where applicable.

### Payment status

`PENDING -> AUTHORIZED -> PAID`; `FAILED`, `CANCELLED`, and `REFUNDED` are supported as separate outcomes.

## Critical Workflows

### Checkout

1. Authenticate the customer.
2. Load products by ID from the database.
3. Verify active status and valid quantities.
4. Compute current selling-price snapshots and all totals on the server.
5. Validate delivery option and calculate the server-owned fee.
6. Create the order and immutable item snapshots.
7. Clear or reconcile the cart.
8. Write an audit/event record for the order creation.

### Supplier purchasing

1. Admin moves the order to supplier check.
2. Admin records current supplier availability and cost.
3. Create or update a purchase order with cost snapshots.
4. Receive quantities through stock transactions.
5. Link received goods to the customer order.
6. Advance the order only when operational prerequisites are satisfied.

### Profit calculation

Profit reports read immutable order selling snapshots, purchase-order cost snapshots, delivery costs, payment fees, and approved order costs. Historical reports must not use the current product price or current supplier cost.

## API Plan

### Auth and customer routes

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/me
PATCH  /api/v1/me

GET    /api/v1/categories
GET    /api/v1/brands
GET    /api/v1/products
GET    /api/v1/products/:productId
POST   /api/v1/products/:productId/reviews

GET    /api/v1/cart
PUT    /api/v1/cart/items/:productId
DELETE /api/v1/cart/items/:productId

POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/:orderId
POST   /api/v1/orders/:orderId/cancel
```

### Admin routes

```text
GET    /api/v1/admin/products
POST   /api/v1/admin/products
PATCH  /api/v1/admin/products/:productId
POST   /api/v1/admin/products/:productId/archive

GET    /api/v1/admin/suppliers
POST   /api/v1/admin/suppliers
GET    /api/v1/admin/suppliers/:supplierId
PATCH  /api/v1/admin/suppliers/:supplierId

GET    /api/v1/admin/orders
PATCH  /api/v1/admin/orders/:orderId/status
GET    /api/v1/admin/purchase-orders
POST   /api/v1/admin/purchase-orders
PATCH  /api/v1/admin/purchase-orders/:purchaseOrderId
POST   /api/v1/admin/purchase-orders/:purchaseOrderId/receive

GET    /api/v1/admin/inventory
GET    /api/v1/admin/stock-transactions
GET    /api/v1/admin/deliveries
PATCH  /api/v1/admin/deliveries/:deliveryId
GET    /api/v1/admin/reports/profit
GET    /api/v1/admin/reports/sales
GET    /api/v1/admin/audit-logs
```

All list endpoints use bounded pagination, explicit sort order, and validated filter parameters. API responses use DTOs so persistence fields are never exposed accidentally.

## Transaction and Consistency Rules

- Checkout order creation and cart reconciliation should use a MongoDB transaction when the deployment supports replica sets.
- Receiving stock and advancing the related purchase/order workflow should be atomic where possible.
- Unique SKU, slug, order number, and purchase-order number constraints are database-enforced, not only application-enforced.
- Idempotency keys should be added to order creation and payment callbacks before production payment integration.
- Concurrent receiving or status updates must use conditional updates on the expected current status.

## Decisions Still Requiring Approval

- Exact MVP category list and supported units.
- Whether supplier stock is manually maintained, refreshed by import, or checked per order.
- Payment collection timing and launch payment methods.
- Delivery zones, fee calculation, and confirmation evidence.
- Cancellation and return transition rules.
- Whether one purchase order may serve multiple customer orders; this design allows it.
- Image provider and hosting choices.
- Whether inventory is informational availability only or a fully reserved stock ledger in the MVP.

## Phase 2 Acceptance Criteria

- Application boundaries and module ownership are documented.
- Core collections, relationships, snapshots, and indexes are defined.
- Customer/admin serialization boundaries are explicit.
- Order, purchase-order, delivery, and payment states have allowed transitions.
- Checkout, purchasing, receiving, and profit calculations have server-owned rules.
- Unresolved business decisions are listed without silently inventing values.
