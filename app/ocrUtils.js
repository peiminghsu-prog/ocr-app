import { createWorker } from 'tesseract.js';

/**
 * 使用 tesseract.js 辨識圖片中的中文和英文文字
 * @param {string|File} imageSource - 圖片的 data URL 或 File 物件
 * @param {Function} onProgress - 進度回調函數，參數為 0-100 的數值
 * @returns {Promise<string>} 返回辨識的文字字串
 */
export async function performOCR(imageSource, onProgress) {
  const worker = await createWorker('chi_tra+eng', 1, {
    logger: onProgress ? (m) => {
      if (m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100));
      }
    } : undefined
  });
  
  try {
    const { data: { text } } = await worker.recognize(imageSource);
    return text;
  } catch (error) {
    console.error('OCR 辨識時發生錯誤:', error);
    throw error;
  } finally {
    await worker.terminate();
  }
}

/**
 * 使用正則表達式從文字中提取報銷表單資訊
 * @param {string} text - OCR 辨識的文字
 * @returns {Object} 返回包含資料和信心度的結構化物件
 */
export function parseExpenseForm(text) {
  const result = {
    姓名: null,
    部門: null,
    日期: null,
    交通費: null,
    住宿費: null,
    餐費: null,
    其他: null,
    總計: null,
    信心度: {}
  };
  
  // 定義提取模式
  const patterns = {
    姓名: [
      /姓名[:：]\s*([^\s\n，,。]+)/,
      /姓名\s+([^\s\n，,。]+)/
    ],
    部門: [
      /部門[:：]\s*([^\s\n，,。]+)/,
      /([^\s\n，,。]+部)/
    ],
    日期: [
      /日期[:：]\s*(\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日]?)/,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/
    ],
    交通費: [
      /交通費[:：]\s*[Nn][Tt]?\$?\s*(\d+(?:[,，]\d{3})*)/,
      /交通費[:：]\s*(\d+)/
    ],
    住宿費: [
      /住宿費[:：]\s*[Nn][Tt]?\$?\s*(\d+(?:[,，]\d{3})*)/,
      /住宿費[:：]\s*(\d+)/
    ],
    餐費: [
      /餐費[:：]\s*[Nn][Tt]?\$?\s*(\d+(?:[,，]\d{3})*)/,
      /餐費[:：]\s*(\d+)/
    ],
    其他: [
      /其他[:：]\s*[Nn][Tt]?\$?\s*(\d+(?:[,，]\d{3})*)/,
      /其他[:：]\s*(\d+)/
    ],
    總計: [
      /總計[:：]\s*[Nn][Tt]?\$?\s*(\d+(?:[,，]\d{3})*)/,
      /總計[:：]\s*(\d+)/
    ]
  };
  
  // 提取每個欄位
  Object.keys(patterns).forEach(field => {
    let extracted = null;
    let confidence = 0;
    
    for (let i = 0; i < patterns[field].length; i++) {
      const match = text.match(patterns[field][i]);
      if (match && match[1]) {
        extracted = match[1];
        confidence = 0.95 - (i * 0.05);
        break;
      }
    }
    
    // 處理特殊欄位
    if (extracted) {
      if (['交通費', '住宿費', '餐費', '其他', '總計'].includes(field)) {
        result[field] = parseInt(extracted.replace(/[,，]/g, ''), 10);
      } else if (field === '日期') {
        result[field] = extracted
          .replace(/[年月]/g, '/')
          .replace(/[日]/g, '')
          .replace(/\/+/g, '/')
          .replace(/^\/|\/$/g, '');
      } else {
        result[field] = extracted;
      }
    }
    
    result.信心度[field] = confidence;
  });
  
  return result;
}

/**
 * 處理圖片檔案的 OCR
 * @param {File} file - 圖片檔案物件
 * @param {Function} onProgress - 進度回調函數
 * @returns {Promise<Object>} 返回最終結果物件
 */
export async function processFile(file, onProgress) {
  try {
    if (!file) {
      throw new Error('未提供檔案');
    }
    
    // 步驟 1: 轉換為 data URL (0-10%)
    if (onProgress) onProgress(0);
    
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    if (onProgress) onProgress(10);
    
    // 步驟 2: OCR 辨識 (10-90%)
    const text = await performOCR(dataUrl, (progress) => {
      if (onProgress) {
        onProgress(10 + Math.round(progress * 0.8));
      }
    });
    
    if (onProgress) onProgress(90);
    
    // 步驟 3: 解析文字 (90-100%)
    const parsedData = parseExpenseForm(text);
    
    if (onProgress) onProgress(100);
    
    return {
      fileName: file.name,
      data: parsedData
    };
  } catch (error) {
    console.error('處理檔案時發生錯誤:', error);
    throw error;
  }
}