import { describe, it, expect, jest } from '@jest/globals';
import { PersonServiceImpl } from '../../../../../src/api/person/service/PersonServiceImpl.js';
import { PersonDTO } from '../../../../../src/domain/dto/PersonDTO.js';

describe('PersonServiceImpl', () => {
  const BASE_URL = 'http://person-svc:8082';

  const buildService = () => new PersonServiceImpl(BASE_URL);

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('getPersonByUuid', () => {
    it('fetches person data and returns a PersonDTO', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          externalUuid: 'abc-123',
          name: 'Mario',
          surname: 'Rossi',
          birthDate: '1990-01-01'
        })
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const service = buildService();
      const result = await service.getPersonByUuid('abc-123');

      expect(result).toBeInstanceOf(PersonDTO);
      expect(result.uuid).toBe('abc-123');
      expect(result.name).toBe('Mario');
      expect(result.surname).toBe('Rossi');
      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/person/abc-123`);
    });

    it('throws when the person is not found (404)', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const service = buildService();
      await expect(service.getPersonByUuid('missing'))
        .rejects.toThrow('Person with UUID missing not found in person-service');
    });

    it('throws on other HTTP errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      const service = buildService();
      await expect(service.getPersonByUuid('abc'))
        .rejects.toThrow('Person-service returned 500 for UUID abc');
    });

    it('throws on network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const service = buildService();
      await expect(service.getPersonByUuid('abc'))
        .rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('getPersonByUserId', () => {
    it('fetches person data by userId and returns a PersonDTO', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          externalUuid: 'uuid-456',
          name: 'Luigi',
          surname: 'Verdi',
          birthDate: '1985-05-15'
        })
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const service = buildService();
      const result = await service.getPersonByUserId(42);

      expect(result).toBeInstanceOf(PersonDTO);
      expect(result.uuid).toBe('uuid-456');
      expect(result.name).toBe('Luigi');
      expect(global.fetch).toHaveBeenCalledWith(`${BASE_URL}/person/by-user/42`);
    });

    it('throws when the person is not found (404)', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

      const service = buildService();
      await expect(service.getPersonByUserId(999))
        .rejects.toThrow('Person with userId 999 not found in person-service');
    });

    it('throws on other HTTP errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      const service = buildService();
      await expect(service.getPersonByUserId(1))
        .rejects.toThrow('Person-service returned 503 for userId 1');
    });
  });
});
