// 001: MODULO DE REGISTRO DE VISITAS DOMICILIARES E GESTAO DE PENDENCIAS
// 002: FOCO EM SINAIS VITAIS, HISTORICO ATIVO E ARQUIVO MORTO DE PENDENCIAS (PROTOCOLO OSASCO)
// 003: ESTE ARQUIVO GERENCIA A PRODUTIVIDADE DIARIA E O FLUXO DE SAUDE DO CIDADAO
const Visits = {

    // 004: INICIALIZA O FORMULARIO DE VISITA PARA UM PACIENTE ESPECIFICO
    async start(id) {
        // 005: RECUPERA O PACIENTE DO BANCO PARA VALIDAR EXISTENCIA
        const p = await DB.get("municipes", id);
        if (!p) return Utils.CustomModals.alert("ERRO CRITICO: PACIENTE NÃO LOCALIZADO NA BASE.");

        // 006: DEFINE O PACIENTE ATIVO E O TIMESTAMP DE INICIO (PARA LOGS FUTUROS)
        AppState.activePatient = p;
        AppState.visitStartTime = new Date();

        // 007: ATUALIZA A INTERFACE COM NOME E IDADE (CALCULO ONIPRESENTE)
        document.getElementById('v-nome-label').innerText = `VISITA: ${p.nome} (${Utils.calculateAge(p.nasc)} ANOS)`;
        document.getElementById('v-data').value = new Date().toLocaleDateString('pt-BR');
        
        // 008: RESET DE CAMPOS PARA GARANTIR LIMPEZA ENTRE VISITAS DIFERENTES
        document.getElementById('v-relato').value = "";
        document.getElementById('v-pendencia').value = "";
        document.getElementById('v-pa').value = "";
        document.getElementById('v-hgt').value = "";
        
        // 009: DESMARCAR TODOS OS CHECKBOXES DE MOTIVOS OFICIAIS DO SISAB
        document.querySelectorAll('input[name="v-motivo"]').forEach(cb => cb.checked = false);

        // 010: MOTOR DE NAVEGACAO FAMILIAR DENTRO DA VISITA (PARA AGILIDADE EM CAMPO)
        // 011: SE O PACIENTE FOR CHEFE, LISTA DEPENDENTES PARA VISITA EM SEQUENCIA SEM SAIR DA TELA
        const famArea = document.getElementById('v-familiares-area'); 
        if (famArea) {
            famArea.innerHTML = "";
            if (p.isResp === 'SIM') {
                const familiares = await DB.getByIndex("municipes", "respId", p.id);
                if (familiares.length > 0) {
                    famArea.innerHTML = `<label style="background:#eee; padding:5px; margin-top:10px;">NÚCLEO FAMILIAR NO ENDEREÇO:</label>`;
                    familiares.forEach(f => {
                        famArea.innerHTML += `
                            <div class="card-familiar" style="padding:10px; background:#f9f9f9; border:1px solid #ddd; margin-bottom:5px; border-radius:8px;">
                                <div style="font-size:12px; font-weight:bold;">${f.nome}</div>
                                <div style="font-size:10px; color:#666;">PARENTESCO: ${f.relacao}</div>
                                <button class="btn-xs btn-main" style="margin-top:5px;" onclick="Visits.start(${f.id})">VISITAR AGORA</button>
                            </div> `;
                    });
                }
            }
        }

        // 012: DIRECIONA PARA A TELA DE VISITA E ROLA AO TOPO
        Nav.goTo('tela-visita');
    },

    // 013: PERSISTENCIAS DOS DADOS DA VISITA COM VALIDACAO DE CAMPOS OBRIGATORIOS
    async save() {
        // 014: EXTRAÇÃO DOS VALORES DA INTERFACE
        const motivos = Array.from(document.querySelectorAll('input[name="v-motivo"]:checked')).map(i => i.value);
        const relato = document.getElementById('v-relato').value.toUpperCase().trim();
        const pendencia = document.getElementById('v-pendencia').value.toUpperCase().trim();
        const pa = document.getElementById('v-pa').value;
        const hgt = document.getElementById('v-hgt').value;

        // 015: BLOQUEIO DE SEGURANCA: OBRIGATORIO MOTIVO E RELATO DA EVOLUCAO
        if (motivos.length === 0) return Utils.CustomModals.alert("ATENÇÃO: SELECIONE OS MOTIVOS DA VISITA (SISAB).");
        if (!relato) return Utils.CustomModals.alert("ATENÇÃO: O RELATO DA EVOLUÇÃO É OBRIGATÓRIO.");

        // 016: MONTAGEM DO OBJETO DE VISITA PARA O INDEXEDDB
        const visitaData = {
            pacienteId: AppState.activePatient.id,
            nome: AppState.activePatient.nome,
            dataTS: Date.now(),
            dataBR: new Date().toLocaleDateString('pt-BR'),
            turno: document.getElementById('v-turno').value,
            motivos: motivos.join(", "),
            relato: relato,
            pa: pa,
            hgt: hgt,
            pendencia: pendencia,
            resolvida: false, 
            dataResolvido: "",
            relatoResolvido: ""
        };

        // 017: TENTATIVA DE GRAVAÇÃO COM TRATAMENTO DE ERROS DE CONCORRENCIA
        try {
            await DB.put("visitas", visitaData);
            await Utils.CustomModals.alert("VISITA SALVA COM SUCESSO!");
            Nav.goTo('tela-home', true);
        } catch (err) {
            Utils.CustomModals.alert("ERRO AO SALVAR REGISTRO: " + err.message);
        }
    },

    // 018: RENDERIZACAO DO HISTORICO EM ORDEM CRONOLOGICA DECRESCENTE
    async viewHistory(id) {
        const p = await DB.get("municipes", id);
        const visitas = await DB.getByIndex("visitas", "pacienteId", id);
        
        // 019: ORDENACAO: MAIS RECENTE PRIMEIRO
        visitas.sort((a, b) => b.dataTS - a.dataTS);

        const list = document.getElementById('lista-historico');
        document.getElementById('hist-nome').innerText = `HISTÓRICO: ${p.nome}`;
        list.innerHTML = "";

        if (visitas.length === 0) {
            list.innerHTML = "<p style='text-align:center;'>ESTE CIDADÃO AINDA NÃO POSSUI VISITAS REGISTRADAS.</p>";
        }

        // 020: CONSTRUCAO DINAMICA DOS CARDS DE HISTORICO
        for (const v of visitas) {
            list.innerHTML += `
                <div class="card" style="border-left-color: #6c757d; font-size: 13px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:var(--primary);">
                        <span>📅 ${v.dataBR} (${v.turno})</span>
                        <span>${v.pa ? 'PA: '+v.pa : ''} ${v.hgt ? '| HGT: '+v.hgt : ''}</span>
                    </div>
                    <div style="margin:8px 0; font-size:11px;"><strong>MOTIVOS:</strong> ${v.motivos}</div>
                    <div style="background:#f1f3f5; padding:10px; border-radius:8px; border-left:3px solid #ccc;">
                        <strong>EVOLUÇÃO:</strong> "${v.relato}"
                    </div>
                    ${v.pendencia ? `
                        <div class="pendencia-ativa-no-card" style="background:${v.resolvida ? '#e8f5e9' : '#fff8e1'};">
                            <div style="flex:1;">
                                <b style="color:${v.resolvida ? '#218838' : '#795548'}">
                                    ${v.resolvida ? '✅ RESOLVIDA' : '⚠️ PENDENTE'}: ${v.pendencia}
                                </b>
                                ${v.resolvida ? `<br><small style="color:#666">SOLUÇÃO: ${v.relatoResolvido} EM ${v.dataResolvido}</small>` : ''}
                            </div>
                            ${v.resolvida ? '' : `<button class="btn-icon" onclick="Visits.resolvePendency(${v.id})">✅</button>`}
                        </div> ` : ''}
                </div> `;
        }
        Nav.goTo('tela-historico');
    },

    // 021: GERENCIAMENTO DE PENDENCIAS DO TERRITORIO
    async viewPendencies() {
        const todas = await DB.getAll("visitas");
        const ativas = todas.filter(v => v.pendencia && !v.resolvida);
        
        const list = document.getElementById('lista-resultados');
        list.innerHTML = `<h3 style="text-align:center">CONTROLE DE PENDÊNCIAS (${ativas.length})</h3>`;

        if (ativas.length === 0) {
            list.innerHTML += "<p style='text-align:center; padding:20px;'>PARABÉNS! NENHUMA PENDÊNCIA ATIVA NO MOMENTO.</p>";
        } else {
            for (const v of ativas) {
                list.innerHTML += `
                    <div class="card" style="border-left-color: var(--warning)">
                        <div class="info-label">CIDADÃO / ENDEREÇO</div>
                        <div class="info-valor"><strong>${v.nome}</strong></div>
                        <div class="pendencia-ativa-no-card">
                            <span style="font-weight:bold;">${v.pendencia}</span>
                            <div style="display:flex; gap:5px;">
                                <button class="btn-icon" title="EDITAR TEXTO" onclick="Visits.editPendency(${v.id})">✏️</button>
                                <button class="btn-icon" title="MARCAR COMO FEITO" onclick="Visits.resolvePendency(${v.id})">✅</button>
                            </div>
                        </div>
                        <div style="font-size:10px; margin-top:8px; color:#888;">GERADA NA VISITA DE: ${v.dataBR}</div>
                    </div> `;
            }
        }
        Nav.goTo('tela-resultados');
    },

    // 022: RESOLUCAO E ARQUIVAMENTO DE PENDENCIA (PROTOCOLO ARQUIVO MORTO)
    async resolvePendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        // 023: SOLICITA A DESCRICAO DO DESFECHO (OBLIGATORIO)
        const solucao = await Utils.CustomModals.prompt(`RESOLUÇÃO PARA: ${v.nome}\nO QUE FOI FEITO PARA RESOLVER ESSA PENDÊNCIA?`);
        
        if (solucao && solucao.trim() !== "") {
            // 024: ATUALIZA NO STORE DE VISITAS
            v.resolvida = true;
            v.relatoResolvido = solucao.toUpperCase().trim();
            v.dataResolvido = new Date().toLocaleString('pt-BR');
            await DB.put("visitas", v);

            // 025: CRIA O REGISTRO NO ARQUIVO MORTO PARA AUDITORIA FUTURA
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
            
            await Utils.CustomModals.alert("RESOLVIDO COM SUCESSO!");
            
            // 026: RECARREGA A TELA ATUAL PARA ATUALIZAR STATUS VISUAL
            if (!document.getElementById('tela-resultados').classList.contains('hidden')) this.viewPendencies();
            else this.viewHistory(v.pacienteId);
        } else {
            Utils.CustomModals.alert("A JUSTIFICATIVA DE RESOLUÇÃO É NECESSÁRIA PARA ARQUIVAR.");
        }
    },

    // 027: FUNCAO PARA CORRECAO RAPIDA DE TEXTO DE PENDENCIA (ICONE LAPIS)
    async editPendency(id) {
        const v = await DB.get("visitas", id);
        if (!v) return;

        const novoTexto = await Utils.CustomModals.prompt("CORRIGIR TEXTO DA PENDÊNCIA:", v.pendencia);
        if (novoTexto && novoTexto.trim() !== "") {
            v.pendencia = novoTexto.toUpperCase().trim();
            await DB.put("visitas", v);
            this.viewPendencies();
        }
    },

    // 028: REVERSAO DE PENDENCIA (RETIRAR DO ARQUIVO MORTO)
    async revertPendency(arquivoId) {
        const arquivo = await DB.get("arquivo_pendencias", arquivoId);
        if (!arquivo) return;

        const confirmar = await Utils.CustomModals.confirm(`REATIVAR PENDÊNCIA DE ${arquivo.nome}?\nELA VOLTARÁ PARA A LISTA DE ATIVAS.`);
        if (confirmar) {
            const justificativa = await Utils.CustomModals.prompt("POR QUE ESTÁ REABRINDO ESTA PENDÊNCIA?");
            if (!justificativa) return Utils.CustomModals.alert("JUSTIFICATIVA OBRIGATÓRIA.");

            const v = await DB.get("visitas", arquivo.visitaId);
            if (v) {
                v.resolvida = false;
                v.relato += `\n[REATIVADO EM ${new Date().toLocaleString()}: ${justificativa.toUpperCase()}]`;
                v.dataResolvido = "";
                v.relatoResolvido = "";
                
                await DB.put("visitas", v);
                await DB.delete("arquivo_pendencias", arquivoId);
                await Utils.CustomModals.alert("PENDÊNCIA REABERTA COM SUCESSO.");
                location.reload(); 
            }
        }
    }
};
