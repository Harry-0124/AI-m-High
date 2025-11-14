import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import "./App.css";
import watches from "./watches";

// Import pages
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import BrandPage from "./pages/BrandPage";
import BrandsPage from "./pages/BrandsPage";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";

// Auth and utility pages inline to avoid new files
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, isAdmin, currentUser } = useApp();

  useEffect(() => {
    if (currentUser) {
      if (isAdmin()) navigate('/admin', { replace: true }); else navigate('/profile', { replace: true });
    }
  }, [currentUser, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login({ email, password });
      if (user && (user.username === 'admin' || isAdmin())) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/profile', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="page-header" style={{ paddingTop: '120px' }}>
      <h1 className="page-title">Login</h1>
      <div style={{ maxWidth: 420, margin: 'var(--spacing-xl) auto', background: 'var(--accent-navy)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)' }}>
        {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-sm)' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <input className="search-input" placeholder="Email or Username" autoComplete="username" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 'var(--spacing-md)', position: 'relative' }}>
            <input className="search-input" type={showPwd ? 'text' : 'password'} placeholder="Password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button type="button" className="footer-link" onClick={()=>setShowPwd(s=>!s)} style={{ position:'absolute', right: '12px', top: '50%', transform:'translateY(-50%)' }}>
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
          <button className="btn-primary" type="submit" style={{ width: '100%' }}>Login</button>
        </form>
        <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', opacity: 0.7 }}>
          <span className="footer-link" aria-disabled>Registration is disabled for this demo</span>
        </div>
      </div>
    </div>
  );
};

