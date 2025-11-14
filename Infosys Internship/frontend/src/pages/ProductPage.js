import React, { useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import watches from '../watches';

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isInCart, isFavorite, addVisited } = useApp();

  const watch = watches.find(w => w.id === parseInt(productId));
  const watchId = watch ? watch.id : null;

  const addVisitedRef = useRef(addVisited);
  useEffect(() => { addVisitedRef.current = addVisited; }, [addVisited]);
  useEffect(() => {
    if (!watchId) return;
    const w = watches.find(x => x.id === watchId);
    if (w) addVisitedRef.current(w);
    // Run only when the product id changes to avoid infinite updates
  }, [watchId]);

  if (!watch) {
    return (
      <div className="product-page">
        <div className="no-results">
          <div className="no-results-icon">❌</div>
          <h3>Product not found</h3>
          <p>The product you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i}>{i < Math.floor(rating) ? '★' : '☆'}</span>
    ));
  };

  const handleAddToCart = () => {
    addToCart(watch);
    navigate('/cart');
  };

  return (
    <div className="product-page">
      <div style={{ paddingTop: '12px', marginBottom: '8px' }}>
        <button className="btn-secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to={`/category/${watch.gender}`}>{watch.gender.charAt(0).toUpperCase() + watch.gender.slice(1)}'s Watches</Link>
        <span> / </span>
        <Link to={`/brand/${watch.brand.toLowerCase().replace(/\s+/g, '-')}`}>{watch.brand}</Link>
        <span> / </span>
        <span>{watch.name}</span>
      </div>

      <div className="product-detail-container">
        <div className="product-images">
          <img
            src={watch.image}
            alt={watch.name}
            className="main-product-image"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/500x500/1a1a1a/ffffff?text=⌚";
            }}
          />
        </div>
        <div className="product-info">
          <div className="product-brand">{watch.brand}</div>
          <h1 className="product-name">{watch.name}</h1>
          <div className="product-rating">
            <span className="stars">{renderStars(watch.overallRating)}</span>
            <span className="rating-text">({watch.overallRating}/5)</span>
            <span className="review-count">({watch.reviews.length} reviews)</span>
          </div>
          <div className="product-price">
            {watch.discount > 0 ? (
              <>
                <span className="original-price">₹{watch.price.toLocaleString("en-IN")}</span>
                <span className="final-price">₹{watch.finalPrice.toLocaleString("en-IN")}</span>
                <span className="discount-text">Save ₹{(watch.price - watch.finalPrice).toLocaleString("en-IN")}</span>
              </>
            ) : (
              <span className="final-price">₹{watch.price.toLocaleString("en-IN")}</span>
            )}
          </div>
          <p className="product-description">{watch.description}</p>
          
          <div className="product-features">
            <h3>Key Features:</h3>
            <ul>
              <li>Premium {watch.type} design</li>
              <li>High-quality materials</li>
              <li>Water-resistant construction</li>
              <li>Manufacturer warranty included</li>
              <li>Perfect for {watch.gender} users</li>
            </ul>
          </div>

          <div className="product-reviews">
            <h3>Customer Reviews</h3>
            <div className="reviews-list">
              {watch.reviews.slice(0, 3).map((review, index) => (
                <div key={index} className="review-item">
                  <div className="review-header">
                    <span className="review-user">{review.user}</span>
                    <span className="review-rating">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                      ))}
                    </span>
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="product-actions">
            <button
              className="btn-primary buy-now-btn"
              onClick={handleAddToCart}
            >
              Buy Now
            </button>
            <button
              className={`btn-secondary add-to-cart-btn ${isInCart(watch.id) ? 'in-cart' : ''}`}
              onClick={() => addToCart(watch)}
            >
              {isInCart(watch.id) ? '✓ Added to Cart' : 'Add to Cart'}
            </button>
            <button
              className={`btn-outline wishlist-btn ${isFavorite(watch.id) ? 'active' : ''}`}
              onClick={() => toggleFavorite(watch)}
            >
              {isFavorite(watch.id) ? '❤️ Remove from Wishlist' : '♡ Add to Wishlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
