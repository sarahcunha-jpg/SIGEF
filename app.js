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
    const map = {'Pendente':'badge-gray','Em Separação':'badge-warning','Concluída':'badge-green'};
    return `<span class="badge ${map[sit]||'badge-gray'}">${U.esc(sit)}</span>`;
  },
  badgeItem(sit){
    const map = {'Pendente':'badge-gray','Separando':'badge-warning','Entregue':'badge-green'};
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
        <div class="demo-box">
          <strong>Para testar os dois lados:</strong><br><br>
          👨‍💼 <strong>Admin:</strong> admin@sigef.com / admin123<br>
          👤 <strong>João (Solicitante):</strong> joao@empresa.com / 123456
        </div>
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
          <div class="sidebar-footer">v3.0</div>
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
    
    // Menu Admin
    const adminItems = [
      ['dashboard','Painel','📊'],['solicitacoes','Gerenciar Solicitações','📥'],['fichas','Consulta','🗂️']
    ];
    
    // Menu Solicitante
    const userItems = [
      ['dashboard','Meu Painel','📊'],
      ['nova-solicitacao','Nova Solicitação','➕'],
      ['minhas-solicitacoes','Minhas Solicitações','📥']
    ];

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
  
  screenDashboard(){ 
    const user = Auth.current();
    if(user.perfil === 'admin') {
      const sols = Store.get('solicitacoes');
      return `
        <div class="grid grid-4">
          ${this.metricCard('Novas (Pendentes)', sols.filter(s=>s.situacao==='Pendente').length)}
          ${this.metricCard('Em Separação', sols.filter(s=>s.situacao==='Em Separação').length)}
          ${this.metricCard('Concluídas', sols.filter(s=>s.situacao==='Concluída').length)}
        </div>
        <div class="section card">
          <div class="section-head"><h3>Ações do Administrador</h3></div>
          <div class="table-actions">
            <button class="btn btn-primary" data-nav="solicitacoes">Abrir Fila de Solicitações</button>
          </div>
        </div>`;
    } else {
      const minhas = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id);
      return `
        <div class="grid grid-4">
          ${this.metricCard('Minhas Solicitações', minhas.length)}
          ${this.metricCard('Aguardando', minhas.filter(s=>s.situacao!=='Concluída').length)}
          ${this.metricCard('Concluídas', minhas.filter(s=>s.situacao==='Concluída').length)}
        </div>
        <div class="section card">
          <div class="section-head"><h3>Últimas Solicitações</h3><button class="btn btn-primary btn-sm" data-nav="nova-solicitacao">+ Criar Nova</button></div>
          ${minhas.slice(0,5).map(s=>`<div style="padding:12px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; cursor:pointer;" data-sol-detail="${s.id}"><strong>${s.numero}</strong> ${U.badgeSol(s.situacao)}</div>`).join('') || '<div class="table-empty">Nenhuma solicitação criada.</div>'}
        </div>`;
    }
  },
  
  screenSolicitacoes(){
    return `<div class="table-wrap"><table><thead><tr><th>Número</th><th>Solicitante</th><th>Data</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${Store.get('solicitacoes').map(s=>`<tr><td><strong>${s.numero}</strong></td><td>${s.solicitante_nome}</td><td>${U.fmtDate(s.data_criacao)}</td><td>${U.badgeSol(s.situacao)}</td><td><button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Abrir</button></td></tr>`).join('')}
    </tbody></table></div>`;
  },
  
  screenSolicitacaoDetalhe(params){
    const s = Store.get('solicitacoes').find(x=>x.id===Number(params.id)); if(!s) return '<div class="card">Não encontrada.</div>';
    const itens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id===s.id);
    const user = Auth.current();
    
    // Renderiza os botões de ação APENAS para o admin
    const getAcaoBtn = (it) => {
      if(user.perfil !== 'admin') return U.badgeItem(it.situacao_item);
      if(it.situacao_item === 'Pendente') return `<button class="btn btn-secondary btn-sm" data-acao-item="${it.id}" data-acao="separar">Iniciar Separação</button>`;
      if(it.situacao_item === 'Separando') return `<button class="btn btn-success btn-sm" data-acao-item="${it.id}" data-acao="entregar">Confirmar Entrega</button>`;
      return `<span style="color:var(--success);font-weight:600;">✓ Entregue</span>`;
    };

    return `<button class="btn btn-secondary btn-sm" data-nav="${user.perfil==='admin'?'solicitacoes':'minhas-solicitacoes'}">← Voltar</button>
      <div class="card" style="margin-top:20px;">
        <div class="section-head"><h2>${s.numero}</h2>${U.badgeSol(s.situacao)}</div>
        <p style="color:var(--text-muted);margin-bottom:20px;">Solicitante: <strong>${s.solicitante_nome}</strong> | Setor: ${s.setor} | Data: ${U.fmtDate(s.data_criacao)}</p>
        
        <h3 style="margin-bottom:16px;">Fichas da Solicitação</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Lote</th><th>Código</th><th>Situação do Item</th>${user.perfil==='admin' ? '<th>Ação</th>' : ''}</tr></thead>
            <tbody>
              ${itens.map(it=>{
                const f = U.findFicha(it.ficha_id);
                return `<tr>
                  <td><strong>${f ? f.lote : it.lote_snapshot}</strong></td>
                  <td>${f ? f.codigo_produto : '-'}</td>
                  <td>${U.badgeItem(it.situacao_item)}</td>
                  ${user.perfil==='admin' ? `<td>${getAcaoBtn(it)}</td>` : ''}
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
      <p style="color:var(--text-muted);margin:8px 0 20px;">Informe os lotes que você precisa.</p>
      <div id="nova-itens">${items.map((it,i)=>`
        <div class="item-row" data-idx="${i}" style="display:flex;gap:12px;margin-bottom:12px;">
          <input type="text" class="nova-lote" value="${it.lote||''}" placeholder="Lote (ex: 45821)" style="padding:10px;border:1px solid var(--border);border-radius:8px;flex:1;">
          <button class="btn btn-danger btn-rm-item" data-idx="${i}">X</button>
        </div>`).join('')}
      </div>
      <button class="btn btn-secondary btn-sm" id="btn-add-item" style="margin-top:12px;">+ Adicionar Lote</button>
      <div class="form-actions" style="margin-top:24px;">
        <button class="btn btn-primary" id="btn-enviar-sol">Enviar Solicitação</button>
      </div>
    </div>`;
  },
  
  screenMinhasSolicitacoes(){
    const user = Auth.current();
    const sols = Store.get('solicitacoes').filter(s=>s.solicitante_id===user.id);
    return `<div class="table-wrap"><table><thead><tr><th>Número</th><th>Data</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
      ${sols.map(s=>`<tr><td><strong>${s.numero}</strong></td><td>${U.fmtDate(s.data_criacao)}</td><td>${U.badgeSol(s.situacao)}</td><td><button class="btn btn-secondary btn-sm" data-sol-detail="${s.id}">Ver Detalhes</button></td></tr>`).join('')}
    </tbody></table></div>`;
  },
  
  screenFichas(){ return `<div class="card"><h3>Consulta de Fichas</h3><div class="table-wrap" style="margin-top:16px;"><table><thead><tr><th>Lote</th><th>Código</th><th>Situação</th></tr></thead><tbody>${Store.get('fichas').map(f=>`<tr><td>${f.lote}</td><td>${f.codigo_produto}</td><td>${f.situacao_planilha}</td></tr>`).join('')}</tbody></table></div></div>`; },
  
  events: {
    dashboard: function(){ document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    solicitacoes: function(){ document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    'minhas-solicitacoes': function(){ document.querySelectorAll('[data-sol-detail]').forEach(b=>b.addEventListener('click', ()=>this.navigate('solicitacao-detalhe', {id:b.dataset.solDetail}))); },
    
    'solicitacao-detalhe': function(){ 
      document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click', ()=>this.navigate(b.dataset.nav))); 
      
      // Lógica de separação e entrega (Apenas Admin tem esses botões no HTML)
      document.querySelectorAll('[data-acao-item]').forEach(b=>b.addEventListener('click', ()=>{
        const itemId = Number(b.dataset.acaoItem);
        const acao = b.dataset.acao;
        const item = Store.get('itens_solicitacao').find(i=>i.id===itemId);
        const solId = item.solicitacao_id;
        
        if(acao === 'separar') Store.update('itens_solicitacao', itemId, { situacao_item: 'Separando' });
        if(acao === 'entregar') Store.update('itens_solicitacao', itemId, { situacao_item: 'Entregue' });
        
        // Atualiza o status master da solicitação
        const todosItens = Store.get('itens_solicitacao').filter(i=>i.solicitacao_id === solId);
        const qtdEntregues = todosItens.filter(i=>i.situacao_item === 'Entregue').length;
        const qtdSeparando = todosItens.filter(i=>i.situacao_item === 'Separando').length;
        
        if(qtdEntregues === todosItens.length) {
          Store.update('solicitacoes', solId, { situacao: 'Concluída' });
          U.toast('Todas as fichas entregues! Solicitação concluída.', 'success');
        } else if(qtdSeparando > 0 || qtdEntregues > 0) {
          Store.update('solicitacoes', solId, { situacao: 'Em Separação' });
          U.toast('Status atualizado.', 'info');
        } else {
          Store.update('solicitacoes', solId, { situacao: 'Pendente' });
        }
        
        this.renderScreen(); 
      }));
    },
    
    'nova-solicitacao': function(){
      this.state.novaItems = this.state.novaItems || [];
      document.getElementById('btn-add-item')?.addEventListener('click', ()=>{ this.state.novaItems.push({ lote:'' }); this.renderScreen(); });
      const container = document.getElementById('nova-itens');
      container?.addEventListener('click', e=>{ const rmBtn = e.target.closest('.btn-rm-item'); if(rmBtn){ this.state.novaItems.splice(Number(rmBtn.dataset.idx), 1); this.renderScreen(); } });
      container?.addEventListener('input', e=>{ if(e.target.classList.contains('nova-lote')) { const row = e.target.closest('.item-row'); const idx = Number(row.dataset.idx); this.state.novaItems[idx].lote = e.target.value.trim(); } });
      document.getElementById('btn-enviar-sol')?.addEventListener('click', ()=>{
        const itensValidos = this.state.novaItems.filter(i=>i.lote);
        if(!itensValidos.length){ U.toast('Adicione pelo menos um lote.','error'); return; }
        const user = Auth.current();
        const nova = Store.add('solicitacoes', { numero: 'SOL-2025-' + String(Store.get('solicitacoes').length + 1).padStart(4,'0'), solicitante_id: user.id, solicitante_nome: user.nome, setor: user.setor, data_criacao: U.todayISO(), situacao: 'Pendente', observacoes: '' });
        itensValidos.forEach(it=>{ 
          const f = Store.get('fichas').find(f => f.lote === it.lote); 
          Store.add('itens_solicitacao', { solicitacao_id: nova.id, ficha_id: f ? f.id : null, situacao_item: 'Pendente', lote_snapshot: f ? null : it.lote, codigo_snapshot: null }); 
        });
        this.state.novaItems = []; U.toast('Solicitação criada com sucesso!','success'); this.navigate('minhas-solicitacoes');
      });
    }
  }
};
document.addEventListener('DOMContentLoaded', ()=>App.init());
