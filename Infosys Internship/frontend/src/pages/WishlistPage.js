import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const WishlistPage = () => {
  const {
    favorites,
    removeFromFavorites,
    addToCart,
    isInCart,
    addVisited
  } = useApp();

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i}>{i < Math.floor(rating) ? '★' : '☆'}</span>
    ));
  };

  if (favorites.length === 0) {
    return (
      <div className="wishlist-page">
        <div className="empty-wishlist">
          <div className="empty-wishlist-icon">❤️</div>
          <h3>Your wishlist is empty</h3>
          <p>Add some watches to your wishlist to save them for later!</p>
          <Link to="/" className="btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="page-header">
        <h1 className="page-title">Your Wishlist</h1>
        <p className="page-subtitle">
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'} in your wishlist
        </p>
      </div>

      <div className="watches-grid">
        {favorites.map((watch) => (
          <div key={watch.id} className="watch-card">
            <div className="watch-image-container">
              <img
                src={watch.image}
                alt={watch.name}
                className="watch-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/300x300/1a1a1a/ffffff?text=⌚";
                }}
              />
              <div className="watch-badges">
                {watch.discount > 0 && (
                  <span className="discount-badge">-{watch.discount}%</span>
                )}
                {watch.price > 50000 && (
                  <span className="luxury-badge">LUXURY</span>
                )}
              </div>
              <div className="watch-actions">
                <button
                  className="action-btn wishlist-btn active"
                  onClick={() => removeFromFavorites(watch.id)}
                  title="Remove from Wishlist"
                >
                  ❤️
                </button>
                <Link
                  to={`/product/${watch.id}`}
                  className="action-btn quick-view-btn"
                  title="Quick View"
                >
                  👁
                </Link>
              </div>
            </div>
            <div className="watch-info">
              <div className="watch-brand">{watch.brand}</div>
              <h3 className="watch-name">{watch.name}</h3>
              <div className="watch-rating">
                <span className="stars">{renderStars(watch.overallRating)}</span>
                <span className="rating-text">({watch.overallRating})</span>
              </div>
              <div className="watch-price">
                {watch.discount > 0 ? (
                  <>
                    <span className="original-price">₹{watch.price.toLocaleString("en-IN")}</span>
                    <span className="final-price">₹{watch.finalPrice.toLocaleString("en-IN")}</span>
                  </>
                ) : (
                  <span className="final-price">₹{watch.price.toLocaleString("en-IN")}</span>
                )}
              </div>
              <div className="watch-actions-bottom">
                <button
                  className={`add-to-cart-btn ${isInCart(watch.id) ? 'in-cart' : ''}`}
                  onClick={() => addToCart(watch)}
                >
                  {isInCart(watch.id) ? '✓ Added' : 'Add to Cart'}
                </button>
                <Link to={`/product/${watch.id}`} className="btn-secondary" onClick={() => addVisited(watch)}>
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
