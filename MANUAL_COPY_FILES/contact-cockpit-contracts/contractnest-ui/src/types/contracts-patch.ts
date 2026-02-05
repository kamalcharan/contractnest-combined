// PATCH: Add buyer_id to ContractListFilters
//
// In types/contracts.ts, update ContractListFilters to include:
//
// export interface ContractListFilters {
//   record_type?: ContractRecordType;
//   contract_type?: ContractType;
//   status?: ContractStatus;
//   search?: string;
//   buyer_id?: string;          // <-- ADD THIS LINE
//   start_date_from?: string;
//   start_date_to?: string;
//   end_date_from?: string;
//   end_date_to?: string;
//   min_value?: number;
//   max_value?: number;
//   currency?: string;
//   sort_by?: 'title' | 'contract_number' | 'status' | 'total_value' | 'start_date' | 'end_date' | 'created_at' | 'updated_at';
//   sort_direction?: 'asc' | 'desc';
//   limit?: number;
//   offset?: number;
//   page?: number;
// }
//
// In services/serviceURLs.ts, update LIST_WITH_FILTERS to include:
//
//   if (filters.buyer_id) params.append('buyer_id', filters.buyer_id);  // <-- ADD THIS LINE
