/**
 * 006: MOTOR DE ESTADO, NAVEGAÇÃO E INTERFACE (UI)
 * SISTEMA: ACS PRO V12.2 - OSASCO FIELD SYSTEM
 * 
 * Este arquivo integra todos os módulos e gerencia a experiência do usuário.
 */

// 001: ESTADO GLOBAL DA APLICAÇÃO
window.AppState = {
    activePatient: null,
    visitStartTime: null,
    history: ['tela-home'], // Histórico de navegação corrigido
    unsavedChanges: false,
    currentViewMode: 'full', // full, compact, list
    
    markUnsaved() { this.unsavedChanges = true; },
    resetUnsaved() { this.unsavedChanges = false; },
    resetPatient() { this.activePatient = null; this.visitStartTime = null; }
};

// 002: MOTOR DE ROTAS E DIRECIONAMENTO (NAV)
window.Nav = {
    init() {
        // Popula todos os selects de logradouros com a lista oficial de Osasco
        const selects = document.querySelectorAll('.select-ruas');
        const opts = `<option value="">--- ESCOLHA A RUA ---</option>` + 
                     CONFIG_DB.RUAS.map(r => `<option value="${r}">${r}</option>`).join('');
        selects.forEach(s => s.innerHTML = opts);

        // Aplica Máscaras e Maiúsculas Automáticas em tempo real
        document.addEventListener('input', (e) => {
            const el = e.target;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = el.value.toUpperCase(); 
            }
            // Gatilhos de Máscaras do Utils.js
            if (['c-nasc', 'c-dum', 'v-data'].includes(el.id)) el.value = Utils.masks.date(el.value);
            if (el.id === 'c-cpf') el.value = Utils.masks.cpf(el.value);
            if (el.id === 'c-tel') el.value = Utils.masks.phone(el.value);
            if (el.id === 'v-pa') el.value = Utils.masks.pa(el.value);
        });
    },

    // Navega para uma tela específica
    goTo(id, reset = false) {
        if (reset) {
            AppState.history = ['tela-home'];
        } else {
            // Evita duplicar a mesma tela no histórico
            if (AppState.history[AppState.history.length - 1] !== id) {
                AppState.history.push(id);
            }
        }
        
        // Esconde todas as telas e mostra a alvo
        document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        } else {
            console.error("FALHA DE NAVEGAÇÃO: Tela não encontrada ->", id);
        }
    },

    // Volta para a tela anterior
    goBack() {
        if (AppState.history.length > 1) {
            AppState.history.pop(); // Remove a tela atual
            const prev = AppState.history[AppState.history.length - 1];
            
            // Força a exibição sem adicionar novamente ao histórico
            document.querySelectorAll('.container > div').forEach(d => d.classList.add('hidden'));
            document.getElementById(prev).classList.remove('hidden');
        } else {
            this.goTo('tela-home', true);
        }
    },

    // Sai de telas de cadastro com confirmação
    async confirmExit(dest) {
        if (AppState.unsavedChanges) {
            const r = await Utils.CustomModals.confirm("DADOS NÃO SALVOS SERÃO PERDIDOS! DESEJA SAIR?");
            if (!r) return;
        }
        AppState.resetUnsaved();
        if (dest === 'voltar') this.goBack();
        else this.goTo(dest, true);
    }
};

