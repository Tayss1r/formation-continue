from app.main import app


def test_password_reset_routes_are_registered() -> None:
    routes = {
        (route.path, tuple(sorted(getattr(route, "methods", []) or [])))
        for route in app.routes
    }

    expected_paths = {
        "/api/v1/auth/reset_password",
        "/api/v1/auth/verify_reset_code",
        "/api/v1/auth/reset_password_code",
    }

    existing_paths = {path for path, _ in routes}
    assert expected_paths.issubset(existing_paths)
