import { formatCurrency } from '../utils/money.js';

export function Receipt({ order }) {
  if (!order) return null;

  return (
    <section className="print-receipt" aria-label="Talão para impressão">
      {order.items.map((item, index) => (
        <div className="receipt-row" key={`${item.productId || item.name}-${index}`}>
          <span>{item.quantity} x {item.name}</span>
          <span>{formatCurrency(item.price * item.quantity)}</span>
        </div>
      ))}
      <hr />
      {order.discount ? (
        <div className="receipt-row">
          <span>Desconto</span>
          <span>-{formatCurrency(order.discount)}</span>
        </div>
      ) : null}
      <div className="receipt-row total">
        <span>Total</span>
        <span>{formatCurrency(order.total)}</span>
      </div>
      <div className="receipt-row">
        <span>Pagamento</span>
        <span>{paymentLabel(order.paymentMethod)}</span>
      </div>
      {order.paymentMethod === 'cash' && Number.isFinite(order.paidAmount) ? (
        <>
          <div className="receipt-row">
            <span>Entregue</span>
            <span>{formatCurrency(order.paidAmount)}</span>
          </div>
          <div className="receipt-row">
            <span>Troco</span>
            <span>{formatCurrency(order.change)}</span>
          </div>
        </>
      ) : null}
      <p className="thanks">Obrigado pela preferência</p>
    </section>
  );
}

function paymentLabel(method) {
  return {
    cash: 'Dinheiro',
    card: 'Cartão',
    mbway: 'MB Way',
    other: 'Outro'
  }[method] || 'Dinheiro';
}
