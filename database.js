const CONFIG = {
    DB_NAME: "ACS_DATABASE_PRO_V12_MODULAR",
    DB_VERSION: 1, 
    RUAS: ["RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"]
};

const DB = {
    db: null,
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("municipes")) {
                    const mStore = db.createObjectStore("municipes", { keyPath: "id", autoIncrement: true });
                    mStore.createIndex("cpf", "cpf", { unique: true });
                    mStore.createIndex("nome", "nome", { unique: false });
                    mStore.createIndex("rua", "rua", { unique: false });
                    mStore.createIndex("respId", "respId", { unique: false });
                    mStore.createIndex("gest", "gest", { unique: false });
                }
                if (!db.objectStoreNames.contains("visitas")) {
                    const vStore = db.createObjectStore("visitas", { keyPath: "id", autoIncrement: true });
                    vStore.createIndex("pacienteId", "pacienteId", { unique: false });
                    vStore.createIndex("resolvida", "resolvida", { unique: false });
                }
            };
            request.onsuccess = (e) => { this.db = e.target.result; this.updateCount(); resolve(); };
            request.onerror = () => reject();
        });
    },
    async updateCount() {
        const tx = this.db.transaction("municipes").objectStore("municipes");
        const req = tx.count();
        req.onsuccess = () => {
            const el = document.getElementById('contagem');
            if(el) el.innerText = `POPULAÇÃO LOCAL: ${req.result}`;
        };
    },
    async get(store, id) {
        return new Promise(r => {
            const req = this.db.transaction(store).objectStore(store).get(id);
            req.onsuccess = () => r(req.result);
        });
    },
    async getAll(store) {
        return new Promise(r => {
            const req = this.db.transaction(store).objectStore(store).getAll();
            req.onsuccess = () => r(req.result);
        });
    },
    async getByIndex(store, index, val) {
        return new Promise(r => {
            const req = this.db.transaction(store).objectStore(store).index(index).getAll(val);
            req.onsuccess = () => r(req.result);
        });
    },
    async put(store, data) {
        return new Promise((r, j) => {
            const req = this.db.transaction(store, "readwrite").objectStore(store).put(data);
            req.onsuccess = () => r(req.result);
            req.onerror = () => j(req.error);
        });
    },
    async add(store, data) {
        return new Promise((r, j) => {
            const req = this.db.transaction(store, "readwrite").objectStore(store).add(data);
            req.onsuccess = () => r(req.result);
            req.onerror = () => j(req.error);
        });
    },
    async deleteWithVisits(id) {
        const tx = this.db.transaction(["municipes", "visitas"], "readwrite");
        tx.objectStore("municipes").delete(id);
        const vIndex = tx.objectStore("visitas").index("pacienteId");
        const reqV = vIndex.getAll(id);
        reqV.onsuccess = () => reqV.result.forEach(v => tx.objectStore("visitas").delete(v.id));
        return new Promise(r => tx.oncomplete = () => r());
    }
};