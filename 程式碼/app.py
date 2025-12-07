from flask import Flask, render_template, request, jsonify, session, send_file
from flask_cors import CORS
import openai
import google.generativeai as genai
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
import secrets
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import gspread
from google.oauth2.service_account import Credentials
import io

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
CORS(app)

# 全域變數
knowledge_base = []
embeddings = []
embedding_model = None
google_sheets_client = None

# 角色設定（延續初階）
ROLES = {
    "專業導師": {
        "system_prompt": "你是一位專業、耐心的導師，擅長用清晰易懂的方式解釋複雜概念，並提供結構化的學習建議。",
        "color": "#FFE4B5"
    },
    "程式撰寫助理": {
        "system_prompt": "你是一位經驗豐富的程式開發專家，擅長撰寫乾淨、高效的程式碼，並提供詳細的技術說明和最佳實踐建議。",
        "color": "#E0F7FA"
    },
    "知識庫助理": {
        "system_prompt": "你是一位專業的知識庫助理，會根據提供的知識庫內容精確回答問題，並引用來源資料。",
        "color": "#C8E6C9"
    },
    "幽默風趣的聊天夥伴": {
        "system_prompt": "你是一位幽默風趣、充滿活力的聊天夥伴，善於用輕鬆有趣的方式與人互動，讓對話充滿歡樂。",
        "color": "#FFF9C4"
    }
}

def init_embedding_model():
    """初始化 Embedding 模型"""
    global embedding_model
    if embedding_model is None:
        print("正在載入 Embedding 模型...")
        embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("Embedding 模型載入完成！")
    return embedding_model

def load_knowledge_base_from_json(file_path='data/knowledge_base.json'):
    """從 JSON 檔案載入知識庫"""
    global knowledge_base, embeddings
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                knowledge_base = json.load(f)
            print(f"已載入 {len(knowledge_base)} 筆知識庫資料")
            # 重新生成 embeddings
            if knowledge_base:
                update_embeddings()
            return True
    except Exception as e:
        print(f"載入知識庫失敗: {e}")
    return False

