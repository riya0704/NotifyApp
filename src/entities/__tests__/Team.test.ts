import { TeamEntity } from '../Team';
import { CreateTeamRequest, UpdateTeamRequest } from '../../models/Team';

// Helper to introduce a delay in async tests
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('TeamEntity', () => {
    const validCreateRequest: CreateTeamRequest = {
        name: 'Engineering Team',
        organizationId: 'org-456',
        memberIds: ['user-1', 'user-2', 'user-3']
    };

    describe('constructor', () => {
        it('should create a valid team with all required properties', () => {
            const team = new TeamEntity(validCreateRequest);

            expect(team.id).toBeDefined();
            expect(team.name).toBe(validCreateRequest.name);
            expect(team.organizationId).toBe(validCreateRequest.organizationId);
            expect(team.memberIds).toEqual(validCreateRequest.memberIds);
            expect(team.createdAt).toBeInstanceOf(Date);
            expect(team.updatedAt).toBeInstanceOf(Date);
        });

        it('should create team with empty member list when not provided', () => {
            const requestWithoutMembers = {
                name: 'Empty Team',
                organizationId: 'org-456'
            };

            const team = new TeamEntity(requestWithoutMembers);

            expect(team.memberIds).toEqual([]);
        });

        it('should trim whitespace from name', () => {
            const requestWithWhitespace = {
                ...validCreateRequest,
                name: '  Engineering Team  '
            };

            const team = new TeamEntity(requestWithWhitespace);

            expect(team.name).toBe('Engineering Team');
        });

        it('should create a copy of memberIds array', () => {
            const originalMemberIds = ['user-1', 'user-2'];
            const request = {
                ...validCreateRequest,
                memberIds: originalMemberIds
            };

            const team = new TeamEntity(request);

            // Modify original array
            originalMemberIds.push('user-3');

            // Team's memberIds should not be affected
            expect(team.memberIds).toEqual(['user-1', 'user-2']);
        });
    });

    describe('validation', () => {
        describe('name validation', () => {
            it('should throw error for empty name', () => {
                const request = { ...validCreateRequest, name: '' };
                expect(() => new TeamEntity(request)).toThrow('Team name is required');
            });

            it('should throw error for whitespace-only name', () => {
                const request = { ...validCreateRequest, name: '   ' };
                expect(() => new TeamEntity(request)).toThrow('Team name is required');
            });

            it('should throw error for name longer than 100 characters', () => {
                const request = { ...validCreateRequest, name: 'a'.repeat(101) };
                expect(() => new TeamEntity(request)).toThrow('Team name must be 100 characters or less');
            });
        });

        describe('organizationId validation', () => {
            it('should throw error for empty organizationId', () => {
                const request = { ...validCreateRequest, organizationId: '' };
                expect(() => new TeamEntity(request)).toThrow('Organization ID is required');
            });

            it('should throw error for whitespace-only organizationId', () => {
                const request = { ...validCreateRequest, organizationId: '   ' };
                expect(() => new TeamEntity(request)).toThrow('Organization ID is required');
            });
        });

        describe('memberIds validation', () => {
            it('should throw error for empty member ID', () => {
                const request = { ...validCreateRequest, memberIds: ['user-1', '', 'user-3'] };
                expect(() => new TeamEntity(request)).toThrow('All member IDs must be non-empty strings');
            });

            it('should throw error for whitespace-only member ID', () => {
                const request = { ...validCreateRequest, memberIds: ['user-1', '   ', 'user-3'] };
                expect(() => new TeamEntity(request)).toThrow('All member IDs must be non-empty strings');
            });

            it('should throw error for duplicate member IDs', () => {
                const request = { ...validCreateRequest, memberIds: ['user-1', 'user-2', 'user-1'] };
                expect(() => new TeamEntity(request)).toThrow('Duplicate member IDs are not allowed');
            });
        });
    });

    describe('update', () => {
        let team: TeamEntity;

        beforeEach(() => {
            team = new TeamEntity(validCreateRequest);
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should update name successfully', () => {
            const updateRequest: UpdateTeamRequest = { name: 'Updated Team Name' };
            const originalUpdatedAt = team.updatedAt;

            jest.advanceTimersByTime(1);
            team.update(updateRequest);
            expect(team.name).toBe('Updated Team Name');
            expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });

        it('should update memberIds successfully', () => {
            const newMemberIds = ['user-4', 'user-5'];
            const updateRequest: UpdateTeamRequest = { memberIds: newMemberIds };

            team.update(updateRequest);
            expect(team.memberIds).toEqual(newMemberIds);
        });

        it('should validate updated fields', () => {
            const updateRequest: UpdateTeamRequest = { name: '' };
            expect(() => team.update(updateRequest)).toThrow('Team name cannot be empty');
        });

        it('should validate memberIds on update', () => {
            const updateRequest: UpdateTeamRequest = { memberIds: ['user-1', ''] };
            expect(() => team.update(updateRequest)).toThrow('All member IDs must be non-empty strings');
        });

        it('should trim whitespace in updated name', () => {
            const updateRequest: UpdateTeamRequest = { name: '  Updated Name  ' };
            team.update(updateRequest);
            expect(team.name).toBe('Updated Name');
        });

        it('should create a copy of updated memberIds array', () => {
            const newMemberIds = ['user-4', 'user-5'];
            const updateRequest: UpdateTeamRequest = { memberIds: newMemberIds };

            team.update(updateRequest);

            // Modify original array
            newMemberIds.push('user-6');

            // Team's memberIds should not be affected
            expect(team.memberIds).toEqual(['user-4', 'user-5']);
        });
    });

    describe('member management methods', () => {
        let team: TeamEntity;

        beforeEach(() => {
            team = new TeamEntity({
                name: 'Test Team',
                organizationId: 'org-456',
                memberIds: ['user-1', 'user-2']
            });
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('addMember', () => {
            it('should add new member successfully', () => {
                const originalUpdatedAt = team.updatedAt;

                jest.advanceTimersByTime(1);
                team.addMember('user-3');
                expect(team.memberIds).toContain('user-3');
                expect(team.memberIds).toHaveLength(3);
                expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            });

            it('should not add duplicate member', () => {
                team.addMember('user-1');
                expect(team.memberIds).toEqual(['user-1', 'user-2']);
                expect(team.memberIds).toHaveLength(2);
            });

            it('should throw error for empty user ID', () => {
                expect(() => team.addMember('')).toThrow('User ID cannot be empty');
            });

            it('should throw error for whitespace-only user ID', () => {
                expect(() => team.addMember('   ')).toThrow('User ID cannot be empty');
            });
        });

        describe('removeMember', () => {
            it('should remove existing member successfully', () => {
                const originalUpdatedAt = team.updatedAt;

                jest.advanceTimersByTime(1);
                team.removeMember('user-1');
                expect(team.memberIds).not.toContain('user-1');
                expect(team.memberIds).toEqual(['user-2']);
                expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            });

            it('should do nothing when removing non-existent member', () => {
                const originalMemberIds = [...team.memberIds];
                team.removeMember('non-existent-user');
                expect(team.memberIds).toEqual(originalMemberIds);
            });
        });

        describe('hasMember', () => {
            it('should return true for existing member', () => {
                expect(team.hasMember('user-1')).toBe(true);
            });

            it('should return false for non-existing member', () => {
                expect(team.hasMember('user-3')).toBe(false);
            });
        });

        describe('getMemberCount', () => {
            it('should return correct member count', () => {
                expect(team.getMemberCount()).toBe(2);
            });

            it('should return 0 for empty team', () => {
                const emptyTeam = new TeamEntity({
                    name: 'Empty Team',
                    organizationId: 'org-456'
                });
                expect(emptyTeam.getMemberCount()).toBe(0);
            });
        });

        describe('clearMembers', () => {
            it('should remove all members and update timestamp', () => {
                const originalUpdatedAt = team.updatedAt;

                jest.advanceTimersByTime(1);
                team.clearMembers();
                expect(team.memberIds).toEqual([]);
                expect(team.getMemberCount()).toBe(0);
                expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            });
        });
    });

    describe('organization methods', () => {
        let team: TeamEntity;

        beforeEach(() => {
            team = new TeamEntity(validCreateRequest);
        });

        describe('belongsToOrganization', () => {
            it('should return true for matching organization ID', () => {
                expect(team.belongsToOrganization('org-456')).toBe(true);
            });

            it('should return false for non-matching organization ID', () => {
                expect(team.belongsToOrganization('other-org')).toBe(false);
            });
        });
    });

    describe('fromData', () => {
        it('should create TeamEntity from data object', () => {
            const data = {
                id: 'test-id',
                name: 'Test Team',
                organizationId: 'org-456',
                memberIds: ['user-1', 'user-2'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const team = TeamEntity.fromData(data);

            expect(team.id).toBe(data.id);
            expect(team.name).toBe(data.name);
            expect(team.organizationId).toBe(data.organizationId);
            expect(team.memberIds).toEqual(data.memberIds);
            expect(team instanceof TeamEntity).toBe(true);
        });
    });
});
