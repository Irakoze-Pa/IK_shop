import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDatabase, getDatabaseStatus } from './database/connection.js';
import { authRouter } from './auth/routes.js';
import { catalogRouter } from './catalog/routes.js';
import { cartRouter } from './cart/routes.js';
import { ordersRouter } from './orders/routes.js';
import { purchasingRouter } from './purchasing/routes.js';
import { deliveryRouter } from './delivery/routes.js';
import { reportsRouter } from './reports/routes.js';
import { notificationsRouter } from './notifications/routes.js';
import { auditRouter } from './audit/routes.js';
import { usersRouter } from './users/routes.js';

const app = express();
const allowedOrigins = new Set([env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:5174']);

app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', catalogRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/admin', purchasingRouter);
app.use('/api/v1/deliveries', deliveryRouter);
app.use('/api/v1/admin/reports', reportsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/admin/audit-logs', auditRouter);
app.use('/api/v1/admin/users', usersRouter);

app.get('/api/v1/health', (_request, response) => {
  const database = getDatabaseStatus();

  response.json({
    status: database === 'connected' ? 'ok' : 'degraded',
    service: 'ik-shop-server',
    database,
    timestamp: new Date().toISOString(),
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', error);
  response.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`IK Shop server listening on port ${env.PORT}`);
});


void connectDatabase();
