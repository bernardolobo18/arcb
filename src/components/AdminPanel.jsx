import {
  BarChart3, Boxes, ClipboardList, Database, Download, Edit3,
  Lock, LogOut, Plus, Printer, Save, Settings, Tags, Trash2, Upload
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { formatCurrency } from '../utils/money.js';
import { parseMoney } from '../utils/money.js';
import { validateBackup } from '../utils/storage.js';
import { NumericKeypad } from './NumericKeypad.jsx';

const emptyProduct = { name: '', price: '', categoryId: '' };

export function AdminPanel({ state, setState, onPrintOrder, activeSession, onSignOut, syncStatus }) {
  const [message, setMessage] = useState('');
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const backupInput = useRef(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(state.categories.map((category) => [category.id, category.name])),
    [state.categories]
  );
  const visibleProducts = useMemo(() => state.products.filter((product) => {
    const matchesName = product.name.toLowerCase().includes(productSearch.trim().toLowerCase());
    return matchesName && (productCategoryFilter === 'all' || product.categoryId === productCategoryFilter);
  }), [productCategoryFilter, productSearch, state.products]);
  const visibleOrders = useMemo(() => {
    const search = orderSearch.trim().toLowerCase();
    return state.orders.filter((order) => !search || String(order.number).includes(search)
      || order.items.some((item) => item.name.toLowerCase().includes(search)));
  }, [orderSearch, state.orders]);
  const statistics = useMemo(() => {
    const today = new Date().toDateString();
    const todayOrders = state.orders.filter((order) => new Date(order.createdAt).toDateString() === today);
    const total = todayOrders.reduce((sum, order) => sum + order.total, 0);
    return { count: todayOrders.length, total, average: todayOrders.length ? total / todayOrders.length : 0 };
  }, [state.orders]);
  const sessionExpenses = useMemo(() => activeSession
    ? state.expenses.filter((expense) => expense.sessionId === activeSession.id) : [], [activeSession, state.expenses]);
  const sessionSales = useMemo(() => activeSession
    ? state.orders.filter((order) => order.sessionId === activeSession.id).reduce((sum, order) => sum + order.total, 0) : 0,
  [activeSession, state.orders]);
  const sessionExpenseTotal = sessionExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  function saveProduct(event) {
    event.preventDefault();
    const name = productForm.name.trim();
    const price = parseMoney(productForm.price);
    const categoryId = productForm.categoryId || state.categories[0]?.id;
    if (!name || !categoryId || Number.isNaN(price) || price < 0) return;
    setState((current) => ({ ...current, products: editingProductId
      ? current.products.map((product) => product.id === editingProductId ? { ...product, name, price, categoryId } : product)
      : [...current.products, { id: crypto.randomUUID(), name, price, categoryId }] }));
    setProductForm(emptyProduct);
    setEditingProductId(null);
    setIsProductModalOpen(false);
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({ name: product.name, price: String(product.price), categoryId: product.categoryId });
    setIsProductModalOpen(true);
  }

  function addProductModal() {
    setEditingProductId(null);
    setProductForm({ ...emptyProduct, categoryId: state.categories[0]?.id || '' });
    setIsProductModalOpen(true);
  }

  function deleteProduct(productId) {
    setState((current) => ({ ...current, products: current.products.filter((product) => product.id !== productId) }));
    setProductToDelete(null);
  }

  function addCategory(event) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    setState((current) => ({ ...current, categories: [...current.categories, { id: crypto.randomUUID(), name }] }));
    setCategoryName('');
  }

  function renameCategory(categoryId, name) {
    setState((current) => ({ ...current, categories: current.categories.map((category) =>
      category.id === categoryId ? { ...category, name } : category) }));
  }

  function deleteCategory(categoryId) {
    const fallback = state.categories.find((category) => category.id !== categoryId);
    setState((current) => ({
      ...current,
      categories: current.categories.filter((category) => category.id !== categoryId),
      products: current.products.map((product) => product.categoryId === categoryId
        ? { ...product, categoryId: fallback?.id ?? '' } : product)
    }));
  }

  function addExpense(event) {
    event.preventDefault();
    const description = expenseDescription.trim();
    const amount = parseMoney(expenseAmount);
    if (!activeSession || !description || !Number.isFinite(amount) || amount <= 0) {
      setMessage('Indique uma descrição e um valor de despesa válido.');
      return;
    }
    const expense = { id: crypto.randomUUID(), sessionId: activeSession.id, description, amount, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    setExpenseDescription('');
    setExpenseAmount('');
    setMessage('Despesa registada.');
  }

  function deleteExpense(expenseId) {
    setState((current) => ({ ...current, expenses: current.expenses.filter((expense) => expense.id !== expenseId) }));
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cafe-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage('Cópia de segurança criada.');
  }

  async function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      setState(validateBackup(JSON.parse(await file.text())));
      setMessage('Cópia restaurada com sucesso.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível restaurar a cópia.');
    } finally {
      event.target.value = '';
    }
  }

  const menu = [
    ['dashboard', BarChart3, 'Resumo'], ['orders', ClipboardList, 'Pedidos'],
    ['products', Boxes, 'Produtos'], ['categories', Tags, 'Categorias'], ['settings', Settings, 'Definições']
  ];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar" aria-label="Menu de administração">
        <div className="sidebar-title">Administração</div>
        {menu.map(([key, Icon, label]) => <button key={key} className={activeSection === key ? 'active' : ''}
          onClick={() => { setActiveSection(key); setMessage(''); }}><Icon size={18} />{label}</button>)}
        <button className="logout-button" onClick={onSignOut}><LogOut size={18} />Sair</button>
      </aside>

      <section className="admin-section">
        {message ? <div className="admin-message">{message}</div> : null}

        {activeSection === 'dashboard' ? <>
          <div><h2>Resumo de hoje</h2><p className="section-description">Acompanhe a atividade da registadora.</p></div>
          <div className="stat-grid">
            <article><span>Vendas</span><strong>{formatCurrency(statistics.total)}</strong></article>
            <article><span>Pedidos</span><strong>{statistics.count}</strong></article>
            <article><span>Valor médio</span><strong>{formatCurrency(statistics.average)}</strong></article>
            <article><span>Produtos ativos</span><strong>{state.products.length}</strong></article>
          </div>
          {activeSession ? <div className="cash-overview">
            <div className="admin-heading"><div><h3>Caixa atual</h3><p className="section-description">Aberta em {new Date(activeSession.openedAt).toLocaleString('pt-PT')}</p></div></div>
            <div className="cash-summary-line"><span>Fundo inicial</span><strong>{formatCurrency(activeSession.openingAmount)}</strong></div>
            <div className="cash-summary-line"><span>Vendas desta sessão</span><strong>{formatCurrency(sessionSales)}</strong></div>
            <div className="cash-summary-line expense"><span>Despesas desta sessão</span><strong>-{formatCurrency(sessionExpenseTotal)}</strong></div>
            <div className="cash-summary-line total"><span>Valor atual da caixa</span><strong>{formatCurrency(activeSession.openingAmount + sessionSales - sessionExpenseTotal)}</strong></div>
          </div> : null}
          {activeSession ? <div className="settings-card"><h3>Registar despesa</h3>
            <form className="expense-form" onSubmit={addExpense}>
              <label>Descrição<input placeholder="Ex.: compra de leite" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} /></label>
              <NumericKeypad label="Valor (€)" value={expenseAmount} onChange={setExpenseAmount} decimal />
              <button className="primary-action">Guardar despesa</button>
            </form>
            {sessionExpenses.length ? <div className="expense-list">{sessionExpenses.map((expense) => <div key={expense.id}>
              <span><strong>{expense.description}</strong><small>{new Date(expense.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</small></span>
              <strong>-{formatCurrency(expense.amount)}</strong><button aria-label="Apagar despesa" onClick={() => deleteExpense(expense.id)}><Trash2 size={17} /></button>
            </div>)}</div> : null}
          </div> : null}
          <div className="privacy-card"><Database size={24} /><div><strong>Dados privados na cloud</strong>
            <p>Produtos, categorias e pedidos ficam protegidos por PIN validado no Supabase e tabelas fechadas ao acesso publico.</p></div></div>
        </> : null}

        {activeSection === 'orders' ? <>
          <div className="admin-heading"><div><h2>Pedidos</h2><p className="section-description">{state.orders.length} pedidos guardados</p></div></div>
          <div className="admin-tools single"><input placeholder="Pesquisar por número ou produto" value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)} /></div>
          <div className="admin-list">{visibleOrders.length ? visibleOrders.map((order) => <div className="order-row" key={order.id}>
            <div><strong>Pedido #{order.number}</strong><span>{new Date(order.createdAt).toLocaleString('pt-PT')}</span>
              <small>{order.items.map((item) => `${item.quantity} x ${item.name}`).join(', ')}</small></div>
            <strong>{formatCurrency(order.total)}</strong>
            <button aria-label="Imprimir pedido" onClick={() => onPrintOrder(order)}><Printer size={18} /></button>
          </div>) : <p className="empty-state">Nenhum pedido encontrado.</p>}</div>
        </> : null}

        {activeSection === 'products' ? <>
          <div className="admin-heading"><div><h2>Produtos</h2><p className="section-description">Organize o catálogo da caixa.</p></div>
            <button className="primary-action" onClick={addProductModal}><Plus size={18} />Adicionar produto</button></div>
          <div className="admin-tools"><input placeholder="Pesquisar produto" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
              <option value="all">Todas as categorias</option>{state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select></div>
          <div className="admin-list">{visibleProducts.map((product) => <div className="admin-row" key={product.id}>
            <span>{product.name}</span><span>{categoryMap[product.categoryId] || 'Sem categoria'}</span><strong>{formatCurrency(product.price)}</strong>
            <button aria-label="Editar produto" onClick={() => editProduct(product)}><Edit3 size={18} /></button>
            <button aria-label="Apagar produto" onClick={() => setProductToDelete(product)}><Trash2 size={18} /></button>
          </div>)}</div>
        </> : null}

        {activeSection === 'categories' ? <>
          <div><h2>Categorias</h2><p className="section-description">Agrupe os produtos para os encontrar depressa.</p></div>
          <form className="inline-form" onSubmit={addCategory}><input placeholder="Nova categoria" value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)} /><button className="secondary-action"><Plus size={18} />Criar</button></form>
          <div className="admin-list compact">{state.categories.map((category) => <div className="admin-row" key={category.id}>
            <input value={category.name} onChange={(event) => renameCategory(category.id, event.target.value)} />
            <button aria-label="Apagar categoria" disabled={state.categories.length <= 1} onClick={() => deleteCategory(category.id)}><Trash2 size={18} /></button>
          </div>)}</div>
        </> : null}

        {activeSection === 'settings' ? <>
          <div><h2>Definições</h2><p className="section-description">Identidade, segurança e cópias dos dados.</p></div>
          <div className="settings-card"><h3>Estabelecimento</h3><label>Nome
            <input value={state.settings.businessName} onChange={(event) => setState((current) => ({ ...current,
              settings: { ...current.settings, businessName: event.target.value } }))} /></label></div>
          <div className="settings-card"><h3><Database size={18} /> Dados cloud</h3>
            <p>Exporte regularmente uma cópia. Restaurar substitui os dados guardados na cloud para esta conta.</p>
            <div className="data-actions"><button className="secondary-action" onClick={exportBackup}><Download size={18} />Exportar cópia</button>
              <button className="secondary-action" onClick={() => backupInput.current?.click()}><Upload size={18} />Restaurar cópia</button></div>
            <input ref={backupInput} className="hidden-input" type="file" accept="application/json" onChange={importBackup} /></div>
          <div className="settings-card"><h3><Lock size={18} /> Sessao da registadora</h3>
            <p>Estado: {syncStatus === 'pending' ? 'alterações pendentes de sincronização' : 'sincronizado'}.</p>
            <div className="data-actions">
              <button className="secondary-action" type="button" onClick={onSignOut}><LogOut size={18} />Sair</button>
            </div>
          </div>
        </> : null}
      </section>

      {isProductModalOpen ? <div className="modal-backdrop"><form className="modal product-modal-form" onSubmit={saveProduct} role="dialog" aria-modal="true">
        <h2>{editingProductId ? 'Editar produto' : 'Adicionar produto'}</h2>
        <label>Nome<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} autoFocus /></label>
        <NumericKeypad label="Preco (EUR)" value={productForm.price} onChange={(price) => setProductForm({ ...productForm, price })} decimal />
        <label>Categoria<select value={productForm.categoryId || state.categories[0]?.id || ''} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}>
          {state.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <div className="modal-actions"><button className="secondary-action" type="button" onClick={() => setIsProductModalOpen(false)}>Cancelar</button>
          <button className="primary-action"><Save size={18} />Guardar</button></div>
      </form></div> : null}

      {productToDelete ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true">
        <h2>Apagar produto?</h2><p>Tem a certeza que quer apagar "{productToDelete.name}"?</p>
        <div className="modal-actions"><button className="secondary-action" onClick={() => setProductToDelete(null)}>Cancelar</button>
          <button className="danger-action" onClick={() => deleteProduct(productToDelete.id)}>Apagar</button></div>
      </div></div> : null}
    </main>
  );
}
