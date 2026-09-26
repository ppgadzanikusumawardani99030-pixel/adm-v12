import assert from 'node:assert';
import {
  createInitialStorageV5,
  validateStorageStateV5,
  serializeBackupV5,
} from '../src/services/storageV5';
import { AppStorageStateV5 } from '../src/types';

console.log('=== RUNNING AUDIT: STORAGE V5 RELATIONAL INTEGRITY GATE ===\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${totalTests}. ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`[FAIL] ${totalTests}. ${name}:`, err.message);
    throw err;
  }
}

function createValidTestState(): AppStorageStateV5 {
  const state = createInitialStorageV5();

  state.profiles.push({
    id: 'prof-1',
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SMP',
    schoolId: 'sch-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });

  state.schools.push({
    id: 'sch-1',
    name: 'SMP Negeri 1 Jakarta',
    npsn: '20101010',
    address: 'Jl. Pemuda No. 1',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: 'Drs. H. Ahmad',
    principalNip: '196501011990011001',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });

  state.yearPlans.push({
    id: 'yp-1',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SMP',
    grade: 'Kelas 7',
    subject: 'Matematika',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });

  state.workspaces.push({
    id: 'ws-1',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    yearPlanId: 'yp-1',
    name: 'Matematika Kelas 7',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });

  state.semesterPlans.push(
    {
      id: 'sp-1',
      yearPlanId: 'yp-1',
      semester: 1,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    },
    {
      id: 'sp-2',
      yearPlanId: 'yp-1',
      semester: 2,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    }
  );

  return state;
}

// =========================================================================
// TEST 1: Valid hierarchy passes validation
// =========================================================================
runTest('1. Valid State: Complete canonical hierarchy passes validateStorageStateV5', () => {
  const state = createValidTestState();
  const validated = validateStorageStateV5(state);
  assert.strictEqual(validated.yearPlans.length, 1);
  assert.strictEqual(validated.workspaces.length, 1);
  assert.strictEqual(validated.semesterPlans.length, 2);
});

// =========================================================================
// TEST 2: Root ID Uniqueness
// =========================================================================
runTest('2. Root ID Uniqueness: Rejects duplicate IDs in profiles, schools, workspaces, yearPlans, semesterPlans', () => {
  // Duplicate profile ID
  const dupProf = createValidTestState();
  dupProf.profiles.push({ ...dupProf.profiles[0] });
  assert.throws(() => validateStorageStateV5(dupProf), /Duplicate ID "prof-1" found in "profiles"/i);

  // Duplicate school ID
  const dupSch = createValidTestState();
  dupSch.schools.push({ ...dupSch.schools[0] });
  assert.throws(() => validateStorageStateV5(dupSch), /Duplicate ID "sch-1" found in "schools"/i);

  // Duplicate workspace ID
  const dupWs = createValidTestState();
  dupWs.workspaces.push({ ...dupWs.workspaces[0], id: 'ws-1' });
  assert.throws(() => validateStorageStateV5(dupWs), /Duplicate ID "ws-1" found in "workspaces"/i);

  // Duplicate yearPlan ID
  const dupYp = createValidTestState();
  dupYp.yearPlans.push({ ...dupYp.yearPlans[0] });
  assert.throws(() => validateStorageStateV5(dupYp), /Duplicate ID "yp-1" found in "yearPlans"/i);

  // Duplicate semesterPlan ID
  const dupSp = createValidTestState();
  dupSp.semesterPlans.push({ ...dupSp.semesterPlans[0] });
  assert.throws(() => validateStorageStateV5(dupSp), /Duplicate ID "sp-1" found in "semesterPlans"/i);
});

// =========================================================================
// TEST 3: YearPlan Relational Integrity
// =========================================================================
runTest('3. YearPlan Relations: Enforces existence of profileId, schoolId, and profile.schoolId equality', () => {
  // Non-existent profileId
  const badProf = createValidTestState();
  badProf.yearPlans[0].profileId = 'prof-non-existent';
  assert.throws(() => validateStorageStateV5(badProf), /references non-existent profileId/i);

  // Non-existent schoolId
  const badSch = createValidTestState();
  badSch.yearPlans[0].schoolId = 'sch-non-existent';
  assert.throws(() => validateStorageStateV5(badSch), /references non-existent schoolId/i);

  // Profile school mismatch
  const mismatchSch = createValidTestState();
  mismatchSch.schools.push({
    id: 'sch-2',
    name: 'SMP Negeri 2 Jakarta',
    npsn: '20101011',
    address: 'Jl. Pemuda No. 2',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: 'Drs. H. Ahmad',
    principalNip: '196501011990011001',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  mismatchSch.yearPlans[0].schoolId = 'sch-2'; // profile has schoolId = 'sch-1'
  assert.throws(() => validateStorageStateV5(mismatchSch), /profile school mismatch/i);
});

// =========================================================================
// TEST 4: Workspace Relational Integrity
// =========================================================================
runTest('4. Workspace Relations: Enforces 1 YearPlan ↔ 1 Workspace and matching profileId / schoolId', () => {
  // Non-existent yearPlanId
  const badYp = createValidTestState();
  badYp.workspaces[0].yearPlanId = 'yp-non-existent';
  assert.throws(() => validateStorageStateV5(badYp), /references non-existent yearPlanId/i);

  // Workspace profileId mismatch
  const badWsProf = createValidTestState();
  badWsProf.workspaces[0].profileId = 'prof-other';
  assert.throws(() => validateStorageStateV5(badWsProf), /profileId "prof-other" does not match parent YearPlan/i);

  // Workspace schoolId mismatch (explicit test)
  const badWsSch = createValidTestState();
  badWsSch.workspaces[0].schoolId = 'sch-other';
  assert.throws(() => validateStorageStateV5(badWsSch), /schoolId "sch-other" does not match parent YearPlan schoolId/i);

  // Missing workspace for YearPlan
  const missingWs = createValidTestState();
  missingWs.workspaces = [];
  assert.throws(() => validateStorageStateV5(missingWs), /YearPlan "yp-1" does not have a matching Workspace/i);

  // Duplicate workspace for same YearPlan
  const dupWs = createValidTestState();
  dupWs.workspaces.push({
    id: 'ws-2',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    yearPlanId: 'yp-1',
    name: 'Duplicate Workspace',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  assert.throws(() => validateStorageStateV5(dupWs), /has duplicate Workspaces/i);
});

// =========================================================================
// TEST 5: SemesterPlan Relational Integrity
// =========================================================================
runTest('5. SemesterPlan Relations: Enforces 1 YearPlan ↔ exactly 1 Sem 1 & 1 Sem 2', () => {
  // Non-existent yearPlanId
  const badYp = createValidTestState();
  badYp.semesterPlans[0].yearPlanId = 'yp-non-existent';
  assert.throws(() => validateStorageStateV5(badYp), /Parent YearPlan "yp-non-existent" not found/i);

  // Invalid semester value
  const badSemVal = createValidTestState();
  (badSemVal.semesterPlans[0] as any).semester = 3;
  assert.throws(() => validateStorageStateV5(badSemVal), /invalid semester value "3"/i);

  // Missing Semester 1
  const noSem1 = createValidTestState();
  noSem1.semesterPlans = noSem1.semesterPlans.filter((sp) => sp.semester !== 1);
  assert.throws(() => validateStorageStateV5(noSem1), /must have exactly 1 SemesterPlan for Semester 1/i);

  // Missing Semester 2
  const noSem2 = createValidTestState();
  noSem2.semesterPlans = noSem2.semesterPlans.filter((sp) => sp.semester !== 2);
  assert.throws(() => validateStorageStateV5(noSem2), /must have exactly 1 SemesterPlan for Semester 2/i);

  // Duplicate Semester 1
  const dupSem1 = createValidTestState();
  dupSem1.semesterPlans.push({
    id: 'sp-3',
    yearPlanId: 'yp-1',
    semester: 1,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  assert.throws(() => validateStorageStateV5(dupSem1), /must have exactly 1 SemesterPlan for Semester 1/i);

  // Duplicate Semester 2
  const dupSem2 = createValidTestState();
  dupSem2.semesterPlans.push({
    id: 'sp-4',
    yearPlanId: 'yp-1',
    semester: 2,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  assert.throws(() => validateStorageStateV5(dupSem2), /must have exactly 1 SemesterPlan for Semester 2/i);
});

// =========================================================================
// TEST 6: Year Scoped Entries Integrity
// =========================================================================
runTest('6. Year Scoped Entries: Enforces existing yearPlanId and max 1 entry per yearPlanId per collection', () => {
  // Invalid yearPlanId
  const badAnnual = createValidTestState();
  badAnnual.annualJPReferences.push({
    yearPlanId: 'yp-non-existent',
    value: {
      officialAnnualJP: 108,
      referenceWeeklyEquivalentJP: 3,
      regulationReference: 'Permendikbudristek 12/2024',
    },
  });
  assert.throws(() => validateStorageStateV5(badAnnual), /references non-existent yearPlanId "yp-non-existent"/i);

  // Duplicate yearPlanId entry in annualData.tp
  const dupTp = createValidTestState();
  dupTp.annualData.tp.push(
    {
      yearPlanId: 'yp-1',
      value: {
        id: 'tp-1',
        academicSettingId: 'set-1',
        items: [],
        updatedAt: '2026-07-01T00:00:00Z',
      },
    },
    {
      yearPlanId: 'yp-1',
      value: {
        id: 'tp-2',
        academicSettingId: 'set-1',
        items: [],
        updatedAt: '2026-07-01T00:00:00Z',
      },
    }
  );
  assert.throws(() => validateStorageStateV5(dupTp), /Duplicate entry for yearPlanId "yp-1" in collection "annualData.tp"/i);
});

// =========================================================================
// TEST 7: Semester Scoped Entries Integrity & SemesterJP Strict Matching
// =========================================================================
runTest('7. Semester Scoped Entries: Enforces existing semesterPlanId, max 1 entry per collection, and semesterJPSettings inner ID match', () => {
  // Invalid semesterPlanId
  const badSem = createValidTestState();
  badSem.semesterData.learningPlan.push({
    semesterPlanId: 'sp-non-existent',
    value: [],
  });
  assert.throws(() => validateStorageStateV5(badSem), /references non-existent semesterPlanId "sp-non-existent"/i);

  // Duplicate entry in semesterData.roster
  const dupRoster = createValidTestState();
  dupRoster.semesterData.roster.push(
    { semesterPlanId: 'sp-1', value: [] },
    { semesterPlanId: 'sp-1', value: [] }
  );
  assert.throws(() => validateStorageStateV5(dupRoster), /Duplicate entry for semesterPlanId "sp-1" in collection "semesterData.roster"/i);

  // semesterJPSettings inner semesterPlanId missing
  const missingJPId = createValidTestState();
  missingJPId.semesterJPSettings.push({
    semesterPlanId: 'sp-1',
    value: { actualScheduledWeeklyJP: 3 } as any,
  });
  assert.throws(() => validateStorageStateV5(missingJPId), /semesterJPSettings inner semesterPlanId/i);

  // semesterJPSettings inner semesterPlanId undefined
  const undefJPId = createValidTestState();
  undefJPId.semesterJPSettings.push({
    semesterPlanId: 'sp-1',
    value: { semesterPlanId: undefined, actualScheduledWeeklyJP: 3 } as any,
  });
  assert.throws(() => validateStorageStateV5(undefJPId), /semesterJPSettings inner semesterPlanId/i);

  // semesterJPSettings inner semesterPlanId empty string
  const emptyJPId = createValidTestState();
  emptyJPId.semesterJPSettings.push({
    semesterPlanId: 'sp-1',
    value: { semesterPlanId: '', actualScheduledWeeklyJP: 3, source: 'SCHOOL_SCHEDULE' },
  });
  assert.throws(() => validateStorageStateV5(emptyJPId), /semesterJPSettings inner semesterPlanId/i);

  // semesterJPSettings inner semesterPlanId mismatch
  const mismatchJP = createValidTestState();
  mismatchJP.semesterJPSettings.push({
    semesterPlanId: 'sp-1',
    value: {
      semesterPlanId: 'sp-mismatch',
      actualScheduledWeeklyJP: 3,
      source: 'SCHOOL_SCHEDULE',
    },
  });
  assert.throws(() => validateStorageStateV5(mismatchJP), /semesterJPSettings inner semesterPlanId "sp-mismatch" does not match outer semesterPlanId "sp-1"/i);

  // semesterJPSettings valid inner semesterPlanId === outer semesterPlanId passes
  const validJP = createValidTestState();
  validJP.semesterJPSettings.push({
    semesterPlanId: 'sp-1',
    value: {
      semesterPlanId: 'sp-1',
      actualScheduledWeeklyJP: 3,
      source: 'SCHOOL_SCHEDULE',
    },
  });
  const validatedJP = validateStorageStateV5(validJP);
  assert.strictEqual(validatedJP.semesterJPSettings.length, 1);
});

// =========================================================================
// TEST 8: Active Context Pointer Validation
// =========================================================================
runTest('8. Active Context Pointers: Validates existence and relationship cross-checks', () => {
  // Non-existent activeProfileId
  const badActiveProf = createValidTestState();
  badActiveProf.activeProfileId = 'prof-bad';
  assert.throws(() => validateStorageStateV5(badActiveProf), /activeProfileId "prof-bad" references non-existent profile/i);

  // Invalid activeYearPlanId
  const badActiveYPId = createValidTestState();
  badActiveYPId.activeYearPlanId = 'yp-non-existent';
  assert.throws(() => validateStorageStateV5(badActiveYPId), /activeYearPlanId "yp-non-existent" references non-existent yearPlan/i);

  // Invalid activeWorkspaceId
  const badActiveWSId = createValidTestState();
  badActiveWSId.activeWorkspaceId = 'ws-non-existent';
  assert.throws(() => validateStorageStateV5(badActiveWSId), /activeWorkspaceId "ws-non-existent" references non-existent workspace/i);

  // Invalid activeSemesterPlanId
  const badActiveSPId = createValidTestState();
  badActiveSPId.activeSemesterPlanId = 'sp-non-existent';
  assert.throws(() => validateStorageStateV5(badActiveSPId), /activeSemesterPlanId "sp-non-existent" references non-existent semesterPlan/i);

  // Mismatched activeYearPlanId profileId
  const badActiveYP = createValidTestState();
  badActiveYP.profiles.push({
    id: 'prof-2',
    name: 'Dewi',
    nip: '198501012010011002',
    status: 'PNS',
    defaultSubject: 'IPA',
    defaultLevel: 'SMP',
    schoolId: 'sch-1',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  badActiveYP.activeProfileId = 'prof-2';
  badActiveYP.activeYearPlanId = 'yp-1'; // yp-1 belongs to prof-1
  assert.throws(() => validateStorageStateV5(badActiveYP), /activeYearPlanId profileId "prof-1" mismatch with activeProfileId "prof-2"/i);

  // activeWorkspace.yearPlanId !== activeYearPlanId mismatch
  const wsYpMismatch = createValidTestState();
  wsYpMismatch.yearPlans.push({
    id: 'yp-2',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    academicYear: '2027/2028',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SMP',
    grade: 'Kelas 8',
    subject: 'Matematika',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  wsYpMismatch.workspaces.push({
    id: 'ws-2',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    yearPlanId: 'yp-2',
    name: 'Matematika Kelas 8',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  wsYpMismatch.semesterPlans.push(
    { id: 'sp-3', yearPlanId: 'yp-2', semester: 1, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    { id: 'sp-4', yearPlanId: 'yp-2', semester: 2, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' }
  );
  wsYpMismatch.activeYearPlanId = 'yp-1';
  wsYpMismatch.activeWorkspaceId = 'ws-2'; // ws-2 has yearPlanId = 'yp-2'
  assert.throws(() => validateStorageStateV5(wsYpMismatch), /activeWorkspaceId yearPlanId "yp-2" mismatch with activeYearPlanId "yp-1"/i);

  // activeSemester.yearPlanId !== activeYearPlanId mismatch
  const spYpMismatch = createValidTestState();
  spYpMismatch.yearPlans.push({
    id: 'yp-2',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    academicYear: '2027/2028',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SMP',
    grade: 'Kelas 8',
    subject: 'Matematika',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  spYpMismatch.workspaces.push({
    id: 'ws-2',
    profileId: 'prof-1',
    schoolId: 'sch-1',
    yearPlanId: 'yp-2',
    name: 'Matematika Kelas 8',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  });
  spYpMismatch.semesterPlans.push(
    { id: 'sp-3', yearPlanId: 'yp-2', semester: 1, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    { id: 'sp-4', yearPlanId: 'yp-2', semester: 2, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' }
  );
  spYpMismatch.activeYearPlanId = 'yp-1';
  spYpMismatch.activeSemesterPlanId = 'sp-3'; // sp-3 has yearPlanId = 'yp-2'
  assert.throws(() => validateStorageStateV5(spYpMismatch), /activeSemesterPlanId yearPlanId "yp-2" mismatch with activeYearPlanId "yp-1"/i);
});

// =========================================================================
// TEST 9: serializeBackupV5 Validation Gate
// =========================================================================
runTest('9. serializeBackupV5 Gate: Throws on invalid state before producing JSON', () => {
  const invalidState = createValidTestState();
  invalidState.semesterPlans = []; // break semester plan relation

  assert.throws(() => serializeBackupV5(invalidState), /must have exactly 1 SemesterPlan/i);
});

console.log(`\n========================================`);
console.log(`ALL STORAGE V5 RELATIONAL INTEGRITY TESTS PASSED (${passedTests}/${totalTests})`);
console.log(`========================================\n`);
