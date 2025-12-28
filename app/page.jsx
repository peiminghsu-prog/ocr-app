'use client';

import { useState, useEffect, useRef } from 'react';
import './page.css';
import { processFile as processOCRFile } from './ocrUtils';

/**
 * 驗證檔案類型是否為 PDF 或圖片
 * @param {File} file - 要驗證的檔案
 * @returns {boolean} 是否為有效的檔案類型
 */
const isValidFileType = (file) => {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const validPdfTypes = ['application/pdf'];
  const validPdfExtensions = ['.pdf'];

  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  const fileType = file.type.toLowerCase();

  // 檢查 MIME 類型
  if (validImageTypes.includes(fileType) || validPdfTypes.includes(fileType)) {
    return true;
  }

  // 檢查副檔名
  if (validImageExtensions.includes(fileExtension) || validPdfExtensions.includes(fileExtension)) {
    return true;
  }

  return false;
};

export default function OCRApp() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [currentView, setCurrentView] = useState('upload'); // upload, csv, report, compare
  const [ocrResults, setOcrResults] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  // 同步 URL 和視圖
// 同步 URL 和視圖
useEffect(() => {
  const hash = window.location.hash.slice(1);
  if (hash && hash !== currentView) {
    setCurrentView(hash);
  }
}, []);

