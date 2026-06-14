import { describe, it, expect, jest } from '@jest/globals';
import { ActivityPersistenceServiceImpl } from '../../../../src/persistence/service/ActivityPersistenceServiceImpl.js';
import { Page } from '../../../../src/domain/dto/Page.js';
import { ActivityDTO } from '../../../../src/domain/dto/ActivityDTO.js';

describe('ActivityPersistenceServiceImpl', () => {
  const buildMocks = () => {
    const activityRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      deleteCascadingById: jest.fn(),
      addEmployees: jest.fn(),
      removeEmployees: jest.fn(),
      replaceEmployees: jest.fn(),
      findByEmployeeUuid: jest.fn(),
      hasEmployee: jest.fn()
    };
    const activityMapper = {
      fromDTO: jest.fn(),
      toDTO: jest.fn()
    };
    const service = new ActivityPersistenceServiceImpl(activityRepository, activityMapper);
    return { activityRepository, activityMapper, service };
  };

  it('findAll maps entities to DTOs and wraps in a Page', async () => {
    const { activityRepository, activityMapper, service } = buildMocks();
    const entities = [{ id: 1 }];
    const dtos = [new ActivityDTO({ id: 1, name: 'shop' })];
    activityRepository.findAll.mockResolvedValue({ rows: entities, total: 1 });
    activityMapper.toDTO.mockReturnValue(dtos[0]);

    const pageable = { page: 0, size: 10, sort: null, offset: 0 };
    const result = await service.findAll(pageable);

    expect(result).toBeInstanceOf(Page);
    expect(result.data).toHaveLength(1);
    expect(activityMapper.toDTO).toHaveBeenCalledWith(entities[0]);
  });

  it('saveActivity maps DTO to entity, calls repository, maps back', async () => {
    const { activityRepository, activityMapper, service } = buildMocks();
    const dto = new ActivityDTO({ name: 'shop' });
    const entity = { id: null, name: 'shop' };
    const savedEntity = { id: 1, name: 'shop' };
    activityMapper.fromDTO.mockReturnValue(entity);
    activityRepository.save.mockResolvedValue(savedEntity);
    activityMapper.toDTO.mockReturnValue(new ActivityDTO({ id: 1, name: 'shop' }));

    const result = await service.saveActivity(dto);
    expect(activityMapper.fromDTO).toHaveBeenCalledWith(dto);
    expect(activityRepository.save).toHaveBeenCalledWith(entity);
    expect(result).toBeInstanceOf(ActivityDTO);
    expect(result.id).toBe(1);
  });

  it('findByID returns null when entity is null', async () => {
    const { activityRepository, activityMapper, service } = buildMocks();
    activityRepository.findById.mockResolvedValue(null);
    activityMapper.toDTO.mockReturnValue(null);
    const result = await service.findByID(999);
    expect(result).toBeNull();
    expect(activityMapper.toDTO).toHaveBeenCalledWith(null);
  });

  it('deleteActivity delegates to deleteCascadingById', async () => {
    const { activityRepository, service } = buildMocks();
    await service.deleteActivity(7);
    expect(activityRepository.deleteCascadingById).toHaveBeenCalledWith(7);
  });

  it('addEmployees delegates to repository', async () => {
    const { activityRepository, service } = buildMocks();
    const employees = [{ employeeUuid: 'abc', role: 'MANAGER' }];
    await service.addEmployees(1, employees);
    expect(activityRepository.addEmployees).toHaveBeenCalledWith(1, employees);
  });

  it('removeEmployees delegates to repository', async () => {
    const { activityRepository, service } = buildMocks();
    await service.removeEmployees(1, ['abc']);
    expect(activityRepository.removeEmployees).toHaveBeenCalledWith(1, ['abc']);
  });

  it('replaceEmployees delegates to repository', async () => {
    const { activityRepository, service } = buildMocks();
    const employees = [{ employeeUuid: 'abc', role: 'MANAGER' }];
    await service.replaceEmployees(1, employees);
    expect(activityRepository.replaceEmployees).toHaveBeenCalledWith(1, employees);
  });

  it('findByEmployeeUuid maps entities to DTOs', async () => {
    const { activityRepository, activityMapper, service } = buildMocks();
    activityRepository.findByEmployeeUuid.mockResolvedValue([{ id: 1 }]);
    activityMapper.toDTO.mockReturnValue(new ActivityDTO({ id: 1 }));
    const result = await service.findByEmployeeUuid('uuid-abc');
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(ActivityDTO);
  });

  it('hasEmployee delegates to repository', async () => {
    const { activityRepository, service } = buildMocks();
    activityRepository.hasEmployee.mockResolvedValue(true);
    const result = await service.hasEmployee(1, 'uuid-abc');
    expect(result).toBe(true);
    expect(activityRepository.hasEmployee).toHaveBeenCalledWith(1, 'uuid-abc');
  });
});
