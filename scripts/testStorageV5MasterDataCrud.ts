import assert from 'node:assert';
import {
  createInitialStorageV5,
  loadStorageV5,
  saveStorageV5,
  resetStorageV5,
  validateStorageStateV5,
  getProfileV5,
  createProfileV5,
  updateProfileV5,
  deleteProfileV5,
  setActiveProfileV5,
  getSchoolV5,
  createSchoolV5,
  updateSchoolV5,
  deleteSchoolV5,
  getPrincipalHistoriesV5,
  savePrincipalHistoryV5,
  setActivePrincipalV5,
  deletePrincipalHistoryV5,
  createYearHierarchyV5,
  STORAGE_KEY_V5,
} from '../src/services/storageV5';
import { PrincipalHistory } from '../src/types';

console.log('=== RUNNING AUDIT: STORAGE V5 MASTER DATA CRUD LAYER ===\n');

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

// Mock localStorage in node environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// =========================================================================
// TEST 1: create/get Profile
// =========================================================================
runTest('1. create/get Profile: Creates new profile, assigns ID prof-*, sets activeProfileId', () => {
  resetStorageV5();
  const school = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng No. 1',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: school.id,
  });

  assert.ok(profile.id.startsWith('prof-'));
  assert.strictEqual(profile.name, 'Budi Santoso');
  assert.strictEqual(profile.schoolId, school.id);
  assert.ok(profile.createdAt);
  assert.ok(profile.updatedAt);

  const retrieved = getProfileV5(profile.id);
  assert.deepStrictEqual(retrieved, profile);

  const state = loadStorageV5();
  assert.strictEqual(state.activeProfileId, profile.id);
});

// =========================================================================
// TEST 2: Profile dengan invalid schoolId → FAIL
// =========================================================================
runTest('2. Profile dengan invalid schoolId → FAIL: Rejects creation referencing non-existent schoolId', () => {
  resetStorageV5();
  assert.throws(() => {
    createProfileV5({
      name: 'Dewi',
      nip: '198501012010011002',
      status: 'PNS',
      defaultSubject: 'IPA',
      defaultLevel: 'SMP',
      schoolId: 'sch-non-existent',
    });
  }, /School with ID "sch-non-existent" not found/i);
});

// =========================================================================
// TEST 3: update Profile preserves id + createdAt
// =========================================================================
runTest('3. update Profile preserves id + createdAt: Updates mutable fields while keeping id and createdAt intact', () => {
  resetStorageV5();
  const school = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const created = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: school.id,
  });

  const updated = updateProfileV5(created.id, {
    name: 'Budi Santoso, M.Pd',
  });

  assert.strictEqual(updated.id, created.id);
  assert.strictEqual(updated.createdAt, created.createdAt);
  assert.strictEqual(updated.name, 'Budi Santoso, M.Pd');
  assert.ok(updated.updatedAt);
});

// =========================================================================
// TEST 4: changing profile.schoolId tanpa hierarchy → PASS
// =========================================================================
runTest('4. changing profile.schoolId tanpa hierarchy → PASS: Allows schoolId update when no YearPlan/Workspace exists', () => {
  resetStorageV5();
  const sch1 = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const sch2 = createSchoolV5({
    name: 'SDN 02 Menteng',
    npsn: '10000002',
    address: 'Jl. Menteng No. 2',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch1.id,
  });

  const updated = updateProfileV5(profile.id, { schoolId: sch2.id });
  assert.strictEqual(updated.schoolId, sch2.id);
});

