import json
import io
import traceback
from contextlib import redirect_stdout, redirect_stderr
import sys
import ast
from typing import List, Tuple, Dict, Any

from spin_sdk import http
from spin_sdk.http import Request, Response

# AST to transform input() call to yield prompt
class InputToYieldTransformer(ast.NodeTransformer):
    """
    Transform calls to input(...) into yield <prompt>.
    Supports patterns like:
      - input("prompt")
      - input()
    """

    def visit_Call(self, node: ast.Call) -> Any:
        # First, transform children
        self.generic_visit(node)

        if isinstance(node.func, ast.Name) and node.func.id == "input":
            # Determine prompt expression
            if node.args:
                prompt_expr = node.args[0]
            else:
                prompt_expr = ast.Constant(value="")

            # Replace input(...) with (yield <prompt_expr>)
            return ast.Yield(value=prompt_expr)

        return node

# Helper to parse Python source code into AST
def build_generator_source(source_code: str) -> str:
    """
    Wrap user code in a generator function __session_program()
    where each input(...) is replaced with yield <prompt>.
    """
    # Parse original code
    tree = ast.parse(source_code, mode="exec")

    # Transform input(...) calls into yield
    transformer = InputToYieldTransformer()
    transformed_body = transformer.visit(tree)

    # Wrap the transformed body in a generator function
    gen_func = ast.FunctionDef(
        name="__session_program",
        args=ast.arguments(
            posonlyargs=[],
            args=[],
            kwonlyargs=[],
            kw_defaults=[],
            defaults=[],
        ),
        body=transformed_body.body,
        decorator_list=[],
        returns=None,
        type_comment=None,
    )

    module = ast.Module(body=[gen_func], type_ignores=[])
    ast.fix_missing_locations(module)

    # Compile back to source code (for debugging) if needed.
    # But we can also just compile the AST directly.
    return module

# Helper to execute a single step of a session
def run_session_step(
    source_code: str,
    inputs: List[str],
) -> Tuple[str, str, str, str, Dict[str, Any]]:
    """
    Given source_code and a list of prior input lines, execute enough of the
    program to either:
      - reach the next input() (→ waiting_for_input), or
      - finish (→ done), or
      - error (→ error).

    Returns: (status, stdout, stderr, prompt, new_state)
      - status: "waiting_for_input" | "done" | "error"
      - stdout: captured stdout text
      - stderr: captured stderr text (tracebacks, etc.)
      - prompt: prompt string when waiting_for_input, else ""
      - new_state: {"inputs": [...]} where inputs includes all lines consumed so far
    """
    stdout_buffer = io.StringIO()
    stderr_buffer = io.StringIO()

    # Normalize inputs to a list
    if not isinstance(inputs, list):
        inputs = []

    try:
        # Build the generator function AST
        module_ast = build_generator_source(source_code)

        # Execute the module to define __session_program and drive the generator
        namespace: Dict[str, Any] = {}
        code_obj = compile(module_ast, "<session_program>", "exec")

        # NOTE: We do not override input() here; we've already transformed calls.
        with redirect_stdout(stdout_buffer), redirect_stderr(stderr_buffer):
            exec(code_obj, namespace, namespace)

            if "__session_program" not in namespace or not callable(namespace["__session_program"]):
                raise RuntimeError("__session_program not defined after transformation")

            result = namespace["__session_program"]()

            # If the transformed code had no input() calls, it's a regular function, not a generator
            if not hasattr(result, "__next__"):
                return "done", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}

            gen = result

            # Now drive the generator using all existing inputs
            prompt = ""
            status: str = "done"

            # First yield (or completion)
            try:
                prompt = next(gen)
                status = "waiting_for_input"
            except StopIteration:
                # Program finished without needing input
                return "done", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}
            except Exception:
                stderr_buffer.write(traceback.format_exc())
                return "error", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}

            # If we have inputs recorded, feed them one by one
            for line in inputs:
                try:
                    prompt = gen.send(line)
                    status = "waiting_for_input"
                except StopIteration:
                    # Program finished after consuming inputs
                    return "done", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}
                except Exception:
                    stderr_buffer.write(traceback.format_exc())
                    return "error", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}

        # Return the prompt for the next input()
        return "waiting_for_input", stdout_buffer.getvalue(), stderr_buffer.getvalue(), str(prompt), {"inputs": inputs}

    except Exception:
        stderr_buffer.write(traceback.format_exc())
        return "error", stdout_buffer.getvalue(), stderr_buffer.getvalue(), "", {"inputs": inputs}

# Incoming handler for HTTP requests
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

            if not isinstance(session_state, dict):
                session_state = {}

            # Get prior inputs from state
            inputs = session_state.get("inputs", [])
            if not isinstance(inputs, list):
                inputs = []

            # If we have a new input line, append it
            if stdin_chunk:
                inputs = inputs + [stdin_chunk]

            # Run one logical step of the session (replay all inputs so far)
            status, out_stdout, out_stderr, prompt, new_state = run_session_step(
                source_code,
                inputs,
            )

            # Persist updated inputs in session state
            session_state["inputs"] = new_state.get("inputs", inputs)

            if status == "waiting_for_input":
                display_stdout = out_stdout + (prompt or "")
                display_prompt = prompt or ""
            else:
                display_stdout = out_stdout
                display_prompt = ""

            result = {
                "status": status,
                "stdout": display_stdout,
                "stderr": out_stderr,
                "prompt": display_prompt,
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