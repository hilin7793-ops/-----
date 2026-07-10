import { AppError, assert } from "../../lib/appError.js";
import { ErrorCode } from "../../constants/errorCodes.js";

export function createDataAccessLayer(adapter) {
  assert(adapter, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Data access adapter is required",
  }));

  return {
    async createRecordInCollection({ collectionName, data }) {
      return adapter.create(collectionName, data);
    },

    async getRecordById({ collectionName, recordId }) {
      return adapter.getById(collectionName, recordId);
    },

    async updateRecordById({ collectionName, recordId, data }) {
      return adapter.updateById(collectionName, recordId, data);
    },

    async deleteRecordById({ collectionName, recordId }) {
      return adapter.deleteById(collectionName, recordId);
    },

    async listRecords({ collectionName, filterOptions = {}, queryOptions = {} }) {
      return adapter.list(collectionName, filterOptions, queryOptions);
    },

    async findOneRecord({ collectionName, filterOptions = {}, queryOptions = {} }) {
      return adapter.findOne(collectionName, filterOptions, queryOptions);
    },

    async runTransactionLikeOperation({ operationName, operationData, handler }) {
      return adapter.runOperation(operationName, operationData, handler);
    },
  };
}
