import { BaseRepository } from './BaseRepository';
import { UserAlertState } from '../models/UserAlertState';

export interface IUserAlertStateRepository {
  findByUserId(userId: string): Promise<UserAlertState[]>;
  findByAlertId(alertId: string): Promise<UserAlertState[]>;
  findByUserAndAlert(userId: string, alertId: string): Promise<UserAlertState | null>;
  findSnoozedStates(userId?: string): Promise<UserAlertState[]>;
  findExpiredSnoozes(): Promise<UserAlertState[]>;
  bulkCreate(states: UserAlertState[]): Promise<UserAlertState[]>;
  bulkUpdateSnoozeStatus(userIds: string[], alertId: string, isSnoozed: boolean): Promise<number>;
  resetExpiredSnoozes(): Promise<number>;
  getReadStatusStats(alertId: string): Promise<{ totalUsers: number; readCount: number; unreadCount: number }>;
  getSnoozeStats(alertId: string): Promise<{ totalUsers: number; snoozedCount: number; activeSnoozedCount: number }>;
}

export class UserAlertStateRepository extends BaseRepository<UserAlertState> implements IUserAlertStateRepository {
  protected getTableName(): string {
    return 'user_alert_states';
  }

  protected mapResultsToEntities(rows: any[]): UserAlertState[] {
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      alertId: row.alert_id,
      isRead: row.is_read,
      isSnoozed: row.is_snoozed,
      snoozeUntil: row.snooze_until ? new Date(row.snooze_until) : undefined,
      lastDelivered: row.last_delivered ? new Date(row.last_delivered) : undefined,
      deliveryCount: row.delivery_count,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  protected mapEntityToRow(entity: UserAlertState): Record<string, any> {
    return {
      id: entity.id,
      user_id: entity.userId,
      alert_id: entity.alertId,
      is_read: entity.isRead,
      is_snoozed: entity.isSnoozed,
      snooze_until: entity.snoozeUntil,
      last_delivered: entity.lastDelivered,
      delivery_count: entity.deliveryCount,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  async create(entity: UserAlertState): Promise<UserAlertState> {
    const result = await this.bulkCreate([entity]);
    return result[0];
  }

  async update(id: string, updates: Partial<UserAlertState>): Promise<UserAlertState> {
    const updateMapping: { [key in keyof Partial<UserAlertState>]: string } = {
      isRead: 'is_read',
      isSnoozed: 'is_snoozed',
      snoozeUntil: 'snooze_until',
      lastDelivered: 'last_delivered',
      deliveryCount: 'delivery_count',
    };

    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const [key, column] of Object.entries(updateMapping)) {
        if (updates.hasOwnProperty(key)) {
          setClauses.push(`${column} = $${paramIndex}`);
          params.push((updates as any)[key]);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClauses.push(`updated_at = $${paramIndex}`);
      params.push(new Date());

      params.push(id);
      const sql = `
        UPDATE ${this.getTableName()} 
        SET ${setClauses.join(', ')} 
        WHERE id = $${params.length} 
        RETURNING *
      `;

      const result = await this.executeQuery(sql, params);
      if (result.rows.length === 0) {
        throw new Error(`UserAlertState with ID ${id} not found`);
      }
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      if (error instanceof Error && (error.message === 'No valid fields to update' || error.message.startsWith('UserAlertState with ID'))) {
        throw error;
      }
      throw this.handleError('update', error);
    }
  }

  async findByUserId(userId: string): Promise<UserAlertState[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE user_id = $1 
        ORDER BY updated_at DESC
      `;
      const result = await this.executeQuery(sql, [userId]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findByUserId', error);
    }
  }

  async findByAlertId(alertId: string): Promise<UserAlertState[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE alert_id = $1 
        ORDER BY updated_at DESC
      `;
      const result = await this.executeQuery(sql, [alertId]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findByAlertId', error);
    }
  }

  async findByUserAndAlert(userId: string, alertId: string): Promise<UserAlertState | null> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE user_id = $1 AND alert_id = $2
      `;
      const result = await this.executeQuery(sql, [userId, alertId]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findByUserAndAlert', error);
    }
  }

  async findSnoozedStates(userId?: string): Promise<UserAlertState[]> {
    try {
      let sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE is_snoozed = true
      `;
      const params: any[] = [];

      if (userId) {
        sql += ' AND user_id = $1';
        params.push(userId);
      }

      sql += ' ORDER BY snooze_until ASC';

      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findSnoozedStates', error);
    }
  }

  async findExpiredSnoozes(): Promise<UserAlertState[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE is_snoozed = true 
        AND snooze_until IS NOT NULL 
        AND snooze_until <= NOW()
        ORDER BY snooze_until ASC
      `;
      const result = await this.executeQuery(sql, []);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findExpiredSnoozes', error);
    }
  }

  async bulkCreate(states: UserAlertState[]): Promise<UserAlertState[]> {
    if (states.length === 0) {
      return [];
    }

    try {
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const state of states) {
        this.validateEntity(state);
        const row = this.mapEntityToRow(state);
        
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`);
        
        params.push(
          row.id, row.user_id, row.alert_id, row.is_read, row.is_snoozed,
          row.snooze_until, row.last_delivered, row.delivery_count, row.created_at, row.updated_at
        );
        
        paramIndex += 10;
      }

