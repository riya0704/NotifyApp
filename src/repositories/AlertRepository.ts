import { BaseRepository } from './BaseRepository';
import { Alert, AlertFilters } from '../models/Alert';
import { AlertEntity } from '../entities/Alert';
import { AlertSeverity, AlertStatus, VisibilityType } from '../models/enums';

export interface IAlertRepository {
  findByVisibility(organizationId: string, teamId?: string, userId?: string): Promise<Alert[]>;
  findActiveAlerts(): Promise<Alert[]>;
  findExpiredAlerts(): Promise<Alert[]>;
  findByCreator(createdBy: string): Promise<Alert[]>;
  findWithFilters(filters: AlertFilters): Promise<Alert[]>;
  archiveAlert(id: string): Promise<boolean>;
  markAsExpired(id: string): Promise<boolean>;
  findAlertsForUser(userId: string, teamId: string, organizationId: string): Promise<Alert[]>;
}

export class AlertRepository extends BaseRepository<Alert> implements IAlertRepository {
  protected getTableName(): string {
    return 'alerts';
  }

  protected mapResultsToEntities(rows: any[]): Alert[] {
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      message: row.message,
      severity: row.severity as AlertSeverity,
      deliveryType: row.delivery_type,
      visibility: {
        type: row.visibility_type as VisibilityType,
        targetIds: JSON.parse(row.target_ids)
      },
      startTime: new Date(row.start_time),
      expiryTime: new Date(row.expiry_time),
      reminderEnabled: row.reminder_enabled,
      reminderFrequency: row.reminder_frequency,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      status: row.status as AlertStatus
    }));
  }

  protected mapEntityToRow(entity: Alert): Record<string, any> {
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
      status: entity.status
    };
  }

  async create(entity: Alert): Promise<Alert> {
    this.validateEntity(entity);
    
    const row = this.mapEntityToRow(entity);
    const sql = `
      INSERT INTO ${this.getTableName()} 
      (id, title, message, severity, delivery_type, visibility_type, target_ids, 
       start_time, expiry_time, reminder_enabled, reminder_frequency, created_by, created_at, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const params = [
      row.id, row.title, row.message, row.severity, row.delivery_type,
      row.visibility_type, row.target_ids, row.start_time, row.expiry_time,
      row.reminder_enabled, row.reminder_frequency, row.created_by, row.created_at, row.status
    ];
    
    try {
      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('create', error);
    }
  }

  async findById(id: string): Promise<Alert | null> {
    try {
      const sql = `SELECT * FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(sql, [id]);
      const entities = this.mapResultsToEntities(result.rows);
      return entities.length > 0 ? entities[0] : null;
    } catch (error) {
      throw this.handleError('findById', error);
    }
  }

  async update(id: string, updates: Partial<Alert>): Promise<Alert> {
    this.validateEntity(updates);
    
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Map updates to database columns
    const columnMappings: Record<string, string> = {
      title: 'title',
      message: 'message',
      severity: 'severity',
      deliveryType: 'delivery_type',
      startTime: 'start_time',
      expiryTime: 'expiry_time',
      reminderEnabled: 'reminder_enabled',
      reminderFrequency: 'reminder_frequency',
      status: 'status'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === 'visibility') {
          setClauses.push(`visibility_type = $${paramIndex}`);
          params.push((value as any).type);
          paramIndex++;
          setClauses.push(`target_ids = $${paramIndex}`);
          params.push(JSON.stringify((value as any).targetIds));
          paramIndex++;
        } else if (columnMappings[key]) {
          setClauses.push(`${columnMappings[key]} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(id);
    const sql = `
      UPDATE ${this.getTableName()} 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `;

    try {
      const result = await this.executeQuery(sql, params);
      if (result.rows.length === 0) {
        throw new Error(`Alert with ID ${id} not found`);
      }
      return this.mapResultsToEntities(result.rows)[0];
    } catch (error) {
      throw this.handleError('update', error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const sql = `DELETE FROM ${this.getTableName()} WHERE id = $1`;
      const result = await this.executeQuery(sql, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw this.handleError('delete', error);
    }
  }

  async findByVisibility(organizationId: string, teamId?: string, userId?: string): Promise<Alert[]> {
    try {
      let sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE status = $1 AND start_time <= NOW() AND expiry_time > NOW()
        AND (
          (visibility_type = $2 AND target_ids::jsonb ? $3)
      `;
      
      const params = [AlertStatus.ACTIVE, VisibilityType.ORGANIZATION, organizationId];
      let paramIndex = 4;

      if (teamId) {
        sql += ` OR (visibility_type = $${paramIndex} AND target_ids::jsonb ? $${paramIndex + 1})`;
        params.push(VisibilityType.TEAM, teamId);
        paramIndex += 2;
      }

      if (userId) {
        sql += ` OR (visibility_type = $${paramIndex} AND target_ids::jsonb ? $${paramIndex + 1})`;
        params.push(VisibilityType.USER, userId);
      }

      sql += ') ORDER BY created_at DESC';

      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findByVisibility', error);
    }
  }

  async findActiveAlerts(): Promise<Alert[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE status = $1 AND start_time <= NOW() AND expiry_time > NOW()
        ORDER BY created_at DESC
      `;
      const result = await this.executeQuery(sql, [AlertStatus.ACTIVE]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findActiveAlerts', error);
    }
  }

  async findExpiredAlerts(): Promise<Alert[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE (status = $1 AND expiry_time <= NOW()) OR status = $2
        ORDER BY expiry_time DESC
      `;
      const result = await this.executeQuery(sql, [AlertStatus.ACTIVE, AlertStatus.EXPIRED]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findExpiredAlerts', error);
    }
  }

  async findByCreator(createdBy: string): Promise<Alert[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE created_by = $1 
        ORDER BY created_at DESC
      `;
      const result = await this.executeQuery(sql, [createdBy]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findByCreator', error);
    }
  }

  async findWithFilters(filters: AlertFilters): Promise<Alert[]> {
    try {
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.severity) {
        conditions.push(`severity = $${paramIndex}`);
        params.push(filters.severity);
        paramIndex++;
      }

      if (filters.status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.visibilityType) {
        conditions.push(`visibility_type = $${paramIndex}`);
        params.push(filters.visibilityType);
        paramIndex++;
      }

      if (filters.createdBy) {
        conditions.push(`created_by = $${paramIndex}`);
        params.push(filters.createdBy);
        paramIndex++;
      }

      if (filters.startDate) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.endDate);
        paramIndex++;
      }

      let sql = `SELECT * FROM ${this.getTableName()}`;
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      sql += ' ORDER BY created_at DESC';

      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findWithFilters', error);
    }
  }

  async archiveAlert(id: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE ${this.getTableName()} 
        SET status = $1 
        WHERE id = $2 AND status != $3
      `;
      const result = await this.executeQuery(sql, [AlertStatus.ARCHIVED, id, AlertStatus.ARCHIVED]);
      return result.rowCount > 0;
    } catch (error) {
      throw this.handleError('archiveAlert', error);
    }
  }

  async markAsExpired(id: string): Promise<boolean> {
    try {
      const sql = `
        UPDATE ${this.getTableName()} 
        SET status = $1 
        WHERE id = $2 AND status = $3
      `;
      const result = await this.executeQuery(sql, [AlertStatus.EXPIRED, id, AlertStatus.ACTIVE]);
      return result.rowCount > 0;
    } catch (error) {
      throw this.handleError('markAsExpired', error);
    }
  }

  async findAlertsForUser(userId: string, teamId: string, organizationId: string): Promise<Alert[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE status = $1 AND start_time <= NOW() AND expiry_time > NOW()
        AND (
          (visibility_type = $2 AND target_ids::jsonb ? $3) OR
          (visibility_type = $4 AND target_ids::jsonb ? $5) OR
          (visibility_type = $6 AND target_ids::jsonb ? $7)
        )
        ORDER BY severity DESC, created_at DESC
      `;
      
      const params = [
        AlertStatus.ACTIVE,
        VisibilityType.ORGANIZATION, organizationId,
        VisibilityType.TEAM, teamId,
        VisibilityType.USER, userId
      ];

      const result = await this.executeQuery(sql, params);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findAlertsForUser', error);
    }
  }

  /**
   * Batch update alert statuses for expired alerts
   */
  async markExpiredAlerts(): Promise<number> {
    try {
      const sql = `
        UPDATE ${this.getTableName()} 
        SET status = $1 
        WHERE status = $2 AND expiry_time <= NOW()
      `;
      const result = await this.executeQuery(sql, [AlertStatus.EXPIRED, AlertStatus.ACTIVE]);
      return result.rowCount;
    } catch (error) {
      throw this.handleError('markExpiredAlerts', error);
    }
  }

  /**
   * Find alerts that need reminder processing
   */
  async findAlertsNeedingReminders(): Promise<Alert[]> {
    try {
      const sql = `
        SELECT * FROM ${this.getTableName()} 
        WHERE status = $1 
        AND reminder_enabled = true 
        AND start_time <= NOW() 
        AND expiry_time > NOW()
        ORDER BY created_at ASC
      `;
      const result = await this.executeQuery(sql, [AlertStatus.ACTIVE]);
      return this.mapResultsToEntities(result.rows);
    } catch (error) {
      throw this.handleError('findAlertsNeedingReminders', error);
    }
  }
}