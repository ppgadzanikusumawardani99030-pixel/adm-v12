import {
  AppStorageStateV5,
  StorageBackupV5,
  STORAGE_KEY_V5,
  AdministrationWorkspaceV5,
  YearScopedEntry,
  SemesterScopedEntry,
  SemesterCalendarEntry,
  SemesterAttendanceEntry,
  SemesterGradeEntry,
} from '../types/storageV5';
import {
  YearPlan,
  SemesterPlan,
  CurriculumType,
  CPData,
  CPAnalysisData,
  TPData,
  ATPData,
  CurriculumContextLock,
  AnnualJPReference,
  SemesterJPSetting,
  TimeAllocation,
  LearningPlan,
  AssessmentCriterion,
  AssessmentPlan,
  AssessmentPackage,
  Student,
  RemedialRecord,
  EnrichmentRecord,
} from '../types';

export { STORAGE_KEY_V5 };

export interface AnnualDataV5Result {
  yearPlan: YearPlan;
  cp: CPData | undefined;
  cpAnalysis: CPAnalysisData | undefined;
  tp: TPData | undefined;
  atp: ATPData | undefined;
  curriculumContext: CurriculumContextLock | undefined;
  annualJPReference: AnnualJPReference | undefined;
}

export interface SemesterDataV5Result {
  semesterPlan: SemesterPlan;
  yearPlan: YearPlan;
  semesterJPSetting: SemesterJPSetting | undefined;
  academicCalendar: SemesterCalendarEntry | undefined;
  timeAllocation: TimeAllocation[] | undefined;
  learningPlan: LearningPlan[] | undefined;
  assessmentCriteria: AssessmentCriterion[] | undefined;
  assessmentPlan: AssessmentPlan[] | undefined;
  assessmentPackage: AssessmentPackage[] | undefined;
  roster: Student[] | undefined;
  attendance: SemesterAttendanceEntry | undefined;
  grade: SemesterGradeEntry | undefined;
  remedial: RemedialRecord[] | undefined;
  enrichment: EnrichmentRecord[] | undefined;
}

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

/**
 * Asserts that a YearPlan exists in the state and returns it.
 */
function assertYearPlanExists(state: AppStorageStateV5, yearPlanId: string): YearPlan {
  const yearPlan = state.yearPlans.find((yp) => yp.id === yearPlanId);
  if (!yearPlan) {
    throw new Error(`YearPlan with ID "${yearPlanId}" not found`);
  }
  return yearPlan;
}

/**
 * Upserts a YearScopedEntry into an annual collection.
 * Replaces value if entry already exists, or inserts a new entry if not.
 * Ensures exactly 1 wrapper per yearPlanId.
 */
function upsertAnnualScopedEntry<T>(
  collection: YearScopedEntry<T>[],
  yearPlanId: string,
  value: T
): T {
  const existing = collection.find((entry) => entry.yearPlanId === yearPlanId);
  if (existing) {
    existing.value = value;
  } else {
    collection.push({ yearPlanId, value });
  }
  return value;
}

/**
 * Removes a YearScopedEntry from an annual collection.
 * Returns true if an entry was removed, false if not found.
 */
