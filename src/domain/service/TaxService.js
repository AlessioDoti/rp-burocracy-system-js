/***
 * @fileoverview Domain service for the Tax aggregate.
 *
 * Owns every tax-related computation: revenue, tax rate picked from
 * the activity's category brackets, the elapsed-since-last-declaration
 * surcharge, and the resulting taxable income. Persistence is
 * delegated to the TaxPersistenceService port.
 */

import { ValidatingService } from './ValidatingService.js';
import { taxValidationSchema } from '../dto/TaxDTO.js';
import { NotFoundError } from '../error/AppError.js';

/**
 * @class TaxService
 * @classdesc Encapsulates the tax computation rules:
 *   revenue = earnings − expenses,
 *   rate = rate of the highest bracket whose `amount ≤ revenue`
 *          (derived from the activity's category brackets — never persisted),
 *   taxableIncome = revenue × rate / 100 (the base tax),
 *   elapsedBillAmount = max(elapsedDays − 7, 0) × 15 000 (the late-filing penalty),
 *   taxAmount = taxableIncome + elapsedBillAmount (total liability: tax owed + penalty).
 */
export class TaxService extends ValidatingService {
  /** @property {number} Daily base used to convert elapsed days into an "elapsed bill amount". */
  static ELAPSED_AMOUNT_DAILY_BASE = 15000;
  /** @property {number} Days of grace period before the elapsed surcharge starts accruing. */
  static ELAPSED_DAYS_BASE = 7;

  /**
   * @param {import('../port/persistence/TaxPersistenceService.js').TaxPersistenceService} taxPersistenceService
   *   Persistence port to delegate reads and writes to.
   */
  constructor(taxPersistenceService) {
    super(taxValidationSchema);
    /** @property {import('../port/persistence/TaxPersistenceService.js').TaxPersistenceService} */
    this.taxPersistenceService = taxPersistenceService;
  }

  /**
   * Validates the DTO, fills in every computed field
   * ({@link TaxService#buildDTO}), and forwards it to the persistence
   * port.
   *
   * @param {import('../dto/TaxDTO.js').TaxDTO} dto
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   * @throws {ValidationError} When the DTO fails the Zod schema.
   */
  async insertTax(dto) {
    this.validate(dto);
    await this.buildDTO(dto);
    return this.taxPersistenceService.saveTax(dto);
  }

  /**
   * Updates an existing tax declaration by applying a partial patch.
   * Only fields present in `patch` (i.e. not `undefined`) are written
   * — a literal `0` is a valid value and is applied. The derived
   * fields (`revenue`, `taxableIncome`, `elapsedBillAmount`,
   * `taxAmount`) are always recomputed from the merged state. The
   * bracket rate itself is **not** persisted — it is recomputed from
   * the activity's category brackets on every write.
   *
   * @param {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }} patch
   * @param {number} id
   * @returns {Promise<import('../dto/TaxDTO.js').TaxDTO>}
   * @throws {NotFoundError} When no tax row exists with the given id.
   */
  async updateTax(patch, id) {
    const found = await this.taxPersistenceService.findTaxByID(id);
    if (found === null || found === undefined) {
      throw new NotFoundError(`Tax with id ${id} does not exist!`);
    }

    this.applyPatch(patch, found);
    return this.taxPersistenceService.saveTax(found);
  }

  /***
   * Lists the declarations filed against the given activity name.
   *
   * @param {string} activity
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async findTaxByActivity(activity, pageable) {
    return this.taxPersistenceService.findActivityTaxes(activity, pageable);
  }

  /***
   * Lists every tax declaration, newest first by default.
   *
   * @param {{ page: number, size: number, sort: { field: string, direction: 'asc'|'desc' }|null, offset: number }} pageable
   * @returns {Promise<import('../dto/Page.js').Page<import('../dto/TaxDTO.js').TaxDTO>>}
   */
  async findAllTaxes(pageable) {
    return this.taxPersistenceService.findAllTaxes(pageable);
  }

