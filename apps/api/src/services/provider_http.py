import json
import mimetypes
import secrets
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def post_json(url: str, payload: dict[str, Any], headers: dict[str, str], timeout_seconds: float) -> dict[str, Any]:
    request = urllib.request.Request(
        url=url,
        method="POST",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **headers,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        body = response.read().decode("utf-8")
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("Provider response is not a JSON object")
    return data


def post_multipart_file(
    *,
    url: str,
    file_path: Path,
    file_field: str,
    file_name: str,
    file_mime_type: str | None,
    extra_fields: dict[str, str],
    headers: dict[str, str],
    timeout_seconds: float,
) -> dict[str, Any]:
    boundary = f"----momentarise-{secrets.token_hex(16)}"
    mime_type = file_mime_type or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()

    body_parts: list[bytes] = []
    for key, value in extra_fields.items():
        body_parts.extend(
            [
                f"--{boundary}\r\n".encode("utf-8"),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    body_parts.extend(
        [
            f"--{boundary}\r\n".encode("utf-8"),
            (
                f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'
                f"Content-Type: {mime_type}\r\n\r\n"
            ).encode("utf-8"),
            file_bytes,
            b"\r\n",
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
    )
    payload = b"".join(body_parts)

    request = urllib.request.Request(
        url=url,
        method="POST",
        data=payload,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            **headers,
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        body = response.read().decode("utf-8")
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("Provider response is not a JSON object")
    return data


def get_json(url: str, timeout_seconds: float) -> dict[str, Any]:
    request = urllib.request.Request(url=url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        body = response.read().decode("utf-8")
    data = json.loads(body)
    if not isinstance(data, dict):
        raise ValueError("Provider response is not a JSON object")
    return data


def to_data_url(path: Path, mime_type: str | None) -> str:
    import base64

    raw = base64.b64encode(path.read_bytes()).decode("utf-8")
    safe_mime = mime_type or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"data:{safe_mime};base64,{raw}"


def encode_query(params: dict[str, str]) -> str:
    return urllib.parse.urlencode(params, doseq=False, safe=",")


class ProviderHttpError(RuntimeError):
    pass


def extract_http_error(exc: Exception) -> str:
    if isinstance(exc, urllib.error.HTTPError):
        try:
            payload = exc.read().decode("utf-8")
            return f"{exc.code} {payload[:300]}"
        except Exception:
            return f"{exc.code} {exc.reason}"
    if isinstance(exc, urllib.error.URLError):
        return str(exc.reason)
    return str(exc)