// =========================================================================
// TEST 5: changing profile.schoolId dengan YearPlan → FAIL
// =========================================================================
runTest('5. changing profile.schoolId dengan YearPlan → FAIL: Throws if profile has associated YearPlan/Workspace', () => {
  resetStorageV5();
  const sch1 = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const sch2 = createSchoolV5({
    name: 'SDN 02 Menteng',
    npsn: '10000002',
    address: 'Jl. Menteng No. 2',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch1.id,
  });

  createYearHierarchyV5({
    profileId: profile.id,
    schoolId: sch1.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  assert.throws(() => {
    updateProfileV5(profile.id, { schoolId: sch2.id });
  }, /Cannot change schoolId for profile/i);
});

// =========================================================================
// TEST 6: delete Profile tanpa hierarchy → PASS
// =========================================================================
runTest('6. delete Profile tanpa hierarchy → PASS: Removes profile cleanly when no YearPlan/Workspace exists', () => {
  resetStorageV5();
  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
  });

  deleteProfileV5(profile.id);
  assert.strictEqual(getProfileV5(profile.id), undefined);

  const state = loadStorageV5();
  assert.strictEqual(state.activeProfileId, undefined);
});

// =========================================================================
// TEST 7: delete Profile dengan hierarchy → FAIL
// =========================================================================
runTest('7. delete Profile dengan hierarchy → FAIL: Rejects profile deletion when YearPlan/Workspace exists', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  createYearHierarchyV5({
    profileId: profile.id,
    schoolId: sch.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  assert.throws(() => {
    deleteProfileV5(profile.id);
  }, /Cannot delete profile/i);
});

// =========================================================================
// TEST 8: setActiveProfile clears unrelated Year/Semester/Workspace
// =========================================================================
runTest('8. setActiveProfile clears unrelated Year/Semester/Workspace: Clears active pointers if not owned by new active profile', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profA = createProfileV5({
    name: 'Teacher A',
    nip: '1001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  createYearHierarchyV5({
    profileId: profA.id,
    schoolId: sch.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  const stateWithA = loadStorageV5();
  assert.ok(stateWithA.activeYearPlanId);
  assert.ok(stateWithA.activeWorkspaceId);

  const profB = createProfileV5({
    name: 'Teacher B',
    nip: '1002',
    status: 'PNS',
    defaultSubject: 'IPA',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  setActiveProfileV5(profB.id);

  const stateWithB = loadStorageV5();
  assert.strictEqual(stateWithB.activeProfileId, profB.id);
  assert.strictEqual(stateWithB.activeYearPlanId, undefined);
  assert.strictEqual(stateWithB.activeWorkspaceId, undefined);
  assert.strictEqual(stateWithB.activeSemesterPlanId, undefined);
});

// =========================================================================
// TEST 9: create/get School
// =========================================================================
runTest('9. create/get School: Creates school entity sch-* and retrieves it intact', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SMP Negeri 1 Jakarta',
    npsn: '20101010',
    address: 'Jl. Pemuda No. 1',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: 'Drs. H. Ahmad',
    principalNip: '196501011990011001',
  });

  assert.ok(sch.id.startsWith('sch-'));
  assert.strictEqual(sch.name, 'SMP Negeri 1 Jakarta');
  assert.strictEqual(sch.npsn, '20101010');

  const retrieved = getSchoolV5(sch.id);
  assert.deepStrictEqual(retrieved, sch);
});

// =========================================================================
// TEST 10: duplicate non-empty NPSN → FAIL
// =========================================================================
runTest('10. duplicate non-empty NPSN → FAIL: Rejects creation of school with duplicate non-empty NPSN', () => {
  resetStorageV5();
  createSchoolV5({
    name: 'SMP Negeri 1 Jakarta',
    npsn: '20101010',
    address: 'Jl. Pemuda No. 1',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  assert.throws(() => {
    createSchoolV5({
      name: 'SMP Negeri 1 Duplikat',
      npsn: '20101010',
      address: 'Jl. Pemuda No. 2',
      village: 'Rawamangun',
      district: 'Pulo Gadung',
      regency: 'Jakarta Timur',
      province: 'DKI Jakarta',
      principalName: '',
      principalNip: '',
    });
  }, /Duplicate NPSN "20101010"/i);
});

// =========================================================================
// TEST 11: update School preserves id + createdAt
// =========================================================================
runTest('11. update School preserves id + createdAt: Preserves identity fields on update', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SMP Negeri 1 Jakarta',
    npsn: '20101010',
    address: 'Jl. Pemuda No. 1',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const updated = updateSchoolV5(sch.id, {
    address: 'Jl. Pemuda No. 10',
  });

  assert.strictEqual(updated.id, sch.id);
  assert.strictEqual(updated.createdAt, sch.createdAt);
  assert.strictEqual(updated.address, 'Jl. Pemuda No. 10');
  assert.ok(updated.updatedAt);
});

// =========================================================================
// TEST 12: update to duplicate NPSN → FAIL
// =========================================================================
runTest('12. update to duplicate NPSN → FAIL: Rejects NPSN update that collides with another school', () => {
  resetStorageV5();
  const sch1 = createSchoolV5({
    name: 'SMP Negeri 1',
    npsn: '20101010',
    address: 'Jl. Pemuda No. 1',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const sch2 = createSchoolV5({
    name: 'SMP Negeri 2',
    npsn: '20101011',
    address: 'Jl. Pemuda No. 2',
    village: 'Rawamangun',
    district: 'Pulo Gadung',
    regency: 'Jakarta Timur',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  assert.throws(() => {
    updateSchoolV5(sch2.id, { npsn: '20101010' });
  }, /Duplicate NPSN "20101010"/i);
});

// =========================================================================
// TEST 13: delete referenced School → FAIL
// =========================================================================
runTest('13. delete referenced School → FAIL: Rejects deletion of school referenced by Profile/YearPlan', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  createProfileV5({
    name: 'Teacher A',
    nip: '1001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  assert.throws(() => {
    deleteSchoolV5(sch.id);
  }, /Cannot delete school/i);
});

// =========================================================================
// TEST 14: delete unused School → PASS
// =========================================================================
runTest('14. delete unused School → PASS: Deletes unreferenced school and its principal histories', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN Unused',
    npsn: '99999999',
    address: 'Jl. Unused',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  deleteSchoolV5(sch.id);
  assert.strictEqual(getSchoolV5(sch.id), undefined);
});

// =========================================================================
// TEST 15: PrincipalHistory orphan School → FAIL
// =========================================================================
runTest('15. PrincipalHistory orphan School → FAIL: Rejects saving PrincipalHistory for non-existent schoolId', () => {
  resetStorageV5();
  const ph: PrincipalHistory = {
    id: 'ph-1',
    schoolId: 'sch-non-existent',
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  assert.throws(() => {
    savePrincipalHistoryV5(ph);
  }, /School with ID "sch-non-existent" not found/i);
});

// =========================================================================
// TEST 16: save active PrincipalHistory syncs School
// =========================================================================
runTest('16. save active PrincipalHistory syncs School: Synchronizes principalName and principalNip to School', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const ph: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  savePrincipalHistoryV5(ph);

  const updatedSch = getSchoolV5(sch.id)!;
  assert.strictEqual(updatedSch.principalName, 'Drs. Ahmad');
  assert.strictEqual(updatedSch.principalNip, '196501011990011001');
});

// =========================================================================
// TEST 17: second active PrincipalHistory deactivates first
// =========================================================================
runTest('17. second active PrincipalHistory deactivates first: Automatically deactivates prior active principal', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const ph1: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph1);

  const ph2: PrincipalHistory = {
    id: 'ph-2',
    schoolId: sch.id,
    name: 'Hj. Siti, M.Pd',
    nip: '197001011995012001',
    startDate: '2026-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph2);

  const histories = getPrincipalHistoriesV5(sch.id);
  const h1 = histories.find((h) => h.id === 'ph-1')!;
  const h2 = histories.find((h) => h.id === 'ph-2')!;

  assert.strictEqual(h1.isActive, false);
  assert.strictEqual(h2.isActive, true);

  const updatedSch = getSchoolV5(sch.id)!;
  assert.strictEqual(updatedSch.principalName, 'Hj. Siti, M.Pd');
  assert.strictEqual(updatedSch.principalNip, '197001011995012001');
});

// =========================================================================
// TEST 18: setActivePrincipal syncs School
// =========================================================================
runTest('18. setActivePrincipal syncs School: Switches active principal and updates school info', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const ph1: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph1);

  const ph2: PrincipalHistory = {
    id: 'ph-2',
    schoolId: sch.id,
    name: 'Hj. Siti, M.Pd',
    nip: '197001011995012001',
    startDate: '2026-01-01',
    isActive: false,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph2);

  setActivePrincipalV5(sch.id, 'ph-2');

  const histories = getPrincipalHistoriesV5(sch.id);
  assert.strictEqual(histories.find((h) => h.id === 'ph-1')!.isActive, false);
  assert.strictEqual(histories.find((h) => h.id === 'ph-2')!.isActive, true);

  const updatedSch = getSchoolV5(sch.id)!;
  assert.strictEqual(updatedSch.principalName, 'Hj. Siti, M.Pd');
});

// =========================================================================
// TEST 19: active history from another School → FAIL
// =========================================================================
runTest('19. active history from another School → FAIL: Rejects activating history belonging to a different school', () => {
  resetStorageV5();
  const sch1 = createSchoolV5({
    name: 'SDN 01',
    npsn: '10000001',
    address: 'Jl. 1',
    village: 'A',
    district: 'B',
    regency: 'C',
    province: 'D',
    principalName: '',
    principalNip: '',
  });

  const sch2 = createSchoolV5({
    name: 'SDN 02',
    npsn: '10000002',
    address: 'Jl. 2',
    village: 'A',
    district: 'B',
    regency: 'C',
    province: 'D',
    principalName: '',
    principalNip: '',
  });

  const ph1: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch1.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph1);

  assert.throws(() => {
    setActivePrincipalV5(sch2.id, 'ph-1');
  }, /belongs to school/i);
});

