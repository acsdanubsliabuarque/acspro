// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: REGISTRY.JS - MOTOR DE CADASTRAMENTO E VINCULOS RESIDENCIAIS      //
// 003: // VERSÃO DEFINITIVA V12.2 - PROTOCOLO OSASCO E E-SUS COMPLETO               //
// 004: ////////////////////////////////////////////////////////////////////////////////
// 005: 
// 006: window.Registry = {
// 007: 
// 008:     // 009: CONTROLE DE NAVEGAÇÃO ENTRE ETAPAS DO FORMULÁRIO (ABAS/PASSOS)
// 010:     setStep(n) {
// 011:         document.querySelectorAll('[id^="passo-"]').forEach(div => div.classList.add('hidden'));
// 012:         const proximoPasso = document.getElementById(`passo-${n}`);
// 013:         if(proximoPasso) proximoPasso.classList.remove('hidden');
// 014:         window.scrollTo(0, 0);
// 015:     },
// 016: 
// 017:     // 018: EXIBE OU OCULTA O CAMPO DUM CONFORME STATUS DE GESTAÇÃO
// 019:     toggleDum() {
// 020:         const isGest = document.getElementById('ch-gest').checked;
// 021:         document.getElementById('div-gestante').classList.toggle('hidden', !isGest);
// 022:     },
// 023: 
// 024:     // 025: EXIBE OU OCULTA O CAMPO DE PARENTESCO CASO NÃO SEJA O RESPONSÁVEL
// 026:     toggleRelacao() {
// 027:         const statusResp = document.getElementById('c-is-resp').value;
// 028:         document.getElementById('div-parentesco').classList.toggle('hidden', statusResp === 'SIM');
// 029:     },
// 030: 
// 031:     // 032: VALIDADOR DE CONFLITO DE ENDEREÇO (EVITA CADASTROS EM CASAS ERRADAS)
// 033:     // 034: IMPLEMENTA A LÓGICA DE DETECÇÃO DE COMPLEMENTOS EXISTENTES EM OSASCO
// 035:     async checkAddressConflict() {
// 036:         const ruaSelecionada = document.getElementById('c-rua').value;
// 037:         const numeroDigitado = document.getElementById('c-num').value.trim();
// 038:         const inputComplemento = document.getElementById('c-comp');
// 039: 
// 040:         if (ruaSelecionada && numeroDigitado) {
// 041:             const listaComps = await window.DB.findAddressComplements(ruaSelecionada, numeroDigitado);
// 042:             
// 043:             // 044: SE JÁ EXISTEM MORADIAS NESTE NÚMERO E O USUÁRIO NÃO DEFINIU COMPLEMENTO
// 045:             if (listaComps.length > 0 && (!inputComplemento.value || inputComplemento.value === "CASA ÚNICA")) {
// 046:                 const escolha = await window.Utils.CustomModals.addressConflict(
// 047:                     "CONFLITO HABITACIONAL", 
// 048:                     `FORAM LOCALIZADOS ${listaComps.length} COMPLEMENTOS NESTE NÚMERO. SELECIONE O CORRETO OU SEGUE PARA CRIAR NOVO:`, 
// 049:                     listaComps
// 050:                 );
// 051: 
// 052:                 if (escolha === "NOVO") {
// 053:                     inputComplemento.value = "";
// 054:                     inputComplemento.focus();
// 055:                     window.Utils.CustomModals.alert("DIGITE O NOVO COMPLEMENTO (EX: CASA 3, FUNDOS, BLOCO B).");
// 056:                 } else if (escolha) {
// 057:                     inputComplemento.value = escolha;
// 058:                 }
// 059:             } else if (listaComps.length === 0 && !inputComplemento.value) {
// 060:                 // 061: SE O ENDEREÇO É NOVO, DEFINE O PADRÃO PARA EVITAR CAMPOS VAZIOS
// 062:                 inputComplemento.value = "CASA ÚNICA";
// 063:             }
// 064:         }
// 065:     },
// 066: 
// 067:     // 068: INICIALIZA UM NOVO CADASTRO INDIVIDUAL (LIMPEZA TOTAL DO FORMULÁRIO)
// 069:     startNew() {
// 070:         window.AppState.resetPatient();
// 071:         window.AppState.resetUnsaved();
// 072:         
// 073:         const campos = document.querySelectorAll('#tela-cadastro input, #tela-cadastro select, #tela-cadastro textarea');
// 074:         campos.forEach(input => {
// 075:             if(input.type === 'checkbox') input.checked = false;
// 076:             else input.value = "";
// 077:         });
// 078: 
// 079:         // 080: DEFAULTS TÉCNICOS
// 081:         document.getElementById('c-is-resp').value = "SIM";
// 082:         document.getElementById('c-sexo').value = "MASCULINO";
// 083:         document.getElementById('c-raca').value = "BRANCA";
// 084: 
// 085:         this.toggleRelacao();
// 086:         this.toggleDum();
// 087:         this.setStep(1);
// 088:         window.Nav.goTo('tela-cadastro');
// 089:     },
// 090: 
// 091:     // 092: ATALHO PARA CADASTRO DOMICILIAR (PULA PARA A ABA DE ENDEREÇO)
// 093:     startNewDomicilio() {
// 094:         this.startNew();
// 095:         this.setStep(2);
// 096:     },
// 097: 
// 098:     // 099: CARREGA DADOS DE UM PACIENTE EXISTENTE PARA EDIÇÃO
// 100:     async prepareEdit(id) {
// 101:         const cidadao = await window.DB.get("municipes", id);
// 102:         if(!cidadao) return;
// 103: 
// 104:         window.AppState.activePatient = cidadao;
// 105:         const preencher = (idElemento, valor) => {
// 106:             const el = document.getElementById(idElemento);
// 107:             if(el) el.value = valor || "";
// 108:         };
// 109:         const marcar = (idElemento, valor) => {
// 110:             const el = document.getElementById(idElemento);
// 111:             if(el) el.checked = !!valor;
// 112:         };
// 113: 
// 114:         // 115: MAPEAMENTO DE CAMPOS e-SUS INDIVIDUAL
// 116:         preencher('c-nome', cidadao.nome);
// 117:         preencher('c-nasc', cidadao.nasc);
// 118:         preencher('c-nome-social', cidadao.nomeSocial);
// 119:         preencher('c-sexo', cidadao.sexo);
// 120:         preencher('c-raca', cidadao.raca);
// 121:         preencher('c-mae', cidadao.mae);
// 122:         preencher('c-pai', cidadao.pai);
// 123:         preencher('c-cpf', cidadao.cpf);
// 124:         preencher('c-cns', cidadao.cns);
// 125:         preencher('c-nacionalidade', cidadao.nacionalidade);
// 126:         preencher('c-tel', cidadao.tel);
// 127: 
// 128:         // 129: LOCALIZAÇÃO E DOMICILIO
// 130:         preencher('c-rua', cidadao.rua);
// 131:         preencher('c-num', cidadao.num);
// 132:         preencher('c-ma', cidadao.ma);
// 133:         preencher('c-seg', cidadao.seg);
// 134:         preencher('c-comp', cidadao.comp);
// 135:         preencher('c-is-resp', cidadao.isResp);
// 136:         preencher('c-relacao', cidadao.relacao);
// 137: 
// 138:         // 139: SAÚDE E AGRAVOS
// 140:         marcar('ch-hiper', cidadao.hiper);
// 141:         marcar('ch-diab', cidadao.diab);
// 142:         marcar('ch-gest', cidadao.gest);
// 143:         preencher('c-dum', cidadao.dum);
// 144:         marcar('ch-mental', cidadao.saudeMental);
// 145:         marcar('ch-acamado', cidadao.acamado);
// 146:         marcar('ch-fumante', cidadao.fumante);
// 147:         marcar('ch-alcool', cidadao.alcool);
// 148:         marcar('ch-drogas', cidadao.drogas);
// 149:         marcar('ch-cancer', cidadao.cancer);
// 150:         marcar('ch-deficiencia', cidadao.deficiencia);
// 151:         preencher('c-obs', cidadao.obs);
// 152: 
// 153:         // 154: ATUALIZA ESTADO VISUAL DOS PASSOS
// 155:         this.toggleRelacao();
// 156:         this.toggleDum();
// 157:         this.setStep(1);
// 158:         window.Nav.goTo('tela-cadastro');
// 159:     },
// 160: 
// 161:     // 162: MÉTODO FINAL DE SALVAMENTO COM INTEGRIDADE TOTAL
// 163:     async save() {
// 164:         const dadosIndividuais = {
// 165:             nome: document.getElementById('c-nome').value.toUpperCase().trim(),
// 166:             nasc: document.getElementById('c-nasc').value,
// 167:             nomeSocial: document.getElementById('c-nome-social').value.toUpperCase().trim(),
// 168:             sexo: document.getElementById('c-sexo').value,
// 169:             raca: document.getElementById('c-raca').value,
// 170:             mae: document.getElementById('c-mae').value.toUpperCase().trim(),
// 171:             pai: document.getElementById('c-pai').value.toUpperCase().trim(),
// 172:             cpf: document.getElementById('c-cpf').value.replace(/\D/g, ''),
// 173:             cns: document.getElementById('c-cns').value.replace(/\D/g, ''),
// 174:             nacionalidade: document.getElementById('c-nacionalidade').value,
// 175:             tel: document.getElementById('c-tel').value,
// 176:             rua: document.getElementById('c-rua').value,
// 177:             num: document.getElementById('c-num').value.toUpperCase().trim(),
// 178:             ma: document.getElementById('c-ma').value.toUpperCase().trim(),
// 179:             seg: document.getElementById('c-seg').value.toUpperCase().trim(),
// 180:             comp: document.getElementById('c-comp').value.toUpperCase().trim() || "CASA ÚNICA",
// 181:             isResp: document.getElementById('c-is-resp').value,
// 182:             relacao: document.getElementById('c-relacao').value,
// 183:             hiper: document.getElementById('ch-hiper').checked,
// 184:             diab: document.getElementById('ch-diab').checked,
// 185:             gest: document.getElementById('ch-gest').checked,
// 186:             dum: document.getElementById('c-dum').value,
// 187:             saudeMental: document.getElementById('ch-mental').checked,
// 188:             acamado: document.getElementById('ch-acamado').checked,
// 189:             fumante: document.getElementById('ch-fumante').checked,
// 190:             alcool: document.getElementById('ch-alcool').checked,
// 191:             drogas: document.getElementById('ch-drogas').checked,
// 192:             cancer: document.getElementById('ch-cancer').checked,
// 193:             deficiencia: document.getElementById('ch-deficiencia').checked,
// 194:             obs: document.getElementById('c-obs').value.toUpperCase().trim(),
// 195:             ts_modificacao: Date.now()
// 196:         };
// 197: 
// 198:         // 199: VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ANTES DE PROCESSAR
// 200:         const validacao = window.Utils.checkMandatoryFields(dadosIndividuais);
// 201:         if (!validacao.valid) {
// 202:             return window.Utils.CustomModals.alert(`CADASTRO NÃO PODE SER SALVO:\n${validacao.missing.join('\n')}`);
// 203:         }
// 204: 
// 205:         // 206: CALCULO DE STATUS DE IDOSO (PROTOCOLAR)
// 207:         dadosIndividuais.idoso = (window.Utils.calculateAge(dadosIndividuais.nasc) >= 60);
// 208: 
// 209:         // 210: ATRIBUIÇÃO DE ID PARA ATUALIZAÇÃO OU CRIAÇÃO
// 211:         if (window.AppState.activePatient) dadosIndividuais.id = window.AppState.activePatient.id;
// 212: 
// 213:         try {
// 214:             await window.DB.put("municipes", dadosIndividuais);
// 215:             window.AppState.resetUnsaved();
// 216:             await window.Utils.CustomModals.alert("GRAVAÇÃO CONCLUÍDA COM SUCESSO!");
// 217:             window.Nav.goTo('tela-home', true);
// 218:         } catch (erro) {
// 219:             window.Utils.CustomModals.alert("ERRO CRÍTICO NO INDEXEDDB: " + erro.message);
// 220:         }
// 221:     }
// 222: };
