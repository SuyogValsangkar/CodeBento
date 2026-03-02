import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr
import sys

from spin_sdk import http
from spin_sdk.http import Request, Response


# Helper to extract first prompt message
def extract_first_input_prompt(source_code: str) -> str:
    """
    Very simple heuristic to find the first input(\"...\") call and
    extract its prompt string. This is not a full parser; it covers
    the common case input(\"prompt\").
    """
    marker = "input("
    idx = source_code.find(marker)
    if idx == -1:
        return ""

    # Look for a quoted string immediately after input(
    rest = source_code[idx + len(marker):]
    rest = rest.lstrip()

    if not rest:
        return ""

    quote = rest[0]
    if quote not in ("'", '"'):
        return ""

    # Find the matching quote
    end_idx = 1
    while end_idx < len(rest):
        if rest[end_idx] == quote:
            break
        end_idx += 1

    if end_idx >= len(rest):
        return ""

    return rest[1:end_idx]

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

        # Route to session-aware execution
        if request.uri.startswith("/execute-session"):
            source_code = payload.get("sourceCode")
            stdin_chunk = payload.get("stdinChunk", "")
            session_state = payload.get("sessionState", None) or {}

            if not isinstance(source_code, str):
                return Response(
                    400,
                    {"content-type": "application/json"},
                    json.dumps(
                        {"error": "Field 'sourceCode' (string) is required in session mode"}
                    ).encode("utf-8"),
                )

            if not isinstance(stdin_chunk, str):
                return Response(
                    400,
                    {"content-type": "application/json"},
                    json.dumps(
                        {"error": "Field 'stdinChunk' must be a string"}
                    ).encode("utf-8"),
                )

            # Normalize session_state to a dict
            if not isinstance(session_state, dict):
                session_state = {}

            already_prompted = bool(session_state.get("already_prompted", False))

            # No stdin yet and we haven't prompted, detect prompt and ask for input
            if not already_prompted and not stdin_chunk:
                prompt = extract_first_input_prompt(source_code)

                if not prompt:
                    # No obvious input() call found, run once as a normal stateless execution
                    stdout_buffer = io.StringIO()
                    stderr_buffer = io.StringIO()

                    try:
                        code_obj = compile(source_code, "<user_code>", "exec")
                        namespace = {}

                        original_stdin = sys.stdin
                        sys.stdin = io.StringIO("")
                        try:
                            with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                                exec(code_obj, namespace, namespace)
                        finally:
                            sys.stdin = original_stdin
                    except Exception:
                        stderr_buffer.write(traceback.format_exc())

                    result = {
                        "status": "done",
                        "stdout": stdout_buffer.getvalue(),
                        "stderr": stderr_buffer.getvalue(),
                        "prompt": "",
                        "sessionState": session_state,
                    }

                    return Response(
                        200,
                        {"content-type": "application/json"},
                        json.dumps(result).encode("utf-8"),
                    )

                # Found input call, ask the caller for input
                session_state["already_prompted"] = True
                session_state["last_prompt"] = prompt

                result = {
                    "status": "waiting_for_input",
                    "stdout": prompt,
                    "stderr": "",
                    "prompt": prompt,
                    "sessionState": session_state,
                }

                return Response(
                    200,
                    {"content-type": "application/json"},
                    json.dumps(result).encode("utf-8"),
                )

            # Phase 2: we have stdinChunk (reply to the prompt) → run the program once with that stdin
            stdout_buffer = io.StringIO()
            stderr_buffer = io.StringIO()

            try:
                code_obj = compile(source_code, "<user_code>", "exec")
                namespace = {}

                original_stdin = sys.stdin
                sys.stdin = io.StringIO(stdin_chunk)
                try:
                    with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
                        exec(code_obj, namespace, namespace)
                finally:
                    sys.stdin = original_stdin
            except Exception:
                stderr_buffer.write(traceback.format_exc())

            # For this v1, once we have run with input, we consider the program done.
            session_state["already_prompted"] = True

            result = {
                "status": "done",
                "stdout": stdout_buffer.getvalue(),
                "stderr": stderr_buffer.getvalue(),
                "prompt": "",
                "sessionState": session_state,
            }

            return Response(
                200,
                {"content-type": "application/json"},
                json.dumps(result).encode("utf-8"),
            )

        # Stateless execution
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