// =========================================================================
// TEST 20: delete inactive history
// =========================================================================
runTest('20. delete inactive history: Removes inactive history without clearing school principal info', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const ph1: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph1);

  const ph2: PrincipalHistory = {
    id: 'ph-2',
    schoolId: sch.id,
    name: 'Hj. Siti, M.Pd',
    nip: '197001011995012001',
    startDate: '2022-01-01',
    isActive: false,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph2);

  deletePrincipalHistoryV5('ph-2');

  const histories = getPrincipalHistoriesV5(sch.id);
  assert.strictEqual(histories.length, 1);
  assert.strictEqual(histories[0].id, 'ph-1');

  const updatedSch = getSchoolV5(sch.id)!;
  assert.strictEqual(updatedSch.principalName, 'Drs. Ahmad');
});

// =========================================================================
// TEST 21: delete active history clears School principal name/NIP
// =========================================================================
runTest('21. delete active history clears School principal name/NIP: Clears school principal info when active history is deleted', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const ph1: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph1);

  deletePrincipalHistoryV5('ph-1');

  const histories = getPrincipalHistoriesV5(sch.id);
  assert.strictEqual(histories.length, 0);

  const updatedSch = getSchoolV5(sch.id)!;
  assert.strictEqual(updatedSch.principalName, '');
  assert.strictEqual(updatedSch.principalNip, '');
});

