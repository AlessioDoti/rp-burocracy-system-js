/***
 * @fileoverview Hand-rolled composition root.
 *
 * Assembles every layer of the application explicitly so that the
 * wiring is visible (and inspectable from tests). Call
 * {@link buildContainer} with an `overrides` object to swap any
 * dependency — typically the persistence services in unit and
 * integration tests.
 */

import { getPool } from '../persistence/db.js';

import { CategoryRepository } from '../persistence/repository/CategoryRepository.js';
import { ActivityRepository } from '../persistence/repository/ActivityRepository.js';
import { TaxRepository } from '../persistence/repository/TaxRepository.js';

import { CategoryTaxMapper } from '../persistence/mapper/CategoryTaxMapper.js';
import { CategoryMapper } from '../persistence/mapper/CategoryMapper.js';
import { ActivityMapper } from '../persistence/mapper/ActivityMapper.js';
import { TaxMapper } from '../persistence/mapper/TaxMapper.js';

import { CategoryPersistenceServiceImpl } from '../persistence/service/CategoryPersistenceServiceImpl.js';
import { ActivityPersistenceServiceImpl } from '../persistence/service/ActivityPersistenceServiceImpl.js';
import { TaxPersistenceServiceImpl } from '../persistence/service/TaxPersistenceServiceImpl.js';

import { CategoryService } from '../domain/service/CategoryService.js';
import { ActivityService } from '../domain/service/ActivityService.js';
import { TaxService } from '../domain/service/TaxService.js';

import { CategoryRequestHandlerImpl } from '../domain/requesthandler/CategoryRequestHandlerImpl.js';
import { ActivityRequestHandlerImpl } from '../domain/requesthandler/ActivityRequestHandlerImpl.js';
import { TaxRequestHandlerImpl } from '../domain/requesthandler/TaxRequestHandlerImpl.js';

import { PersonServiceImpl } from '../api/person/service/PersonServiceImpl.js';
import { env } from './env.js';

import { ActivityDTOFactory } from '../rest/factory/ActivityDTOFactory.js';
import { CategoryDTOFactory } from '../rest/factory/CategoryDTOFactory.js';
import { TaxDTOFactory } from '../rest/factory/TaxDTOFactory.js';

/**
 * Builds the dependency container.
 *
 * @param {object} [overrides] Keyed by the same names as the public
 *   properties of the returned container. Useful in tests to inject
 *   in-memory or stub implementations without touching the real ones.
 * @returns {{
 *   pool: import('mysql2/promise').Pool,
 *   mappers: {
 *     categoryTaxMapper: import('../persistence/mapper/CategoryTaxMapper.js').CategoryTaxMapper,
 *     categoryMapper:    import('../persistence/mapper/CategoryMapper.js').CategoryMapper,
 *     activityMapper:    import('../persistence/mapper/ActivityMapper.js').ActivityMapper,
 *     taxMapper:         import('../persistence/mapper/TaxMapper.js').TaxMapper
 *   },
 *   repositories: {
 *     categoryRepository: import('../persistence/repository/CategoryRepository.js').CategoryRepository,
 *     activityRepository: import('../persistence/repository/ActivityRepository.js').ActivityRepository,
 *     taxRepository:      import('../persistence/repository/TaxRepository.js').TaxRepository
 *   },
 *   persistence: {
 *     categoryPersistenceService: import('../persistence/service/CategoryPersistenceServiceImpl.js').CategoryPersistenceServiceImpl,
 *     activityPersistenceService: import('../persistence/service/ActivityPersistenceServiceImpl.js').ActivityPersistenceServiceImpl,
 *     taxPersistenceService:      import('../persistence/service/TaxPersistenceServiceImpl.js').TaxPersistenceServiceImpl
 *   },
 *   services: {
 *     categoryService: import('../domain/service/CategoryService.js').CategoryService,
 *     activityService: import('../domain/service/ActivityService.js').ActivityService,
 *     taxService:      import('../domain/service/TaxService.js').TaxService,
 *     personService:   import('../api/person/service/PersonServiceImpl.js').PersonServiceImpl
 *   },
 *   handlers: {
 *     categoryRequestHandler: import('../domain/requesthandler/CategoryRequestHandlerImpl.js').CategoryRequestHandlerImpl,
 *     activityRequestHandler: import('../domain/requesthandler/ActivityRequestHandlerImpl.js').ActivityRequestHandlerImpl,
 *     taxRequestHandler:      import('../domain/requesthandler/TaxRequestHandlerImpl.js').TaxRequestHandlerImpl
 *   },
 *   factories: {
 *     activityDTOFactory: import('../rest/factory/ActivityDTOFactory.js').ActivityDTOFactory,
 *     categoryDTOFactory: import('../rest/factory/CategoryDTOFactory.js').CategoryDTOFactory,
 *     taxDTOFactory:      import('../rest/factory/TaxDTOFactory.js').TaxDTOFactory
 *   }
 * }}
 */
