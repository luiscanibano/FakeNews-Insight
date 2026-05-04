"""
@file main.py
@description API FastAPI de anÃ¡lisis de noticias: autenticaciÃ³n JWT, control de cuota y persistencia de ejecuciones/historial en Supabase.
"""

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import joblib
import json
import os
import re
import string
import nltk
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

"""Descargas silenciosas de recursos NLTK requeridos por el pipeline de limpieza."""
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)

from nltk.corpus import stopwords 
from nltk.stem import WordNetLemmatizer 
from nltk.tokenize import word_tokenize 

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _load_frontend_env_fallback() -> Dict[str, str]:
    env_path = BASE_DIR.parent / "fakenews-frontend" / ".env"
    if not env_path.exists():
        return {}

    loaded_values: Dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        loaded_values[key.strip()] = value.strip()

    return loaded_values


_FRONTEND_ENV = _load_frontend_env_fallback()
SUPABASE_URL = (
    os.getenv("SUPABASE_URL", "")
    or _FRONTEND_ENV.get("VITE_SUPABASE_URL", "")
).rstrip("/")
SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_ANON_KEY", "")
    or _FRONTEND_ENV.get("VITE_SUPABASE_ANON_KEY", "")
)
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


"""Inicializacion de la aplicaciÃ³n FastAPI."""
app = FastAPI(
    title="API de Detección de Fake News",
    description="Motor de clasificación usando SVM y TF-IDF",
    version="1.0.0"
)

"""ConfiguraciÃ³n CORS para permitir comunicacion frontend-backend y extension de navegador.

El regex acepta:
- Frontend en produccion (Render).
- Frontend en desarrollo local (Vite).
- Cualquier extension Chrome/Edge (los IDs MV3 usan caracteres a-p, 32 chars).
"""
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=(
        r"^("
        r"https://tfg-informatica-luis-canibano-frontend\.onrender\.com"
        r"|http://localhost:5173"
        r"|chrome-extension://[a-pA-P0-9]{32}"
        r")$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Endpoint de healthcheck para Docker, Render y CI/CD."""
    return {"status": "ok"}


"""Carga de modelos SVM y TF-IDF al iniciar el servicio."""
print("Cargando modelo SVM y vectorizador TF-IDF...")
MODELS_DIR = BASE_DIR.parent / "models"
try:
    modelo = joblib.load(MODELS_DIR / 'modelo_fakenews_svm.pkl')
    vectorizador = joblib.load(MODELS_DIR / 'vectorizador_tfidf.pkl')
except Exception as e:
    raise RuntimeError(f"Error critico al cargar los modelos: {e}") from e

"""ConfiguraciÃ³n de limpieza y normalizacion del texto de entrada."""
stop_words = set(stopwords.words('english'))
custom_stops = {'reuters', 'reuter', 'image', 'via', 'video', 'pic', 'twitter', 'fox'}
stop_words.update(custom_stops)
lemmatizer = WordNetLemmatizer()

def limpiar_texto_auditoria(text: str): 
    """Aplica limpieza, tokenizacion, lematizacion y filtrado de stopwords."""
    text = str(text).lower()
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE) 
    text = re.sub(r'\@\w+|\#', '', text) 
    text = re.sub(r'\[.*?\]', '', text) 
    text = re.sub(r'\(.*?\)', '', text) 
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\d+', '', text)
    tokens = word_tokenize(text)
    tokens_filtrados= [
        lemmatizer.lemmatize(word)
        for word in tokens
        if word not in stop_words and len(word) > 2 
    ]
    return " ".join(tokens_filtrados)


