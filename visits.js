/**
 * 005: MÓDULO DE VISITAS E GESTÃO DE PENDÊNCIAS
 * SISTEMA: ACS PRO V12.2 - OSASCO FIELD SYSTEM
 * 
 * Gerencia o registro de atendimentos, sinais vitais e alertas do território.
 */

window.Visits = {

    // 001: INICIALIZA O FORMULÁRIO DE VISITA
    async start(id) {
        const p = await DB.get("municipes", id);
        if (!p) return Utils.CustomModals.alert("ERRO: PACIENTE NÃO LOCALIZADO.");

        AppState.activePatient = p;
        AppState.visitStartTime = new Date();

        // Atualização visual da tela de visita
        document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome} (${Utils.calculateAge(p.nasc)} ANOS)`;
        document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
        
        // Reset de campos
        document.getElementById('v-relato').value = "";
        document.getElementById('v-pendencia').value = "";
        document.getElementById('v-pa').value = "";
        document.getElementById('v-hgt').value = "";
        document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);

        // 002: LÓGICA DE NÚCLEO FAMILIAR (EXIBE DEPENDENTES SE FOR O CHEFE)
        const famArea = document.getElementById('v-familiares-area'); 
        if (famArea) {
            famArea.innerHTML = "";
            if (p.isResp === 'SIM') {
                // Busca todos os cidadãos que possuem este paciente como Responsável Familiar
                const familiares = await DB.getByIndex("municipes", "respId", p.id);
                if (familiares.length > 0) {
                    famArea.innerHTML = `<label style="color:var(--primary); margin-top:15px;">DEPENDENTES NO ENDEREÇO:</label>`;
                    familiares.forEach(f => {
                        famArea.innerHTML += `
                            <div class="card" style="padding:10px; margin-bottom:5px; border-left:4px solid #17a2b8;">
                                <div style="font-size:13px; font-weight:bold;">${f.nome}</div>
                                <div style="font-size:10px; color:#666;">PARENTESCO: ${f.relacao} | IDADE: ${Utils.calculateAge(f.nasc)} ANOS</div>
                                <button class="btn btn-sm btn-main" style="margin-top:5px; width:auto;" onclick="Visits.start(${f.id})">VISITAR ESTE</button>
                            </div> `;
                    });
                }
            }
        }

        Nav.goTo('tela-visita');
    },

    // 003: SALVAMENTO DA VISITA NO BANCO
    async save() {
        const motivos = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(i => i.value);
        const relato = document.getElementById('v-relato').value.trim();
        const pendencia = document.getElementById('v-pendencia').value.trim();
        const pa = document.getElementById('v-pa').value;
        const hgt = document.getElementById('v-hgt').value;

        // Validação básica SISAB
        if (motivos.length === 0) return Utils.CustomModals.alert("ATENÇÃO: SELECIONE PELO MENOS UM MOTIVO (SISAB).");
        if (!relato) return Utils.CustomModals.alert("ATENÇÃO: O RELATO DA VISITA É OBRIGATÓRIO.");

        const visitaData = {
            pacienteId: AppState.activePatient.id,
            nome: AppState.activePatient.nome,
            dataTS: Date.now(),
            dataBR: new Date().toLocaleDateString('pt-BR'),
            turno: document.getElementById('v-turno').value,
            motivos: motivos.join(", "),
            relato: relato.toUpperCase(),
            pa: pa,
            hgt: hgt,
            pendencia: pendencia.toUpperCase(),
            resolvida: false, 
            dataResolvido: "",
            relatoResolvido: ""
        };

        try {
            await DB.put("visitas", visitaData);
            await Utils.CustomModals.alert("VISITA REGISTRADA COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (err) {
            Utils.CustomModals.alert("FALHA AO SALVAR: " + err.message);
        }
    },

    // 004: HISTÓRICO DE VISITAS DO CIDADÃO
    async viewHistory(id) {
        const p = await DB.get("municipes", id);
        const visitas = await DB.getByIndex("visitas", "pacienteId", id);
        
        // Ordena: Mais recentes primeiro
        visitas.sort((a, b) => b.dataTS - a.dataTS);

        const list = document.getElementById('lista-historico');
        document.getElementById('hist-nome').innerText = `HISTÓRICO: ${p.nome}`;
        list.innerHTML = "";

        if (visitas.length === 0) {
            list.innerHTML = "<p style='text-align:center; padding:20px;'>SEM HISTÓRICO PARA ESTE CIDADÃO.</p>";
        }

        visitas.forEach(v => {
            list.innerHTML += `
                <div class="card" style="border-left-color: #999; font-size: 13px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>📅 ${v.dataBR} (${v.turno})</span>
                        <span>${v.pa ? 'PA: '+v.pa : ''} ${v.hgt ? '| HGT: '+v.hgt : ''}</span>
                    </div>
                    <div style="margin:5px 0;"><strong>MOTIVOS:</strong> ${v.motivos}</div>
                    <div style="background:#f9f9f9; padding:8px; border-radius:5px; border:1px solid #eee;">
                        "${v.relato}"
                    </div>
                    ${v.pendencia ? `
                        <div class="pendencia-ativa-no-card" style="background:${v.resolvida ? '#e8f5e9' : '#fff9c4'};">
                            <div>
                                <b>${v.resolvida ? '✅ RESOLVIDO' : '⚠️ PENDENTE'}:</b> ${v.pendencia}
                                ${v.resolvida ? `<br><small>SOLUÇÃO: ${v.relatoResolvido} (${v.dataResolvido})</small>` : ''}
                            </div>
                            ${!v.resolvida ? `<button class="btn-icon" onclick="Visits.resolvePendency(${v.id})">✅</button>` : ''}
                        </div>` : ''}
                </div>`;
        });
        Nav.goTo('tela-historico');
    },

    // 005: CONTROLE GERAL DE PENDÊNCIAS DO TERRITÓRIO
    async viewPendencies() {
        const todas = await DB.getAll("visitas");
        const ativas = todas.filter(v => v.pendencia && !v.resolvida);
        
        const list = document.getElementById('lista-resultados');
        list.innerHTML = `<h3 style="text-align:center">PENDÊNCIAS ATIVAS (${ativas.length})</h3>`;

        if (ativas.length === 0) {
            list.innerHTML += "<p style='text-align:center; padding:30px; opacity:0.6;'>NENHUMA PENDÊNCIA NO TERRITÓRIO.</p>";
        } else {
            for (const v of ativas) {
                list.innerHTML += `
                    <div class="card card-pendencia">
                        <div class="info-label">CIDADÃO</div>
                        <div class="info-valor"><strong>${v.nome}</strong></div>
                        <div class="pendencia-ativa-no-card">
                            <span>${v.pendencia}</span>
                            <div style="display:flex; gap:5px;">
                                <button class="btn-icon" onclick="Visits.editPendency(${v.id})">✏️</button>
                                <button class="btn-icon" onclick="Visits.resolvePendency(${v.id})">✅</button>
                            </div>
                        </div>
                        <div style="font-size:10px; margin-top:8px; color:#999;">CRIADA EM: ${v.dataBR}</div>
                    </div> `;
            }
        }
        Nav.goTo('tela-resultados');
    },

    // 006: RESOLUÇÃO E ARQUIVAMENTO
    async resolvePendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        const solucao = await Utils.CustomModals.prompt(`RESOLVER PENDÊNCIA:\n${v.pendencia}\n\nO QUE FOI FEITO?`);
        
        // Proteção: Se cancelar ou deixar vazio, não faz nada
        if (!solucao) return;

        try {
            v.resolvida = true;
            v.relatoResolvido = solucao.toUpperCase();
            v.dataResolvido = new Date().toLocaleString('pt-BR');
            await DB.put("visitas", v);

            // Grava no Arquivo Morto
            const registroArquivo = {
                visitaId: v.id,
                pacienteId: v.pacienteId,
                nome: v.nome,
                pendenciaOriginal: v.pendencia,
                solucao: v.relatoResolvido,
                dataArquivamento: Date.now(),
                dataArquivamentoBR: v.dataResolvido
            };
            await DB.put("arquivo_pendencias", registroArquivo);
            
            await Utils.CustomModals.alert("ARQUIVADO COM SUCESSO!");
            
            // Recarrega visualização atual
            if (!document.getElementById('tela-resultados').classList.contains('hidden')) this.viewPendencies();
            else this.viewHistory(v.pacienteId);
        } catch (err) {
            Utils.CustomModals.alert("ERRO AO ARQUIVAR: " + err.message);
        }
    },

    // 007: EDIÇÃO RÁPIDA DE TEXTO
    async editPendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        const novoTexto = await Utils.CustomModals.prompt("CORRIGIR TEXTO:", v.pendencia);
        if (novoTexto) {
            v.pendencia = novoTexto.toUpperCase();
            await DB.put("visitas", v);
            this.viewPendencies();
        }
    },

    // 008: REVERSÃO (TRAZER DO ARQUIVO MORTO PARA ATIVA)
    async revertPendency(arquivoId) {
        const arquivo = await DB.get("arquivo_pendencias", arquivoId);
        if (!arquivo) return;

        const confirmar = await Utils.CustomModals.confirm(`REATIVAR PENDÊNCIA DE ${arquivo.nome}?`);
        if (confirmar) {
            const v = await DB.get("visitas", arquivo.visitaId);
            if (v) {
                v.resolvida = false;
                v.dataResolvido = "";
                v.relatoResolvido = "";
                await DB.put("visitas", v);
                await DB.delete("arquivo_pendencias", arquivoId);
                await Utils.CustomModals.alert("PENDÊNCIA REABERTA.");
                location.reload(); 
            }
        }
    }
};
