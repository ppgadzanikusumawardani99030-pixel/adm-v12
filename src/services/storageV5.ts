import {
  AppStorageStateV5,
  StorageBackupV5,
  STORAGE_KEY_V5,
} from '../types/storageV5';

export { STORAGE_KEY_V5 };

/**
 * Creates an empty, canonical initial state for Storage V5.
 */
export function createInitialStorageV5(): AppStorageStateV5 {
  return {
    schemaVersion: 5,
    profiles: [],
    schools: [],
    principalHistories: [],
    workspaces: [],
    yearPlans: [],
    semesterPlans: [],
    annualJPReferences: [],
    semesterJPSettings: [],
    annualData: {
      cp: [],
      cpAnalysis: [],
      tp: [],
      atp: [],
      curriculumContext: [],
    },
    semesterData: {
      academicCalendar: [],
      timeAllocation: [],
      learningPlan: [],
      assessmentCriteria: [],
      assessmentPlan: [],
      assessmentPackage: [],
      roster: [],
      attendance: [],
      grade: [],
      remedial: [],
      enrichment: [],
    },
    documents: [],
  };
}

/**
 * Helper to assert that a property is an array.
 */
function assertArray(obj: Record<string, unknown>, key: string, containerName: string): void {
  if (!Array.isArray(obj[key])) {
    throw new Error(
      `Invalid storage format: "${containerName}.${key}" must be an array, received ${typeof obj[
        key
      ]}`
    );
  }
}

/**
 * Helper to assert that a property is a non-null object.
 */
function assertObject(
  obj: Record<string, unknown>,
  key: string,
  containerName: string
): Record<string, unknown> {
  const val = obj[key];
  if (!val || typeof val !== 'object' || Array.isArray(val)) {
    throw new Error(
      `Invalid storage format: "${containerName}.${key}" must be an object, received ${
        Array.isArray(val) ? 'array' : typeof val
      }`
    );
  }
  return val as Record<string, unknown>;
}

/**
 * Validates that an unknown value conforms strictly to AppStorageStateV5.
 * Does not mutate, drop, or normalize fields.
 */
export function validateStorageStateV5(value: unknown): AppStorageStateV5 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid storage state: root must be a non-null object');
  }

  const state = value as Record<string, unknown>;

  if (state.schemaVersion !== 5) {
    throw new Error(
      `Invalid schemaVersion: expected 5, received "${String(state.schemaVersion)}"`
    );
  }

  // Validate root collection arrays
  assertArray(state, 'profiles', 'data');
  assertArray(state, 'schools', 'data');
  assertArray(state, 'principalHistories', 'data');
  assertArray(state, 'workspaces', 'data');
  assertArray(state, 'yearPlans', 'data');
  assertArray(state, 'semesterPlans', 'data');
  assertArray(state, 'annualJPReferences', 'data');
  assertArray(state, 'semesterJPSettings', 'data');
  assertArray(state, 'documents', 'data');

  // Validate annualData structure & collections
  const annualData = assertObject(state, 'annualData', 'data');
  assertArray(annualData, 'cp', 'data.annualData');
  assertArray(annualData, 'cpAnalysis', 'data.annualData');
  assertArray(annualData, 'tp', 'data.annualData');
  assertArray(annualData, 'atp', 'data.annualData');
  assertArray(annualData, 'curriculumContext', 'data.annualData');

  // Validate semesterData structure & collections
  const semesterData = assertObject(state, 'semesterData', 'data');
  assertArray(semesterData, 'academicCalendar', 'data.semesterData');
  assertArray(semesterData, 'timeAllocation', 'data.semesterData');
  assertArray(semesterData, 'learningPlan', 'data.semesterData');
  assertArray(semesterData, 'assessmentCriteria', 'data.semesterData');
  assertArray(semesterData, 'assessmentPlan', 'data.semesterData');
  assertArray(semesterData, 'assessmentPackage', 'data.semesterData');
  assertArray(semesterData, 'roster', 'data.semesterData');
  assertArray(semesterData, 'attendance', 'data.semesterData');
  assertArray(semesterData, 'grade', 'data.semesterData');
  assertArray(semesterData, 'remedial', 'data.semesterData');
  assertArray(semesterData, 'enrichment', 'data.semesterData');

  return value as AppStorageStateV5;
}

/**
 * Serializes an AppStorageStateV5 into a canonical V5 backup envelope string.
 */
export function serializeBackupV5(data: AppStorageStateV5): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Data state must be a valid object');
  }
  if (data.schemaVersion !== 5) {
    throw new Error(
      `Invalid schemaVersion: expected 5, received ${String((data as any).schemaVersion)}`
    );
  }

  const backup: StorageBackupV5 = {
    app: 'Administrasi Guru AI',
    schemaVersion: 5,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Parses and strictly validates a V5 backup envelope string.
 *
 * Strict policy:
 * - Only accepts schemaVersion === 5
 * - Strictly rejects legacy V1/V2/V3/V4 backups without auto-migration
 * - Reuses validateStorageStateV5 to ensure 100% consistent validation
 * - Preserves all collections and fields losslessly without discarding or normalizing payload
 */
export function parseBackupV5(jsonString: string): AppStorageStateV5 {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    throw new Error('Backup payload must be a non-empty string');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error(`Malformed JSON in backup payload: ${err.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid backup format: root must be an object');
  }

  const envelope = parsed as Record<string, unknown>;

  if (envelope.app !== 'Administrasi Guru AI') {
    throw new Error(
      `Invalid backup application identifier: expected "Administrasi Guru AI", received "${String(
        envelope.app
      )}"`
    );
  }

  if (envelope.schemaVersion !== 5) {
    throw new Error(
      `Unsupported schemaVersion "${String(
        envelope.schemaVersion
      )}". Storage V5 strictly accepts schemaVersion: 5 without legacy auto-migration.`
    );
  }

  if (typeof envelope.exportedAt !== 'string' || !envelope.exportedAt.trim()) {
    throw new Error(
      'Invalid backup format: "exportedAt" must be a valid non-empty ISO date string'
    );
  }

  if (!envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) {
    throw new Error('Invalid backup format: data payload is missing or invalid');
  }

  return validateStorageStateV5(envelope.data);
}

/**
 * Saves an AppStorageStateV5 to localStorage under STORAGE_KEY_V5.
 * Validates the state before writing.
 */
export function saveStorageV5(state: AppStorageStateV5): void {
  const validated = validateStorageStateV5(state);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_V5, JSON.stringify(validated));
  }
}

/**
 * Loads AppStorageStateV5 from localStorage.
 *
 * Rules:
 * - If V5 key is missing -> creates initial storage, saves it to V5 key, returns initial.
 * - If V5 key exists but JSON is malformed or schema is invalid -> throws without resetting/overwriting raw data.
 * - Never reads or touches legacy storage keys.
 */
export function loadStorageV5(): AppStorageStateV5 {
  if (typeof localStorage === 'undefined') {
    return createInitialStorageV5();
  }

  const raw = localStorage.getItem(STORAGE_KEY_V5);
  if (raw === null) {
    const initial = createInitialStorageV5();
    saveStorageV5(initial);
    return initial;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(
      `Corrupted V5 storage payload: malformed JSON under key "${STORAGE_KEY_V5}": ${err.message}`
    );
  }

  return validateStorageStateV5(parsed);
}

/**
 * Resets the V5 storage state to canonical empty initial state.
 * Only touches STORAGE_KEY_V5 without modifying legacy storage keys.
 */
export function resetStorageV5(): AppStorageStateV5 {
  const initial = createInitialStorageV5();
  saveStorageV5(initial);
  return initial;
}
