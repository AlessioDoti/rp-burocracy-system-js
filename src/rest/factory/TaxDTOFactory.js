/**
 * @fileoverview Builds a `TaxDTO` from a request object.
 *
 * `instanceof` is the primary discriminator; a `type` string tag is
 * accepted as a fallback so JSON-deserialised request objects still
 * dispatch correctly.
 */

import { TaxDTO } from '../../domain/dto/TaxDTO.js';
import { BaseTaxRequest } from '../request/BaseTaxRequest.js';
import { InsertTaxRequest } from '../request/impl/InsertTaxRequest.js';
import { UpdateTaxRequest } from '../request/impl/UpdateTaxRequest.js';

/**
 * @class TaxDTOFactory
 * @classdesc Dispatches between Insert and Update request shapes and
 *   produces the corresponding DTO.
 */
export class TaxDTOFactory {
  /**
   * @param {BaseTaxRequest} request
   * @returns {TaxDTO}
   * @throws {Error} When the request matches neither insert nor update.
   */
  getDTO(request) {
    if (request instanceof InsertTaxRequest || request?.type === 'insert') {
      return this.getInsertDTO(request);
    }
    if (request instanceof UpdateTaxRequest || request?.type === 'update') {
      return this.getUpdateDTO(request);
    }
    throw new Error('Invalid Request, please map a new type of request');
  }

  /**
   * @param {import('../request/impl/InsertTaxRequest.js').InsertTaxRequest} request
   * @returns {TaxDTO} A DTO carrying only `earnings` and `expenses`; the
   *   request handler fills in the activity, manager, and computed fields.
   */
  getInsertDTO(request) {
    return new TaxDTO({
      earnings: request.earnings,
      expenses: request.expenses
    });
  }

  /**
   * @param {import('../request/impl/UpdateTaxRequest.js').UpdateTaxRequest} request
   * @returns {{ earnings?: number, expenses?: number, payed?: boolean, elapsedDays?: number }}
   *   A plain patch object. Fields the client did not send are
   *   `undefined`, which the service treats as "do not touch". A
   *   literal `0` is a valid patch value and is forwarded as-is.
   */
  getUpdateDTO(request) {
    return {
      earnings: request.earnings,
      expenses: request.expenses,
      payed: request.payed,
      elapsedDays: request.elapsedDays
    };
  }
}