def save_knowledge_base_to_json(file_path='data/knowledge_base.json'):
    """儲存知識庫到 JSON 檔案"""
    try:
        os.makedirs('data', exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(knowledge_base, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"儲存知識庫失敗: {e}")
        return False

def update_embeddings():
    """更新知識庫的 embeddings"""
    global embeddings
    model = init_embedding_model()
    texts = [f"{item.get('question', '')} {item.get('answer', '')}" for item in knowledge_base]
    embeddings = model.encode(texts)
    print(f"已生成 {len(embeddings)} 個 embeddings")

def search_knowledge_base(query, top_k=3):
    """在知識庫中搜尋相關內容"""
    if not knowledge_base or len(embeddings) == 0:
        return []

    model = init_embedding_model()
    query_embedding = model.encode([query])

    # 計算相似度
    similarities = cosine_similarity(query_embedding, embeddings)[0]

    # 取得前 k 個最相關的結果
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        if similarities[idx] > 0.3:  # 相似度閾值
            results.append({
                'data': knowledge_base[idx],
                'similarity': float(similarities[idx])
            })

    return results

def connect_google_sheets(spreadsheet_url, credentials_file=None):
    """連接 Google 試算表"""
    global google_sheets_client
    try:
        if credentials_file and os.path.exists(credentials_file):
            # 使用服務帳號認證
            scopes = ['https://www.googleapis.com/auth/spreadsheets']
            credentials = Credentials.from_service_account_file(credentials_file, scopes=scopes)
            google_sheets_client = gspread.authorize(credentials)
        else:
            # 需要憑證檔案
            return None, "需要 Google Service Account 憑證檔案"

        # 開啟試算表
        sheet = google_sheets_client.open_by_url(spreadsheet_url)
        return sheet, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """AI 聊天 API（整合 RAG）"""
    try:
        data = request.json
        message = data.get('message')
        api_key = data.get('api_key')
        api_type = data.get('api_type')
        model_name = data.get('model_name')  # 新增：取得模型名稱
        role = data.get('role', '知識庫助理')
        history = data.get('history', [])
        use_rag = data.get('use_rag', True)

        if not message or not api_key or not api_type:
            return jsonify({'error': '缺少必要參數'}), 400

        # RAG 檢索
        context = ""
        sources = []
        if use_rag and knowledge_base:
            search_results = search_knowledge_base(message)
            if search_results:
                context = "\n\n參考資料：\n"
                for i, result in enumerate(search_results, 1):
                    item = result['data']
                    context += f"\n[資料 {i}]\n"
                    context += f"問題：{item.get('question', '')}\n"
                    context += f"答案：{item.get('answer', '')}\n"
                    if 'category' in item:
                        context += f"分類：{item.get('category', '')}\n"
                    sources.append({
                        'question': item.get('question', ''),
                        'answer': item.get('answer', ''),
                        'category': item.get('category', ''),
                        'similarity': result['similarity']
                    })
            else:
                # 啟用 RAG 但找不到相關資料時,拒絕回答
                return jsonify({
                    'response': '抱歉,我在知識庫中找不到相關的資料來回答您的問題。請確認您的問題是否在知識庫範圍內,或者您可以關閉「使用知識庫」選項來獲得 AI 的通用回答。',
                    'sources': [],
                    'no_knowledge': True,
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }), 200

        # 取得角色設定
        role_config = ROLES.get(role, ROLES['知識庫助理'])
        system_prompt = role_config['system_prompt']

        if use_rag and context:
            system_prompt += f"\n\n【重要】請「嚴格」根據以下知識庫內容回答問題。如果知識庫中沒有相關資訊,請明確告訴使用者「知識庫中沒有這方面的資料」,不要憑藉自己的知識回答：{context}\n\n請務必只使用上述參考資料來回答問題,並在回答時引用資料來源編號(例如:[資料1])。"

        # 呼叫 AI API（傳入模型名稱）
        if api_type == 'openai':
            response_text = call_openai(api_key, message, system_prompt, history, model_name)
        elif api_type == 'google':
            response_text = call_google(api_key, message, system_prompt, history, model_name)
        else:
            return jsonify({'error': '不支援的 API 類型'}), 400

        return jsonify({
            'response': response_text,
            'sources': sources,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def call_openai(api_key, message, system_prompt, history, model_name="gpt-4o"):
    """呼叫 OpenAI API（使用 2.x 版本語法）"""
    # 使用新版 OpenAI API（2.x 版本）
    client = openai.OpenAI(api_key=api_key)

    messages = [{"role": "system", "content": system_prompt}]

    for item in history:
        messages.append({"role": "user", "content": item['user']})
        messages.append({"role": "assistant", "content": item['assistant']})

    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0.7,
        max_tokens=2000
    )

    return response.choices[0].message.content

def call_google(api_key, message, system_prompt, history, model_name="gemini-2.5-flash"):
    """呼叫 Google AI Studio API"""
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)

    full_prompt = f"{system_prompt}\n\n"

    for item in history:
        full_prompt += f"使用者: {item['user']}\n助理: {item['assistant']}\n\n"

    full_prompt += f"使用者: {message}\n助理: "

    response = model.generate_content(full_prompt)
    return response.text

@app.route('/api/knowledge-base', methods=['GET'])
def get_knowledge_base():
    """取得知識庫列表"""
    return jsonify({
        'data': knowledge_base,
        'count': len(knowledge_base),
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/knowledge-base', methods=['POST'])
def add_knowledge():
    """新增知識庫項目"""
    try:
        data = request.json
        item = {
            'id': len(knowledge_base) + 1,
            'question': data.get('question', ''),
            'answer': data.get('answer', ''),
            'category': data.get('category', '一般'),
            'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        knowledge_base.append(item)
        update_embeddings()
        save_knowledge_base_to_json()

        return jsonify({'success': True, 'item': item})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/<int:item_id>', methods=['PUT'])
def update_knowledge(item_id):
    """更新知識庫項目"""
    try:
        data = request.json
        for item in knowledge_base:
            if item['id'] == item_id:
                item['question'] = data.get('question', item['question'])
                item['answer'] = data.get('answer', item['answer'])
                item['category'] = data.get('category', item['category'])
                item['updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                break

        update_embeddings()
        save_knowledge_base_to_json()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/<int:item_id>', methods=['DELETE'])
def delete_knowledge(item_id):
    """刪除知識庫項目"""
    try:
        global knowledge_base
        knowledge_base = [item for item in knowledge_base if item['id'] != item_id]
        update_embeddings()
        save_knowledge_base_to_json()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/upload', methods=['POST'])
def upload_knowledge_base():
    """上傳知識庫檔案（CSV/Excel）"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': '沒有上傳檔案'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '檔案名稱為空'}), 400

        # 讀取檔案
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': '不支援的檔案格式'}), 400

        # 驗證欄位
        required_columns = ['question', 'answer']
        if not all(col in df.columns for col in required_columns):
            return jsonify({'error': f'檔案必須包含欄位: {", ".join(required_columns)}'}), 400

        # 批次新增
        added_count = 0
        for _, row in df.iterrows():
            item = {
                'id': len(knowledge_base) + 1,
                'question': str(row['question']),
                'answer': str(row['answer']),
                'category': str(row.get('category', '一般')),
                'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            knowledge_base.append(item)
            added_count += 1

        update_embeddings()
        save_knowledge_base_to_json()

        return jsonify({
            'success': True,
            'added_count': added_count,
            'total_count': len(knowledge_base)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/export/<format>', methods=['GET'])
def export_knowledge_base(format):
    """匯出知識庫"""
    try:
        if format == 'csv':
            df = pd.DataFrame(knowledge_base)
            output = io.StringIO()
            df.to_csv(output, index=False, encoding='utf-8-sig')
            output.seek(0)

            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8-sig')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'knowledge_base_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )

        elif format == 'json':
            return jsonify(knowledge_base)

        else:
            return jsonify({'error': '不支援的格式'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/sync-google-sheets', methods=['POST'])
def sync_google_sheets():
    """同步 Google 試算表"""
    try:
        data = request.json
        spreadsheet_url = data.get('spreadsheet_url')
        credentials_file = data.get('credentials_file', 'credentials.json')

        if not spreadsheet_url:
            return jsonify({'error': '缺少試算表 URL'}), 400

        sheet, error = connect_google_sheets(spreadsheet_url, credentials_file)
        if error:
            return jsonify({'error': error}), 400

        # 讀取第一個工作表
        worksheet = sheet.get_worksheet(0)
        records = worksheet.get_all_records()

        # 同步到本地知識庫
        global knowledge_base
        knowledge_base = []
        for i, record in enumerate(records, 1):
            item = {
                'id': i,
                'question': record.get('question', record.get('問題', '')),
                'answer': record.get('answer', record.get('答案', '')),
                'category': record.get('category', record.get('分類', '一般')),
                'synced_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            knowledge_base.append(item)

        update_embeddings()
        save_knowledge_base_to_json()

        return jsonify({
            'success': True,
            'synced_count': len(knowledge_base)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/knowledge-base/search', methods=['POST'])
def search_kb():
    """搜尋知識庫"""
    try:
        data = request.json
        query = data.get('query', '')
        top_k = data.get('top_k', 5)

        if not query:
            return jsonify({'error': '缺少搜尋關鍵字'}), 400

        results = search_knowledge_base(query, top_k)

        return jsonify({
            'results': results,
            'count': len(results)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/roles', methods=['GET'])
def get_roles():
    """取得所有角色設定"""
    return jsonify(ROLES)

# 啟動時載入知識庫
load_knowledge_base_from_json()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)
