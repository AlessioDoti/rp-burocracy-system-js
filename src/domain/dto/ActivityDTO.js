/**
 * @fileoverview Domain data transfer object for an activity (a business).
 *
 * An Activity is the central entity of the system: it belongs to a
 * Category (which determines its tax brackets) and is associated to a
 * list of people (the `management`). The management list is currently
 * inert — the corresponding field is wired through end-to-end so that
 * activating it later is a non-breaking change.
 *
 * Two Zod schemas live alongside the DTO:
 *
 * - `activityValidationSchema` — used on **insert** to validate the
 *   full DTO (every field required).
 * - `activityPatchSchema` — used on **update** to validate a partial
 *   patch. All three mutable fields are optional, but at least one
 *   must be present.
 */

import { z } from 'zod';
import { PersonDTO } from './PersonDTO.js';
import { CategoryDTO } from './CategoryDTO.js';

/**
 * @class ActivityDTO
 * @classdesc Value object representing an activity and its relationships.
 */
export class ActivityDTO {
  /**
   * @param {{
   *   id?: number|null,
   *   name?: string|null,
   *   address?: number,
   *   category?: CategoryDTO|null,
   *   management?: PersonDTO[]
   * }} [props]
   * @property {number|null}   id          Database primary key.
   * @property {string|null}   name        Unique activity name.
   * @property {number}        address     Free-form address identifier
   *                                       (the schema treats it as an integer).
   * @property {CategoryDTO|null} category Category this activity belongs to.
   * @property {PersonDTO[]}   management  People associated with the activity
   *                                       (currently always empty in the
   *                                       mocked Person adapter).
   */
  constructor({ id = null, name = null, address = 0, category = null, management = [] } = {}) {
    /** @type {number|null} */
    this.id = id;
    /** @type {string|null} */
    this.name = name;
    /** @type {number} */
    this.address = address;
    /** @type {CategoryDTO|null} */
    this.category = category;
    /** @type {PersonDTO[]} */
    this.management = management;
  }
}

/**
 * Zod schema used by `ActivityService` to validate an ActivityDTO before
 * persistence. All three fields are required at the boundary: name (a
 * non-empty string), address (a number), and category (a non-null
 * CategoryDTO already populated by the request handler).
 *
 * @type {import('zod').ZodType<{
 *   name: string,
 *   address: number,
 *   category: CategoryDTO
 * }>}
 */
export const activityValidationSchema = z.object({
  name: z.string({ required_error: 'Name must be set' }).min(1, 'Name must be set'),
  address: z.number({ required_error: 'Address must be set', invalid_type_error: 'Address must be set' }).int(),
  category: z
    .any({ required_error: 'Category must be set' })
    .refine((v) => v !== null && v !== undefined, { message: 'Category must be set' })
});

/**
 * Zod schema used by `ActivityRequestHandlerImpl.handleUpdate` to
 * validate a partial-update payload. Every field is optional; the
 * `refine` clause enforces that at least one of them is present, so
 * a body of `{}` is rejected with HTTP 400 rather than silently being
 * a no-op write.
 *
 * The `category` field is the category primary key (a positive
 * integer). The handler resolves it into a `CategoryDTO` after this
 * schema has accepted the raw input.
 *
 * @type {import('zod').ZodType<{
 *   name?: string,
 *   address?: number,
 *   category?: number
 * }>}
 */
export const activityPatchSchema = z
  .object({
    name: z
      .string({ invalid_type_error: 'Name must be a string' })
      .min(1, 'Name must be set')
      .optional(),
    address: z
      .number({ invalid_type_error: 'Address must be a number' })
      .int('Address must be an integer')
      .optional(),
    category: z
      .number({ invalid_type_error: 'Category must be a number' })
      .int('Category must be an integer')
      .positive('Category must be a positive integer')
      .optional()
  })
  .refine(
    (v) => v.name !== undefined || v.address !== undefined || v.category !== undefined,
    { message: 'At least one of name, address, or category must be provided' }
  );
