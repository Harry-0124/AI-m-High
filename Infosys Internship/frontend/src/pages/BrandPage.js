import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import watches from '../watches';

const BrandPage = () => {
  const { brandName } = useParams();
  const { addToCart, toggleFavorite, isInCart, isFavorite, addVisited } = useApp();

  // Convert URL parameter back to brand name
  const brandDisplayName = brandName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Get all unique brands
  const brands = [...new Set(watches.map((watch) => watch.brand))].sort();
  
  // Find the exact brand match
  const brand = brands.find(b => 
    b.toLowerCase().replace(/\s+/g, '-') === brandName
  );

  // Filter watches by brand
  const getFilteredWatches = () => {
    if (!brand) return [];
    
    return watches
      .filter((watch) => watch.brand === brand)
      .sort((a, b) => {
        if (b.overallRating !== a.overallRating) {
          return b.overallRating - a.overallRating;
        }
        return b.price - a.price;
      });
  };

  const filteredWatches = getFilteredWatches();

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i}>{i < Math.floor(rating) ? '★' : '☆'}</span>
    ));
  };

  if (!brand) {
    return (
      <div className="brand-page">
        <div className="no-results">
          <div className="no-results-icon">❌</div>
          <h3>Brand not found</h3>
          <p>The brand you're looking for doesn't exist in our collection.</p>
          <Link to="/brands" className="btn-primary">
            View All Brands
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-page">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span> / </span>
          <Link to="/brands">Brands</Link>
          <span> / </span>
          <span>{brand}</span>
        </div>
        <h1 className="page-title">
          {brand} Watches
        </h1>
        <p className="page-subtitle">
          {filteredWatches.length} {filteredWatches.length === 1 ? 'watch' : 'watches'} from {brand}
        </p>
      </div>

      <div className="brand-filters">
        <div className="filter-section">
          <h3>Other Brands</h3>
          <div className="filter-buttons">
            {brands.map((brandItem) => (
              <Link
                key={brandItem}
                to={`/brand/${brandItem.toLowerCase().replace(/\s+/g, '-')}`}
                className={`filter-btn ${brand === brandItem ? 'active' : ''}`}
              >
                {brandItem}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="watches-grid">
        {filteredWatches.map((watch) => (
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
                  className={`action-btn wishlist-btn ${isFavorite(watch.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(watch)}
                  title={isFavorite(watch.id) ? "Remove from Wishlist" : "Add to Wishlist"}
                >
                  {isFavorite(watch.id) ? '❤️' : '♡'}
                </button>
                <Link
                  to={`/product/${watch.id}`}
                  className="action-btn quick-view-btn"
                  onClick={() => addVisited(watch)}
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

      {filteredWatches.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>No watches found</h3>
          <p>We don't have any watches from {brand} at the moment.</p>
          <Link to="/brands" className="btn-primary">
            View All Brands
          </Link>
        </div>
      )}
    </div>
  );
};

export default BrandPage;
