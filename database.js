/* ==========================================================================
   001: ARQUITETURA DE DADOS (INDEXEDDB V2) - ACS PRO V12.2 OSASCO
   DOCUMENTAÇÃO: MOTOR DE PERSISTÊNCIA OFFLINE-FIRST COMPATÍVEL COM SISAB/E-SUS
   ESTE ARQUIVO GERENCIA A INTEGRIDADE DE TODOS OS CAMPOS DAS FICHAS OFICIAIS
   ========================================================================== */

/* 002: CONFIGURACOES GLOBAIS E TERRITORIAIS */
window.CONFIG_DB = {
    DB_NAME: "ACS_DATABASE_PRO_V12_OSASCO_SISAB_EDITION",
    DB_VERSION: 5, // INCREMENTADO PARA SUPORTAR A NOVA DENSIDADE DE CAMPOS E-SUS
    STORES: {
        MUNICIPES: "municipes", // CADASTRO INDIVIDUAL + DOMICILIAR INTEGRADO
        VISITAS: "visitas",     // FICHA DE VISITA DOMICILIAR
        ARQUIVO: "arquivo_pendencias" // AUDITORIA DE PENDENCIAS RESOLVIDAS
    },
    /* 003: LISTA DE LOGRADOUROS OFICIAIS DO TERRITÓRIO (OSASCO) */
    RUAS: [
        "RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", 
        "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", 
        "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", 
        "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"
    ]
};

