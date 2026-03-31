// 001: ////////////////////////////////////////////////////////////////////////////////
// 002: // ARQUIVO: VISITS.JS - GERENCIAMENTO DE VISITAS DOMICILIARES E PENDENCIAS   //
// 003: // VERSÃO DEFINITIVA V12.2 - SINAIS VITAIS E ARQUIVO MORTO INTEGRADOS        //
// 004: ////////////////////////////////////////////////////////////////////////////////
// 005: 
// 006: window.Visits = {
// 007: 
// 008:     // 009: INICIALIZA O PROCESSO DE VISITA PARA UM CIDADÃO ESPECÍFICO
// 010:     async start(id) {
// 011:         const p = await window.DB.get("municipes", id);
// 012:         if (!p) return window.Utils.CustomModals.alert("CIDADÃO NÃO ENCONTRADO NA BASE.");
// 013: 
// 114:         window.AppState.activePatient = p;
// 115:         
// 116:         // 117: PREENCHIMENTO DA INTERFACE DE VISITA
// 118:         document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome} (${window.Utils.calculateAge(p.nasc)} ANOS)`;
// 119:         document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
// 120:         document.getElementById('v-relato').value = "";
// 121:         document.getElementById('v-pendencia').value = "";
// 122:         document.getElementById('v-pa').value = "";
// 123:         document.getElementById('v-hgt').value = "";
// 124:         
// 125:         // 126: RESET DE MOTIVOS ANTERIORES
// 127:         document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);
// 128: 
// 129:         // 130: LÓGICA DE VISITA SEQUENCIAL (OUTROS MORADORES DA MESMA CASA)
// 131:         const containerMoradores = document.getElementById('v-familiares-area');
// 132:         if(containerMoradores) {
// 133:             containerMoradores.innerHTML = "";
// 134:             const todosNaCasa = await window.DB.getByIndex("municipes", "enderecoChave", [p.rua, p.num, p.comp]);
// 135:             const outrosMoradores = todosNaCasa.filter(m => m.id !== p.id);
// 136:             
// 137:             if(outrosMoradores.length > 0) {
// 138:                 containerMoradores.innerHTML = `<label style="color:var(--primary); font-size:11px;">OUTROS MORADORES NESTE COMPLEMENTO:</label>`;
// 139:                 outrosMoradores.forEach(m => {
// 140:                     containerMoradores.innerHTML += `
// 141:                         <div class="card-familiar">
// 142:                             <strong>${m.nome}</strong> (${m.isResp === 'SIM' ? 'CHEFE' : m.relacao})
// 143:                             <button class="btn-xs btn-outline" style="float:right;" onclick="window.Visits.start(${m.id})">VISITAR</button>
// 144:                         </div>`;
// 145:                 });
// 146:             }
// 147:         }
// 148:         window.Nav.goTo('tela-visita');
// 149:     },
// 150: 
// 151:     // 152: SALVAMENTO DO REGISTRO DE ATIVIDADE DIÁRIA (SISAB)
// 153:     async save() {
// 154:         const motivosEleitos = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(i => i.value);
// 155:         const relatoTexto = document.getElementById('v-relato').value.toUpperCase().trim();
// 156:         
// 157:         if(motivosEleitos.length === 0) return window.Utils.CustomModals.alert("ATENÇÃO: SELECIONE O MOTIVO DA VISITA.");
// 158:         if(!relatoTexto) return window.Utils.CustomModals.alert("ATENÇÃO: O RELATO DA EVOLUÇÃO É OBRIGATÓRIO (SISAB).");
// 159: 
// 160:         const objetoVisita = {
// 161:             pacienteId: window.AppState.activePatient.id,
// 162:             nome: window.AppState.activePatient.nome,
// 163:             dataTS: Date.now(),
// 164:             dataBR: document.getElementById('v-data').value,
// 165:             turno: document.getElementById('v-turno').value,
// 166:             motivos: motivosEleitos.join(", "),
// 167:             relato: relatoTexto,
// 168:             pa: document.getElementById('v-pa').value,
// 169:             hgt: document.getElementById('v-hgt').value,
// 170:             pendencia: document.getElementById('v-pendencia').value.toUpperCase().trim(),
// 171:             resolvida: false
// 172:         };
// 173: 
// 174:         try {
// 175:             await window.DB.put("visitas", objetoVisita);
// 176:             await window.Utils.CustomModals.alert("REGISTRO DE CAMPO SALVO!");
// 177:             window.Nav.goTo('tela-home', true);
// 178:         } catch(e) { window.Utils.CustomModals.alert("ERRO AO PROCESSAR VISITA."); }
// 179:     },
// 180: 
// 181:     // 182: VISUALIZAÇÃO DE TODAS AS PENDÊNCIAS ATIVAS NO SETOR
// 183:     async viewPendencies() {
// 184:         const todas = await window.DB.getAll("visitas");
// 185:         const pendentesAtivas = todas.filter(v => v.pendencia && !v.resolvida);
// 186:         const listContainer = document.getElementById('lista-resultados');
// 187:         
// 188:         listContainer.innerHTML = `<h3 style="text-align:center;">PENDÊNCIAS DO TERRITÓRIO (${pendentesAtivas.length})</h3>`;
// 189:         
// 190:         if(pendentesAtivas.length === 0) {
// 191:             listContainer.innerHTML += "<p style='text-align:center; padding:30px;'>SETOR SEM PENDÊNCIAS.</p>";
// 192:         } else {
// 193:             pendentesAtivas.forEach(v => {
// 194:                 listContainer.innerHTML += `
// 195:                     <div class="card card-pendencia">
// 196:                         <strong>${v.nome}</strong><br>
// 197:                         <small style="color:var(--danger)">PENDENTE: ${v.pendencia}</small>
// 198:                         <div style="margin-top:10px; display:flex; gap:10px;">
// 199:                             <button class="btn btn-sm btn-main" onclick="window.Visits.resolvePendency(${v.id})">RESOLVER AGORA</button>
// 200:                         </div>
// 201:                     </div>`;
// 202:             });
// 203:         }
// 204:         window.Nav.goTo('tela-resultados');
// 205:     },
// 206: 
// 207:     // 208: PROCEDIMENTO DE RESOLUÇÃO E ARQUIVAMENTO (ARQUIVO MORTO)
// 209:     async resolvePendency(id) {
// 210:         const visitaOriginal = await window.DB.get("visitas", id);
// 211:         if(!visitaOriginal) return;
// 212: 
// 213:         const solucaoTxt = await window.Utils.CustomModals.prompt("O QUE FOI FEITO PARA RESOLVER?");
// 214:         if(!solucaoTxt) return;
// 215: 
// 216:         visitaOriginal.resolvida = true;
// 217:         visitaOriginal.relatoResolvido = solucaoTxt.toUpperCase();
// 218:         visitaOriginal.dataResolvido = new Date().toLocaleString('pt-BR');
// 219: 
// 220:         await window.DB.put("visitas", visitaOriginal);
// 221:         
// 222:         // 223: REGISTRA NO ARQUIVO CONFORME PROTOCOLO DE AUDITORIA
// 224:         await window.DB.put("arquivo_pendencias", { 
// 225:             visitaId: visitaOriginal.id, 
// 226:             pacienteId: visitaOriginal.pacienteId, 
// 227:             solucao: visitaOriginal.relatoResolvido,
// 228:             data: visitaOriginal.dataResolvido
// 229:         });
// 230: 
// 231:         await window.Utils.CustomModals.alert("PENDÊNCIA RESOLVIDA E ARQUIVADA!");
// 232:         this.viewPendencies();
// 233:     },
// 234: 
// 235:     // 236: HISTÓRICO COMPLETO DE CADA CIDADÃO
// 237:     async viewHistory(id) {
// 238:         const listaBruta = await window.DB.getByIndex("visitas", "pacienteId", id);
// 239:         listaBruta.sort((a,b) => b.dataTS - a.dataTS);
// 240:         const areaHist = document.getElementById('lista-historico');
// 241:         
// 242:         areaHist.innerHTML = listaBruta.map(v => `
// 243:             <div class="card" style="border-left-color: #718096; font-size:13px;">
// 244:                 <div style="display:flex; justify-content:space-between; font-weight:900; color:var(--primary);">
// 245:                     <span>📅 ${v.dataBR} (${v.turno})</span>
// 246:                     <span>${v.pa ? 'PA: '+v.pa : ''}</span>
// 247:                 </div>
// 248:                 <div style="margin:8px 0;"><strong>MOTIV.:</strong> ${v.motivos}</div>
// 249:                 <div style="background:#f1f5f9; padding:10px; border-radius:10px;">"${v.relato}"</div>
// 250:                 ${v.pendencia ? `<div class="pendencia-ativa-no-card" style="margin-top:10px; background:${v.resolvida?'#f0fff4':'#fffaf0'}">
// 251:                     ${v.resolvida ? '✅ RESOLVIDA: ' : '⚠️ PENDENTE: '}${v.pendencia}
// 252:                     ${v.resolvida ? `<br><small>SOLUÇÃO: ${v.relatoResolvido}</small>` : ''}
// 253:                 </div>` : ''}
// 254:             </div>`).join('') || "<p style='text-align:center;'>NENHUMA VISITA ENCONTRADA.</p>";
// 255:         
// 256:         window.Nav.goTo('tela-historico');
// 257:     }
// 258: };