      const sql = `
        INSERT INTO ${this.getTableName()} 
        (id, user_id, alert_id, is_read, is_snoozed, snooze_until, last_delivered, delivery_count, created_at, updated_at)
        VALUES ${values.join(', ')}
        ON CONFLICT (user_id, alert_id) DO UPDATE SET
          is_read = EXCLUDED.is_read,
          is_snoozed = EXCLUDED.is_snoozed,
          snooze_until = EXCLUDED.snooze_until,
          last_delivered = EXCLUDED.last_delivered,
          delivery_count = EXCLUDED.delivery_count,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('bulkCreate', error);
    }
  }

  async bulkUpdateSnoozeStatus(userIds: string[], alertId: string, isSnoozed: boolean): Promise<number> {
    if (userIds.length === 0) {
      return 0;
    }

    try {
      const placeholders = userIds.map((_, index) => `$${index + 2}`).join(', ');
      const sql = `
        UPDATE ${this.getTableName()} 
        SET is_snoozed = $1, 
            snooze_until = CASE WHEN $1 = false THEN NULL ELSE snooze_until END,
            updated_at = NOW()
        WHERE alert_id = $${userIds.length + 2} 
        AND user_id IN (${placeholders})
      `;

      const params = [isSnoozed, ...userIds, alertId];
      const result = await this.executeQuery(sql, params);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.handleError('bulkUpdateSnoozeStatus', error);
    }
  }

  async resetExpiredSnoozes(): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.getTableName()} 
        SET is_snoozed = false, 
            snooze_until = NULL,
            updated_at = NOW()
        WHERE is_snoozed = true 
        AND snooze_until IS NOT NULL 
        AND snooze_until <= NOW()
      `;
      const result = await this.executeQuery(sql, []);
      return result.rowCount ?? 0;
    } catch (error) {
      throw this.handleError('resetExpiredSnoozes', error);
    }
  }

  async getReadStatusStats(alertId: string): Promise<{ totalUsers: number; readCount: number; unreadCount: number }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
        FROM ${this.getTableName()} 
        WHERE alert_id = $1
      `;
      const result = await this.executeQuery(sql, [alertId]);
      const row = result.rows[0];
      
      return {
        totalUsers: parseInt(row.total_users, 10),
        readCount: parseInt(row.read_count, 10),
        unreadCount: parseInt(row.unread_count, 10)
      };
    } catch (error) {
      throw this.handleError('getReadStatusStats', error);
    }
  }

  async getSnoozeStats(alertId: string): Promise<{ totalUsers: number; snoozedCount: number; activeSnoozedCount: number }> {
    try {
      const sql = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_snoozed = true THEN 1 END) as snoozed_count,
          COUNT(CASE WHEN is_snoozed = true AND (snooze_until IS NULL OR snooze_until > NOW()) THEN 1 END) as active_snoozed_count
        FROM ${this.getTableName()} 
        WHERE alert_id = $1
      `;
      const result = await this.executeQuery(sql, [alertId]);
      const row = result.rows[0];
      
      return {
        totalUsers: parseInt(row.total_users, 10),
        snoozedCount: parseInt(row.snoozed_count, 10),
        activeSnoozedCount: parseInt(row.active_snoozed_count, 10)
      };
    } catch (error) {
      throw this.handleError('getSnoozeStats', error);
    }
  }

  /**
   * Find states that need reminder processing (not snoozed and delivery count > 0)
   */
  async findStatesNeedingReminders(alertId: string): Promise<UserAlertState[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE alert_id = $1 
        AND (is_snoozed = false OR (is_snoozed = true AND snooze_until IS NOT NULL AND snooze_until <= NOW()))
        ORDER BY last_delivered ASC NULLS FIRST
      `;
      const result = await this.executeQuery(sql, [alertId]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findStatesNeedingReminders', error);
    }
  }

  /**
   * Update delivery information for a user alert state
   */
  async recordDelivery(userId: string, alertId: string): Promise<UserAlertState | null> {
    try {
      const sql = `
        UPDATE ${this.getTableName()} 
        SET last_delivered = NOW(),
            delivery_count = delivery_count + 1,
            updated_at = NOW()
        WHERE user_id = $1 AND alert_id = $2
        RETURNING *
      `;
      const result = await this.executeQuery(sql, [userId, alertId]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('recordDelivery', error);
    }
  }

  /**
   * Get delivery statistics for an alert
   */
  async getDeliveryStats(alertId: string): Promise<{ totalDeliveries: number; uniqueUsers: number; avgDeliveriesPerUser: number }> {
    try {
      const sql = `
        SELECT 
          SUM(delivery_count) as total_deliveries,
          COUNT(CASE WHEN delivery_count > 0 THEN 1 END) as unique_users,
          AVG(delivery_count) as avg_deliveries_per_user
        FROM ${this.getTableName()} 
        WHERE alert_id = $1
      `;
      const result = await this.executeQuery(sql, [alertId]);
      const row = result.rows[0];
      
      return {
        totalDeliveries: parseInt(row.total_deliveries || '0', 10),
        uniqueUsers: parseInt(row.unique_users || '0', 10),
        avgDeliveriesPerUser: parseFloat(row.avg_deliveries_per_user || '0')
      };
    } catch (error) {
      throw this.handleError('getDeliveryStats', error);
    }
  }
}