useEffect(() => {
  if (currentView !== 'upload') {
    window.location.hash = currentView;
  } else {
    // 清除 hash，回到首頁
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  }
}, [currentView]);
useEffect(() => {
    const timer = setTimeout(() => {
      runAutoDemo();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

// 防止瀏覽器返回鍵關閉應用
useEffect(() => {
  const handlePopState = () => {
    const hash = window.location.hash.slice(1) || 'upload';
    setCurrentView(hash);
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);

  const runAutoDemo = () => {
    // 保留自動演示觸發，但改為提示用戶上傳文件
    // 實際使用時可以移除或改為直接觸發文件選擇
  };

  /**
   * 處理文件上傳和 OCR 處理
   * @param {File} file - 上傳的 PDF 或圖片檔案
   */
  const handleFileUpload = async (file) => {
    // 驗證文件類型
    if (!isValidFileType(file)) {
      alert('請選擇 PDF 或圖片檔案');
      return;
    }

    // 生成唯一的文件 ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // 添加到文件列表
    const fileObj = {
      id: fileId,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'queued',
      progress: 0,
      file: file // 保存原始文件對象
    };

    setFiles(prev => [...prev, fileObj]);

    // 開始處理文件
    try {
      // 更新狀態為處理中
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing', progress: 0 } : f
      ));

      // 調用 OCR 處理函數
      const result = await processOCRFile(file, (progress) => {
        // 更新進度
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress } : f
        ));
      });

      // 處理完成
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
      ));

      // 將結果存入 ocrResults
      setOcrResults(prev => [...prev, {
        fileId: fileId,
        fileName: result.fileName,
        data: result.data
      }]);
    } catch (error) {
      console.error('處理文件時發生錯誤:', error);
      // 更新狀態為錯誤
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
      ));
      alert('處理文件時發生錯誤: ' + error.message);
    }
  };

  const downloadCSV = () => {
    if (ocrResults.length === 0) return;

    const headers = ['檔案名稱', '姓名', '部門', '日期', '交通費', '住宿費', '餐費', '其他', '總計'];
    const rows = ocrResults.map(result => [
      result.fileName || '',
      result.data.姓名 || '',
      result.data.部門 || '',
      result.data.日期 || '',
      result.data.交通費 || 0,
      result.data.住宿費 || 0,
      result.data.餐費 || 0,
      result.data.其他 !== null && result.data.其他 !== undefined ? result.data.其他 : 0,
      result.data.總計 || 0
    ]);

    let csvContent = "\uFEFF"; // BOM for UTF-8
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '研發部_7月份_出差報銷表.csv';
    link.click();
  };

  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');

  return (
    <>
      <div className="top-toolbar">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 14h-2v-4h-4v4H7v-4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v4z"/>
          </svg>
          OCR 點檢表單產生器
        </div>
      </div>

      {currentView === 'upload' && (
        <UploadView 
          files={files}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          allCompleted={allCompleted}
          setCurrentView={setCurrentView}
          downloadCSV={downloadCSV}
          setSelectedFile={setSelectedFile}
          handleFileUpload={handleFileUpload}
        />
      )}

      {currentView === 'csv' && (
        <CSVView 
          ocrResults={ocrResults}
          setCurrentView={setCurrentView}
          downloadCSV={downloadCSV}
        />
      )}

      {currentView === 'report' && (
        <ReportView 
          ocrResults={ocrResults}
          setCurrentView={setCurrentView}
        />
      )}

      {currentView === 'compare' && (
        <CompareView 
          selectedFile={selectedFile}
          ocrResults={ocrResults}
          setCurrentView={setCurrentView}
        />
      )}
    </>
  );
}// ==================== 上傳視圖 ====================
function UploadView({ files, isDragging, setIsDragging, allCompleted, setCurrentView, downloadCSV, setSelectedFile, handleFileUpload }) {
  const fileInputRef = useRef(null);

  // 處理文件選擇
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    selectedFiles.forEach(file => {
      if (isValidFileType(file)) {
        handleFileUpload(file);
      } else {
        alert('請選擇 PDF 或圖片檔案');
      }
    });
    // 清空 input，允許選擇同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 處理拖放
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => {
      if (isValidFileType(file)) {
        handleFileUpload(file);
      } else {
        alert('請選擇 PDF 或圖片檔案');
      }
    });
  };

  // 處理點擊上傳區域
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="main-container">
      <div className="content-header">
        <h2 className="section-title">OCR 點檢表單處理</h2>
        <p className="section-description">
          上傳 PDF 或圖片點檢表單，AI 自動辨識並轉換為數位格式
        </p>
      </div>

      <div 
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div className="upload-icon">☁️</div>
        <div className="upload-text">
          {isDragging ? '放開以上傳檔案' : '拖放 PDF 或圖片檔案至此，或點擊選擇檔案'}
        </div>
        <div className="upload-hint" style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          支援 JPG、PNG、GIF、WEBP 格式
        </div>
      </div>

      {files.length > 0 && (
        <>
          <h3 className="queue-title">
            處理佇列 ({files.filter(f => f.status === 'completed').length}/{files.length})
          </h3>
          <div className="queue-grid">
            {files.map(file => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        </>
      )}

      <div className="process-steps">
        <ProcessStep 
          number="1" 
          title="檔案上傳" 
          description="上傳點檢表單 PDF 或圖片檔案"
        />
        <ProcessStep 
          number="2" 
          title="AI OCR 辨識" 
          description="AI 自動識別並提取資料"
        />
        <ProcessStep 
          number="3" 
          title="資料輸出" 
          description="轉換為數位格式並下載"
        />
      </div>

      <div className={`action-bar ${allCompleted ? 'visible' : ''}`}>
        <button className="btn btn-csv" onClick={() => setCurrentView('csv')}>
          📊 1. 查看 CSV 表格
        </button>
        <button className="btn btn-report" onClick={() => setCurrentView('report')}>
          📑 2. AI 產生圖像報告
        </button>
        <button className="btn btn-primary" onClick={() => {
          setSelectedFile(files[0]);
          setCurrentView('compare');
        }}>
          3. 下一步 (對比檔案)
        </button>
      </div>
    </div>
  );
}

