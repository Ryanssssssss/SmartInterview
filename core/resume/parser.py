"""PDF 简历文本提取，使用 pdfplumber。"""

import logging
from pathlib import Path

import pdfplumber

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str | Path) -> str:
    """从 PDF 文件中提取全部文本内容。

    Args:
        file_path: PDF 文件路径。

    Returns:
        合并后的纯文本字符串。

    Raises:
        FileNotFoundError: 文件不存在。
        ValueError: 无法从 PDF 中提取到任何文本。
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"简历文件不存在: {file_path}")

    pages_text: list[str] = []

    try:
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    pages_text.append(text.strip())
                else:
                    logger.warning("第 %d 页未提取到文本", i + 1)
    except Exception as e:
        logger.error("PDF 解析失败: %s", e)
        raise ValueError(f"PDF 解析失败: {e}") from e

    full_text = "\n\n".join(pages_text)
    if not full_text.strip():
        raise ValueError("未能从 PDF 中提取到任何文本内容，请检查文件是否为扫描件。")

    logger.info("成功提取简历文本，共 %d 页，%d 字符", len(pages_text), len(full_text))
    return full_text
