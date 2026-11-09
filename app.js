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
  badgeSol(sit){
    const map = {'Pendente':'badge-gray','Em Separação':'badge-warning','Aguardando Devolução':'badge-orange','Aguardando Confirmação':'badge-purple','Finalizada':'badge-green'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  badgeItem(sit){
    const map = {'Pendente':'badge-gray','Separando':'badge-warning','Entregue':'badge-green','Devolução Solicitada':'badge-purple','Devolvido':'badge-blue'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  badgeFicha(sit){
    const map = {'Arquivada':'badge-green','Em correção':'badge-yellow','Pendente de FP':'badge-orange','Pendente de RA':'badge-orange','Em revisão':'badge-blue'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  findFicha(id){ if(!id) return null; return Store.get('fichas').find(f=>f.id===id); }
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
        <div class="login-logo"><div class="sigef">SIGEF</div></div>
        <h2>Acesse sua conta</h2>
        <form id="login-form">
          <div class="field"><label>E-mail</label><input type="email" id="login-email" required placeholder="seu@email.com"></div>
          <div class="field"><label>Senha</label><input type="password" id="login-senha" required placeholder="••••••••"></div>
          <button type="submit" class="btn btn-primary btn-block">Entrar</button>
        </form>
        <div class="demo-box"><strong>Admin:</strong> admin@sigef.com / admin123<br><strong>João:</strong> joao@empresa.com / 123456</div>
      </div></div>`;
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const u = Auth.login(document.getElementById('login-email').value.trim(), document.getElementById('login-senha').value);
      if(u){ U.toast('Bem-vindo, '+u.nome,'success'); this.renderShell(); this.navigate('dashboard'); } 
      else U.toast('Credenciais inválidas.','error');
    });
  },
  renderShell(){
    const user = Auth.current(); if(!user){ this.renderLogin(); return; }
    document.getElementById('app').innerHTML = `
      <div class="shell">
        <aside class="sidebar ${this.state.sidebarOpen?'open':''}" id="sidebar">
          <div class="sidebar-logo"><div class="sigef">SIGEF</div></div>
          <nav class="nav" id="nav"></nav>
          <div class="sidebar-footer">v3.12</div>
        </aside>
        <div class="main">
          <header class="header">
            <div style="display:flex;align-items:center;gap:16px;"><button class="hamburger" id="hamburger">☰</button><h1 id="page-title">Painel</h1></div>
            <div class="user-chip">
              <div class="user-meta" style="text-align:right;"><strong>${U.esc(user.nome)}</strong><small>${U.esc(user.perfil)}</small></div>
              <div class="avatar">${U.esc(user.nome[0])}</div>
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
    const adminItems = [['dashboard','Painel','📊'],['solicitacoes','Gerenciar Solicitações','📥'],['fichas','Consulta de Fichas','🗂️']];
    const userItems = [['dashboard','Meu Painel','📊'],['nova-solicitacao','Nova Solicitação','➕'],['minhas-solicitacoes','Minhas Solicitações','📥']];
    const items = admin ? adminItems : userItems;
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
    const titles = {dashboard: 'Painel',solicitacoes:'Gerenciar Solicitações',fichas:'Consulta de Fichas','nova-solicitacao':'Nova Solicitação','minhas-solicitacoes':'Minhas Solicitações','solicitacao-detalhe':'Detalhe da Solicitação'};
    document.getElementById('page-title').textContent = titles[this.state.screen] || 'SIGEF';
    const el = document.getElementById('content');
    try { el.innerHTML = this.screenHTML(this.state.screen, this.state.params); } catch(e){ el.innerHTML = `<div class="card">Erro: ${U.esc(e.message)}</div>`; }
    const fn = this.events[this.state.screen]; if(fn) fn.call(this);
  },
  screenHTML(screen, params){
    const map = {dashboard:()=>this.screenDashboard(),solicitacoes:()=>this.screenSolicitacoes(),'solicitacao-detalhe':()=>this.screenSolicitacaoDetalhe(params),fichas:()=>this.screenFichas(),'nova-solicitacao':()=>this.screenNovaSolicitacao(),'minhas-solicitacoes':()=>this.screenMinhasSolicitacoes()};
    return (map[screen]||(()=>'<div class="card">Tela não encontrada.</div>'))();
  },
  metricCard(label, value){ return `<div class="card metric"><div class="label">${U.esc(label)}</div><div class="value">${value}</div></div>`; },
  
  getLotesStr(solId) {
    const itens = Store.get('itens_solicitacao').filter(i => i.solicitacao_id === solId);
    const lotes = itens.map(it => {
      const f = U.findFicha(it.ficha_id);
      return f ? f.lote : it.lote_snapshot;
    });
    return lotes.join(', ');
  },

  getEntreguesCount(solId) {
    const itens = Store.get('itens_solicitacao').filter(i => i.solicitacao_id === solId);
    const entregues = itens.filter(i => ['Entregue', 'Devolução Solicitada', 'Devolvido'].includes(i.situacao_item)).length;
    return `${entregues} / ${itens.length}`;
  },

  getLoteFeedback(lote) {
    if(!lote) return '';
    const f = Store.get('fichas').find(x => x.lote === lote);
    if(f) {
      let alerta = '';
      if(f.situacao_planilha !== 'Arquivada') alerta = ` <span style="color:var(--danger); font-size:11px;">(Atenção: Ficha ${f.situacao_planilha})</span>`;
      return `<span style="color:var(--success); font-weight:600;">✓ ${f.nome_produto} (${f.codigo_produto})</span>${alerta}`;
    } else {
      return `<span style="color:var(--danger);">✕ Lote não encontrado no sistema</span>`;
    }
  },

  screenDashboard(){ 
    const user = Auth.current();
    if(user.perfil === 'admin') {
      const sols = Store.get('solicitacoes');
      const fichas = Store.get('fichas');
      const itens = Store.get('itens_solicitacao');

      // NOVOS CARDS
      const qtdFichasEntregues = itens.filter(i => i.situacao_item === 'Entregue').length;
      const qtdAguardandoConfirmacao = itens.filter(i => i.situacao_item === 'Devolução Solicitada').length;
      const qtdFichasDevolvidas = itens.filter(i => i.situacao_item === 'Devolvido').length;
      const solConcluidas = sols.filter(s=>s.situacao==='Finalizada').length;

      const fArquivadas = fichas.filter(f=>f.situacao_planilha==='Arquivada').length;
      const fCorrecao = fichas.filter(f=>f.situacao_planilha==='Em correção').length;
      const fFP = fichas.filter(f=>f.situacao_planilha==='Pendente de FP').length;
      const fRA = fichas.filter(f=>f.situacao_planilha==='Pendente de RA').length;
      const fRevisao = fichas.filter(f=>f.situacao_planilha==='Em revisão').length;
      const fNaoEncontradas = itens.filter(i => i.ficha_id === null).length;

      return `
        <div class="grid grid-4">
          ${this.metricCard('Fichas Entregues', qtdFichasEntregues)}
          ${this.metricCard('Aguardando Confirmação', qtdAguardandoConfirmacao)}
          ${this.metricCard('Fichas Devolvidas', qtdFichasDevolvidas)}
          ${this.metricCard('Solicitações Finalizadas', solConcluidas)}
        </div>

        <div class="section card">
          <div class="section-head"><h3>Status do Acervo de Fichas</h3></div>
          <div class="grid grid-3" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--success);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fArquivadas}</div>
              <div style="font-size:13px; color:var(--text-muted);">Concluídas / Arquivadas</div>
            </div>
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--warning);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fCorrecao}</div>
              <div style="font-size:13px; color:var(--text-muted);">Em Correção</div>
            </div>
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--warning);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fFP}</div>
              <div style="font-size:13px; color:var(--text-muted);">Pendente de FP</div>
            </div>
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--warning);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fRA}</div>
              <div style="font-size:13px; color:var(--text-muted);">Pendente de RA</div>
            </div>
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--info);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fRevisao}</div>
              <div style="font-size:13px; color:var(--text-muted);">Em Revisão</div>
            </div>
            <div style="padding:16px; background:var(--bg-body); border-radius:8px; border-left:4px solid var(--danger);">
              <div style="font-size:24px; font-weight:700; color:var(--text-main);">${fNaoEncontradas}</div>
              <div style="font-size:13px; color:var(--text-muted);">Não Encontradas</div>
            </div>
          </div>
        </div>

        <div class="section card">
          <div class="section-head"><h3>Ações Rápidas</h3></div>
          <div class="table-actions">
            <button class="btn btn-primary" data-nav="solicitacoes">Abrir Fila de Solicitações</button>
            <button class="btn btn-secondary" data-nav="fichas">Consultar Acervo Completo</button>
          </div>
        </div>`;
    } else {
      const minhas = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id);
      return `
        <div class="grid grid-3">
          ${this.metricCard('Minhas Solicitações', minhas.length)}
          ${this.metricCard('Aguardando Devolução', minhas.filter(s=>s.situacao==='Aguardando Devolução').length)}
          ${this.metricCard('Finalizadas', minhas.filter(s=>s.situacao==='Finalizada').length)}
        </div>
        <div class="section card">
          <div class="section-head"><h3>Últimas Solicitações</h3><button class="btn btn-primary btn-sm" data-nav="nova-solicitacao">+ Criar Nova</button></div>
          ${minhas.slice(0,5).map(s=>`<div style="padding:12px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; cursor:pointer;" data-sol-detail="${s.id}"><strong>${s.numero}</strong> ${U.badgeSol(s.situacao)}</div>`).join('') || '<div class="table-empty">Nenhuma solicitação criada.</div>'}
        </div>`;
    }
  },
  
  screenSolicitacoes(){
    return `<div class="table-wrap"><table><thead><tr>
      <th>Número</th><th>Lotes</th><th>Entregues</th><th>Solicitante</th><th>Data</th><th>Situação</th><th>Ações</th>
    </tr></thead><tbody>
      ${Store.get('solicitacoes').map(s=>`<tr>
        <td><strong>${s.numero}</strong></td>
        <td>${this.getLotesStr(s.id)}</td>
        <td><span style="font-weight:600; color:var(--primary);">${this.getEntreguesCount(s.id)}</span></td>
        <td>${s.solicitante_nome}</td>
        <td>${U.fmtDate(s.data_criacao)}</td>
        <td>${U.badgeSol(s.situacao)}</td>
        <td><button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Abrir</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  },
  
  screenSolicitacaoDetalhe(params){
    const s = Store.get('solicitacoes').find(x=>x.id===Number(params.id)); if(!s) return '<div class="card">Não encontrada.</div>';
    const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id);
    const user = Auth.current();
    
    const getAcaoBtn = (it) => {
      const f = U.findFicha(it.ficha_id);
      const isFichaIndisponivel = f && f.situacao_planilha !== 'Arquivada';

      if(user.perfil === 'solicitante') {
        if(it.situacao_item === 'Entregue') return `<button class="btn btn-warning btn-sm" data-acao-item="${it.id}" data-acao="solicitar-devolucao">Informar Devolução</button>`;
        if(it.situacao_item === 'Devolução Solicitada') return `<span class="badge badge-purple" style="font-size:11px;">Aguardando Confirmação</span>`;
        if(it.situacao_item === 'Devolvido') return `<span style="color:var(--success);font-weight:600;">✓ Devolvido</span>`;
        if(it.situacao_item === 'Pendente' && isFichaIndisponivel) return `<span style="color:var(--danger); font-size:12px;">Aguardar correção</span>`;
        return U.badgeItem(it.situacao_item);
      } else {
        if(it.situacao_item === 'Pendente') return `<button class="btn btn-secondary btn-sm" data-acao-item="${it.id}" data-acao="separar">Iniciar Separação</button>`;
        if(it.situacao_item === 'Separando') return `<button class="btn btn-success btn-sm" data-acao-item="${it.id}" data-acao="entregar">Confirmar Entrega</button>`;
        if(it.situacao_item === 'Devolução Solicitada') return `<button class="btn btn-primary btn-sm" data-acao-item="${it.id}" data-acao="confirmar-devolucao">Confirmar Recebimento</button>`;
        if(it.situacao_item === 'Devolvido') return `<span style="color:var(--success);font-weight:600;">✓ Devolvido</span>`;
        return U.badgeItem(it.situacao_item);
      }
    };

    return `<button class="btn btn-secondary btn-sm" data-nav="${user.perfil==='admin'?'solicitacoes':'minhas-solicitacoes'}">← Voltar</button>
      <div class="card" style="margin-top:20px;">
        <div class="section-head"><h2>${s.numero}</h2>${U.badgeSol(s.situacao)}</div>
        <p style="color:var(--text-muted);margin-bottom:20px;">Solicitante: <strong>${s.solicitante_nome}</strong> | Setor: ${s.setor} | Data: ${U.fmtDate(s.data_criacao)}</p>
        
        <h3 style="margin-bottom:16px;">Fichas da Solicitação</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Lote</th><th>Código</th><th>Produto</th><th>Status do Acervo</th><th>Situação do Pedido</th><th>Ação</th></tr></thead>
            <tbody>
              ${itens.map(it=>{
                const f = U.findFicha(it.ficha_id);
                return `<tr>
                  <td><strong>${f ? f.lote : it.lote_snapshot}</strong></td>
                  <td>${f ? f.codigo_produto : '<span style="color:var(--danger);">Não encontrado</span>'}</td>
                  <td>${f ? f.nome_produto : '-'}</td>
                  <td>${f ? U.badgeFicha(f.situacao_planilha) : '-'}</td>
                  <td>${U.badgeItem(it.situacao_item)}</td>
                  <td>${getAcaoBtn(it)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },
  
  screenNovaSolicitacao(){
    const items = this.state.novaItems || [];
    return `<div class="card">
      <h3>Nova solicitação</h3>
      <p style="color:var(--text-muted);margin:8px 0 20px;">Adicione quantos lotes precisar. Todos serão agrupados nesta mesma solicitação.</p>
      <div id="nova-itens">${items.map((it,i)=>`
        <div class="item-row" data-idx="${i}" style="display:flex; flex-direction:column; gap:4px; margin-bottom:16px;">
          <div style="display:flex; gap:12px;">
            <input type="text" class="nova-lote" value="${it.lote||''}" placeholder="Digite o Lote (ex: 45821)" style="padding:10px;border:1px solid var(--border);border-radius:8px;flex:1;">
            <button class="btn btn-danger btn-rm-item" data-idx="${i}">X</button>
          </div>
          <div class="lote-feedback" id="feedback-${i}" style="font-size:13px; margin-top:4px;">${it.lote ? this.getLoteFeedback(it.lote) : ''}</div>
        </div>`).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-add-item" style="margin-top:12px;">+ Adicionar outro Lote</button>
      <div class="form-actions" style="margin-top:24px;"><button class="btn btn-primary" id="btn-enviar-sol">Enviar Solicitação</button></div>
    </div>`;
  },
  
  screenMinhasSolicitacoes(){
    const user = Auth.current();
    const sols = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id);
    return `<div class="table-wrap"><table><thead><tr><th>Número</th><th>Lotes</th><th>Entregues</th><th>Data</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${sols.map(s=>`
        <tr>
          <td><strong>${s.numero}</strong></td>
          <td>${this.getLotesStr(s.id)}</td>
          <td><span style="font-weight:600; color:var(--primary);">${this.getEntreguesCount(s.id)}</span></td>
          <td>${U.fmtDate(s.data_criacao)}</td>
          <td>${U.badgeSol(s.situacao)}</td>
          <td>${s.situacao === 'Aguardando Devolução' ? `<button class="btn btn-warning btn-sm" data-sol-detail="${s.id}">Devolver Fichas</button>` : `<button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Ver Detalhes</button>`}</td>
        </tr>`).join('')}
    </tbody></table></div>`;
  },
  
  screenFichas(){ 
    const user = Auth.current();
    const isAdmin = user.perfil === 'admin';
    return `
      <div class="card" style="margin-bottom:20px;">
        <div class="section-head">
          <h3>Acervo de Fichas</h3>
          ${isAdmin ? `<div class="table-actions"><button class="btn btn-secondary btn-sm" id="btn-importar-planilha">📊 Importar Planilha</button><button class="btn btn-primary btn-sm" id="btn-add-ficha">+ Adicionar Ficha</button></div>` : ''}
        </div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>Lote</th><th>Código</th><th>Produto</th><th>Situação</th>${isAdmin ? '<th>Ações</th>' : ''}</tr></thead><tbody>
      ${Store.get('fichas').map(f=>`<tr>
        <td><strong>${f.lote}</strong></td><td>${f.codigo_produto}</td><td>${f.nome_produto}</td><td>${U.badgeFicha(f.situacao_planilha)}</td>
        ${isAdmin ? `<td><button class="btn btn-secondary btn-sm" data-edit-ficha="${f.id}">Editar Status</button></td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>`; 
  },
  
  events: {
    dashboard: function(){ document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    solicitacoes: function(){ document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    'minhas-solicitacoes': function(){ document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    
    'solicitacao-detalhe': function(){ 
      document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); 
      document.querySelectorAll('[data-acao-item]').forEach(b=>b.addEventListener('click', ()=>{
        const itemId = Number(b.dataset.acaoItem);
        const acao = b.dataset.acao;
        const item = Store.get('itens_solicitacao').find(i=>i.id===itemId);
        const solId = item.solicitacao_id;
        
        if(acao === 'separar') Store.update('itens_solicitacao', itemId, { situacao_item: 'Separando' });
        if(acao === 'entregar') Store.update('itens_solicitacao', itemId, { situacao_item: 'Entregue' });
        if(acao === 'solicitar-devolucao') Store.update('itens_solicitacao', itemId, { situacao_item: 'Devolução Solicitada' });
        if(acao === 'confirmar-devolucao') Store.update('itens_solicitacao', itemId, { situacao_item: 'Devolvido' });
        
        const todosItens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id === solId);
        const qtdPendentes = todosItens.filter(i=>i.situacao_item === 'Pendente').length;
        const qtdSeparando = todosItens.filter(i=>i.situacao_item === 'Separando').length;
        const qtdEntregues = todosItens.filter(i=>i.situacao_item === 'Entregue').length;
        const qtdDevolSolicitada = todosItens.filter(i=>i.situacao_item === 'Devolução Solicitada').length;
        const qtdDevolvidos = todosItens.filter(i=>i.situacao_item === 'Devolvido').length;
        
        let novoSituacao = 'Pendente';
        if (qtdDevolvidos === todosItens.length) { novoSituacao = 'Finalizada'; U.toast('Solicitação finalizada.', 'success'); } 
        else if (qtdDevolSolicitada > 0) { novoSituacao = 'Aguardando Confirmação'; U.toast('Aguardando conferência do Admin.', 'info'); } 
        else if (qtdEntregues > 0) {
          if (qtdSeparando > 0 || qtdPendentes > 0) { novoSituacao = 'Em Separação'; } 
          else { novoSituacao = 'Aguardando Devolução'; }
          U.toast('Status atualizado.', 'info');
        } else if (qtdSeparando > 0) { novoSituacao = 'Em Separação'; U.toast('Separação iniciada.', 'info'); }
        
        Store.update('solicitacoes', solId, { situacao: novoSituacao });
        this.renderScreen(); 
      }));
    },
    
    'nova-solicitacao': function(){
      this.state.novaItems = this.state.novaItems || [];
      document.getElementById('btn-add-item')?.addEventListener('click', ()=>{ this.state.novaItems.push({ lote:'' }); this.renderScreen(); });
      const container = document.getElementById('nova-itens');
      container?.addEventListener('click', e=>{ const rmBtn = e.target.closest('.btn-rm-item'); if(rmBtn){ this.state.novaItems.splice(Number(rmBtn.dataset.idx), 1); this.renderScreen(); } });
      container?.addEventListener('input', e=>{ 
        if(e.target.classList.contains('nova-lote')) { 
          const row = e.target.closest('.item-row'); const idx = Number(row.dataset.idx); 
          this.state.novaItems[idx].lote = e.target.value.trim(); 
          const feedbackDiv = document.getElementById(`feedback-${idx}`);
          if(feedbackDiv) feedbackDiv.innerHTML = this.getLoteFeedback(this.state.novaItems[idx].lote);
        } 
      });
      document.getElementById('btn-enviar-sol')?.addEventListener('click', ()=>{
        const itensValidos = this.state.novaItems.filter(i=>i.lote);
        if(!itensValidos.length){ U.toast('Adicione pelo menos um lote.','error'); return; }
        const user = Auth.current();
        const nova = Store.add('solicitacoes', { numero: 'SOL-2025-' + String(Store.get('solicitacoes').length + 1).padStart(4,'0'), solicitante_id: user.id, solicitante_nome: user.nome, setor: user.setor, data_criacao: U.todayISO(), situacao: 'Pendente', observacoes: '' });
        itensValidos.forEach(it=>{ 
          const f = Store.get('fichas').find(f => f.lote === it.lote); 
          Store.add('itens_solicitacao', { solicitacao_id: nova.id, ficha_id: f ? f.id : null, situacao_item: 'Pendente', lote_snapshot: f ? null : it.lote, codigo_snapshot: null }); 
        });
        this.state.novaItems = []; U.toast('Solicitação criada!','success'); this.navigate('minhas-solicitacoes');
      });
    },

    'fichas': function() {
      document.getElementById('btn-importar-planilha')?.addEventListener('click', () => {
        U.toast('Conectando à planilha...', 'info');
        setTimeout(() => {
          Store.add('fichas', { lote: '99901', codigo_produto: 'PROD-100', nome_produto: 'Parafuso', situacao_planilha: 'Arquivada', aba_origem: 'Arquivadas', ultima_consulta: U.todayISO() });
          Store.add('fichas', { lote: '99902', codigo_produto: 'PROD-310', nome_produto: 'Tubo', situacao_planilha: 'Em revisão', aba_origem: 'Em Correção', ultima_consulta: U.todayISO() });
          U.toast('Planilha importada!', 'success');
          this.renderScreen();
        }, 1500);
      });

      document.getElementById('btn-add-ficha')?.addEventListener('click', () => {
        const body = `<div class="form-grid"><div class="field"><label>Lote</label><input type="text" id="f-lote"></div><div class="field"><label>Código</label><input type="text" id="f-codigo"></div><div class="field"><label>Nome</label><input type="text" id="f-nome"></div><div class="field"><label>Situação</label><select id="f-situacao"><option value="Arquivada">Arquivada</option><option value="Pendente de FP">Pendente de FP</option><option value="Pendente de RA">Pendente de RA</option><option value="Em correção">Em correção</option><option value="Em revisão">Em revisão</option></select></div></div>`;
        this.openModal('Adicionar Nova Ficha', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="btn-salvar-ficha">Salvar</button>`);
        document.getElementById('btn-salvar-ficha').addEventListener('click', () => {
          const lote = document.getElementById('f-lote').value.trim(), codigo = document.getElementById('f-codigo').value.trim(), nome = document.getElementById('f-nome').value.trim(), situacao = document.getElementById('f-situacao').value;
          if(!lote || !codigo) { U.toast('Preencha lote e código.', 'error'); return; }
          Store.add('fichas', { lote, codigo_produto: codigo, nome_produto: nome, situacao_planilha: situacao, aba_origem: (situacao==='Arquivada'?'Arquivadas':'Em Correção'), ultima_consulta: U.todayISO() });
          this.closeModal(); U.toast('Ficha adicionada!', 'success'); this.renderScreen();
        });
      });

      document.querySelectorAll('[data-edit-ficha]').forEach(b => b.addEventListener('click', () => {
        const fichaId = Number(b.dataset.editFicha), ficha = U.findFicha(fichaId);
        const body = `<div class="form-grid"><div class="field"><label>Lote</label><input type="text" value="${ficha.lote}" disabled></div><div class="field"><label>Código</label><input type="text" value="${ficha.codigo_produto}" disabled></div><div class="field" style="grid-column: 1 / -1;"><label>Alterar Situação</label><select id="edit-f-situacao" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:8px;"><option value="Arquivada" ${ficha.situacao_planilha==='Arquivada'?'selected':''}>Arquivada</option><option value="Pendente de FP" ${ficha.situacao_planilha==='Pendente de FP'?'selected':''}>Pendente de FP</option><option value="Pendente de RA" ${ficha.situacao_planilha==='Pendente de RA'?'selected':''}>Pendente de RA</option><option value="Em correção" ${ficha.situacao_planilha==='Em correção'?'selected':''}>Em correção</option><option value="Em revisão" ${ficha.situacao_planilha==='Em revisão'?'selected':''}>Em revisão</option></select></div></div>`;
        this.openModal('Editar Status da Ficha', body, `<button class="btn btn-secondary" data-close>Cancelar</button><button class="btn btn-primary" id="btn-update-ficha">Salvar Alteração</button>`);
        document.getElementById('btn-update-ficha').addEventListener('click', () => {
          Store.update('fichas', fichaId, { situacao_planilha: document.getElementById('edit-f-situacao').value });
          this.closeModal(); U.toast('Status atualizado!', 'success'); this.renderScreen();
        });
      }));
    }
  },
  openModal(title, body, foot='') { document.body.classList.add('modal-open'); const el = document.createElement('div'); el.className = 'modal-overlay'; el.innerHTML = `<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="close-x" data-close>×</button></div><div class="modal-body">${body}</div>${foot?`<div class="modal-foot">${foot}</div>`:''}</div>`; document.body.appendChild(el); el.querySelector('[data-close]').addEventListener('click', ()=>this.closeModal()); el.addEventListener('click', e=>{ if(e.target===el) this.closeModal(); }); },
  closeModal() { document.body.classList.remove('modal-open'); const m = document.querySelector('.modal-overlay'); if(m) m.remove(); }
};
document.addEventListener('DOMContentLoaded', ()=>App.init());
