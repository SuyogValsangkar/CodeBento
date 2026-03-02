import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr
import sys

from spin_sdk import http
from spin_sdk.http import Request, Response


class IncomingHandler(http.IncomingHandler):
    def handle_request(self, request: Request) -> Response:
        # Only allow POST
        if request.method != "POST":
            return Response(
                405,
                {"content-type": "application/json"},
                json.dumps({"error": "Method not allowed; use POST"}).encode("utf-8"),
            )

        # Parse JSON body
        try:
            body_text = request.body.decode("utf-8")
            payload = json.loads(body_text or "{}")
        except Exception:
            return Response(
                400,
                {"content-type": "application/json"},
                json.dumps({"error": "Invalid JSON body"}).encode("utf-8"),
            )

        # Validate source code
        source_code = payload.get("sourceCode")
        if not isinstance(source_code, str):
            return Response(
                400,
                {"content-type": "application/json"},
                json.dumps({"error": "Field 'sourceCode' (string) is required"}).encode("utf-8"),
            )

        # Parse optional stdin field
        stdin_text = payload.get("stdin", "")
        if not isinstance(stdin_text, str):
            return Response(
                400,
                {"content-type": "application/json"},
                json.dumps({"error": "Field 'stdin' must be a string"}).encode("utf-8"),
            )

        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()

        try:
            # Execute user code, capture stdout and stderr
            code_obj = compile(source_code, "<user_code>", "exec")
            namespace = {}

            original_stdin = sys.stdin
            sys.stdin = io.StringIO(stdin_text)

            try:
                with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                    exec(code_obj, namespace, namespace)
            finally:
                sys.stdin = original_stdin
        except Exception:
            # If execution fails, capture the traceback into stderr
            stderr_buffer.write(traceback.format_exc())

        result = {
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_buffer.getvalue(),
        }

        return Response(
            200,
            {"content-type": "application/json"},
            json.dumps(result).encode("utf-8"),
        )