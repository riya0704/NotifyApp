import { UserEntity } from '../User';
import { CreateUserRequest, UpdateUserRequest } from '../../models/User';

describe('UserEntity', () => {
  const validCreateRequest: CreateUserRequest = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    teamId: 'team-123',
    organizationId: 'org-456'
  };

  describe('constructor', () => {
    it('should create a valid user with all required properties', () => {
      const user = new UserEntity(validCreateRequest);

      expect(user.id).toBeDefined();
      expect(user.name).toBe(validCreateRequest.name);
      expect(user.email).toBe(validCreateRequest.email.toLowerCase());
      expect(user.teamId).toBe(validCreateRequest.teamId);
      expect(user.organizationId).toBe(validCreateRequest.organizationId);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should trim whitespace from name and normalize email', () => {
      const requestWithWhitespace = {
        ...validCreateRequest,
        name: '  John Doe  ',
        email: '  JOHN.DOE@EXAMPLE.COM  '
      };

      const user = new UserEntity(requestWithWhitespace);

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john.doe@example.com');
    });
  });

  describe('validation', () => {
    describe('name validation', () => {
      it('should throw error for empty name', () => {
        const request = { ...validCreateRequest, name: '' };
        expect(() => new UserEntity(request)).toThrow('User name is required');
      });

      it('should throw error for whitespace-only name', () => {
        const request = { ...validCreateRequest, name: '   ' };
        expect(() => new UserEntity(request)).toThrow('User name is required');
      });

      it('should throw error for name longer than 100 characters', () => {
        const request = { ...validCreateRequest, name: 'a'.repeat(101) };
        expect(() => new UserEntity(request)).toThrow('User name must be 100 characters or less');
      });
    });

    describe('email validation', () => {
      it('should throw error for empty email', () => {
        const request = { ...validCreateRequest, email: '' };
        expect(() => new UserEntity(request)).toThrow('User email is required');
      });

      it('should throw error for invalid email format', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
          'user..name@example.com',
          'user name@example.com'
        ];

        invalidEmails.forEach(email => {
          const request = { ...validCreateRequest, email };
          expect(() => new UserEntity(request)).toThrow('Invalid email format');
        });
      });

      it('should accept valid email formats', () => {
        const validEmails = [
          'user@example.com',
          'user.name@example.com',
          'user+tag@example.co.uk',
          'user123@example-domain.com'
        ];

        validEmails.forEach(email => {
          const request = { ...validCreateRequest, email };
          expect(() => new UserEntity(request)).not.toThrow();
        });
      });
    });

    describe('teamId validation', () => {
      it('should throw error for empty teamId', () => {
        const request = { ...validCreateRequest, teamId: '' };
        expect(() => new UserEntity(request)).toThrow('Team ID is required');
      });

      it('should throw error for whitespace-only teamId', () => {
        const request = { ...validCreateRequest, teamId: '   ' };
        expect(() => new UserEntity(request)).toThrow('Team ID is required');
      });
    });

    describe('organizationId validation', () => {
      it('should throw error for empty organizationId', () => {
        const request = { ...validCreateRequest, organizationId: '' };
        expect(() => new UserEntity(request)).toThrow('Organization ID is required');
      });

      it('should throw error for whitespace-only organizationId', () => {
        const request = { ...validCreateRequest, organizationId: '   ' };
        expect(() => new UserEntity(request)).toThrow('Organization ID is required');
      });
    });
  });

  describe('update', () => {
    let user: UserEntity;

    beforeEach(() => {
      user = new UserEntity(validCreateRequest);
    });

    it('should update name successfully', () => {
      const updateRequest: UpdateUserRequest = { name: 'Jane Doe' };
      const originalUpdatedAt = user.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        user.update(updateRequest);
        expect(user.name).toBe('Jane Doe');
        expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 1);
    });

    it('should update email successfully and normalize it', () => {
      const updateRequest: UpdateUserRequest = { email: 'JANE.DOE@EXAMPLE.COM' };
      user.update(updateRequest);
      expect(user.email).toBe('jane.doe@example.com');
    });

    it('should update teamId successfully', () => {
      const updateRequest: UpdateUserRequest = { teamId: 'new-team-456' };
      user.update(updateRequest);
      expect(user.teamId).toBe('new-team-456');
    });

    it('should update isActive successfully', () => {
      const updateRequest: UpdateUserRequest = { isActive: false };
      user.update(updateRequest);
      expect(user.isActive).toBe(false);
    });

    it('should validate updated fields', () => {
      const updateRequest: UpdateUserRequest = { name: '' };
      expect(() => user.update(updateRequest)).toThrow('User name cannot be empty');
    });

    it('should validate email format on update', () => {
      const updateRequest: UpdateUserRequest = { email: 'invalid-email' };
      expect(() => user.update(updateRequest)).toThrow('Invalid email format');
    });

    it('should trim whitespace in updated fields', () => {
      const updateRequest: UpdateUserRequest = { name: '  Updated Name  ' };
      user.update(updateRequest);
      expect(user.name).toBe('Updated Name');
    });
  });

  describe('status methods', () => {
    let user: UserEntity;

    beforeEach(() => {
      user = new UserEntity(validCreateRequest);
    });

    describe('deactivate', () => {
      it('should set isActive to false and update timestamp', () => {
        const originalUpdatedAt = user.updatedAt;
        
        setTimeout(() => {
          user.deactivate();
          expect(user.isActive).toBe(false);
          expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });
    });

    describe('activate', () => {
      it('should set isActive to true and update timestamp', () => {
        user.deactivate();
        const originalUpdatedAt = user.updatedAt;
        
        setTimeout(() => {
          user.activate();
          expect(user.isActive).toBe(true);
          expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        }, 1);
      });
    });
  });

  describe('membership methods', () => {
    let user: UserEntity;

    beforeEach(() => {
      user = new UserEntity(validCreateRequest);
    });

    describe('belongsToTeam', () => {
      it('should return true for matching team ID', () => {
        expect(user.belongsToTeam('team-123')).toBe(true);
      });

      it('should return false for non-matching team ID', () => {
        expect(user.belongsToTeam('other-team')).toBe(false);
      });
    });

    describe('belongsToOrganization', () => {
      it('should return true for matching organization ID', () => {
        expect(user.belongsToOrganization('org-456')).toBe(true);
      });

      it('should return false for non-matching organization ID', () => {
        expect(user.belongsToOrganization('other-org')).toBe(false);
      });
    });
  });

  describe('fromData', () => {
    it('should create UserEntity from data object', () => {
      const data = {
        id: 'test-id',
        name: 'Test User',
        email: 'test@example.com',
        teamId: 'team-123',
        organizationId: 'org-456',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = UserEntity.fromData(data);

      expect(user.id).toBe(data.id);
      expect(user.name).toBe(data.name);
      expect(user.email).toBe(data.email);
      expect(user instanceof UserEntity).toBe(true);
    });
  });
});