import {
  AppStorageStateV5,
  StorageBackupV5,
  STORAGE_KEY_V5,
  AdministrationWorkspaceV5,
} from '../types/storageV5';
import {
  YearPlan,
  SemesterPlan,
  CurriculumType,
} from '../types';

export { STORAGE_KEY_V5 };

export interface CreateYearHierarchyV5Params {
  profileId: string;
  schoolId: string;
  academicYear: string;
  curriculumType: CurriculumType;
  level: 'SD' | 'SMP' | 'SMA' | 'SMK';
  grade: string;
  classSection?: string;
  subject: string;
  subjectCode?: string;
  phase?: string;
  workspaceName?: string;
  documentDate?: string;
}

export interface CreateYearHierarchyV5Result {
  yearPlan: YearPlan;
  workspace: AdministrationWorkspaceV5;
  semesterPlans: [SemesterPlan, SemesterPlan];
}

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

/**
 * Atomically creates a complete canonical YearPlan hierarchy:
 * 1 YearPlan
 * 1 AdministrationWorkspaceV5
 * 2 SemesterPlans (Semester 1 & 2)
 *
 * Rules:
 * - Profile and School must exist and be validly associated (profile.schoolId === schoolId)
 * - Rejects duplicate YearPlan identity tuple without silently reusing
 * - Sets activeProfileId, activeYearPlanId, activeWorkspaceId
 * - Leaves activeSemesterPlanId = undefined (never auto-selects Semester 1)
 */
