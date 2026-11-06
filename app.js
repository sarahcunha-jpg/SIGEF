const U = {
  esc(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); },
  fmtDateTime(iso){ if(!iso) return '—'; const d=new Date(iso); return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); },
  fmtDate(iso){ if(!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); },
  todayISO(){ return new Date().toISOString(); },
  toast(msg, type='info'){
    const c = document.getElementById('toast-container');
    const el = document.createElement('div'); el.className = `toast toast-${type}`; el.textContent = msg;
    c.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); }, 3500);
  },
  badgeSit(sit){
    const map = {'Arquivada':'badge-green','Em correção':'badge-yellow','Pendente de FO':'badge-orange','Pendente de RA':'badge-orange','Em revisão':'badge-blue','Emprestada':'badge-red','Emprestada (devolução informada)':'badge-orange','Devolução informada':'badge-orange','Recebida e conferida':'badge-green','Devolvida para correção':'badge-yellow','Disponível':'badge-green','Indisponível':'badge-gray','Entregue':'badge-green','Não encontrada':'badge-gray'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  badgeSol(sit){
    const map = {'Recebida':'badge-blue','Em análise':'badge-blue','Parcialmente atendida':'badge-orange','Aguardando disponibilidade':'badge-yellow','Concluída':'badge-green','Cancelada':'badge-gray'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  badgeStatusEmp(st){
    const map = {'Emprestada':'badge-red','Devolução informada':'badge-orange','Recebida e conferida':'badge-green','Devolvida para correção':'badge-yellow'};
    return `<span class="badge ${map[st]||'badge-gray'}">${U.esc(st)}</span>`;
  },
  findUser(id){ return Store.get('usuarios').find(u=>u.id===id); },
  findFicha(id){ if(!id) return null; return Store.get('fichas').find(f=>f.id===id); },
  emprestimoAtivo(fichaId){ return Store.get('emprestimos').find(e=>e.ficha_id===fichaId && (e.status==='Emprestada'||e.status==='Devolução informada')); }
};

const Auth = {
  current(){ try { return JSON.parse(sessionStorage.getItem('sigef_user')); } catch(e){ return null; } },
  login(email, senha){ const u = Store.get('usuarios').find(x=>x.email===email && x.senha===senha && x.ativo); if(!u) return null; sessionStorage.setItem('sigef_user', JSON.stringify(u)); return u; },
  logout(){ sessionStorage.removeItem('sigef_user'); }
};

const App = {
  state: { screen:'dashboard', params:{}, sidebarOpen:false, novaItems:[] },
  init(){
    Store.init();
    if(Auth.current()) this.renderShell(); else this.renderLogin();
    window.addEventListener('hashchange', () => { if(Auth.current()){ const h = location.hash.replace('#','') || 'dashboard'; this.navigate(h, this.state.params, false); } });
  },
  renderLogin(){
    document.getElementById('app').innerHTML = `
      <div class="login-wrap"><div class="login-card">
        <div class="login-logo"><div class="sigef">SIGEF</div><div class="sub">Sistema Integrado de Gestão de Fichas</div></div>
        <h2>Acessar o sistema</h2>
        <form id="login-form">
          <div class="field"><label>E-mail</label><input type="email" id="login-email" required placeholder="seu@email.com" autocomplete="username"></div>
          <div class="field"><label>Senha</label><input type="password" id="login-senha" required placeholder="••••••••" autocomplete="current-password"></div>
          <button type="submit" class="btn btn-primary btn-block">Entrar</button>
        </form>
        <div class="demo-box"><strong>Credenciais de demonstração:</strong><br>Admin: <code>admin@sigef.com</code> / <code>admin123</code><br>Solicitante: <code>joao@empresa.com</code> / <code>123456</code></div>
      </div></div>`;
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const u = Auth.login(document.getElementById('login-email').value.trim(), document.getElementById('login-senha').value);
      if(u){ 
        U.toast('Bem-vindo(a), '+u.nome,'success'); 
        this.renderShell(); 
        this.navigate('dashboard'); 
      } else U.toast('Credenciais inválidas.','error');
    });
  },
  renderShell(){
    const user = Auth.current(); if(!user){ this.renderLogin(); return; }
    document.getElementById('app').innerHTML = `
      <div class="shell">
        <aside class="sidebar ${this.state.sidebarOpen?'open':''}" id="sidebar">
          <div class="sidebar-logo"><div class="sigef">SIGEF</div><div class="sub">Gestão de Fichas</div></div>
          <nav class="nav" id="nav"></nav><div class="sidebar-footer">Protótipo de demonstração</div>
        </aside>
        <div class="main">
          <header class="header">
            <div style="display:flex;align-items:center;gap:12px;"><button class="hamburger" id="hamburger">☰</button><h1 id="page-title">Painel</h1></div>
            <div class="user-chip">
              <div class="user-meta" style="text-align:right;"><strong>${U.esc(user.nome)}</strong><small>${U.esc(user.perfil==='admin'?'Administrador':'Solicitante')} · ${U.esc(user.setor)}</small></div>
              <div class="avatar">${U.esc(user.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase())}</div>
              <button class="btn btn-secondary btn-sm" id="logout-btn">Sair</button>
            </div>
          </header>
          <main class="content" id="content"></main>
        </div>
      </div>`;
    document.getElementById('logout-btn').addEventListener('click', () => { Auth.logout(); this.renderLogin(); });
    document.getElementById('hamburger').addEventListener('click', () => { this.state.sidebarOpen = !this.state.sidebarOpen; document.getElementById('sidebar').classList.toggle('open', this.state.sidebarOpen); });
    this.renderNav(); this.renderScreen();
  },
  renderNav(){
    const user = Auth.current(); const admin = user.perfil==='admin';
    const items = admin ? [['dashboard','Painel','📊'],['solicitacoes','Solicitações','📥'],['fichas','Consulta de Fichas','🗂️'],['entregas','Entregas/Retiradas','📦'],['emprestimos','Empréstimos','🔄'],['devolucoes','Devoluções','↩️'],['historico','Histórico','🕓'],['relatorios','Relatórios','📈'],['planilha','Planilha (demo)','📑'],['emails','E-mails (demo)','✉️'],['usuarios','Usuários','👥'],['configuracoes','Configurações','⚙️']] : [['dashboard','Meu Painel','📊'],['nova-solicitacao','Nova Solicitação','➕'],['minhas-solicitacoes','Minhas Solicitações','📥'],['minhas-fichas-emprestadas','Minhas Fichas Emprestadas','🔄'],['minhas-devolucoes','Minhas Devoluções','↩️'],['meu-historico','Meu Histórico','🕓'],['minha-conta','Minha Conta','👤']];
    const nav = document.getElementById('nav');
    nav.innerHTML = items.map(([key,label,ico]) => `<div class="nav-item ${this.state.screen===key?'active':''}" data-screen="${key}"><span class="ico">${ico}</span><span>${U.esc(label)}</span></div>`).join('');
    nav.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => { this.state.sidebarOpen=false; this.navigate(el.dataset.screen); }));
  },
  navigate(screen, params={}, updateHash=true){
    this.state.screen = screen; this.state.params = params;
    if(updateHash && location.hash !== '#'+screen) history.pushState(null, '', '#'+screen);
    this.renderNav(); this.renderScreen();
  },
  renderScreen(){
    const user = Auth.current(); if(!user) return;
    const titles = {dashboard: user.perfil==='admin'?'Painel Administrativo':'Meu Painel',solicitacoes:'Solicitações',fichas:'Consulta de Fichas',entregas:'Histórico de Retiradas',emprestimos:'Empréstimos',devolucoes:'Devoluções',historico:'Histórico',relatorios:'Relatórios',planilha:'Planilha (demo)',emails:'E-mails (demo)',usuarios:'Usuários',configuracoes:'Configurações','nova-solicitacao':'Nova Solicitação','minhas-solicitacoes':'Minhas Solicitações','minhas-fichas-emprestadas':'Minhas Fichas Emprestadas','minhas-devolucoes':'Minhas Devoluções','meu-historico':'Meu Histórico','minha-conta':'Minha Conta','solicitacao-detalhe':'Detalhe da Solicitação'};
    document.getElementById('page-title').textContent = titles[this.state.screen] || 'SIGEF';
    const el = document.getElementById('content');
    try { el.innerHTML = this.screenHTML(this.state.screen, this.state.params); } catch(e){ el.innerHTML = `<div class="card">Erro: ${U.esc(e.message)}</div>`; }
    const fn = this.events[this.state.screen]; if(fn) fn.call(this);
  },
  screenHTML(screen, params){
    const map = {dashboard:()=>this.screenDashboard(),solicitacoes:()=>this.screenSolicitacoes(),'solicitacao-detalhe':()=>this.screenSolicitacaoDetalhe(params),fichas:()=>this.screenFichas(),entregas:()=>this.screenEntregas(),emprestimos:()=>this.screenEmprestimos(),devolucoes:()=>this.screenDevolucoes(),historico:()=>this.screenHistorico(),relatorios:()=>this.screenRelatorios(),planilha:()=>this.screenPlanilha(),emails:()=>this.screenEmails(),usuarios:()=>this.screenUsuarios(),configuracoes:()=>this.screenConfiguracoes(),'nova-solicitacao':()=>this.screenNovaSolicitacao(),'minhas-solicitacoes':()=>this.screenMinhasSolicitacoes(),'minhas-fichas-emprestadas':()=>this.screenMinhasEmprestadas(),'minhas-devolucoes':()=>this.screenMinhasDevolucoes(),'meu-historico':()=>this.screenMeuHistorico(),'minha-conta':()=>this.screenMinhaConta()};
    return (map[screen]||(()=>'<div class="card">Tela não encontrada.</div>'))();
  },
  metricCard(label, value, type=''){ return `<div class="card metric ${type}"><div class="label">${U.esc(label)}</div><div class="value">${value}</div></div>`; },
  hbar(label, value, total, color){ const pct = total ? Math.round(value/total*100) : 0; return `<div class="hbar"><div class="hbar-label">${U.esc(label)}</div><div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${color}"></div></div><div class="hbar-value">${value}</div></div>`; },
  analisarFicha(ficha){
    if(!ficha) return { status:'nao_encontrada', msg:'Ficha não encontrada na base. Sinalizar para conferência administrativa.' };
    const emp = U.emprestimoAtivo(ficha.id);
    if(emp) return { status:'emprestada', msg:`Emprestada para ${emp.recebedor_nome} (${emp.recebedor_setor}). Aguarde a devolução.` };
    if(ficha.situacao_planilha === 'Arquivada') return { status:'disponivel', msg:'Disponível para separação.' };
    return { status:'indisponivel', msg:`Indisponível: ${ficha.situacao_planilha}.` };
  },
  buscaFichaPorLote(lote){
    const fichas = Store.get('fichas').filter(f => f.lote === lote);
    if(fichas.length === 0) return null;
    const disponivel = fichas.find(f => f.situacao_planilha === 'Arquivada' && !U.emprestimoAtivo(f.id));
    if(disponivel) return disponivel;
    return fichas[0];
  },
  screenDashboard(){ return Auth.current().perfil==='admin' ? this.dashboardAdmin() : this.dashboardSolicitante(); },
  dashboardAdmin(){
    const sols = Store.get('solicitacoes'), fichas = Store.get('fichas'), emps = Store.get('emprestimos');
    const devolPend = emps.filter(e=>e.status==='Devolução informada');
    const totalEntregue = Store.get('itens_entrega').length;
    const emCorrecao = fichas.filter(f=>f.situacao_planilha==='Em correção').length;
    const pFO = fichas.filter(f=>f.situacao_planilha==='Pendente de FO').length;
    const pRA = fichas.filter(f=>f.situacao_planilha==='Pendente de RA').length;
    const emRevisao = fichas.filter(f=>f.situacao_planilha==='Em revisão').length;
    const arquivadas = fichas.filter(f=>f.situacao_planilha==='Arquivada').length;
    const emprestadas = emps.filter(e=>e.status==='Emprestada'||e.status==='Devolução informada').length;
    const labels=[], vals=[];
    for(let i=6;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().slice(0,10); labels.push(d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})); vals.push(sols.filter(s=>s.data_criacao.slice(0,10)===key).length); }
    const maxV = Math.max(1, ...vals);
    return `
      <div class="grid grid-4">${this.metricCard('Solicitações recebidas', sols.length)}${this.metricCard('Aguardando atendimento', sols.filter(s=>s.situacao==='Recebida'||s.situacao==='Em análise').length,'blue')}${this.metricCard('Parcialmente atendidas', sols.filter(s=>s.situacao==='Parcialmente atendida').length,'yellow')}${this.metricCard('Concluídas', sols.filter(s=>s.situacao==='Concluída').length,'green')}</div>
      <div class="grid grid-4" style="margin-top:16px;">${this.metricCard('Fichas retiradas/entregues', totalEntregue,'green')}${this.metricCard('Fichas emprestadas', emprestadas,'red')}${this.metricCard('Devoluções p/ conferir', devolPend.length,'yellow')}${this.metricCard('Fichas em correção', emCorrecao,'yellow')}</div>
      <div class="section grid grid-2">
        <div class="card"><h3 style="margin-bottom:14px;">Solicitações nos últimos 7 dias</h3><div class="chart-bars">${labels.map((l,i)=>`<div class="bar-col"><div class="bar-value">${vals[i]}</div><div class="bar" style="height:${(vals[i]/maxV*100)||2}%"></div><div class="bar-label">${l}</div></div>`).join('')}</div></div>
        <div class="card"><h3 style="margin-bottom:14px;">Situação das fichas</h3>${this.hbar('Arquivadas', arquivadas, fichas.length,'var(--green)')}${this.hbar('Em correção', emCorrecao, fichas.length,'var(--yellow)')}${this.hbar('Pendente FO', pFO, fichas.length,'var(--yellow)')}${this.hbar('Pendente RA', pRA, fichas.length,'var(--yellow)')}${this.hbar('Em revisão', emRevisao, fichas.length,'var(--blue)')}${this.hbar('Emprestadas', emprestadas, fichas.length,'var(--red)')}</div>
      </div>
      <div class="section grid grid-2">
        <div class="card"><div class="section-head"><h3>Solicitações recentes</h3><button class="btn btn-secondary btn-sm" data-nav="solicitacoes">Ver todas</button></div>${sols.slice().sort((a,b)=>b.data_criacao.localeCompare(a.data_criacao)).slice(0,5).map(s=>`<div class="analysis-item" style="cursor:pointer" data-sol-detail="${s.id}"><div class="info"><strong>${U.esc(s.numero)}</strong> · ${U.esc(s.solicitante_nome)}<br><span class="reason">${U.esc(s.setor)} · ${U.fmtDateTime(s.data_criacao)}</span></div><div>${U.badgeSol(s.situacao)}</div></div>`).join('') || '<div class="table-empty">Nenhuma solicitação.</div>'}</div>
        <div class="card"><div class="section-head"><h3>Devoluções p/ conferência</h3><button class="btn btn-secondary btn-sm" data-nav="devolucoes">Abrir</button></div>${devolPend.length ? devolPend.map(e=>{ const f = U.findFicha(e.ficha_id); return `<div class="analysis-item"><div class="info"><strong>Lote ${U.esc(f.lote)}</strong> · ${U.esc(f.codigo_produto)}<br><span class="reason">${U.esc(e.recebedor_nome)} (${U.esc(e.recebedor_setor)})</span></div><div>${U.badgeStatusEmp(e.status)}</div></div>`; }).join('') : '<div class="table-empty">Nenhuma devolução pendente.</div>'}</div>
      </div>`;
  },
  dashboardSolicitante(){
    const user = Auth.current();
    const minhas = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id);
    const meusEmps = Store.get('emprestimos').filter(e=>e.recebedor_nome===user.nome && (e.status==='Emprestada'||e.status==='Devolução informada'));
    return `<div class="grid grid-4">${this.metricCard('Minhas solicitações', minhas.length)}${this.metricCard('Aguardando', minhas.filter(s=>s.situacao==='Recebida'||s.situacao==='Aguardando disponibilidade').length,'blue')}${this.metricCard('Concluídas', minhas.filter(s=>s.situacao==='Concluída').length,'green')}${this.metricCard('Fichas comigo', meusEmps.length,'yellow')}</div>
      <div class="section card"><div class="section-head"><h3>Minhas solicitações recentes</h3><button class="btn btn-primary btn-sm" data-nav="nova-solicitacao">+ Nova solicitação</button></div>${minhas.length ? minhas.slice().sort((a,b)=>b.data_criacao.localeCompare(a.data_criacao)).map(s=>`<div class="analysis-item" style="cursor:pointer" data-sol-detail="${s.id}"><div class="info"><strong>${U.esc(s.numero)}</strong><br><span class="reason">${U.fmtDateTime(s.data_criacao)}</span></div><div>${U.badgeSol(s.situacao)}</div></div>`).join('') : '<div class="table-empty">Nenhuma solicitação ainda.</div>'}</div>`;
  },
  screenSolicitacoes(){
    return `<div class="filter-bar"><input type="text" id="f-busca" placeholder="Buscar por número, solicitante..."><select id="f-sit"><option value="">Todas as situações</option><option>Recebida</option><option>Em análise</option><option>Parcialmente atendida</option><option>Aguardando disponibilidade</option><option>Concluída</option><option>Cancelada</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Setor</th><th>Data</th><th>Itens</th><th>Situação</th><th>Ações</th></tr></thead><tbody id="sol-tbody"></tbody></table></div>`;
  },
  renderSolicitacoesTable(){
    const tbody = document.getElementById('sol-tbody'); if(!tbody) return;
    const busca = (document.getElementById('f-busca')?.value||'').toLowerCase(), sit = document.getElementById('f-sit')?.value||'';
    let sols = Store.get('solicitacoes');
    if(busca) sols = sols.filter(s=>s.numero.toLowerCase().includes(busca) || s.solicitante_nome.toLowerCase().includes(busca));
    if(sit) sols = sols.filter(s=>s.situacao===sit);
    sols = sols.slice().sort((a,b)=>b.data_criacao.localeCompare(a.data_criacao));
    if(!sols.length){ tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhuma solicitação encontrada.</td></tr>`; return; }
    tbody.innerHTML = sols.map(s=>{ const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id); return `<tr><td><strong>${U.esc(s.numero)}</strong></td><td>${U.esc(s.solicitante_nome)}</td><td>${U.esc(s.setor)}</td><td>${U.fmtDateTime(s.data_criacao)}</td><td>${itens.length}</td><td>${U.badgeSol(s.situacao)}</td><td class="table-actions"><button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Detalhes</button></td></tr>`; }).join('');
  },
  screenSolicitacaoDetalhe(params){
    const s = Store.get('solicitacoes').find(x=>x.id===Number(params.id)); if(!s) return '<div class="card">Solicitação não encontrada.</div>';
    const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id);
    const entregas = Store.get('entregas').filter(e=>e.solicitacao_id===s.id);
    const totalEntregue = Store.get('itens_entrega').filter(ie=>entregas.some(e=>e.id===ie.entrega_id)).length;
    const total = itens.length, restantes = total - totalEntregue, pct = total ? Math.round(totalEntregue/total*100) : 0;
    const user = Auth.current();
    const backScreen = user.perfil === 'admin' ? 'solicitacoes' : 'minhas-solicitacoes';
    return `<button class="btn btn-secondary btn-sm" data-nav="${backScreen}">← Voltar</button>
      <div class="card" style="margin-top:14px;"><div class="section-head"><h2>${U.esc(s.numero)}</h2><div>${U.badgeSol(s.situacao)}</div></div><div class="info-list"><div class="info-row"><span class="k">Solicitante</span><span class="v">${U.esc(s.solicitante_nome)}</span></div><div class="info-row"><span class="k">Setor</span><span class="v">${U.esc(s.setor)}</span></div><div class="info-row"><span class="k">Data do pedido</span><span class="v">${U.fmtDateTime(s.data_criacao)}</span></div><div class="info-row"><span class="k">Observações</span><span class="v">${U.esc(s.observacoes||'—')}</span></div><div class="info-row"><span class="k">Progresso</span><span class="v">${totalEntregue}/${total} (${pct}%) — restam ${restantes}</span></div></div></div>
      <div class="section card"><h3 style="margin-bottom:10px;">Itens</h3><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação documental</th><th>Situação do item</th><th>Entregue</th></tr></thead><tbody>${itens.map(it=>{ const f = U.findFicha(it.ficha_id); const lote = f ? f.lote : (it.lote_snapshot||'—'), codigo = f ? f.codigo_produto : (it.codigo_snapshot||'—'); const sitPlan = f ? f.situacao_planilha : 'Não encontrada'; const entregue = Store.get('itens_entrega').some(ie=>ie.ficha_id===it.ficha_id && entregas.some(e=>e.id===ie.entrega_id)); return `<tr><td>${U.esc(lote)}</td><td>${U.esc(codigo)}</td><td>${U.badgeSit(sitPlan)}</td><td>${U.badgeSit(it.situacao_item)}</td><td>${entregue?'<span class="badge badge-green">Sim</span>':'<span class="badge badge-gray">Não</span>'}</td></tr>`; }).join('')}</tbody></table></div></div>
      ${user.perfil==='admin' ? `<div class="section card"><div class="section-head"><h3>Retiradas registradas</h3><button class="btn btn-primary btn-sm" data-nova-entrega="${s.id}" ${restantes<=0?'disabled':''}>+ Registrar Retirada</button></div>${entregas.length ? entregas.map(e=>{ const itensE = Store.get('itens_entrega').filter(ie=>ie.entrega_id===e.id); return `<div class="analysis-item"><div class="info"><strong>Retirada #${e.id}</strong> — Data: ${U.fmtDate(e.data_entrega)}<br><span class="reason">Retirado por ${U.esc(e.nome_recebedor)} (${U.esc(e.setor_recebedor)}) — ${itensE.length} ficha(s)</span></div><button class="btn btn-secondary btn-sm" data-imprimir="${e.id}">🖨️ Comprovante</button></div>`; }).join('') : '<div class="table-empty">Nenhuma retirada.</div>'}</div>` : ''}`;
  },
  screenFichas(){
    return `<div class="filter-bar"><input type="text" id="f-fichas-busca" placeholder="Buscar por lote ou código..."><select id="f-fichas-sit"><option value="">Todas as situações</option><option>Arquivada</option><option>Em correção</option><option>Pendente de FO</option><option>Pendente de RA</option><option>Em revisão</option></select><select id="f-fichas-aba"><option value="">Todas as abas</option><option>Arquivadas</option><option>Em Correção</option></select></div>
      <div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th><th>Aba</th><th>Empréstimo ativo</th><th>Última consulta</th></tr></thead><tbody id="fichas-tbody"></tbody></table></div>`;
  },
  renderFichasTable(){
    const tbody = document.getElementById('fichas-tbody'); if(!tbody) return;
    const busca = (document.getElementById('f-fichas-busca')?.value||'').toLowerCase(), sit = document.getElementById('f-fichas-sit')?.value||'', aba = document.getElementById('f-fichas-aba')?.value||'';
    let fichas = Store.get('fichas');
    if(busca) fichas = fichas.filter(f=>f.lote.toLowerCase().includes(busca)||f.codigo_produto.toLowerCase().includes(busca));
    if(sit) fichas = fichas.filter(f=>f.situacao_planilha===sit);
    if(aba) fichas = fichas.filter(f=>f.aba_origem===aba);
    if(!fichas.length){ tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Nenhuma ficha encontrada.</td></tr>`; return; }
    tbody.innerHTML = fichas.map(f=>{ const emp = U.emprestimoAtivo(f.id); return `<tr><td><strong>${U.esc(f.lote)}</strong></td><td>${U.esc(f.codigo_produto)}</td><td>${U.badgeSit(f.situacao_planilha)}</td><td>${U.esc(f.aba_origem)}</td><td>${emp ? U.badgeStatusEmp(emp.status)+' <small>('+U.esc(emp.recebedor_nome)+')</small>' : '—'}</td><td>${U.fmtDate(f.ultima_consulta)}</td></tr>`; }).join('');
  },
  screenEntregas(){
    const entregas = Store.get('entregas').slice().sort((a,b)=>b.timestamp_registro.localeCompare(a.timestamp_registro));
    return `<div class="table-wrap"><table><thead><tr><th>#</th><th>Solicitação</th><th>Retirado por</th><th>Setor</th><th>Responsável</th><th>Data da Retirada</th><th>Fichas</th><th>Ação</th></tr></thead><tbody>${entregas.length ? entregas.map(e=>{ const sol = Store.get('solicitacoes').find(s=>s.id===e.solicitacao_id); const qtd = Store.get('itens_entrega').filter(ie=>ie.entrega_id===e.id).length; return `<tr><td>#${e.id}</td><td>${U.esc(sol?.numero||'—')}</td><td>${U.esc(e.nome_recebedor)}</td><td>${U.esc(e.setor_recebedor)}</td><td>${U.esc(e.responsavel_entrega)}</td><td>${U.fmtDate(e.data_entrega)}</td><td>${qtd}</td><td><button class="btn btn-secondary btn-sm" data-imprimir="${e.id}">🖨️ Comprovante</button></td></tr>`; }).join('') : `<tr><td colspan="8" class="table-empty">Nenhuma retirada registrada.</td></tr>`}</tbody></table></div>`;
  },
  screenEmprestimos(){
    const emps = Store.get('emprestimos').slice().sort((a,b)=>b.data_emprestimo.localeCompare(a.data_emprestimo));
    return `<div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Recebedor</th><th>Setor</th><th>Empréstimo</th><th>Status</th><th>Ações</th></tr></thead><tbody>${emps.length ? emps.map(e=>{ const f = U.findFicha(e.ficha_id); return `<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.esc(e.recebedor_nome)}</td><td>${U.esc(e.recebedor_setor)}</td><td>${U.fmtDateTime(e.data_emprestimo)}</td><td>${U.badgeStatusEmp(e.status)}</td><td class="table-actions">${e.status==='Emprestada' ? `<button class="btn btn-warning btn-sm" data-info-devol="${e.id}">Receber declaração</button>` : ''}${e.status==='Devolução informada' ? `<button class="btn btn-success btn-sm" data-confirmar-devol="${e.id}">Confirmar recebimento</button>` : ''}</td></tr>`; }).join('') : `<tr><td colspan="7" class="table-empty">Nenhum empréstimo registrado.</td></tr>`}</tbody></table></div>`;
  },
  screenDevolucoes(){
    const pend = Store.get('emprestimos').filter(e=>e.status==='Devolução informada');
    const conferidas = Store.get('emprestimos').filter(e=>e.data_confirmacao_fisica);
    return `<div class="section card"><h3 style="margin-bottom:12px;">Aguardando conferência física</h3>${pend.length ? pend.map(e=>{ const f = U.findFicha(e.ficha_id); return `<div class="analysis-item"><div class="info"><strong>Lote ${U.esc(f.lote)}</strong> — ${U.esc(f.codigo_produto)}<br><span class="reason">${U.esc(e.recebedor_nome)} (${U.esc(e.recebedor_setor)}) informou devolução em ${U.fmtDateTime(e.data_devolucao_informada)}</span></div><button class="btn btn-primary btn-sm" data-confirmar-devol="${e.id}">Conferir e confirmar</button></div>`; }).join('') : '<div class="table-empty">Nenhuma devolução aguardando conferência.</div>'}</div>
      <div class="section card"><h3 style="margin-bottom:12px;">Devoluções já conferidas</h3>${conferidas.length ? conferidas.map(e=>{ const f = U.findFicha(e.ficha_id); return `<div class="analysis-item"><div class="info"><strong>Lote ${U.esc(f.lote)}</strong> — ${U.esc(f.codigo_produto)}<br><span class="reason">${U.esc(e.recebedor_nome)} · conferida em ${U.fmtDateTime(e.data_confirmacao_fisica)}</span></div>${U.badgeStatusEmp(e.status)}</div>`; }).join('') : '<div class="table-empty">Nenhuma devolução conferida ainda.</div>'}</div>`;
  },
  screenHistorico(){
    return `<div class="filter-bar"><input type="text" id="f-hist-busca" placeholder="Buscar por lote, código ou pessoa..."><button class="btn btn-secondary btn-sm" id="btn-hist-limpar">Limpar</button></div><div class="card"><div class="timeline" id="hist-timeline"></div></div>`;
  },
  renderHistorico(){
    const el = document.getElementById('hist-timeline'); if(!el) return;
    const busca = (document.getElementById('f-hist-busca')?.value||'').toLowerCase();
    let hist = Store.get('historico').slice().sort((a,b)=>b.data_hora.localeCompare(a.data_hora));
    if(busca){ hist = hist.filter(h=>{ const f = U.findFicha(h.ficha_id); return (f && (f.lote.toLowerCase().includes(busca) || f.codigo_produto.toLowerCase().includes(busca))) || h.descricao.toLowerCase().includes(busca) || h.usuario_responsavel.toLowerCase().includes(busca); }); }
    hist = hist.slice(0, 80);
    if(!hist.length){ el.innerHTML = '<div class="table-empty">Nenhum registro no histórico.</div>'; return; }
    el.innerHTML = hist.map(h=>{ const f = U.findFicha(h.ficha_id); const lotLabel = f ? `Lote ${f.lote} · ${f.codigo_produto}` : '—'; return `<div class="tl-item"><div class="tl-title">${U.esc(h.tipo_movimentacao)} — ${U.esc(lotLabel)}</div><div class="tl-desc">${U.esc(h.descricao)}</div><div class="tl-meta">${U.esc(h.usuario_responsavel)} · ${U.fmtDateTime(h.data_hora)}</div></div>`; }).join('');
  },
  screenRelatorios(){
    return `<div class="card no-print"><div class="section-head"><h3>Relatórios</h3><div class="actions"><select id="rel-tipo"><option value="sols">Solicitações por período</option><option value="setor">Solicitações por setor</option><option value="entregues">Fichas retiradas</option><option value="parciais">Retiradas parciais</option><option value="emprestadas">Fichas emprestadas</option><option value="devol">Devoluções pendentes</option><option value="correcao">Fichas em correção</option><option value="indisp">Fichas indisponíveis</option><option value="ficha">Histórico de uma ficha</option></select><input type="date" id="rel-de" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;"><input type="date" id="rel-ate" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;"><input type="text" id="rel-ficha" placeholder="Lote (p/ ficha)" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;width:140px;"><button class="btn btn-primary btn-sm" id="rel-gerar">Gerar</button><button class="btn btn-secondary btn-sm" id="rel-print">🖨️ Imprimir</button></div></div></div>
      <div class="section card" id="rel-resultado"><div class="table-empty">Selecione o filtro e clique em Gerar.</div></div>`;
  },
  screenPlanilha(){
    const lastSync = Store.get('fichas')[0]?.ultima_consulta || U.todayISO();
    return `<div class="card"><div class="section-head"><h3>Simulação da planilha Excel</h3><div class="actions"><span style="font-size:12px;color:var(--text);align-self:center;">Última sincronização: <strong>${U.fmtDateTime(lastSync)}</strong></span><button class="btn btn-primary btn-sm" id="btn-sync">🔄 Atualizar agora</button></div></div><div class="demo-box" style="margin-top:10px;"><strong>Modo demonstração:</strong> os dados abaixo são fictícios. O app é somente leitura em relação à planilha. Nenhum arquivo real é acessado ou modificado.</div></div>
      <div class="section"><h3 style="margin-bottom:10px;">Aba: Arquivadas</h3><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th></tr></thead><tbody>${Store.get('fichas').filter(f=>f.aba_origem==='Arquivadas').map(f=>`<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.badgeSit(f.situacao_planilha)}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="section"><h3 style="margin-bottom:10px;">Aba: Em Correção</h3><div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th></tr></thead><tbody>${Store.get('fichas').filter(f=>f.aba_origem==='Em Correção').map(f=>`<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.badgeSit(f.situacao_planilha)}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  screenEmails(){
    const emails = Store.get('emails').slice().sort((a,b)=>b.data.localeCompare(a.data));
    return `<div class="table-wrap"><table><thead><tr><th>Remetente</th><th>Assunto</th><th>Data</th><th>Lotes</th><th>Status</th><th>Ações</th></tr></thead><tbody>${emails.map(m=>`<tr><td>${U.esc(m.remetente_nome)}<br><small>${U.esc(m.remetente)}</small></td><td>${U.esc(m.assunto)}</td><td>${U.fmtDateTime(m.data)}</td><td>${m.lotes_identificados.map(l=>`<span class="badge badge-blue">${U.esc(l)}</span>`).join(' ')}</td><td>${m.status_processamento==='Processado' ? '<span class="badge badge-green">Processado</span>' : '<span class="badge badge-yellow">Pendente</span>'}</td><td class="table-actions"><button class="btn btn-secondary btn-sm" data-email-ver="${m.id}">Ver</button>${m.status_processamento==='Pendente' ? `<button class="btn btn-primary btn-sm" data-email-processar="${m.id}">Processar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
  },
  screenUsuarios(){
    const us = Store.get('usuarios');
    return `<div class="card"><div class="section-head"><h3>Usuários cadastrados</h3><button class="btn btn-primary btn-sm" id="btn-add-user">+ Novo usuário</button></div><div class="table-wrap" style="margin-top:10px;"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Setor</th><th>Perfil</th><th>Ativo</th><th>Ações</th></tr></thead><tbody>${us.map(u=>`<tr><td>${U.esc(u.nome)}</td><td>${U.esc(u.email)}</td><td>${U.esc(u.setor)}</td><td><span class="badge ${u.perfil==='admin'?'badge-blue':'badge-gray'}">${U.esc(u.perfil)}</span></td><td>${u.ativo?'<span class="badge badge-green">Sim</span>':'<span class="badge badge-red">Não</span>'}</td><td class="table-actions"><button class="btn btn-secondary btn-sm" data-edit-user="${u.id}">Editar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  },
  screenConfiguracoes(){
    return `<div class="card"><h3>Configurações do protótipo</h3><p style="margin-top:10px;font-size:13px;line-height:1.7;">Este é um protótipo de demonstração. Os dados são armazenados localmente no navegador (localStorage) e não são enviados para nenhum servidor.</p><div class="info-list" style="margin-top:14px;"><div class="info-row"><span class="k">Versão</span><span class="v">1.0 (protótipo)</span></div><div class="info-row"><span class="k">Persistência</span><span class="v">localStorage</span></div><div class="info-row"><span class="k">Integrações reais</span><span class="v">Nenhuma (Outlook e Excel simulados)</span></div></div><div class="form-actions" style="margin-top:18px;"><button class="btn btn-danger" id="btn-reset">🔄 Restaurar dados de demonstração</button></div></div>`;
  },
  screenNovaSolicitacao(){
    const items = this.state.novaItems || [];
    return `<div class="card"><h3>Nova solicitação</h3><p style="margin-top:4px;font-size:13px;">Informe o número do lote. O sistema buscará a ficha correspondente.</p><div id="nova-itens" style="margin-top:16px;">${items.map((it,i)=>this.renderNovaItemRow(it,i)).join('') || '<div class="table-empty">Nenhum item adicionado.</div>'}</div><button class="btn btn-secondary btn-sm" id="btn-add-item" style="margin-top:8px;">+ Adicionar item</button><div class="field" style="margin-top:18px;"><label>Observações (opcional)</label><textarea id="nova-obs" rows="2" placeholder="Alguma informação adicional?"></textarea></div><div class="form-actions"><button class="btn btn-primary" id="btn-enviar-sol">Enviar solicitação</button></div></div>`;
  },
  renderNovaItemRow(it, i){
    const ficha = it.lote ? this.buscaFichaPorLote(it.lote) : null;
    const analise = it.lote ? this.analisarFicha(ficha) : null;
    let analiseHtml = '';
    if(analise) {
      analiseHtml = `<div class="analise-box" style="grid-column:1/-1;font-size:12px;margin-top:4px;">${analise.status==='disponivel'?'<span class="badge badge-green">Disponível</span>':analise.status==='emprestada'?'<span class="badge badge-red">Emprestada</span>':analise.status==='indisponivel'?'<span class="badge badge-yellow">Indisponível</span>':'<span class="badge badge-gray">Não encontrada</span>'} — ${U.esc(analise.msg)}</div>`;
    }
    return `<div class="item-row" data-idx="${i}" style="grid-template-columns:1fr auto;">
      <div><label style="font-size:11px;color:var(--text);">Lote</label><input type="text" class="nova-lote" value="${U.esc(it.lote||'')}" placeholder="Ex.: 45821" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;"></div>
      <button class="btn btn-danger btn-sm btn-rm-item" data-idx="${i}">✕</button>
      ${analiseHtml}
    </div>`;
  },
  screenMinhasSolicitacoes(){
    const user = Auth.current(); const sols = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id).slice().sort((a,b)=>b.data_criacao.localeCompare(a.data_criacao));
    return `<div class="table-wrap"><table><thead><tr><th>Número</th><th>Data</th><th>Itens</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${sols.length ? sols.map(s=>{ const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id).length; return `<tr><td><strong>${U.esc(s.numero)}</strong></td><td>${U.fmtDateTime(s.data_criacao)}</td><td>${itens}</td><td>${U.badgeSol(s.situacao)}</td><td><button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Detalhes</button></td></tr>`; }).join('') : `<tr><td colspan="5" class="table-empty">Nenhuma solicitação.</td></tr>`}</tbody></table></div>`;
  },
  screenMinhasEmprestadas(){
    const user = Auth.current(); 
    const emps = Store.get('emprestimos').filter(e=>e.recebedor_nome===user.nome && (e.status==='Emprestada'||e.status==='Devolução informada'));
    
    return `<div class="table-wrap">
      <table>
        <thead><tr><th>Lote</th><th>Código</th><th>Data da Retirada</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          ${emps.length ? emps.map(e=>{ 
            const f = U.findFicha(e.ficha_id); 
            return `<tr>
              <td><strong>${U.esc(f.lote)}</strong></td>
              <td>${U.esc(f.codigo_produto)}</td>
              <td>${U.fmtDate(e.data_emprestimo)}</td>
              <td>${U.badgeStatusEmp(e.status)}</td>
              <td>
                ${e.status==='Emprestada' ? 
                  `<button class="btn btn-warning btn-sm" data-declarar-devol="${e.id}">Devolver Ficha</button>` : 
                  '<span style="font-size:12px;color:var(--text);">Aguardando conferência do setor</span>'}
              </td>
            </tr>`; 
          }).join('') : `<tr><td colspan="5" class="table-empty">Você não possui nenhuma ficha emprestada no momento.</td></tr>`}
        </tbody>
      </table>
    </div>`;
  },
  screenMinhasDevolucoes(){
    const user = Auth.current(); const emps = Store.get('emprestimos').filter(e=>e.recebedor_nome===user.nome && e.data_devolucao_informada);
    return `<div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Declarada em</th><th>Status</th></tr></thead><tbody>${emps.length ? emps.map(e=>{ const f = U.findFicha(e.ficha_id); return `<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.fmtDateTime(e.data_devolucao_informada)}</td><td>${U.badgeStatusEmp(e.status)}</td></tr>`; }).join('') : `<tr><td colspan="4" class="table-empty">Nenhuma devolução declarada.</td></tr>`}</tbody></table></div>`;
  },
  screenMeuHistorico(){
    const user = Auth.current(); const meusIds = new Set();
    Store.get('emprestimos').filter(e=>e.recebedor_nome===user.nome).forEach(e=>meusIds.add(e.ficha_id));
    Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id).forEach(s=>{ Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id).forEach(i=>{ if(i.ficha_id) meusIds.add(i.ficha_id); }); });
    const hist = Store.get('historico').filter(h=>meusIds.has(h.ficha_id)).sort((a,b)=>b.data_hora.localeCompare(a.data_hora));
    return `<div class="card"><div class="timeline">${hist.length ? hist.slice(0,60).map(h=>{ const f = U.findFicha(h.ficha_id); return `<div class="tl-item"><div class="tl-title">${U.esc(h.tipo_movimentacao)} — Lote ${U.esc(f?.lote||'—')}</div><div class="tl-desc">${U.esc(h.descricao)}</div><div class="tl-meta">${U.fmtDateTime(h.data_hora)}</div></div>`; }).join('') : '<div class="table-empty">Nenhum registro.</div>'}</div></div>`;
  },
  screenMinhaConta(){
    const user = Auth.current();
    return `<div class="card" style="max-width:520px;"><h3>Minha conta</h3><form id="conta-form" style="margin-top:14px;"><div class="field"><label>Nome</label><input type="text" id="conta-nome" value="${U.esc(user.nome)}" required></div><div class="field"><label>E-mail</label><input type="email" id="conta-email" value="${U.esc(user.email)}" required></div><div class="field"><label>Senha</label><input type="password" id="conta-senha" value="${U.esc(user.senha)}" required></div><div class="info-row"><span class="k">Setor</span><span class="v">${U.esc(user.setor)}</span></div><div class="info-row"><span class="k">Perfil</span><span class="v">${U.esc(user.perfil)}</span></div><div class="form-actions"><button type="submit" class="btn btn-primary">Salvar alterações</button></div></form></div>`;
  },
  openModal(title, body, foot='', large=false){
    document.body.classList.add('modal-open');
    const el = document.createElement('div'); el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal ${large?'modal-lg':''}"><div class="modal-head"><h3>${title}</h3><button class="close-x" data-close>×</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div>`;
    document.body.appendChild(el);
    el.querySelector('[data-close]').addEventListener('click', ()=>this.closeModal());
    el.addEventListener('click', e=>{ if(e.target===el) this.closeModal(); });
    return el;
  },
  closeModal(){ document.body.classList.remove('modal-open'); const m = document.querySelector('.modal-overlay'); if(m) m.remove(); },
  abrirComprovante(entregaId){
    const e = Store.get('entregas').find(x=>x.id===entregaId); if(!e) return;
    const sol = Store.get('solicitacoes').find(s=>s.id===e.solicitacao_id);
    const itensE = Store.get('itens_entrega').filter(ie=>ie.entrega_id===e.id);
    
    const linhas = itensE.map(ie=>{ 
      const f = U.findFicha(ie.ficha_id); 
      return `<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.esc(f.situacao_planilha)}</td></tr>`; 
    }).join('');
    
    const body = `
      <div class="receipt">
        <div class="receipt-head">
          <div><div class="brand">SIGEF<small>Sistema Integrado de Gestão de Fichas</small></div></div>
          <div class="doc"><strong>COMPROVANTE DE RETIRADA</strong>Solicitação ${U.esc(sol?.numero||'—')}<br>Registro #${e.id}</div>
        </div>
        <div class="receipt-grid">
          <div class="f"><strong>Quem retirou</strong>${U.esc(e.nome_recebedor)}</div>
          <div class="f"><strong>Setor do recebedor</strong>${U.esc(e.setor_recebedor)}</div>
          <div class="f"><strong>Data da Retirada</strong>${U.fmtDate(e.data_entrega)}</div>
          <div class="f"><strong>Liberado por</strong>${U.esc(e.responsavel_entrega)}</div>
        </div>
        <table>
          <thead><tr><th>Lote</th><th>Código do produto</th><th>Situação documental</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <p style="font-size:12px;margin-top:8px;"><strong>Quantidade de fichas retiradas:</strong> ${itensE.length}</p>
        <p style="font-size:11px;margin-top:12px;color:var(--red);"><strong>Atenção:</strong> As fichas acima estão em regime de empréstimo e devem ser devolvidas ao setor responsável. O prazo de devolução deve ser acompanhado no painel "Minhas Fichas Emprestadas".</p>
        <div class="sign-area">
          <div class="sign-line">Assinatura de quem retirou</div>
          <div class="sign-line">Responsável pela liberação</div>
        </div>
      </div>`;
      
    this.openModal('Comprovante de Retirada', body, `<button class="btn btn-secondary" data-close>Fechar</button><button class="btn btn-primary" id="btn-print">🖨️ Imprimir Comprovante</button>`, true);
    document.getElementById('btn-print').addEventListener('click', ()=>window.print());
  },
  abrirNovaEntrega(solicitacaoId){
    const sol = Store.get('solicitacoes').find(s=>s.id===solicitacaoId);
    const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===solicitacaoId);
    const entregas = Store.get('entregas').filter(e=>e.solicitacao_id===solicitacaoId);
    
    const jaEntregues = new Set(); 
    Store.get('itens_entrega').filter(ie=>entregas.some(e=>e.id===ie.entrega_id)).forEach(ie=>jaEntregues.add(ie.ficha_id));
    
    const disponiveis = itens.filter(it=>{ 
      if(jaEntregues.has(it.ficha_id)) return false; 
      const f = U.findFicha(it.ficha_id); 
      if(!f || f.situacao_planilha !== 'Arquivada' || U.emprestimoAtivo(f.id)) return false; 
      return true; 
    });

    if(!disponiveis.length){ U.toast('Nenhum item disponível para retirada.','warning'); return; }
    
    const rows = disponiveis.map(it=>{ 
      const f = U.findFicha(it.ficha_id); 
      return `<tr>
        <td><input type="checkbox" data-ficha-id="${it.ficha_id}" class="entrega-check"></td>
        <td>${U.esc(f.lote)}</td>
        <td>${U.esc(f.codigo_produto)}</td>
      </tr>`; 
    }).join('');
    
    const hoje = new Date().toISOString().slice(0,10);
    
    const body = `
      <p style="font-size:13px;margin-bottom:10px;">Selecione as fichas que estão sendo <strong>retiradas (emprestadas)</strong>. Elas aparecerão na tela "Minhas Fichas Emprestadas" até que sejam devolvidas.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Selecionar</th><th>Lote</th><th>Código</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="form-grid" style="margin-top:16px;">
        <div class="field"><label>Quem está retirando</label><input type="text" id="entrega-recebedor" value="${U.esc(sol.solicitante_nome)}" required></div>
        <div class="field"><label>Setor do recebedor</label><input type="text" id="entrega-setor" value="${U.esc(sol.setor)}" required></div>
        <div class="field"><label>Data da Retirada (Manual)</label><input type="date" id="entrega-data" value="${hoje}" required></div>
      </div>`;
      
    this.openModal('Registrar Retirada (Empréstimo)', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="btn-salvar-entrega">Confirmar Retirada</button>`, true);
    
    document.getElementById('btn-salvar-entrega').addEventListener('click', ()=>this.salvarEntrega(solicitacaoId));
  },
  salvarEntrega(solicitacaoId){
    const sel = [...document.querySelectorAll('.entrega-check:checked')].map(c=>Number(c.dataset.fichaId));
    if(!sel.length){ U.toast('Selecione pelo menos uma ficha para retirar.','error'); return; }
    
    const recebedor = document.getElementById('entrega-recebedor').value.trim();
    const setor = document.getElementById('entrega-setor').value.trim();
    const dataStr = document.getElementById('entrega-data').value; 
    
    if(!recebedor || !setor || !dataStr){ U.toast('Preencha todos os campos.','error'); return; }
    
    const user = Auth.current();
    
    const entrega = Store.add('entregas', { 
      solicitacao_id: solicitacaoId, 
      nome_recebedor: recebedor, 
      setor_recebedor: setor, 
      responsavel_entrega: user.nome, 
      data_entrega: new Date(dataStr+'T12:00:00').toISOString(), 
      timestamp_registro: U.todayISO() 
    });
    
    sel.forEach(fichaId=>{
      Store.add('itens_entrega', { entrega_id: entrega.id, ficha_id: fichaId });
      
      const item = Store.get('itens_solicitacao').find(i=>i.solicitacao_id===solicitacaoId && i.ficha_id===fichaId); 
      if(item) Store.update('itens_solicitacao', item.id, { situacao_item: 'Entregue' });
      
      if(!U.emprestimoAtivo(fichaId)){
        Store.add('emprestimos', { 
          ficha_id: fichaId, 
          recebedor_nome: recebedor, 
          recebedor_setor: setor, 
          responsavel: user.nome, 
          data_emprestimo: new Date(dataStr+'T12:00:00').toISOString(), 
          status: 'Emprestada', 
          data_devolucao_informada: null, 
          data_confirmacao_fisica: null 
        });
        Store.add('historico', { ficha_id: fichaId, usuario_responsavel: user.nome, tipo_movimentacao: 'Retirada (Empréstimo)', descricao: `Ficha retirada por ${recebedor} (${setor}).`, data_hora: U.todayISO() });
      }
    });
    
    const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===solicitacaoId);
    const entregues = itens.filter(i=>i.situacao_item==='Entregue').length;
    Store.update('solicitacoes', solicitacaoId, { situacao: entregues === itens.length ? 'Concluída' : 'Parcialmente atendida' });
    
    this.closeModal(); 
    U.toast('Retirada registrada com sucesso!','success'); 
    this.abrirComprovante(entrega.id); 
    this.renderScreen();
  },
  abrirConfirmarDevolucao(empId){
    const e = Store.get('emprestimos').find(x=>x.id===empId); const f = U.findFicha(e.ficha_id);
    const body = `<p style="font-size:13px;">Confirme o recebimento físico da ficha <strong>Lote ${U.esc(f.lote)} — ${U.esc(f.codigo_produto)}</strong>.</p><div class="field" style="margin-top:14px;"><label>Resultado da conferência</label><select id="conf-resultado"><option value="Recebida e conferida">Recebida e arquivada</option><option value="Devolvida para correção">Recebida, mas encaminhada para correção</option></select></div>`;
    this.openModal('Conferência física', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="btn-confirmar-devol">Confirmar</button>`);
    document.getElementById('btn-confirmar-devol').addEventListener('click', ()=>{
      const resultado = document.getElementById('conf-resultado').value; const user = Auth.current();
      Store.update('emprestimos', empId, { status: resultado, data_confirmacao_fisica: U.todayISO() });
      Store.add('historico', { ficha_id: e.ficha_id, usuario_responsavel: user.nome, tipo_movimentacao: 'Confirmação física', descricao: `Devolução conferida. Resultado: ${resultado}.`, data_hora: U.todayISO() });
      this.closeModal(); U.toast('Devolução conferida!','success'); this.renderScreen();
    });
  },
  abrirEmail(emailId){
    const m = Store.get('emails').find(x=>x.id===emailId); const lotesFichas = [];
    m.lotes_identificados.forEach(l=>{ const fichasDoLote = Store.get('fichas').filter(f=>f.lote===l); fichasDoLote.forEach(f=>lotesFichas.push({ lote:l, ficha:f })); });
    const rows = lotesFichas.map(({lote,ficha})=>{ const ana = this.analisarFicha(ficha); return `<tr><td>${U.esc(lote)}</td><td>${U.esc(ficha.codigo_produto)}</td><td>${U.badgeSit(ficha.situacao_planilha)}</td><td>${ana.status==='disponivel'?'<span class="badge badge-green">Disponível</span>':ana.status==='emprestada'?'<span class="badge badge-red">Emprestada</span>':'<span class="badge badge-yellow">Indisponível</span>'} ${U.esc(ana.msg)}</td></tr>`; }).join('');
    const body = `<div class="info-list"><div class="info-row"><span class="k">De</span><span class="v">${U.esc(m.remetente_nome)} &lt;${U.esc(m.remetente)}&gt;</span></div><div class="info-row"><span class="k">Data</span><span class="v">${U.fmtDateTime(m.data)}</span></div></div><div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px;white-space:pre-wrap;">${U.esc(m.corpo)}</div><h4 style="margin-top:16px;">Fichas identificadas</h4><div class="table-wrap" style="margin-top:8px;"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th><th>Análise</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="table-empty">Nenhuma ficha encontrada.</td></tr>'}</tbody></table></div>${m.status_processamento==='Pendente'?`<div style="margin-top:14px;"><h4>Rascunho de resposta (simulado)</h4><textarea id="email-resposta" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;margin-top:6px;font-size:12px;">Olá ${U.esc(m.remetente_nome)}, recebemos sua solicitação e estamos analisando os lotes informados. Retornaremos em breve.</textarea></div>`:''}`;
    this.openModal('Detalhe do e-mail', body, m.status_processamento==='Pendente' ? `<button class="btn btn-secondary" data-close>Fechar</button><button class="btn btn-primary" id="btn-criar-sol-email">Criar solicitação</button>` : `<button class="btn btn-secondary" data-close>Fechar</button>`, true);
    if(m.status_processamento==='Pendente'){
      document.getElementById('btn-criar-sol-email').addEventListener('click', ()=>{
        const user = Store.get('usuarios').find(u=>u.email === m.remetente); if(!user){ U.toast('Remetente não cadastrado como usuário.','error'); return; }
        const novaSol = Store.add('solicitacoes', { numero: 'SOL-2025-' + String(Store.get('solicitacoes').length + 1).padStart(4,'0'), solicitante_id: user.id, solicitante_nome: user.nome, setor: user.setor, data_criacao: U.todayISO(), situacao: 'Recebida', observacoes: 'Criada via e-mail simulado.' });
        m.lotes_identificados.forEach(l=>{ Store.get('fichas').filter(f=>f.lote===l).forEach(f=>{ Store.add('itens_solicitacao', { solicitacao_id: novaSol.id, ficha_id: f.id, situacao_item: 'Disponível' }); }); });
        Store.update('emails', m.id, { status_processamento: 'Processado', solicitacao_id: novaSol.id });
        this.closeModal(); U.toast('Solicitação criada a partir do e-mail!','success'); this.navigate('solicitacoes');
      });
    }
  },
  abrirDeclararDevolucao(empId){
    const e = Store.get('emprestimos').find(x=>x.id===empId); const f = U.findFicha(e.ficha_id);
    const body = `<p style="font-size:13px;">Você está informando a devolução da ficha <strong>Lote ${U.esc(f.lote)} — ${U.esc(f.codigo_produto)}</strong>.</p><p style="font-size:12px;color:var(--text);margin-top:8px;">O administrador do setor precisará confirmar o recebimento físico antes de encerrar o empréstimo.</p>`;
    this.openModal('Informar devolução', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-warning" id="btn-confirmar-declaracao">Confirmar devolução</button>`);
    document.getElementById('btn-confirmar-declaracao').addEventListener('click', ()=>{
      Store.update('emprestimos', empId, { status: 'Devolução informada', data_devolucao_informada: U.todayISO() });
      Store.add('historico', { ficha_id: e.ficha_id, usuario_responsavel: e.recebedor_nome, tipo_movimentacao: 'Devolução informada', descricao: 'Usuário informou a devolução da ficha.', data_hora: U.todayISO() });
      this.closeModal(); U.toast('Devolução declarada! Aguarde a conferência do administrador.','success'); this.renderScreen();
    });
  },
  abrirUserForm(userId){
    const isEdit = !!userId;
    const u = isEdit ? Store.get('usuarios').find(x=>x.id===userId) : { nome:'', email:'', senha:'', setor:'', perfil:'solicitante', ativo:true };
    const setores = ['Produção','Qualidade','Engenharia','Logística','Administração'];
    const body = `<div class="form-grid"><div class="field"><label>Nome</label><input type="text" id="u-nome" value="${U.esc(u.nome)}" required></div><div class="field"><label>E-mail</label><input type="email" id="u-email" value="${U.esc(u.email)}" required></div><div class="field"><label>Senha</label><input type="text" id="u-senha" value="${U.esc(u.senha)}" required></div><div class="field"><label>Setor</label><select id="u-setor">${setores.map(s=>`<option ${s===u.setor?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label>Perfil</label><select id="u-perfil"><option value="solicitante" ${u.perfil==='solicitante'?'selected':''}>Solicitante</option><option value="admin" ${u.perfil==='admin'?'selected':''}>Administrador</option></select></div><div class="field"><label>Status</label><select id="u-ativo"><option value="true" ${u.ativo?'selected':''}>Ativo</option><option value="false" ${!u.ativo?'selected':''}>Inativo</option></select></div></div>`;
    this.openModal(isEdit?'Editar usuário':'Novo usuário', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="btn-salvar-user">Salvar</button>`);
    document.getElementById('btn-salvar-user').addEventListener('click', ()=>{
      const data = { nome: document.getElementById('u-nome').value.trim(), email: document.getElementById('u-email').value.trim(), senha: document.getElementById('u-senha').value.trim(), setor: document.getElementById('u-setor').value, perfil: document.getElementById('u-perfil').value, ativo: document.getElementById('u-ativo').value === 'true' };
      if(!data.nome || !data.email || !data.senha){ U.toast('Preencha todos os campos.','error'); return; }
      if(isEdit) Store.update('usuarios', userId, data); else Store.add('usuarios', data);
      this.closeModal(); U.toast('Usuário salvo!','success'); this.renderScreen();
    });
  },
  gerarRelatorio(){
    const tipo = document.getElementById('rel-tipo').value, de = document.getElementById('rel-de').value, ate = document.getElementById('rel-ate').value, fichaBusca = document.getElementById('rel-ficha').value.trim();
    const res = document.getElementById('rel-resultado'); let html = '';
    if(tipo === 'sols' || tipo === 'setor'){
      let sols = Store.get('solicitacoes');
      if(de) sols = sols.filter(s=>s.data_criacao.slice(0,10) >= de);
      if(ate) sols = sols.filter(s=>s.data_criacao.slice(0,10) <= ate);
      if(tipo === 'setor'){ const agrupado = {}; sols.forEach(s=>{ agrupado[s.setor] = (agrupado[s.setor]||0) + 1; }); html = `<table><thead><tr><th>Setor</th><th>Total de Solicitações</th></tr></thead><tbody>${Object.entries(agrupado).map(([setor, qtd])=>`<tr><td>${U.esc(setor)}</td><td>${qtd}</td></tr>`).join('')}</tbody></table>`; }
      else { html = `<table><thead><tr><th>Número</th><th>Solicitante</th><th>Setor</th><th>Data</th><th>Situação</th></tr></thead><tbody>${sols.map(s=>`<tr><td>${U.esc(s.numero)}</td><td>${U.esc(s.solicitante_nome)}</td><td>${U.esc(s.setor)}</td><td>${U.fmtDate(s.data_criacao)}</td><td>${U.badgeSol(s.situacao)}</td></tr>`).join('')}</tbody></table>`; }
    } else if(tipo === 'entregues' || tipo === 'parciais'){
      const entregas = Store.get('entregas'); const rows = [];
      entregas.forEach(e=>{ const itens = Store.get('itens_entrega').filter(ie=>ie.entrega_id===e.id); if(tipo === 'parciais' && itens.length === 0) return; const sol = Store.get('solicitacoes').find(s=>s.id===e.solicitacao_id); rows.push(`<tr><td>${e.id}</td><td>${U.esc(sol?.numero||'—')}</td><td>${U.esc(e.nome_recebedor)}</td><td>${itens.length} fichas</td><td>${U.fmtDate(e.data_entrega)}</td></tr>`); });
      html = `<table><thead><tr><th>ID</th><th>Solicitação</th><th>Recebedor</th><th>Qtd</th><th>Data da Retirada</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    } else if(tipo === 'emprestadas'){
      const emps = Store.get('emprestimos').filter(e=>e.status==='Emprestada'||e.status==='Devolução informada');
      html = `<table><thead><tr><th>Lote</th><th>Código</th><th>Recebedor</th><th>Setor</th><th>Data Emp.</th><th>Status</th></tr></thead><tbody>${emps.map(e=>{const f = U.findFicha(e.ficha_id); return `<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.esc(e.recebedor_nome)}</td><td>${U.esc(e.recebedor_setor)}</td><td>${U.fmtDate(e.data_emprestimo)}</td><td>${U.badgeStatusEmp(e.status)}</td></tr>`;}).join('')}</tbody></table>`;
    } else if(tipo === 'devol'){
      const pend = Store.get('emprestimos').filter(e=>e.status==='Devolução informada');
      html = `<table><thead><tr><th>Lote</th><th>Código</th><th>Recebedor</th><th>Data Dev.</th></tr></thead><tbody>${pend.map(e=>{const f = U.findFicha(e.ficha_id); return `<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.esc(e.recebedor_nome)}</td><td>${U.fmtDate(e.data_devolucao_informada)}</td></tr>`;}).join('')}</tbody></table>`;
    } else if(tipo === 'correcao' || tipo === 'indisp'){
      let fichas = Store.get('fichas');
      if(tipo === 'correcao') fichas = fichas.filter(f=>f.situacao_planilha==='Em correção');
      else fichas = fichas.filter(f=>f.situacao_planilha!=='Arquivada');
      html = `<table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th><th>Aba</th></tr></thead><tbody>${fichas.map(f=>`<tr><td>${U.esc(f.lote)}</td><td>${U.esc(f.codigo_produto)}</td><td>${U.badgeSit(f.situacao_planilha)}</td><td>${U.esc(f.aba_origem)}</td></tr>`).join('')}</tbody></table>`;
    } else if(tipo === 'ficha'){
      if(!fichaBusca){ U.toast('Informe o lote para buscar o histórico.','warning'); return; }
      const fichas = Store.get('fichas').filter(f=>f.lote.includes(fichaBusca));
      if(!fichas.length){ U.toast('Nenhuma ficha encontrada.','error'); return; }
      html = fichas.map(f=>{ const hist = Store.get('historico').filter(h=>h.ficha_id===f.id).sort((a,b)=>b.data_hora.localeCompare(a.data_hora)); return `<h4 style="margin:14px 0 8px;">Lote ${U.esc(f.lote)} — ${U.esc(f.codigo_produto)} (${U.esc(f.situacao_planilha)})</h4><div class="timeline" style="padding-left:20px;">${hist.map(h=>`<div class="tl-item"><div class="tl-title">${U.esc(h.tipo_movimentacao)}</div><div class="tl-desc">${U.esc(h.descricao)}</div><div class="tl-meta">${U.esc(h.usuario_responsavel)} · ${U.fmtDateTime(h.data_hora)}</div></div>`).join('')}</div>`; }).join('');
    }
    res.innerHTML = `<h3 style="margin-bottom:12px;">Resultado</h3>${html || '<div class="table-empty">Sem dados para o filtro.</div>'}`;
  },
  events: {
    dashboard: function(){ document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    solicitacoes: function(){ this.renderSolicitacoesTable(); ['f-busca','f-sit'].forEach(id=>{ document.getElementById(id)?.addEventListener('input', ()=>this.renderSolicitacoesTable()); }); document.getElementById('sol-tbody').addEventListener('click', e=>{ const btn = e.target.closest('[data-sol-detail]'); if(btn) this.navigate('solicitacao-detalhe', {id:btn.dataset.solDetail}); }); },
    'solicitacao-detalhe': function(){ document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); document.querySelectorAll('[data-nova-entrega]').forEach(b=>b.addEventListener('click', ()=>this.abrirNovaEntrega(Number(b.dataset.novaEntrega)))); document.querySelectorAll('[data-imprimir]').forEach(b=>b.addEventListener('click', ()=>this.abrirComprovante(Number(b.dataset.imprimir)))); },
    fichas: function(){ this.renderFichasTable(); ['f-fichas-busca','f-fichas-sit','f-fichas-aba'].forEach(id=>{ document.getElementById(id)?.addEventListener('input', ()=>this.renderFichasTable()); }); },
    entregas: function(){ document.querySelectorAll('[data-imprimir]').forEach(b=>b.addEventListener('click', ()=>this.abrirComprovante(Number(b.dataset.imprimir)))); },
    emprestimos: function(){ document.querySelectorAll('[data-info-devol]').forEach(b=>b.addEventListener('click', ()=>{ this.abrirDeclararDevolucao(Number(b.dataset.infoDevol)); })); document.querySelectorAll('[data-confirmar-devol]').forEach(b=>b.addEventListener('click', ()=>{ this.abrirConfirmarDevolucao(Number(b.dataset.confirmarDevol)); })); },
    devolucoes: function(){ document.querySelectorAll('[data-confirmar-devol]').forEach(b=>b.addEventListener('click', ()=>{ this.abrirConfirmarDevolucao(Number(b.dataset.confirmarDevol)); })); },
    historico: function(){ this.renderHistorico(); document.getElementById('f-hist-busca')?.addEventListener('input', ()=>this.renderHistorico()); document.getElementById('btn-hist-limpar')?.addEventListener('click', ()=>{ document.getElementById('f-hist-busca').value = ''; this.renderHistorico(); }); },
    relatorios: function(){ document.getElementById('rel-gerar')?.addEventListener('click', ()=>this.gerarRelatorio()); document.getElementById('rel-print')?.addEventListener('click', ()=>window.print()); },
    planilha: function(){ document.getElementById('btn-sync')?.addEventListener('click', ()=>{ const agora = U.todayISO(); Store.get('fichas').forEach(f=>Store.update('fichas', f.id, {ultima_consulta: agora})); U.toast('Planilha sincronizada (simulado).','info'); this.renderScreen(); }); },
    emails: function(){ document.querySelectorAll('[data-email-ver]').forEach(b=>b.addEventListener('click', ()=>this.abrirEmail(Number(b.dataset.emailVer)))); },
    usuarios: function(){ document.getElementById('btn-add-user')?.addEventListener('click', ()=>this.abrirUserForm()); document.querySelectorAll('[data-edit-user]').forEach(b=>b.addEventListener('click', ()=>this.abrirUserForm(Number(b.dataset.editUser)))); },
    configuracoes: function(){ document.getElementById('btn-reset')?.addEventListener('click', ()=>{ if(confirm('Tem certeza que deseja restaurar todos os dados de demonstração? Isso apagará suas alterações.')){ Store.reset(); U.toast('Dados restaurados!','success'); this.navigate('dashboard'); } }); },
    'nova-solicitacao': function(){
      this.state.novaItems = this.state.novaItems || [];
      document.getElementById('btn-add-item')?.addEventListener('click', ()=>{ this.state.novaItems.push({ lote:'' }); this.renderScreen(); });
      const container = document.getElementById('nova-itens');
      container?.addEventListener('click', e=>{ const rmBtn = e.target.closest('.btn-rm-item'); if(rmBtn){ this.state.novaItems.splice(Number(rmBtn.dataset.idx), 1); this.renderScreen(); } });
      container?.addEventListener('input', e=>{
        if(e.target.classList.contains('nova-lote')){
          const row = e.target.closest('.item-row'); const idx = Number(row.dataset.idx);
          this.state.novaItems[idx].lote = e.target.value.trim();
          const it = this.state.novaItems[idx];
          const ficha = it.lote ? this.buscaFichaPorLote(it.lote) : null;
          const analise = it.lote ? this.analisarFicha(ficha) : null;
          let analiseHtml = '';
          if(analise) {
            analiseHtml = `<div class="analise-box" style="grid-column:1/-1;font-size:12px;margin-top:4px;">${analise.status==='disponivel'?'<span class="badge badge-green">Disponível</span>':analise.status==='emprestada'?'<span class="badge badge-red">Emprestada</span>':analise.status==='indisponivel'?'<span class="badge badge-yellow">Indisponível</span>':'<span class="badge badge-gray">Não encontrada</span>'} — ${U.esc(analise.msg)}</div>`;
          }
          let box = row.querySelector('.analise-box');
          if (box) { box.outerHTML = analiseHtml; } 
          else if (analiseHtml) { row.insertAdjacentHTML('beforeend', analiseHtml); }
        }
      });
      document.getElementById('btn-enviar-sol')?.addEventListener('click', ()=>{
        const itensValidos = this.state.novaItems.filter(i=>i.lote);
        if(!itensValidos.length){ U.toast('Adicione pelo menos um item válido.','error'); return; }
        const user = Auth.current(); const obs = document.getElementById('nova-obs').value.trim();
        const nova = Store.add('solicitacoes', { numero: 'SOL-2025-' + String(Store.get('solicitacoes').length + 1).padStart(4,'0'), solicitante_id: user.id, solicitante_nome: user.nome, setor: user.setor, data_criacao: U.todayISO(), situacao: 'Recebida', observacoes: obs });
        itensValidos.forEach(it=>{ const f = this.buscaFichaPorLote(it.lote); Store.add('itens_solicitacao', { solicitacao_id: nova.id, ficha_id: f ? f.id : null, situacao_item: f ? this.analisarFicha(f).status : 'Não encontrada', lote_snapshot: f ? null : it.lote, codigo_snapshot: null }); });
        this.state.novaItems = []; U.toast('Solicitação enviada com sucesso!','success'); this.navigate('minhas-solicitacoes');
      });
    },
    'minhas-solicitacoes': function(){ 
      document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); 
    },
    'minhas-fichas-emprestadas': function(){ document.querySelectorAll('[data-declarar-devol]').forEach(b=>b.addEventListener('click', ()=>{ this.abrirDeclararDevolucao(Number(b.dataset.declararDevol)); })); },
    'minha-conta': function(){ document.getElementById('conta-form')?.addEventListener('submit', e=>{ e.preventDefault(); const user = Auth.current(); const novosDados = { nome: document.getElementById('conta-nome').value.trim(), email: document.getElementById('conta-email').value.trim(), senha: document.getElementById('conta-senha').value.trim() }; Store.update('usuarios', user.id, novosDados); sessionStorage.setItem('sigef_user', JSON.stringify({...user, ...novosDados})); U.toast('Dados atualizados!','success'); this.renderShell(); }); }
  }
};
document.addEventListener('DOMContentLoaded', ()=>App.init());
