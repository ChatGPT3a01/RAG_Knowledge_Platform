// 全域變數
let chatHistory = [];
let knowledgeBase = [];
let currentEditId = null;
let selectedFile = null;

// 設定相關
let config = {
    apiKey: localStorage.getItem('apiKey') || '',
    apiType: localStorage.getItem('apiType') || 'google',
    modelName: localStorage.getItem('modelName') || 'gemini-2.5-flash',
    aiRole: localStorage.getItem('aiRole') || '知識庫助理',
    useRAG: localStorage.getItem('useRAG') !== 'false',
    gasApiUrl: localStorage.getItem('gasApiUrl') || ''
};

// DOM 元素
const elements = {
    // 面板
    settingsPanel: document.getElementById('settingsPanel'),
    kbPanel: document.getElementById('kbPanel'),
    kbDialog: document.getElementById('kbDialog'),
    uploadDialog: document.getElementById('uploadDialog'),
    syncDialog: document.getElementById('syncDialog'),

    // 按鈕
    openSettings: document.getElementById('openSettings'),
    closeSettings: document.getElementById('closeSettings'),
    saveSettings: document.getElementById('saveSettings'),
    openKB: document.getElementById('openKB'),
    closeKB: document.getElementById('closeKB'),
    clearChat: document.getElementById('clearChat'),

    // 聊天
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),

    // 知識庫管理
    btnAddKB: document.getElementById('btnAddKB'),
    btnImportCSV: document.getElementById('btnImportCSV'),
    btnExportCSV: document.getElementById('btnExportCSV'),
    btnSyncGoogleSheets: document.getElementById('btnSyncGoogleSheets'),
    btnRefreshKB: document.getElementById('btnRefreshKB'),
    kbTableBody: document.getElementById('kbTableBody'),
    kbSearch: document.getElementById('kbSearch'),
    btnSearch: document.getElementById('btnSearch'),

    // 統計
    totalCount: document.getElementById('totalCount'),
    lastUpdated: document.getElementById('lastUpdated'),

    // 對話框
    closeDialog: document.getElementById('closeDialog'),
    btnCancelDialog: document.getElementById('btnCancelDialog'),
    btnSaveKB: document.getElementById('btnSaveKB'),
    kbQuestion: document.getElementById('kbQuestion'),
    kbAnswer: document.getElementById('kbAnswer'),
    kbCategory: document.getElementById('kbCategory'),
    dialogTitle: document.getElementById('dialogTitle'),

    // 上傳
    closeUploadDialog: document.getElementById('closeUploadDialog'),
    btnCancelUpload: document.getElementById('btnCancelUpload'),
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    btnUploadFile: document.getElementById('btnUploadFile'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    downloadExample: document.getElementById('downloadExample'),

    // 同步
    closeSyncDialog: document.getElementById('closeSyncDialog'),
    btnCancelSync: document.getElementById('btnCancelSync'),
    btnSyncNow: document.getElementById('btnSyncNow'),
    gasApiUrl: document.getElementById('gasApiUrl'),

    // 其他
    loadingOverlay: document.getElementById('loadingOverlay'),
    apiKey: document.getElementById('apiKey'),
    apiType: document.getElementById('apiType'),
    modelName: document.getElementById('modelName'),
    aiRole: document.getElementById('aiRole'),
    useRAG: document.getElementById('useRAG')
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadSettings();
    loadKnowledgeBase();
});