// =========================================================================
// TEST 22: Profile orphan school rejected by validator
// =========================================================================
runTest('22. Profile orphan school rejected by validator: validateStorageStateV5 rejects orphan profile.schoolId', () => {
  resetStorageV5();
  const state = createInitialStorageV5();
  state.profiles.push({
    id: 'prof-orphan',
    name: 'Orphan Teacher',
    nip: '12345',
    status: 'PNS',
    defaultSubject: 'IPA',
    defaultLevel: 'SMP',
    schoolId: 'sch-non-existent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.throws(() => {
    validateStorageStateV5(state);
  }, /references non-existent schoolId "sch-non-existent"/i);
});

// =========================================================================
// TEST 23: duplicate PrincipalHistory ID rejected
// =========================================================================
runTest('23. duplicate PrincipalHistory ID rejected: validateStorageStateV5 rejects duplicate PrincipalHistory IDs', () => {
  resetStorageV5();
  const state = createInitialStorageV5();
  state.schools.push({
    id: 'sch-1',
    name: 'SDN 01',
    npsn: '10000001',
    address: 'Jl. 1',
    village: 'A',
    district: 'B',
    regency: 'C',
    province: 'D',
    principalName: '',
    principalNip: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  state.principalHistories.push(
    {
      id: 'ph-1',
      schoolId: 'sch-1',
      name: 'Ahmad',
      nip: '100',
      startDate: '2024-01-01',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ph-1',
      schoolId: 'sch-1',
      name: 'Budi',
      nip: '101',
      startDate: '2025-01-01',
      isActive: false,
      createdAt: new Date().toISOString(),
    }
  );

  assert.throws(() => {
    validateStorageStateV5(state);
  }, /Duplicate ID "ph-1" found in "principalHistories"/i);
});

// =========================================================================
// TEST 24: multiple active histories same School rejected
// =========================================================================
runTest('24. multiple active histories same School rejected: validateStorageStateV5 rejects multiple active principal histories for same school', () => {
  resetStorageV5();
  const state = createInitialStorageV5();
  state.schools.push({
    id: 'sch-1',
    name: 'SDN 01',
    npsn: '10000001',
    address: 'Jl. 1',
    village: 'A',
    district: 'B',
    regency: 'C',
    province: 'D',
    principalName: '',
    principalNip: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  state.principalHistories.push(
    {
      id: 'ph-1',
      schoolId: 'sch-1',
      name: 'Ahmad',
      nip: '100',
      startDate: '2024-01-01',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ph-2',
      schoolId: 'sch-1',
      name: 'Budi',
      nip: '101',
      startDate: '2025-01-01',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  );

  assert.throws(() => {
    validateStorageStateV5(state);
  }, /School "sch-1" has multiple active PrincipalHistories/i);
});

// =========================================================================
// TEST 25: save/load deepStrictEqual
// =========================================================================
runTest('25. save/load deepStrictEqual: Master data saveStorageV5 -> loadStorageV5 survives intact', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  const ph: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph);

  const savedState = loadStorageV5();
  const jsonStr = JSON.stringify(savedState);
  mockStorage.setItem(STORAGE_KEY_V5, jsonStr);

  const reloaded = loadStorageV5();
  assert.deepStrictEqual(reloaded, savedState);
});

// =========================================================================
// TEST 26: annualData + semesterData byte-for-byte unchanged
// =========================================================================
runTest('26. annualData + semesterData byte-for-byte unchanged: Master data operations do not mutate annualData/semesterData', () => {
  resetStorageV5();
  const initialState = loadStorageV5();
  const initialAnnual = JSON.stringify(initialState.annualData);
  const initialSemester = JSON.stringify(initialState.semesterData);

  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  const ph: PrincipalHistory = {
    id: 'ph-1',
    schoolId: sch.id,
    name: 'Drs. Ahmad',
    nip: '196501011990011001',
    startDate: '2024-01-01',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  savePrincipalHistoryV5(ph);

  const finalState = loadStorageV5();
  assert.strictEqual(JSON.stringify(finalState.annualData), initialAnnual);
  assert.strictEqual(JSON.stringify(finalState.semesterData), initialSemester);
});

// =========================================================================
// TEST 27: FIX 1A — hierarchy + explicit undefined
// =========================================================================
runTest('27. FIX 1A: hierarchy + explicit undefined schoolId → THROW: Rejects clearing schoolId when hierarchy exists, profile retains old schoolId', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  createYearHierarchyV5({
    profileId: profile.id,
    schoolId: sch.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  assert.throws(() => {
    updateProfileV5(profile.id, { schoolId: undefined });
  }, /Cannot change schoolId/i);

  const retained = getProfileV5(profile.id)!;
  assert.strictEqual(retained.schoolId, sch.id);
});

// =========================================================================
// TEST 28: FIX 1B — no hierarchy + explicit undefined
// =========================================================================
runTest('28. FIX 1B: no hierarchy + explicit undefined schoolId → PASS: Allows clearing schoolId when no hierarchy exists', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  const updated = updateProfileV5(profile.id, { schoolId: undefined });
  assert.strictEqual(updated.schoolId, undefined);
  assert.strictEqual(getProfileV5(profile.id)!.schoolId, undefined);
});

// =========================================================================
// TEST 29: FIX 2C — empty schoolId normalized to undefined
// =========================================================================
runTest('29. FIX 2C: empty schoolId normalized to undefined: Normalizes empty string to undefined without hierarchy and throws with hierarchy', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profile = createProfileV5({
    name: 'Budi Santoso',
    nip: '198501012010011001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  // Without hierarchy -> normalizes '' to undefined
  const updatedNoHierarchy = updateProfileV5(profile.id, { schoolId: '' });
  assert.strictEqual(updatedNoHierarchy.schoolId, undefined);

  // Set back schoolId
  updateProfileV5(profile.id, { schoolId: sch.id });

  // Add hierarchy
  createYearHierarchyV5({
    profileId: profile.id,
    schoolId: sch.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  // With hierarchy -> throws when previously had school
  assert.throws(() => {
    updateProfileV5(profile.id, { schoolId: '' });
  }, /Cannot change schoolId/i);
});

// =========================================================================
// TEST 30: FIX 3D — setActiveProfile stale pointers
// =========================================================================
runTest('30. FIX 3D: setActiveProfile stale pointers: Safely clears stale pointers when activeYearPlanId is undefined', () => {
  resetStorageV5();
  const sch = createSchoolV5({
    name: 'SDN 01 Menteng',
    npsn: '10000001',
    address: 'Jl. Menteng',
    village: 'Menteng',
    district: 'Menteng',
    regency: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    principalName: '',
    principalNip: '',
  });

  const profA = createProfileV5({
    name: 'Teacher A',
    nip: '1001',
    status: 'PNS',
    defaultSubject: 'Matematika',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  const resA = createYearHierarchyV5({
    profileId: profA.id,
    schoolId: sch.id,
    academicYear: '2026/2027',
    curriculumType: 'KURIKULUM_MERDEKA',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Matematika',
  });

  const profB = createProfileV5({
    name: 'Teacher B',
    nip: '1002',
    status: 'PNS',
    defaultSubject: 'IPA',
    defaultLevel: 'SD',
    schoolId: sch.id,
  });

  // Directly craft state: activeYearPlanId = undefined, activeWorkspaceId = workspace A
  const state = loadStorageV5();
  state.activeProfileId = profA.id;
  state.activeYearPlanId = undefined;
  state.activeWorkspaceId = resA.workspace.id;
  state.activeSemesterPlanId = undefined;
  saveStorageV5(state);

  // Switch active profile to Profile B
  setActiveProfileV5(profB.id);

  const finalState = loadStorageV5();
  assert.strictEqual(finalState.activeProfileId, profB.id);
  assert.strictEqual(finalState.activeYearPlanId, undefined);
  assert.strictEqual(finalState.activeWorkspaceId, undefined);
  assert.strictEqual(finalState.activeSemesterPlanId, undefined);
});

console.log(`\n========================================`);
console.log(`ALL STORAGE V5 MASTER DATA CRUD TESTS PASSED (${passedTests}/${totalTests})`);
console.log(`========================================\n`);
