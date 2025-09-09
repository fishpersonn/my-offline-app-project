// backend/index.js (Automerge + SQL)
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const Automerge = require('@automerge/automerge');

require('dotenv').config();

const app = express();
const port = 3000;

// 🎯 請修改為你的 SQL Server 連線設定
const config = {
   user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10), // Port 需轉為數字
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 伺服器上的 Automerge 文件，作為當前狀態的快取
// 在啟動時，我們會嘗試從資料庫載入最新狀態
let serverDoc = Automerge.init({ items: [] });

// 輔助函式：將 SQL 數據轉換為 Automerge 文件
async function loadDocFromSql() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT * FROM PWA_Offline_poc');
    
    let tempDoc = Automerge.init({ items: [] });
    tempDoc = Automerge.change(tempDoc, (d) => {
      d.items = result.recordset;
    });
    console.log('SQL 數據已成功載入為 Automerge 文件');
    return tempDoc;
  } catch (err) {
    console.error('從 SQL 載入數據失敗:', err.message);
    return Automerge.init({ items: [] });
  }
}

// 輔助函式：將 Automerge 文件的數據寫入 SQL 資料庫
async function saveDocToSql(doc) {
  try {
    const items = doc.items;
    const pool = await sql.connect(config);

    // 清空現有表格
    await pool.request().query('DELETE FROM PWA_Offline_poc');

    // 重新寫入所有項目
    for (const item of items) {
      const request = pool.request();
      request.input('FirstName', sql.NVarChar, item.FirstName);
      request.input('LastName', sql.NVarChar, item.LastName);
      request.input('input_Department', sql.NVarChar, item.Department);
      request.input('input_Position', sql.NVarChar, item.Position);
      
      const query = `
        INSERT INTO PWA_Offline_poc (FirstName, LastName, Department, Position, HireDate, BirthDate, Gender, Email, PhoneNumber, Address, Status)
        VALUES (@FirstName, @LastName, @input_Department, @input_Position, GETDATE(), '1990-01-01', 'M', '', '', '', 'Active')
      `;
      await request.query(query);
    }
    console.log('Automerge 數據已成功寫入 SQL 資料庫');
  } catch (err) {
    console.error('將數據寫入 SQL 失敗:', err.message);
  }
}

// 在伺服器啟動時，載入初始狀態
loadDocFromSql().then(doc => {
  serverDoc = doc;
  console.log('伺服器已啟動並從 SQL 載入初始數據。');
});

// 獲取伺服器上的 Automerge 文件
app.get('/doc', (req, res) => {
  res.send({ doc: Array.from(Automerge.save(serverDoc)) });
});

// 處理同步請求
app.post('/sync', async (req, res) => {
  try {
    const clientDocBinary = new Uint8Array(req.body.doc);
    const clientDoc = Automerge.load(clientDocBinary);
    
    // 合併前端的變動
    const mergedDoc = Automerge.merge(serverDoc, clientDoc);
    serverDoc = mergedDoc;

    // 將合併後的 Automerge 文件寫入 SQL 資料庫
    await saveDocToSql(serverDoc);

    console.log('成功合併變更，並將數據存入 SQL。');

    // 回傳合併後的文件給前端
    res.send({ doc: Array.from(Automerge.save(serverDoc)) });

  } catch (error) {
    console.error('同步失敗:', error);
    res.status(500).send({ error: 'Failed to sync data.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});