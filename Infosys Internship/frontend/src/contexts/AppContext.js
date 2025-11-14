import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  cart: [],
  favorites: [],
  isLoading: false,
  currentUser: null,
  users: [],
  history: [],
};

// Action types
const ACTIONS = {
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_CART_QUANTITY: 'UPDATE_CART_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  ADD_TO_FAVORITES: 'ADD_TO_FAVORITES',
  REMOVE_FROM_FAVORITES: 'REMOVE_FROM_FAVORITES',
  LOAD_STATE: 'LOAD_STATE',
  SET_LOADING: 'SET_LOADING',
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  SET_USERS: 'SET_USERS',
  ADD_VISITED: 'ADD_VISITED',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.ADD_TO_CART:
      const existingCartItem = state.cart.find(item => item.id === action.payload.id);
      if (existingCartItem) {
        return {
          ...state,
          cart: state.cart.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        cart: [...state.cart, { ...action.payload, quantity: 1 }],
      };

    case ACTIONS.REMOVE_FROM_CART:
      return {
        ...state,
        cart: state.cart.filter(item => item.id !== action.payload),
      };

    case ACTIONS.UPDATE_CART_QUANTITY:
      return {
        ...state,
        cart: state.cart.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0),
      };

    case ACTIONS.CLEAR_CART:
      return {
        ...state,
        cart: [],
      };

    case ACTIONS.ADD_TO_FAVORITES:
      const isAlreadyFavorite = state.favorites.some(item => item.id === action.payload.id);
      if (isAlreadyFavorite) {
        return state;
      }
      return {
        ...state,
        favorites: [...state.favorites, action.payload],
      };

    case ACTIONS.REMOVE_FROM_FAVORITES:
      return {
        ...state,
        favorites: state.favorites.filter(item => item.id !== action.payload),
      };

    case ACTIONS.LOAD_STATE:
      return {
        ...state,
        cart: Array.isArray(action.payload.cart) ? action.payload.cart : [],
        favorites: Array.isArray(action.payload.favorites) ? action.payload.favorites : [],
        currentUser: action.payload.currentUser ?? state.currentUser,
        users: Array.isArray(action.payload.users) ? action.payload.users : state.users || [],
        history: Array.isArray(action.payload.history) ? action.payload.history : state.history || [],
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ACTIONS.SET_CURRENT_USER:
      return {
        ...state,
        currentUser: action.payload,
      };
    case ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload,
      };
    case ACTIONS.ADD_VISITED:
      const existing = state.history.filter(h => h.id !== action.payload.id);
      const entry = { id: action.payload.id, name: action.payload.name, image: action.payload.image, brand: action.payload.brand, overallRating: action.payload.overallRating, finalPrice: action.payload.finalPrice, price: action.payload.price, discount: action.payload.discount, visitedAt: Date.now() };
      const newHistory = [entry, ...existing].slice(0, 20);
      return {
        ...state,
        history: newHistory,
      };
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Global utility to record recently visited products per user
export const addVisitedGlobal = (product, userEmail) => {
  try {
    if (!product || !product.id || !userEmail) return;
    const key = `timebee_history_${userEmail}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = Array.isArray(list) ? list.filter(it => (it?.id ?? it) !== product.id) : [];
    const entry = {
      id: product.id,
      name: product.name,
      image: product.image,
      brand: product.brand,
      overallRating: product.overallRating,
      finalPrice: product.finalPrice ?? product.price,
      price: product.price,
      discount: product.discount,
      visitedAt: Date.now(),
    };
    const next = [entry, ...filtered].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(next));
  } catch (e) {
    console.error('addVisitedGlobal error', e);
  }
};

// Ensure a global fallback exists
if (typeof window !== 'undefined' && !window.addVisited) {
  window.addVisited = addVisitedGlobal;
}

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load minimal state on mount (no session restore). Limit dev users to at most one non-admin demo user.
  useEffect(() => {
    try {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });
      // Load a single demo user (if present) from localStorage for dev/demo
      const rawUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const list = Array.isArray(rawUsers) ? rawUsers : [];
      const demo = list.find(u => u && u.email && u.email !== 'admin' && u.username !== 'admin');
      const users = demo ? [demo] : [];
      // Restore current user from sessionStorage only (reloads within same tab)
      const savedCurrentUser = JSON.parse(sessionStorage.getItem('timebee_current_user') || 'null');
      let cart = [];
      let favorites = [];
      let history = [];
      if (savedCurrentUser && savedCurrentUser.email) {
        cart = JSON.parse(localStorage.getItem(`timebee_cart_${savedCurrentUser.email}`) || '[]');
        favorites = JSON.parse(localStorage.getItem(`timebee_favorites_${savedCurrentUser.email}`) || '[]');
        history = JSON.parse(localStorage.getItem(`timebee_history_${savedCurrentUser.email}`) || '[]');
      }
      dispatch({ type: ACTIONS.LOAD_STATE, payload: { cart, favorites, currentUser: savedCurrentUser || null, users, history } });
    } catch (error) {
      console.error('Error loading saved state:', error);
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Save per-user cart/favorites
  useEffect(() => {
    try {
      if (state.currentUser && state.currentUser.email) {
        localStorage.setItem(`timebee_cart_${state.currentUser.email}`, JSON.stringify(state.cart));
        localStorage.setItem(`timebee_favorites_${state.currentUser.email}`, JSON.stringify(state.favorites));
        localStorage.setItem(`timebee_history_${state.currentUser.email}`, JSON.stringify(state.history));
      }
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }, [state.cart, state.favorites, state.currentUser, state.history]);

  // Action creators
  const addToCart = (product) => {
    dispatch({ type: ACTIONS.ADD_TO_CART, payload: product });
  };

  const removeFromCart = (productId) => {
    dispatch({ type: ACTIONS.REMOVE_FROM_CART, payload: productId });
  };

  const updateCartQuantity = (productId, quantity) => {
    dispatch({ type: ACTIONS.UPDATE_CART_QUANTITY, payload: { id: productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: ACTIONS.CLEAR_CART });
  };

  const addToFavorites = (product) => {
    dispatch({ type: ACTIONS.ADD_TO_FAVORITES, payload: product });
  };

  const removeFromFavorites = (productId) => {
    dispatch({ type: ACTIONS.REMOVE_FROM_FAVORITES, payload: productId });
  };

  const toggleFavorite = (product) => {
    const isFavorite = state.favorites.some(item => item.id === product.id);
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  const isInCart = (productId) => {
    return state.cart.some(item => item.id === productId);
  };

  const isFavorite = (productId) => {
    return state.favorites.some(item => item.id === productId);
  };

  const getCartItemQuantity = (productId) => {
    const cartItem = state.cart.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };


  const getTotalCartItems = () => {
    return state.cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartPrice = () => {
    return state.cart.reduce((total, item) => total + (item.finalPrice * item.quantity), 0);
  };

  const addVisited = (product, emailOverride) => {
    if (!product || !product.id) return;
    try {
      const email = emailOverride || state.currentUser?.email;
      if (email) addVisitedGlobal(product, email);
    } catch {}
    dispatch({ type: ACTIONS.ADD_VISITED, payload: product });
  };

  // Auth helpers
  const isAdmin = () => state.currentUser && (state.currentUser.email === 'admin' || state.currentUser.username === 'admin');

  const signup = () => {
    throw new Error('Registration is disabled in this demo');
  };

  const login = ({ email, password }) => {
    // Admin special case (persist to sessionStorage only)
    if (email === 'admin' || email === 'admin@gmail.com' || email === 'admin@timebee') {
      if (password !== 'abc@123') {
        throw new Error('Wrong admin credentials');
      }
      const adminUser = { username: 'admin', email: 'admin', role: 'admin' };
      sessionStorage.setItem('timebee_current_user', JSON.stringify(adminUser));
      dispatch({ type: ACTIONS.SET_CURRENT_USER, payload: adminUser });
      const cart = JSON.parse(localStorage.getItem('timebee_cart_admin') || '[]');
      const favorites = JSON.parse(localStorage.getItem('timebee_favorites_admin') || '[]');
      const history = JSON.parse(localStorage.getItem('timebee_history_admin') || '[]');
      dispatch({ type: ACTIONS.LOAD_STATE, payload: { cart, favorites, history } });
      return adminUser;
    }
    // Only allow a single demo user (if present) from state.users
    const users = Array.isArray(state.users) ? state.users : [];
    const existing = users.find(u => u.email === email);
    if (!existing) {
      throw new Error('Invalid credentials');
    }
    if (existing.password !== password) {
      throw new Error('Invalid credentials');
    }
    sessionStorage.setItem('timebee_current_user', JSON.stringify(existing));
    dispatch({ type: ACTIONS.SET_CURRENT_USER, payload: existing });
    const cart = JSON.parse(localStorage.getItem(`timebee_cart_${existing.email}`) || '[]');
    const favorites = JSON.parse(localStorage.getItem(`timebee_favorites_${existing.email}`) || '[]');
    const history = JSON.parse(localStorage.getItem(`timebee_history_${existing.email}`) || '[]');
    dispatch({ type: ACTIONS.LOAD_STATE, payload: { cart, favorites, history } });
    return existing;
  };

  const logout = () => {
    try { sessionStorage.removeItem('timebee_current_user'); } catch {}
    dispatch({ type: ACTIONS.SET_CURRENT_USER, payload: null });
    dispatch({ type: ACTIONS.LOAD_STATE, payload: { cart: [], favorites: [], history: [] } });
  };

  const updateCurrentUser = (partial) => {
    const next = { ...state.currentUser, ...partial };
    // Update only the in-session copy
    try {
      sessionStorage.setItem('timebee_current_user', JSON.stringify(next));
    } catch {}
    dispatch({ type: ACTIONS.SET_CURRENT_USER, payload: next });
  };

  const contextValue = {
    ...state,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isInCart,
    isFavorite,
    getCartItemQuantity,
    getTotalCartItems,
    getTotalCartPrice,
    addVisited,
    // auth
    signup,
    login,
    logout,
    isAdmin,
    updateCurrentUser,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
