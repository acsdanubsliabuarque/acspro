// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: REGISTRY.JS - GESTAO DE CADASTROS E VINCULOS                     //
// 003: ////////////////////////////////////////////////////////////////////////////////
// 004: 
// 005: window.Registry = {
// 006:     // 007: ALTERNA ENTRES AS ETAPAS DO CADASTRAMENTO
// 008:     setStep(n) {
// 009:         document.querySelectorAll('[id^="passo-"]').forEach(d => d.classList.add('hidden'));
// 010:         const target = document.getElementById(`passo-${n}`);
// 011:         if(target) target.classList.remove('hidden');
// 012:         window.scrollTo(0, 0);
// 013:     },
// 014: 
// 015:     // 016: VISIBILIDADE DO CAMPO DUM
// 017:     toggleDum() { document.getElementById('div-gestante').classList.toggle('hidden', !document.getElementById('ch-gest').checked); },
// 018: 
// 019:     // 020: VISIBILIDADE DO CAMPO RELACAO (PARENTESCO)
// 021:     toggleRelacao() { document.getElementById('div-parentesco').classList.toggle('hidden', document.getElementById('c-is-resp').value === 'SIM'); },
// 022: 
// 023:     // 024: VALIDADOR DE CONFLITO DE NUCLEO FAMILIAR (ESPECIFICO OSASCO)
// 025:     async checkAddressConflict() {
// 026:         const rua = document.getElementById('c-rua').value;
// 027:         const num = document.getElementById('c-num').value.trim();
// 028:         const compInput = document.getElementById('c-comp');
// 029:         if (rua && num) {
// 030:             const existentes = await window.DB.findAddressComplements(rua, num);
// 031:             if (existentes.length > 0 && (!compInput.value || compInput.value === "CASA ÚNICA")) {
// 032:                 const choice = await window.Utils.CustomModals.addressConflict("LOGRADOURO IDENTIFICADO", `EXISTEM ${existentes.length} CASAS NESTE NÚMERO. QUAL A CORRETA?`, existentes);
// 033:                 if (choice === "NOVO") { compInput.value = ""; compInput.focus(); }
// 034:                 else if (choice) compInput.value = choice;
// 035:             } else if (existentes.length === 0 && !compInput.value) { compInput.value = "CASA ÚNICA"; }
// 036:         }
// 037:     },
// 038: 
// 039:     // 040: PREPARA FORMULARIO PARA NOVO CADASTRO INDIVIDUAL
// 041:     startNew() {
// 042:         window.AppState.resetPatient();
// 043:         const form = document.querySelector('#tela-cadastro');
// 044:         form.querySelectorAll('input, select, textarea').forEach(i => { if(i.type === 'checkbox') i.checked = false; else i.value = ""; });
// 045:         document.getElementById('c-is-resp').value = "SIM";
// 046:         this.toggleRelacao(); this.toggleDum(); this.setStep(1);
// 047:         window.Nav.goTo('tela-cadastro');
// 048:     },
// 049: 
// 150:     // 151: NOVO DOMICILIO (PULA PARA ETAPA 2)
// 152:     startNewDomicilio() { this.startNew(); this.setStep(2); },
// 153: 
// 154:     // 155: CARREGA PACIENTE PARA EDICAO
// 156:     async prepareEdit(id) {
// 157:         const p = await window.DB.get("municipes", id);
// 158:         if(!p) return;
// 159:         window.AppState.activePatient = p;
// 160:         const setV = (id, v) => { const el = document.getElementById(id); if(el) el.value = v || ""; };
// 161:         const setC = (id, v) => { const el = document.getElementById(id); if(el) el.checked = !!v; };
// 162:         setV('c-nome', p.nome); setV('c-nasc', p.nasc); setV('c-nome-social', p.nomeSocial); setV('c-sexo', p.sexo);
// 163:         setV('c-raca', p.raca); setV('c-mae', p.mae); setV('c-pai', p.pai); setV('c-cpf', p.cpf);
// 164:         setV('c-cns', p.cns); setV('c-tel', p.tel); setV('c-rua', p.rua); setV('c-num', p.num);
// 165:         setV('c-comp', p.comp); setV('c-is-resp', p.isResp); setV('c-relacao', p.relacao);
// 166:         setC('ch-hiper', p.hiper); setC('ch-diab', p.diab); setC('ch-gest', p.gest); setC('ch-mental', p.saudeMental);
// 167:         setV('c-dum', p.dum); setV('c-obs', p.obs);
// 168:         this.toggleRelacao(); this.toggleDum(); this.setStep(1);
// 169:         window.Nav.goTo('tela-cadastro');
// 170:     },
// 171: 
// 172:     // 173: SALVAMENTO COM VALIDACAO COMPLETA E REGRAS DE IDOSO
// 174:     async save() {
// 175:         const data = {
// 176:             nome: document.getElementById('c-nome').value.toUpperCase().trim(),
// 177:             nasc: document.getElementById('c-nasc').value,
// 178:             nomeSocial: document.getElementById('c-nome-social').value.toUpperCase().trim(),
// 179:             sexo: document.getElementById('c-sexo').value,
// 180:             raca: document.getElementById('c-raca').value,
// 181:             mae: document.getElementById('c-mae').value.toUpperCase().trim(),
// 182:             pai: document.getElementById('c-pai').value.toUpperCase().trim(),
// 183:             cpf: document.getElementById('c-cpf').value.replace(/\D/g, ''),
// 184:             cns: document.getElementById('c-cns').value.replace(/\D/g, ''),
// 185:             rua: document.getElementById('c-rua').value,
// 186:             num: document.getElementById('c-num').value.toUpperCase().trim(),
// 187:             comp: document.getElementById('c-comp').value.toUpperCase().trim() || "CASA ÚNICA",
// 188:             isResp: document.getElementById('c-is-resp').value,
// 189:             relacao: document.getElementById('c-relacao').value,
// 190:             hiper: document.getElementById('ch-hiper').checked,
// 191:             diab: document.getElementById('ch-diab').checked,
// 192:             gest: document.getElementById('ch-gest').checked,
// 193:             saudeMental: document.getElementById('ch-mental').checked,
// 194:             dum: document.getElementById('c-dum').value,
// 195:             obs: document.getElementById('c-obs').value.toUpperCase().trim(),
// 196:             ts: Date.now()
// 197:         };
// 198:         const v = window.Utils.checkMandatoryFields(data);
// 199:         if(!v.valid) return window.Utils.CustomModals.alert("ATENÇÃO: FALTAM CAMPOS OBRIGATÓRIOS:\n" + v.missing.join(", "));
// 200:         data.idoso = (window.Utils.calculateAge(data.nasc) >= 60);
// 201:         if(window.AppState.activePatient) data.id = window.AppState.activePatient.id;
// 202:         try {
// 203:             await window.DB.put("municipes", data);
// 204:             await window.Utils.CustomModals.alert("DADOS GRAVADOS COM SUCESSO!");
// 205:             window.Nav.goTo('tela-home', true);
// 206:         } catch(e) { window.Utils.CustomModals.alert("ERRO AO SALVAR: " + e.message); }
// 207:     }
// 208: };
