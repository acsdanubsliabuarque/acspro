// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: VISITS.JS - MOTOR DE VISITAS E PENDENCIAS                        //
// 003: ////////////////////////////////////////////////////////////////////////////////
// 004: 
// 005: window.Visits = {
// 006:     // 007: ABRE FORMULARIO PARA REGISTRO DE VISITA
// 008:     async start(id) {
// 009:         const p = await window.DB.get("municipes", id);
// 010:         if(!p) return;
// 011:         window.AppState.activePatient = p;
// 012:         document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome}`;
// 013:         document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
// 014:         document.getElementById('v-relato').value = "";
// 015:         document.getElementById('v-pendencia').value = "";
// 016:         document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);
// 017:         
// 018:         // 019: BUSCA OUTROS MORADORES PARA VISITA EM CADEIA
// 020:         const area = document.getElementById('v-familiares-area');
// 021:         if(area) {
// 022:             area.innerHTML = "";
// 023:             const fam = await window.DB.getByIndex("municipes", "enderecoChave", [p.rua, p.num, p.comp]);
// 024:             const outros = fam.filter(m => m.id !== p.id);
// 025:             if(outros.length > 0) {
// 026:                 area.innerHTML = `<label style="background:#eee; padding:5px; border-radius:4px;">MORADORES NESTA CASA:</label>`;
// 027:                 outros.forEach(m => {
// 028:                     area.innerHTML += `<div class="card-familiar" style="margin-top:5px;">${m.nome} <button class="btn-xs btn-outline" style="float:right" onclick="window.Visits.start(${m.id})">VISITAR</button></div>`;
// 029:                 });
// 030:             }
// 031:         }
// 032:         window.Nav.goTo('tela-visita');
// 033:     },
// 034: 
// 035:     // 036: GRAVA A VISITA NO BANCO (SISAB)
// 037:     async save() {
// 038:         const motivos = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(i => i.value);
// 039:         const relato = document.getElementById('v-relato').value.toUpperCase().trim();
// 040:         if(motivos.length === 0 || !relato) return window.Utils.CustomModals.alert("MOTIVOS E RELATO SÃO OBRIGATÓRIOS.");
// 041:         const visita = {
// 042:             pacienteId: window.AppState.activePatient.id,
// 043:             nome: window.AppState.activePatient.nome,
// 044:             dataTS: Date.now(),
// 045:             dataBR: document.getElementById('v-data').value,
// 046:             turno: document.getElementById('v-turno').value,
// 047:             motivos: motivos.join(", "),
// 048:             relato: relato,
// 049:             pa: document.getElementById('v-pa').value,
// 050:             hgt: document.getElementById('v-hgt').value,
// 051:             pendencia: document.getElementById('v-pendencia').value.toUpperCase().trim(),
// 052:             resolvida: false
// 053:         };
// 054:         await window.DB.put("visitas", visita);
// 055:         await window.Utils.CustomModals.alert("VISITA REGISTRADA!");
// 056:         window.Nav.goTo('tela-home', true);
// 057:     },
// 058: 
// 059:     // 060: CONTROLE DE PENDENCIAS DO TERRITORIO
// 061:     async viewPendencies() {
// 062:         const todas = await window.DB.getAll("visitas");
// 063:         const ativas = todas.filter(v => v.pendencia && !v.resolvida);
// 064:         const list = document.getElementById('lista-resultados');
// 065:         list.innerHTML = `<h3>PENDÊNCIAS ATIVAS NO SETOR (${ativas.length})</h3>`;
// 066:         if(ativas.length === 0) list.innerHTML += "<p>TUDO EM DIA!</p>";
// 067:         else ativas.forEach(v => {
// 068:             list.innerHTML += `<div class="card" style="border-left-color:var(--warning)"><strong>${v.nome}</strong><br>PENDENTE: ${v.pendencia}<br><button class="btn btn-sm btn-main" style="margin-top:10px" onclick="window.Visits.resolvePendency(${v.id})">RESOLVER</button></div>`;
// 069:         });
// 070:         window.Nav.goTo('tela-resultados');
// 071:     },
// 072: 
// 073:     // 074: RESOLVE PENDENCIA E ARQUIVA
// 075:     async resolvePendency(id) {
// 076:         const v = await window.DB.get("visitas", id);
// 077:         const sol = await window.Utils.CustomModals.prompt(`RESOLVENDO PARA: ${v.nome}\nO QUE FOI FEITO?`);
// 078:         if(!sol) return;
// 079:         v.resolvida = true; v.relatoResolvido = sol.toUpperCase(); v.dataResolvido = new Date().toLocaleString();
// 080:         await window.DB.put("visitas", v);
// 081:         await window.DB.put("arquivo_pendencias", { visitaId: v.id, pacienteId: v.pacienteId, solucao: v.relatoResolvido });
// 082:         await window.Utils.CustomModals.alert("RESOLVIDO!"); this.viewPendencies();
// 083:     },
// 084: 
// 085:     // 086: HISTORICO COMPLETO
// 087:     async viewHistory(id) {
// 088:         const h = await window.DB.getByIndex("visitas", "pacienteId", id);
// 089:         h.sort((a,b) => b.dataTS - a.dataTS);
// 090:         const list = document.getElementById('lista-historico');
// 091:         list.innerHTML = h.map(v => `<div class="card"><strong>${v.dataBR} (${v.turno})</strong><br><small>${v.motivos}</small><p>${v.relato}</p>${v.pendencia?`<div class="pendencia-ativa-no-card">${v.resolvida?'✅':'⚠️'} ${v.pendencia}</div>`:''}</div>`).join('') || "SEM VISITAS.";
// 092:         window.Nav.goTo('tela-historico');
// 093:     }
// 094: };