function deleteAnnualScopedEntry<T>(
  collection: YearScopedEntry<T>[],
  yearPlanId: string
): boolean {
  const index = collection.findIndex((entry) => entry.yearPlanId === yearPlanId);
  if (index !== -1) {
    collection.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Retrieves all annual scoped domain data for a given YearPlan.
 *
 * Rules:
 * - Validates that YearPlan exists (throws if not found)
 * - Returns { yearPlan, cp, cpAnalysis, tp, atp, curriculumContext, annualJPReference }
 * - Unpopulated collections return undefined
 * - Does not fallback to activeYearPlanId or other YearPlans
 */
export function getAnnualDataV5(yearPlanId: string): AnnualDataV5Result {
  const state = loadStorageV5();
  const yearPlan = assertYearPlanExists(state, yearPlanId);

  const cp = state.annualData.cp.find((e) => e.yearPlanId === yearPlanId)?.value;
  const cpAnalysis = state.annualData.cpAnalysis.find((e) => e.yearPlanId === yearPlanId)?.value;
  const tp = state.annualData.tp.find((e) => e.yearPlanId === yearPlanId)?.value;
  const atp = state.annualData.atp.find((e) => e.yearPlanId === yearPlanId)?.value;
  const curriculumContext = state.annualData.curriculumContext.find(
    (e) => e.yearPlanId === yearPlanId
  )?.value;
  const annualJPReference = state.annualJPReferences.find(
    (e) => e.yearPlanId === yearPlanId
  )?.value;

  return {
    yearPlan,
    cp,
    cpAnalysis,
    tp,
    atp,
    curriculumContext,
    annualJPReference,
  };
}

export function saveCPV5(yearPlanId: string, value: CPData): CPData {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualData.cp, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveCPAnalysisV5(yearPlanId: string, value: CPAnalysisData): CPAnalysisData {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualData.cpAnalysis, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveTPV5(yearPlanId: string, value: TPData): TPData {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualData.tp, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveATPV5(yearPlanId: string, value: ATPData): ATPData {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualData.atp, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveCurriculumContextV5(
  yearPlanId: string,
  value: CurriculumContextLock
): CurriculumContextLock {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualData.curriculumContext, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAnnualJPReferenceV5(
  yearPlanId: string,
  value: AnnualJPReference
): AnnualJPReference {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  upsertAnnualScopedEntry(state.annualJPReferences, yearPlanId, value);
  saveStorageV5(state);
  return value;
}

export function deleteCPV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualData.cp, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteCPAnalysisV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualData.cpAnalysis, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteTPV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualData.tp, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteATPV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualData.atp, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteCurriculumContextV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualData.curriculumContext, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAnnualJPReferenceV5(yearPlanId: string): void {
  const state = loadStorageV5();
  assertYearPlanExists(state, yearPlanId);
  const changed = deleteAnnualScopedEntry(state.annualJPReferences, yearPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

/**
 * Asserts that a SemesterPlan exists and its parent YearPlan exists.
 * Returns both entities.
 */
function assertSemesterPlanAndParentExist(
  state: AppStorageStateV5,
  semesterPlanId: string
): { semesterPlan: SemesterPlan; yearPlan: YearPlan } {
  const semesterPlan = state.semesterPlans.find((sp) => sp.id === semesterPlanId);
  if (!semesterPlan) {
    throw new Error(`SemesterPlan with ID "${semesterPlanId}" not found`);
  }

  const yearPlan = state.yearPlans.find((yp) => yp.id === semesterPlan.yearPlanId);
  if (!yearPlan) {
    throw new Error(
      `Parent YearPlan "${semesterPlan.yearPlanId}" not found for SemesterPlan "${semesterPlanId}"`
    );
  }

  return { semesterPlan, yearPlan };
}

/**
 * Upserts a SemesterScopedEntry into a semester collection.
 * Replaces value if entry already exists, or inserts a new entry if not.
 * Ensures exactly 1 wrapper per semesterPlanId.
 */
function upsertSemesterScopedEntry<T>(
  collection: SemesterScopedEntry<T>[],
  semesterPlanId: string,
  value: T
): T {
  const existing = collection.find((entry) => entry.semesterPlanId === semesterPlanId);
  if (existing) {
    existing.value = value;
  } else {
    collection.push({ semesterPlanId, value });
  }
  return value;
}

/**
 * Removes a SemesterScopedEntry from a semester collection.
 * Returns true if an entry was removed, false if not found.
 */
function deleteSemesterScopedEntry<T>(
  collection: SemesterScopedEntry<T>[],
  semesterPlanId: string
): boolean {
  const index = collection.findIndex((entry) => entry.semesterPlanId === semesterPlanId);
  if (index !== -1) {
    collection.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Retrieves all semester-scoped domain data for a given SemesterPlan.
 *
 * Rules:
 * - Validates that SemesterPlan and its parent YearPlan exist (throws if either not found)
 * - Returns { semesterPlan, yearPlan, ...collections }
 * - Unpopulated collections return undefined
 * - Does not use activeSemesterPlanId implicitly
 */
export function getSemesterDataV5(semesterPlanId: string): SemesterDataV5Result {
  const state = loadStorageV5();
  const { semesterPlan, yearPlan } = assertSemesterPlanAndParentExist(state, semesterPlanId);

  const semesterJPSetting = state.semesterJPSettings.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const academicCalendar = state.semesterData.academicCalendar.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const timeAllocation = state.semesterData.timeAllocation.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const learningPlan = state.semesterData.learningPlan.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const assessmentCriteria = state.semesterData.assessmentCriteria.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const assessmentPlan = state.semesterData.assessmentPlan.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const assessmentPackage = state.semesterData.assessmentPackage.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const roster = state.semesterData.roster.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const attendance = state.semesterData.attendance.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const grade = state.semesterData.grade.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const remedial = state.semesterData.remedial.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;
  const enrichment = state.semesterData.enrichment.find(
    (e) => e.semesterPlanId === semesterPlanId
  )?.value;

  return {
    semesterPlan,
    yearPlan,
    semesterJPSetting,
    academicCalendar,
    timeAllocation,
    learningPlan,
    assessmentCriteria,
    assessmentPlan,
    assessmentPackage,
    roster,
    attendance,
    grade,
    remedial,
    enrichment,
  };
}

export function saveSemesterJPSettingV5(
  semesterPlanId: string,
  value: SemesterJPSetting
): SemesterJPSetting {
  if (value.semesterPlanId !== semesterPlanId) {
    throw new Error(
      `SemesterJPSetting inner semesterPlanId "${value.semesterPlanId}" does not match outer semesterPlanId "${semesterPlanId}"`
    );
  }
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterJPSettings, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAcademicCalendarV5(
  semesterPlanId: string,
  value: SemesterCalendarEntry
): SemesterCalendarEntry {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.academicCalendar, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveTimeAllocationV5(
  semesterPlanId: string,
  value: TimeAllocation[]
): TimeAllocation[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.timeAllocation, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveLearningPlansV5(
  semesterPlanId: string,
  value: LearningPlan[]
): LearningPlan[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.learningPlan, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAssessmentCriteriaV5(
  semesterPlanId: string,
  value: AssessmentCriterion[]
): AssessmentCriterion[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.assessmentCriteria, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAssessmentPlansV5(
  semesterPlanId: string,
  value: AssessmentPlan[]
): AssessmentPlan[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.assessmentPlan, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAssessmentPackagesV5(
  semesterPlanId: string,
  value: AssessmentPackage[]
): AssessmentPackage[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.assessmentPackage, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveRosterV5(semesterPlanId: string, value: Student[]): Student[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.roster, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveAttendanceV5(
  semesterPlanId: string,
  value: SemesterAttendanceEntry
): SemesterAttendanceEntry {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.attendance, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveGradeV5(
  semesterPlanId: string,
  value: SemesterGradeEntry
): SemesterGradeEntry {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.grade, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveRemedialV5(
  semesterPlanId: string,
  value: RemedialRecord[]
): RemedialRecord[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.remedial, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function saveEnrichmentV5(
  semesterPlanId: string,
  value: EnrichmentRecord[]
): EnrichmentRecord[] {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  upsertSemesterScopedEntry(state.semesterData.enrichment, semesterPlanId, value);
  saveStorageV5(state);
  return value;
}

export function deleteSemesterJPSettingV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterJPSettings, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAcademicCalendarV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.academicCalendar, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteTimeAllocationV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.timeAllocation, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteLearningPlansV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.learningPlan, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAssessmentCriteriaV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.assessmentCriteria, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAssessmentPlansV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.assessmentPlan, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAssessmentPackagesV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.assessmentPackage, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteRosterV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.roster, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteAttendanceV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.attendance, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteGradeV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.grade, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteRemedialV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.remedial, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}

export function deleteEnrichmentV5(semesterPlanId: string): void {
  const state = loadStorageV5();
  assertSemesterPlanAndParentExist(state, semesterPlanId);
  const changed = deleteSemesterScopedEntry(state.semesterData.enrichment, semesterPlanId);
  if (changed) {
    saveStorageV5(state);
  }
}


