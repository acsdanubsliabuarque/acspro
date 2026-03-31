// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: UTILS.JS - MOTOR DE LOGICA, MASCARAS E MODAIS                     //
// 003: ////////////////////////////////////////////////////////////////////////////////
// 004: 
// 005: window.Utils = {
// 006:     // 007: GARANTE QUE TEXTOS SEJAM HIGIENIZADOS E EM MAIÚSCULAS
// 008:     sanitize(str) {
// 009:         if (str === null || str === undefined) return '';
// 010:         return str.toString().toUpperCase().trim();
// 011:     },
// 012: 
// 013:     // 014: CONVERSOR DE STRINGS DE DATA PARA OBJETOS NATIVOS JS
// 015:     parseDateBR(str) {
// 016:         if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return null;
// 017:         const [d, m, y] = str.split('/').map(Number);
// 018:         const date = new Date(y, m - 1, d);
// 019:         if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) return null;
// 020:         return date;
// 021:     },
// 022: 
// 023:     // 024: CALCULO DE IDADE EM TODOS OS LUGARES DO SISTEMA
// 025:     calculateAge(dateStr) {
// 026:         const birth = this.parseDateBR(dateStr);
// 027:         if (!birth) return 'N/A';
// 028:         const today = new Date();
// 029:         let age = today.getFullYear() - birth.getFullYear();
// 030:         const m = today.getMonth() - birth.getMonth();
// 031:         if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
// 032:         return age;
// 033:     },
// 034: 
// 035:     // 036: INFORMACAO GESTACIONAL (IG E DPP) CONFORME REGRA DE NAGAELE
// 037:     getGestationalInfo(dumStr) {
// 038:         const dum = this.parseDateBR(dumStr);
// 039:         if (!dum || dum > new Date()) return null;
// 040:         const diff = Math.floor((new Date() - dum) / (1000 * 60 * 60 * 24));
// 041:         const weeks = Math.floor(diff / 7);
// 042:         const days = diff % 7;
// 043:         let dpp = new Date(dum);
// 044:         dpp.setDate(dpp.getDate() + 7); dpp.setMonth(dpp.getMonth() - 3); dpp.setFullYear(dpp.getFullYear() + 1);
// 045:         let tri = weeks < 13 ? "1º TRIMESTRE" : (weeks < 27 ? "2º TRIMESTRE" : "3º TRIMESTRE");
// 046:         return { res: `${weeks} SEMANAS E ${days} DIAS`, dpp: dpp.toLocaleDateString('pt-BR'), tri };
// 047:     },
// 048: 
// 049:     // 050: VALIDADOR DE CAMPOS OBRIGATORIOS DE OSASCO
// 051:     checkMandatoryFields(data) {
// 052:         const missing = [];
// 053:         if (!data.nome) missing.push("NOME COMPLETO");
// 054:         if (!data.nasc || data.nasc.length < 10) missing.push("DATA DE NASCIMENTO");
// 055:         if (!data.rua) missing.push("LOGRADOURO");
// 056:         if (!data.num) missing.push("NÚMERO");
// 057:         return { valid: missing.length === 0, missing };
// 058:     },
// 059: 
// 060:     // 061: MASCARAS DE ENTRADA RIGIDAS
// 062:     masks: {
// 063:         date: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10),
// 064:         cpf: v => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14),
// 065:         phone: v => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').slice(0, 15),
// 066:         pa: v => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5)
// 067:     },
// 068: 
// 069:     // 070: OBJETO DE MODAIS CUSTOMIZADOS (CHAVE PARA FUNCIONAMENTO DOS BOTOES)
// 071:     CustomModals: {
// 072:         init() {
// 073:             if (document.getElementById('sys-modal-container')) return;
// 074:             document.body.insertAdjacentHTML('beforeend', `
// 075:                 <div id="sys-modal-container" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; align-items:center; justify-content:center;">
// 076:                     <div class="modal-content" style="background:white; padding:25px; border-radius:15px; width:90%; max-width:400px; box-shadow:0 5px 20px rgba(0,0,0,0.5)">
// 077:                         <h3 id="sys-modal-title" style="margin-top:0; color:#004a99"></h3>
// 078:                         <div id="sys-modal-text" style="margin:15px 0; color:#333"></div>
// 079:                         <input type="text" id="sys-modal-input" class="hidden" style="width:100%; padding:10px; margin-bottom:10px">
// 080:                         <select id="sys-modal-select" class="hidden" style="width:100%; padding:10px; margin-bottom:10px; background:white"></select>
// 081:                         <div style="display:flex; gap:10px; justify-content:flex-end">
// 082:                             <button id="sys-modal-btn-cancel" class="btn-outline" style="padding:10px 20px; border-radius:8px">CANCELAR</button>
// 083:                             <button id="sys-modal-btn-ok" class="btn-main" style="padding:10px 20px; border-radius:8px; border:none; background:#004a99; color:white; cursor:pointer">OK</button>
// 084:                         </div>
// 085:                     </div>
// 086:                 </div>`);
// 087:         },
// 088:         show(title, text, type = 'alert', def = '', options = []) {
// 089:             this.init();
// 090:             return new Promise(resolve => {
// 091:                 const overlay = document.getElementById('sys-modal-container');
// 092:                 const btnOk = document.getElementById('sys-modal-btn-ok');
// 093:                 const btnCan = document.getElementById('sys-modal-btn-cancel');
// 094:                 const input = document.getElementById('sys-modal-input');
// 095:                 const select = document.getElementById('sys-modal-select');
// 096:                 document.getElementById('sys-modal-title').textContent = title;
// 097:                 document.getElementById('sys-modal-text').innerHTML = text.replace(/\n/g, '<br>');
// 098:                 input.className = type === 'prompt' ? '' : 'hidden'; input.value = def;
// 099:                 select.className = type === 'select' ? '' : 'hidden';
// 100:                 if(type === 'select') select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('') + '<option value="NOVO">CRIAR NOVO COMPLEMENTO...</option>';
// 101:                 btnCan.className = type === 'alert' ? 'hidden' : '';
// 102:                 overlay.style.display = 'flex';
// 103:                 const close = (res) => { overlay.style.display = 'none'; resolve(res); };
// 104:                 btnOk.onclick = () => close(type === 'prompt' ? input.value.toUpperCase() : (type === 'select' ? select.value : true));
// 105:                 btnCan.onclick = () => close(false);
// 106:             });
// 107:         },
// 108:         alert(m) { return this.show("AVISO", m); },
// 109:         confirm(m) { return this.show("CONFIRMAR", m, 'confirm'); },
// 110:         prompt(m, d='') { return this.show("DIGITE", m, 'prompt', d); },
// 111:         addressConflict(t, txt, opt) { return this.show(t, txt, 'select', '', opt); }
// 112:     }
// 113: };