// 初始化事件監聽
function initEventListeners() {
    // 面板控制
    elements.openSettings.addEventListener('click', () => openPanel('settingsPanel'));
    elements.closeSettings.addEventListener('click', () => closePanel('settingsPanel'));
    elements.saveSettings.addEventListener('click', saveSettings);

    // API 類型切換時更新模型選項
    elements.apiType.addEventListener('change', updateModelOptions);

    elements.openKB.addEventListener('click', () => {
        openPanel('kbPanel');
        loadKnowledgeBase();
    });
    elements.closeKB.addEventListener('click', () => closePanel('kbPanel'));

    // 聊天
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    elements.clearChat.addEventListener('click', clearChat);

    // 知識庫管理
    elements.btnAddKB.addEventListener('click', () => openKBDialog());
    elements.btnImportCSV.addEventListener('click', () => openPanel('uploadDialog'));
    elements.btnExportCSV.addEventListener('click', exportKnowledgeBase);
    elements.btnSyncGoogleSheets.addEventListener('click', () => openPanel('syncDialog'));
    elements.btnRefreshKB.addEventListener('click', loadKnowledgeBase);
    elements.btnSearch.addEventListener('click', searchKnowledgeBase);
    elements.kbSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchKnowledgeBase();
    });

    // 對話框
    elements.closeDialog.addEventListener('click', () => closePanel('kbDialog'));
    elements.btnCancelDialog.addEventListener('click', () => closePanel('kbDialog'));
    elements.btnSaveKB.addEventListener('click', saveKnowledge);

    // 上傳
    elements.closeUploadDialog.addEventListener('click', () => closePanel('uploadDialog'));
    elements.btnCancelUpload.addEventListener('click', () => closePanel('uploadDialog'));
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.btnUploadFile.addEventListener('click', uploadFile);
    elements.downloadExample.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('/api/knowledge-base/export/csv', '_blank');
    });

    // 拖放上傳
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ target: { files } });
        }
    });

    // 同步
    elements.closeSyncDialog.addEventListener('click', () => closePanel('syncDialog'));
    elements.btnCancelSync.addEventListener('click', () => closePanel('syncDialog'));
    elements.btnSyncNow.addEventListener('click', syncGoogleSheets);
    elements.gasApiUrl.value = config.gasApiUrl;
}

// 面板控制
function openPanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.add('active');
}

function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.remove('active');
}

// 更新模型選項
function updateModelOptions() {
    const apiType = elements.apiType.value;
    const openaiGroup = document.getElementById('openaiModels');
    const googleGroup = document.getElementById('googleModels');

    if (apiType === 'openai') {
        openaiGroup.style.display = '';
        googleGroup.style.display = 'none';
        // 選擇第一個 OpenAI 模型（預設 GPT-4o）
        elements.modelName.value = 'gpt-4o';
    } else if (apiType === 'google') {
        openaiGroup.style.display = 'none';
        googleGroup.style.display = '';
        // 選擇第一個 Google 模型（預設 Gemini 2.5 Flash）
        elements.modelName.value = 'gemini-2.5-flash';
    }
}

// 載入設定
function loadSettings() {
    elements.apiKey.value = config.apiKey;
    elements.apiType.value = config.apiType;
    elements.modelName.value = config.modelName;
    elements.aiRole.value = config.aiRole;
    elements.useRAG.checked = config.useRAG;

    // 初始化模型選項顯示
    updateModelOptions();
}

// 儲存設定
function saveSettings() {
    config.apiKey = elements.apiKey.value;
    config.apiType = elements.apiType.value;
    config.modelName = elements.modelName.value;
    config.aiRole = elements.aiRole.value;
    config.useRAG = elements.useRAG.checked;

    localStorage.setItem('apiKey', config.apiKey);
    localStorage.setItem('apiType', config.apiType);
    localStorage.setItem('modelName', config.modelName);
    localStorage.setItem('aiRole', config.aiRole);
    localStorage.setItem('useRAG', config.useRAG);

    showNotification('設定已儲存', 'success');
    closePanel('settingsPanel');
}

// 發送訊息
async function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;

    if (!config.apiKey) {
        showNotification('請先設定 API Key', 'error');
        openPanel('settingsPanel');
        return;
    }

    // 清空輸入框
    elements.messageInput.value = '';
    elements.sendBtn.disabled = true;

    // 顯示使用者訊息
    addMessage(message, 'user');

    // 顯示載入動畫
    const loadingMsg = addLoadingMessage();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                api_key: config.apiKey,
                api_type: config.apiType,
                model_name: config.modelName,
                role: config.aiRole,
                history: chatHistory,
                use_rag: config.useRAG
            })
        });

        const data = await response.json();

        // 移除載入動畫
        loadingMsg.remove();

        if (data.error) {
            showNotification(data.error, 'error');
            addMessage('抱歉，發生錯誤：' + data.error, 'assistant');
        } else {
            // 顯示 AI 回應
            addMessage(data.response, 'assistant', data.sources);

            // 更新對話歷史
            chatHistory.push({
                user: message,
                assistant: data.response
            });
        }
    } catch (error) {
        loadingMsg.remove();
        showNotification('發送失敗: ' + error.message, 'error');
        addMessage('抱歉，連線失敗，請稍後再試。', 'assistant');
    } finally {
        elements.sendBtn.disabled = false;
    }
}

