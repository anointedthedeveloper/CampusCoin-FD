// Wrapper around the older server-side CSV import endpoints. Not used by any
// page at the moment — the Import page uses transactionsApi.importRows().

import { transactionsApi } from '@/api/transactions.api';

export const csvImportService = {
  previewCsvImport: transactionsApi.previewCsvImport,
  confirmCsvImport: transactionsApi.confirmCsvImport,
};
