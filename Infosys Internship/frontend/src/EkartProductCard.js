import React from "react";

function EkartProductCard({ name, image, palette, cost, discount, isInCart, onToggleCart, onClick }) {
  const finalPrice = Math.round(cost * (1 - discount / 100));

  return (
    <div
      className="product-card"
      style={{
        border: `1.8px solid ${palette.cardBorder}`,
        backgroundColor: palette.cardBackground,
        color: palette.cardNameColor,
      }}
      onClick={onClick}
    >
      <img
        src={image}
        alt={name}
        className="product-image"
      />
      <div className="product-content">
        <div className="product-header">
          <h3 className="product-title" style={{ color: palette.cardNameColor }}>
            {name}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCart && onToggleCart();
            }}
            className={`heart-btn ${isInCart ? 'filled' : 'outlined'}`}
            style={{
              color: isInCart ? '#ff4444' : palette.navLinkColor,
              border: `1px solid ${isInCart ? '#ff4444' : palette.navLinkColor}`,
              background: isInCart ? 'rgba(255, 68, 68, 0.1)' : 'transparent',
            }}
            aria-pressed={isInCart}
            aria-label={isInCart ? "Remove from cart" : "Add to cart"}
          >
            {isInCart ? '♥' : '♡'}
          </button>
        </div>
        <p className="product-pricing" style={{ color: palette.costPriceColor }}>
          <span className="original-price" style={{ textDecoration: "line-through" }}>
            ₹{cost.toLocaleString("en-IN")}
          </span>
          <span
            className="discount-badge"
            style={{
              backgroundColor: palette.discountBadgeBackground,
              color: palette.discountBadgeColor,
            }}
          >
            {discount}% OFF
          </span>
        </p>
        <p className="final-price" style={{ color: palette.finalPriceColor }}>
          ₹{finalPrice.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

export default EkartProductCard;