def _ensure_supabase_config() -> None:
    """VÃ¡lida la presencia de variables criticas para conectar con Supabase."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="Falta configuraciÃ³n de Supabase en backend (SUPABASE_URL y SUPABASE_ANON_KEY).",
        )


def _ensure_supabase_service_config() -> None:
    """VÃ¡lida credenciales privilegiadas para escrituras server-to-server de billing."""
    _ensure_supabase_config()

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Falta SUPABASE_SERVICE_ROLE_KEY en backend para operaciones de billing.",
        )


def _parse_json_payload(raw_bytes: bytes) -> Any:
    """Decodifica un payload JSON y retorna texto encapsulado cuando no sea JSON vÃ¡lido."""
    if not raw_bytes:
        return None

    text = raw_bytes.decode("utf-8", errors="ignore").strip()
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"message": text}


def _supabase_json_request(
    path: str,
    *,
    method: str = "GET",
    jwt_token: Optional[str] = None,
    query: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
    prefer: Optional[str] = None,
) -> Tuple[int, Any]:
    """Ejecuta requests JSON contra Supabase REST/Auth con manejo uniforme de errores."""
    _ensure_supabase_config()

    url = f"{SUPABASE_URL}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"

    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    if jwt_token:
        headers["Authorization"] = f"Bearer {jwt_token}"

    if prefer:
        headers["Prefer"] = prefer

    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = UrlRequest(url=url, data=payload, headers=headers, method=method)

    try:
        with urlopen(request, timeout=12) as response:
            return response.status, _parse_json_payload(response.read())
    except HTTPError as error:
        return error.code, _parse_json_payload(error.read())
    except URLError as error:
        raise HTTPException(status_code=502, detail=f"No se pudo contactar con Supabase: {error}")


def _supabase_service_json_request(
    path: str,
    *,
    method: str = "GET",
    query: Optional[Dict[str, str]] = None,
    body: Optional[Dict[str, Any]] = None,
    prefer: Optional[str] = None,
) -> Tuple[int, Any]:
    """Ejecuta requests JSON contra Supabase usando service role para saltar RLS de forma segura."""
    _ensure_supabase_service_config()

    url = f"{SUPABASE_URL}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = UrlRequest(url=url, data=payload, headers=headers, method=method)

    try:
        with urlopen(request, timeout=12) as response:
            return response.status, _parse_json_payload(response.read())
    except HTTPError as error:
        return error.code, _parse_json_payload(error.read())
    except URLError as error:
        raise HTTPException(status_code=502, detail=f"No se pudo contactar con Supabase: {error}")


def _extract_detail(payload: Any, fallback: str) -> str:
    """Extrae mensaje de detalle legible desde payloads heterogeneos de error."""
    if isinstance(payload, dict):
        for key in ("detail", "message", "msg", "error_description"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value

    return fallback


def _extract_bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    """Obtiene token JWT desde cabecera Authorization en formato Bearer."""
    if not authorization_header:
        return None

    value = authorization_header.strip()
    if not value.lower().startswith("bearer "):
        return None

    token = value[7:].strip()
    if not token:
        return None
    if any(ch in token for ch in ("\r", "\n", " ", "\t")):
        return None
    return token


def _validate_user_with_supabase(jwt_token: str) -> Dict[str, Any]:
    """VÃ¡lida JWT contra Supabase Auth y devuelve payload de usuario autenticado."""
    status, payload = _supabase_json_request("/auth/v1/user", method="GET", jwt_token=jwt_token)

    if status != 200 or not isinstance(payload, dict) or not payload.get("id"):
        raise HTTPException(status_code=401, detail="Token JWT invalido o expirado.")

    return payload


def _load_profile_for_user(user_id: str, jwt_token: str) -> Dict[str, Any]:
    """Carga perfil del usuario para reglas de plan y cuota diaria."""
    status, payload = _supabase_json_request(
        "/rest/v1/profiles",
        method="GET",
        jwt_token=jwt_token,
        query={
            "id": f"eq.{user_id}",
            "select": "id,plan,daily_analysis_limit,daily_analysis_used,daily_analysis_date",
            "limit": "1",
        },
    )

    if status != 200:
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo leer el perfil del usuario en Supabase."),
        )

    if not isinstance(payload, list) or len(payload) == 0:
        raise HTTPException(status_code=403, detail="No existe un perfil activo para este usuario.")

    return payload[0]


def _to_int(value: Any, default: int = 0) -> int:
    """Convierte a entero con fallback seguro."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _to_float_or_none(value: Any) -> Optional[float]:
    """Convierte a float devolviendo None cuando el dato no sea numerico."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_confidence_for_history(value: Any) -> Optional[float]:
    """Normaliza fuerza SVM no acotada al rango [0, 1] exigido por analyses.confidence."""
    numeric = _to_float_or_none(value)
    if numeric is None:
        return None

    strength = abs(numeric)

    normalized = strength / (1.0 + strength)
    return round(max(0.0, min(1.0, normalized)), 4)


def _normalize_date_key(value: Any) -> Optional[str]:
    """Normaliza fecha a clave YYYY-MM-DD para comparaciones de cuota diaria."""
    if value is None:
        return None

    text = str(value).strip()
    if len(text) < 10:
        return None

    return text[:10]


def _is_unlimited_plan(plan: str) -> bool:
    """Indica si un plan tiene anÃ¡lisis ilimitados."""
    normalized = plan.strip().lower()
    return normalized in {"pro", "ultra", "pro_user", "ultra_user"}


def _consume_free_analysis_quota(profile: Dict[str, Any], user_id: str, jwt_token: str) -> Dict[str, Any]:
    """Consume una unidad de cuota diaria en plan free con control de concurrencia."""
    plan = str(profile.get("plan") or "free")

    if _is_unlimited_plan(plan):
        return {
            "plan": plan,
            "remaining_today": None,
            "daily_limit": None,
            "used_today": None,
        }

    daily_limit = _to_int(profile.get("daily_analysis_limit"), default=20)
    if daily_limit <= 0:
        raise HTTPException(status_code=403, detail="Tu plan no tiene anÃ¡lisis disponibles hoy.")

    today_key = date.today().isoformat()
    stored_date = _normalize_date_key(profile.get("daily_analysis_date"))
    raw_used = profile.get("daily_analysis_used")
    stored_used = _to_int(raw_used, default=0)
    used_today = stored_used if stored_date == today_key else 0

    if used_today >= daily_limit:
        raise HTTPException(
            status_code=403,
            detail="Has alcanzado tu lÃ­mite diario de anÃ¡lisis para el plan Free.",
        )

    next_used = used_today + 1

    update_filters: Dict[str, str] = {"id": f"eq.{user_id}"}
    if stored_date is None:
        update_filters["daily_analysis_date"] = "is.null"
    else:
        update_filters["daily_analysis_date"] = f"eq.{stored_date}"

    if raw_used is None:
        update_filters["daily_analysis_used"] = "is.null"
    else:
        update_filters["daily_analysis_used"] = f"eq.{stored_used}"

    status, payload = _supabase_json_request(
        "/rest/v1/profiles",
        method="PATCH",
        jwt_token=jwt_token,
        query=update_filters,
        body={
            "daily_analysis_date": today_key,
            "daily_analysis_used": next_used,
        },
        prefer="return=representation",
    )

    if status not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo actualizar el cupo diario del usuario."),
        )

    if status == 200 and isinstance(payload, list) and len(payload) == 0:
        raise HTTPException(
            status_code=409,
            detail="No se pudo reservar el anÃ¡lisis por concurrencia. IntÃ©ntalo de nuevo.",
        )

    return {
        "plan": "free",
        "remaining_today": max(0, daily_limit - next_used),
        "daily_limit": daily_limit,
        "used_today": next_used,
    }


def _now_iso_utc() -> str:
    """Devuelve timestamp UTC ISO-8601 para persistencia consistente."""
    return datetime.now(timezone.utc).isoformat()


def _insert_analysis_run(
    *,
    user_id: str,
    mode: str,
    input_text: Optional[str],
    source_url: Optional[str],
    label: str,
    confidence: Optional[float],
    model_version: str,
    jwt_token: str,
) -> Dict[str, Any]:
    """Inserta una ejecucion de anÃ¡lisis en analysis_runs y devuelve la fila creada."""
    status, payload = _supabase_json_request(
        "/rest/v1/analysis_runs",
        method="POST",
        jwt_token=jwt_token,
        body={
            "user_id": user_id,
            "mode": mode,
            "input_text": input_text,
            "source_url": source_url,
            "label": label,
            "confidence": confidence,
            "model_version": model_version,
            "quota_consumed": True,
            "saved_to_history": False,
        },
        prefer="return=representation",
    )

    if status not in (200, 201):
        detail = _extract_detail(payload, "No se pudo registrar la ejecucion del anÃ¡lisis.")
        raise HTTPException(status_code=502, detail=detail)

    if not isinstance(payload, list) or len(payload) == 0:
        raise HTTPException(status_code=502, detail="No se pudo registrar la ejecucion del anÃ¡lisis.")

    row = payload[0]
    if not isinstance(row, dict) or not row.get("id"):
        raise HTTPException(status_code=502, detail="No se pudo obtener el id de ejecucion del anÃ¡lisis.")

    return row


def _load_analysis_run(run_id: str, user_id: str, jwt_token: str) -> Dict[str, Any]:
    """Carga una ejecucion concreta verificando ownership por user_id."""
    status, payload = _supabase_json_request(
        "/rest/v1/analysis_runs",
        method="GET",
        jwt_token=jwt_token,
        query={
            "id": f"eq.{run_id}",
            "user_id": f"eq.{user_id}",
            "select": "id,user_id,input_text,source_url,label,confidence,model_version,mode,created_at,saved_to_history,saved_at",
            "limit": "1",
        },
    )

    if status != 200:
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo leer la ejecucion del anÃ¡lisis."),
        )

    if not isinstance(payload, list) or len(payload) == 0:
        raise HTTPException(status_code=404, detail="No existe una ejecucion de anÃ¡lisis con ese id.")

    return payload[0]


def _load_saved_analysis_by_run_id(run_id: str, user_id: str, jwt_token: str) -> Optional[Dict[str, Any]]:
    """Comprueba si una ejecucion ya fue guardada manualmente en historial."""
    status, payload = _supabase_json_request(
        "/rest/v1/analyses",
        method="GET",
        jwt_token=jwt_token,
        query={
            "run_id": f"eq.{run_id}",
            "user_id": f"eq.{user_id}",
            "select": "id,run_id,user_id,input_text,source_url,label,confidence,model_version,created_at",
            "limit": "1",
        },
    )

    if status != 200:
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo comprobar si el anÃ¡lisis ya estaba guardado."),
        )

    if isinstance(payload, list) and len(payload) > 0:
        return payload[0]

    return None


def _insert_saved_analysis_from_run(run: Dict[str, Any], user_id: str, jwt_token: str) -> Dict[str, Any]:
    """Guarda en analyses una ejecucion existente y devuelve la fila persistida."""
    run_id = str(run.get("id") or "")
    body = {
        "run_id": run_id,
        "user_id": user_id,
        "input_text": run.get("input_text"),
        "source_url": run.get("source_url"),
        "label": run.get("label"),
        "confidence": _normalize_confidence_for_history(run.get("confidence")),
        "model_version": run.get("model_version") or "svm-tfidf-v1",
    }

    status, payload = _supabase_json_request(
        "/rest/v1/analyses",
        method="POST",
        jwt_token=jwt_token,
        body=body,
        prefer="return=representation,resolution=merge-duplicates",
    )

    if status not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo guardar el anÃ¡lisis en historial."),
        )

    if isinstance(payload, list) and len(payload) > 0:
        return payload[0]

    existing = _load_saved_analysis_by_run_id(run_id, user_id, jwt_token)
    if existing is not None:
        return existing

    raise HTTPException(status_code=502, detail="No se pudo confirmar el guardado en historial.")


def _mark_analysis_run_as_saved(run_id: str, user_id: str, jwt_token: str) -> None:
    """Marca analysis_run como guardado para reflejar estado en flujo de UI."""
    status, payload = _supabase_json_request(
        "/rest/v1/analysis_runs",
        method="PATCH",
        jwt_token=jwt_token,
        query={
            "id": f"eq.{run_id}",
            "user_id": f"eq.{user_id}",
        },
        body={
            "saved_to_history": True,
            "saved_at": _now_iso_utc(),
        },
        prefer="return=representation",
    )

    if status not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo actualizar el estado de guardado del anÃ¡lisis."),
        )


"""Esquemas de entrada para endpoints de prediccion y guardado manual."""
class NoticiaRequest(BaseModel):
    texto: str


class SaveAnalysisRequest(BaseModel):
    run_id: str



@app.post("/predecir/")
def predecir_noticia(
    noticia: NoticiaRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Analiza texto, consume cuota, registra ejecucion y devuelve veredicto del modelo."""
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Falta el token JWT en la cabecera Authorization.")

    user_payload = _validate_user_with_supabase(token)
    user_id = str(user_payload.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="No se pudo validar la identidad del usuario.")

    if not noticia.texto or len(noticia.texto.strip()) < 10:
        raise HTTPException(status_code=400, detail="El texto proporcionado es demasiado corto.")

    profile = _load_profile_for_user(user_id, token)
    quota_snapshot = _consume_free_analysis_quota(profile, user_id, token)

    try:
        texto_limpio = limpiar_texto_auditoria(noticia.texto)

        vector = vectorizador.transform([texto_limpio])

        prediccion = int(modelo.predict(vector)[0])
        distancia = float(modelo.decision_function(vector)[0])

        veredicto = "FAKE" if prediccion == 1 else "REAL"
        run_row = _insert_analysis_run(
            user_id=user_id,
            mode="text",
            input_text=noticia.texto,
            source_url=None,
            label=veredicto,
            confidence=round(abs(distancia), 4),
            model_version="svm-tfidf-v1",
            jwt_token=token,
        )

        return {
            "veredicto": veredicto,
            "certeza_svm": round(distancia, 4),
            "palabras_procesadas": len(texto_limpio.split()),
            "plan_usuario": quota_snapshot.get("plan"),
            "analisis_restantes_hoy": quota_snapshot.get("remaining_today"),
            "limite_diario": quota_snapshot.get("daily_limit"),
            "analysis_run_id": run_row.get("id"),
            "guardado_en_historial": bool(run_row.get("saved_to_history")),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando la noticia: {str(e)}")


@app.post("/analyses/save")
def guardar_analisis_en_historial(
    payload: SaveAnalysisRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Guarda manualmente en historial una ejecucion previa validando ownership."""
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Falta el token JWT en la cabecera Authorization.")

    user_payload = _validate_user_with_supabase(token)
    user_id = str(user_payload.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="No se pudo validar la identidad del usuario.")

    run_id = str(payload.run_id or "").strip()
    if not run_id:
        raise HTTPException(status_code=400, detail="run_id es obligatorio para guardar en historial.")

    run = _load_analysis_run(run_id, user_id, token)

    existing_saved = _load_saved_analysis_by_run_id(run_id, user_id, token)
    if existing_saved is not None:
        return {
            "saved": True,
            "already_saved": True,
            "analysis": existing_saved,
        }

    saved_row = _insert_saved_analysis_from_run(run, user_id, token)
    _mark_analysis_run_as_saved(run_id, user_id, token)

    return {
        "saved": True,
        "already_saved": False,
        "analysis": saved_row,
    }




class AccountDeleteRequest(BaseModel):
    confirmation: Optional[str] = None


def _delete_supabase_user_with_admin(user_id: str) -> None:
    """Elimina el usuario en Supabase Auth via Admin API con service role."""
    status, payload = _supabase_service_json_request(
        f"/auth/v1/admin/users/{user_id}",
        method="DELETE",
    )

    if status not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo eliminar la cuenta en Supabase Auth."),
        )




@app.post("/account/delete")
def borrar_cuenta_usuario(
    payload: AccountDeleteRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Elimina la cuenta del usuario en Supabase Auth (RGPD)."""
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Falta el token JWT en la cabecera Authorization.")

    user_payload = _validate_user_with_supabase(token)
    user_id = str(user_payload.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="No se pudo validar la identidad del usuario.")

    confirmation = str(payload.confirmation or "").strip().upper()
    if confirmation != "ELIMINAR":
        raise HTTPException(
            status_code=400,
            detail="Confirma la eliminacion escribiendo ELIMINAR en el campo de confirmacion.",
        )

    _delete_supabase_user_with_admin(user_id)

    return {
        "deleted": True,
        "user_id": user_id,
    }


"""Registro de endpoints de billing (Stripe). Import diferido para evitar dependencia circular."""
from billing import router as _billing_router  # noqa: E402

app.include_router(_billing_router)


# =====================================================================
# Agente FEVER de verificacion de afirmaciones (plan Super Pro)
# =====================================================================

class VerifyRequest(BaseModel):
    texto: str


def _is_super_pro(plan: str) -> bool:
    return plan.strip().lower() == "super_pro"


def _consume_verification_quota(profile: Dict[str, Any], user_id: str,
                                 jwt_token: str) -> Dict[str, Any]:
    """Consume una unidad de cuota diaria del agente para plan Super Pro.

    Solo `super_pro` (y planes superiores en futuras revisiones) pueden
    usar /verify. El resto recibe 403.
    """
    plan = str(profile.get("plan") or "free")

    if not _is_super_pro(plan):
        raise HTTPException(
            status_code=403,
            detail="El agente de verificacion solo esta disponible en el plan Super Pro.",
        )

    daily_limit = _to_int(profile.get("daily_verification_limit"), default=50)
    if daily_limit <= 0:
        raise HTTPException(
            status_code=403,
            detail="Tu plan no tiene verificaciones disponibles hoy.",
        )

    today_key = date.today().isoformat()
    stored_date = _normalize_date_key(profile.get("daily_verification_date"))
    raw_used = profile.get("daily_verification_used")
    stored_used = _to_int(raw_used, default=0)
    used_today = stored_used if stored_date == today_key else 0

    if used_today >= daily_limit:
        raise HTTPException(
            status_code=403,
            detail="Has alcanzado tu limite diario de verificaciones para el plan Super Pro.",
        )

    next_used = used_today + 1
    update_filters: Dict[str, str] = {"id": f"eq.{user_id}"}
    if stored_date is None:
        update_filters["daily_verification_date"] = "is.null"
    else:
        update_filters["daily_verification_date"] = f"eq.{stored_date}"
    if raw_used is None:
        update_filters["daily_verification_used"] = "is.null"
    else:
        update_filters["daily_verification_used"] = f"eq.{stored_used}"

    status, payload = _supabase_json_request(
        "/rest/v1/profiles",
        method="PATCH",
        jwt_token=jwt_token,
        query=update_filters,
        body={
            "daily_verification_date": today_key,
            "daily_verification_used": next_used,
        },
        prefer="return=representation",
    )

    if status not in (200, 204):
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo actualizar el cupo de verificaciones."),
        )
    if status == 200 and isinstance(payload, list) and len(payload) == 0:
        raise HTTPException(
            status_code=409,
            detail="Concurrencia al reservar verificacion. Reintenta.",
        )

    return {
        "plan": plan,
        "remaining_today": max(0, daily_limit - next_used),
        "daily_limit": daily_limit,
        "used_today": next_used,
    }


def _persist_verification_report(report, user_id: str, jwt_token: str) -> Optional[str]:
    """Persiste un VerificationReport en Supabase. Devuelve run_id o None.

    Falla en silencio (sin levantar) si la migracion 002_fever no se ha
    aplicado todavia, para no romper el endpoint en entornos parciales.
    """
    try:
        status, payload = _supabase_json_request(
            "/rest/v1/verification_runs",
            method="POST",
            jwt_token=jwt_token,
            body={
                "user_id": user_id,
                "input_text": report.input_text,
                "overall_label": report.overall_label.value,
                "summary": report.summary,
                "model_version": report.model_version,
                "duration_ms": report.duration_ms,
            },
            prefer="return=representation",
        )
    except HTTPException:
        return None
    if status not in (200, 201) or not isinstance(payload, list) or not payload:
        return None
    run_id = str(payload[0].get("id") or "") or None

    if run_id is None:
        return None

    for position, claim_verdict in enumerate(report.claims):
        try:
            cstatus, cpayload = _supabase_json_request(
                "/rest/v1/verification_claims",
                method="POST",
                jwt_token=jwt_token,
                body={
                    "run_id": run_id,
                    "user_id": user_id,
                    "claim_text": claim_verdict.claim.text,
                    "label": claim_verdict.label.value,
                    "confidence": claim_verdict.confidence,
                    "rationale": claim_verdict.rationale,
                    "position": position,
                },
                prefer="return=representation",
            )
        except HTTPException:
            continue
        if cstatus not in (200, 201) or not isinstance(cpayload, list) or not cpayload:
            continue
        claim_id = cpayload[0].get("id")
        if not claim_id:
            continue
        for ev_pos, scored in enumerate(claim_verdict.evidences):
            try:
                _supabase_json_request(
                    "/rest/v1/verification_evidences",
                    method="POST",
                    jwt_token=jwt_token,
                    body={
                        "claim_id": claim_id,
                        "user_id": user_id,
                        "url": scored.evidence.url,
                        "title": scored.evidence.title,
                        "snippet": scored.evidence.snippet,
                        "nli_label": scored.nli.label,
                        "nli_score": scored.nli.score,
                        "position": ev_pos,
                    },
                )
            except HTTPException:
                continue
    return run_id


def _serialize_report(report, *, run_id: Optional[str], quota: Dict[str, Any]) -> Dict[str, Any]:
    """Serializa el VerificationReport a JSON estable para la API publica."""
    return {
        "run_id": run_id,
        "veredicto_global": report.overall_label.value,
        "resumen": report.summary,
        "model_version": report.model_version,
        "duracion_ms": report.duration_ms,
        "verificaciones_restantes_hoy": quota.get("remaining_today"),
        "limite_diario": quota.get("daily_limit"),
        "claims": [
            {
                "id": cv.claim.id,
                "texto": cv.claim.text,
                "veredicto": cv.label.value,
                "confianza": round(cv.confidence, 4),
                "razonamiento": cv.rationale,
                "evidencias": [
                    {
                        "url": s.evidence.url,
                        "titulo": s.evidence.title,
                        "snippet": s.evidence.snippet,
                        "nli_label": s.nli.label,
                        "nli_score": round(s.nli.score, 4),
                    }
                    for s in cv.evidences
                ],
            }
            for cv in report.claims
        ],
    }


@app.post("/verify")
def verificar_afirmaciones(
    payload: VerifyRequest,
    authorization: Optional[str] = Header(default=None),
):
    """Ejecuta el agente FEVER sobre el texto y devuelve veredicto+evidencias.

    Restringido a plan Super Pro (cuota diaria). Persiste la ejecucion
    si la migracion 002_fever esta aplicada.
    """
    token = _extract_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Falta el token JWT en la cabecera Authorization.")

    user_payload = _validate_user_with_supabase(token)
    user_id = str(user_payload.get("id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="No se pudo validar la identidad del usuario.")

    if not payload.texto or len(payload.texto.strip()) < 10:
        raise HTTPException(status_code=400, detail="El texto proporcionado es demasiado corto.")

    profile = _load_profile_for_verify(user_id, token)
    quota = _consume_verification_quota(profile, user_id, token)

    # Import diferido: evita cargar fever/fever_runtime en arranque para
    # tests del backend que no necesitan el agente.
    from fever_runtime import get_verification_agent

    agent = get_verification_agent()
    try:
        report = agent.verify(payload.texto)
    except Exception as exc:  # pragma: no cover - bubble up sanitized error
        raise HTTPException(
            status_code=503,
            detail=f"El agente de verificacion no pudo completar la peticion: {exc}",
        )

    run_id = _persist_verification_report(report, user_id, token)
    return _serialize_report(report, run_id=run_id, quota=quota)


def _load_profile_for_verify(user_id: str, jwt_token: str) -> Dict[str, Any]:
    """Variante de _load_profile_for_user con campos de cuota de verify."""
    status, payload = _supabase_json_request(
        "/rest/v1/profiles",
        method="GET",
        jwt_token=jwt_token,
        query={
            "id": f"eq.{user_id}",
            "select": (
                "id,plan,"
                "daily_verification_limit,daily_verification_used,daily_verification_date"
            ),
            "limit": "1",
        },
    )
    if status != 200:
        raise HTTPException(
            status_code=502,
            detail=_extract_detail(payload, "No se pudo leer el perfil del usuario en Supabase."),
        )
    if not isinstance(payload, list) or len(payload) == 0:
        raise HTTPException(status_code=403, detail="No existe un perfil activo para este usuario.")
    return payload[0]

