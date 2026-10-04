"""Expose la requête HTTP courante à la couche d'audit via un contextvar."""
from __future__ import annotations

import contextvars

_current_request: contextvars.ContextVar = contextvars.ContextVar(
    "wagadu_current_request", default=None
)


def get_current_request():
    return _current_request.get()


def get_current_user():
    request = get_current_request()
    if request is None:
        return None
    return getattr(request, "user", None)


class CurrentRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = _current_request.set(request)
        try:
            return self.get_response(request)
        finally:
            _current_request.reset(token)
