
import { Pool } from 'pg';
import { defaultDatabaseConfig } from './config/database';

export const AppDataSource = new Pool(defaultDatabaseConfig);
