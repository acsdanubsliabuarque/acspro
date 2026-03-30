const Visits = {
    async start(id) {
        const p = await DB.get("municipes", id);
        AppState.activePatient = p;
        AppState.visitStartTime = new Date();
        document.getElementById('v-nome-txt').innerText = p.nome;
        document.getElementById('v-timer-info').innerText = `INÍCIO ÀS: ${AppState.visitStartTime.toLocaleTimeString()}`;
        document.getElementById('v-alerta').innerHTML = `<strong>NOTAS:</strong> ${p.obs || 'NENHUMA'}`;
        document.getElementById('v-relato').value = ""; document.getElementById('v-pendencia').value = "";
        document.querySelectorAll('input[name="motivo"]').forEach(c => c.checked = false);
        const vGest = document.getElementById('v-alerta-gestante');
        if (p.gest) {
            const gi = Utils.getGestationalInfo(p.dum);
            vGest.innerHTML = `<strong>GESTANTE:</strong> ${gi.res} | DPP: ${gi.dpp}`;
            vGest.classList.remove('hidden'); vGest.className = "gestante-badge-info";
        } else vGest.classList.add('hidden');
        const famDiv = document.getElementById('v-familiares');
        const famList = document.getElementById('lista-familiares-vinculados');
        famList.innerHTML = "";
        if (p.isResp === 'SIM') {
            const parts = await DB.getByIndex("municipes", "respId", p.id);
            if (parts.length) {
                famDiv.classList.remove('hidden');
                parts.forEach(m => famList.innerHTML += `<div class="card-familiar">${m.nome} (${m.relacao})<br><button class="btn btn-xs btn-outline" onclick="Visits.start(${m.id})">VISITAR</button></div>`);
            } else famDiv.classList.add('hidden');
        } else famDiv.classList.add('hidden');
        Nav.goTo('tela-visita');
    },
    async save() {
        const motivos = Array.from(document.querySelectorAll('input[name="motivo"]:checked')).map(i => i.value);
        const relato = document.getElementById('v-relato').value.trim();
        if (!motivos.length || !relato) return CustomModals.alert("ERRO: MOTIVOS E RELATO SÃO OBRIGATÓRIOS.");
        const visit = { pacienteId: AppState.activePatient.id, nome: AppState.activePatient.nome, dataTS: Date.now(), motivos: motivos.join(", "), relato: relato.toUpperCase(), pendencia: document.getElementById('v-pendencia').value.toUpperCase(), resolvida: false, relatoResolvido: "", dataResolvido: "" };
        await DB.add("visitas", visit);
        await CustomModals.alert("VISITA SALVA COM SUCESSO!");
        Nav.goTo('tela-home', true);
    },
    async viewHistory(id) {
        const p = await DB.get("municipes", id);
        const hist = (await DB.getByIndex("visitas", "pacienteId", id)).sort((a,b) => b.dataTS - a.dataTS);
        const header = document.getElementById('hist-nome-header');
        if(header) header.innerText = `HISTÓRICO: ${p.nome}`;
        const list = document.getElementById('lista-historico');
        list.innerHTML = hist.map(v => `
            <div class="card card-historico" style="border-left-color: ${v.pendencia ? (v.resolvida ? '#218838' : '#ffc107') : '#6c757d'}">
                <b>📅 ${new Date(v.dataTS).toLocaleDateString()}</b><br>
                <small><b>MOTIVOS:</b> ${v.motivos}</small>
                <p><b>EVOLUÇÃO:</b> "${v.relato}"</p>
                ${v.pendencia ? `
                    <div style="background:#fff; padding:8px; border-radius:5px; border:1px solid #ddd; margin-top:5px;">
                        <b style="color:${v.resolvida ? 'green' : 'red'}">PENDÊNCIA: ${v.pendencia}</b><br>
                        ${v.resolvida ? `
                            <small>✅ RESOLVIDO EM ${v.dataResolvido}: ${v.relatoResolvido}</small><br>
                            <button class="btn btn-xs btn-danger" onclick="Visits.revertPendency(${v.id}, ${p.id})">REVERTER DESFECHO</button>
                        ` : `<small>⚠️ AGUARDANDO RESOLUÇÃO</small>`}
                    </div>` : ''}
            </div>`).join('') || "SEM VISITAS.";
        Nav.goTo('tela-historico');
    },
    async viewPendencies() {
        const all = await DB.getAll("visitas");
        const pends = all.filter(v => v.pendencia && !v.resolvida);
        const list = document.getElementById('lista-resultados');
        list.innerHTML = `<h3>PENDÊNCIAS EM ABERTO (${pends.length})</h3>`;
        if(pends.length === 0) list.innerHTML += "<p>NENHUMA PENDÊNCIA.</p>";
        else {
            for (const p of pends) {
                list.innerHTML += `<div class="card card-pendencia"><b>MUNÍCIPE: ${p.nome}</b><br>PENDÊNCIA: <i style="color:red">${p.pendencia}</i><br><button class="btn btn-save btn-sm" onclick="Visits.resolvePendency(${p.id})">RESOLVER AGORA</button></div>`;
            }
        }
        Nav.goTo('tela-resultados');
    },
    async resolvePendency(id) {
        const relato = await CustomModals.prompt("O QUE FOI FEITO? (OBRIGATÓRIO):");
        if (!relato || relato.trim() === "") return CustomModals.alert("VOCÊ DEVE DESCREVER A SOLUÇÃO.");
        const v = await DB.get("visitas", id);
        v.resolvida = true; v.relatoResolvido = relato.toUpperCase(); v.dataResolvido = new Date().toLocaleString();
        await DB.put("visitas", v); await CustomModals.alert("RESOLVIDO!"); this.viewPendencies();
    },
    async revertPendency(vId, pId) {
        if(await CustomModals.confirm("REVERTER PARA 'EM ABERTO'?")) {
            const v = await DB.get("visitas", vId);
            v.resolvida = false; v.relatoResolvido = ""; v.dataResolvido = "";
            await DB.put("visitas", v); this.viewHistory(pId);
        }
    }
};