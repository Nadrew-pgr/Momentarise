import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("JWT_SECRET", "test-secret")

from src.sync.model_registry import get_available_models


class ModelRegistryTests(unittest.TestCase):
    def test_sync_catalog_stays_visible_when_provider_availability_is_limited(self) -> None:
        # The Sync model picker should not hide providers based on transient key availability.
        with patch("src.sync.model_registry._available_providers", return_value={"mistral"}):
            models = get_available_models(feature="sync")

        providers = {str(model.get("provider")) for model in models}
        self.assertIn("mistral", providers)
        self.assertIn("openai", providers)
        self.assertIn("anthropic", providers)
        self.assertIn("gemini", providers)

    def test_specialised_capture_models_are_excluded_from_sync_catalog(self) -> None:
        models = get_available_models(feature="sync")
        model_ids = {str(model.get("id")) for model in models}
        self.assertNotIn("voxtral-mini-latest", model_ids)
        self.assertNotIn("mistral-ocr-latest", model_ids)
        self.assertNotIn("pixtral-large-latest", model_ids)


if __name__ == "__main__":
    unittest.main()
