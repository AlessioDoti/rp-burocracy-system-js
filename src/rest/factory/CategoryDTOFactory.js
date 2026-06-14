/***
 * @fileoverview Builds a `CategoryDTO` (and the nested tax-bracket
 * DTOs) from a request object.
 */

import { CategoryDTO } from '../../domain/dto/CategoryDTO.js';
import { CategoryTaxDTO } from '../../domain/dto/CategoryTaxDTO.js';

/**
 * @class CategoryDTOFactory
 * @classdesc Single-shape factory — the category payload is the same
 * for inserts and updates.
 */
export class CategoryDTOFactory {
  /**
   * @param {import('../request/impl/CategoryRequest.js').CategoryRequest} request
   * @returns {CategoryDTO}
   */
  getDTO(request) {
    return new CategoryDTO({
      name: request.name,
      categoryTaxes: (request.categoryTaxes || []).map((t) => this.getTaxDTO(t))
    });
  }

  /**
   * @param {import('../request/impl/CategoryTaxRequest.js').CategoryTaxRequest} request
   * @returns {CategoryTaxDTO}
   */
  getTaxDTO(request) {
    return new CategoryTaxDTO({
      amount: request.amount,
      rate: request.rate
    });
  }
}
