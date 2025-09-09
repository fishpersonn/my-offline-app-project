<template>
  <q-page class="q-pa-md">
    <q-input v-model="newItem.FirstName" label="姓氏" class="q-mb-md" />
    <q-input v-model="newItem.LastName" label="名字" class="q-mb-md" />
    <q-input v-model="newItem.Department" label="部門" class="q-mb-md" />
    <q-input v-model="newItem.Position" label="職位" class="q-mb-md" />
    
    <q-btn @click="addItem" label="新增" color="primary" class="q-mb-md" />

    <q-list bordered separator>
      <q-item v-for="(item, index) in items" :key="index">
        <q-item-section>
          <q-item-label>{{ item.FirstName }} {{ item.LastName }}</q-item-label>
          <q-item-label caption>
            部門: {{ item.Department }} | 職位: {{ item.Position }} | 郵箱: {{ item.Email }} | 電話: {{ item.PhoneNumber }} | 地址: {{ item.Address }}
          </q-item-label>
        </q-item-section>
        
        <q-item-section side>
          <q-btn flat round icon="delete" color="negative" @click="deleteItem(index)" />
        </q-item-section>
      </q-item>
    </q-list>

    <q-separator class="q-my-lg" />

    <div class="q-mt-md">
      <q-btn @click="syncData" label="同步資料" color="secondary" class="full-width" />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted, shallowRef } from 'vue';
import * as Automerge from '@automerge/automerge';
import localforage from 'localforage';
import axios from 'axios';

// 宣告 Vue 的響應式狀態
const newItem = ref({
  FirstName: '',
  LastName: '',
  Department: '',
  Position: '',
  // ... 新增欄位，如果需要使用者輸入
});
const items = ref([]);
const doc = shallowRef(Automerge.init({ items: [] }));

// 在元件載入時執行
onMounted(async () => {
  // 1. 嘗試從本地資料庫載入舊的 Automerge 文件
  const savedDoc = await localforage.getItem('my-offline-doc');

  // 2. 向後端發起請求，獲取伺服器上的文件
  try {
    const response = await axios.get('http://localhost:3000/doc');
    const serverDocOnClient = Automerge.load(new Uint8Array(response.data.doc));

    if (savedDoc) {
      const localDoc = Automerge.load(new Uint8Array(savedDoc));
      doc.value = Automerge.merge(localDoc, serverDocOnClient);
    } else {
      doc.value = serverDocOnClient;
    }

    const binaryDoc = Automerge.save(doc.value);
    await localforage.setItem('my-offline-doc', binaryDoc);

    console.log('Successfully synchronized with server on mount.');
  } catch (error) {
    console.error('Failed to sync with server on mount:', error);
    if (savedDoc) {
      doc.value = Automerge.load(new Uint8Array(savedDoc));
    }
  }

  // 確保 items 屬性存在
  if (!doc.value.items) {
    doc.value = Automerge.change(doc.value, (d) => {
      d.items = [];
    });
  }

  // 更新頁面顯示，將 Automerge 文件的資料同步到 Vue 狀態
  updateItems();
});

// 新增項目函數
const addItem = async () => {
  if (
    newItem.value.FirstName &&
    newItem.value.LastName &&
    newItem.value.Department &&
    newItem.value.Position
  ) {
    // 這裡我們需要新增所有表格的預設欄位，以配合後端
    const newEmployee = {
      ...newItem.value, // 使用展開運算符來複製已輸入的欄位
      HireDate: new Date().toISOString().split('T')[0],
      BirthDate: '1990-01-01',
      Gender: 'M',
      Email: '',
      PhoneNumber: '',
      Address: '',
      Status: 'Active'
    };

    // 使用 Automerge.change() 來記錄所有修改
    doc.value = Automerge.change(doc.value, (d) => {
      d.items.push(newEmployee);
    });

    // 將更新後的文件儲存到離線資料庫
    const binaryDoc = Automerge.save(doc.value);
    await localforage.setItem('my-offline-doc', binaryDoc);

    // 更新頁面顯示
    updateItems();
    // 清空輸入框
    newItem.value = {
      FirstName: '',
      LastName: '',
      Department: '',
      Position: '',
    };
  }
};

// 新增一個刪除項目函式
const deleteItem = async (index) => {
  // 使用 Automerge.change() 來記錄刪除操作
  doc.value = Automerge.change(doc.value, (d) => {
    d.items.deleteAt(index);
  });

  // 將更新後的文件存到離線資料庫
  const binaryDoc = Automerge.save(doc.value);
  await localforage.setItem('my-offline-doc', binaryDoc);

  // 更新畫面顯示
  updateItems();
};

// 將 Automerge 文件的資料同步到 Vue 的狀態
const updateItems = () => {
  items.value = doc.value.items;
};

// 同步函數
const syncData = async () => {
  try {
    const binaryDoc = Automerge.save(doc.value);
    const response = await axios.post('http://localhost:3000/sync', {
      doc: Array.from(binaryDoc),
    });

    const mergedDoc = Automerge.load(new Uint8Array(response.data.doc));
    doc.value = Automerge.merge(doc.value, mergedDoc);

    const finalBinaryDoc = Automerge.save(doc.value);
    await localforage.setItem('my-offline-doc', finalBinaryDoc);
    updateItems();

    console.log('同步成功！');
    alert('同步成功！');
  } catch (error) {
    console.error('同步失敗:', error);
    alert('同步失敗，請檢查網路與後端伺服器');
  }
};
</script>