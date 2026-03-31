/* 001: DEFINICAO DO MOTOR DE DADOS INDEXEDDB V2 */
const CONFIG_DB = {
    DB_NAME: "ACS_DATABASE_PRO_V12_OSASCO",
    DB_VERSION: 4,
    STORES: { MUNICIPES: "municipes", VISITAS: "visitas", ARQUIVO: "arquivo_pendencias" },
    /* 002: LISTA OFICIAL DE LOGRADOUROS DE OSASCO */
    RUAS: [
        "RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", 
        "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", 
        "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", 
        "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"
    ]
};

window.DB = {
    instance: null,

    /* 003: INICIALIZACAO COM CRIACAO DE INDICES COMPOSTOS */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG_DB.DB_NAME, CONFIG_DB.DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                /* 004: STORE DE MUNICIPES - LOGICA HABITACIONAL */
                if (!db.objectStoreNames.contains("municipes")) {
                    const m = db.createObjectStore("municipes", { keyPath: "id", autoIncrement: true });
                    m.createIndex("rua", "rua", { unique: false });
                    m.createIndex("respId", "respId", { unique: false });
                    m.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
                }
                /* 005: STORE DE VISITAS - LOGICA EPIDEMIOLOGICA */
                if (!db.objectStoreNames.contains("visitas")) {
                    const v = db.createObjectStore("visitas", { keyPath: "id", autoIncrement: true });
                    v.createIndex("pacienteId", "pacienteId", { unique: false });
                }
                /* 006: STORE DE ARQUIVO MORTO - LOGICA DE AUDITORIA */
                if (!db.objectStoreNames.contains("arquivo_pendencias")) {
                    db.createObjectStore("arquivo_pendencias", { keyPath: "id", autoIncrement: true });
                }
            };
            request.onsuccess = (e) => { this.instance = e.target.result; this.updateCount(); resolve(); };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    /* 007: METODOS GLOBAIS DE MANIPULACAO DE DADOS */
    async put(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(store, "readwrite");
            const req = tx.objectStore(store).put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async get(store, id) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).get(Number(id));
            req.onsuccess = () => resolve(req.result);
        });
    },

    async getAll(store) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result);
        });
    },

    async getByIndex(store, index, value) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).index(index).getAll(value);
            req.onsuccess = () => resolve(req.result);
        });
    },

    async updateCount() {
        const tx = this.instance.transaction("municipes", "readonly");
        const req = tx.objectStore("municipes").count();
        req.onsuccess = () => {
            const el = document.getElementById('contagem');
            if (el) el.innerText = `POPULAÇÃO LOCAL TOTAL: ${req.result} CIDADÃOS`;
        };
    }
};
