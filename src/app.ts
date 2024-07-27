import express, { Application, Request, Response } from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './helpers/Logger';
import { baseRouter } from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';

export const app: Application = express();

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

app.use(requestLogger);

app.use('/api', baseRouter);

app.all('*', (_: Request, res: Response) => {
  logger.log('Invalid Path in request')
  res.status(404).send('Path Not Found');
});

app.use(errorHandler);

export default app;