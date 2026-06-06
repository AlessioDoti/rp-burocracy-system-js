/**
 * @fileoverview Request body for `PATCH /activities/:id`.
 *
 * All three mutable fields are optional, so callers can update just
 * one of them. The handler validates the resulting patch with the
 * `activityPatchSchema` (defined alongside the ActivityDTO), which
 * enforces that at least one field is present.
 *
 * The `category` field carries the category primary key (a number);
 * the handler resolves it into a `CategoryDTO` and attaches it to the
 * patch as `category` before delegating to `ActivityService`.
 *
 * Unlike `InsertActivityRequest`, this class does **not** extend
 * `BaseActivityRequest`. The base sets `address = 0` as a default,
 * which is fine for inserts (the DTO has its own default that
 * preserves the value) but would silently overwrite the activity's
 * address on every PATCH that omits the field. Sticking to
 * `undefined` for missing fields is what makes PATCH semantics
 * (partial update) work.
 */

/**
 * @class UpdateActivityRequest
 * @classdesc Activity patch payload. Every field is optional:
 *
 * - `name` — when present, replaces the activity name
 * - `address` — when present, replaces the numeric address
 * - `category` — when present, is the **primary key** of the new
 *   CATEGORY row. The handler resolves it into a `CategoryDTO`.
 * - `managementIds` — reserved for future use
 *
 * The request carries the field under the name `category` (matching
 * the public body shape) — not `categoryId`.
 */
export class UpdateActivityRequest {
  /**
   * @param {{
   *   name?: string,
   *   address?: number,
   *   category?: number|null,
   *   managementIds?: number[]
   * }} [props]
   */
  constructor({ name, address, category, managementIds } = {}) {
    /** @type {string|undefined} */
    this.name = name;
    /** @type {number|undefined} */
    this.address = address;
    /** @type {number|null|undefined} */
    this.category = category;
    /** @type {number[]} */
    this.managementIds = managementIds || [];
  }
}
