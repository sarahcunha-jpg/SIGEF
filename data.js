const DB_KEY = 'sigef_data_v3'; // Versão nova para limpar o cache anterior
function seedData() {
  const iso = d => d.toISOString();
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  
  const usuarios = [
    { id:1, nome:'Administrador do Setor', email:'admin@sigef.com', senha:'admin123', setor:'Administração', perfil:'admin', ativo:true },
    { id:2, nome:'João Silva', email:'joao@empresa.com', senha:'123456', setor:'Produção', perfil:'solicitante', ativo:true },
    { id:3, nome:'Maria Santos', email:'maria@empresa.com', senha:'123456', setor:'Qualidade', perfil:'solicitante', ativo:true }
  ];

  const fichasRaw = [
    ['45821','PROD-100','Arquivada','Arquivadas'],['45822','PROD-100','Pendente de FP','Arquivadas'],
    ['45823','PROD-310','Em revisão','Em Correção'],['45824','PROD-100','Arquivada','Arquivadas'],
    ['45825','PROD-205','Arquivada','Arquivadas'],['45826','PROD-310','Pendente de RA','Arquivadas']
  ];
  const fichas = fichasRaw.map((f,i)=>({id:i+1,lote:f[0],codigo_produto:f[1],situacao_planilha:f[2],aba_origem:f[3],ultima_consulta:daysAgo(0)}));
  
  // Solicitação 1: Pendente (Para o Admin testar a separação)
  // Solicitação 2: Concluída (Para o João ver no histórico)
  const solicitacoes = [
    { id:1, numero:'SOL-2025-0001', solicitante_id:2, solicitante_nome:'João Silva', setor:'Produção', data_criacao:daysAgo(2), situacao:'Pendente', observacoes:'Preciso urgente.' },
    { id:2, numero:'SOL-2025-0002', solicitante_id:2, solicitante_nome:'João Silva', setor:'Produção', data_criacao:daysAgo(5), situacao:'Concluída', observacoes:'Já recebido.' }
  ];

  const itens_solicitacao = [
    // Itens da Solicitação 1 (Pendente)
    { id:1, solicitacao_id:1, ficha_id:1, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null },
    { id:2, solicitacao_id:1, ficha_id:4, situacao_item:'Pendente', lote_snapshot:null, codigo_snapshot:null },
    // Itens da Solicitação 2 (Concluída)
    { id:3, solicitacao_id:2, ficha_id:5, situacao_item:'Entregue', lote_snapshot:null, codigo_snapshot:null }
  ];

  return { usuarios, fichas, solicitacoes, itens_solicitacao };
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
