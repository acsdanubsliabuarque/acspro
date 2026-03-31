// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: DATABASE.JS - MOTOR DE PERSISTENCIA INDEXEDDB V12.2 PRO           //
// 003: // DATA DE ATUALIZACAO: 24/05/2024                                            //
// 004: // DESENVOLVEDOR: ARQUITETO DE SOFTWARE / ACS SENIOR                          //
// 005: ////////////////////////////////////////////////////////////////////////////////
// 006: 
// 007: // DEFINICAO GLOBAL DE CONFIGURACAO E LOGRADOUROS OFICIAIS DE OSASCO
// 008: window.CONFIG_DB = {
// 009:     DB_NAME: "ACS_DATABASE_PRO_V12_MODULAR",
// 010:     DB_VERSION: 2, 
// 011:     RUAS: [
// 012:         "RUA DA MINÁ", "VIELA DA RUA DA MINA", "RUA APÓSTOLO JOÃO BATISTA", 
// 013:         "RUA SACERDOTE MELQUISEDEQUE", "RUA APÓSTOLO MATEUS", "RUA MÁRIO TORRES", 
// 014:         "RUA APÓSTOLO PEDRO", "RUA APÓSTOLO FELIPE", "RUA VIRGINIA JOANA DA SILVA", 
// 015:         "RUA JOSÉ LUIZ DE JESUS SANTOS", "VIELA UTINGA", "AVENIDA DOS TRABALHADORES"
// 016:     ]
// 017: };
// 018: 
// 019: // OBJETO MESTRE DE GERENCIAMENTO DE DADOS - ACESSIVEL VIA window.DB
// 020: window.DB = {
// 021:     instance: null,
// 022: 
// 023:     // 024: METODO DE INICIALIZACAO COM TRATAMENTO DE ATUALIZACAO DE ESQUEMA (UPGRADE)
// 025:     async init() {
// 026:         return new Promise((resolve, reject) => {
// 027:             const request = indexedDB.open(window.CONFIG_DB.DB_NAME, window.CONFIG_DB.DB_VERSION);
// 028: 
// 029:             request.onupgradeneeded = (e) => {
// 030:                 const db = e.target.result;
// 031:                 
// 032:                 // 033: TABELA DE MUNICIPES: ARMAZENA CADASTROS INDIVIDUAIS E DOMICILIARES
// 034:                 if (!db.objectStoreNames.contains("municipes")) {
// 035:                     const mStore = db.createObjectStore("municipes", { keyPath: "id", autoIncrement: true });
// 036:                     mStore.createIndex("cpf", "cpf", { unique: false });
// 037:                     mStore.createIndex("nome", "nome", { unique: false });
// 038:                     mStore.createIndex("rua", "rua", { unique: false });
// 039:                     mStore.createIndex("respId", "respId", { unique: false });
// 040:                     mStore.createIndex("gest", "gest", { unique: false });
// 041:                     mStore.createIndex("idoso", "idoso", { unique: false });
// 042:                     mStore.createIndex("saudeMental", "saudeMental", { unique: false });
// 043:                     // 044: INDICE DE CHAVE COMPOSTA PARA LOCALIZACAO PRECISA DE MORADORES
// 045:                     mStore.createIndex("enderecoChave", ["rua", "num", "comp"], { unique: false });
// 046:                 }
// 047: 
// 048:                 // 049: TABELA DE VISITAS: ARMAZENA REGISTROS SISAB E PENDENCIAS
// 050:                 if (!db.objectStoreNames.contains("visitas")) {
// 051:                     const vStore = db.createObjectStore("visitas", { keyPath: "id", autoIncrement: true });
// 052:                     vStore.createIndex("pacienteId", "pacienteId", { unique: false });
// 053:                     vStore.createIndex("resolvida", "resolvida", { unique: false });
// 054:                     vStore.createIndex("dataTS", "dataTS", { unique: false });
// 055:                 }
// 056: 
// 057:                 // 058: TABELA DE ARQUIVO MORTO DE PENDENCIAS (LOG DE AUDITORIA)
// 059:                 if (!db.objectStoreNames.contains("arquivo_pendencias")) {
// 060:                     const aStore = db.createObjectStore("arquivo_pendencias", { keyPath: "id", autoIncrement: true });
// 061:                     aStore.createIndex("visitaId", "visitaId", { unique: true });
// 062:                     aStore.createIndex("pacienteId", "pacienteId", { unique: false });
// 063:                 }
// 064:             };
// 065: 
// 066:             request.onsuccess = (e) => { 
// 067:                 this.instance = e.target.result; 
// 068:                 this.updateCount(); 
// 069:                 console.log("DB INICIALIZADO.");
// 070:                 resolve(); 
// 071:             };
// 072: 
// 073:             request.onerror = (e) => reject(e.target.error);
// 074:         });
// 075:     },
// 076: 
// 077:     // 078: ATUALIZACAO DO CONTADOR DE POPULACAO NA INTERFACE
// 079:     async updateCount() {
// 080:         if (!this.instance) return;
// 081:         const tx = this.instance.transaction("municipes", "readonly").objectStore("municipes");
// 082:         const req = tx.count();
// 083:         req.onsuccess = () => {
// 084:             const el = document.getElementById('contagem');
// 085:             if(el) el.innerText = `POPULAÇÃO TOTAL DO SETOR: ${req.result} CIDADÃOS`;
// 086:         };
// 087:     },
// 088: 
// 089:     // 090: RECUPERA REGISTRO PELO ID (FORCANDO INTEIRO)
// 091:     async get(store, id) {
// 092:         return new Promise((r) => {
// 093:             const tx = this.instance.transaction(store, "readonly");
// 094:             const req = tx.objectStore(store).get(Number(id));
// 095:             req.onsuccess = () => r(req.result);
// 096:             req.onerror = () => r(null);
// 097:         });
// 098:     },
// 099: 
// 100:     // 101: RECUPERA TODOS OS REGISTROS DE UMA STORE
// 102:     async getAll(store) {
// 103:         return new Promise((r) => {
// 104:             const tx = this.instance.transaction(store, "readonly");
// 105:             const req = tx.objectStore(store).getAll();
// 106:             req.onsuccess = () => r(req.result);
// 107:         });
// 108:     },
// 109: 
// 110:     // 111: BUSCA POR INDICE E VALOR ESPECIFICO
// 112:     async getByIndex(store, indexName, value) {
// 113:         return new Promise((r) => {
// 114:             const tx = this.instance.transaction(store, "readonly");
// 115:             const idx = tx.objectStore(store).index(indexName);
// 116:             const req = idx.getAll(value);
// 117:             req.onsuccess = () => r(req.result);
// 118:         });
// 119:     },
// 120: 
// 121:     // 122: SALVA OU ATUALIZA REGISTROS (COM PROTECAO DE MAIUSCULAS)
// 123:     async put(store, data) {
// 124:         return new Promise((resolve, reject) => {
// 125:             const tx = this.instance.transaction(store, "readwrite");
// 126:             const req = tx.objectStore(store).put(data);
// 127:             req.onsuccess = () => { if(store === "municipes") this.updateCount(); resolve(req.result); };
// 128:             req.onerror = () => reject(req.error);
// 129:         });
// 130:     },
// 131: 
// 132:     // 133: LOCALIZA COMPLEMENTOS EXISTENTES PARA EVITAR CONFLITO DE ENDERECO
// 134:     async findAddressComplements(rua, num) {
// 135:         const all = await this.getByIndex("municipes", "rua", rua || "");
// 136:         const filtrado = all.filter(p => p.num === num);
// 137:         const comps = [...new Set(filtrado.map(p => p.comp || "CASA ÚNICA"))];
// 138:         return comps;
// 139:     },
// 140: 
// 141:     // 142: EXCLUSAO FISICA DE REGISTROS (CUIDADO)
// 143:     async delete(store, id) {
// 144:         return new Promise((resolve) => {
// 145:             const tx = this.instance.transaction(store, "readwrite");
// 146:             tx.objectStore(store).delete(Number(id));
// 147:             tx.oncomplete = () => { if(store === "municipes") this.updateCount(); resolve(true); };
// 148:         });
// 149:     }
// 150: };