// 003: MOTOR DE INTERFACE (UI) PARA CONSTRUIR OS CARDS
window.UI = {
    // Alterna entre os modos Full, Compacto e Lista
    changeView(mode) {
        AppState.currentViewMode = mode;
        const lastSearch = document.getElementById('lista-resultados').getAttribute('data-last-search');
        if (lastSearch) this.searchPessoa(true); // Atualiza a lista atual com o novo modo
    },

    // CARD COMPLETO: Mostra tudo (Agravos, Pendências, Endereço)
    async buildCardFull(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        const gest = p.gest ? Utils.getGestationalInfo(p.dum) : null;
        
        // Busca pendências ativas para este cidadão
        const visitas = await DB.getByIndex("visitas", "pacienteId", p.id);
        const pends = visitas.filter(v => v.pendencia && !v.resolvida);

        let badges = "";
        if(p.hiper) badges += `<span class="badge bg-hiper">HIPERTENSÃO</span>`;
        if(p.diab) badges += `<span class="badge bg-dia">DIABETES</span>`;
        if(p.gest) badges += `<span class="badge bg-gest">GESTANTE</span>`;
        if(p.saudeMental) badges += `<span class="badge bg-sm">S. MENTAL</span>`;
        if(idade >= 60) badges += `<span class="badge bg-idoso">IDOSO</span>`;
        if(p.acamado) badges += `<span class="badge" style="background:#00838f">ACAMADO</span>`;

        return `
            <div class="card ${p.gest ? 'card-gestante' : ''} ${idade >= 60 ? 'card-idoso' : ''}">
                <div class="info-label">CIDADÃO</div>
                <div class="info-valor" style="font-size:18px;"><strong>${s(p.nome)}</strong></div>
                <div class="grid-2">
                    <div><div class="info-label">NASCIMENTO</div><div class="info-valor">${s(p.nasc)} (${idade} ANOS)</div></div>
                    <div><div class="info-label">CPF</div><div class="info-valor">${s(p.cpf)}</div></div>
                </div>
                <div class="info-label">ENDEREÇO</div>
                <div class="info-valor">${s(p.rua)}, ${s(p.num)} | ${s(p.comp)}</div>
                
                ${gest ? `
                    <div class="gestante-info-box">
                        🤰 IG: ${gest.res} <br> 
                        📅 DPP: ${gest.dpp} | ${gest.tri}
                    </div>` : ''}

                <div style="margin: 10px 0;">${badges || '<small style="opacity:0.5">SEM AGRAVOS CADASTRADOS</small>'}</div>

                ${pends.length > 0 ? `
                    <div class="pendencia-ativa-no-card">
                        <span>⚠️ PENDENTE: ${s(pends[0].pendencia)}</span>
                        <button class="btn-icon" onclick="Visits.resolvePendency(${pends[0].id})">✅</button>
                    </div>` : '' }

                <hr style="opacity:0.1; margin:15px 0;">
                <button class="btn btn-main" onclick="Visits.start(${p.id})">REGISTRAR VISITA</button>
                <div class="grid-2">
                    <button class="btn btn-outline btn-sm" onclick="Visits.viewHistory(${p.id})">HISTÓRICO</button>
                    <button class="btn btn-outline btn-sm" onclick="Registry.prepareEdit(${p.id})">EDITAR CADASTRO</button>
                </div>
            </div>`;
    },

    // CARD COMPACTO: Ideal para busca rápida
    async buildCardCompact(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div class="card" style="padding:12px; border-left-width:5px;" onclick="Visits.start(${p.id})">
                <div style="font-weight:bold; color:var(--primary); font-size:14px;">${s(p.nome)} (${idade} ANOS)</div>
                <div style="font-size:11px; color:#666;">${s(p.rua)}, ${s(p.num)} - ${s(p.comp)}</div>
                <div style="margin-top:5px;">
                    ${p.hiper ? '🔴' : ''} ${p.diab ? '🔵' : ''} ${p.gest ? '💗' : ''} ${idade >= 60 ? '🟣' : ''}
                </div>
            </div>`;
    },

    // MODO LISTA: Apenas texto
    async buildRowList(p) {
        const s = Utils.sanitize;
        const idade = Utils.calculateAge(p.nasc);
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:white; border-bottom:1px solid #eee;" onclick="Registry.prepareEdit(${p.id})">
                <div style="font-size:13px;"><strong>${s(p.nome)}</strong> <br> <small>${idade} ANOS</small></div>
                <div style="text-align:right; font-size:10px; color:#999;">${s(p.rua)}, ${p.num}</div>
            </div>`;
    },

    // BUSCA POR NOME
    async searchPessoa(refresh = false) {
        const term = document.getElementById('h-nome').value.toUpperCase().trim();
        if (!term && !refresh) return Utils.CustomModals.alert("DIGITE UM NOME PARA PESQUISAR.");
        
        const all = await DB.getAll("municipes");
        const res = all.filter(p => p.nome.includes(term));
        
        await this.renderList(`RESULTADOS PARA: "${term}"`, res);
        document.getElementById('lista-resultados').setAttribute('data-last-search', term);
    },

    // BUSCA POR ENDEREÇO
    async searchEndereco() {
        const rua = document.getElementById('h-rua').value;
        const num = document.getElementById('h-num').value.trim();
        if (!rua) return Utils.CustomModals.alert("POR FAVOR, SELECIONE UMA RUA.");
        
        const moradoresRua = await DB.getByIndex("municipes", "rua", rua);
        const filtrados = moradoresRua.filter(p => !num || p.num === num);
        
        await this.renderList(`MORADORES: ${rua}${num ? ', ' + num : ''}`, filtrados);
        document.getElementById('lista-resultados').setAttribute('data-last-search', "");
    },

    // RENDERIZADOR DE LISTAS (DESPACHANTE)
    async renderList(title, arr) {
        const container = document.getElementById('lista-resultados');
        container.innerHTML = `<h3 style="margin-bottom:15px; font-size:16px;">${title} (${arr.length})</h3>`;
        
        if (arr.length === 0) {
            container.innerHTML += "<p style='text-align:center; padding:40px; opacity:0.5;'>NENHUM REGISTRO ENCONTRADO.</p>";
        } else {
            for (const p of arr) {
                if (AppState.currentViewMode === 'full') container.innerHTML += await this.buildCardFull(p);
                else if (AppState.currentViewMode === 'compact') container.innerHTML += await this.buildCardCompact(p);
                else container.innerHTML += await this.buildRowList(p);
            }
        }
        Nav.goTo('tela-resultados');
    }
};

