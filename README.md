# CH3 | 打造 RAG 知識庫問答平台

從零開始建立 AI 知識庫問答系統 - RAG 技術完整教學

## 課程簡報

線上觀看簡報：[課程簡報首頁](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/index.html)

### 簡報內容

| Part | 標題 | 說明 |
|------|------|------|
| Part 1 | [RAG 技術入門與價值](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/Part1_RAG技術入門與價值.html) | RAG 是什麼、為何需要 RAG、RAG vs Fine-tuning 比較 |
| Part 2 | [快速部署 RAG 平台](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/Part2_快速部署RAG平台.html) | 環境建置、Flask 啟動、功能測試、知識匯入 |
| Part 3 | [向量嵌入與相似度原理](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/Part3_向量嵌入與相似度原理.html) | 向量嵌入概念、餘弦相似度、語意搜尋原理 |
| Part 4 | [系統架構與程式解析](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/Part4_系統架構與程式解析.html) | Flask 架構、API 端點、前後端溝通機制 |
| Part 5 | [知識庫管理與進階應用](https://chatgpt3a01.github.io/RAG_Knowledge_Platform/簡報/Part5_知識庫管理與進階應用.html) | 知識庫維護、Google Sheets 整合、擴展方向 |

## 程式碼下載

本專案提供完整的 RAG 知識庫問答平台程式碼。

### 目錄結構

```
RAG_Knowledge_Platform/
├── README.md           # 本說明文件
├── 簡報/               # 課程簡報 (HTML)
│   ├── index.html      # 簡報首頁
│   ├── Part1_RAG技術入門與價值.html
│   ├── Part2_快速部署RAG平台.html
│   ├── Part3_向量嵌入與相似度原理.html
│   ├── Part4_系統架構與程式解析.html
│   └── Part5_知識庫管理與進階應用.html
├── 截圖/               # 教學截圖
├── 程式碼/             # 完整專案程式碼
│   ├── app.py          # Flask 主程式
│   ├── requirements.txt # Python 套件依賴
│   ├── .env.example    # 環境變數範例
│   ├── templates/      # HTML 模板
│   ├── static/         # 靜態檔案 (CSS, JS)
│   ├── data/           # 知識庫資料
│   └── gas_scripts/    # Google Apps Script
```

## 快速開始

### 1. 環境準備

```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境 (Windows CMD)
venv\Scripts\activate

# 啟動虛擬環境 (Windows PowerShell)
venv\Scripts\Activate.ps1

# 啟動虛擬環境 (Mac/Linux)
source venv/bin/activate
```

### 2. 安裝套件

```bash
cd 程式碼
pip install -r requirements.txt
```

### 3. 執行應用

```bash
python app.py
```

開啟瀏覽器前往 http://localhost:5000

### 4. 設定 API Key

在網頁介面中輸入你的 API Key：
- **OpenAI API Key**: 支援 GPT-4o 等模型
- **Google API Key**: 支援 Gemini 模型

## 技術棧

- **後端**: Python 3.8+, Flask, Flask-CORS
- **AI**: OpenAI API (GPT-4o), Google Gemini API
- **向量處理**: NumPy, 餘弦相似度計算
- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **知識庫**: JSON 檔案儲存、Google Sheets 整合

## 核心功能

### RAG 問答流程

1. **知識庫建立**: 匯入 Q&A 資料，自動產生向量嵌入
2. **語意搜尋**: 使用餘弦相似度找出最相關的知識
3. **AI 回答**: 結合檢索到的知識，由 AI 生成精準回答

### 支援的 AI 模型

| 提供者 | 模型 |
|--------|------|
| OpenAI | gpt-4o, gpt-4-turbo, gpt-3.5-turbo |
| Google | gemini-2.5-flash, gemini-2.5-pro |

## 部署方式

### 本地部署

直接執行 `python app.py` 即可在本機使用。

### 雲端部署

可部署到以下平台：
- **Render**: 支援 Python，免費方案可用
- **Railway**: 開發者友善，快速部署
- **Heroku**: 經典 PaaS 平台

部署時需設定環境變數（如有使用伺服器端 API Key）。

## 常見問題

### Q: 向量嵌入是什麼？

向量嵌入是將文字轉換為數值向量的技術，讓電腦能夠理解文字的語意。相似的文字會有相近的向量表示。

### Q: RAG 和 Fine-tuning 的差別？

- **RAG**: 不修改模型，透過檢索外部知識來增強回答
- **Fine-tuning**: 用特定資料訓練模型，改變模型本身

RAG 的優點是成本低、知識可即時更新、不需要 GPU 訓練。

### Q: 如何擴充知識庫？

在網頁介面的「知識管理」頁面，可以新增、編輯、刪除知識條目。也可以透過 Google Sheets 批次管理。

## 課程資源

- **Facebook**: [阿亮老師](https://www.facebook.com/iddmail)
- **YouTube**: [阿亮老師頻道](https://www.youtube.com/@Liang-yt02)

---

© 2026 自己架設 AI - 零基礎到大師 | Made with 曾慶良(阿亮老師) ❤️
