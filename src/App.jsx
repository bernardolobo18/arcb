import { useEffect, useMemo, useState } from 'react';
import { AdminPanel } from './components/AdminPanel.jsx';
import { NumericKeypad } from './components/NumericKeypad.jsx';
import { PinLogin } from './components/PinLogin.tsx';
import { PosScreen } from './components/PosScreen.jsx';
import { Receipt } from './components/Receipt.jsx';
import {
  flushPendingState,
  getCachedState,
  hasPendingState,
  loadCloudState,
  saveCloudState
} from './utils/cloudStorage.js';
import { formatCurrency, parseMoney } from './utils/money.js';
import { clearPinSession, getPinSession } from './utils/pinSession.js';

export function App() {
  const [state, setState] = useState(null);
  const [cloudError, setCloudError] = useState('');
  const [syncStatus, setSyncStatus] = useState('online');
  const [pinToken, setPinToken] = useState(() => getPinSession());
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(null);
  const [pendingReceiptOrder, setPendingReceiptOrder] = useState(null);
  const [paidAmount, setPaidAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [openingAmount, setOpeningAmount] = useState('');
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [closeReport, setCloseReport] = useState(null);

  useEffect(() => {
    if (!pinToken) return;

    setCloudError('');
    loadCloudState(pinToken)
      .then((loadedState) => {
        setState(loadedState);
        setSyncStatus(hasPendingState() ? 'pending' : 'online');
      })
      .catch((error) => {
        if (error.message === 'invalid_pin_session') {
          signOut();
          return;
        }
        setState(getCachedState());
        setSyncStatus('offline');
        setCloudError(error.message || 'Nao foi possivel ligar a base de dados cloud. A usar cache local.');
      });
  }, [pinToken]);

  useEffect(() => {
    if (!state || !pinToken) return;

    saveCloudState(pinToken, state)
      .then((result) => setSyncStatus(result.queued ? 'pending' : 'online'))
      .catch((error) => {
        if (error.message === 'invalid_pin_session') {
          signOut();
          return;
        }
        setSyncStatus('pending');
        setCloudError(error.message || 'Alteracoes guardadas localmente. Serao sincronizadas quando voltar a internet.');
      });
  }, [pinToken, state]);

  useEffect(() => {
    if (!pinToken) return undefined;

    const sync = () => {
      flushPendingState(pinToken)
        .then((flushed) => {
          if (flushed) setSyncStatus('online');
        })
        .catch(() => setSyncStatus('pending'));
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, [pinToken]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const discountValue = Math.min(Math.max(parseMoney(discountAmount) || 0, 0), subtotal);
  const total = Math.max(0, subtotal - discountValue);

  const activeSession = useMemo(
    () => state?.cashSessions.find((session) => !session.closedAt) || null,
    [state]
  );

  const closingPreview = useMemo(() => {
    if (!state || !activeSession) return null;
    const orders = state.orders.filter((order) => order.sessionId === activeSession.id);
    const expenses = state.expenses.filter((expense) => expense.sessionId === activeSession.id);
    const salesTotal = orders.reduce((sum, order) => sum + order.total, 0);
    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      salesTotal,
      expensesTotal,
      finalAmount: activeSession.openingAmount + salesTotal - expensesTotal,
      result: salesTotal - expensesTotal,
      orderCount: orders.length,
      expenses
    };
  }, [activeSession, state]);

  if (!state) {
    if (!pinToken) return <PinLogin onSuccess={setPinToken} />;

    return (
      <main className="loading-screen">{cloudError || 'A abrir a base de dados cloud...'}</main>
    );
  }

  function addToCart(product) {
    setCart((items) => {
      const existing = items.find((item) => item.productId === product.id);
      if (existing) {
        return items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...items, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function changeQuantity(productId, delta) {
    setCart((items) =>
      items
        .map((item) => item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId) {
    setCart((items) => items.filter((item) => item.productId !== productId));
  }

  function finalizeOrder() {
    if (!cart.length || !activeSession) return;
    setPendingPaymentOrder({
      id: crypto.randomUUID(),
      number: state.settings.nextOrderNumber,
      createdAt: new Date().toISOString(),
      sessionId: activeSession.id,
      items: cart,
      discount: discountValue,
      paymentMethod,
      total
    });
    setPaidAmount('');
  }

  function confirmPayment(event) {
    event.preventDefault();
    if (!pendingPaymentOrder) return;

    const paid = paymentMethod === 'cash' ? parseMoney(paidAmount) : pendingPaymentOrder.total;
    if (Number.isNaN(paid) || paid < pendingPaymentOrder.total) return;

    const order = {
      ...pendingPaymentOrder,
      paymentMethod,
      paidAmount: paid,
      change: paid - pendingPaymentOrder.total
    };
    setState((current) => ({
      ...current,
      orders: [order, ...current.orders],
      settings: { ...current.settings, nextOrderNumber: current.settings.nextOrderNumber + 1 }
    }));
    setLastOrder(order);
    setPendingReceiptOrder(order);
    setPendingPaymentOrder(null);
    setPaidAmount('');
    setDiscountAmount('');
    setPaymentMethod('cash');
    setCart([]);
  }

  function openShop(event) {
    event.preventDefault();
    const amount = parseMoney(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;

    const session = {
      id: crypto.randomUUID(),
      openedAt: new Date().toISOString(),
      openingAmount: amount
    };
    setState((current) => ({ ...current, cashSessions: [session, ...current.cashSessions] }));
    setOpeningAmount('');
  }

  function startCloseShop() {
    setIsCloseOpen(true);
  }

  function closeShop(event) {
    event.preventDefault();
    if (!activeSession || !closingPreview) return;

    const report = { ...activeSession, closedAt: new Date().toISOString(), ...closingPreview };
    setState((current) => ({
      ...current,
      cashSessions: current.cashSessions.map((session) => session.id === activeSession.id ? report : session)
    }));
    setCloseReport(report);
    setLastOrder(null);
    setIsCloseOpen(false);
    setCart([]);
    scheduleSinglePagePrint('.close-report');
  }

  function printReceipt(order = lastOrder) {
    if (!order) return;
    setCloseReport(null);
    setLastOrder(order);
    scheduleSinglePagePrint('.print-receipt:not(.close-report)');
  }

  function signOut() {
    clearPinSession();
    setState(null);
    setPinToken(null);
  }

  return (
    <div className="app-shell">
        {cloudError ? <div className="storage-warning">{cloudError}</div> : null}
        <header className="topbar">
          <div>
            <h1>{state.settings.businessName}</h1>
          </div>
          <nav className="tabs" aria-label="Navegacao principal">
            <button className={activeTab === 'pos' ? 'active' : ''} onClick={() => setActiveTab('pos')}>Caixa</button>
            <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>Admin</button>
            {activeSession ? <button className="close-shop-button" onClick={startCloseShop}>Fechar loja</button> : null}
          </nav>
        </header>

        {activeTab === 'pos' ? (
          <PosScreen
            categories={state.categories}
            products={state.products}
            cart={cart}
            total={total}
            onAdd={addToCart}
            onQuantity={changeQuantity}
            onRemove={removeItem}
            onFinalize={finalizeOrder}
          />
        ) : (
          <AdminPanel
            state={state}
            setState={setState}
            onPrintOrder={printReceipt}
            activeSession={activeSession}
            onSignOut={signOut}
            syncStatus={syncStatus}
          />
        )}

        {!activeSession ? (
          <div className="modal-backdrop">
            <form className="modal cash-modal" onSubmit={openShop} role="dialog" aria-modal="true">
              <div><p className="eyebrow">Novo dia</p><h2>Abrir loja</h2></div>
              <p>Indique o dinheiro que esta na caixa antes da primeira venda.</p>
              <NumericKeypad label="Fundo inicial (EUR)" value={openingAmount} onChange={setOpeningAmount} decimal />
              <button className="primary-action" type="submit">Abrir caixa</button>
            </form>
          </div>
        ) : null}

        {pendingPaymentOrder ? (
          <div className="modal-backdrop">
            <form className="modal modal-form" onSubmit={confirmPayment} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
              <h2 id="payment-modal-title">Valor recebido</h2>
              <div className="payment-summary">
                <div className="payment-line"><span>Total</span><strong>{formatCurrency(pendingPaymentOrder.total)}</strong></div>
                <label>Pagamento
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="cash">Dinheiro</option>
                    <option value="card">Cartão</option>
                    <option value="mbway">MB Way</option>
                    <option value="other">Outro</option>
                  </select>
                </label>
                {paymentMethod === 'cash' ? (
                  <>
                    <NumericKeypad label="Valor dado (EUR)" value={paidAmount} onChange={setPaidAmount} decimal />
                    <div className="payment-line">
                      <span>Troco</span>
                      <strong className="payment-change">{formatCurrency(Math.max(0, (parseMoney(paidAmount) || 0) - pendingPaymentOrder.total))}</strong>
                    </div>
                  </>
                ) : null}
              </div>
              {paymentMethod === 'cash' && paidAmount && parseMoney(paidAmount) < pendingPaymentOrder.total ? <p className="error">O valor dado e inferior ao total.</p> : null}
              <div className="modal-actions">
                <button className="secondary-action" type="button" onClick={() => { setPendingPaymentOrder(null); setPaidAmount(''); }}>Cancelar</button>
                <button className="primary-action" disabled={paymentMethod === 'cash' && (!paidAmount || Number.isNaN(parseMoney(paidAmount)) || parseMoney(paidAmount) < pendingPaymentOrder.total)}>Confirmar</button>
              </div>
            </form>
          </div>
        ) : null}

        {isCloseOpen ? <div className="modal-backdrop">
            <form className="modal cash-modal" onSubmit={closeShop} role="dialog" aria-modal="true">
              <div><p className="eyebrow">Resumo do dia</p><h2>Confirmar fecho</h2></div>
              <div className="close-preview">
                <div><span>Fundo inicial</span><strong>{formatCurrency(activeSession.openingAmount)}</strong></div>
                <div><span>Pedidos ({closingPreview.orderCount})</span><strong>{formatCurrency(closingPreview.salesTotal)}</strong></div>
                <div><span>Despesas</span><strong>-{formatCurrency(closingPreview.expensesTotal)}</strong></div>
                <div className="final"><span>Valor final</span><strong>{formatCurrency(closingPreview.finalAmount)}</strong></div>
              </div>
              <div className="modal-actions">
                <button className="secondary-action" type="button" onClick={() => setIsCloseOpen(false)}>Cancelar</button>
                <button className="danger-action">Fechar e imprimir</button>
              </div>
            </form>
        </div> : null}

        {pendingReceiptOrder ? (
          <div className="modal-backdrop">
            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="receipt-modal-title">
              <h2 id="receipt-modal-title">Imprimir talão?</h2>
              <p>O pedido foi finalizado. Deseja imprimir o talão agora?</p>
              <div className="modal-actions">
                <button className="secondary-action" onClick={() => setPendingReceiptOrder(null)}>Nao</button>
                <button className="primary-action" onClick={() => { const order = pendingReceiptOrder; setPendingReceiptOrder(null); printReceipt(order); }}>Sim</button>
              </div>
            </div>
          </div>
        ) : null}

        <Receipt order={lastOrder} />
        <CloseReport report={closeReport} businessName={state.settings.businessName} />
      </div>
  );
}

function CloseReport({ report, businessName }) {
  if (!report) return null;
  return (
    <section className="print-receipt close-report" aria-label="Relatorio de fecho de caixa">
      <h2>{businessName}</h2>
      <p><strong>FECHO DE CAIXA</strong></p>
      <hr />
      <p>Abertura: {new Date(report.openedAt).toLocaleString('pt-PT')}</p>
      <p>Fecho: {new Date(report.closedAt).toLocaleString('pt-PT')}</p>
      <hr />
      <div className="receipt-row"><span>Fundo inicial</span><span>{formatCurrency(report.openingAmount)}</span></div>
      <div className="receipt-row"><span>Vendas ({report.orderCount})</span><span>{formatCurrency(report.salesTotal)}</span></div>
      <div className="receipt-row"><span>Despesas</span><span>-{formatCurrency(report.expensesTotal)}</span></div>
      <div className="receipt-row total"><span>Resultado do dia</span><span>{formatCurrency(report.result)}</span></div>
      <hr />
      <div className="receipt-row total"><span>Valor final em caixa</span><span>{formatCurrency(report.finalAmount)}</span></div>
      {report.expenses.length ? (
        <>
          <hr />
          <p><strong>DESPESAS</strong></p>
          {report.expenses.map((expense) => (
            <div className="receipt-row" key={expense.id}><span>{expense.description}</span><span>{formatCurrency(expense.amount)}</span></div>
          ))}
        </>
      ) : null}
      <hr />
      <p>Relatorio guardado na cloud</p>
    </section>
  );
}

function scheduleSinglePagePrint(selector) {
  window.setTimeout(() => {
    const receipt = document.querySelector(selector);
    if (!receipt) return;

    const printFrame = document.createElement('iframe');
    printFrame.title = 'Impressão do talão';
    printFrame.style.cssText = 'border:0;height:0;position:fixed;right:0;bottom:0;width:0;';
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentDocument;
    printDocument.open();
    printDocument.write(`<!doctype html>
      <html lang="pt-PT">
        <head><meta charset="UTF-8"><title></title></head>
        <body>${receipt.outerHTML}</body>
      </html>`);
    printDocument.close();

    const receiptCopy = printDocument.querySelector('.print-receipt');
    receiptCopy.classList.remove('print-measurement');
    receiptCopy.style.display = 'block';

    const receiptStyles = printDocument.createElement('style');
    receiptStyles.textContent = `
      * { box-sizing: border-box; }
      @page { margin: 0 !important; }
      html, body {
        background: #fff; height: auto; margin: 0 !important; padding: 0 !important;
        overflow: hidden; width: 72mm;
      }
      .print-receipt {
        color: #000; display: block; font-family: "Courier New", monospace;
        font-size: 12px; padding: 2mm; width: 72mm;
      }
      h2, p { margin: 0 0 6px; text-align: center; }
      hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
      .receipt-row { display: flex; gap: 8px; justify-content: space-between; margin: 5px 0; }
      .receipt-row span:last-child { flex-shrink: 0; }
      .receipt-row.total { font-size: 14px; font-weight: 700; }
      .thanks { margin-top: 12px; }
    `;
    printDocument.head.appendChild(receiptStyles);

    window.requestAnimationFrame(() => {
      const heightInMillimetres = Math.max(
        25,
        Math.ceil(receiptCopy.getBoundingClientRect().height * 25.4 / 96) + 2
      );
      const pageStyle = printDocument.createElement('style');
      pageStyle.textContent = `@page { size: 72mm ${heightInMillimetres}mm; margin: 0; }`;
      printDocument.head.appendChild(pageStyle);

      const removeFrame = () => window.setTimeout(() => printFrame.remove(), 500);
      printFrame.contentWindow.addEventListener('afterprint', removeFrame, { once: true });
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    });
  }, 100);
}
