/***
 * @fileoverview Domain data transfer object for an activity (a business).
 */

import { z } from 'zod';
import { ActivityEmployeeDTO } from './ActivityEmployeeDTO.js';
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
   *   employees?: ActivityEmployeeDTO[]
   * }} [props]
   */
  constructor({ id = null, name = null, address = 0, category = null, employees = [] } = {}) {
    /** @type {number|null} */
    this.id = id;
    /** @type {string|null} */
    this.name = name;
    /** @type {number} */
    this.address = address;
    /** @type {CategoryDTO|null} */
    this.category = category;
    /** @type {ActivityEmployeeDTO[]} */
    this.employees = employees;
  }
}

export const activityValidationSchema = z.object({
  name: z.string({ required_error: 'Name must be set' }).min(1, 'Name must be set'),
  address: z.number({ required_error: 'Address must be set', invalid_type_error: 'Address must be set' }).int(),
  category: z
    .any({ required_error: 'Category must be set' })
    .refine((v) => v !== null && v !== undefined, { message: 'Category must be set' })
});

export const activityPatchSchema = z.object({
  name: z.string().min(1, 'Name must be set').optional(),
  address: z.number().int('Address must be an integer').optional(),
  category: z.number().int().positive('Category must be a positive integer').optional(),
  employees: z.array(z.object({
    employeeUuid: z.string().min(1, 'employeeUuid required'),
    role: z.string().min(1, 'role required')
  })).optional()
}).refine(
  (v) => v.name !== undefined || v.address !== undefined || v.category !== undefined
    || v.employees !== undefined,
  { message: 'At least one field must be provided' }
);
