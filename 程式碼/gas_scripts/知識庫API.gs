/**
 * RAG 知識庫 Google Apps Script API
 *
 * 部署方式：
 * 1. 開啟 Google 試算表
 * 2. 點擊「擴充功能」→「Apps Script」
 * 3. 複製此程式碼並貼上
 * 4. 點擊「部署」→「新增部署作業」
 * 5. 類型選擇「網頁應用程式」
 * 6. 存取權限選擇「所有人」
 * 7. 部署後取得網頁應用程式 URL
 */

// 試算表工作表名稱設定
const SHEET_NAME = '知識庫';
const LOG_SHEET_NAME = '查詢記錄';

/**
 * 處理 GET 請求 - 取得知識庫資料
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action || 'list';

    switch(action) {
      case 'list':
        return getKnowledgeBase(params);
      case 'search':
        return searchKnowledgeBase(params);
      case 'stats':
        return getStatistics();
      default:
        return createResponse(false, '不支援的操作', null);
    }
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

/**
 * 處理 POST 請求 - 新增/更新/刪除資料
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch(action) {
      case 'add':
        return addKnowledge(data);
      case 'update':
        return updateKnowledge(data);
      case 'delete':
        return deleteKnowledge(data);
      case 'batch_add':
        return batchAddKnowledge(data);
      default:
        return createResponse(false, '不支援的操作', null);
    }
  } catch (error) {
    return createResponse(false, error.toString(), null);
  }
}

/**
 * 取得知識庫列表
 */
function getKnowledgeBase(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // 如果工作表不存在，建立新的
  if (!sheet) {
    sheet = createKnowledgeBaseSheet(ss);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const knowledgeBase = rows.map((row, index) => {
    let obj = { rowIndex: index + 2 }; // +2 因為第一列是標題，且從1開始計數
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  // 過濾參數
  let filtered = knowledgeBase;
  if (params.category) {
    filtered = filtered.filter(item => item['分類'] === params.category);
  }

  return createResponse(true, '取得成功', {
    data: filtered,
    count: filtered.length,
    timestamp: new Date().toISOString()
  });
}

/**
 * 搜尋知識庫
 */
function searchKnowledgeBase(params) {
  const query = params.query || '';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createResponse(false, '知識庫工作表不存在', null);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  // 簡單的關鍵字搜尋
  const results = rows
    .map((row, index) => {
      let obj = { rowIndex: index + 2 };
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    })
    .filter(item => {
      const question = String(item['問題'] || '').toLowerCase();
      const answer = String(item['答案'] || '').toLowerCase();
      const searchQuery = query.toLowerCase();
      return question.includes(searchQuery) || answer.includes(searchQuery);
    });

  // 記錄查詢
  logQuery(query, results.length);

  return createResponse(true, '搜尋成功', {
    results: results,
    count: results.length,
    query: query
  });
}

/**
 * 新增知識
 */
function addKnowledge(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = createKnowledgeBaseSheet(ss);
  }

  const newRow = [
    data.question || '',
    data.answer || '',
    data.category || '一般',
    new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    data.source || '手動新增'
  ];

  sheet.appendRow(newRow);

  return createResponse(true, '新增成功', {
    row: newRow
  });
}

/**
 * 更新知識
 */
function updateKnowledge(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createResponse(false, '知識庫工作表不存在', null);
  }

  const rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return createResponse(false, '無效的列索引', null);
  }

  const range = sheet.getRange(rowIndex, 1, 1, 5);
  range.setValues([[
    data.question || '',
    data.answer || '',
    data.category || '一般',
    new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    '已更新'
  ]]);

  return createResponse(true, '更新成功', null);
}

/**
 * 刪除知識
 */
function deleteKnowledge(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createResponse(false, '知識庫工作表不存在', null);
  }

  const rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return createResponse(false, '無效的列索引', null);
  }

  sheet.deleteRow(rowIndex);

  return createResponse(true, '刪除成功', null);
}

/**
 * 批次新增知識
 */
function batchAddKnowledge(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = createKnowledgeBaseSheet(ss);
  }

  const items = data.items || [];
  const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const newRows = items.map(item => [
    item.question || '',
    item.answer || '',
    item.category || '一般',
    timestamp,
    '批次匯入'
  ]);

  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, 5).setValues(newRows);
  }

  return createResponse(true, '批次新增成功', {
    addedCount: newRows.length
  });
}

/**
 * 取得統計資料
 */
function getStatistics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createResponse(true, '取得成功', {
      totalCount: 0,
      categories: {},
      lastUpdated: null
    });
  }

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);

  // 統計分類
  const categories = {};
  rows.forEach(row => {
    const category = row[2] || '一般';
    categories[category] = (categories[category] || 0) + 1;
  });

  // 最後更新時間
  let lastUpdated = null;
  if (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    lastUpdated = lastRow[3];
  }

  return createResponse(true, '取得成功', {
    totalCount: rows.length,
    categories: categories,
    lastUpdated: lastUpdated,
    timestamp: new Date().toISOString()
  });
}

/**
 * 建立知識庫工作表
 */
function createKnowledgeBaseSheet(ss) {
  const sheet = ss.insertSheet(SHEET_NAME);

  // 設定標題列
  const headers = ['問題', '答案', '分類', '更新時間', '來源'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 格式化標題列
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');

  // 設定欄寬
  sheet.setColumnWidth(1, 300); // 問題
  sheet.setColumnWidth(2, 500); // 答案
  sheet.setColumnWidth(3, 100); // 分類
  sheet.setColumnWidth(4, 150); // 更新時間
  sheet.setColumnWidth(5, 100); // 來源

  // 凍結標題列
  sheet.setFrozenRows(1);

  // 新增範例資料
  const examples = [
    ['Python 是什麼？', 'Python 是一種高階程式語言，以其簡潔易讀的語法著稱，廣泛應用於網頁開發、資料分析、人工智慧等領域。', '程式設計', new Date().toLocaleString('zh-TW'), '範例資料'],
    ['什麼是機器學習？', '機器學習是人工智慧的一個分支，讓電腦系統能夠從資料中學習並改進，而不需要明確的程式設計。', '人工智慧', new Date().toLocaleString('zh-TW'), '範例資料'],
    ['如何學習程式設計？', '學習程式設計的建議步驟：1. 選擇一門程式語言（如 Python）2. 學習基礎語法 3. 多做練習專案 4. 閱讀他人程式碼 5. 持續實作與學習', '學習方法', new Date().toLocaleString('zh-TW'), '範例資料']
  ];

  sheet.getRange(2, 1, examples.length, 5).setValues(examples);

  return sheet;
}

/**
 * 記錄查詢
 */
function logQuery(query, resultCount) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);

    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.getRange(1, 1, 1, 3).setValues([['查詢時間', '查詢內容', '結果數量']]);
      logSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#2196F3').setFontColor('#FFFFFF');
    }

    logSheet.appendRow([
      new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      query,
      resultCount
    ]);
  } catch (error) {
    // 記錄失敗不影響主要功能
    console.error('記錄查詢失敗:', error);
  }
}

/**
 * 建立標準回應格式
 */
function createResponse(success, message, data) {
  const response = {
    success: success,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 測試函式（在 Apps Script 編輯器中執行）
 */
function testAPI() {
  // 測試取得知識庫
  const result = getKnowledgeBase({});
  Logger.log(result.getContent());
}
