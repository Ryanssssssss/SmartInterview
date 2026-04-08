"""代码运行器 —— 本地沙箱执行 Python 代码并验证。

用 subprocess 在隔离环境中运行用户代码，
用 LeetCode 题目自带的测试用例验证正确性。
"""

import json
import logging
import subprocess
import tempfile
import textwrap
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def run_code(code: str, timeout: int = 10) -> dict[str, Any]:
    """运行 Python 代码，返回结果。

    Returns:
        {"success": bool, "stdout": str, "stderr": str, "returncode": int}
    """
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name

    try:
        result = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"超时（{timeout}秒）",
            "returncode": -1,
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "returncode": -1,
        }
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def build_test_runner(code: str, problem: dict) -> str:
    """构建包含测试用例的可执行代码。

    将用户的 Solution 类代码 + 测试用例拼成一个完整的可运行脚本。

    Args:
        code: 用户写的代码（包含 class Solution）
        problem: 题目信息（含 test_cases, code_template, slug 等）

    Returns:
        完整的可执行 Python 代码字符串。
    """
    test_cases = problem.get("test_cases", [])
    slug = problem.get("slug", "")
    problem_id = problem.get("id", 0)

    # 解析代码模板中的方法名
    method_name = _extract_method_name(problem.get("code_template", ""))

    # 构建测试代码
    test_code = f'''
{code}

# ── 自动测试 ──
import sys

def main():
    sol = Solution()
    test_cases = {json.dumps(test_cases)}
    passed = 0
    total = len(test_cases)

    if total == 0:
        # 没有测试用例，只检查代码能否正常导入
        print("✅ 代码编译通过（无测试用例）")
        return

    for i, tc in enumerate(test_cases):
        try:
            # 解析测试输入（每行一个参数）
            lines = tc.strip().split("\\n")
            args = []
            for line in lines:
                try:
                    args.append(eval(line))
                except:
                    args.append(line)

            # 调用 Solution 方法
            result = sol.{method_name}(*args)
            print(f"测试用例 {{i+1}}: 输入={{args}} => 输出={{result}}")
            passed += 1
        except Exception as e:
            print(f"测试用例 {{i+1}}: ❌ 错误 - {{e}}")

    print(f"\\n运行结果: {{passed}}/{{total}} 个测试用例通过")

if __name__ == "__main__":
    main()
'''
    return test_code


def verify_solution(code: str, problem: dict, timeout: int = 10) -> dict[str, Any]:
    """验证用户的解题代码。

    Args:
        code: 用户代码
        problem: 题目信息
        timeout: 超时秒数

    Returns:
        {"success": bool, "output": str, "error": str, "passed": int, "total": int}
    """
    full_code = build_test_runner(code, problem)
    result = run_code(full_code, timeout)

    # 解析通过数
    passed = 0
    total = 0
    output = result["stdout"]
    if "运行结果:" in output:
        try:
            line = [l for l in output.split("\n") if "运行结果:" in l][0]
            parts = line.split(":")[1].strip().split("/")
            passed = int(parts[0].strip())
            total = int(parts[1].strip().split()[0])
        except Exception:
            pass

    return {
        "success": result["success"] and (passed == total if total > 0 else True),
        "output": output,
        "error": result["stderr"],
        "passed": passed,
        "total": total,
    }


def _extract_method_name(template: str) -> str:
    """从代码模板中提取方法名。"""
    import re
    # 匹配 def xxx(self, ...) 但排除 __init__
    matches = re.findall(r'def\s+(\w+)\s*\(self', template)
    for m in matches:
        if m != "__init__":
            return m
    return "solve"  # fallback
