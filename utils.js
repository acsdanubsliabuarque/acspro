// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: UTILS.JS - MOTOR DE LOGICA, MASCARAS E MODAIS INTEGRADOS         //
// 003: // VERSÃO DEFINITIVA - COMPATIBILIDADE TOTAL COM E-SUS E SISAB              //
// 004: ////////////////////////////////////////////////////////////////////////////////
// 005: 
// 006: window.Utils = {
// 007: 
// 008:     // 009: SANEAMENTO DE TEXTOS - GARANTE MAIUSCULAS E REMOVE ESPAÇOS EXCEDENTES
// 010:     sanitize(str) {
// 011:         if (str === null || str === undefined) return '';
// 012:         return str.toString().toUpperCase().trim();
// 013:     },
// 014: 
// 015:     // 016: CONVERSOR DE DATA FORMATO BRASIL PARA OBJETO DATE DO MOTOR JS
// 017:     parseDateBR(str) {
// 018:         if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
// 019:         const [d, m, y] = str.split('/').map(Number);
// 020:         const date = new Date(y, m - 1, d);
// 021:         // 022: VALIDACAO DE DIA/MES REAL (IMPEDE 31/02 POR EXEMPLO)
// 023:         if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
// 024:         return date;
// 025:     },
// 026: 
// 027:     // 028: MOTOR DE CÁLCULO DE IDADE - FUNDAMENTAL PARA REGRAS DE IDOSO
// 029:     calculateAge(dateStr) {
// 030:         const birth = this.parseDateBR(dateStr);
// 031:         if (!birth) return 'N/A';
// 032:         const today = new Date();
// 033:         let age = today.getFullYear() - birth.getFullYear();
// 034:         const m = today.getMonth() - birth.getMonth();
// 035:         if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
// 036:         return age;
// 037:     },
// 038: 
// 039:     // 040: INFORMAÇÕES GESTACIONAIS (REGRA DE NAGAELE PARA DPP E IG)
// 041:     getGestationalInfo(dumStr) {
// 042:         const dum = this.parseDateBR(dumStr);
// 043:         if (!dum || dum > new Date()) return null;
// 044:         const diffTotalDias = Math.floor((new Date() - dum) / (1000 * 60 * 60 * 24));
// 045:         const semanas = Math.floor(diffTotalDias / 7);
// 046:         const diasRestantes = diffTotalDias % 7;
// 047:         
// 048:         // 049: CÁLCULO DA DATA PROVÁVEL DO PARTO
// 050:         let dpp = new Date(dum);
// 051:         dpp.setDate(dpp.getDate() + 7);
// 052:         dpp.setMonth(dpp.getMonth() - 3);
// 053:         dpp.setFullYear(dpp.getFullYear() + 1);
// 054:         
// 055:         // 056: DEFINIÇÃO DO TRIMESTRE ATUAL
// 057:         let trimestre = semanas < 13 ? "1º TRIMESTRE" : (semanas < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE");
// 058:         
// 059:         return { 
// 060:             res: `${semanas} SEMANAS E ${diasRestantes} DIAS`, 
// 061:             dpp: dpp.toLocaleDateString('pt-BR'), 
// 062:             tri: trimestre 
// 063:         };
// 064:     },
// 065: 
// 066:     // 067: VALIDADOR DE CAMPOS OBRIGATÓRIOS DO PROTOCOLO OSASCO
// 068:     checkMandatoryFields(data) {
// 069:         const missing = [];
// 070:         if (!data.nome) missing.push("NOME COMPLETO");
// 071:         if (!data.nasc || data.nasc.length < 10) missing.push("DATA DE NASCIMENTO VÁLIDA");
// 072:         if (!data.rua) missing.push("LOGRADOURO (RUA)");
// 073:         if (!data.num) missing.push("NÚMERO DA MORADIA");
// 074:         return { valid: missing.length === 0, missing: missing };
// 075:     },
// 076: 
// 077:     // 078: ALGORITMOS DE MÁSCARA DINÂMICA (REGEX)
// 079:     masks: {
// 080:         date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
// 081:         cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
// 082:         phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
// 083:         pa: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
// 084:     },
// 085: 
// 086:     // 087: SISTEMA DE MODAIS INTEGRADOS (CHAVE PARA A INTERATIVIDADE DOS BOTOES)
// 088:     CustomModals: {
// 089:         init() {
// 090:             if (document.getElementById('sys-modal-container')) return;
// 091:             // 092: CONSTRUÇÃO DINÂMICA DO MODAL NO DOM
// 093:             document.body.insertAdjacentHTML('beforeend', `
// 094:                 <div id="sys-modal-container" class="modal-overlay" style="display:none;">
// 095:                     <div class="modal-content">
// 096:                         <h3 id="sys-modal-title" style="margin-top:0; color:var(--primary); font-size:20px;"></h3>
// 097:                         <div id="sys-modal-text" style="margin:20px 0; font-size:16px; color:#444; line-height:1.5;"></div>
// 098:                         <input type="text" id="sys-modal-input" class="hidden" style="margin-bottom:15px;">
// 099:                         <select id="sys-modal-select" class="hidden" style="margin-bottom:15px;"></select>
// 100:                         <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:10px;">
// 101:                             <button id="sys-modal-btn-cancel" class="btn btn-outline btn-sm" style="flex:1;">CANCELAR</button>
// 102:                             <button id="sys-modal-btn-ok" class="btn btn-main btn-sm" style="flex:1; border:none;">OK / CONFIRMAR</button>
// 103:                         </div>
// 104:                     </div>
// 105:                 </div>`);
// 106:         },
// 107: 
// 108:         // 109: MOTOR INTERNO DOS ALERTAS BASEADO EM PROMISES (SINCRONIZAÇÃO DE RESPOSTAS)
// 110:         show(title, text, type = 'alert', def = '', options = []) {
// 111:             this.init();
// 112:             return new Promise(resolve => {
// 113:                 const overlay = document.getElementById('sys-modal-container');
// 114:                 const btnOk = document.getElementById('sys-modal-btn-ok');
// 115:                 const btnCan = document.getElementById('sys-modal-btn-cancel');
// 116:                 const input = document.getElementById('sys-modal-input');
// 117:                 const select = document.getElementById('sys-modal-select');
// 118: 
// 119:                 document.getElementById('sys-modal-title').textContent = title;
// 120:                 document.getElementById('sys-modal-text').innerHTML = text.replace(/\n/g, '<br>');
// 121:                 
// 122:                 // 123: CONFIGURAÇÃO DE VISIBILIDADE POR TIPO DE MODAL
// 124:                 input.className = type === 'prompt' ? '' : 'hidden'; 
// 125:                 input.value = def;
// 126:                 
// 127:                 select.className = type === 'select' ? '' : 'hidden';
// 128:                 if(type === 'select') {
// 129:                     select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + 
// 130:                                       '<option value="NOVO">CADASTRAR NOVO COMPLEMENTO...</option>';
// 131:                 }
// 132:                 
// 133:                 btnCan.className = type === 'alert' ? 'btn btn-outline btn-sm hidden' : 'btn btn-outline btn-sm';
// 134: 
// 135:                 overlay.style.display = 'flex';
// 136: 
// 137:                 const close = (res) => {
// 138:                     overlay.style.display = 'none';
// 139:                     resolve(res);
// 140:                 };
// 141: 
// 142:                 btnOk.onclick = () => close(type === 'prompt' ? input.value.toUpperCase() : (type === 'select' ? select.value : true));
// 143:                 btnCan.onclick = () => close(false);
// 144:             });
// 145:         },
// 146: 
// 147:         // 148: MÉTODOS DE CHAMADA SIMPLIFICADA PARA O DESENVOLVEDOR
// 149:         alert(m) { return this.show("SISTEMA INFORMA", m); },
// 150:         confirm(m) { return this.show("SISTEMA SOLICITA", m, 'confirm'); },
// 151:         prompt(m, d='') { return this.show("SISTEMA AGUARDA ENTRADA", m, 'prompt', d); },
// 152:         addressConflict(t, txt, opt) { return this.show(t, txt, 'select', '', opt); }
// 153:     }
// 154: };
