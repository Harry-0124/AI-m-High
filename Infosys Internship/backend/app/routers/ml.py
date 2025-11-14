from fastapi import APIRouter
from pydantic import BaseModel
import pickle
import numpy as np
from pathlib import Path

# Extra imports for robust loading and diagnostics
try:
    import joblib  # preferred for sklearn artifacts
except Exception:  # joblib may not be installed yet
    joblib = None

try:
    import sklearn
except Exception:
    sklearn = None

router = APIRouter()

# ---------- Request Model ----------
class PredictRequest(BaseModel):
    features: dict

# ---------- Load Model ----------
MODEL_PATH = Path(__file__).resolve().parents[2] / "ml" / "model.pkl"
model_bundle = None


def _env_versions():
    return {
        "numpy": getattr(np, "__version__", "unknown"),
        "sklearn": getattr(sklearn, "__version__", "missing" if sklearn is None else sklearn.__version__),
        "joblib": getattr(joblib, "__version__", "missing" if joblib is None else joblib.__version__),
    }


def load_model():
    """Load the serialized model bundle with best-effort compatibility.
    Tries joblib first, then pickle, and raises a RuntimeError with
    detailed environment info if loading fails.
    """
    global model_bundle
    if model_bundle is not None:
        return model_bundle

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

    last_err = None
    # 1) Prefer joblib if available (handles numpy arrays better)
    if joblib is not None:
        try:
            model_bundle = joblib.load(MODEL_PATH)
            return model_bundle
        except Exception as e:
            last_err = e
    # 2) Fallback to pickle
    try:
        with open(MODEL_PATH, "rb") as f:
            model_bundle = pickle.load(f)
            return model_bundle
    except Exception as e:
        last_err = e

    # If we reach here, loading failed
    vers = _env_versions()
    raise RuntimeError(
        "Failed to load ML model. This is usually a scikit-learn/numpy "
        "version mismatch or a corrupted file. "
        f"Versions: numpy={vers['numpy']}, sklearn={vers['sklearn']}, joblib={vers['joblib']}. "
        f"Path: {MODEL_PATH}. Root error: {type(last_err).__name__}: {last_err}"
    )


# ---------- Routes ----------
@router.post("/predict_price")
async def predict_price(req: PredictRequest):
    try:
        bundle = load_model()
        # Validate bundle schema
        required_keys = ["features", "imputer", "scaler", "models", "weights"]
        for k in required_keys:
            if k not in bundle:
                return {"success": False, "error": f"Model bundle missing key: {k}"}

        features = bundle.get("features", [])
        if not isinstance(features, (list, tuple)) or len(features) == 0:
            return {"success": False, "error": "Model features metadata is empty or invalid."}

        # Build feature vector in correct order
        try:
            x_vals = [req.features.get(f, 0.0) for f in features]
            x = np.array(x_vals, dtype=float).reshape(1, -1)
        except Exception as e:
            return {"success": False, "error": f"Invalid input types. Expected numeric values. {e}"}

        # Apply preprocessing
        try:
            x = bundle["imputer"].transform(x)
            x = bundle["scaler"].transform(x)
        except Exception as e:
            return {"success": False, "error": f"Preprocessing failed: {e}"}

        # Weighted ensemble prediction
        try:
            rf = bundle["models"]["rf"]
            gb = bundle["models"]["gb"]
            w_rf = bundle["weights"]["rf"]
            w_gb = bundle["weights"]["gb"]
            pred = w_rf * rf.predict(x)[0] + w_gb * gb.predict(x)[0]
        except Exception as e:
            return {"success": False, "error": f"Inference failed: {e}"}

        return {"success": True, "predicted_price": round(float(pred), 2)}

    except Exception as e:
        vers = _env_versions()
        return {
            "success": False,
            "error": f"Model loading error: {e}",
            "env": vers,
        }


@router.get("/info")
async def model_info():
    """Expose basic diagnostics without throwing HTTP errors."""
    exists = MODEL_PATH.exists()
    info = {
        "model_path": str(MODEL_PATH),
        "exists": exists,
        "env": _env_versions(),
    }
    if not exists:
        info.update({"loaded": False, "error": "Model file not found"})
        return info
    try:
        b = load_model()
        info.update({
            "loaded": True,
            "keys": sorted(list(b.keys())) if isinstance(b, dict) else str(type(b)),
            "feature_count": len(b.get("features", [])) if isinstance(b, dict) else None,
            "features": b.get("features", []) if isinstance(b, dict) else None,
        })
    except Exception as e:
        info.update({"loaded": False, "error": str(e)})
    return info


@router.get("/samples")
async def sample_inputs():
    """Provide example inputs for the frontend form. If the model defines
    numeric feature names, return a numeric sample matching that order."""
    samples = []
    try:
        b = load_model()
        feats = b.get("features", []) if isinstance(b, dict) else []
        if feats:
            # Provide a simple mid-range numeric sample for each feature
            base = {f: 1.0 for f in feats}
            # Customize common names if present
            if "battery_life" in base:
                base["battery_life"] = 18.0
            if "display_size" in base:
                base["display_size"] = 1.9
            samples.append(base)
    except Exception:
        pass

    # If no model-driven features available, include a generic demo
    if not samples:
        samples.append({
            "brand": 1,
            "category": 1,
            "battery_life": 18.0,
            "display_size": 1.9,
        })
    return {"success": True, "samples": samples}
