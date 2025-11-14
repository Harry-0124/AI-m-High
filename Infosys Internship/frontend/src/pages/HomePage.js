import React from 'react';
import { Link } from 'react-router-dom';
import watches from '../watches';
import LogoImage from '../logo.png';

const HomePage = () => {
  // Get unique brands for quick access
  const brands = [...new Set(watches.map((watch) => watch.brand))].sort();


  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Where Every Second is Luxury</h1>
          <p className="hero-subtitle">
            Timeless Elegance, Modern Design
          </p>
          <p className="hero-description">
            Discover our curated collection of premium timepieces from the world's most
            prestigious brands. Each watch tells a story of craftsmanship, precision,
            and unparalleled luxury.
          </p>
          <div className="hero-buttons">
            <Link to="/category/all" className="btn-primary">
              Shop Now
            </Link>
            <Link to="/brands" className="btn-secondary">
              Explore Collections
            </Link>
          </div>
        </div>


        <div className="hero-image">
          <img
            src={LogoImage}
            alt="TimeBee logo"
            className="hero-image-img"
          />
        </div>
      </section>

      {/* Special Features */}
      <section className="features-section">
        <div className="features-container">
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <h3>100% Authentic</h3>
            <p>Guaranteed genuine luxury watches</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🚚</div>
            <h3>Free Shipping</h3>
            <p>Across India with premium packaging</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎁</div>
            <h3>2-Year Warranty</h3>
            <p>Manufacturer warranty included</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔄</div>
            <h3>Easy Returns</h3>
            <p>30-day hassle-free returns</p>
          </div>
        </div>
      </section>


      {/* Brands Showcase */}
      <section className="brands-section">
        <h2 className="section-title">Premium Brands</h2>
        <div className="brands-grid">
          {brands.slice(0, 12).map((brand) => (
            <Link
              key={brand}
              to={`/brand/${brand.toLowerCase().replace(/\s+/g, '-')}`}
              className="brand-card"
            >
              <div className="brand-logo">{brand}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Watches */}
      <section className="featured-section">
        <h2 className="section-title">Featured Timepieces</h2>
        <div className="watches-grid">
          {watches.slice(0, 8).map((watch) => (
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
              </div>
              <div className="watch-info">
                <div className="watch-brand">{watch.brand}</div>
                <h3 className="watch-name">{watch.name}</h3>
                <div className="watch-rating">
                  <span className="stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i}>{i < Math.floor(watch.overallRating) ? '★' : '☆'}</span>
                    ))}
                  </span>
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
                <Link to={`/product/${watch.id}`} className="btn-primary view-product-btn">
                  View Product
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
