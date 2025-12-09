import {
  handleDepartmentCreated,
  handleDepartmentUpdated,
  handleDepartmentDeleted
} from '../src/handlers/department.handlers.js';

describe('Department Handlers', () => {
  let testTransaction;

  beforeEach(async () => {
    testTransaction = await createTestTransaction();
  });

  afterEach(async () => {
    if (testTransaction) {
      await testTransaction.rollback();
    }
  });

  describe('handleDepartmentCreated', () => {
    test('should create a new department when it does not exist', async () => {
      const event = {
        data: {
          id: 1,
          name: 'Test Department',
          cost_center_code: 'CC001',
          version: 1
        }
      };

      const result = await handleDepartmentCreated(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeTruthy();
      expect(department.name).toBe('Test Department');
      expect(department.cost_center_code).toBe('CC001');
      expect(department.version).toBe('1');
    });

    test('should skip when version is outdated', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Existing Department',
        cost_center_code: 'CC001',
        version: '2',
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          name: 'Test Department',
          cost_center_code: 'CC001',
          version: 1
        }
      };

      const result = await handleDepartmentCreated(event, testTransaction);

      expect(result).toEqual({
        skip: true,
        reason: 'version outdated'
      });
    });

    test('should update existing department when version is newer', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Old Department',
        cost_center_code: 'CC001',
        version: '1',
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          name: 'Updated Department',
          cost_center_code: 'CC002',
          version: 2
        }
      };

      const result = await handleDepartmentCreated(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department.name).toBe('Updated Department');
      expect(department.cost_center_code).toBe('CC002');
      expect(department.version).toBe('2');
    });

    test('should handle string payload', async () => {
      const event = {
        data: JSON.stringify({
          id: 1,
          name: 'Test Department',
          cost_center_code: 'CC001',
          version: 1
        })
      };

      const result = await handleDepartmentCreated(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeTruthy();
      expect(department.name).toBe('Test Department');
    });
  });

  describe('handleDepartmentUpdated', () => {
    test('should update existing department', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Old Department',
        cost_center_code: 'CC001',
        version: 1,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      });

      const event = {
        data: {
          id: 1,
          name: 'Updated Department',
          cost_center_code: 'CC002',
          created_at: '2023-01-01',
          updated_at: '2023-01-02',
          version: 2
        }
      };

      const result = await handleDepartmentUpdated(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department.name).toBe('Updated Department');
      expect(department.cost_center_code).toBe('CC002');
      expect(department.version).toBe('2');
    });

    test('should create department if it does not exist', async () => {
      const event = {
        data: {
          id: 1,
          name: 'New Department',
          cost_center_code: 'CC001',
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
          version: 1
        }
      };

      const result = await handleDepartmentUpdated(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeTruthy();
      expect(department.name).toBe('New Department');
    });

    test('should skip when version is outdated', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Existing Department',
        cost_center_code: 'CC001',
        version: 2,
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          name: 'Old Version',
          cost_center_code: 'CC001',
          version: 1
        }
      };

      const result = await handleDepartmentUpdated(event, testTransaction);

      expect(result).toEqual({
        skip: true,
        reason: 'version outdated'
      });
    });
  });

  describe('handleDepartmentDeleted', () => {
    test('should delete existing department', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Department to Delete',
        cost_center_code: 'CC001',
        version: 1,
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          version: 2
        }
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeFalsy();
    });

    test('should return ok when department does not exist', async () => {
      const event = {
        data: {
          id: 999,
          version: 1
        }
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({ ok: true });
    });

    test('should skip when version is outdated', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Existing Department',
        cost_center_code: 'CC001',
        version: 3,
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          version: 2
        }
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({
        skip: true,
        reason: 'version outdated'
      });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeTruthy();
    });

    test('should delete when version is equal', async () => {
      await testTransaction('departments').insert({
        id: 1,
        name: 'Department to Delete',
        cost_center_code: 'CC001',
        version: 2,
        created_at: new Date(),
        updated_at: new Date()
      });

      const event = {
        data: {
          id: 1,
          version: 2
        }
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({ ok: true });

      const department = await testTransaction('departments').where({ id: 1 }).first();
      expect(department).toBeFalsy();
    });

    test('should skip when payload is invalid', async () => {
      const event = {
        data: null
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({
        skip: true,
        reason: 'department id not found in payload'
      });
    });

    test('should skip when department id is missing', async () => {
      const event = {
        data: {
          version: 1
        }
      };

      const result = await handleDepartmentDeleted(event, testTransaction);

      expect(result).toEqual({
        skip: true,
        reason: 'department id not found in payload'
      });
    });
  });
});
