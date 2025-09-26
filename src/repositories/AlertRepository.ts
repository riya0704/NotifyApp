import { Pool } from 'pg';
import { BaseRepository } from './BaseRepository';
import { Alert, AlertFilters, UpdateAlertRequest } from '../models/Alert';
import { AlertEntity } from '../entities/Alert';
import { AlertSeverity, AlertStatus, DeliveryType, VisibilityType } from '../models/enums';

export interface IAlertRepository {
  create(entity: AlertEntity): Promise<AlertEntity>;
  findById(id: string): Promise<AlertEntity | null>;
  update(id: string, updates: UpdateAlertRequest): Promise<AlertEntity>;
  delete(id: string): Promise<boolean>;
  findByVisibility(visibilityIds: { organizationId?: string, teamId?: string, userId?: string }): Promise<AlertEntity[]>;
  findActiveAlerts(): Promise<AlertEntity[]>;
  findExpiredAlerts(): Promise<AlertEntity[]>;
  findByCreator(createdBy: string): Promise<AlertEntity[]>;
  findWithFilters(filters: AlertFilters): Promise<AlertEntity[]>;
  archiveAlert(id: string): Promise<boolean>;
  markAsExpired(id: string): Promise<boolean>;
  findAlertsForUser(userId: string, teamId: string, organizationId: string): Promise<AlertEntity[]>;
  markExpiredAlerts(): Promise<number>;
  findAlertsNeedingReminders(): Promise<AlertEntity[]>;
}

export class AlertRepository extends BaseRepository<AlertEntity, string> implements IAlertRepository {
  constructor(pool: Pool) {
    super(pool);
  }

  protected getTableName(): string {
    return 'alerts';
  }

  protected mapResultsToEntities(rows: any[]): AlertEntity[] {
    if (!rows || rows.length === 0) {
      return [];
    }
    return rows.map(row => AlertEntity.fromData({
      id: row.id,
      title: row.title,
      message: row.message,
      severity: row.severity as AlertSeverity,
      deliveryType: row.delivery_type as DeliveryType,
      visibility: {
        type: row.visibility_type as VisibilityType,
        targetIds: typeof row.target_ids === 'string' ? JSON.parse(row.target_ids) : row.target_ids,
      },
      startTime: new Date(row.start_time),
      expiryTime: new Date(row.expiry_time),
      reminderEnabled: row.reminder_enabled,
      reminderFrequency: row.reminder_frequency,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      status: row.status as AlertStatus,
    }));
  }

  protected mapEntityToRow(entity: AlertEntity): Record<string, any> {
    return {
      id: entity.id,
      title: entity.title,
      message: entity.message,
      severity: entity.severity,
      delivery_type: entity.deliveryType,
      visibility_type: entity.visibility.type,
      target_ids: JSON.stringify(entity.visibility.targetIds),
      start_time: entity.startTime,
      expiry_time: entity.expiryTime,
      reminder_enabled: entity.reminderEnabled,
      reminder_frequency: entity.reminderFrequency,
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      status: entity.status,
    };
  }

  async update(id: string, updates: UpdateAlertRequest): Promise<AlertEntity> {
    const updateMapping = {
      title: 'title',
      message: 'message',
      severity: 'severity',
      deliveryType: 'delivery_type',
      startTime: 'start_time',
      expiryTime: 'expiry_time',
      reminderEnabled: 'reminder_enabled',
      reminderFrequency: 'reminder_frequency',
      status: 'status',
    };
  
    try {
      const validUpdates: { [key: string]: any } = {};
  
      for (const [key, column] of Object.entries(updateMapping)) {
        if (updates.hasOwnProperty(key)) {
          validUpdates[column] = (updates as any)[key];
        }
      }
  
      if (updates.visibility) {
        validUpdates.visibility_type = updates.visibility.type;
        validUpdates.target_ids = JSON.stringify(updates.visibility.targetIds);
      }
  
      const columns = Object.keys(validUpdates);
      if (columns.length === 0) {
        throw new Error('No valid fields to update');
      }
  
      const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
      const params = [...Object.values(validUpdates), id];
  
      const query = `
        UPDATE ${this.getTableName()}
        SET ${setClause}
        WHERE id = $${params.length}
        RETURNING *
      `;
  
      const result = await this.executeQuery(query, params);
      if (result.rows.length === 0) {
        throw new Error(`Alert with ID ${id} not found`);
      }
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      if (error instanceof Error && (error.message === 'No valid fields to update' || error.message.startsWith('Alert with ID'))) {
        throw error;
      }
      throw this.handleError('update', error);
    }
  }

