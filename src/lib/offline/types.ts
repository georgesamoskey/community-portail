/** Aligné sur OfflineSyncManager / OfflineBundleItem (Android + Nest). */

export const TYPE_COTISATION = "COTISATION";
export const TYPE_MESSAGE = "MESSAGE";
export const ACTION_CREATE = "CREATE";

export type PendingSyncStatus = "pending" | "syncing" | "failed";

export type PendingSyncItem = {
  id: string;
  entityType: typeof TYPE_COTISATION | typeof TYPE_MESSAGE | string;
  actionType: typeof ACTION_CREATE | string;
  /** JSON string du payload métier (cotisation, etc.). */
  payload: string;
  clientId?: string | null;
  status: PendingSyncStatus;
  attempts: number;
  lastError?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type OfflineCotisationPayload = {
  contributionId: string;
  montant: number;
  paymentMethod: string;
  paymentReference?: string | null;
  notes?: string | null;
  mobileMoney?: {
    provider: string;
    payerPhone: string;
    amount?: number | null;
  } | null;
};

export type OfflineBundleItem = {
  type: string;
  id: string;
  updatedAt: string;
  operation: string;
  payload: OfflineCotisationPayload;
};

export type OfflineSyncItemResult = {
  localId: string;
  type: string;
  status: string;
  error?: string | null;
  cotisationId?: string | null;
  transactionId?: string | null;
  mobileMoneyStatus?: string | null;
  cotisationStatus?: string | null;
};

export type OfflineSyncResponse = {
  synced: number;
  conflicts: number;
  failed: number;
  results: OfflineSyncItemResult[];
};

export type PreparedBundleItem = {
  type: string;
  id: string;
  updatedAt: string;
  data?: unknown;
};

export type OfflinePrepareResponse = {
  data: PreparedBundleItem[];
  size?: number;
  compressed?: boolean;
  checksum?: string;
};