const SignupPage = () => {
  return (
    <div className="featured-section" style={{ paddingTop: '120px' }}>
      <h1 className="page-title">Create Account</h1>
      <div style={{ maxWidth: 520, margin: 'var(--spacing-xl) auto', background: 'var(--accent-navy)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-xl)' }}>
        <div style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-sm)' }}>Registration is disabled in this demo.</div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" className="footer-link">Go to Login</Link>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  // Small helper to avoid stuck requests
  const requestJson = async (url, options = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      const ok = res.ok;
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      return { ok, data };
    } catch (err) {
      return { ok: false, data: null, error: err?.name === 'AbortError' ? 'Request timed out. Please try again.' : (err?.message || 'Network error') };
    } finally {
      clearTimeout(id);
    }
  };
  // --- Backend API state ---
  const [features, setFeatures] = React.useState({
    // TODO: align with backend model features order if known
    brand: '',
    category: '',
    battery_life: '',
    display_size: '',
  });
  const [predictLoading, setPredictLoading] = React.useState(false);
  const [predictError, setPredictError] = React.useState('');
  const [predictedPrice, setPredictedPrice] = React.useState(null);

  const [insightLoading, setInsightLoading] = React.useState(false);
  const [insightError, setInsightError] = React.useState('');
  const [insight, setInsight] = React.useState('');

  const [products, setProducts] = React.useState([]);
  const [streaming, setStreaming] = React.useState(false);
  const esRef = React.useRef(null);
  const [active, setActive] = React.useState('dashboard'); // 'dashboard' | 'ml' | 'ai' | 'scraped'
  const aiRunRef = React.useRef(false);

  React.useEffect(() => {
    // Open SSE only when 'scraped' section is active
    if (active !== 'scraped') {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      setStreaming(false);
      return;
    }
    const es = new EventSource('http://127.0.0.1:8000/api/products/scraped/stream');
    esRef.current = es;
    setStreaming(true);

    es.onmessage = (event) => {
      try {
        const product = JSON.parse(event.data);
        setProducts((prev) => [...prev, product]);
      } catch (_) {
        // ignore bad chunk
      }
    };
    es.onerror = () => {
      setStreaming(false);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };

    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [active]);

  const onPredict = async (e) => {
    e.preventDefault();
    if (predictLoading) return;
    setPredictLoading(true); setPredictError(''); setPredictedPrice(null);
    try {
      const brandEl = document.getElementById('brand');
      const categoryEl = document.getElementById('category');
      const batteryEl = document.getElementById('battery');
      const screenEl = document.getElementById('screen');

      const payload = {
        brand: brandEl ? brandEl.value : '',
        category: categoryEl ? categoryEl.value : '',
        battery_mah: batteryEl ? parseFloat(batteryEl.value) : null,
        screen_inch: screenEl ? parseFloat(screenEl.value) : null,
      };

      const { ok, data, error } = await requestJson('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 120000);

      if (!ok) {
        const msg = (error && (error.includes('Network') || error.includes('Failed to fetch'))) ? 'Cannot reach the ML service. Ensure http://127.0.0.1:5000 is running.' : (error || 'The request failed or timed out, please try again.');
        setPredictError(msg);
        return;
      }

      if (data?.error) {
        setPredictError(typeof data.error === 'string' ? data.error : 'Prediction failed.');
        return;
      }

      const price = data?.predicted_price ?? data?.price;
      if (price === undefined || price === null) {
        setPredictError('Server returned no result. Please verify inputs.');
        return;
      }
      setPredictedPrice(price);
    } catch (err) {
      setPredictError('The request failed or timed out, please try again.');
    } finally {
      setPredictLoading(false);
    }
  };



  // --- Derived metrics for Dashboard ---
  const totalWatches = Array.isArray(watches) ? watches.length : 0;
  const brandCounts = React.useMemo(() => {
    const map = new Map();
    (watches || []).forEach(w => map.set(w.brand, (map.get(w.brand) || 0) + 1));
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  }, []);
  const totalBrands = brandCounts.length;
  const top5 = brandCounts.slice(0,5);
  const totalMen = (watches || []).filter(w => (w.gender||'').toLowerCase()==='men').length;
  const totalWomen = (watches || []).filter(w => (w.gender||'').toLowerCase()==='women').length;

  // Dashboard: compute top 5 watches by review count (as a proxy for interest)
  const top5Watches = React.useMemo(() => {
    const list = (watches || []).map(w => ({ id: w.id, name: w.name, image: w.image, count: Array.isArray(w.reviews) ? w.reviews.length : 0 }));
    return list.sort((a,b)=>b.count-a.count).slice(0,5);
  }, []);

  const ourWatch = React.useMemo(() => (watches || []).find(w => w.id === 114 || w.name === 'Apple Watch Series 10'), []);
  // Auto-run AI analysis when AI section becomes active (inline, stable deps)
  React.useEffect(() => {
    if (active === 'ai' && !aiRunRef.current) {
      aiRunRef.current = true;
      (async () => {
        setInsightLoading(true); setInsightError(''); setInsight('');
        try {
          const q = 'Given these competitor prices in Indian Rupees (₹), what pricing and offer strategy should I use for Apple Watch Series 10 to maximize profit and sales compared to these sites? All amounts are in Indian Rupees only. Recommend a selling price and any necessary discounts, and ensure your analysis uses INR throughout.';
          let r = await requestJson('http://127.0.0.1:8000/api/llm/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q })
          }, 120000);
          if (!r.ok) {
            r = await requestJson('http://127.0.0.1:8000/api/llm/insight', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q })
            }, 120000);
          }
          if (!r.ok) {
            const msg = (r.error && (r.error.includes('Network') || r.error.includes('Failed to fetch'))) ? 'Cannot reach the backend. Check network or server status.' : (r.error || 'The request failed or timed out, please try again.');
            setInsightError(msg);
            return;
          }
          const data = r.data || {};
          if (data?.success === false) {
            setInsightError(data?.error || 'The AI service could not generate an insight. Please try again with a shorter prompt.');
            return;
          }
          const text = data?.insight || (typeof data === 'string' ? data : JSON.stringify(data));
          setInsight(text);
        } catch (err) {
          setInsightError('The request failed or timed out, please try again.');
        } finally {
          setInsightLoading(false);
        }
      })();
    }
    if (active !== 'ai') {
      aiRunRef.current = false; // allow re-run if user switches away and back
    }
  }, [active]);

  return (
    <div className="featured-section" style={{ paddingTop: '0.5cm' }}>
      <div className="page-header">
        <h1 className="page-title">Admin Portal</h1>
        <p className="page-subtitle">Analytics · Management · Insights</p>
      </div>

      <div style={{ maxWidth: 1280, margin:'0 auto', display:'grid', gridTemplateColumns:'220px 1fr', gap:'var(--spacing-xl)' }}>
        {/* Sidebar */}
        <aside
          className="watch-card"
          style={{
            height: 'fit-content',
            transform: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '16px'
          }}
        >
          <div
            className="watch-info"
            style={{ display: 'grid', gap: 14, alignItems: 'center', justifyItems: 'center', textAlign: 'center', padding: 6 }}
          >
            <button
              className={`btn-secondary ${active==='dashboard'?'in-cart':''}`}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9999,
                padding: '10px 14px',
                fontWeight: 700,
                background: active==='dashboard' ? 'var(--gold-primary)' : 'rgba(212,175,55,0.12)',
                color: active==='dashboard' ? 'black' : 'rgba(255,255,255,0.92)'
              }}
              onClick={() => setActive('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`btn-secondary ${active==='ml'?'in-cart':''}`}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9999,
                padding: '10px 14px',
                fontWeight: 700,
                background: active==='ml' ? 'var(--gold-primary)' : 'rgba(212,175,55,0.12)',
                color: active==='ml' ? 'black' : 'rgba(255,255,255,0.92)'
              }}
              onClick={() => setActive('ml')}
            >
              ML Prediction
            </button>
            <button
              className={`btn-secondary ${active==='ai'?'in-cart':''}`}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9999,
                padding: '10px 14px',
                fontWeight: 700,
                background: active==='ai' ? 'var(--gold-primary)' : 'rgba(212,175,55,0.12)',
                color: active==='ai' ? 'black' : 'rgba(255,255,255,0.92)'
              }}
              onClick={() => setActive('ai')}
            >
              AI Analysis
            </button>
            <button
              className={`btn-secondary ${active==='scraped'?'in-cart':''}`}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9999,
                padding: '10px 14px',
                fontWeight: 700,
                background: active==='scraped' ? 'var(--gold-primary)' : 'rgba(212,175,55,0.12)',
                color: active==='scraped' ? 'black' : 'rgba(255,255,255,0.92)'
              }}
              onClick={() => setActive('scraped')}
            >
              Compare
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <div className="admin-layout" style={{ display:'grid', gridTemplateColumns:'1fr', gap:'var(--spacing-xl)' }}>
          {active==='dashboard' && (
            <>
              <div className="brands-grid" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
                <div className="brand-card" style={{ textDecoration:'none' }}>
                  <h4 style={{ color:'var(--gold-primary)' }}>Total Watches</h4>
                  <div style={{ color:'rgba(255,255,255,0.95)', fontSize:28, fontWeight:700 }}>{totalWatches}</div>
                </div>
                <div className="brand-card" style={{ textDecoration:'none' }}>
                  <h4 style={{ color:'var(--gold-primary)' }}>Total Brands</h4>
                  <div style={{ color:'rgba(255,255,255,0.95)', fontSize:28, fontWeight:700 }}>{totalBrands}</div>
                </div>
                <div className="brand-card" style={{ textDecoration:'none' }}>
                  <h4 style={{ color:'var(--gold-primary)' }}>Total Men Watches</h4>
                  <div style={{ color:'rgba(255,255,255,0.95)', fontSize:28, fontWeight:700 }}>{totalMen}</div>
                </div>
                <div className="brand-card" style={{ textDecoration:'none' }}>
                  <h4 style={{ color:'var(--gold-primary)' }}>Total Women Watches</h4>
                  <div style={{ color:'rgba(255,255,255,0.95)', fontSize:28, fontWeight:700 }}>{totalWomen}</div>
                </div>
                <div className="brand-card" style={{ textDecoration:'none' }}>
                  <h4 style={{ color:'var(--gold-primary)' }}>Top Brand</h4>
                  <div style={{ color:'rgba(255,255,255,0.95)', fontSize:20, fontWeight:700 }}>{top5[0]?.[0] || '-'}</div>
                </div>
              </div>

              <div className="watch-card" style={{ transform:'none' }}>
                <div className="watch-info">
                  <div className="watch-name" style={{ marginBottom:'var(--spacing-sm)' }}>Top 5 Brands by Count</div>
                  <div style={{ display:'grid', gap:10 }}>
                    {top5.map(([brand, count], idx) => {
                      const max = top5[0]?.[1] || 1;
                      const pct = Math.max(6, Math.round((count / max) * 100));
                      return (
                        <div key={brand+idx} style={{ display:'grid', gridTemplateColumns:'1fr', alignItems:'center' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 90px', alignItems:'center', gap:8 }}>
                            <div style={{ background:'rgba(212,175,55,0.15)', border:'1px solid rgba(212,175,55,0.25)', borderRadius:6, overflow:'hidden' }}>
                              <div style={{ width:`${pct}%`, background:'var(--gold-primary)', height:14 }} />
                            </div>
                            <div style={{ color:'rgba(255,255,255,0.9)', textAlign:'right' }}>{count}</div>
                          </div>
                          <div style={{ color:'rgba(255,255,255,0.85)', marginTop:4 }}>{brand}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Most Visited Watches: Top 5 by Reviews Count as cards */}
              <div className="watch-card" style={{ transform:'none' }}>
                <div className="watch-info">
                  <div className="watch-name" style={{ marginBottom:'var(--spacing-sm)' }}>Most Visited Watches</div>
                  <div className="brands-grid" style={{ gridTemplateColumns:'repeat(5, 1fr)' }}>
                    {top5Watches.map((row, idx) => (
                      <div key={row.name+idx} className="brand-card" style={{ textDecoration:'none' }}>
                        <div className="watch-image-container" style={{ height: 110 }}>
                          <img src={row.image} alt={row.name} className="watch-image" />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div className="watch-name" style={{ fontSize: 14 }}>{row.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {active==='ml' && (
            <div className="watch-card" style={{ transform: 'none' }}>
              <div className="watch-info">
                <h3 className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>Predict Price (ML Model)</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>Enter product features and get a predicted selling price. Helpful for pricing decisions during listings.</p>
                <form onSubmit={onPredict} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <input id="brand" className="search-input" placeholder="Brand (e.g., Apple)" value={features.brand} onChange={(e)=>setFeatures(f=>({...f, brand: e.target.value}))} />
                  <input id="category" className="search-input" placeholder="Category (e.g., smartwatch)" value={features.category} onChange={(e)=>setFeatures(f=>({...f, category: e.target.value}))} />
                  <input id="battery" className="search-input" placeholder="Battery mAh (e.g., 300)" value={features.battery_life} onChange={(e)=>setFeatures(f=>({...f, battery_life: e.target.value}))} />
                  <input id="screen" className="search-input" placeholder="Display size (inches)" value={features.display_size} onChange={(e)=>setFeatures(f=>({...f, display_size: e.target.value}))} />
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="btn-primary" type="submit" disabled={predictLoading}>{predictLoading ? 'Predicting…' : 'Get Prediction'}</button>
                    {predictError && <span style={{ color: 'var(--danger)' }}>{predictError}</span>}
                  </div>
                  <div style={{ gridColumn: 'span 2', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                    {predictedPrice != null && !predictError
                      ? <span style={{ color: 'var(--gold-primary)', fontWeight: 600 }}>Predicted Price: ₹{Number(predictedPrice).toLocaleString('en-IN')}</span>
                      : 'Note: This is a demo prediction. Values are for experimentation and will improve with more data.'}
                  </div>
                </form>
              </div>
            </div>
          )}

          {active==='ai' && (
            <div className="watch-card" style={{ transform: 'none' }}>
              <div className="watch-info">
                <h3 className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>AI Analysis (LLM)</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)' }}>Pricing strategy for Apple Watch Series 10 vs competitors</p>
                {/* Auto-run insight for Apple Watch Series 10 (id:114) without inputs */}
                {insightLoading && <div style={{ color:'rgba(255,255,255,0.8)' }}>Generating insight…</div>}
                {insightError && <div style={{ color:'var(--danger)' }}>{insightError}</div>}
                {insight && (
                  <div style={{ marginTop: 12, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: 'var(--gold-primary)', fontWeight: 600, marginBottom: 6 }}>Recommendation</div>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.92)' }}>{insight}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {active==='scraped' && (
            <div className="watch-card" style={{ transform: 'none' }}>
              <div className="watch-info">
                <h3 className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>Compare</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Live competitor prices updating as each site finishes (for Apple Watch Series 10).</p>
                {streaming && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>Fetching latest scraped products…</div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                        <th style={{ padding: '8px 6px' }}>Website</th>
                        <th style={{ padding: '8px 6px' }}>Price</th>
                        <th style={{ padding: '8px 6px' }}>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const map = new Map();
                        products.forEach(p => {
                          const label = p.site || p.website || p.source || p.brand || '-';
                          const key = (label || '-').toLowerCase();
                          map.set(key, { label, price: p.price, link: p.link || p.url || null });
                        });
                        const rows = Array.from(map.values());
                        if (rows.length === 0) {
                          return (
                            <tr><td colSpan={3} style={{ padding: '8px 6px', color:'rgba(255,255,255,0.85)' }}>No data yet.</td></tr>
                          );
                        }
                        return rows.map((r, idx) => (
                          <tr key={(r.label||'')+idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <td style={{ padding: '8px 6px' }}>{r.label}</td>
                            <td style={{ padding: '8px 6px' }}>{typeof r.price === 'number' && !isNaN(r.price) ? `₹${Number(r.price).toLocaleString('en-IN')}` : (r.price || '-')}</td>
                            <td style={{ padding: '8px 6px' }}>{r.link ? <a className="footer-link" href={r.link} target="_blank" rel="noreferrer">Open</a> : '-'}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
                {products.length > 0 && ourWatch && (
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="watch-image-container" style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }}>
                      <img src={ourWatch.image} alt={ourWatch.name} className="watch-image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="watch-name" style={{ margin: 0 }}>Apple Watch Series 10</div>
                      <div style={{ color: 'var(--gold-primary)', fontWeight: 700, marginTop: 4 }}>₹{Number(ourWatch.finalPrice ?? ourWatch.price).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { currentUser, getTotalCartItems, favorites, logout, updateCurrentUser } = useApp();
  const navigate = useNavigate();
  const [address, setAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [firstName, setFirstName] = useState(currentUser?.firstName || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (currentUser?.email) {
      const saved = localStorage.getItem(`timebee_address_${currentUser.email}`);
      if (saved) setAddress(saved);
      const av = localStorage.getItem(`timebee_avatar_${currentUser.email}`);
      if (av) setAvatar(av);
    }
  }, [currentUser]);

  const saveAddress = () => {
    if (!currentUser?.email) return;
    const valid = address && address.trim().length >= 8;
    if (!valid) return setError('Please enter a valid delivery address (min 6 characters).');
    localStorage.setItem(`timebee_address_${currentUser.email}`, address.trim());
    setEditingAddress(false);
    setError("");
    setSuccess('Address saved');
    setTimeout(()=>setSuccess(""), 1200);
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      if (currentUser?.email) localStorage.setItem(`timebee_avatar_${currentUser.email}`, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    try {
      setError("");
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setError('Name and email are required.');
        return;
      }
      const updatedUser = { ...currentUser, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() };
      updateCurrentUser(updatedUser);
      setSuccess('Profile updated');
      setEditOpen(false);
    } catch (e) {
      setError('Unable to save profile.');
    }
  };

  const loadRecent = (email, limit = 8) => {
    try {
      const raw = JSON.parse(localStorage.getItem(`timebee_history_${email}`) || '[]');
      const list = Array.isArray(raw) ? raw : [];
      const unique = [];
      const seen = new Set();
      for (const item of list) {
        const id = item?.id ?? item;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const w = watches.find(w=>w.id === id) || (item && item.name ? item : null);
        if (w) unique.push(w);
        if (unique.length >= limit) break;
      }
      return unique;
    } catch {
      return [];
    }
  };

  const recent = currentUser?.email ? loadRecent(currentUser.email, 4) : [];
  const initials = `${(currentUser?.firstName||' ').charAt(0)}${(currentUser?.lastName||' ').charAt(0)}`.toUpperCase();

  return (
    <div className="featured-section" style={{ paddingTop: '120px' }}>
      {/* Profile Header */}
      <div className="watch-card" style={{ transform: 'none' }}>
        <div className="watch-info" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)', fontWeight: 700, fontSize: 24, overflow: 'hidden' }}>
            {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1 }}>
            <div className="watch-name" style={{ marginBottom: 4 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
            <div style={{ color: 'rgba(255,255,255,0.85)' }}>{currentUser?.email}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>Hi {currentUser?.firstName}! Welcome to TimeBee.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
              Upload Avatar
              <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
            </label>
            <button className="btn-primary" onClick={()=>setEditOpen(true)}>Edit Profile</button>
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</div>}
        {success && <div style={{ color: 'var(--gold-primary)', marginTop: 8 }}>{success}</div>}
      </div>

      {/* Edit Profile Modal (under header) */}
      {editOpen && (
        <div className="watch-card" style={{ transform: 'none', marginTop: 'var(--spacing-lg)' }}>
          <div className="watch-info">
            <div className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>Edit Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="search-input" placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
              <input className="search-input" placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
              <input className="search-input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} style={{ gridColumn: 'span 2' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={()=>setEditOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Address Block */}
      <div className="watch-card" style={{ transform: 'none', marginTop: 'var(--spacing-lg)' }}>
        <div className="watch-info">
          <div className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>Delivery Address</div>
          {!address || editingAddress ? (
            <div>
              <textarea className="search-input" rows={3} placeholder="Add your delivery address" value={address} onChange={(e)=>setAddress(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn-primary" onClick={saveAddress}>Save Address</button>
                {editingAddress && <button className="btn-secondary" onClick={()=>setEditingAddress(false)}>Cancel</button>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ color: 'rgba(255,255,255,0.9)' }}>{address}</div>
              <button className="btn-secondary" onClick={()=>setEditingAddress(true)}>Change</button>
            </div>
          )}
        </div>
      </div>

      {/* Overview Panels */}
      <div className="brands-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 'var(--spacing-lg)' }}>
        <Link to="/orders" className="brand-card" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>My Orders</h4>
              <p style={{ color: 'rgba(255,255,255,0.9)' }}>No orders yet</p>
            </div>
          </div>
        </Link>
        <Link to="/wishlist" className="brand-card" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>❤️</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>Wishlist</h4>
              <p style={{ color: 'rgba(255,255,255,0.9)' }}>{favorites.length} items</p>
            </div>
          </div>
        </Link>
        <Link to="/cart" className="brand-card" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🛒</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>Cart</h4>
              <p style={{ color: 'rgba(255,255,255,0.9)' }}>{getTotalCartItems()} items</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recently Viewed */}
      <div className="featured-section" style={{ background: 'transparent', padding: 0, marginTop: 'var(--spacing-lg)' }}>
        <h2 className="section-title">Recently Viewed</h2>
        {recent.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>Start exploring our collection to see your recent visits here!</div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: 4 }}>
            {recent.map((watch) => (
              <Link key={watch.id} to={`/product/${watch.id}`} className="watch-card" style={{ textDecoration: 'none', minWidth: 240, maxWidth: 260, flex: '0 0 auto', transform: 'none' }}>
                <div className="watch-image-container" style={{ height: 180 }}>
                  <img src={watch.image} alt={watch.name} className="watch-image" />
                </div>
                <div className="watch-info">
                  <div className="watch-brand">{watch.brand}</div>
                  <h3 className="watch-name">{watch.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="brands-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 'var(--spacing-lg)' }}>
        <button className="brand-card" onClick={()=>setEditingAddress(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>🏠</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>Edit Address</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>Update your delivery details</p>
            </div>
          </div>
        </button>
        <button className="brand-card" onClick={()=>{}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>💳</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>Manage Payments</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>Add or edit payment methods</p>
            </div>
          </div>
        </button>
        <button className="brand-card" style={{ textDecoration: 'none' }} onClick={() => alert('Contact support coming soon!')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>🛎️</span>
            <div>
              <h4 style={{ color: 'var(--gold-primary)' }}>Contact Support</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)' }}>We are here to help</p>
            </div>
          </div>
        </button>
      </div>

      {/* Logout */}
      <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={()=>{ logout(); navigate('/login'); }}>
          <span style={{ filter: 'brightness(100%)' }}>⎋</span> Logout
        </button>
      </div>

      {/* Edit Profile Modal (simple inline) */}
      {editOpen && (
        <div className="watch-card" style={{ transform: 'none', marginTop: 'var(--spacing-lg)' }}>
          <div className="watch-info">
            <div className="watch-name" style={{ marginBottom: 'var(--spacing-sm)' }}>Edit Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="search-input" placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
              <input className="search-input" placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
              <input className="search-input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} style={{ gridColumn: 'span 2' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={()=>setEditOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Orders Page (minimal)
const OrdersPage = () => {
  return (
    <div className="featured-section" style={{ paddingTop: '120px' }}>
      <div className="page-header">
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">No orders yet</p>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalCartItems, favorites, currentUser, logout, isAdmin } = useApp();

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Dynamic category generation based on watch data (deduplicated)
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

  // Get unique brands
  const brands = [...new Set(watches.map((watch) => watch.brand))].sort();

  const handleCategoryClick = (categoryKey) => {
    navigate(`/category/${categoryKey}`);
  };

  const handleBrandClick = (brand) => {
    navigate(`/brand/${brand.toLowerCase().replace(/\s+/g, '-')}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const term = search.trim();
    if (term.length === 0) return;
    navigate(`/category/all?search=${encodeURIComponent(term)}`);
  };

  return (
    <nav className={`navbar ${isNavbarScrolled ? "navbar-scrolled" : ""}`}>
      <div className="navbar-container">
        {/* Logo - Always on the left */}
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🕐</div>
          <span className="logo-text">TimeBee</span>
        </Link>

        {/* All navigation elements on the right */}
        <div className="navbar-right">
          {/* Desktop Navigation */}
          <div className="navbar-nav desktop-nav">
            <div className="nav-item dropdown">
              <span className="nav-link">Categories</span>
              <div className="dropdown-menu">
                {getDynamicCategories().map((category) => (
                <button
                    key={category.key}
                    onClick={() => handleCategoryClick(category.key)}
                  >
                    {category.label}
                </button>
                ))}
              </div>
            </div>

            <div className="nav-item dropdown">
              <span className="nav-link">Brands</span>
              <div className="dropdown-menu brands-dropdown">
                <button onClick={() => navigate('/brands')}>All Brands</button>
                {brands.map((brand) => (
                  <button key={brand} onClick={() => handleBrandClick(brand)}>
                    {brand}
                </button>
                ))}
              </div>
            </div>

            <span className="nav-link" onClick={() => navigate('/category/luxury')}>
              Deals
            </span>

            {/* Search between Deals and wishlist */}
            <form className="navbar-search" onSubmit={handleSearchSubmit}>
              <input
                className="search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search watches, brands..."
              />
              <span className="search-icon">🔎</span>
            </form>
          </div>

          {/* Right Side Icons */}
          <div className="navbar-actions">
            <Link
              to="/wishlist"
              className="action-icon"
              title="Wishlist"
            >
              <span>{favorites.length > 0 ? '❤️' : '♡'}</span>
              {favorites.length > 0 && (
                <span className="cart-badge">{favorites.length}</span>
              )}
            </Link>
            <Link
              to="/cart"
              className="action-icon cart-icon"
              title="Cart"
            >
              <span>🛒</span>
              {getTotalCartItems() > 0 && (
                <span className="cart-badge">{getTotalCartItems()}</span>
              )}
            </Link>
            {/* Profile/Login button - furthest right */}
            {currentUser ? (
              <>
                <Link to={isAdmin() ? "/admin" : "/profile"} className="action-icon profile-icon" title={isAdmin() ? 'Admin Portal' : 'Profile'}>
                  <span>👤</span>
                </Link>
                <button className="action-icon" title="Logout" onClick={()=>{ logout(); navigate('/login'); }}><span style={{ color: 'var(--gold-primary)' }}>⎋</span></button>
              </>
            ) : (
              <>
                <Link to="/login" className="action-icon profile-icon" title="Login">
                  <span>👤</span>
                </Link>
              </>
            )}
                    </div>

          {/* Mobile Menu Button */}
                    <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            ☰
                    </button>
                  </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-nav">
            <button onClick={() => navigate('/category/all')}>All Watches</button>
            {getDynamicCategories().slice(1, 4).map((category) => (
              <button key={category.key} onClick={() => handleCategoryClick(category.key)}>
                {category.label}
              </button>
            ))}
            <button onClick={() => navigate('/brands')}>All Brands</button>
            <button onClick={() => navigate('/cart')}>Cart ({getTotalCartItems()})</button>
            <button onClick={() => navigate('/wishlist')}>Wishlist ({favorites.length})</button>
                </div>
              </div>
            )}
    </nav>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
          <div className="footer-section">
          <div className="footer-logo">
            <div className="logo-icon">🕐</div>
            <span className="logo-text">TimeBee</span>
          </div>
          <p className="footer-description">
              Your premier destination for luxury timepieces. Where every second
            counts in style and precision.
          </p>
          <div className="social-links">
            <button className="social-link" onClick={() => alert("Facebook page coming soon!")}>📘</button>
            <button className="social-link" onClick={() => alert("Instagram page coming soon!")}>📷</button>
            <button className="social-link" onClick={() => alert("Twitter page coming soon!")}>🐦</button>
            <button className="social-link" onClick={() => alert("YouTube channel coming soon!")}>📺</button>
          </div>
          </div>
          <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/" className="footer-link">Home</Link></li>
            <li><Link to="/category/men" className="footer-link">Men's Watches</Link></li>
            <li><Link to="/category/women" className="footer-link">Women's Watches</Link></li>
            <li><Link to="/category/smartwatch" className="footer-link">Smart Watches</Link></li>
            </ul>
          </div>
          <div className="footer-section">
          <h3>Customer Care</h3>
          <ul>
            <li><button className="footer-link" onClick={() => alert("Contact Us feature coming soon!")}>Contact Us</button></li>
            <li><button className="footer-link" onClick={() => alert("Support feature coming soon!")}>Support</button></li>
            <li><button className="footer-link" onClick={() => alert("Warranty information coming soon!")}>Warranty</button></li>
            <li><button className="footer-link" onClick={() => alert("Returns & Exchange policy coming soon!")}>Returns & Exchange</button></li>
            </ul>
          </div>
          <div className="footer-section">
          <h3>Newsletter</h3>
          <p>Subscribe for exclusive offers and updates</p>
          <div className="newsletter-form">
            <input type="email" placeholder="Enter your email" />
            <button className="btn-primary">Subscribe</button>
          </div>
          </div>
        </div>
        <div className="footer-bottom">
        <p>&copy; 2025 TimeBee. All rights reserved. | Premium Watches | Authorized Retailer</p>
        </div>
      </footer>
  );
};

// Main App Component
const RequireAuth = ({ children }) => {
  const { currentUser, isLoading } = useApp();
  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { currentUser, isAdmin, isLoading } = useApp();
  if (isLoading) return null;
  if (currentUser) return <Navigate to={isAdmin() ? '/admin' : '/profile'} replace />;
  return children;
};

const RequireAdmin = ({ children }) => {
  const { currentUser, isAdmin, isLoading } = useApp();
  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

const RequireUser = ({ children }) => {
  const { currentUser, isAdmin, isLoading } = useApp();
  if (isLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (isAdmin()) return <Navigate to="/admin" replace />;
  return children;
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    // Decide behavior on first load: reload restores route; fresh start goes Home
    const initKey = 'timebee_init_done';
    const navEntry = performance?.getEntriesByType?.('navigation')?.[0] || null;
    const isReload = navEntry ? navEntry.type === 'reload' : (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

    if (!sessionStorage.getItem(initKey)) {
      // First load in this tab
      sessionStorage.setItem(initKey, '1');
      if (isReload) {
        // Restore last route if available
        const last = sessionStorage.getItem('timebee_last_route');
        const current = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
        if (last && last !== current) {
          navigate(last, { replace: true });
        }
      } else {
        // Fresh start: force Home
        if (window.location.pathname !== '/') {
          navigate('/', { replace: true });
        }
      }
    }
  }, [navigate]);

  useEffect(() => {
    // Persist the last route for reloads within this tab/session
    try {
      const full = location.pathname + (location.search || '') + (location.hash || '');
      sessionStorage.setItem('timebee_last_route', full);
    } catch {}
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="app">
      <Navigation />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />

          <Route path="/category/:categoryKey" element={<RequireAuth><CategoryPage /></RequireAuth>} />
          <Route path="/brand/:brandName" element={<RequireAuth><BrandPage /></RequireAuth>} />
          <Route path="/brands" element={<RequireAuth><BrandsPage /></RequireAuth>} />
          <Route path="/product/:productId" element={<RequireAuth><ProductPage /></RequireAuth>} />
          <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
          <Route path="/wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
          <Route path="/orders" element={<RequireUser><OrdersPage /></RequireUser>} />
          <Route path="/profile" element={<RequireUser><ProfilePage /></RequireUser>} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

// Root App Component with Provider
const App = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;