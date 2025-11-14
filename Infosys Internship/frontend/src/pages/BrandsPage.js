import React from 'react';
import { Link } from 'react-router-dom';
import watches from '../watches';

const BrandsPage = () => {
  // Get all unique brands
  const brands = [...new Set(watches.map((watch) => watch.brand))].sort();

  return (
    <div className="brands-page">
      <div className="page-header">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span> / </span>
          <span>Brands</span>
        </div>
        <h1 className="page-title">All Brands</h1>
        <p className="page-subtitle">
          Discover watches from {brands.length} premium brands
        </p>
      </div>

      <div className="brands-grid-large">
        {brands.map((brand) => {
          const brandWatches = watches.filter(watch => watch.brand === brand);
          const watchCount = brandWatches.length;
          const avgRating = brandWatches.reduce((sum, watch) => sum + watch.overallRating, 0) / watchCount;
          const minPrice = Math.min(...brandWatches.map(watch => watch.finalPrice));
          const maxPrice = Math.max(...brandWatches.map(watch => watch.finalPrice));

          return (
            <Link
              key={brand}
              to={`/brand/${brand.toLowerCase().replace(/\s+/g, '-')}`}
              className="brand-card-large"
            >
              <div className="brand-header">
                <h3 className="brand-name">{brand}</h3>
                <div className="brand-stats">
                  <span className="watch-count">{watchCount} {watchCount === 1 ? 'watch' : 'watches'}</span>
                  <span className="avg-rating">★ {avgRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="brand-preview">
                <div className="preview-images">
                  {brandWatches.slice(0, 3).map((watch, index) => (
                    <img
                      key={watch.id}
                      src={watch.image}
                      alt={watch.name}
                      className={`preview-image preview-${index + 1}`}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80x80/1a1a1a/ffffff?text=⌚";
                      }}
                    />
                  ))}
                </div>
                <div className="price-range">
                  <span className="price-label">From</span>
                  <span className="price-value">₹{minPrice.toLocaleString("en-IN")}</span>
                  {minPrice !== maxPrice && (
                    <>
                      <span className="price-separator">to</span>
                      <span className="price-value">₹{maxPrice.toLocaleString("en-IN")}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BrandsPage;