  async findByVisibility(visibilityIds: { organizationId?: string, teamId?: string, userId?: string }): Promise<AlertEntity[]> {
    const visibilityMapping = {
      organizationId: VisibilityType.ORGANIZATION,
      teamId: VisibilityType.TEAM,
      userId: VisibilityType.USER,
    };

    const queryParts: string[] = [];
    const params: any[] = [AlertStatus.ACTIVE];
    let paramIndex = 2;

    for (const [key, type] of Object.entries(visibilityMapping)) {
      if (visibilityIds.hasOwnProperty(key) && (visibilityIds as any)[key]) {
        queryParts.push(`(visibility_type = $${paramIndex++} AND target_ids::jsonb ? $${paramIndex++})`);
        params.push(type, (visibilityIds as any)[key]);
      }
    }
    
    if (queryParts.length === 0) {
        return [];
    }

    const query = `
      SELECT * FROM ${this.getTableName()}
      WHERE status = $1 AND (${queryParts.join(' OR ')})
      ORDER BY severity DESC, created_at DESC
    `;
    
    const result = await this.executeQuery(query, params);
    return this.mapResultsToEntities(result.rows);
  }

  async findActiveAlerts(): Promise<AlertEntity[]> {
    const query = `
      SELECT * FROM ${this.getTableName()}
      WHERE status = $1 AND start_time <= NOW() AND expiry_time > NOW()
      ORDER BY created_at DESC
    `;
    const result = await this.executeQuery(query, [AlertStatus.ACTIVE]);
    return this.mapResultsToEntities(result.rows);
  }

  async findExpiredAlerts(): Promise<AlertEntity[]> {
    const query = `
      SELECT * FROM ${this.getTableName()}
      WHERE (status = $1 AND expiry_time <= NOW()) OR status = $2
      ORDER BY created_at DESC
    `;
    const result = await this.executeQuery(query, [AlertStatus.ACTIVE, AlertStatus.EXPIRED]);
    return this.mapResultsToEntities(result.rows);
  }

  async findByCreator(createdBy: string): Promise<AlertEntity[]> {
    const query = `SELECT * FROM ${this.getTableName()} WHERE created_by = $1 ORDER BY created_at DESC`;
    const result = await this.executeQuery(query, [createdBy]);
    return this.mapResultsToEntities(result.rows);
  }

  async findWithFilters(filters: AlertFilters): Promise<AlertEntity[]> {
    const filterMapping: { [key in keyof AlertFilters]: (p: number) => string } = {
      severity: (p) => `severity = $${p}`,
      status: (p) => `status = $${p}`,
      createdBy: (p) => `created_by = $${p}`,
      startDate: (p) => `created_at >= $${p}`,
      endDate: (p) => `created_at <= $${p}`,
    };

    const queryParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, getClause] of Object.entries(filterMapping)) {
      if (filters.hasOwnProperty(key)) {
        queryParts.push(getClause(paramIndex++));
        params.push((filters as any)[key]);
      }
    }

    const whereClause = queryParts.length > 0 ? `WHERE ${queryParts.join(' AND ')}` : '';
    const query = `SELECT * FROM ${this.getTableName()} ${whereClause} ORDER BY created_at DESC`;
    
    const result = await this.executeQuery(query, params);
    return this.mapResultsToEntities(result.rows);
  }

  async archiveAlert(id: string): Promise<boolean> {
    const query = `
      UPDATE ${this.getTableName()}
      SET status = $1
      WHERE id = $2 AND status != $1
    `;
    const result = await this.executeQuery(query, [AlertStatus.ARCHIVED, id]);
    return (result.rowCount ?? 0) > 0;
  }

  async markAsExpired(id: string): Promise<boolean> {
    const query = `
      UPDATE ${this.getTableName()}
      SET status = $1
      WHERE id = $2 AND status = $3
    `;
    const result = await this.executeQuery(query, [AlertStatus.EXPIRED, id, AlertStatus.ACTIVE]);
    return (result.rowCount ?? 0) > 0;
  }

  async findAlertsForUser(userId: string, teamId: string, organizationId: string): Promise<AlertEntity[]> {
    return this.findByVisibility({ userId, teamId, organizationId });
  }

  async markExpiredAlerts(): Promise<number> {
    const query = `
      UPDATE ${this.getTableName()}
      SET status = $1
      WHERE status = $2 AND expiry_time <= NOW()
    `;
    const result = await this.executeQuery(query, [AlertStatus.EXPIRED, AlertStatus.ACTIVE]);
    return result.rowCount ?? 0;
  }

  async findAlertsNeedingReminders(): Promise<AlertEntity[]> {
    const query = `
      SELECT * FROM ${this.getTableName()}
      WHERE status = $1 AND reminder_enabled = true AND expiry_time > NOW()
    `;
    const result = await this.executeQuery(query, [AlertStatus.ACTIVE]);
    return this.mapResultsToEntities(result.rows);
  }
}