// 004: MOTOR DE BACKUP E EXPORTAÇÃO (VERSÃO CORRIGIDA PARA IMPORTAÇÃO V12)
window.Backup = {
    async createBackup() {
        const m = await DB.getAll("municipes");
        const v = await DB.getAll("visitas");
        const a = await DB.getAll("arquivo_pendencias");
        
        const dump = { 
            municipes: m, 
            visitas: v, 
            arquivo_pendencias: a, 
            timestamp: Date.now(),
            version: "V12.2_OSASCO" 
        };

        const blob = new Blob([JSON.stringify(dump)], {type: 'application/json'});
        const lnk = document.createElement('a');
        lnk.href = URL.createObjectURL(blob);
        lnk.download = `BACKUP_ACS_PRO_${new Date().toISOString().split('T')[0]}.json`;
        lnk.click();
    },

    async restoreBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const rawData = JSON.parse(e.target.result);
                
                // Validação de segurança
                const confirm = await Utils.CustomModals.confirm(
                    "ATENÇÃO: O ARQUIVO CONTÉM " + (rawData.m ? rawData.m.length : 0) + " REGISTROS.\n\nDESEJA CONVERTER E RESTAURAR AGORA?"
                );
                if (!confirm) return;

                // 1. Identifica as fontes de dados (m = municipes, v = visitas)
                const oldM = rawData.m || rawData.municipes || [];
                const oldV = rawData.v || rawData.visitas || [];

                console.log("Iniciando conversão de dados...");

                // 2. Processa Municipes
                for (let p of oldM) {
                    const mappedP = {
                        id: Number(p.id),
                        nome: (p.nome || "").toUpperCase().trim(),
                        nasc: p.nasc || "",
                        sexo: (p.sexo || "MASCULINO").toUpperCase(),
                        raca: (p.raca || "PARDA").toUpperCase(),
                        mae: (p.mae || "").toUpperCase(),
                        pai: (p.pai || "").toUpperCase(),
                        cpf: p.cpf || "",
                        cns: p.cns || "",
                        tel: p.telprincipal || p.tel || "",
                        nacionalidade: "BRASILEIRA",
                        
                        // Campos críticos para o Índice de Endereço
                        rua: (p.rua || "NÃO INFORMADA").toUpperCase(),
                        num: (p.num || "S/N").toString().toUpperCase(),
                        comp: (p.comp || "CASA ÚNICA").toUpperCase(),
                        ma: p.ma || "",
                        seg: p.seg || "",
                        
                        isResp: p.isResp === "NAO" ? "NAO" : "SIM",
                        relacao: (p.relacao || "").toUpperCase(),
                        respId: p.respId ? Number(p.respId) : null,

                        // Conversão de Agravos (0/1 ou boolean)
                        hiper: p.hiper === true || p.hiper === 1,
                        diab: p.diab === true || p.diab === 1,
                        gest: p.gest === true || p.gest === 1,
                        dum: p.dum || "",
                        saudeMental: p.mental === true || p.mental === 1 || p.saudeMental === true,
                        acamado: p.acam === true || p.acam === 1 || p.acamado === true,
                        fumante: p.fum === true || p.fum === 1 || p.fumante === true,
                        alcool: p.alcool === true || p.alcool === 1,
                        obs: (p.obs || "").toUpperCase()
                    };
                    
                    // Salva um por um para garantir a integridade
                    await DB.put("municipes", mappedP);
                }

                // 3. Processa Visitas
                for (let v of oldV) {
                    const mappedV = {
                        id: Number(v.id),
                        pacienteId: Number(v.pacienteId),
                        nome: (v.nome || "").toUpperCase(),
                        dataTS: v.dataTimestamp || v.dataTS || Date.now(),
                        // Tenta pegar a dataBR ou converter da dataISO do backup
                        dataBR: v.dataBR || (v.dataISO ? new Date(v.dataISO).toLocaleDateString('pt-BR') : ""),
                        turno: (v.turno || "MANHÃ").toUpperCase(),
                        motivos: (v.motivos || "VISITA PERIÓDICA").toUpperCase(),
                        relato: (v.relato || "").toUpperCase(),
                        pa: v.pa || "",
                        hgt: v.hgt || "",
                        pendencia: (v.pendencia || "").toUpperCase(),
                        resolvida: v.resolvida === true || v.resolvida === 1,
                        relatoResolvido: (v.relatoResolvido || "").toUpperCase(),
                        dataResolvido: v.dataResolvido || ""
                    };
                    await DB.put("visitas", mappedV);
                }

                await Utils.CustomModals.alert("RESTAURAÇÃO CONCLUÍDA!\nREGISTROS PROCESSADOS COM SUCESSO.");
                location.reload();

            } catch (err) {
                console.error("Erro na restauração:", err);
                alert("FALHA AO PROCESSAR ARQUIVO: O formato dos dados não é compatível.");
            }
        };
        reader.readAsText(file);
    },

    async exportCSV() {
        const visitas = await DB.getAll("visitas");
        let csv = "\ufeffDATA;NOME;MOTIVOS;RELATO;PA;HGT\n";
        visitas.forEach(v => {
            csv += `${v.dataBR};${v.nome};${v.motivos};${v.relato};${v.pa || ''};${v.hgt || ''}\n`;
        });
        const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        const lnk = document.createElement('a');
        lnk.href = URL.createObjectURL(blob);
        lnk.download = `RELATORIO_ACS_OSASCO.csv`;
        lnk.click();
    }
};

// 005: INICIALIZAÇÃO DO SISTEMA
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await DB.init();
        Nav.init();
        console.log("ACS PRO V12.2: Inicializado e Estável.");
    } catch (e) {
        console.error("ERRO CRÍTICO NA CARGA DO APP:", e);
    }
});
