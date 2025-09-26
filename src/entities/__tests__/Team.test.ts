
import { TeamEntity } from '../Team';
import { CreateTeamRequest, UpdateTeamRequest, Team as ITeam } from '../../models/Team';

describe('TeamEntity', () => {
    const validCreateRequest: CreateTeamRequest = {
        name: 'Engineering Team',
        organizationId: 'org-456',
    };

    describe('constructor', () => {
        it('should create a valid team with all required properties', () => {
            const team = new TeamEntity(validCreateRequest);

            expect(team.id).toBeDefined();
            expect(team.name).toBe(validCreateRequest.name);
            expect(team.organizationId).toBe(validCreateRequest.organizationId);
            expect(team.isActive).toBe(true);
            expect(team.createdAt).toBeInstanceOf(Date);
            expect(team.updatedAt).toBeInstanceOf(Date);
            expect(team.createdAt).toEqual(team.updatedAt);
        });

        it('should trim whitespace from name', () => {
            const requestWithWhitespace: CreateTeamRequest = {
                ...validCreateRequest,
                name: '  Engineering Team  ',
            };

            const team = new TeamEntity(requestWithWhitespace);
            expect(team.name).toBe('Engineering Team');
        });

        it('should throw an error for an empty name', () => {
            const invalidRequest: CreateTeamRequest = { ...validCreateRequest, name: '' };
            expect(() => new TeamEntity(invalidRequest)).toThrow('Team name is required');
        });

        it('should throw an error for a name with only whitespace', () => {
            const invalidRequest: CreateTeamRequest = { ...validCreateRequest, name: '   ' };
            expect(() => new TeamEntity(invalidRequest)).toThrow('Team name is required');
        });

        it('should throw an error for a name longer than 100 characters', () => {
            const invalidRequest: CreateTeamRequest = { ...validCreateRequest, name: 'a'.repeat(101) };
            expect(() => new TeamEntity(invalidRequest)).toThrow('Team name must be 100 characters or less');
        });

        it('should throw an error for an empty organizationId', () => {
            const invalidRequest: CreateTeamRequest = { ...validCreateRequest, organizationId: '' };
            expect(() => new TeamEntity(invalidRequest)).toThrow('Organization ID is required');
        });
    });

    describe('update', () => {
        let team: TeamEntity;

        beforeEach(() => {
            team = new TeamEntity(validCreateRequest);
            // Ensure createdAt and updatedAt are not the same before update
            jest.useFakeTimers();
            jest.advanceTimersByTime(100);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should update the name successfully', () => {
            const originalUpdatedAt = team.updatedAt;
            const updateRequest: UpdateTeamRequest = { name: 'New Engineering Team' };
            
            jest.advanceTimersByTime(1);
            team.update(updateRequest);

            expect(team.name).toBe('New Engineering Team');
            expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });

        it('should update the isActive status successfully', () => {
            const originalUpdatedAt = team.updatedAt;
            const updateRequest: UpdateTeamRequest = { isActive: false };

            jest.advanceTimersByTime(1);
            team.update(updateRequest);

            expect(team.isActive).toBe(false);
            expect(team.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });

        it('should trim whitespace from the updated name', () => {
            const updateRequest: UpdateTeamRequest = { name: '  New Name  ' };
            team.update(updateRequest);
            expect(team.name).toBe('New Name');
        });

        it('should throw an error if the updated name is empty', () => {
            const updateRequest: UpdateTeamRequest = { name: '' };
            expect(() => team.update(updateRequest)).toThrow('Team name cannot be empty');
        });

        it('should throw an error if the updated name is longer than 100 characters', () => {
            const updateRequest: UpdateTeamRequest = { name: 'a'.repeat(101) };
            expect(() => team.update(updateRequest)).toThrow('Team name must be 100 characters or less');
        });

        it('should not change properties if the update request is empty', () => {
            const originalTeam = { ...team };
            const updateRequest: UpdateTeamRequest = {};
            
            team.update(updateRequest);

            expect(team.name).toBe(originalTeam.name);
            expect(team.isActive).toBe(originalTeam.isActive);
            // updatedAt should still be updated even with an empty request
            expect(team.updatedAt.getTime()).toBeGreaterThan(originalTeam.updatedAt.getTime());
        });
    });

    describe('deactivate and activate', () => {
        it('should deactivate the team', () => {
            const team = new TeamEntity(validCreateRequest);
            team.deactivate();
            expect(team.isActive).toBe(false);
        });

        it('should activate the team', () => {
            const team = new TeamEntity(validCreateRequest);
            team.isActive = false; // Start with a deactivated team
            team.activate();
            expect(team.isActive).toBe(true);
        });
    });

    describe('belongsToOrganization', () => {
        it('should return true if the team belongs to the organization', () => {
            const team = new TeamEntity(validCreateRequest);
            expect(team.belongsToOrganization('org-456')).toBe(true);
        });

        it('should return false if the team does not belong to the organization', () => {
            const team = new TeamEntity(validCreateRequest);
            expect(team.belongsToOrganization('org-789')).toBe(false);
        });
    });

    describe('fromData', () => {
        it('should create a TeamEntity from a data object', () => {
            const teamData: ITeam = {
                id: 'team-123',
                name: 'Data Team',
                organizationId: 'org-789',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const team = TeamEntity.fromData(teamData);

            expect(team).toBeInstanceOf(TeamEntity);
            expect(team.id).toBe(teamData.id);
            expect(team.name).toBe(teamData.name);
            expect(team.organizationId).toBe(teamData.organizationId);
            expect(team.isActive).toBe(teamData.isActive);
            expect(team.createdAt).toEqual(teamData.createdAt);
            expect(team.updatedAt).toEqual(teamData.updatedAt);
        });
    });
});
