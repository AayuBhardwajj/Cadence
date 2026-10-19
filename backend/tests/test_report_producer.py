import unittest
from unittest.mock import patch, MagicMock
import json
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set CADENCE_ENV to allow importing main
os.environ.setdefault("CADENCE_ENV", "dev")

import main


class TestReportProducer(unittest.TestCase):

    def setUp(self):
        self.sample_payload = {
            "assessmentSessionId": "test-session-123",
            "transcription": "Hello world",
            "overallScore": 85,
            "pronunciationScore": 80,
            "fluencyScore": 90,
            "clarityScore": 85,
            "grammarScore": 85,
            "vocabularyScore": 80,
            "confidenceScore": 85,
            "cefrLevel": "B2",
            "wpm": 130,
            "fillerWordCount": 2,
            "eyeContactScore": 80,
            "strengths": ["good pace"],
            "focusAreas": ["vocabulary"],
            "feedback": "Great job!",
        }

    @patch("main.urllib.request.urlopen")
    @patch.dict(os.environ, {"CADENCE_INTERNAL_SERVICE_KEY": "test-secret-internal-key"})
    def test_post_assessment_report_success_with_header(self, mock_urlopen):
        # Mock successful HTTP 201 response
        mock_resp = MagicMock()
        mock_resp.status = 201
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        main.post_assessment_report(self.sample_payload, "test-session-123")

        # Verify urllib.request.urlopen was called
        mock_urlopen.assert_called_once()
        req = mock_urlopen.call_args[0][0]

        # Verify endpoint URL
        self.assertEqual(req.full_url, f"{main.REPORT_SERVICE_URL}/api/assessment/reports")
        self.assertEqual(req.get_method(), "POST")

        # Verify required headers
        headers = {k.lower(): v for k, v in req.headers.items()}
        self.assertEqual(headers.get("x-internal-service-key"), "test-secret-internal-key")
        self.assertEqual(headers.get("x-service-name"), "fastapi-backend")
        self.assertEqual(headers.get("content-type"), "application/json")

        # Verify payload content
        body = json.loads(req.data.decode("utf-8"))
        self.assertEqual(body["assessmentSessionId"], "test-session-123")
        self.assertEqual(body["overallScore"], 85)

    @patch("main.urllib.request.urlopen")
    @patch.dict(os.environ, {"CADENCE_INTERNAL_SERVICE_KEY": ""}, clear=False)
    def test_post_assessment_report_missing_key_fails_safely(self, mock_urlopen):
        # Ensure key is absent / empty
        with patch.object(main, "CADENCE_INTERNAL_SERVICE_KEY", None):
            with self.assertRaises(RuntimeError) as ctx:
                main.post_assessment_report(self.sample_payload, "test-session-123")

            self.assertIn("CADENCE_INTERNAL_SERVICE_KEY is not configured", str(ctx.exception))
            # Verify no network request was sent
            mock_urlopen.assert_not_called()

    @patch("main.urllib.request.urlopen")
    @patch.dict(os.environ, {"CADENCE_INTERNAL_SERVICE_KEY": "test-secret-internal-key"})
    def test_post_assessment_report_http_error(self, mock_urlopen):
        # Mock HTTP error status
        mock_resp = MagicMock()
        mock_resp.status = 500
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        with self.assertRaises(RuntimeError) as ctx:
            main.post_assessment_report(self.sample_payload, "test-session-123")

        self.assertIn("HTTP_500", str(ctx.exception))

    @patch("main.logger")
    @patch("main.urllib.request.urlopen")
    @patch.dict(os.environ, {"CADENCE_INTERNAL_SERVICE_KEY": "super-sensitive-secret-value-12345"})
    def test_post_assessment_report_never_logs_secret(self, mock_urlopen, mock_logger):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        main.post_assessment_report(self.sample_payload, "test-session-123")

        # Check all logger calls to make sure the secret is never logged
        for call in mock_logger.method_calls:
            for arg in call.args:
                self.assertNotIn("super-sensitive-secret-value-12345", str(arg))


if __name__ == "__main__":
    unittest.main()
