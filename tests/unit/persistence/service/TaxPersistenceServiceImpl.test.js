import { describe, it, expect, jest } from '@jest/globals';
import { TaxPersistenceServiceImpl } from '../../../../src/persistence/service/TaxPersistenceServiceImpl.js';
import { Page } from '../../../../src/domain/dto/Page.js';
import { TaxDTO } from '../../../../src/domain/dto/TaxDTO.js';

describe('TaxPersistenceServiceImpl', () => {
  const buildMocks = () => {
    const taxRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByActivityId: jest.fn(),
      save: jest.fn(),
      findTopByActivityNameOrderByDeclarationDateDesc: jest.fn(),
      deleteByActivityId: jest.fn()
    };
    const taxMapper = {
      fromDTO: jest.fn(),
      toDTO: jest.fn()
    };
    const service = new TaxPersistenceServiceImpl(taxRepository, taxMapper);
    return { taxRepository, taxMapper, service };
  };

  it('saveTax maps DTO to entity, calls repository, maps back', async () => {
    const { taxRepository, taxMapper, service } = buildMocks();
    const dto = new TaxDTO({ earnings: 1000 });
    const entity = { earnings: 1000 };
    const savedEntity = { id: 1, earnings: 1000 };
    taxMapper.fromDTO.mockReturnValue(entity);
    taxRepository.save.mockResolvedValue(savedEntity);
    taxMapper.toDTO.mockReturnValue(new TaxDTO({ taxId: 1, earnings: 1000 }));

    const result = await service.saveTax(dto);

    expect(taxMapper.fromDTO).toHaveBeenCalledWith(dto);
    expect(taxRepository.save).toHaveBeenCalledWith(entity);
    expect(result).toBeInstanceOf(TaxDTO);
    expect(result.taxId).toBe(1);
  });

  it('findTaxByID returns null when entity does not exist', async () => {
    const { taxRepository, taxMapper, service } = buildMocks();
    taxRepository.findById.mockResolvedValue(null);
    taxMapper.toDTO.mockReturnValue(null);
    const result = await service.findTaxByID(999);
    expect(result).toBeNull();
    expect(taxMapper.toDTO).toHaveBeenCalledWith(null);
  });

  it('findActivityTaxes maps entities to DTOs and wraps in a Page', async () => {
    const { taxRepository, taxMapper, service } = buildMocks();
    const entities = [{ id: 1 }];
    const dtos = [new TaxDTO({ taxId: 1 })];
    taxRepository.findByActivityId.mockResolvedValue({ rows: entities, total: 1 });
    taxMapper.toDTO.mockReturnValue(dtos[0]);

    const pageable = { page: 0, size: 10, sort: null, offset: 0 };
    const result = await service.findActivityTaxes(5, pageable);

    expect(result).toBeInstanceOf(Page);
    expect(result.data).toHaveLength(1);
    expect(taxRepository.findByActivityId).toHaveBeenCalledWith(5, pageable);
  });

  it('findAllTaxes maps entities to DTOs and wraps in a Page', async () => {
    const { taxRepository, taxMapper, service } = buildMocks();
    taxRepository.findAll.mockResolvedValue({ rows: [{ id: 1 }], total: 1 });
    taxMapper.toDTO.mockReturnValue(new TaxDTO({ taxId: 1 }));

    const result = await service.findAllTaxes({ page: 0, size: 10, sort: null, offset: 0 });
    expect(result).toBeInstanceOf(Page);
    expect(result.data).toHaveLength(1);
  });

  describe('getElapsedDays', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns 0 when no declaration has ever been filed', async () => {
      const { taxRepository, service } = buildMocks();
      taxRepository.findTopByActivityNameOrderByDeclarationDateDesc.mockResolvedValue(null);
      const result = await service.getElapsedDays('shop');
      expect(result).toBe(0);
    });

    it('returns the number of days since the last declaration', async () => {
      const { taxRepository, service } = buildMocks();
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      taxRepository.findTopByActivityNameOrderByDeclarationDateDesc.mockResolvedValue(fiveDaysAgo);
      const result = await service.getElapsedDays('shop');
      expect(result).toBe(5);
    });
  });

  it('deleteByActivityId delegates to repository', async () => {
    const { taxRepository, service } = buildMocks();
    await service.deleteByActivityId(7);
    expect(taxRepository.deleteByActivityId).toHaveBeenCalledWith(7);
  });
});
