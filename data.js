const DB_KEY = 'sigef_data_v2'; // Mudei a versão para limpar caches antigos automaticamente
function seedData() {
  const iso = d => d.toISOString();
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const setores = [{ id: 1, nome: 'Produção' }, { id: 2, nome: 'Qualidade' }, { id: 3, nome: 'Engenharia' }, { id: 4, nome: 'Logística' }];
  const usuarios = [
    { id:1, nome:'Administrador do Setor', email:'admin@sigef.com', senha:'admin123', setor:'Administração', perfil:'admin', ativo:true },
    { id:2, nome:'João Silva', email:'joao@empresa.com', senha:'123456', setor:'Produção', perfil:'solicitante', ativo:true },
    { id:3, nome:'Maria Santos', email:'maria@empresa.com', senha:'123456', setor:'Qualidade', perfil:'solicitante', ativo:true },
    { id:4, nome:'Pedro Oliveira', email:'pedro@empresa.com', senha:'123456', setor:'Engenharia', perfil:'solicitante', ativo:true },
    { id:5, nome:'Ana Costa', email:'ana@empresa.com', senha:'123456', setor:'Logística', perfil:'solicitante', ativo:true },
    { id:6, nome:'Carlos Pereira', email:'carlos@empresa.com', senha:'123456', setor:'Produção', perfil:'solicitante', ativo:true }
  ];
  const fichasRaw = [
    ['45821','PROD-100','Arquivada','Arquivadas'],['45821','PROD-205','Em correção','Em Correção'],
    ['45822','PROD-100','Pendente de FP','Arquivadas'],['45823','PROD-310','Em revisão','Em Correção'],
    ['45824','PROD-100','Arquivada','Arquivadas'],['45825','PROD-205','Arquivada','Arquivadas'],
    ['45826','PROD-310','Pendente de RA','Arquivadas'],['45827','PROD-100','Arquivada','Arquivadas'],
    ['45828','PROD-205','Em correção','Em Correção'],['45829','PROD-310','Arquivada','Arquivadas'],
    ['45830','PROD-100','Arquivada','Arquivadas'],['45831','PROD-205','Pendente de FP','Arquivadas'],
    ['45832','PROD-310','Arquivada','Arquivadas'],['45833','PROD-100','Em revisão','Em Correção'],
    ['45834','PROD-205','Arquivada','Arquivadas'],['45835','PROD-310','Pendente de RA','Arquivadas'],
    ['45836','PROD-100','Arquivada','Arquivadas'],['45837','PROD-205','Arquivada','Arquivadas'],
    ['45838','PROD-310','Em correção','Em Correção'],['45839','PROD-100','Arquivada','Arquivadas'],
    ['45840','PROD-205','Arquivada','Arquivadas'],['45841','PROD-310','Pendente de FP','Arquivadas'],
    ['45842','PROD-100','Arquivada','Arquivadas'],['45843','PROD-205','Em revisão','Em Correção'],
    ['45844','PROD-310','Arquivada','Arquivadas']
  ];
  const fichas = fichasRaw.map((f,i)=>({id:i+1,lote:f[0],codigo_produto:f[1],situacao_planilha:f[2],aba_origem:f[3],ultima_consulta:daysAgo(0)}));
  
  // Emprestimos simplificados para focar no fluxo da solicitacao
  const emprestimos = [
    { id:1, ficha_id:10, recebedor_nome:'Maria Santos', recebedor_setor:'Qualidade', responsavel:'Administrador', data_emprestimo:daysAgo(5), status:'Emprestada', data_devolucao_informada:null, data_confirmacao_fisica:null }
  ];

  // Novo status: Pendente, Em Separação, Concluída
  const solicitacoes = [
    { id:1, numero:'SOL-2025-0001', solicitante_id:2, solicitante_nome:'João Silva', setor:'Produção', data_criacao:daysAgo(8), situacao:'Concluída', observacoes:'Urgente para fechamento do mês.' },
    { id:2, numero:'SOL-2025-0002', solicitante_id:3, solicitante_nome:'Maria Santos', setor:'Qualidade', data_criacao:daysAgo(5), situacao:'Em Separação', observacoes:'Favor separar por código.' },
    { id:3, numero:'SOL-2025-0003', solicitante_id:4, solicitante_nome:'Pedro Oliveira', setor:'Engenharia', data_criacao:daysAgo(2), situacao:'Pendente', observacoes:'' }
  ];

  // Novo status do item: Pendente, Separando, Entregue
  const itens_solicitacao = [
    { id:1, solicitacao_id:1, ficha_id:1, situacao_item:'Entregue', lote_snapshot:null, codigo_snapshot:null },
    { id:2, solicitacao_id:1, ficha_id:5, situacao_item:'Entregue', lote_snapshot:null, codigo_snapshot:null },
    { id:3, solicitacao_id:1, ficha_id:8, situacao_item:'Entregue', lote_snapshot:null, codigo_snapshot:null },
    
    { id:4, solicitacao_id:2, ficha_id:6, situacao_item:'Separando', lote_snapshot:null, codigo_snapshot:null },
    { id:5, solicitacao_id:2, ficha_id:7, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null },
    { id:6, solicitacao_id:2, ficha_id:9, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null },
    
    { id:7, solicitacao_id:3, ficha_id:3, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null },
    { id:8, solicitacao_id:3, ficha_id:4, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null }
  ];

  const entregas = [];
  const itens_entrega = [];
  const emails = [];
  const historico = [];
  
  return { setores, usuarios, fichas, solicitacoes, itens_solicitacao, entregas, itens_entrega, emprestimos, historico, emails };
}

const Store = {
  _data: null,
  init() {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) { try { this._data = JSON.parse(raw); } catch (e) { this._data = seedData(); this.save(); } }
    else { this._data = seedData(); this.save(); }
  },
  save() { localStorage.setItem(DB_KEY, JSON.stringify(this._data)); },
  get(col) { return this._data[col] || []; },
  set(col, v) { this._data[col] = v; this.save(); },
  nextId(col) { const items = this.get(col); return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1; },
  add(col, item) { item.id = this.nextId(col); this._data[col].push(item); this.save(); return item; },
  update(col, id, changes) { const idx = this._data[col].findIndex(i => i.id === id); if (idx >= 0) { this._data[col][idx] = Object.assign({}, this._data[col][idx], changes); this.save(); } },
  remove(col, id) { this._data[col] = this._data[col].filter(i => i.id !== id); this.save(); },
  reset() { this._data = seedData(); this.save(); }
};