// ==================== CSV 視圖 ====================
function CSVView({ ocrResults, setCurrentView, downloadCSV }) {
  return (
    <div className="main-container">
      <div className="view-header">
        <button className="btn-back" onClick={() => setCurrentView('upload')}>
          ← 返回
        </button>
        <h2>CSV 表格預覽</h2>
        <button className="btn btn-download" onClick={downloadCSV}>
          下載 CSV
        </button>
      </div>

      <div className="csv-preview">
        <table className="csv-table">
          <thead>
            <tr>
              <th>檔案名稱</th>
              <th>姓名</th>
              <th>部門</th>
              <th>日期</th>
              <th>交通費</th>
              <th>住宿費</th>
              <th>餐費</th>
              <th>其他</th>
              <th>總計</th>
            </tr>
          </thead>
          <tbody>
            {ocrResults.map((result, idx) => (
              <tr key={idx}>
                <td>{result.fileName}</td>
                <td>{result.data.姓名 || '-'}</td>
                <td>{result.data.部門 || '-'}</td>
                <td>{result.data.日期 || '-'}</td>
                <td>NT$ {result.data.交通費 ? result.data.交通費.toLocaleString() : '-'}</td>
                <td>NT$ {result.data.住宿費 ? result.data.住宿費.toLocaleString() : '-'}</td>
                <td>NT$ {result.data.餐費 ? result.data.餐費.toLocaleString() : '-'}</td>
                <td>NT$ {result.data.其他 !== null && result.data.其他 !== undefined ? result.data.其他.toLocaleString() : '-'}</td>
                <td className="total">NT$ {result.data.總計 ? result.data.總計.toLocaleString() : '-'}</td>
              </tr>
            ))}
            <tr className="summary-row">
              <td colSpan="4"><strong>總計</strong></td>
              <td><strong>NT$ {ocrResults.reduce((sum, r) => sum + (r.data.交通費 || 0), 0).toLocaleString()}</strong></td>
              <td><strong>NT$ {ocrResults.reduce((sum, r) => sum + (r.data.住宿費 || 0), 0).toLocaleString()}</strong></td>
              <td><strong>NT$ {ocrResults.reduce((sum, r) => sum + (r.data.餐費 || 0), 0).toLocaleString()}</strong></td>
              <td><strong>NT$ {ocrResults.reduce((sum, r) => sum + (r.data.其他 || 0), 0).toLocaleString()}</strong></td>
              <td className="total"><strong>NT$ {ocrResults.reduce((sum, r) => sum + (r.data.總計 || 0), 0).toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 報告視圖 ====================
function ReportView({ ocrResults, setCurrentView }) {
  const totalTransport = ocrResults.reduce((sum, r) => sum + (r.data.交通費 || 0), 0);
  const totalHotel = ocrResults.reduce((sum, r) => sum + (r.data.住宿費 || 0), 0);
  const totalMeal = ocrResults.reduce((sum, r) => sum + (r.data.餐費 || 0), 0);
  const totalOther = ocrResults.reduce((sum, r) => sum + (r.data.其他 || 0), 0);
  const grandTotal = totalTransport + totalHotel + totalMeal + totalOther;

  return (
    <div className="main-container">
      <div className="view-header">
        <button className="btn-back" onClick={() => setCurrentView('upload')}>
          ← 返回
        </button>
        <h2>AI 分析報告 - 研發部 7月份出差報銷</h2>
      </div>

      <div className="report-grid">
        <div className="stat-card">
          <div className="stat-label">總支出</div>
          <div className="stat-value">NT$ {grandTotal.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">報銷人數</div>
          <div className="stat-value">{ocrResults.length} 人</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">平均支出</div>
          <div className="stat-value">NT$ {Math.round(grandTotal / ocrResults.length).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">最高單筆</div>
          <div className="stat-value">NT$ {ocrResults.length > 0 ? Math.max(...ocrResults.map(r => r.data.總計 || 0)).toLocaleString() : '0'}</div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-box">
          <h3>支出類別分布</h3>
          <div className="bar-chart">
            <div className="bar-item">
              <div className="bar-label">交通費</div>
              <div className="bar-visual">
                <div className="bar-fill" style={{width: `${(totalTransport/grandTotal)*100}%`, background: '#3b82f6'}}></div>
              </div>
              <div className="bar-value">NT$ {totalTransport.toLocaleString()}</div>
            </div>
            <div className="bar-item">
              <div className="bar-label">住宿費</div>
              <div className="bar-visual">
                <div className="bar-fill" style={{width: `${(totalHotel/grandTotal)*100}%`, background: '#10b981'}}></div>
              </div>
              <div className="bar-value">NT$ {totalHotel.toLocaleString()}</div>
            </div>
            <div className="bar-item">
              <div className="bar-label">餐費</div>
              <div className="bar-visual">
                <div className="bar-fill" style={{width: `${(totalMeal/grandTotal)*100}%`, background: '#f59e0b'}}></div>
              </div>
              <div className="bar-value">NT$ {totalMeal.toLocaleString()}</div>
            </div>
            <div className="bar-item">
              <div className="bar-label">其他</div>
              <div className="bar-visual">
                <div className="bar-fill" style={{width: `${(totalOther/grandTotal)*100}%`, background: '#8b5cf6'}}></div>
              </div>
              <div className="bar-value">NT$ {totalOther.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="chart-box">
          <h3>個人支出明細</h3>
          <div className="bar-chart">
            {ocrResults.map((result, idx) => (
              <div key={idx} className="bar-item">
                <div className="bar-label">{result.data.姓名 || '未知'}</div>
                <div className="bar-visual">
                  <div className="bar-fill" style={{width: grandTotal > 0 ? `${((result.data.總計 || 0)/grandTotal)*100}%` : '0%', background: '#2563eb'}}></div>
                </div>
                <div className="bar-value">NT$ {(result.data.總計 || 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}// ==================== 對比視圖 ====================
function CompareView({ selectedFile, ocrResults, setCurrentView }) {
  const [editedData, setEditedData] = useState({});
  const [focusedField, setFocusedField] = useState(null);

  const fileResult = ocrResults.find(r => r.fileId === selectedFile?.id);

  useEffect(() => {
    if (fileResult) {
      setEditedData({ ...fileResult.data });
    }
  }, [fileResult]);

  if (!fileResult) {
    return (
      <div className="main-container">
        <div className="view-header">
          <button className="btn-back" onClick={() => setCurrentView('upload')}>
            ← 返回
          </button>
          <h2>選擇檔案進行校對</h2>
        </div>
      </div>
    );
  }

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleApprove = () => {
    alert('✓ 已核准！資料將合併至最終報表');
    setCurrentView('upload');
  };

  const lowConfidenceFields = Object.keys(fileResult.data.信心度).filter(
    field => fileResult.data.信心度[field] < 0.85
  );

  return (
    <div className="compare-container">
      <div className="compare-header">
        <button className="btn-back" onClick={() => setCurrentView('upload')}>
          ← 返回
        </button>
        <h2>人工校對 - {fileResult.fileName}</h2>
        <button className="btn btn-approve" onClick={handleApprove}>
          ✓ 核准並合併
        </button>
      </div>

      <div className="compare-split">
        {/* 左側：原始 PDF 預覽 */}
        <div className="compare-left">
          <h3>原始文件</h3>
          <div className="pdf-preview">
            <div className="pdf-mock">
              <div className="pdf-header">出差旅行報銷表</div>
              <div className="pdf-field-group">
                <div className="pdf-field">姓名: <span className="handwriting">{fileResult.data.姓名 || '-'}</span></div>
                <div className="pdf-field">部門: <span className="handwriting">{fileResult.data.部門 || '-'}</span></div>
              </div>
              <div className="pdf-field">日期: <span className="handwriting">{fileResult.data.日期 || '-'}</span></div>
              <div className="pdf-table">
                <div className="pdf-row">
                  <span>交通費:</span>
                  <span className="handwriting">NT$ {fileResult.data.交通費 || '-'}</span>
                </div>
                <div className="pdf-row">
                  <span>住宿費:</span>
                  <span className="handwriting">NT$ {fileResult.data.住宿費 || '-'}</span>
                </div>
                <div className="pdf-row">
                  <span>餐費:</span>
                  <span className="handwriting">NT$ {fileResult.data.餐費 || '-'}</span>
                </div>
                <div className="pdf-row">
                  <span>其他:</span>
                  <span className="handwriting">NT$ {fileResult.data.其他 !== null && fileResult.data.其他 !== undefined ? fileResult.data.其他 : '-'}</span>
                </div>
                <div className="pdf-row total-row">
                  <span>總計:</span>
                  <span className="handwriting">NT$ {fileResult.data.總計 || '-'}</span>
                </div>
              </div>
              {focusedField && (
                <div 
                  className="focus-box"
                  style={{
                    top: getFocusBoxPosition(focusedField).top,
                    left: getFocusBoxPosition(focusedField).left
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 右側：可編輯欄位 */}
        <div className="compare-right">
          <h3>OCR 辨識結果</h3>
          {lowConfidenceFields.length > 0 && (
            <div className="warning-banner">
              ⚠️ {lowConfidenceFields.length} 個欄位信心度較低，請仔細核對
            </div>
          )}
          <div className="edit-form">
            {Object.keys(fileResult.data).filter(k => k !== '信心度').map(field => {
              const confidence = fileResult.data.信心度[field];
              const isLowConfidence = confidence < 0.85;
              
              return (
                <div 
                  key={field} 
                  className={`edit-field ${isLowConfidence ? 'low-confidence' : ''}`}
                  onFocus={() => setFocusedField(field)}
                  onBlur={() => setFocusedField(null)}
                >
                  <label>
                    {field}
                    <span className="confidence-badge" style={{
                      background: confidence > 0.9 ? '#d1fae5' : confidence > 0.85 ? '#fef3c7' : '#fee2e2',
                      color: confidence > 0.9 ? '#065f46' : confidence > 0.85 ? '#92400e' : '#991b1b'
                    }}>
                      信心度: {Math.round(confidence * 100)}%
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editedData[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className={isLowConfidence ? 'warning-input' : ''}
                  />
                  {isLowConfidence && (
                    <div className="field-warning">⚠️ 請仔細核對此欄位</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getFocusBoxPosition(field) {
  const positions = {
    '姓名': { top: '80px', left: '100px' },
    '部門': { top: '80px', left: '280px' },
    '日期': { top: '120px', left: '100px' },
    '交通費': { top: '180px', left: '200px' },
    '住宿費': { top: '220px', left: '200px' },
    '餐費': { top: '260px', left: '200px' },
    '其他': { top: '300px', left: '200px' },
    '總計': { top: '350px', left: '200px' }
  };
  return positions[field] || { top: '0', left: '0' };
}

// ==================== 輔助組件 ====================
function FileCard({ file }) {
  return (
    <div className={`file-card ${file.status}`}>
      <div className="doc-preview">
        {file.status === 'processing' && <div className="scan-beam"></div>}
        
        <div 
          className="blurred-content"
          style={{
            filter: `blur(${Math.max(20 - file.progress / 5, 0)}px)`,
            opacity: 0.3 + (file.progress / 100) * 0.7
          }}
        >
          <div className="blur-line" style={{ width: '60%' }}></div>
          <div className="blur-line short"></div>
          <div className="blur-line"></div>
        </div>

        {file.status === 'processing' && (
          <div 
            className="clear-content"
            style={{
              clipPath: `inset(0 0 ${100 - file.progress}% 0)`,
              opacity: file.progress / 100
            }}
          >
            <div className="clear-text">出差報銷表</div>
            <div className="clear-text small">Date: 2024-07</div>
          </div>
        )}

        {file.status === 'completed' && (
          <div className="completed-badge">✓</div>
        )}
      </div>

      <div className="file-info">
        <div className="file-name">{file.name}</div>
        <div className="file-size">{file.size}</div>
        {file.status === 'processing' && (
          <>
            <div className="file-progress">
              <div className="file-progress-bar" style={{ width: `${file.progress}%` }}></div>
              <span className="file-progress-text">{Math.round(file.progress)}%</span>
            </div>
          </>
        )}
        {file.status === 'completed' && (
          <div className="status-badge success">✓ 處理完成</div>
        )}
      </div>
    </div>
  );
}

function ProcessStep({ number, title, description }) {
  return (
    <div className="process-step">
      <div className="step-number">{number}</div>
      <div className="step-content">
        <div className="step-title">{title}</div>
        <div className="step-description">{description}</div>
      </div>
    </div>
  );
}