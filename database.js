/**
 * 001: MOTOR DE DADOS PERMANENTE (INDEXEDDB)
 * SISTEMA: ACS PRO V12.2 - OSASCO FIELD SYSTEM
 * 
 * Este arquivo é o alicerce do sistema. Ele gerencia a persistência local,
 * garantindo que os dados não sejam perdidos mesmo sem internet.
 */

const CONFIG_DB = {
    DB_NAME: "ACS_DATABASE_PRO_V12_OSASCO",
    DB_VERSION: 3, // Versão incrementada para suportar novos índices de família
    STORES: {
        MUNICIPES: "municipes",
        VISITAS: "visitas",
        ARQUIVO: "arquivo_pendencias"
    },
    // Lista oficial de logradouros para padronização de busca
    RUAS: [
        "RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", 
        "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", 
        "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", 
        "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"
    ]
};

window.DB = {
    instance: null,

    /**
     * Inicializa o banco de dados e cria as tabelas (Object Stores) se necessário.
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG_DB.DB_NAME, CONFIG_DB.DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // --- STORE: MUNICIPES (CIDADÃOS E FAMÍLIAS) ---
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.MUNICIPES)) {
                    const mStore = db.createObjectStore(CONFIG_DB.STORES.MUNICIPES, { keyPath: "id", autoIncrement: true });
                    
                    // Índices de Busca Individual
                    mStore.createIndex("cpf", "cpf", { unique: false });
                    mStore.createIndex("nome", "nome", { unique: false });
                    mStore.createIndex("rua", "rua", { unique: false });
                    
                    // Índice de Vínculo Familiar (Fundamental para ver dependentes)
                    mStore.createIndex("respId", "respId", { unique: false });
                    
                    // Índice de Agravos (Filtros de Saúde)
                    mStore.createIndex("gest", "gest", { unique: false });
                    mStore.createIndex("idoso", "idoso", { unique: false });
                    mStore.createIndex("saudeMental", "saudeMental", { unique: false });

                    // Índice Composto: Evita duplicidade de núcleos no mesmo endereço
                    mStore.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
                } else {
                    // Atualização de índices para bases já existentes
                    const tx = e.currentTarget.transaction;
                    const mStore = tx.objectStore(CONFIG_DB.STORES.MUNICIPES);
                    if (!mStore.indexNames.contains("respId")) mStore.createIndex("respId", "respId", { unique: false });
                    if (!mStore.indexNames.contains("enderecoChave")) mStore.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
                }

                // --- STORE: VISITAS (REGISTROS DIÁRIOS) ---
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.VISITAS)) {
                    const vStore = db.createObjectStore(CONFIG_DB.STORES.VISITAS, { keyPath: "id", autoIncrement: true });
                    vStore.createIndex("pacienteId", "pacienteId", { unique: false });
                    vStore.createIndex("resolvida", "resolvida", { unique: false });
                    vStore.createIndex("dataTS", "dataTS", { unique: false });
                }

                // --- STORE: ARQUIVO MORTO (HISTÓRICO DE PENDÊNCIAS) ---
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.ARQUIVO)) {
                    const aStore = db.createObjectStore(CONFIG_DB.STORES.ARQUIVO, { keyPath: "id", autoIncrement: true });
                    aStore.createIndex("visitaId", "visitaId", { unique: true });
                    aStore.createIndex("pacienteId", "pacienteId", { unique: false });
                }
            };

            request.onsuccess = (e) => {
                this.instance = e.target.result;
                console.log("DATABASE: Conectado e pronto.");
                this.updateCount();
                resolve();
            };

            request.onerror = (e) => {
                console.error("DATABASE: Erro ao abrir banco:", e.target.error);
                reject(e.target.error);
            };
        });
    },

    /**
     * Retorna um registro único pelo ID numérico
     */
    async get(store, id) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).get(Number(id));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    },

    /**
     * Retorna todos os registros de uma store
     */
    async getAll(store) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    /**
     * Busca registros baseado em um índice específico (Ex: buscar dependentes pelo ID do Responsável)
     */
    async getByIndex(store, indexName, value) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const index = tx.objectStore(store).index(indexName);
            const req = index.getAll(value);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    /**
     * Insere ou Atualiza dados com sanitização automática
     */
    async put(store, data) {
        return new Promise((resolve, reject) => {
            // Prevenção de erros: Garante que strings fiquem em MAIÚSCULAS e remove espaços extras
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string' && !['dataTS', 'dataBR'].includes(key)) {
                    data[key] = data[key] ? data[key].toUpperCase().trim() : "";
                }
            });

            const tx = this.instance.transaction(store, "readwrite");
            const req = tx.objectStore(store).put(data);

            req.onsuccess = () => {
                if (store === CONFIG_DB.STORES.MUNICIPES) this.updateCount();
                resolve(req.result);
            };

            req.onerror = (e) => {
                console.error(`DATABASE Erro ao salvar em ${store}:`, e.target.error);
                reject(e.target.error);
            };
        });
    },

    /**
     * Busca complementos de endereços existentes para evitar conflitos de famílias
     */
    async findAddressComplements(rua, num) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(CONFIG_DB.STORES.MUNICIPES, "readonly");
            const index = tx.objectStore(CONFIG_DB.STORES.MUNICIPES).index("enderecoChave");
            
            // Busca simplificada pelo prefixo do endereço no índice composto
            const range = IDBKeyRange.bound([rua, num, ""], [rua, num, "\uffff"]);
            const req = index.getAll(range);

            req.onsuccess = () => {
                const results = req.result;
                // Extrai complementos únicos (Ex: "CASA 1", "FUNDOS")
                const comps = [...new Set(results.map(p => p.comp || "CASA ÚNICA"))];
                resolve(comps);
            };
            req.onerror = () => resolve([]);
        });
    },

    /**
     * Remove um registro fisicamente do banco
     */
    async delete(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(store, "readwrite");
            const req = tx.objectStore(store).delete(Number(id));
            req.onsuccess = () => {
                if (store === CONFIG_DB.STORES.MUNICIPES) this.updateCount();
                resolve(true);
            };
            req.onerror = () => reject(false);
        });
    },

    /**
     * Atualiza o contador de população no cabeçalho do sistema
     */
    async updateCount() {
        if (!this.instance) return;
        const tx = this.instance.transaction(CONFIG_DB.STORES.MUNICIPES, "readonly");
        const req = tx.objectStore(CONFIG_DB.STORES.MUNICIPES).count();
        req.onsuccess = () => {
            const el = document.getElementById('contagem');
            if (el) el.innerText = `POPULAÇÃO LOCAL TOTAL: ${req.result} CIDADÃOS`;
        };
    }
};
