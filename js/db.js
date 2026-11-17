// IndexedDB Storage Engine for Offline-First Operation
const AppDB = (function() {
  const DB_NAME = 'VehicleMonitorDB';
  const DB_VERSION = 1;
  let dbInstance = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('vehicles')) {
          const s = db.createObjectStore('vehicles', { keyPath: 'id' });
          s.createIndex('registrationNumber', 'registrationNumber', { unique: true });
          s.createIndex('isActive', 'isActive', { unique: false });
        }
        if (!db.objectStoreNames.contains('fuel_entries')) {
          const s = db.createObjectStore('fuel_entries', { keyPath: 'id' });
          s.createIndex('vehicleId', 'vehicleId', { unique: false });
          s.createIndex('date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('services')) {
          const s = db.createObjectStore('services', { keyPath: 'id' });
          s.createIndex('vehicleId', 'vehicleId', { unique: false });
          s.createIndex('serviceDate', 'serviceDate', { unique: false });
        }
        if (!db.objectStoreNames.contains('reminders')) {
          const s = db.createObjectStore('reminders', { keyPath: 'id' });
          s.createIndex('vehicleId', 'vehicleId', { unique: false });
        }
        if (!db.objectStoreNames.contains('owner_documents')) {
          const s = db.createObjectStore('owner_documents', { keyPath: 'id' });
          s.createIndex('ownerId', 'ownerId', { unique: false });
        }
        if (!db.objectStoreNames.contains('vehicle_documents')) {
          const s = db.createObjectStore('vehicle_documents', { keyPath: 'id' });
          s.createIndex('vehicleId', 'vehicleId', { unique: false });
        }
        if (!db.objectStoreNames.contains('expenses')) {
          const s = db.createObjectStore('expenses', { keyPath: 'id' });
          s.createIndex('vehicleId', 'vehicleId', { unique: false });
          s.createIndex('expenseDate', 'expenseDate', { unique: false });
        }
        if (!db.objectStoreNames.contains('owner')) {
          db.createObjectStore('owner', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const s = db.createObjectStore('sync_queue', { keyPath: 'id' });
          s.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async function initSeedIfEmpty() {
    // New setup: Starts completely clean and prompts for user name & first car
    return Promise.resolve();
  }

  async function seedDemoData() {
    if (typeof SEED_DATA === 'undefined') return;
    const db = await open();
    const tx = db.transaction([
      'owner', 'owner_documents', 'vehicles', 'fuel_entries',
      'services', 'reminders', 'vehicle_documents', 'expenses'
    ], 'readwrite');

    tx.objectStore('owner').put(SEED_DATA.owner);
    SEED_DATA.ownerDocuments.forEach(d => tx.objectStore('owner_documents').put(d));
    SEED_DATA.vehicles.forEach(v => tx.objectStore('vehicles').put(v));
    SEED_DATA.fuelEntries.forEach(f => tx.objectStore('fuel_entries').put(f));
    SEED_DATA.services.forEach(s => tx.objectStore('services').put(s));
    SEED_DATA.reminders.forEach(r => tx.objectStore('reminders').put(r));
    SEED_DATA.vehicleDocuments.forEach(d => tx.objectStore('vehicle_documents').put(d));
    SEED_DATA.expenses.forEach(e => tx.objectStore('expenses').put(e));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log('Sample demo data seeded!');
        resolve();
      };
      tx.onerror = (e) => reject(e);
    });
  }

  async function getCount(storeName) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(storeName) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getById(storeName, id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getByIndex(storeName, indexName, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const index = tx.objectStore(storeName).index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, item) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(item);
      req.onsuccess = () => resolve(item);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(storeName, id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function clear(storeName) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  return {
    open,
    initSeedIfEmpty,
    seedDemoData,
    getCount,
    getAll,
    getById,
    getByIndex,
    put,
    remove,
    clear
  };
})();