  /***
   * Applies a partial patch to a persisted DTO in place. A field is
   * written only when it is present in the patch (`!== undefined`);
   * a literal `0` is a valid value. The derived fields are always
   * recomputed from the merged state.
   *
   * @param {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }} patch
   * @param {import('../dto/TaxDTO.js').TaxDTO} found Persisted DTO, mutated in place.
   * @returns {void}
   */
  applyPatch(patch, found) {
    if (patch.earnings !== undefined) found.earnings = patch.earnings;
    if (patch.expenses !== undefined) found.expenses = patch.expenses;
    if (patch.payed !== undefined) found.payed = patch.payed;
    if (patch.elapsedDays !== undefined) found.elapsedDays = patch.elapsedDays;

    found.revenue = this.computeRevenue(found.earnings, found.expenses);
    const rate = this.getTaxRate(found.revenue, found.activity);
    found.taxableIncome = this.computeTaxableIncome(found.revenue, rate);
    found.elapsedBillAmount = this.computeElapsedBillAmount(found.elapsedDays);
    found.taxAmount = this.computeTaxAmount(found.taxableIncome, found.elapsedBillAmount);
  }

  /***
   * Computes every derived field on the DTO in place and stamps
   * `declarationDate` with the current date. Called from
   * {@link TaxService#insertTax}.
   *
   * @param {import('../dto/TaxDTO.js').TaxDTO} dto
   * @returns {Promise<void>}
   */
  async buildDTO(dto) {
    dto.revenue = this.computeRevenue(dto.earnings, dto.expenses);
    const rate = this.getTaxRate(dto.revenue, dto.activity);
    dto.taxableIncome = this.computeTaxableIncome(dto.revenue, rate);
    dto.elapsedDays = await this.getElapsedDays(dto.activity?.name);
    dto.elapsedBillAmount = this.computeElapsedBillAmount(dto.elapsedDays);
    dto.taxAmount = this.computeTaxAmount(dto.taxableIncome, dto.elapsedBillAmount);
    dto.declarationDate = new Date();
  }

  /***
   * @param {number} earnings
   * @param {number} expenses
   * @returns {number} earnings − expenses.
   */
  computeRevenue(earnings, expenses) {
    return earnings - expenses;
  }

  /***
   * Picks the rate of the highest bracket whose `amount ≤ revenue`. The
   * brackets are read from `activity.category.categoryTaxes`. Returns
   * `0` when the activity or its category is missing or when no
   * bracket matches.
   *
   * @param {number} revenue
   * @param {import('../dto/ActivityDTO.js').ActivityDTO|null|undefined} activity
   * @returns {number} A percentage in `[0, 100]`.
   */
  getTaxRate(revenue, activity) {
    if (activity && activity.category) {
      const taxes = activity.category.categoryTaxes || [];
      const categoryTax = taxes
        .filter((t) => t.amount <= revenue)
        .sort((a, b) => b.amount - a.amount)[0];
      return categoryTax ? categoryTax.rate : 0;
    }
    return 0;
  }

  /***
   * Computes the base tax (the "taxable income" amount, in the tax
   * sense) as a percentage of the revenue.
   *
   * @param {number} revenue
   * @param {number} rate Percentage in `[0, 100]`.
   * @returns {number} revenue × rate / 100.
   */
  computeTaxableIncome(revenue, rate) {
    return (revenue * rate) / 100;
  }

  /***
   * Computes the total amount owed: the base tax plus the late-filing
   * penalty.
   *
   * @param {number} taxableIncome The base tax (`revenue × rate / 100`).
   * @param {number} elapsedBillAmount The late-filing penalty.
   * @returns {number} taxableIncome + elapsedBillAmount.
   */
  computeTaxAmount(taxableIncome, elapsedBillAmount) {
    return taxableIncome + elapsedBillAmount;
  }

  /***
   * Looks up the number of days since the most recent declaration for
   * the given activity, minus the 7-day grace period (clamped to 0).
   *
   * @param {string} activity Activity name (the join key).
   * @returns {Promise<number>}
   */
  async getElapsedDays(activity) {
    const elapsed = await this.taxPersistenceService.getElapsedDays(activity);
    return elapsed >= TaxService.ELAPSED_DAYS_BASE ? elapsed - TaxService.ELAPSED_DAYS_BASE : 0;
  }

  /***
   * @param {number} elapsedDays
   * @returns {number} elapsedDays × 15 000.
   */
  computeElapsedBillAmount(elapsedDays) {
    return elapsedDays * TaxService.ELAPSED_AMOUNT_DAILY_BASE;
  }
}
