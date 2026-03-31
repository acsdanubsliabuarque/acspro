// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: APP.JS - MAESTRO DE NAVEGACAO E INTERFACE                        //
// 003: ////////////////////////////////////////////////////////////////////////////////
// 004: 
// 005: window.AppState = {
// 006:     activePatient: null, history: ['tela-home'], unsavedChanges: false, currentViewMode: 'full',
// 007:     markUnsaved() { this.unsavedChanges = true; },
// 008:     resetUnsaved() { this.unsavedChanges = false; },
// 009:     resetPatient() { this.activePatient = null; }
// 010: };
// 011: 
// 012: window.Nav = {
// 013:     init() {
// 014:         const selects = document.querySelectorAll('.select-ruas');
// 015:         const opts = `<option value="">ESCOLHA O LOGRADOURO...</option>` + window.CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
// 016:         selects.forEach(s => s.innerHTML = opts);
// 017:         document.addEventListener('input', (e) => {
// 018:             if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') e.target.value = e.target.value.toUpperCase();
// 019:             if (['c-nasc', 'c-dum'].includes(e.target.id)) e.target.value = window.Utils.masks.date(e.target.value);
// 020:             if (e.target.id === 'c-cpf') e.target.value = window.Utils.masks.cpf(e.target.value);
// 021:             if (e.target.id === 'c-tel') e.target.value = window.Utils.masks.phone(e.target.value);
// 022:             if (e.target.id === 'v-pa') e.target.value = window.Utils.masks.pa(e.target.value);
// 023:         });
// 024:     },
// 025:     goTo(id, reset = false) {
// 026:         if (reset) this.history = ['tela-home'];
// 027:         else if (this.history[this.history.length - 1] !== id) this.history.push(id);
// 028:         document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
// 029:         const target = document.getElementById(id);
// 030:         if (target) target.classList.remove('hidden');
// 031:         window.scrollTo(0, 0);
// 032:     },
// 033:     goBack() {
// 034:         if (this.history.length > 1) { this.history.pop(); this.goTo(this.history[this.history.length - 1]); this.history.pop(); }
// 035:         else this.goTo('tela-home', true);
// 036:     },
// 037:     async confirmExit(dest) {
// 038:         if (window.AppState.unsavedChanges && !await window.Utils.CustomModals.confirm("SAIR SEM SALVAR?")) return;
// 039:         window.AppState.resetUnsaved();
// 040:         if (dest === 'voltar') this.goBack(); else this.goTo(dest, true);
// 041:     }
// 042: };
// 043: 
// 044: window.UI = {
// 045:     changeView(m) { window.AppState.currentViewMode = m; this.searchPessoa(true); },
// 046:     async buildCardFull(p) {
// 047:         const s = window.Utils.sanitize; const idade = window.Utils.calculateAge(p.nasc);
// 048:         const gest = p.gest ? window.Utils.getGestationalInfo(p.dum) : null;
// 049:         const pends = (await window.DB.getByIndex("visitas", "pacienteId", p.id)).filter(v => v.pendencia && !v.resolvida);
// 050:         let ag = ""; [{k:'hiper', l:'HIPERTENSÃO', c:'bg-hiper'}, {k:'diab', l:'DIABETES', c:'bg-dia'}, {k:'gest', l:'GESTANTE', c:'bg-gest'}, {k:'saudeMental', l:'S. MENTAL', c:'bg-saudemental'}, {k:'idoso', l:'IDOSO', c:'bg-idoso'}].forEach(i => { if(p[i.k]) ag += `<span class="badge ${i.c}">${i.l}</span>`; });
// 051:         return `<div class="card ${p.gest?'card-gestante':''}">${s(p.nome)} (${idade} ANOS)<br><small>${s(p.rua)}, ${p.num} - ${s(p.comp)}</small>${gest?`<div class="gestante-badge-info">IG: ${gest.res} <br> DPP: ${gest.dpp}</div>`:''}<div style="margin:8px 0">${ag}</div>${pends.length?`<div class="pendencia-ativa-no-card">⚠️ ${s(pends[0].pendencia)}</div>`:''}<hr><button class="btn btn-main" onclick="window.Visits.start(${p.id})">VISITAR</button><div class="grid-2"><button class="btn btn-outline btn-sm" onclick="window.Visits.viewHistory(${p.id})">HISTÓRICO</button><button class="btn btn-outline btn-sm" onclick="window.Registry.prepareEdit(${p.id})">EDITAR</button></div></div>`;
// 052:     },
// 053:     async searchPessoa(refresh = false) {
// 054:         const term = document.getElementById('h-nome').value.toUpperCase().trim();
// 055:         if (!term && !refresh) return;
// 056:         const all = await window.DB.getAll("municipes");
// 057:         const res = all.filter(p => p.nome.includes(term));
// 058:         await this.renderList(`PESQUISA: ${term}`, res);
// 059:     },
// 060:     async searchEndereco() {
// 061:         const r = document.getElementById('h-rua').value; const n = document.getElementById('h-num').value.trim();
// 062:         if (!r) return;
// 063:         const all = await window.DB.getByIndex("municipes", "rua", r);
// 064:         const res = all.filter(p => !n || p.num === n);
// 065:         await this.renderList(`LOGRADOURO: ${r}`, res);
// 066:     },
// 067:     async renderList(title, arr) {
// 068:         const c = document.getElementById('lista-resultados');
// 069:         c.innerHTML = `<h3>${title} (${arr.length})</h3>`;
// 070:         if (arr.length === 0) c.innerHTML += "<p>NADA ENCONTRADO.</p>";
// 071:         else for (const p of arr) c.innerHTML += await this.buildCardFull(p);
// 072:         window.Nav.goTo('tela-resultados');
// 073:     }
// 074: };
// 075: 
// 076: window.Backup = {
// 077:     async createBackup() {
// 078:         const m = await window.DB.getAll("municipes"); const v = await window.DB.getAll("visitas"); const a = await window.DB.getAll("arquivo_pendencias");
// 079:         const b = { municipes: m, visitas: v, arquivo_pendencias: a };
// 080:         const blob = new Blob([JSON.stringify(b)], {type: 'application/json'});
// 081:         const lnk = document.createElement('a'); lnk.href = URL.createObjectURL(blob); lnk.download = `BACKUP_OSASCO.json`; lnk.click();
// 082:     },
// 083:     async restoreBackup(ev) {
// 084:         const f = ev.target.files[0]; if(!f) return;
// 085:         const rd = new FileReader();
// 086:         rd.onload = async (e) => {
// 087:             const d = JSON.parse(e.target.result);
// 088:             for(let p of (d.municipes || [])) await window.DB.put("municipes", p);
// 089:             for(let v of (d.visitas || [])) await window.DB.put("visitas", v);
// 090:             location.reload();
// 091:         };
// 092:         rd.readAsText(f);
// 093:     },
// 094:     async exportCSV() {
// 095:         const vs = await window.DB.getAll("visitas");
// 096:         let csv = "\ufeffDATA;NOME;MOTIVOS;RELATO;PA\n";
// 097:         vs.forEach(v => { csv += `${v.dataBR};${v.nome};${v.motivos};${v.relato};${v.pa || ''}\n`; });
// 098:         const bl = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
// 099:         const l = document.createElement('a'); l.href = URL.createObjectURL(bl); l.download = `RELATORIO.csv`; l.click();
// 100:     }
// 101: };
// 102: 
// 103: document.addEventListener('DOMContentLoaded', async () => {
// 104:     await window.DB.init();
// 105:     window.Nav.init();
// 106: });