/* 004: OBJETO GLOBAL DB - VINCULADO AO WINDOW PARA INTEROPERABILIDADE TOTAL */
window.DB = {
    instance: null,

    /* 005: MOTOR DE INICIALIZACAO E SCHEMA COMPATÍVEL COM e-SUS APS */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG_DB.DB_NAME, CONFIG_DB.DB_VERSION);

            /* 006: LOGICA DE UPGRADE - CRIACAO DE STORES E INDICES SISAB */
            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                /* 007: STORE MUNICIPES - ESTRUTURA PARA DADOS INDIVIDUAIS E TERRITORIAIS */
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.MUNICIPES)) {
                    const mStore = db.createObjectStore(CONFIG_DB.STORES.MUNICIPES, { keyPath: "id", autoIncrement: true });
                    
                    // 008: INDICES DE IDENTIFICAÇÃO E BUSCA (CADASTRO INDIVIDUAL)
                    mStore.createIndex("idx_nome", "nome", { unique: false });
                    mStore.createIndex("idx_cpf", "cpf", { unique: false });
                    mStore.createIndex("idx_cns", "cns", { unique: false });
                    mStore.createIndex("idx_nasc", "nasc", { unique: false });
                    
                    // 009: INDICES TERRITORIAIS E FAMILIARES (CADASTRO DOMICILIAR)
                    mStore.createIndex("idx_rua", "rua", { unique: false });
                    mStore.createIndex("idx_num", "num", { unique: false });
                    mStore.createIndex("idx_respId", "respId", { unique: false });
                    mStore.createIndex("idx_endereco_chave", ["rua", "num", "comp"], { unique: false });
                    
                    // 010: INDICES EPIDEMIOLOGICOS (OS 19 AGRAVOS + MONITORAMENTOS)
                    mStore.createIndex("idx_hiper", "hiper", { unique: false });
                    mStore.createIndex("idx_diab", "diab", { unique: false });
                    mStore.createIndex("idx_gest", "gest", { unique: false });
                    mStore.createIndex("idx_mental", "saudeMental", { unique: false });
                    mStore.createIndex("idx_idoso", "idoso", { unique: false });
                    mStore.createIndex("idx_acamado", "acamado", { unique: false });
                    mStore.createIndex("idx_tuberculose", "tuberculose", { unique: false });
                    mStore.createIndex("idx_hanseniase", "hanseniase", { unique: false });
                }

                /* 011: STORE VISITAS - REGISTRO DE CAMPO (FICHA DE VISITA SISAB) */
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.VISITAS)) {
                    const vStore = db.createObjectStore(CONFIG_DB.STORES.VISITAS, { keyPath: "id", autoIncrement: true });
                    vStore.createIndex("idx_pacienteId", "pacienteId", { unique: false });
                    vStore.createIndex("idx_dataTS", "dataTS", { unique: false });
                    vStore.createIndex("idx_desfecho", "desfechoVisita", { unique: false });
                }

                /* 012: STORE ARQUIVO_PENDENCIAS - LOG DE AUDITORIA (DIRETRIZ 8) */
                if (!db.objectStoreNames.contains(CONFIG_DB.STORES.ARQUIVO)) {
                    const aStore = db.createObjectStore(CONFIG_DB.STORES.ARQUIVO, { keyPath: "id", autoIncrement: true });
                    aStore.createIndex("idx_visitaId", "visitaId", { unique: true });
                }
            };

            /* 013: EVENTOS DE SUCESSO E ERRO NA CONEXAO */
            request.onsuccess = (e) => {
                this.instance = e.target.result;
                this.updateCount();
                console.log("DB ACS PRO V12.2 OSASCO: AMBIENTE TÉCNICO INICIALIZADO.");
                resolve();
            };

            request.onerror = (e) => {
                console.error("DB ACS PRO V12.2: ERRO CRÍTICO NO INDEXEDDB.", e.target.error);
                reject(e.target.error);
            };
        });
    },

    /* 014: METODO PUT - SALVAMENTO COM NORMALIZAÇÃO INTEGRAL (DIRETRIZ 2) */
    async put(store, data) {
        return new Promise((resolve, reject) => {
            
            /* 015: SE FOR CADASTRO (MUNÍCIPE), APLICA NORMALIZAÇÃO e-SUS COMPLETA */
            if (store === CONFIG_DB.STORES.MUNICIPES) {
                data = this.normalizeFullEsusData(data);
            }

            const transaction = this.instance.transaction(store, "readwrite");
            const objectStore = transaction.objectStore(store);
            const request = objectStore.put(data);

            request.onsuccess = () => {
                if (store === CONFIG_DB.STORES.MUNICIPES) this.updateCount();
                resolve(request.result);
            };

            request.onerror = (e) => {
                console.error(`ERRO AO GRAVAR NA STORE ${store}:`, e.target.error);
                reject(request.error);
            };
        });
    },

    /* 016: NORMALIZADOR e-SUS/SISAB (DENSIDADE TOTAL DE CAMPOS) */
    /* ESTA FUNCAO GARANTE QUE BACKUPS ANTIGOS SEJAM RE-INDEXADOS COM TODAS AS VARIAVEIS */
    normalizeFullEsusData(p) {
        // 017: IDENTIFICAÇÃO INDIVIDUAL (FICHA INDIVIDUAL)
        p.nome = (p.nome || "").toUpperCase().trim();
        p.nomeSocial = (p.nomeSocial || "").toUpperCase().trim();
        p.nasc = p.nasc || "";
        p.sexo = p.sexo || "MASCULINO";
        p.raca = p.raca || "PARDA";
        p.etnia = (p.etnia || "").toUpperCase().trim();
        p.cpf = p.cpf || "";
        p.cns = p.cns || "";
        p.nomeMae = (p.nomeMae || "").toUpperCase().trim();
        p.nomePai = (p.nomePai || "").toUpperCase().trim();
        p.tel = p.tel || "";
        p.nacionalidade = p.nacionalidade || "BRASILEIRA";
        p.orientacaoSexual = p.orientacaoSexual || "NÃO INFORMADO";
        p.identidadeGenero = p.identidadeGenero || "NÃO INFORMADO";
        p.escolaridade = p.escolaridade || "NÃO INFORMADO";
        p.situacaoTrabalho = p.situacaoTrabalho || "NÃO INFORMADO";

        // 018: CONDIÇÕES SOCIOECONÔMICAS E SAÚDE (AGRAVOS SISAB)
        p.hiper = !!p.hiper;
        p.diab = !!p.diab;
        p.gest = !!p.gest;
        p.dum = p.dum || "";
        p.saudeMental = !!p.saudeMental;
        p.idoso = !!p.idoso;
        p.acamado = !!p.acamado;
        p.deficiencia = !!p.deficiencia;
        p.fumante = !!p.fumante;
        p.usoAlcool = !!p.usoAlcool;
        p.usoDrogas = !!p.usoDrogas;
        p.avc = !!p.avc;
        p.infarto = !!p.infarto;
        p.doencaRespiratoria = !!p.doencaRespiratoria;
        p.doencaRenal = !!p.doencaRenal;
        p.cancer = !!p.cancer;
        p.hanseniase = !!p.hanseniase;
        p.tuberculose = !!p.tuberculose;
        p.internacaoRecente = !!p.internacaoRecente;
        p.puerperio = !!p.puerperio;
        p.obs = (p.obs || "").toUpperCase().trim();

        // 019: CONDIÇÕES DE MORADIA (CADASTRO DOMICILIAR)
        p.rua = (p.rua || "").toUpperCase().trim();
        p.num = (p.num || "").toUpperCase().trim();
        p.comp = (p.comp || "CASA ÚNICA").toUpperCase().trim();
        p.isResp = p.isResp === "SIM" || p.isResp === true ? "SIM" : "NAO";
        p.relacao = p.relacao || "NÃO INFORMADO";
        p.respId = p.respId || null;
        
        p.tipoImovel = p.tipoImovel || "CASA";
        p.abastecimentoAgua = p.abastecimentoAgua || "REDE ENCANADA";
        p.escoamentoSanitario = p.escoamentoSanitario || "REDE COLETORA";
        p.destinoLixo = p.destinoLixo || "COLETA REGULAR";
        p.materialParedes = p.materialParedes || "TIJOLO/ALVENARIA";
        p.presencaAnimais = !!p.presencaAnimais;

        return p;
    },

    /* 020: RECUPERACAO DE REGISTRO UNICO */
    async get(store, id) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve(null);
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).get(Number(id));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    },

    /* 021: RECUPERACAO DE TODOS OS REGISTROS */
    async getAll(store) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve([]);
            const tx = this.instance.transaction(store, "readonly");
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    /* 022: BUSCA POR INDICE ESPECÍFICO (PARA FAMÍLIA E EPIDEMIOLOGIA) */
    async getByIndex(store, indexName, value) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve([]);
            const tx = this.instance.transaction(store, "readonly");
            const index = tx.objectStore(store).index(indexName);
            const req = index.getAll(value);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    },

    /* 023: METODO DE BUSCA POR ENDEREÇO (RUA + NÚMERO) - PROTOCOLO OSASCO */
    async findAddressComplements(rua, num) {
        return new Promise((resolve) => {
            const tx = this.instance.transaction(CONFIG_DB.STORES.MUNICIPES, "readonly");
            const index = tx.objectStore(CONFIG_DB.STORES.MUNICIPES).index("idx_endereco_chave");
            const range = IDBKeyRange.bound([rua, num, ""], [rua, num, "\uffff"]);
            const req = index.getAll(range);
            req.onsuccess = () => {
                const complements = [...new Set(req.result.map(p => p.comp))];
                resolve(complements);
            };
            req.onerror = () => resolve([]);
        });
    },

    /* 024: EXCLUSAO FISICA DE REGISTRO */
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

    /* 025: ATUALIZACAO DO CONTADOR DE POPULACAO NO CABECALHO */
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
