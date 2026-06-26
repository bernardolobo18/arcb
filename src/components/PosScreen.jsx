import { Minus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '../utils/money.js';

export function PosScreen({
  categories,
  products,
  cart,
  subtotal,
  discountAmount,
  total,
  onAdd,
  onQuantity,
  onRemove,
  onDiscountChange,
  onFinalize
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');

  useEffect(() => {
    if (!categories.some((category) => category.id === categoryId)) {
      setCategoryId(categories[0]?.id ?? '');
    }
  }, [categories, categoryId]);

  const visibleProducts = useMemo(
    () => products.filter((product) => product.categoryId === categoryId),
    [categoryId, products]
  );

  return (
    <main className="pos-layout">
      <section className="catalog">
        <div className="category-bar">
          {categories.map((category) => (
            <button
              key={category.id}
              className={categoryId === category.id ? 'active' : ''}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => (
            <button key={product.id} className="product-button" onClick={() => onAdd(product)}>
              <span>{product.name}</span>
              <strong>{formatCurrency(product.price)}</strong>
            </button>
          ))}
        </div>
      </section>

      <aside className="cart-panel">
        <div className="cart-header">
          <div>
            <p className="eyebrow">Pedido atual</p>
            <h2>Total {formatCurrency(total)}</h2>
          </div>
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <p className="empty-state">Adicione produtos para iniciar o pedido.</p>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={item.productId}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.quantity} x {formatCurrency(item.price)}
                  </span>
                </div>
                <strong>{formatCurrency(item.price * item.quantity)}</strong>
                <div className="icon-actions">
                  <button aria-label="Diminuir quantidade" onClick={() => onQuantity(item.productId, -1)}>
                    <Minus size={18} />
                  </button>
                  <button aria-label="Aumentar quantidade" onClick={() => onQuantity(item.productId, 1)}>
                    <Plus size={18} />
                  </button>
                  <button aria-label="Remover produto" onClick={() => onRemove(item.productId)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-totals">
            <div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <label>Desconto
              <input
                inputMode="decimal"
                placeholder="0,00"
                value={discountAmount}
                onChange={(event) => onDiscountChange(event.target.value)}
              />
            </label>
          </div>
          <button className="primary-action" disabled={!cart.length} onClick={onFinalize}>
            Finalizar pedido
          </button>
        </div>
      </aside>
    </main>
  );
}
