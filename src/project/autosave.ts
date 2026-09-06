import { MotionPairProject, parseProject } from './projectSchema';

const DATABASE_NAME = 'motion-pair-studio';
const STORE_NAME = 'projects';
const AUTOSAVE_KEY = 'current-autosave';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the project database.'));
  });
}

export async function saveAutosave(project: MotionPairProject) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ ...project, updatedAt: new Date().toISOString() }, AUTOSAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Autosave failed.'));
  });
  database.close();
}

export async function loadAutosave() {
  const database = await openDatabase();
  const value = await new Promise<unknown>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(AUTOSAVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not read autosave.'));
  });
  database.close();
  return value ? parseProject(value) : null;
}

