import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FieldOpsDB extends DBSchema {
  tasks: {
    key: string;
    value: any;
  };
  syncQueue: {
    key: string;
    value: {
      reportId: string;
      status: string;
      fieldNotes: string;
      imageObjUrl?: string; // We'll store the blob separately or convert to base64
      imageBase64?: string;
      imageType?: string;
      queuedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<FieldOpsDB>> | null = null;

export function getDB() {
  if (!dbPromise && typeof window !== 'undefined') {
    dbPromise = openDB<FieldOpsDB>('field-ops-db', 1, {
      upgrade(db) {
        db.createObjectStore('tasks', { keyPath: 'id' });
        db.createObjectStore('syncQueue', { keyPath: 'reportId' });
      },
    });
  }
  return dbPromise;
}

export async function cacheAssignedTasks(tasks: any[]) {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('tasks', 'readwrite');
  await tx.objectStore('tasks').clear();
  for (const task of tasks) {
    await tx.objectStore('tasks').put(task);
  }
  await tx.done;
}

export async function getCachedTasks() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('tasks');
}

export async function queueStatusUpdate(reportId: string, status: string, fieldNotes: string, imageFile?: File | null) {
  const db = await getDB();
  if (!db) return;

  let imageBase64 = '';
  let imageType = '';

  if (imageFile) {
    // Convert to base64 for storage in IDB
    imageType = imageFile.type;
    const arrayBuffer = await imageFile.arrayBuffer();
    // Use btoa safely
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    imageBase64 = btoa(binary);
  }

  await db.put('syncQueue', {
    reportId,
    status,
    fieldNotes,
    imageBase64,
    imageType,
    queuedAt: Date.now(),
  });

  // Also optimistically update the cached task
  const task = await db.get('tasks', reportId);
  if (task) {
    task.status = status;
    task.field_notes = fieldNotes;
    await db.put('tasks', task);
  }
}

export async function getPendingUpdates() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('syncQueue');
}

export async function clearSyncedUpdate(reportId: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('syncQueue', reportId);
}