export function buildContainer(overrides = {}) {
  const pool = overrides.db ?? getPool();

  // -- Persistence: mappers -------------------------------------------------
  const categoryTaxMapper = overrides.categoryTaxMapper ?? new CategoryTaxMapper();
  const categoryMapper = overrides.categoryMapper ?? new CategoryMapper(categoryTaxMapper);
  const activityMapper = overrides.activityMapper ?? new ActivityMapper(categoryMapper);
  const taxMapper = overrides.taxMapper ?? new TaxMapper(activityMapper);

  // -- Persistence: repositories --------------------------------------------
  const categoryRepository = overrides.categoryRepository ?? new CategoryRepository(pool);
  const activityRepository = overrides.activityRepository ?? new ActivityRepository(pool);
  const taxRepository = overrides.taxRepository ?? new TaxRepository(pool);

  // -- Persistence: services (domain ports) ---------------------------------
  const categoryPersistenceService = overrides.categoryPersistenceService
    ?? new CategoryPersistenceServiceImpl(categoryRepository, categoryMapper);
  const activityPersistenceService = overrides.activityPersistenceService
    ?? new ActivityPersistenceServiceImpl(activityRepository, activityMapper);
  const taxPersistenceService = overrides.taxPersistenceService
    ?? new TaxPersistenceServiceImpl(taxRepository, taxMapper);

  // -- Domain services ------------------------------------------------------
  const categoryService = overrides.categoryService ?? new CategoryService(categoryPersistenceService);
  const activityService = overrides.activityService ?? new ActivityService(activityPersistenceService);
  const taxService = overrides.taxService ?? new TaxService(taxPersistenceService);

  // -- External port: Person (HTTP adapter) ---------------------------------
  const personService = overrides.personService ?? new PersonServiceImpl(env.PERSON_SERVICE_URL);

  // -- Request handlers (domain ports) --------------------------------------
  const categoryRequestHandler = overrides.categoryRequestHandler
    ?? new CategoryRequestHandlerImpl(categoryService);
  const activityRequestHandler = overrides.activityRequestHandler
    ?? new ActivityRequestHandlerImpl(activityService, categoryService, personService);
  const taxRequestHandler = overrides.taxRequestHandler
    ?? new TaxRequestHandlerImpl(activityService, taxService, personService);

  // -- REST factories --------------------------------------------------------
  const activityDTOFactory = overrides.activityDTOFactory ?? new ActivityDTOFactory();
  const categoryDTOFactory = overrides.categoryDTOFactory ?? new CategoryDTOFactory();
  const taxDTOFactory = overrides.taxDTOFactory ?? new TaxDTOFactory();

  return {
    pool,
    mappers: { categoryTaxMapper, categoryMapper, activityMapper, taxMapper },
    repositories: { categoryRepository, activityRepository, taxRepository },
    persistence: { categoryPersistenceService, activityPersistenceService, taxPersistenceService },
    services: { categoryService, activityService, taxService, personService },
    handlers: { categoryRequestHandler, activityRequestHandler, taxRequestHandler },
    factories: { activityDTOFactory, categoryDTOFactory, taxDTOFactory }
  };
}
