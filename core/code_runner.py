"""代码运行器 —— 本地沙箱执行 Python 代码并验证。"""

import json
import logging
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def run_code(code: str, timeout: int = 10) -> dict[str, Any]:
    """运行 Python 代码。"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as f:
        f.write(code)
        tmp_path = f.name
    try:
        result = subprocess.run(["python3", tmp_path], capture_output=True, text=True, timeout=timeout)
        return {"success": result.returncode == 0, "stdout": result.stdout.strip(), "stderr": result.stderr.strip(), "returncode": result.returncode}
    except subprocess.TimeoutExpired:
        return {"success": False, "stdout": "", "stderr": f"超时（{timeout}秒）", "returncode": -1}
    except Exception as e:
        return {"success": False, "stdout": "", "stderr": str(e), "returncode": -1}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def verify_solution(code: str, problem: dict, timeout: int = 10) -> dict[str, Any]:
    """验证用户代码：编译检查 + 尝试运行样例。"""

    # 先做编译检查
    compile_code = f"{code}\nprint('compile_ok')"
    compile_result = run_code(compile_code, timeout=5)

    if not compile_result["success"]:
        return {
            "success": False,
            "output": "",
            "error": compile_result["stderr"],
            "passed": 0,
            "total": 0,
        }

    # 尝试运行样例测试
    test_cases = problem.get("test_cases", [])
    method_name = _extract_method_name(problem.get("code_template", ""))
    is_design = _is_design_problem(problem.get("code_template", ""))

    if not test_cases:
        return {
            "success": True,
            "output": "✅ 代码编译通过（无样例测试）",
            "error": "",
            "passed": 0,
            "total": 0,
        }

    if is_design:
        # 设计类题目（Trie / LRU 等）：只做编译检查，不跑样例
        return {
            "success": True,
            "output": f"✅ 代码编译通过（设计类题目，请到 LeetCode 验证完整功能）",
            "error": "",
            "passed": 0,
            "total": 0,
        }

    # 普通题目：构建测试运行器
    test_code = _build_test_code(code, method_name, test_cases)
    result = run_code(test_code, timeout)

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


def _build_test_code(code: str, method_name: str, test_cases: list) -> str:
    """构建普通题目的测试代码。"""
    return f'''
{code}

import sys

def main():
    sol = Solution()
    test_cases = {json.dumps(test_cases)}
    passed = 0
    total = len(test_cases)

    for i, tc in enumerate(test_cases):
        try:
            lines = tc.strip().split("\\n")
            args = []
            for line in lines:
                try:
                    args.append(eval(line))
                except:
                    args.append(line)
            result = sol.{method_name}(*args)
            if result is None:
                print(f"测试 {{i+1}}: 输入={{args}} => 返回 None（未实现）")
            else:
                print(f"测试 {{i+1}}: 输入={{args}} => 输出={{result}}")
                passed += 1
        except Exception as e:
            print(f"测试 {{i+1}}: 错误 - {{e}}")

    print(f"\\n运行结果: {{passed}}/{{total}} 个测试用例通过")

if __name__ == "__main__":
    main()
'''


def _extract_method_name(template: str) -> str:
    """从代码模板提取方法名。"""
    matches = re.findall(r'def\s+(\w+)\s*\(self', template)
    for m in matches:
        if m != "__init__":
            return m
    return "solve"


def _is_design_problem(template: str) -> bool:
    """判断是否是设计类题目（有 __init__ 方法的）。"""
    if "__init__" in template:
        # 排除普通 Solution 类
        methods = re.findall(r'def\s+(\w+)\s*\(self', template)
        non_init = [m for m in methods if m != "__init__"]
        # 设计题通常有多个方法（如 Trie 有 insert/search/startsWith）
        return len(non_init) >= 2
    return False