// 新增訊息
function addMessage(content, type, sources = null) {
    // 移除歡迎訊息
    const welcomeMsg = elements.messages.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);

    // 顯示來源
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'message-sources';
        sourcesDiv.innerHTML = '<h4><i class="fas fa-book"></i> 參考來源:</h4>';

        sources.forEach((source, index) => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.innerHTML = `
                <strong>來源 ${index + 1}:</strong> ${source.question}
                <span class="similarity-badge">${(source.similarity * 100).toFixed(0)}% 相似</span>
                <div style="margin-top: 5px; color: #666; font-size: 12px;">
                    分類: ${source.category || '一般'}
                </div>
            `;
            sourcesDiv.appendChild(sourceItem);
        });

        messageDiv.appendChild(sourcesDiv);
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('zh-TW');
    messageDiv.appendChild(timeDiv);

    elements.messages.appendChild(messageDiv);
    elements.messages.scrollTop = elements.messages.scrollHeight;

    return messageDiv;
}

// 新增載入動畫
function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
        <div class="message-content">
            <i class="fas fa-spinner fa-spin"></i> AI 正在思考中...
        </div>
    `;
    elements.messages.appendChild(messageDiv);
    elements.messages.scrollTop = elements.messages.scrollHeight;
    return messageDiv;
}

// 清空對話
function clearChat() {
    if (confirm('確定要清空對話記錄嗎？')) {
        chatHistory = [];
        elements.messages.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-robot" style="font-size: 64px; color: #4CAF50;"></i>
                <h2>歡迎使用 RAG 知識庫 AI 問答平台</h2>
                <p>我會根據知識庫內容為您提供精確的回答</p>
                <div class="quick-actions">
                    <button class="quick-btn" onclick="quickAction('管理')">
                        <i class="fas fa-database"></i> 管理知識庫
                    </button>
                    <button class="quick-btn" onclick="quickAction('設定')">
                        <i class="fas fa-cog"></i> 系統設定
                    </button>
                </div>
            </div>
        `;
    }
}

// 快速操作
function quickAction(action) {
    if (action === '管理') {
        openPanel('kbPanel');
        loadKnowledgeBase();
    } else if (action === '設定') {
        openPanel('settingsPanel');
    }
}

