import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import watches from '../watches';

const CategoryPage = () => {
  const { categoryKey } = useParams();
  const location = useLocation();
  const { addToCart, toggleFavorite, isInCart, isFavorite, addVisited } = useApp();
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = (searchParams.get('search') || '').toLowerCase().trim();

  // Get dynamic categories
  const getDynamicCategories = () => {
    const base = [
      { key: "all", label: "All Watches" },
      { key: "men", label: "Men's Watches" },
      { key: "women", label: "Women's Watches" },
      { key: "digital", label: "Digital Watches" },
      { key: "analog", label: "Analog Watches" }
    ];

    const dynamic = [];
    const watchTypes = [...new Set(watches.map(watch => watch.type))];
    watchTypes.forEach(type => {
      if (type && type !== "analog" && type !== "digital") {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + " Watches";
        dynamic.push({ key: type, label: typeLabel });
      }
    });

    const all = [...base, ...dynamic];

    const hasLuxuryWatches = watches.some(watch => watch.price > 50000);
    if (hasLuxuryWatches) {
      all.push({ key: "luxury", label: "Luxury Watches" });
    }

    // Keep the LAST occurrence for any duplicate keys (e.g., ensure only final 'Luxury Watches' remains)
    const seen = new Set();
    const result = [];
    for (let i = all.length - 1; i >= 0; i--) {
      const c = all[i];
      if (!seen.has(c.key)) {
        seen.add(c.key);
        result.push(c);
      }
    }
    return result.reverse();
  };

  const categories = getDynamicCategories();
  const currentCategory = categories.find(cat => cat.key === categoryKey);

  // Filter watches based on category
  const getFilteredWatches = () => {
    let filtered = watches;

    if (categoryKey !== "all") {
      if (categoryKey === "luxury") {
        filtered = filtered.filter((watch) => watch.price > 50000);
      } else if (categoryKey === "men" || categoryKey === "women") {
        filtered = filtered.filter((watch) => watch.gender === categoryKey);
      } else if (categoryKey === "digital" || categoryKey === "analog") {
        filtered = filtered.filter((watch) => watch.type === categoryKey);
      } else {
        // Filter by watch type (smartwatch, etc.)
        filtered = filtered.filter((watch) => watch.type === categoryKey);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter((watch) => {
        const hay = `${watch.name} ${watch.brand} ${watch.type} ${watch.description}`.toLowerCase();
        return hay.includes(searchTerm);
      });
    }

    // Sort by rating and price
    return filtered.sort((a, b) => {
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

  return (
    <div className="category-page">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span> / </span>
          <span>{currentCategory?.label || 'Category'}</span>
        </div>
        <h1 className="page-title">
          {currentCategory?.label || 'Category'}
        </h1>
        <p className="page-subtitle">
          {filteredWatches.length} {filteredWatches.length === 1 ? 'watch' : 'watches'} found{searchTerm ? ` for "${searchTerm}"` : ''}
        </p>
      </div>

      <div className="category-filters">
        <div className="filter-section">
          <h3>Categories</h3>
          <div className="filter-buttons">
            {categories.map((category) => (
              <Link
                key={category.key}
                to={`/category/${category.key}`}
                className={`filter-btn ${categoryKey === category.key ? 'active' : ''}`}
              >
                {category.label}
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
          <p>Try selecting a different category or browse our full collection.</p>
          <Link to="/category/all" className="btn-primary">
            View All Watches
          </Link>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
