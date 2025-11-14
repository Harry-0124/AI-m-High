import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const CartPage = () => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getTotalCartPrice,
    getTotalCartItems
  } = useApp();

  const formatPrice = (price) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some beautiful timepieces to get started!</p>
          <Link to="/" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="page-header">
        <h1 className="page-title">Your Cart</h1>
        <p className="page-subtitle">
          {getTotalCartItems()} {getTotalCartItems() === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="cart-container">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img
                src={item.image}
                alt={item.name}
                className="cart-item-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/100x100/1a1a1a/ffffff?text=⌚";
                }}
              />
              <div className="cart-item-info">
                <h3 className="cart-item-name">{item.name}</h3>
                <div className="cart-item-brand">{item.brand}</div>
                <div className="cart-item-price">{formatPrice(item.finalPrice)}</div>
                <Link to={`/product/${item.id}`} className="view-product-link">
                  View Product
                </Link>
              </div>
              <div className="cart-item-controls">
                <div className="quantity-controls">
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="remove-btn"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="cart-summary">
          <div className="summary-header">
            <h3>Order Summary</h3>
            <button onClick={clearCart} className="clear-cart-btn">
              Clear Cart
            </button>
          </div>
          
          <div className="summary-row">
            <span>Subtotal ({getTotalCartItems()} items):</span>
            <span>{formatPrice(getTotalCartPrice())}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>Free</span>
          </div>
          <div className="summary-row">
            <span>Tax:</span>
            <span>Included</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>{formatPrice(getTotalCartPrice())}</span>
          </div>
          
          <button className="btn-primary checkout-btn">
            Proceed to Checkout
          </button>
          
          <Link to="/" className="continue-shopping-btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
