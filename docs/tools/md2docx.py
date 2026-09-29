#!/usr/bin/env python3
"""
周报 Markdown → docx（组里周记统一用 .docx 提交，本工具只做排版，不改内容）

为什么不用 Word COM：在受限/无人值守环境下 `Word.Documents.Add()` 会抛
「Word 未能引发事件」，因此这里直接生成最小可用的 OOXML（docx 就是 zip + XML），
不依赖 Office。

用法：
    python docs/tools/md2docx.py ../../周记/007\\ 9.21-9.27/D.md ../../周记/007\\ 9.21-9.27/D.docx

支持的 Markdown 子集：# 一级标题（居中加粗）、## / ### 二级标题（加粗）、空行、普通段落。
"""
from __future__ import annotations

import html
import re
import sys
import zipfile
from pathlib import Path

FONT = "Microsoft YaHei"

CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""


def run_props(bold: bool, size_half_points: int) -> str:
    b = "<w:b/>" if bold else ""
    return (
        "<w:rPr>"
        f'<w:rFonts w:ascii="{FONT}" w:eastAsia="{FONT}" w:hAnsi="{FONT}"/>'
        f"{b}"
        f'<w:sz w:val="{size_half_points}"/><w:szCs w:val="{size_half_points}"/>'
        "</w:rPr>"
    )


def paragraph(text: str, *, bold: bool = False, size: int = 22, center: bool = False, indent: int = 0) -> str:
    jc = '<w:jc w:val="center"/>' if center else ""
    ind = f'<w:ind w:left="{indent}"/>' if indent else ""
    props = f'<w:pPr>{jc}{ind}<w:spacing w:after="80"/></w:pPr>'
    body = ""
    if text:
        body = f"<w:r>{run_props(bold, size)}<w:t xml:space=\"preserve\">{html.escape(text)}</w:t></w:r>"
    return f"<w:p>{props}{body}</w:p>"


def strip_inline(text: str) -> str:
    """去掉行内 Markdown 标记（**加粗**、`代码`），docx 里按纯文本排更好读"""
    text = text.replace("**", "")
    text = re.sub(r"`([^`]*)`", r"\1", text)
    return text


def convert(md_path: Path, docx_path: Path) -> int:
    lines = md_path.read_text(encoding="utf-8").splitlines()
    paras: list[str] = []
    for line in lines:
        stripped = line.rstrip()
        if stripped.startswith("|"):
            # 表格：转成「单元格 ｜ 单元格」单行文本，跳过 |---|---| 分隔行
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            if all(set(c) <= set("-: ") for c in cells if c):
                continue
            paras.append(paragraph(" ｜ ".join(c for c in cells if c)))
        elif stripped.startswith("# "):
            paras.append(paragraph(strip_inline(stripped[2:].strip()), bold=True, size=32, center=True))
        elif stripped.startswith("## "):
            paras.append(paragraph(strip_inline(stripped[3:].strip()), bold=True, size=26))
        elif stripped.startswith("### "):
            paras.append(paragraph(strip_inline(stripped[4:].strip()), bold=True, size=24))
        elif stripped.startswith(">"):
            # 引用块＝讲稿正文：保留缩进，念的时候一眼能认出
            paras.append(paragraph(strip_inline(stripped.lstrip("> ").strip()), indent=360))
        elif stripped.startswith("- "):
            paras.append(paragraph("· " + strip_inline(stripped[2:].strip()), indent=180))
        else:
            paras.append(paragraph(strip_inline(stripped)))

    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(paras)
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        "</w:body></w:document>"
    )

    docx_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/document.xml", document)
    return len(paras)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    md_path, docx_path = Path(sys.argv[1]), Path(sys.argv[2])
    n = convert(md_path, docx_path)
    print(f"[完成] {md_path} -> {docx_path}（{n} 段，{docx_path.stat().st_size} 字节）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
