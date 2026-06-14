import { describe, it, expect, jest } from '@jest/globals';
import { CategoryPersistenceServiceImpl } from '../../../../src/persistence/service/CategoryPersistenceServiceImpl.js';
import { Page } from '../../../../src/domain/dto/Page.js';
import { CategoryDTO } from '../../../../src/domain/dto/CategoryDTO.js';

describe('CategoryPersistenceServiceImpl', () => {
  const buildMocks = () => {
    const categoryRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      deleteById: jest.fn()
    };
    const categoryMapper = {
      fromDTO: jest.fn(),
      toDTO: jest.fn()
    };
    const service = new CategoryPersistenceServiceImpl(categoryRepository, categoryMapper);
    return { categoryRepository, categoryMapper, service };
  };

  it('saveCategory maps DTO to entity, calls repository, maps back', async () => {
    const { categoryRepository, categoryMapper, service } = buildMocks();
    const dto = new CategoryDTO({ name: 'food' });
    const entity = { id: null, name: 'food' };
    const savedEntity = { id: 1, name: 'food', categoryTaxes: [] };
    categoryMapper.fromDTO.mockReturnValue(entity);
    categoryRepository.save.mockResolvedValue(savedEntity);
    categoryMapper.toDTO.mockReturnValue(new CategoryDTO({ id: 1, name: 'food' }));

    const result = await service.saveCategory(dto);

    expect(categoryMapper.fromDTO).toHaveBeenCalledWith(dto);
    expect(categoryRepository.save).toHaveBeenCalledWith(entity);
    expect(result).toBeInstanceOf(CategoryDTO);
    expect(result.id).toBe(1);
  });

  it('findByID returns null when entity does not exist', async () => {
    const { categoryRepository, categoryMapper, service } = buildMocks();
    categoryRepository.findById.mockResolvedValue(null);
    categoryMapper.toDTO.mockReturnValue(null);
    const result = await service.findByID(999);
    expect(result).toBeNull();
    expect(categoryMapper.toDTO).toHaveBeenCalledWith(null);
  });

  it('findByID returns DTO when entity exists', async () => {
    const { categoryRepository, categoryMapper, service } = buildMocks();
    categoryRepository.findById.mockResolvedValue({ id: 1, name: 'food' });
    categoryMapper.toDTO.mockReturnValue(new CategoryDTO({ id: 1, name: 'food' }));
    const result = await service.findByID(1);
    expect(result).toBeInstanceOf(CategoryDTO);
    expect(result.id).toBe(1);
  });

  it('deleteCategory delegates to repository', async () => {
    const { categoryRepository, service } = buildMocks();
    await service.deleteCategory(7);
    expect(categoryRepository.deleteById).toHaveBeenCalledWith(7);
  });

  it('findAll maps entities to DTOs and wraps in a Page', async () => {
    const { categoryRepository, categoryMapper, service } = buildMocks();
    const entities = [{ id: 1 }];
    const dtos = [new CategoryDTO({ id: 1, name: 'food' })];
    categoryRepository.findAll.mockResolvedValue({ rows: entities, total: 1 });
    categoryMapper.toDTO.mockReturnValue(dtos[0]);

    const pageable = { page: 0, size: 10, sort: null, offset: 0 };
    const result = await service.findAll(pageable);

    expect(result).toBeInstanceOf(Page);
    expect(result.data).toHaveLength(1);
    expect(categoryMapper.toDTO).toHaveBeenCalledWith(entities[0]);
  });

  it('findAll returns empty page when no categories', async () => {
    const { categoryRepository, categoryMapper, service } = buildMocks();
    categoryRepository.findAll.mockResolvedValue({ rows: [], total: 0 });

    const result = await service.findAll({ page: 0, size: 10, sort: null, offset: 0 });
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});
