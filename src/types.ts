export enum ElectionStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  CLOSED = 'closed'
}

export interface ElectionOption {
  id: string;
  label: string;
}

export interface Election {
  id: string;
  title: string;
  description?: string;
  options: ElectionOption[];
  status: ElectionStatus;
  creatorId: string;
  createdAt: any; // Firestore Timestamp
  endTime?: any; // Firestore Timestamp
  voteCounts?: Record<string, number>;
}

export interface Vote {
  id: string;
  electionId: string;
  userId: string;
  optionId: string;
  timestamp: any; // Firestore Timestamp
  previousHash: string;
  hash: string;
  blockIndex: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  photoURL?: string;
  isAdmin: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
