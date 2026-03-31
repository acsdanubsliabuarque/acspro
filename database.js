// 001: DEFINICAO DA ESTRUTURA DE DADOS E CONFIGURACOES DE VERSAO
// 002: A VERSAO 2 INTRODUZ O ARQUIVO DE PENDENCIAS E INDICES SOCIAIS (IDOSO/SAUDE MENTAL)
const CONFIG_DB = {
    DB_NAME: "ACS_DATABASE_PRO_V12_MODULAR",
    DB_VERSION: 2, 
    // 003: LISTA DE LOGRADOUROS OFICIAIS PARA OSASCO - MANTIDA PARA COMPATIBILIDADE
    RUAS: [
        "RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", 
        "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", 
        "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", 
        "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"
    ]
};

// 004: MOTOR DE GERENCIAMENTO DE DADOS (INDEXEDDB)
const DB = {
    instance: null,

    // 005: METODO DE INICIALIZACAO COM TRATAMENTO DE ATUALIZACAO DE ESQUEMA
    async init() {
        return new Promise((resolve, reject) => {
            // 006: ABERTURA DO BANCO DE DADOS INDEXEDDB
            const request = indexedDB.open(CONFIG_DB.DB_NAME, CONFIG_DB.DB_VERSION);

            // 007: LOGICA DE ATUALIZACAO E CRIACAO DE TABELAS (UPGRADE)
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                // 008: STORE DE MUNICIPES: ARMAZENA CADASTROS INDIVIDUAIS E DOMICILIARES
                if (!db.objectStoreNames.contains("municipes")) {
                    const mStore = db.createObjectStore("municipes", { keyPath: "id", autoIncrement: true });
                    // 009: INDICES DE IDENTIFICACAO E BUSCA
                    mStore.createIndex("cpf", "cpf", { unique: false });
                    mStore.createIndex("nome", "nome", { unique: false });
                    mStore.createIndex("rua", "rua", { unique: false });
                    mStore.createIndex("respId", "respId", { unique: false });
                    
                    // 010: NOVOS INDICES PARA O SISTEMA V12.2 (SAUDE E ALERTAS)
                    mStore.createIndex("gest", "gest", { unique: false });
                    mStore.createIndex("idoso", "idoso", { unique: false });
                    mStore.createIndex("saudeMental", "saudeMental", { unique: false });
                    
                    // 011: INDICE DE CHAVE COMPOSTA PARA ENDERECO (RUA + NUMERO + COMPLEMENTO)
                    // 012: ESSENCIAL PARA EVITAR CONFLITOS DE NUCLEOS FAMILIARES
                    mStore.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
                } else {
                    // 013: SE A STORE JA EXISTIR, ADICIONA OS NOVOS INDICES NECESSARIOS NA V2
                    const tx = e.currentTarget.transaction;
                    const mStore = tx.objectStore("municipes");
                    if (!mStore.indexNames.contains("idoso")) mStore.createIndex("idoso", "idoso", { unique: false });
                    if (!mStore.indexNames.contains("saudeMental")) mStore.createIndex("saudeMental", "saudeMental", { unique: false });
                    if (!mStore.indexNames.contains("enderecoChave")) mStore.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
                }

                // 014: STORE DE VISITAS: ARMAZENA REGISTROS DIARIOS E PENDENCIAS ATIVAS
                if (!db.objectStoreNames.contains("visitas")) {
                    const vStore = db.createObjectStore("visitas", { keyPath: "id", autoIncrement: true });
                    vStore.createIndex("pacienteId", "pacienteId", { unique: false });
                    vStore.createIndex("resolvida", "resolvida", { unique: false });
                    vStore.createIndex("dataTS", "dataTS", { unique: false });
                }

                // 015: NOVA STORE: ARQUIVO_PENDENCIAS (PARA HISTORICO E REVERSAO)
                // 016: ARMAZENA LOGS DE O QUE FOI FEITO E PERMITE VOLTAR STATUS DE RESOLVIDO
                if (!db.objectStoreNames.contains("arquivo_pendencias")) {
                    const aStore = db.createObjectStore("arquivo_pendencias", { keyPath: "id", autoIncrement: true });
                    aStore.createIndex("visitaId", "visitaId", { unique: true });
                    aStore.createIndex("pacienteId", "pacienteId", { unique: false });
                    aStore.createIndex("dataArquivamento", "dataArquivamento", { unique: false });
                }
            };

            // 017: EVENTO DE SUCESSO AO CONECTAR
            request.onsuccess = (e) => { 
                this.instance = e.target.result; 
                this.updateCount(); 
                console.log("BASE DE DADOS ACS PRO V12.2 INICIALIZADA COM SUCESSO.");
                resolve(); 
            };

            // 018: EVENTO DE ERRO CRITICO
            request.onerror = (e) => {
                console.error("ERRO CRITICO NO BANCO DE DADOS:", e.target.error);
                reject(e.target.error);
            };
        });
    },

    // 019: ATUALIZACAO DINAMICA DA POPULACAO NO HEADER
    async updateCount() {
        if (!this.instance) return;
        const tx = this.instance.transaction("municipes", "readonly").objectStore("municipes");
        const req = tx.count();
        req.onsuccess = () => {
            const el = document.getElementById('contagem');
            if(el) el.innerText = `POPULAÇÃO LOCAL TOTAL: ${req.result} CIDADÃOS`;
        };
    },

    // 020: RECUPERACAO DE REGISTRO UNICO POR ID
    async get(store, id) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).get(Number(id));
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    },

    // 021: RECUPERACAO DE TODOS OS REGISTROS DE UMA TABELA
    async getAll(store) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
    },

    // 022: BUSCA POR INDICE (EX: BUSCAR PENDENCIAS RESOLVIDAS)
    async getByIndex(store, indexName, value) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(store, "readonly");
            const index = tx.objectStore(store).index(indexName);
            const req = index.getAll(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve([]);
        });
    },

    // 023: ADICAO OU ATUALIZACAO DE REGISTRO (PUT)
    // 024: GARANTE QUE OBJETOS SEJAM SALVOS COM INTEGRIDADE
    async put(store, data) {
        return new Promise((resolve, reject) => {
            // 025: TRATAMENTO DE DADOS - GARANTIR QUE TEXTOS ESTEJAM EM MAIUSCULAS ANTES DE SALVAR
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string' && key !== 'dataTS' && key !== 'dataArquivamento') {
                    data[key] = data[key].toUpperCase().trim();
                }
            });

            const tx = this.instance.transaction(store, "readwrite");
            const req = tx.objectStore(store).put(data);
            req.onsuccess = () => {
                if (store === "municipes") this.updateCount();
                resolve(req.result);
            };
            req.onerror = () => reject(req.error);
        });
    },

    // 026: BUSCA DE CONFLITO DE NUCLEO FAMILIAR (RUA + NUMERO + COMPLEMENTO)
    // 027: ESTE METODO IMPLEMENTA A LOGICA SOLICITADA PARA OSASCO
    async findAddressComplements(rua, num) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction("municipes", "readonly");
            const index = tx.objectStore("municipes").index("rua"); // 028: Busca inicial por rua
            const req = index.getAll(rua);
            req.onsuccess = () => {
                // 029: Filtra no resultado apenas o numero solicitado para listar complementos
                const results = req.result.filter(p => p.num === num);
                const complements = [...new Set(results.map(p => p.comp || "CASA ÚNICA"))];
                resolve(complements);
            };
            req.onerror = () => resolve([]);
        });
    },

    // 030: EXCLUSAO FISICA DE REGISTROS (CUIDADO!)
    async delete(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.instance.transaction(store, "readwrite");
            const req = tx.objectStore(store).delete(Number(id));
            tx.oncomplete = () => {
                if (store === "municipes") this.updateCount();
                resolve(true);
            };
            tx.onerror = () => reject(tx.error);
        });
    }
};

// 031: ALERTA DE ANALISTA SENIOR:
// 032: O INDICE 'enderecoChave' USADO NA LINHA 011 EH UM ARRAY INDEX.
// 033: ISSO PERMITE BUSCAS PRECISAS, MAS EXIGE QUE OS CAMPOS RUA, NUM E COMP SEMPRE EXISTAM.
// 034: CASO O COMPLEMENTO SEJA VAZIO, SALVAREMOS COMO "CASA UNICA".
