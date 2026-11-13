import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createSuccessResponse } from './utils/apiResponse';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json(createSuccessResponse('OK', { uptime: process.uptime() }));
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