export function createYearHierarchyV5(
  params: CreateYearHierarchyV5Params
): CreateYearHierarchyV5Result {
  const state = loadStorageV5();

  const profile = state.profiles.find((p) => p.id === params.profileId);
  if (!profile) {
    throw new Error(`Profile with ID "${params.profileId}" not found`);
  }

  const school = state.schools.find((s) => s.id === params.schoolId);
  if (!school) {
    throw new Error(`School with ID "${params.schoolId}" not found`);
  }

  if (profile.schoolId !== params.schoolId) {
    throw new Error(
      `Profile school mismatch: profile.schoolId "${profile.schoolId}" does not match requested schoolId "${params.schoolId}"`
    );
  }

  // Check duplicate exact YearPlan identity: (profileId, schoolId, academicYear, grade, classSection, subject)
  const isDuplicate = state.yearPlans.some(
    (yp) =>
      yp.profileId === params.profileId &&
      yp.schoolId === params.schoolId &&
      yp.academicYear === params.academicYear &&
      yp.grade === params.grade &&
      (yp.classSection || '') === (params.classSection || '') &&
      yp.subject.trim().toLowerCase() === params.subject.trim().toLowerCase()
  );

  if (isDuplicate) {
    throw new Error(
      `Duplicate YearPlan: A YearPlan already exists for profileId "${params.profileId}", schoolId "${params.schoolId}", academicYear "${params.academicYear}", grade "${params.grade}", classSection "${params.classSection || ''}", and subject "${params.subject}".`
    );
  }

  const now = new Date().toISOString();
  const yearPlanId = `yp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const yearPlan: YearPlan = {
    id: yearPlanId,
    profileId: params.profileId,
    schoolId: params.schoolId,
    academicYear: params.academicYear,
    curriculumType: params.curriculumType,
    level: params.level,
    grade: params.grade,
    ...(params.classSection !== undefined ? { classSection: params.classSection } : {}),
    subject: params.subject,
    ...(params.subjectCode !== undefined ? { subjectCode: params.subjectCode } : {}),
    ...(params.phase !== undefined ? { phase: params.phase } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const workspaceName =
    params.workspaceName?.trim() ||
    `${params.subject} - ${params.grade} (${params.academicYear})`;

  const workspace: AdministrationWorkspaceV5 = {
    id: workspaceId,
    profileId: params.profileId,
    schoolId: params.schoolId,
    yearPlanId: yearPlanId,
    name: workspaceName,
    ...(params.documentDate !== undefined ? { documentDate: params.documentDate } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const semesterPlan1: SemesterPlan = {
    id: `sp-${Date.now()}-1-${Math.random().toString(36).slice(2, 9)}`,
    yearPlanId: yearPlanId,
    semester: 1,
    createdAt: now,
    updatedAt: now,
  };

  const semesterPlan2: SemesterPlan = {
    id: `sp-${Date.now()}-2-${Math.random().toString(36).slice(2, 9)}`,
    yearPlanId: yearPlanId,
    semester: 2,
    createdAt: now,
    updatedAt: now,
  };

  state.yearPlans.push(yearPlan);
  state.workspaces.push(workspace);
  state.semesterPlans.push(semesterPlan1, semesterPlan2);

  state.activeProfileId = params.profileId;
  state.activeYearPlanId = yearPlanId;
  state.activeWorkspaceId = workspaceId;
  state.activeSemesterPlanId = undefined; // Strictly undefined on creation

  saveStorageV5(state);

  return {
    yearPlan,
    workspace,
    semesterPlans: [semesterPlan1, semesterPlan2],
  };
}

/**
 * Retrieves a YearPlan by its ID.
 */
export function getYearPlanV5(yearPlanId: string): YearPlan | undefined {
  const state = loadStorageV5();
  return state.yearPlans.find((yp) => yp.id === yearPlanId);
}

/**
 * Retrieves all SemesterPlans belonging to a YearPlan.
 */
export function getSemesterPlansForYearV5(yearPlanId: string): SemesterPlan[] {
  const state = loadStorageV5();
  return state.semesterPlans.filter((sp) => sp.yearPlanId === yearPlanId);
}

/**
 * Sets the active YearPlan.
 *
 * Rules:
 * - Validates that YearPlan exists
 * - Updates activeYearPlanId, activeProfileId, and activeWorkspaceId
 * - If activeSemesterPlanId is not a child of this YearPlan, it is cleared (undefined)
 * - Never defaults or auto-selects Semester 1
 */
export function setActiveYearPlanV5(yearPlanId: string): void {
  const state = loadStorageV5();
  const yearPlan = state.yearPlans.find((yp) => yp.id === yearPlanId);
  if (!yearPlan) {
    throw new Error(`YearPlan with ID "${yearPlanId}" not found`);
  }

  state.activeYearPlanId = yearPlan.id;
  state.activeProfileId = yearPlan.profileId;

  const workspace = state.workspaces.find((w) => w.yearPlanId === yearPlan.id);
  state.activeWorkspaceId = workspace ? workspace.id : undefined;

  if (state.activeSemesterPlanId) {
    const currentSp = state.semesterPlans.find((sp) => sp.id === state.activeSemesterPlanId);
    if (!currentSp || currentSp.yearPlanId !== yearPlan.id) {
      state.activeSemesterPlanId = undefined;
    }
  }

  saveStorageV5(state);
}

/**
 * Sets the active SemesterPlan.
 *
 * Rules:
 * - Validates that SemesterPlan exists
 * - Sets activeSemesterPlanId
 * - Synchronizes activeYearPlanId to parent YearPlan
 * - Synchronizes activeProfileId to parent YearPlan's profileId
 * - Synchronizes activeWorkspaceId to parent YearPlan's workspace
 */
export function setActiveSemesterPlanV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  const semesterPlan = state.semesterPlans.find((sp) => sp.id === semesterPlanId);
  if (!semesterPlan) {
    throw new Error(`SemesterPlan with ID "${semesterPlanId}" not found`);
  }

  const parentYearPlan = state.yearPlans.find((yp) => yp.id === semesterPlan.yearPlanId);
  if (!parentYearPlan) {
    throw new Error(
      `Parent YearPlan "${semesterPlan.yearPlanId}" not found for SemesterPlan "${semesterPlanId}"`
    );
  }

  const workspace = state.workspaces.find((w) => w.yearPlanId === parentYearPlan.id);

  state.activeSemesterPlanId = semesterPlan.id;
  state.activeYearPlanId = parentYearPlan.id;
  state.activeProfileId = parentYearPlan.profileId;
  state.activeWorkspaceId = workspace ? workspace.id : undefined;

  saveStorageV5(state);
}

/**
 * Renames an existing AdministrationWorkspaceV5.
 *
 * Rules:
 * - Rejects if workspace is not found
 * - Only modifies `name` and `updatedAt`
 */
export function renameWorkspaceV5(workspaceId: string, name: string): void {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new Error('Workspace name cannot be empty');
  }

  const state = loadStorageV5();
  const workspace = state.workspaces.find((w) => w.id === workspaceId);
  if (!workspace) {
    throw new Error(`Workspace with ID "${workspaceId}" not found`);
  }

  workspace.name = trimmed;
  workspace.updatedAt = new Date().toISOString();

  saveStorageV5(state);
}