// 載入知識庫
async function loadKnowledgeBase() {
    showLoading(true);
    try {
        const response = await fetch('/api/knowledge-base');
        const data = await response.json();

        knowledgeBase = data.data || [];
        renderKnowledgeBaseTable(knowledgeBase);
        updateStats(data);
    } catch (error) {
        showNotification('載入知識庫失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 渲染知識庫表格
function renderKnowledgeBaseTable(data) {
    if (data.length === 0) {
        elements.kbTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
                    <p style="color: #999; margin-top: 10px;">暫無知識庫資料</p>
                </td>
            </tr>
        `;
        return;
    }

    elements.kbTableBody.innerHTML = data.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.question}</td>
            <td>${item.answer.substring(0, 100)}${item.answer.length > 100 ? '...' : ''}</td>
            <td>${item.category || '一般'}</td>
            <td style="font-size: 11px;">${item.created_at || '-'}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editKnowledge(${item.id})">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="action-btn btn-delete" onclick="deleteKnowledge(${item.id})">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </td>
        </tr>
    `).join('');
}

// 更新統計
function updateStats(data) {
    elements.totalCount.textContent = data.count || 0;
    elements.lastUpdated.textContent = data.last_updated ?
        new Date(data.last_updated).toLocaleString('zh-TW') : '-';
}

// 搜尋知識庫
async function searchKnowledgeBase() {
    const query = elements.kbSearch.value.trim();
    if (!query) {
        loadKnowledgeBase();
        return;
    }

    showLoading(true);
    try {
        const response = await fetch('/api/knowledge-base/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: 10 })
        });

        const data = await response.json();
        const results = data.results.map(r => r.data);
        renderKnowledgeBaseTable(results);
        showNotification(`找到 ${results.length} 筆相關資料`, 'success');
    } catch (error) {
        showNotification('搜尋失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 開啟知識庫對話框
function openKBDialog(item = null) {
    currentEditId = item ? item.id : null;

    if (item) {
        elements.dialogTitle.innerHTML = '<i class="fas fa-edit"></i> 編輯知識';
        elements.kbQuestion.value = item.question;
        elements.kbAnswer.value = item.answer;
        elements.kbCategory.value = item.category || '一般';
    } else {
        elements.dialogTitle.innerHTML = '<i class="fas fa-plus"></i> 新增知識';
        elements.kbQuestion.value = '';
        elements.kbAnswer.value = '';
        elements.kbCategory.value = '一般';
    }

    openPanel('kbDialog');
}

// 編輯知識
function editKnowledge(id) {
    const item = knowledgeBase.find(k => k.id === id);
    if (item) openKBDialog(item);
}

// 儲存知識
async function saveKnowledge() {
    const question = elements.kbQuestion.value.trim();
    const answer = elements.kbAnswer.value.trim();
    const category = elements.kbCategory.value.trim();

    if (!question || !answer) {
        showNotification('請填寫問題和答案', 'error');
        return;
    }

    showLoading(true);

    try {
        const url = currentEditId ?
            `/api/knowledge-base/${currentEditId}` :
            '/api/knowledge-base';
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, answer, category })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('儲存成功', 'success');
            closePanel('kbDialog');
            loadKnowledgeBase();
        } else {
            showNotification(data.error || '儲存失敗', 'error');
        }
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 刪除知識
async function deleteKnowledge(id) {
    if (!confirm('確定要刪除這筆知識嗎？')) return;

    showLoading(true);

    try {
        const response = await fetch(`/api/knowledge-base/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('刪除成功', 'success');
            loadKnowledgeBase();
        } else {
            showNotification(data.error || '刪除失敗', 'error');
        }
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 處理檔案選擇
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    selectedFile = files[0];
    elements.fileName.textContent = selectedFile.name;
    elements.fileInfo.style.display = 'block';
    elements.btnUploadFile.disabled = false;
}

// 上傳檔案
async function uploadFile() {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    showLoading(true);

    try {
        const response = await fetch('/api/knowledge-base/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification(`成功匯入 ${data.added_count} 筆資料`, 'success');
            closePanel('uploadDialog');
            loadKnowledgeBase();
            selectedFile = null;
            elements.fileInfo.style.display = 'none';
            elements.btnUploadFile.disabled = true;
        } else {
            showNotification(data.error || '上傳失敗', 'error');
        }
    } catch (error) {
        showNotification('上傳失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 匯出知識庫
function exportKnowledgeBase() {
    window.open('/api/knowledge-base/export/csv', '_blank');
}

// 同步 Google 試算表
async function syncGoogleSheets() {
    const gasApiUrl = elements.gasApiUrl.value.trim();

    if (!gasApiUrl) {
        showNotification('請輸入 GAS API URL', 'error');
        return;
    }

    config.gasApiUrl = gasApiUrl;
    localStorage.setItem('gasApiUrl', gasApiUrl);

    showLoading(true);

    try {
        // 從 GAS 取得資料
        const response = await fetch(gasApiUrl + '?action=list');
        const result = await response.json();

        if (!result.success) {
            showNotification('同步失敗: ' + result.message, 'error');
            return;
        }

        const gasData = result.data;

        // 批次新增到本地
        for (const item of gasData) {
            await fetch('/api/knowledge-base', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: item['問題'] || item['question'],
                    answer: item['答案'] || item['answer'],
                    category: item['分類'] || item['category'] || '一般'
                })
            });
        }

        showNotification(`成功同步 ${gasData.length} 筆資料`, 'success');
        closePanel('syncDialog');
        loadKnowledgeBase();
    } catch (error) {
        showNotification('同步失敗: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// 顯示載入動畫
function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 顯示通知
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// CSS 動畫
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);
