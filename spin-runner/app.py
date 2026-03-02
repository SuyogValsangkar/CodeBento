import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr

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

        source_code = payload.get("sourceCode")
        if not isinstance(source_code, str):
            return Response(
                400,
                {"content-type": "application/json"},
                json.dumps({"error": "Field 'sourceCode' (string) is required"}).encode("utf-8"),
            )

        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()

        try:
            # Execute user code inside WASM sandboxed Python interpreter.
            # We capture both stdout and stderr.
            # Use a single namespace so top-level names (e.g. functions) are visible
            # to the rest of the code and to recursive calls.
            code_obj = compile(source_code, "<user_code>", "exec")
            namespace = {}
            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                exec(code_obj, namespace, namespace)
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